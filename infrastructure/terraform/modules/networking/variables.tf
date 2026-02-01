variable "project" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
}

variable "availability_zones" {
  description = "使用するAZ"
  type        = list(string)
}

variable "admin_ip_addresses" {
  description = "管理者IPアドレス（SSH許可）"
  type        = list(string)
  default     = []
}
