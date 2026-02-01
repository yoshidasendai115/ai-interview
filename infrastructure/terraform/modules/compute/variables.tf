variable "project" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "パブリックサブネットID"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "プライベートサブネットID"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALBセキュリティグループID"
  type        = string
}

variable "ec2_security_group_id" {
  description = "EC2セキュリティグループID"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2インスタンスタイプ"
  type        = string
}

variable "ec2_volume_size" {
  description = "EC2 EBSボリュームサイズ"
  type        = number
}

variable "ec2_key_name" {
  description = "EC2 SSHキーペア名"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM証明書ARN"
  type        = string
}

variable "ec2_instance_profile_name" {
  description = "EC2インスタンスプロファイル名"
  type        = string
}

variable "logs_bucket_name" {
  description = "ログ用S3バケット名"
  type        = string
  default     = ""
}
