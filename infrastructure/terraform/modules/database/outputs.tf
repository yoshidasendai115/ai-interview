output "rds_endpoint" {
  description = "RDSエンドポイント"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDSアドレス"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDSポート"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDSデータベース名"
  value       = aws_db_instance.main.db_name
}

output "rds_instance_id" {
  description = "RDSインスタンスID"
  value       = aws_db_instance.main.identifier
}

output "rds_secret_arn" {
  description = "RDSパスワードシークレットARN"
  value       = aws_secretsmanager_secret.rds_password.arn
}

output "elasticache_endpoint" {
  description = "ElastiCacheエンドポイント"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "elasticache_port" {
  description = "ElastiCacheポート"
  value       = 6379
}

output "elasticache_cluster_id" {
  description = "ElastiCacheクラスターID"
  value       = aws_elasticache_replication_group.main.id
}

output "elasticache_secret_arn" {
  description = "Redis認証シークレットARN"
  value       = aws_secretsmanager_secret.redis_auth.arn
}
