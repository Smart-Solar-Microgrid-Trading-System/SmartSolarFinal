# Account Management API Plan (Team Draft)

> Status: planning draft. The team must review, revise, and approve this before
> independently implementing the API and clients.

## Purpose

Establish account data, role permissions, and API behaviour before the web and
Android clients are built. All account rules must execute in the central API;
clients only display data and send requests.

## Proposed user document: `Users`

| Field | Type | Rule |
| --- | --- | --- |
| `_id` | string | NIC for a Prosumer; unique username for Backoffice/Grid Operator |
| `passwordHash` | string | BCrypt hash only; never return it in API responses |
| `role` | string | `Backoffice`, `GridOperator`, or `Prosumer` |
| `fullName` | string | Required |
| `email` | string | Required; validate format |
| `phone` | string | Required; validate agreed local/international format |
| `accountStatus` | string | `Pending`, `Active`, or `Deactivated` |
| `createdAt` | UTC date-time | Set by API |
| `updatedAt` | UTC date-time | Set by API on every change |
| `deactivationRequestedAt` | UTC date-time/null | Used for Prosumer self-service deactivation requests |

## Status and permission rules

| Action | Backoffice | Grid Operator | Prosumer |
| --- | --- | --- | --- |
| Create Backoffice/Grid Operator user | Yes | No | No |
| Register Prosumer account | No (API public registration) | No | Yes |
| View pending Prosumer accounts | Yes | No | No |
| Activate/deactivate/reactivate a Prosumer | Yes | No | No |
| Edit own profile | Yes | Yes | Yes |
| Request own deactivation | No | No | Yes |
| Log in | Active accounts only | Active accounts only | Active accounts only |

Team decision required: confirm whether a Backoffice user may deactivate another
Backoffice user. Safest initial rule: no user may deactivate their own account,
and one protected administrator account must always remain active.

## Proposed endpoints

| Method and path | Purpose | Access |
| --- | --- | --- |
| `POST /api/auth/login` | Verify credentials and return access details | Public |
| `POST /api/prosumers/register` | Create a Pending Prosumer account | Public |
| `GET /api/users/me` | Read the signed-in user's profile | Any authenticated user |
| `PUT /api/users/me` | Update the signed-in user's editable profile fields | Any authenticated user |
| `POST /api/users/me/deactivation-request` | Request deactivation of own Prosumer account | Prosumer |
| `POST /api/users` | Create a Backoffice or Grid Operator account | Backoffice |
| `GET /api/prosumers?status=Pending` | List Prosumer accounts by status | Backoffice |
| `PATCH /api/prosumers/{nic}/status` | Activate, deactivate, or reactivate a Prosumer | Backoffice |

## Core request and response examples

### Register Prosumer

`POST /api/prosumers/register`

```json
{
  "nic": "200112345678",
  "fullName": "Example Prosumer",
  "email": "prosumer@example.com",
  "phone": "+94770000000",
  "password": "a-user-chosen-password"
}
```

Success: `201 Created`; return a safe profile object, with `accountStatus` set to
`Pending`. Do not return a token until a Backoffice user activates the account.

### Login

`POST /api/auth/login`

```json
{
  "identifier": "operator1",
  "password": "a-user-chosen-password"
}
```

Success: `200 OK`

```json
{
  "token": "jwt-access-token",
  "role": "GridOperator",
  "name": "Example Operator",
  "accountStatus": "Active"
}
```

### Change Prosumer status

`PATCH /api/prosumers/200112345678/status`

```json
{
  "accountStatus": "Active"
}
```

Success: `200 OK`; return the updated safe profile object.

## Standard error response

Use one shape for all expected API errors:

```json
{
  "error": "validation_failed",
  "message": "NIC is already registered.",
  "fields": {
    "nic": "This NIC is already in use."
  }
}
```

Use: `400` for invalid request data, `401` for missing/invalid login token,
`403` for authenticated users without permission or non-Active accounts, `404`
for a missing resource, and `409` for duplicate NIC/username/email conflicts.

## Acceptance checks before frontend integration

1. A Prosumer can register, but cannot log in until activated.
2. An Active user can log in and receives their correct role.
3. Pending and Deactivated users receive no token.
4. A Prosumer cannot call Backoffice endpoints.
5. A Backoffice user can view and action pending Prosumer accounts.
6. Password hashes and JWT signing secrets never appear in API responses.
