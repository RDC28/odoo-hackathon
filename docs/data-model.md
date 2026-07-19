# Data model

The browser mock stores JSON arrays under the localStorage database key
`carpool_db_v3`. The backend uses SQLAlchemy models with equivalent fields. IDs
are UUID-like strings in the browser and database identifiers in the backend.

## Core records

### Company

`_id`, `name`, `industry`, `registered_address`, `admin_contact`, `join_code`,
`platform_status`, and `carpool_config` (`fuel_cost_per_liter`, `cost_per_km`,
`travel_cost_operational_per_km`, `workplace_address`).

### User

`_id`, `company_id`, `name`, `email`, `phone`, `password` (mock only), `department`,
`role` (`employee`, `admin`, `superadmin`), `status`, `wallet_balance`, and rating
fields. A normal employee may be both rider and driver.

### Vehicle

`_id`, `company_id`, `owner_id`, `type`, `model`, `registration_number`,
`seating_capacity`, `mileage_kmpl`, `photo`, and `status`. Seating capacity is
passenger capacity and excludes the driver.

### Ride

`_id`, `company_id`, `driver_id`, `vehicle_id`, `start_location`,
`destination_location`, `departure_at`, `recurring_days`, `seats_total`,
`seats_available`, `price_per_seat`, `route_coords`, `distance_km`, `duration_min`,
and `status` (`active`, `started`, `in_progress`, `completed`, `cancelled`).

### Booking

`_id`, `ride_id`, `rider_id`, `seats_booked`, `pickup_point`, `drop_point`, `fare`,
`status`, `conversation_id`, `driver_approval`, `rider_approval`, and timestamps.
New browser bookings start with `driver_approval: pending`; seeded bookings default
to approved for demo continuity.

### Saved place

`_id`, `user_id`, `label` (`Home`, `Office`, or custom), `address`, `lat`, and `lng`.
Home and custom places are user-owned. The organization workplace is controlled by
the admin and is not a user branch record.

### Conversation and message

A conversation has `company_id`, `type: ride`, `ride_id`, `participant_ids`, and
`last_message_at`. Messages have `conversation_id`, `sender_id`, `content`, and
timestamps. Conversations are read-only after their booking ends.

### Payment and wallet transaction

Payments reference a booking, amount, method, status, and optional Razorpay order
and payment IDs. Wallet transactions record credit/debit, amount, balance after,
reference, and timestamp.

## Capacity invariant

For every active ride:

```text
0 <= seats_available <= seats_total <= vehicle.seating_capacity
```

The backend enforces the decrement atomically. The browser mock enforces the same
business rule synchronously within its localStorage request.

## Production indexes

Use tenant/status/departure indexes for ride search, company/email uniqueness for
users, company/registration uniqueness for vehicles, rider/status for bookings,
user ownership for saved places, and conversation/timestamp ordering for chat.
