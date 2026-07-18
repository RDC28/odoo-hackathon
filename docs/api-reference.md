# API Reference

Base URL: `/api`. Auth via `Authorization: Bearer <jwt>` unless noted. All list
endpoints are scoped to the caller's `company_id` automatically.

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create account (name, email/phone, password, photo) |
| POST | `/auth/login` | Email/mobile + password → access + refresh token |
| POST | `/auth/refresh` | Exchange refresh token for a new access token |
| POST | `/auth/logout` | Invalidate refresh token |

## Users / Profile

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Current user profile |
| PUT | `/users/me` | Update profile fields |
| POST | `/users/me/photo` | Upload profile photo |

## Saved Places (Settings > Saved Places)

| Method | Path | Description |
|---|---|---|
| GET | `/saved-places` | List my saved places (Home, Office, ...) |
| POST | `/saved-places` | Save a place (label + address + lat/lng) |
| DELETE | `/saved-places/:id` | Remove a saved place |

## Vehicles (My Vehicle screen)

| Method | Path | Description |
|---|---|---|
| GET | `/vehicles` | List my vehicles |
| POST | `/vehicles` | Add vehicle |
| GET | `/vehicles/:id` | Vehicle detail |
| PUT | `/vehicles/:id` | Edit vehicle |
| DELETE | `/vehicles/:id` | Remove vehicle |

## Rides (Offer Ride / Find Ride)

| Method | Path | Description |
|---|---|---|
| POST | `/rides` | Publish a ride (Offer Ride → Publish Ride). Rejected unless the driver has ≥1 registered vehicle |
| GET | `/rides/search?start=&dest=&date=&time=&seats=&recurring=` | Find Ride — matching available rides, sorted by departure-time proximity (driver rating shown per card) |
| GET | `/rides/:id` | Ride detail |
| DELETE | `/rides/:id` | Cancel a published ride |
| GET | `/rides/route-preview?start=&dest=` | Route polyline via OSRM for Route Confirmation screen |

## Bookings (My Trips / Ride History / Track Ride)

| Method | Path | Description |
|---|---|---|
| POST | `/bookings` | Book Now on a ride |
| GET | `/bookings/my-trips` | Active/upcoming trips |
| GET | `/bookings/history` | Completed trips (Ride History) |
| GET | `/bookings/:id` | Trip detail (driver, vehicle, route) |
| PATCH | `/bookings/:id/status` | Advance the trip lifecycle: `booked → started → in_progress → completed → payment_pending → payment_completed` (driver drives start/finish; payment endpoints drive the last hop) |
| POST | `/bookings/:id/cancel` | Cancel a booking; frees the ride's seats (bonus feature) |
| GET | `/bookings/:id/track` | Latest driver location + ETA (also pushed live via socket) |
| POST | `/bookings/:id/rating` | Rate the driver 1–5 after completion (bonus, BlaBlaCar-style) |

### Socket.IO events — live tracking (namespace `/tracking`)

Active only between trip `started` and `completed` (per the problem statement, live
location sharing is enabled only while a trip is active).

| Direction | Event | Payload |
|---|---|---|
| driver → server | `location:ping` | `{ ride_id, lat, lng, speed_kmh }` |
| server → riders on the trip | `location:update` | `{ ride_id, lat, lng, eta_minutes, status }` |
| server → all participants | `trip:status` | `{ ride_id, status }` on every lifecycle change |

## Payments & Wallet

| Method | Path | Description |
|---|---|---|
| POST | `/payments/order` | Create a Razorpay **Test Mode** order for card/UPI (returns `order_id` for the client SDK) |
| POST | `/payments/verify` | Verify the Razorpay signature callback, mark booking `payment_completed` |
| POST | `/payments/charge` | Pay Now via wallet (debits balance) or record a cash payment |
| GET | `/payments/:booking_id` | Payment status for a booking |
| GET | `/wallet` | Wallet balance + transaction history |
| POST | `/wallet/recharge` | Recharge Wallet — creates a Razorpay test order, credits balance on verify |

Card/UPI never touch real money: everything runs against the Razorpay sandbox as the
problem statement requires. Wallet and cash are handled entirely internally.

## Admin

| Method | Path | Description |
|---|---|---|
| GET | `/admin/employees` | Employees tab list |
| POST | `/admin/employees` | + Add Employee |
| PATCH | `/admin/employees/:id/access` | Grant/Revoke platform access |
| GET | `/admin/vehicles` | Vehicles tab list |
| PATCH | `/admin/vehicles/:id/status` | Activate/deactivate a vehicle |
| GET | `/admin/settings` | Company details + carpool config |
| PUT | `/admin/settings` | Save Settings |
| GET | `/admin/reports` | Reports & Analytics: total trips, total distance travelled, fuel consumption, cost per km, vehicle-wise cost analysis, fuel-efficiency trends, monthly financial summary (fuel/cost figures derived from `location_pings` distance × the company's `carpool_config` rates) |

## Chat

REST covers history/bootstrap; live delivery is over Socket.IO (see
[chat-system.md](chat-system.md)).

| Method | Path | Description |
|---|---|---|
| GET | `/chat/conversations` | All conversations for me: global channel, my DMs, active ride chats |
| GET | `/chat/conversations/global` | Get (or lazily create) my company's global channel |
| POST | `/chat/conversations/dm` | `{ user_id }` → find-or-create a DM with that employee |
| GET | `/chat/conversations/:id/messages?before=&limit=50` | Paginated history, newest-first |
| POST | `/chat/conversations/:id/messages` | Send a message (REST fallback; primary path is the socket event) |
| POST | `/chat/conversations/:id/read` | Mark conversation read up to a message id |

### Socket.IO events (namespace `/chat`)

| Direction | Event | Payload |
|---|---|---|
| client → server | `join` | `{ conversation_id }` |
| client → server | `message:send` | `{ conversation_id, content, attachment_url? }` |
| server → clients in room | `message:new` | full message document |
| client → server | `typing:start` / `typing:stop` | `{ conversation_id }` |
| server → clients in room | `typing:update` | `{ conversation_id, user_id, typing }` |
| server → client | `presence:update` | `{ user_id, online }` |
