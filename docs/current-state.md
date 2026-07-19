# Current product state

This is the source of truth for the prototype as it exists today. Older design
notes may describe a mobile app, MongoDB, global chat, or real socket tracking;
those are future architecture ideas, not the current browser behavior.

## Roles and boundaries

### Employee

An employee can be both rider and driver. They can:

- find a ride and choose pickup, destination, date, time, and seats;
- offer a ride after registering an approved vehicle;
- select home/work/custom addresses from saved places;
- use Leaflet with address suggestions, map picking, reverse geocoding, and OSRM
  route previews;
- book seats, view trips and history, chat with the people on that booking, and
  call the driver through the device dialer;
- run a visual route simulation from Track Ride;
- pay a completed trip using wallet, cash, or Razorpay Test Mode.

The tracking simulation is presentation-only. It does not share GPS, change the
ride lifecycle, charge the driver, or complete a ride. Replay/reset is available;
the driver completes the ride manually from My Trips.

### Organization admin

An organization admin manages only their tenant:

- approve, suspend, reject, or deactivate employee accounts;
- register and manage organization vehicles;
- review analytics and configure fuel, mileage, and pricing assumptions;
- view organization settings and the employee join code.

When creating an employee, the home address is personal and map-picked. The work
address is selected from the organization's assigned workplace/company address.
Branches are not part of the product model.

### Platform super admin

The super-admin console provides a cross-organization operational view:

- overview metrics for organizations, users, vehicles, rides, bookings, and
  completed rides;
- health queues and recent activity;
- organization search and management;
- suspend/restore organization platform access;
- rotate an organization's join code.

It does not expose tenant-level employee or ride editing.

## Booking and seat safety

Vehicle seating capacity excludes the driver. A ride cannot publish more seats
than the vehicle allows, and booking seats cannot exceed the remaining capacity.
The browser mock updates localStorage for the demo. The Flask backend implements
the real concurrency boundary: an atomic MongoDB
`update_one({_id, status: 'active', seats_available: {$gte: seats}}, {$inc:
{seats_available: -seats}})`, followed by booking creation. A failed update
returns HTTP 409.

For production, add an idempotency key to booking requests, payment-hold expiry,
database indexes, and WebSocket/SSE availability updates. See the concurrency
section in [architecture.md](architecture.md).

## Driver approval before start

New bookings are pending driver approval in the browser prototype. The driver
approves each passenger in My Trips; the driver cannot start while a booking is
pending. A rider can reject a pending request. Existing seeded bookings default
to approved so seeded workflows remain usable.

## Ride-scoped chat

Chat is intentionally limited to a booking's lifecycle, similar to a ride-hailing
app. A conversation is created when a booking is made and is available only to the
driver and rider(s) of that ride. It is read-only after cancellation or completion.
There is no organization-wide channel or permanent employee DM in the current
product.

## Payments

Wallet and cash are local prototype flows. Razorpay order creation and signature
verification use the Flask backend and Test Mode credentials from environment
variables. Never commit keys; keep `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in
the backend `.env`. A 401 from Razorpay means the server-side key pair is invalid,
reversed, malformed, or loaded from the wrong environment.

## Seeded demo and showcase path

The bundled seed data includes multiple organizations, employees, vehicles,
future rides, bookings, ride conversations, saved places, completed history, and
nearby map records. To show the main path:

1. Load demo data on the landing page.
2. Log in as `priya@demo.com`.
3. Open Find Ride and choose Home/Office or search from ISKCON Cross Road to
   Infocity on a future weekday.
4. Confirm the route, open the available rides, and book one seat.
5. Open the booking in My Trips. In a second browser profile, log in as
   `raj@demo.com` and approve the passenger from the driver's My Trips.
6. Return to Priya, open Track Ride, and run the visual simulation. Replay it if
   it finishes; do not treat the simulation as trip completion.
7. From the driver's My Trips, start and complete the ride manually, then use
   Pay from the rider account.

## Known prototype boundaries

- localStorage mock API is not safe for true multi-tab concurrent booking;
- live tracking is visual route playback, not GPS or WebSocket location sharing;
- maps depend on public OpenStreetMap/Nominatim/OSRM services and can be rate
  limited or unavailable offline;
- employee analytics are intentionally removed for now; analytics remain in the
  organization-admin dashboard;
- the frontend and backend are parallel contracts rather than one fully connected
  application, except for Razorpay calls.
