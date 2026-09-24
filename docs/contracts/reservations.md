# Energy Reservations Contract

Energy reservations are owned by authenticated Prosumers. The API obtains `ProsumerId` from the JWT `NameIdentifier` claim and never accepts an owner ID in a request body.

## Shared dependencies

- Node collection: `MicrogridNodes`
- Node identifier: `Id`
- Slot collection: `EnergyBookingSlots`
- Slot node field: `NodeId`
- Slot states used by reservations: `Available` and `Reserved`
- A create or slot-changing update atomically changes an active slot from `Available` to `Reserved`.
- A cancellation atomically changes its slot from `Reserved` to `Available`.

## Endpoints

All endpoints require the `Prosumer` authorization policy.

```text
POST   /api/reservations
GET    /api/reservations/{id}
PUT    /api/reservations/{id}
DELETE /api/reservations/{id}
```

Create and update requests contain `microgridNodeId`, `bookingSlotId`, and `energyAmountKwh`. The API derives `scheduledStartUtc` from the selected slot. Create, update, and cancellation return the complete reservation summary.

`DELETE` is a soft cancellation. It sets the reservation status to `Cancelled`, records `cancelledAtUtc`, and retains the MongoDB document.

## Rules

- New reservations start as `Pending`.
- The slot start must be in the future and no more than seven days away.
- Exactly seven days in advance is allowed.
- Updates and cancellations require at least twelve hours of notice.
- Exactly twelve hours of notice is allowed.
- The node must exist and be active.
- The slot must exist, be active, belong to the selected node, and be available.
- Cancelled and completed reservations cannot be modified.
- Only the reservation owner may read, update, or cancel it.
- All API dates are ISO 8601 UTC values.
