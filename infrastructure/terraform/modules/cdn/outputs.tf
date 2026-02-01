output "cloudfront_distribution_id" {
  description = "CloudFrontディストリビューションID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "CloudFrontドメイン名"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFrontホストゾーンID"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_oai_arn" {
  description = "CloudFront OAI ARN"
  value       = aws_cloudfront_origin_access_identity.main.iam_arn
}

output "route53_zone_id" {
  description = "Route 53ゾーンID"
  value       = local.zone_id
}
