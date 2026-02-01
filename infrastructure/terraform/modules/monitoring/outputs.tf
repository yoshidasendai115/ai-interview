output "sns_topic_warning_arn" {
  description = "Warning SNSトピックARN"
  value       = aws_sns_topic.warning.arn
}

output "sns_topic_critical_arn" {
  description = "Critical SNSトピックARN"
  value       = aws_sns_topic.critical.arn
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatchダッシュボードURL"
  value       = "https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "cloudwatch_log_group_app" {
  description = "アプリケーションログロググループ名"
  value       = aws_cloudwatch_log_group.app.name
}

output "cloudtrail_arn" {
  description = "CloudTrail ARN"
  value       = aws_cloudtrail.main.arn
}
