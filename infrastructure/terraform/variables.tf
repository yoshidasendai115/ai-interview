# =============================================================================
# 基本設定
# =============================================================================

variable "project" {
  description = "プロジェクト名"
  type        = string
  default     = "ai-interview"
}

variable "environment" {
  description = "環境名 (dev/stg/prod)"
  type        = string

  validation {
    condition     = contains(["dev", "stg", "prod"], var.environment)
    error_message = "environment must be 'dev', 'stg', or 'prod'"
  }
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

# =============================================================================
# ネットワーク設定
# =============================================================================

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "使用するAZ"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "admin_ip_addresses" {
  description = "管理者IPアドレス（SSH許可）"
  type        = list(string)
  default     = []
}

# =============================================================================
# EC2設定
# =============================================================================

variable "ec2_instance_type" {
  description = "EC2インスタンスタイプ"
  type        = string
  default     = "t3.medium"
}

variable "ec2_volume_size" {
  description = "EC2 EBSボリュームサイズ (GB)"
  type        = number
  default     = 30
}

variable "ec2_key_name" {
  description = "EC2 SSHキーペア名"
  type        = string
  default     = ""
}

# =============================================================================
# RDS設定
# =============================================================================

variable "rds_instance_class" {
  description = "RDSインスタンスクラス"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDSストレージサイズ (GB)"
  type        = number
  default     = 20
}

variable "rds_database_name" {
  description = "データベース名"
  type        = string
  default     = "ai_interview"
}

variable "rds_username" {
  description = "RDSマスターユーザー名"
  type        = string
  default     = "ai_interview_admin"
}

variable "rds_multi_az" {
  description = "RDS Multi-AZ有効化"
  type        = bool
  default     = false
}

# =============================================================================
# ElastiCache設定
# =============================================================================

variable "elasticache_node_type" {
  description = "ElastiCacheノードタイプ"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_cache_nodes" {
  description = "ElastiCacheノード数"
  type        = number
  default     = 1
}

# =============================================================================
# ドメイン設定
# =============================================================================

variable "domain_name" {
  description = "ドメイン名"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53ホストゾーンID（既存の場合）"
  type        = string
  default     = ""
}

# =============================================================================
# WAF設定
# =============================================================================

variable "waf_allowed_countries" {
  description = "WAFで許可する国コード"
  type        = list(string)
  default     = ["JP", "VN", "PH", "ID", "TH", "MM", "KH", "NP"]
}

variable "waf_rate_limit" {
  description = "WAFレート制限（5分間のリクエスト数）"
  type        = number
  default     = 2000
}

variable "waf_auth_rate_limit" {
  description = "認証エンドポイントのレート制限（5分間）"
  type        = number
  default     = 50
}

# =============================================================================
# 監視・通知設定
# =============================================================================

variable "alert_email" {
  description = "アラート通知先メールアドレス"
  type        = string
}

variable "slack_workspace_id" {
  description = "Slack ワークスペースID"
  type        = string
  default     = ""
}

variable "slack_channel_id_warning" {
  description = "Warning通知用Slackチャンネル ID"
  type        = string
  default     = ""
}

variable "slack_channel_id_critical" {
  description = "Critical通知用SlackチャンネルID"
  type        = string
  default     = ""
}

# =============================================================================
# コスト管理
# =============================================================================

variable "monthly_budget" {
  description = "月間予算 (USD)"
  type        = number
  default     = 200
}

# =============================================================================
# 外部API設定（Secrets Manager経由で管理）
# =============================================================================

variable "create_secrets" {
  description = "Secrets Managerにシークレットを作成するか"
  type        = bool
  default     = true
}
