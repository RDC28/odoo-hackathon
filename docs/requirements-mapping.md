# Requirements mapping

| Problem-statement capability | Current implementation | Status |
|---|---|---|
| Authentication and roles | Login, employee signup, organization registration, admin and super-admin guards | Implemented in prototype |
| Ride discovery | Find Ride form, saved-place shortcuts, Leaflet route preview, seeded results | Implemented |
| Ride publishing | Offer Ride requires an active vehicle and bounds seats by passenger capacity | Implemented |
| Route confirmation | Leaflet map plus OSRM route geometry before search/publish | Implemented |
| Seat booking | Seat count decreases and cannot exceed availability in the mock; backend atomic reservation exists | Prototype + backend-ready |
| Driver approval | Driver approves each new rider before starting; rider can reject pending request | Implemented in frontend prototype |
| Trip lifecycle | Booked, started/in progress, completed, payment pending/completed, cancelled | Implemented |
| Live tracking | Shared visual simulation using route geometry; no real GPS sharing | Deliberately prototype-only |
| Vehicle management | Employee and admin vehicle screens with capacity and mileage | Implemented |
| Payments and wallet | Wallet/cash mock flows and Razorpay Test Mode backend integration | Implemented |
| Ride history and reports | Rider/driver history and organization-admin analytics | Implemented; employee analytics deferred |
| Ride communication | Booking-scoped driver/rider chat and call link | Implemented |
| Organization isolation | Company-scoped mock records and backend authorization pattern | Implemented in prototype contract |
| Saved addresses | Home/Office/custom labels with map pin, drag, reverse geocode, edit/delete | Implemented |
| Super-admin operations | Organization directory, suspend/restore, join-code rotation, platform overview | Implemented |

## Intentional deviations

- The browser demo uses localStorage rather than the backend for normal app flows.
- The tracking screen is a visual playback, not a location-sharing service.
- Chat is ride-scoped; there is no global channel or permanent employee DM.
- Branches were removed. Work addresses come from the organization's assigned
  workplace/company address; home addresses remain personal map-picked places.
- Employee analytics are hidden until their data contract is stable; admin
  analytics remain available.

## Production follow-up

Connect the frontend mock API to Flask, enforce the atomic booking transaction at
the only write boundary, add idempotency keys and reservation expiry, and use
WebSocket/SSE notifications for seat availability. Load-test two simultaneous
booking requests against the backend and verify exactly one succeeds when one seat
remains.
