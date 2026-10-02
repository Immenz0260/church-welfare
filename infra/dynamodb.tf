resource "aws_dynamodb_table" "members" {
  name         = "${var.project_name}-members"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "memberId"

  attribute {
    name = "memberId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "payments" {
  name         = "${var.project_name}-payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "memberId"
  range_key    = "paidAt"

  attribute {
    name = "memberId"
    type = "S"
  }

  attribute {
    name = "paidAt"
    type = "S"
  }
}
