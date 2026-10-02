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
