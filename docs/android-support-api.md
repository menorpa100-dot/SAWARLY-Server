# SAWARLY Android API integration

Base URL: `https://sawarly-server-2zv6br97s-mahmoud-f62b.vercel.app` (preview only; use the current branch deployment URL during testing).

All support endpoints require:
`Authorization: Bearer <Supabase access_token>`

The access token must be the current signed-in Supabase user's access token. Never send the Supabase service-role key from Android.

## Customer support

### List my tickets
`GET /api/support/tickets`

Response:
```json
{ "success": true, "tickets": [{ "id": "uuid", "subject": "عنوان المشكلة", "category": "technical", "status": "open", "created_at": "...", "updated_at": "..." }] }
```

### Create a ticket
`POST /api/support/tickets`

JSON:
```json
{ "subject": "المشكلة باختصار", "category": "technical" }
```

Allowed categories: `technical`, `account`, `subscription`, `other`.

### List messages
`GET /api/support/tickets/{ticketId}/messages`

### Send a message
`POST /api/support/tickets/{ticketId}/messages`

JSON:
```json
{ "message": "تفاصيل المشكلة..." }
```

User messages are accepted only while the ticket is open.

## Staff-only endpoints

Staff authorization is based on trusted Supabase `app_metadata.role` values `admin` or `support`. A role in user-editable metadata is not accepted.

- `GET /api/support/staff/tickets`
- `POST /api/support/staff/tickets/{ticketId}/messages` with `{ "message": "..." }`
- `PATCH /api/support/staff/tickets/{ticketId}/resolve`

## UI states

- Empty: "لسه مفيش طلبات دعم"
- Open: "قيد المتابعة"
- Resolved: "تم الحل"
- Network/auth failure: show a retry action; do not discard the typed message.
- Never show another user's ticket or messages.

## Preview limitation

This API branch is a preview. Do not point production users at it until Android integration, authorization tests, and deployment review are complete.
