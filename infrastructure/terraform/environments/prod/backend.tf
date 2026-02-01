terraform {
  backend "s3" {
    bucket         = "ai-interview-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "ai-interview-terraform-locks"
  }
}
