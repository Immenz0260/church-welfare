"""
Local smoke test. Needs real AWS credentials (aws configure)
because it talks to the actual DynamoDB tables created in Task 2.
"""
import json
from handler import handler

# Test 1: list members (should be empty at first)
event = {"routeKey": "GET /members"}
result = handler(event, None)
print("GET /members ->", result["statusCode"], result["body"])

# Test 2: record a first-time payment
event = {
    "routeKey": "POST /payments",
    "body": json.dumps({"name": "Test Member", "amount": 25}),
}
result = handler(event, None)
print("POST /payments ->", result["statusCode"], result["body"])

# Capture the memberId for the next test
member_id = json.loads(result["body"])["memberId"]

# Test 3: get that member's history
event = {
    "routeKey": "GET /members/{memberId}/payments",
    "pathParameters": {"memberId": member_id},
}
result = handler(event, None)
print("GET history ->", result["statusCode"], result["body"])