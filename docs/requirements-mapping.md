# Requirements Mapping

Checklist of the problem statement (`Carpooling Platform (1).pdf`) against this design,
so nothing mandatory is missed and every bonus we attempt is explicit.

## Mandatory features (§8)

| Requirement | Where covered |
|---|---|
| Authentication (login, sign up, profile) | [api-reference.md → Auth](api-reference.md#auth), Splash/Login/Sign Up screens |
| Ride Discovery (pickup, destination, date, time, seats, recurring) | `GET /rides/search`, Find Ride screen |
| Ride Publishing (route, seats, fare/seat; requires ≥1 registered vehicle) | `POST /rides`, Offer Ride screen |
| Route Confirmation (calculated route shown before search/publish) | `GET /rides/route-preview` (OSRM + Leaflet), Route Confirmation screen |
| Ride Booking (instant book, one driver + N passengers) | `POST /bookings`, Available Rides screen |
| Trip Management (details, lifecycle booked→…→payment completed) | `bookings.status` lifecycle, My Trips screens, [state diagram](screens-flows.md#key-user-flows) |
| Live Trip Tracking (live location, route, ETA, markers, status; active-trip only) | `/tracking` socket namespace, `location_pings` collection, Track Ride screen |
| Vehicle Management (model, reg. number, seating capacity) | `/vehicles` endpoints, My Vehicle screen |
| Payments & Wallet (cash/card/UPI/wallet; Razorpay Test Mode) | [api-reference.md → Payments & Wallet](api-reference.md#payments--wallet) |
| Ride History (participants, route, vehicle, date/time, status) | `GET /bookings/history`, Ride History screen |
| Reports Dashboard (total trips, distance, fuel, cost/km, vehicle-wise, efficiency trends) | `GET /admin/reports`, Report screen |

## Communication requirement (§5.4)

"Passengers and drivers can communicate throughout the trip using Chat and Voice Call"
→ ride chat in [chat-system.md](chat-system.md) + a call button that deep-links to the
phone dialer (`tel:`). Our chat system **exceeds** the requirement with company-wide
global chat and employee DMs (Discord-style), built on the same engine.

## Assumptions honored (§7)

- Multi-organization: every document carries `company_id`; all queries tenant-scoped.
- Only authenticated employees of a registered org get access; admin can revoke.
- One driver, ≥1 passengers per ride, bounded by seating capacity.
- Driver must register a vehicle before publishing (enforced on `POST /rides`).
- Mapping via OpenStreetMap stack (Leaflet/Nominatim/OSRM) — no paid keys.
- Live location shared only while a trip is active (socket gated on trip status).
- Payments via Razorpay **Test Mode** only — no real money.
- Reports computed from trip/vehicle/ping data collected by the app itself.

## Bonus features (§8) — status

| Bonus | Plan |
|---|---|
| Ride Cancellation | ✅ designed — `POST /bookings/:id/cancel`, seats freed |
| Ride Notifications / Real-time Push | ⚠️ partial — in-app socket events (`trip:status`, `message:new`) are designed; OS-level push (FCM) is a stretch goal |
| Intelligent Ride Matching | ⚠️ stretch — v1 matches on locations + date proximity; polyline-overlap matching (rider's route lies along driver's `route_polyline`, BlaBlaCar-style) is the designed upgrade path |
| Route Optimization | ⚠️ stretch — OSRM already returns the optimal route; multi-pickup ordering is future work |
| Enhanced Analytics | ✅ partial — fuel-efficiency trends and vehicle-wise cost included in `/admin/reports` |
| **Employee chat (our own addition)** | ✅ designed — global channel + DMs, [chat-system.md](chat-system.md) |
| Driver ratings (BlaBlaCar-inspired, our own addition) | ✅ designed — `POST /bookings/:id/rating`, shown on ride cards |
