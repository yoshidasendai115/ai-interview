# =============================================================================
# コンピューティングモジュール
# =============================================================================

locals {
  name_prefix = "${var.project}-${var.environment}"
}

# =============================================================================
# ALB
# =============================================================================

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod"

  dynamic "access_logs" {
    for_each = var.logs_bucket_name != "" ? [1] : []
    content {
      bucket  = var.logs_bucket_name
      prefix  = "alb"
      enabled = true
    }
  }

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

# =============================================================================
# ALB ターゲットグループ
# =============================================================================

resource "aws_lb_target_group" "main" {
  name     = "${local.name_prefix}-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/v1/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "${local.name_prefix}-tg"
  }
}

# =============================================================================
# ALB リスナー - HTTPS
# =============================================================================

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  tags = {
    Name = "${local.name_prefix}-https-listener"
  }
}

# =============================================================================
# ALB リスナー - HTTP (リダイレクト)
# =============================================================================

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name = "${local.name_prefix}-http-listener"
  }
}

# =============================================================================
# EC2 AMI（最新のAmazon Linux 2023）
# =============================================================================

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# =============================================================================
# EC2インスタンス
# =============================================================================

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name != "" ? var.ec2_key_name : null
  vpc_security_group_ids = [var.ec2_security_group_id]
  subnet_id              = var.private_subnet_ids[0]
  iam_instance_profile   = var.ec2_instance_profile_name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ec2_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # システム更新
    dnf update -y

    # Python 3.11インストール
    dnf install -y python3.11 python3.11-pip

    # 必要パッケージ
    dnf install -y git

    # CloudWatch Agent
    dnf install -y amazon-cloudwatch-agent

    # アプリケーションディレクトリ
    mkdir -p /opt/ai-interview
    chown ec2-user:ec2-user /opt/ai-interview
  EOF
  )

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  monitoring = true

  tags = {
    Name = "${local.name_prefix}-api"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

# =============================================================================
# ターゲットグループへの登録
# =============================================================================

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.main.arn
  target_id        = aws_instance.app.id
  port             = 8000
}
