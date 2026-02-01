output "static_bucket_name" {
  description = "静的ファイル用S3バケット名"
  value       = aws_s3_bucket.static.id
}

output "static_bucket_arn" {
  description = "静的ファイル用S3バケットARN"
  value       = aws_s3_bucket.static.arn
}

output "static_bucket_domain" {
  description = "静的ファイル用S3バケットドメイン"
  value       = aws_s3_bucket.static.bucket_regional_domain_name
}

output "static_bucket_id" {
  description = "静的ファイル用S3バケットID"
  value       = aws_s3_bucket.static.id
}

output "media_bucket_name" {
  description = "メディア用S3バケット名"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "メディア用S3バケットARN"
  value       = aws_s3_bucket.media.arn
}

output "logs_bucket_name" {
  description = "ログ用S3バケット名"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "ログ用S3バケットARN"
  value       = aws_s3_bucket.logs.arn
}

output "logs_bucket_id" {
  description = "ログ用S3バケットID"
  value       = aws_s3_bucket.logs.id
}
