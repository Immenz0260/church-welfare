output "members_table_name" {
  value = aws_dynamodb_table.members.name
}

output "payments_table_name" {
  value = aws_dynamodb_table.payments.name
}

output "members_table_arn" {
  value = aws_dynamodb_table.members.arn
}

output "payments_table_arn" {
  value = aws_dynamodb_table.payments.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "api_url" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "deleted_members_table_name" {
  value = aws_dynamodb_table.deleted_members.name
}
