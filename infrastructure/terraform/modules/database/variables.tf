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

variable "private_subnet_ids" {
  description = "プライベートサブネットID"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "RDSセキュリティグループID"
  type        = string
}

variable "elasticache_security_group_id" {
  description = "ElastiCacheセキュリティグループID"
  type        = string
}

variable "rds_instance_class" {
  description = "RDSインスタンスクラス"
  type        = string
}

variable "rds_allocated_storage" {
  description = "RDSストレージサイズ"
  type        = number
}

variable "rds_database_name" {
  description = "データベース名"
  type        = string
}

variable "rds_username" {
  description = "RDSマスターユーザー名"
  type        = string
}

variable "rds_multi_az" {
  description = "RDS Multi-AZ有効化"
  type        = bool
}

variable "elasticache_node_type" {
  description = "ElastiCacheノードタイプ"
  type        = string
}

variable "elasticache_num_cache_nodes" {
  description = "ElastiCacheノード数"
  type        = number
}
