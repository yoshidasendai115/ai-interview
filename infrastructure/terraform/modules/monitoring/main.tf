# =============================================================================
# 監視モジュール
# =============================================================================

locals {
  name_prefix = "${var.project}-${var.environment}"
}

# =============================================================================
# SNSトピック - Warning
# =============================================================================

resource "aws_sns_topic" "warning" {
  name = "${local.name_prefix}-alerts-warning"

  tags = {
    Name = "${local.name_prefix}-alerts-warning"
  }
}

# =============================================================================
# SNSトピック - Critical
# =============================================================================

resource "aws_sns_topic" "critical" {
  name = "${local.name_prefix}-alerts-critical"

  tags = {
    Name = "${local.name_prefix}-alerts-critical"
  }
}

# =============================================================================
# SNSサブスクリプション - Email
# =============================================================================

resource "aws_sns_topic_subscription" "email_critical" {
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# =============================================================================
# CloudWatch Alarms - EC2
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "ec2_cpu_warning" {
  alarm_name          = "${local.name_prefix}-ec2-cpu-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU使用率が80%を超えました"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-ec2-cpu-warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu_critical" {
  alarm_name          = "${local.name_prefix}-ec2-cpu-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 95
  alarm_description   = "EC2 CPU使用率が95%を超えました"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-ec2-cpu-critical"
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_status_check" {
  alarm_name          = "${local.name_prefix}-ec2-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2ステータスチェック失敗"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-ec2-status-check"
  }
}

# =============================================================================
# CloudWatch Alarms - ALB
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${local.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xxエラーが10件/分を超えました"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = {
    Name = "${local.name_prefix}-alb-5xx-errors"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_response_time_warning" {
  alarm_name          = "${local.name_prefix}-alb-response-time-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 2
  alarm_description   = "ALBレスポンスタイム(P95)が2秒を超えました"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = {
    Name = "${local.name_prefix}-alb-response-time-warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy_hosts" {
  alarm_name          = "${local.name_prefix}-alb-healthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "ALBヘルシーホストが0になりました"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = {
    Name = "${local.name_prefix}-alb-healthy-hosts"
  }
}

# =============================================================================
# CloudWatch Alarms - RDS
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "rds_cpu_warning" {
  alarm_name          = "${local.name_prefix}-rds-cpu-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU使用率が80%を超えました"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-rds-cpu-warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_warning" {
  alarm_name          = "${local.name_prefix}-rds-storage-warning"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Minimum"
  threshold           = 10737418240  # 10GB in bytes
  alarm_description   = "RDSストレージ残量が10GB未満です"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-rds-storage-warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_critical" {
  alarm_name          = "${local.name_prefix}-rds-storage-critical"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Minimum"
  threshold           = 5368709120  # 5GB in bytes
  alarm_description   = "RDSストレージ残量が5GB未満です"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name = "${local.name_prefix}-rds-storage-critical"
  }
}

# =============================================================================
# CloudWatch Alarms - ElastiCache
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "elasticache_cpu_warning" {
  alarm_name          = "${local.name_prefix}-elasticache-cpu-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ElastiCache CPU使用率が80%を超えました"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }

  tags = {
    Name = "${local.name_prefix}-elasticache-cpu-warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "elasticache_memory_warning" {
  alarm_name          = "${local.name_prefix}-elasticache-memory-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ElastiCacheメモリ使用率が80%を超えました"
  alarm_actions       = [aws_sns_topic.warning.arn]
  ok_actions          = [aws_sns_topic.warning.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }

  tags = {
    Name = "${local.name_prefix}-elasticache-memory-warning"
  }
}

# =============================================================================
# CloudWatch Alarms - CloudFront
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_error_rate" {
  alarm_name          = "${local.name_prefix}-cloudfront-5xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "CloudFront 5xxエラー率が5%を超えました"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.critical.arn]

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
    Region         = "Global"
  }

  tags = {
    Name = "${local.name_prefix}-cloudfront-5xx-error-rate"
  }
}

# =============================================================================
# CloudWatch Dashboard
# =============================================================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# ${var.project} (${var.environment}) 監視ダッシュボード"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "EC2 CPU使用率"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.ec2_instance_id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "ALBレスポンスタイム"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { stat = "p50", label = "P50" }],
            ["...", { stat = "p95", label = "P95" }],
            ["...", { stat = "p99", label = "P99" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "ALBリクエスト数"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS CPU使用率"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "RDS接続数"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "ElastiCacheメモリ使用率"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", var.elasticache_cluster_id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "ALBエラー率"
          region = "ap-northeast-1"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { label = "5xx" }],
            [".", "HTTPCode_Target_4XX_Count", ".", ".", { label = "4xx" }]
          ]
          period = 60
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "CloudFrontエラー率"
          region = "us-east-1"
          metrics = [
            ["AWS/CloudFront", "5xxErrorRate", "DistributionId", var.cloudfront_distribution_id, "Region", "Global", { label = "5xx" }],
            [".", "4xxErrorRate", ".", ".", ".", ".", { label = "4xx" }]
          ]
          period = 300
          stat   = "Average"
        }
      }
    ]
  })
}

# =============================================================================
# CloudTrail
# =============================================================================

resource "aws_cloudtrail" "main" {
  name                          = "${local.name_prefix}-trail"
  s3_bucket_name                = var.logs_bucket_id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    Name = "${local.name_prefix}-trail"
  }
}

# =============================================================================
# Budget
# =============================================================================

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$${var.project}"]
  }
}

# =============================================================================
# アプリケーションログ用 CloudWatch Log Group
# =============================================================================

resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ec2/${local.name_prefix}-api"
  retention_in_days = 90

  tags = {
    Name = "${local.name_prefix}-app-logs"
  }
}
