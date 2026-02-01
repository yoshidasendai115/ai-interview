output "acm_certificate_arn" {
  description = "ACM証明書ARN（リージョン）"
  value       = aws_acm_certificate.main.arn
}

output "acm_certificate_arn_cloudfront" {
  description = "ACM証明書ARN（CloudFront用）"
  value       = aws_acm_certificate.cloudfront.arn
}

output "waf_web_acl_arn" {
  description = "WAF WebACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}

output "waf_web_acl_id" {
  description = "WAF WebACL ID"
  value       = aws_wafv2_web_acl.main.id
}

output "ec2_instance_profile_name" {
  description = "EC2インスタンスプロファイル名"
  value       = aws_iam_instance_profile.ec2.name
}

output "ec2_role_arn" {
  description = "EC2ロールARN"
  value       = aws_iam_role.ec2.arn
}

output "secrets_manager_arns" {
  description = "Secrets Manager ARN一覧"
  value = var.create_secrets ? {
    app_secrets   = aws_secretsmanager_secret.app_secrets[0].arn
    heygen_api    = aws_secretsmanager_secret.heygen_api[0].arn
    openai_api    = aws_secretsmanager_secret.openai_api[0].arn
    google_cloud  = aws_secretsmanager_secret.google_cloud[0].arn
    mintoku_work  = aws_secretsmanager_secret.mintoku_work[0].arn
  } : {}
}
