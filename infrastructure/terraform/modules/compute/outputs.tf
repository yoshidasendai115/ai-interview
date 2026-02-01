output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS名"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB ホストゾーンID"
  value       = aws_lb.main.zone_id
}

output "alb_arn_suffix" {
  description = "ALB ARNサフィックス（CloudWatch用）"
  value       = aws_lb.main.arn_suffix
}

output "target_group_arn" {
  description = "ターゲットグループARN"
  value       = aws_lb_target_group.main.arn
}

output "target_group_arn_suffix" {
  description = "ターゲットグループARNサフィックス（CloudWatch用）"
  value       = aws_lb_target_group.main.arn_suffix
}

output "ec2_instance_id" {
  description = "EC2インスタンスID"
  value       = aws_instance.app.id
}

output "ec2_private_ip" {
  description = "EC2プライベートIP"
  value       = aws_instance.app.private_ip
}
