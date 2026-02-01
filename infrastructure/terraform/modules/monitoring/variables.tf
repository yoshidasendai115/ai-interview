variable "project" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

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
  description = "Warning通知用SlackチャンネルID"
  type        = string
  default     = ""
}

variable "slack_channel_id_critical" {
  description = "Critical通知用SlackチャンネルID"
  type        = string
  default     = ""
}

variable "monthly_budget" {
  description = "月間予算 (USD)"
  type        = number
}

variable "ec2_instance_id" {
  description = "EC2インスタンスID"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ALB ARNサフィックス"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "ターゲットグループARNサフィックス"
  type        = string
}

variable "rds_instance_id" {
  description = "RDSインスタンスID"
  type        = string
}

variable "elasticache_cluster_id" {
  description = "ElastiCacheクラスターID"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFrontディストリビューションID"
  type        = string
}

variable "logs_bucket_id" {
  description = "ログ用S3バケットID"
  type        = string
}
