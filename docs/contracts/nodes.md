# Microgrid Nodes: Initial Map Contract

This initial contract supplies active sample nodes to authenticated web and Android clients for map development. It is deliberately read-only; node creation, updates, schedules, deactivation safeguards, and reservation checks are owned by the future node-management feature.

## Get active nodes

```text
GET /api/nodes
Authorization: Bearer <token>
```

Allowed roles: any authenticated `Backoffice`, `GridOperator`, or `Prosumer` account.

Successful response: `200 OK`

```json
[
  {
    "id": "node-colombo-central",
    "name": "Colombo Central Hub",
    "latitude": 6.9271,
    "longitude": 79.8612,
    "capacityKw": 250.0,
    "availableBatterySlots": 12
  }
]
```

Only active nodes are returned. Clients must display an empty state when the response is an empty array.
