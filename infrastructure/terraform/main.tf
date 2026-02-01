# =============================================================================
# AI面接プラットフォーム - Terraformメイン構成
# =============================================================================

locals {
  name_prefix = "${var.project}-${var.environment}"
}

# =============================================================================
# ネットワーク
# =============================================================================

module "networking" {
  source = "./modules/networking"

  project            = var.project
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  admin_ip_addresses = var.admin_ip_addresses
}

# =============================================================================
# セキュリティ（WAF関連付け以外）
# =============================================================================

module "security" {
  source = "./modules/security"

  project               = var.project
  environment           = var.environment
  domain_name           = var.domain_name
  vpc_id                = module.networking.vpc_id
  waf_allowed_countries = var.waf_allowed_countries
  waf_rate_limit        = var.waf_rate_limit
  waf_auth_rate_limit   = var.waf_auth_rate_limit
  create_secrets        = var.create_secrets

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# =============================================================================
# コンピューティング
# =============================================================================

module "compute" {
  source = "./modules/compute"

  project                   = var.project
  environment               = var.environment
  vpc_id                    = module.networking.vpc_id
  public_subnet_ids         = module.networking.public_subnet_ids
  private_subnet_ids        = module.networking.private_subnet_ids
  alb_security_group_id     = module.networking.alb_security_group_id
  ec2_security_group_id     = module.networking.ec2_security_group_id
  ec2_instance_type         = var.ec2_instance_type
  ec2_volume_size           = var.ec2_volume_size
  ec2_key_name              = var.ec2_key_name
  acm_certificate_arn       = module.security.acm_certificate_arn
  ec2_instance_profile_name = module.security.ec2_instance_profile_name
  logs_bucket_name          = "${var.project}-${var.environment}-logs"
}

# =============================================================================
# WAF ALB関連付け（compute後に実行）
# =============================================================================

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = module.compute.alb_arn
  web_acl_arn  = module.security.waf_web_acl_arn
}

# =============================================================================
# データベース
# =============================================================================

module "database" {
  source = "./modules/database"

  project                       = var.project
  environment                   = var.environment
  vpc_id                        = module.networking.vpc_id
  private_subnet_ids            = module.networking.private_subnet_ids
  rds_security_group_id         = module.networking.rds_security_group_id
  elasticache_security_group_id = module.networking.elasticache_security_group_id
  rds_instance_class            = var.rds_instance_class
  rds_allocated_storage         = var.rds_allocated_storage
  rds_database_name             = var.rds_database_name
  rds_username                  = var.rds_username
  rds_multi_az                  = var.rds_multi_az
  elasticache_node_type         = var.elasticache_node_type
  elasticache_num_cache_nodes   = var.elasticache_num_cache_nodes
}

# =============================================================================
# CDN（OAI作成）
# =============================================================================

module "cdn" {
  source = "./modules/cdn"

  project                        = var.project
  environment                    = var.environment
  domain_name                    = var.domain_name
  route53_zone_id                = var.route53_zone_id
  static_bucket_domain           = module.storage.static_bucket_domain
  static_bucket_id               = module.storage.static_bucket_id
  alb_dns_name                   = module.compute.alb_dns_name
  acm_certificate_arn_cloudfront = module.security.acm_certificate_arn_cloudfront
  waf_web_acl_arn                = module.security.waf_web_acl_arn
  logs_bucket_name               = module.storage.logs_bucket_name

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# =============================================================================
# ストレージ
# =============================================================================

module "storage" {
  source = "./modules/storage"

  project     = var.project
  environment = var.environment
  domain_name = var.domain_name
}

# =============================================================================
# S3バケットポリシー（CDN OAI作成後に適用）
# =============================================================================

resource "aws_s3_bucket_policy" "static_cloudfront" {
  bucket = module.storage.static_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = module.cdn.cloudfront_oai_arn
        }
        Action   = "s3:GetObject"
        Resource = "${module.storage.static_bucket_arn}/*"
      }
    ]
  })
}

# =============================================================================
# 監視
# =============================================================================

module "monitoring" {
  source = "./modules/monitoring"

  project                    = var.project
  environment                = var.environment
  alert_email                = var.alert_email
  slack_workspace_id         = var.slack_workspace_id
  slack_channel_id_warning   = var.slack_channel_id_warning
  slack_channel_id_critical  = var.slack_channel_id_critical
  monthly_budget             = var.monthly_budget
  ec2_instance_id            = module.compute.ec2_instance_id
  alb_arn_suffix             = module.compute.alb_arn_suffix
  target_group_arn_suffix    = module.compute.target_group_arn_suffix
  rds_instance_id            = module.database.rds_instance_id
  elasticache_cluster_id     = module.database.elasticache_cluster_id
  cloudfront_distribution_id = module.cdn.cloudfront_distribution_id
  logs_bucket_id             = module.storage.logs_bucket_id
}
