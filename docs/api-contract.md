# API Contract

Base URL: `CONFIG.API_URL` (never hardcode it in the frontend code).
All requests and responses use JSON.

## 1. List all members
`GET /members`

Response `200`, sorted A to Z by name:
```json
[
  { "memberId": "a1b2-...", "name": "Kwame Mensah", "nameLower": "kwame mensah" }
]
```
Used by: the members page, its search bar, and the name suggestions on the payment page. Load it once, then filter in the browser.

## 2. Record a payment
`POST /payments`

First-time payer (no memberId):
```json
{ "name": "Ama Owusu", "amount": 50 }
```
Returning payer (name picked from the suggestions):
```json
{ "name": "Kwame Mensah", "amount": 20, "memberId": "a1b2-..." }
```
Response `201`:
```json
{ "memberId": "a1b2-...", "paidAt": "2026-09-28T14:03:22+00:00" }
```
The date is set by the server. The frontend never sends it.

## 3. Payment history of one member
`GET /members/{memberId}/payments`

Response `200`, newest first:
```json
[
  { "memberId": "a1b2-...", "paidAt": "2026-09-28T14:03:22+00:00", "amount": 20 }
]
```

## Errors
All errors look like this:
```json
{ "error": "human readable message" }
```
| Status | Meaning |
|---|---|
| 400 | Missing name, or amount is not a positive number |
| 404 | Unknown route |
| 500 | Server problem |

## Notes for the frontend
- `paidAt` is in UTC. Show it in local time with `new Date(paidAt).toLocaleString()`.
- `amount` is a number.
- If the user types a name but does not click a suggestion, do not send `memberId`.
