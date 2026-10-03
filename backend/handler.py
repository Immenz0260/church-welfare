import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Key, Attr

ddb = boto3.resource("dynamodb")
members_table = ddb.Table(os.environ.get("MEMBERS_TABLE", "church-welfare-members"))
payments_table = ddb.Table(os.environ.get("PAYMENTS_TABLE", "church-welfare-payments"))
deleted_table = ddb.Table(os.environ.get("DELETED_MEMBERS_TABLE", "church-welfare-deleted-members"))


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
    paid_at = datetime.now(timezone.utc).isoformat()

    if not member_id:
        # No memberId given — check if a member with this exact name already exists
        existing = members_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("nameLower").eq(name.lower())
        ).get("Items", [])
        if existing:
            member_id = existing[0]["memberId"]

    if not member_id:
        member_id = str(uuid.uuid4())
        members_table.put_item(
            Item={
                "memberId": member_id,
                "name": name,
                "nameLower": name.lower(),
                "total": amount,
                "lastPaidAt": paid_at,
                "paymentCount": 1,
            }
        )
    else:
        members_table.update_item(
            Key={"memberId": member_id},
            UpdateExpression=(
                "SET #t = if_not_exists(#t, :zero) + :amt, "
                "lastPaidAt = :paid_at, "
                "paymentCount = if_not_exists(paymentCount, :zero) + :one"
            ),
            ExpressionAttributeNames={"#t": "total"},
            ExpressionAttributeValues={
                ":amt": amount,
                ":zero": Decimal(0),
                ":one": 1,
                ":paid_at": paid_at,
            },
        )

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


def delete_member(member_id):
    result = members_table.get_item(Key={"memberId": member_id})
    member = result.get("Item")
    if not member:
        return respond(404, {"error": "member not found"})

    deleted_table.put_item(
        Item={
            "memberId": member["memberId"],
            "name": member["name"],
            "deletedAt": datetime.now(timezone.utc).isoformat(),
        }
    )

    members_table.delete_item(Key={"memberId": member_id})
    # Payments table is intentionally untouched — full history stays queryable

    return respond(200, {"deleted": member_id})


def get_report(query_params):
    month = (query_params or {}).get("month")  # expected format: "YYYY-MM"
    if not month:
        return respond(400, {"error": "month query parameter is required, e.g. ?month=2026-10"})

    members = members_table.scan().get("Items", [])
    members.sort(key=lambda m: m.get("nameLower", ""))

    report = []
    for m in members:
        payments = payments_table.query(
            KeyConditionExpression=Key("memberId").eq(m["memberId"])
        ).get("Items", [])

        month_payments = [p for p in payments if p["paidAt"].startswith(month)]
        amount_in_month = sum(p["amount"] for p in month_payments)

        report.append({
            "memberId": m["memberId"],
            "name": m["name"],
            "paidInMonth": len(month_payments) > 0,
            "amountInMonth": amount_in_month,
            "total": m.get("total", Decimal(0)),
            "lastPaidAt": m.get("lastPaidAt"),
            "paymentCount": m.get("paymentCount", 0),
        })

    return respond(200, report)


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

    if route == "DELETE /members/{memberId}":
        member_id = event.get("pathParameters", {}).get("memberId")
        if not member_id:
            return respond(400, {"error": "memberId is required"})
        return delete_member(member_id)

    if route == "GET /reports":
        return get_report(event.get("queryStringParameters"))

    return respond(404, {"error": "route not found"})