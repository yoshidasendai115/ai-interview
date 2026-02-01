# AI面接プラットフォーム Terraformインフラストラクチャ

## 概要

このディレクトリには、AI面接プラットフォームのAWSインフラストラクチャをTerraformで管理するためのコードが含まれています。

## ディレクトリ構成

```
terraform/
├── environments/
│   ├── dev/                    # 開発環境設定
│   │   ├── backend.tf          # S3バックエンド設定
│   │   └── terraform.tfvars    # 変数値
│   ├── stg/                    # ステージング環境設定
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   └── prod/                   # 本番環境設定
│       ├── backend.tf
│       └── terraform.tfvars
├── modules/
│   ├── networking/             # VPC、サブネット、セキュリティグループ
│   ├── security/               # WAF、ACM、Secrets Manager、IAM
│   ├── compute/                # EC2、ALB
│   ├── database/               # RDS、ElastiCache
│   ├── storage/                # S3バケット
│   ├── cdn/                    # CloudFront、Route 53
│   └── monitoring/             # CloudWatch、SNS、CloudTrail
├── main.tf                     # メインモジュール構成
├── variables.tf                # 変数定義
├── outputs.tf                  # 出力定義
└── versions.tf                 # プロバイダー設定
```

## 前提条件

1. **Terraform** v1.6.0以上
2. **AWS CLI** 設定済み（適切なIAM権限）
3. **S3バケット** Terraformステート保存用
4. **DynamoDB テーブル** ステートロック用

## 初期セットアップ

### 1. ステート管理用リソースの作成

```bash
# S3バケット作成
aws s3 mb s3://ai-interview-terraform-state --region ap-northeast-1

# バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket ai-interview-terraform-state \
  --versioning-configuration Status=Enabled

# 暗号化有効化
aws s3api put-bucket-encryption \
  --bucket ai-interview-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# DynamoDBテーブル作成（ステートロック用）
aws dynamodb create-table \
  --table-name ai-interview-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 2. 環境設定ファイルの編集

```bash
# 開発環境の設定を編集
vim environments/dev/terraform.tfvars
```

必須設定項目：
- `domain_name` - ドメイン名
- `route53_zone_id` - Route 53ホストゾーンID
- `alert_email` - アラート通知先メール
- `admin_ip_addresses` - SSH許可IPアドレス
- `ec2_key_name` - EC2キーペア名

## 使用方法

### 開発環境のデプロイ

```bash
cd infrastructure/terraform

# 初期化
terraform init \
  -backend-config="environments/dev/backend.tf"

# プラン確認
terraform plan \
  -var-file="environments/dev/terraform.tfvars"

# 適用
terraform apply \
  -var-file="environments/dev/terraform.tfvars"
```

### ステージング環境のデプロイ

```bash
# ワークスペース切り替え
terraform workspace new stg

# 初期化
terraform init \
  -backend-config="environments/stg/backend.tf"

# プラン確認
terraform plan \
  -var-file="environments/stg/terraform.tfvars"

# 適用
terraform apply \
  -var-file="environments/stg/terraform.tfvars"
```

### 本番環境のデプロイ

```bash
# ワークスペース切り替え
terraform workspace new prod

# 初期化
terraform init \
  -backend-config="environments/prod/backend.tf"

# プラン確認
terraform plan \
  -var-file="environments/prod/terraform.tfvars"

# 適用
terraform apply \
  -var-file="environments/prod/terraform.tfvars"
```

## モジュール説明

### networking
- VPC（パブリック/プライベートサブネット）
- インターネットゲートウェイ
- NAT Gateway（本番のみ）
- セキュリティグループ（ALB、EC2、RDS、ElastiCache）
- VPC Flow Logs

### security
- ACM証明書（リージョン、CloudFront用）
- WAF WebACL
  - AWS マネージドルール（SQLi、XSS、Common）
  - レート制限
  - Geo制限（東南アジア諸国許可）
  - 認証エンドポイント保護
- Secrets Manager（API キー管理）
- IAMロール・ポリシー

### compute
- ALB（HTTPS、HTTP→HTTPSリダイレクト）
- EC2インスタンス（Amazon Linux 2023）
- ターゲットグループ

### database
- RDS PostgreSQL 16（暗号化有効）
- ElastiCache Redis 7（暗号化有効、認証トークン）
- パスワードはSecrets Managerで管理

### storage
- S3バケット（静的ファイル用）
- S3バケット（メディア用、90日ライフサイクル）
- S3バケット（ログ用、Glacierへの移行）

### cdn
- CloudFront（セキュリティヘッダー設定済み）
- Route 53レコード
- Origin Access Identity

### monitoring
- CloudWatch Alarms（EC2、ALB、RDS、ElastiCache、CloudFront）
- CloudWatch Dashboard
- SNSトピック（Warning、Critical）
- CloudTrail
- AWS Budgets

## 出力値

デプロイ後、以下の情報が出力されます：

```bash
terraform output
```

- `app_url` - アプリケーションURL
- `api_url` - API URL
- `rds_endpoint` - RDSエンドポイント
- `elasticache_endpoint` - ElastiCacheエンドポイント
- `cloudwatch_dashboard_url` - ダッシュボードURL

## Secrets Manager

デプロイ後、以下のシークレットに値を設定してください：

1. `ai-interview-{env}/heygen-api` - HeyGen APIキー
2. `ai-interview-{env}/openai-api` - OpenAI APIキー
3. `ai-interview-{env}/google-cloud` - Google Cloud認証情報
4. `ai-interview-{env}/mintoku-work` - mintoku work SSO設定

```bash
aws secretsmanager put-secret-value \
  --secret-id ai-interview-dev/heygen-api \
  --secret-string '{"api_key":"your-heygen-api-key"}'
```

## 削除

```bash
# リソースの削除
terraform destroy \
  -var-file="environments/dev/terraform.tfvars"
```

**注意**: 本番環境ではRDSの`deletion_protection`が有効になっています。削除前に無効化が必要です。

## セキュリティ考慮事項

- すべてのデータストアは暗号化有効
- TLS 1.2以上を強制
- WAFによるレート制限とGeo制限
- Secrets Managerによる機密情報管理
- VPC Flow LogsとCloudTrailによる監査
- 最小権限のIAMポリシー
