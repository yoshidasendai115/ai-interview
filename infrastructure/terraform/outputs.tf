# =============================================================================
# ネットワーク出力
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "パブリックサブネットID"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "プライベートサブネットID"
  value       = module.networking.private_subnet_ids
}

# =============================================================================
# コンピューティング出力
# =============================================================================

output "alb_dns_name" {
  description = "ALB DNS名"
  value       = module.compute.alb_dns_name
}

output "ec2_instance_id" {
  description = "EC2インスタンスID"
  value       = module.compute.ec2_instance_id
}

output "ec2_private_ip" {
  description = "EC2プライベートIP"
  value       = module.compute.ec2_private_ip
}

# =============================================================================
# データベース出力
# =============================================================================

output "rds_endpoint" {
  description = "RDSエンドポイント"
  value       = module.database.rds_endpoint
}

output "rds_database_name" {
  description = "RDSデータベース名"
  value       = module.database.rds_database_name
}

output "elasticache_endpoint" {
  description = "ElastiCacheエンドポイント"
  value       = module.database.elasticache_endpoint
}

# =============================================================================
# ストレージ出力
# =============================================================================

output "static_bucket_name" {
  description = "静的ファイル用S3バケット名"
  value       = module.storage.static_bucket_name
}

output "media_bucket_name" {
  description = "メディア用S3バケット名"
  value       = module.storage.media_bucket_name
}

# =============================================================================
# CDN出力
# =============================================================================

output "cloudfront_distribution_id" {
  description = "CloudFrontディストリビューションID"
  value       = module.cdn.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFrontドメイン名"
  value       = module.cdn.cloudfront_domain_name
}

output "app_url" {
  description = "アプリケーションURL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

# =============================================================================
# セキュリティ出力
# =============================================================================

output "waf_web_acl_arn" {
  description = "WAF WebACL ARN"
  value       = module.security.waf_web_acl_arn
}

output "secrets_manager_arns" {
  description = "Secrets Manager ARN一覧"
  value       = module.security.secrets_manager_arns
  sensitive   = true
}

# =============================================================================
# 監視出力
# =============================================================================

output "sns_topic_warning_arn" {
  description = "Warning SNSトピックARN"
  value       = module.monitoring.sns_topic_warning_arn
}

output "sns_topic_critical_arn" {
  description = "Critical SNSトピックARN"
  value       = module.monitoring.sns_topic_critical_arn
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatchダッシュボードURL"
  value       = module.monitoring.cloudwatch_dashboard_url
}
