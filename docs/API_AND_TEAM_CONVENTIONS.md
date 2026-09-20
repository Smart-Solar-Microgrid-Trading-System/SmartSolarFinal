# Smart Solar Microgrid API and Team Conventions

This document is the shared baseline for all feature work. It keeps the web application, native Android application, and C# API consistent while allowing each member to deliver a complete vertical feature.

## Architecture rule

- The C# Web API is the central service and owns business rules, validation, authorization, and MongoDB access.
- The React web application and native Kotlin Android application communicate with the API only through REST calls.
- Neither client connects directly to MongoDB.
- Android may use SQLite only for local session/cache data; SQLite is not the system of record.

## Roles

| Role | Main responsibility |
|---|---|
| `Backoffice` | Web administration, including web-user and Prosumer account administration. |
| `GridOperator` | Operational web/mobile functions, including the future QR energy-transfer workflow. |
| `Prosumer` | Mobile registration, profile control, reservations, QR dispatch, and booking views. |

Prosumer NIC is the primary identifier. Grid Operator and Backoffice accounts use a username; they are created by Backoffice rather than self-registering.

## Authentication and account status

- Clients send the JWT as `Authorization: Bearer <token>`.
- JWT contains user ID, role, and name.
- Only `Active` accounts can receive a token and sign in.
- Account statuses are exactly `Pending`, `Active`, and `Deactivated`.
- New Prosumer accounts are `Pending`.
- Only Backoffice can activate, deactivate, or reactivate a Prosumer account.

## API conventions

- API routes begin with `/api`.
- JSON request and response property names use camelCase.
- Dates/times returned by new APIs must use ISO 8601 UTC values.
- Passwords are sent only in relevant requests and are never returned. Password hashes are never returned.
- Clients must show a clear user-facing message for API errors and must not expose server internals.

### Account input validation

- Prosumer NIC accepts a 12-digit Sri Lankan NIC or a legacy nine-digit NIC ending in `V` or `X`.
- Passwords must be 8-72 characters.
- Web usernames must be 3-50 characters using letters, digits, dots, underscores, or hyphens.
- Full names cannot exceed 100 characters; emails cannot exceed 254 characters.
- Phone is optional, but when supplied must contain 7-20 phone-compatible characters.
- New NICs are normalized to uppercase and emails to lowercase before duplicate checks.

### HTTP status usage

| Status | Meaning |
|---|---|
| `200 OK` | Successful read/update/action. |
| `201 Created` | Successful creation. |
| `400 Bad Request` | Invalid request data or rule violation. |
| `401 Unauthorized` | Missing/invalid authentication. |
| `403 Forbidden` | Authenticated account lacks permission or is not Active. |
| `404 Not Found` | Requested record does not exist. |
| `409 Conflict` | Duplicate/contradictory record, such as duplicate NIC, email, or username. |

For application-level errors, return a clear JSON payload such as:

```json
{ "error": "A user with this NIC already exists." }
```

ASP.NET validation may return standard Problem Details containing an `errors` object. New client work must handle both formats until the team deliberately standardizes validation responses.

## Feature delivery rule

Each member owns an assigned **vertical feature** where practical:

1. C# API endpoint(s), authorization, business rules, and MongoDB persistence.
2. Relevant React web UI and/or Kotlin Android UI.
3. API and client-side verification.

Before implementing a new feature, its owner records a short contract: endpoint, HTTP method, roles, request fields, response fields, status values, rule checks, and expected error cases.

## Before starting reservations, nodes, QR, or operator transfer

The relevant feature owner must agree and document:

- Reservation/node/transfer status names.
- Required request and response fields.
- Role permissions.
- The 7-day reservation scheduling rule.
- The 12-hour reservation update/cancellation rule.
- QR generation, validation, expiry, and completion behavior.

## IIS integration rule

- The published C# API is hosted on Windows IIS.
- The React web application is hosted separately from the API, while both may use the same IIS laptop.
- The web site uses port `8080`; web and Android clients use the IIS API base address on port `5000` appropriate to the current LAN.
- Android saves a verified API address locally in its Server Settings screen.
- No personal IIS publish profiles, LAN IP addresses, or firewall settings are committed to Git.
