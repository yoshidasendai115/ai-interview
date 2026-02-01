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

variable "route53_zone_id" {
  description = "Route 53ホストゾーンID"
  type        = string
  default     = ""
}

variable "static_bucket_domain" {
  description = "静的ファイル用S3バケットドメイン"
  type        = string
}

variable "static_bucket_id" {
  description = "静的ファイル用S3バケットID"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS名"
  type        = string
}

variable "acm_certificate_arn_cloudfront" {
  description = "ACM証明書ARN（CloudFront用）"
  type        = string
}

variable "waf_web_acl_arn" {
  description = "WAF WebACL ARN"
  type        = string
}

variable "logs_bucket_name" {
  description = "ログ用S3バケット名"
  type        = string
}
