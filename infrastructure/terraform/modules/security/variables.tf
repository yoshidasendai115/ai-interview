variable "project" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "domain_name" {
  description = "ドメイン名"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "waf_allowed_countries" {
  description = "WAFで許可する国コード"
  type        = list(string)
}

variable "waf_rate_limit" {
  description = "WAFレート制限"
  type        = number
}

variable "waf_auth_rate_limit" {
  description = "認証エンドポイントのレート制限"
  type        = number
}

variable "create_secrets" {
  description = "Secrets Managerにシークレットを作成するか"
  type        = bool
  default     = true
}
