import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb")
members_table = ddb.Table(os.environ.get("MEMBERS_TABLE", "church-welfare-members"))
payments_table = ddb.Table(os.environ.get("PAYMENTS_TABLE", "church-welfare-payments"))


def respond(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def list_members():
    items = members_table.scan().get("Items", [])
    items.sort(key=lambda m: m.get("nameLower", ""))
    return respond(200, items)


def record_payment(body):
    try:
        data = json.loads(body or "{}")
    except json.JSONDecodeError:
        return respond(400, {"error": "Invalid JSON body"})

    name = (data.get("name") or "").strip()
    try:
        amount = Decimal(str(data.get("amount", 0)))
    except Exception:
        return respond(400, {"error": "amount must be a number"})

    if not name or amount <= 0:
        return respond(400, {"error": "name and a positive amount are required"})

    member_id = data.get("memberId")
    if not member_id:
        member_id = str(uuid.uuid4())
        members_table.put_item(
            Item={"memberId": member_id, "name": name, "nameLower": name.lower()}
        )

    paid_at = datetime.now(timezone.utc).isoformat()
    payments_table.put_item(
        Item={"memberId": member_id, "paidAt": paid_at, "amount": amount}
    )
    return respond(201, {"memberId": member_id, "paidAt": paid_at})


def get_history(member_id):
    result = payments_table.query(
        KeyConditionExpression=Key("memberId").eq(member_id),
        ScanIndexForward=False,
    )
    return respond(200, result.get("Items", []))


def handler(event, context):
    route = event.get("routeKey", "")

    if route == "GET /members":
        return list_members()

    if route == "POST /payments":
        return record_payment(event.get("body"))

    if route == "GET /members/{memberId}/payments":
        member_id = event.get("pathParameters", {}).get("memberId")
        if not member_id:
            return respond(400, {"error": "memberId is required"})
        return get_history(member_id)

    return respond(404, {"error": "route not found"})