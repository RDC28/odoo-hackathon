# API reference

The frontend mock API in `frontend/src/api/api.js` mirrors these contracts. The
Flask backend is the intended production source of truth; exact route prefixes are
shown as `/api`.

## Auth and organizations

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate an employee, admin, or super admin |
| POST | `/auth/signup` | Create a pending employee account using a join code |
| POST | `/organizations` | Create an organization and its first admin |
| GET | `/users/me` | Current profile and organization |

## Rides and bookings

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/rides/search` | Tenant-scoped ride search |
| POST | `/rides` | Publish a ride after vehicle/capacity validation |
| PUT | `/rides/:id/start` | Driver starts an approved ride |
| PUT | `/rides/:id/complete` | Driver manually completes a ride |
| POST | `/bookings` | Atomically reserve seats and create a booking |
| GET | `/bookings` | Current user's bookings |
| GET | `/bookings/:id` | Booking details and ride chat reference |
| PUT | `/bookings/:id/cancel` | Cancel/reject a booking and restore seats where applicable |
| PUT | `/bookings/:id/approve` | Driver approval before start |

`POST /bookings` returns `409 Conflict` when the conditional seat decrement affects
zero rows. Clients should refresh results and show the user that availability
changed. Production clients should also send an idempotency key.

## Maps

| Operation | Provider |
|---|---|
| Address search/reverse geocode | Nominatim |
| Tiles and markers | Leaflet + OpenStreetMap |
| Route geometry/distance/ETA | OSRM |

## Vehicles, places, wallet, and history

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/vehicles` | List or register a vehicle |
| PUT/DELETE | `/vehicles/:id` | Edit or remove a vehicle |
| GET/POST | `/saved-places` | List or save a user place |
| PUT/DELETE | `/saved-places/:id` | Edit or remove a saved place |
| GET | `/wallet` | Wallet balance and transactions |
| POST | `/wallet/recharge` | Add demo wallet funds |
| GET | `/bookings/history` | Completed trip history |
| GET | `/admin/reports` | Organization-admin analytics |

## Payments

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/payments/razorpay/order` | Create a Test Mode order server-side |
| POST | `/payments/razorpay/verify` | Verify the payment signature server-side |
| POST | `/payments/charge` | Complete wallet or cash payment |

Razorpay secrets are backend environment variables only. Never put the secret in
frontend source or browser storage.

## Ride chat

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/chat/conversations` | Current user's ride conversations |
| GET | `/chat/conversations/:id/messages` | Paginated ride messages |
| POST | `/chat/conversations/:id/messages` | Send a participant-authorized message |

Messages are rejected after cancellation/completion. A future WebSocket layer may
emit new messages, but it must preserve the same participant and lifecycle checks.
