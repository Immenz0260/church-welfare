data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../backend/handler.py"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.handler"
  runtime       = "python3.12"
  timeout       = 10

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      MEMBERS_TABLE  = aws_dynamodb_table.members.name
      PAYMENTS_TABLE = aws_dynamodb_table.payments.name
    }
  }
}
