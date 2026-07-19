# Ascend documentation

Ascend is a closed-organization carpooling prototype. Employees can publish and
find rides inside their own organization, preview routes on a map, book seats,
communicate with the other people on a booked ride, simulate tracking, and pay
through wallet, cash, or Razorpay Test Mode. Organization admins manage their
workspace; the platform super admin manages organization access.

## Start here

- [Current product state](current-state.md) — canonical implementation and demo guide
- [Screens and flows](screens-flows.md) — role-based navigation and lifecycle
- [Requirements mapping](requirements-mapping.md) — problem statement coverage
- [Architecture](architecture.md) — current prototype architecture and production path
- [Data model](data-model.md) — localStorage and backend record shapes
- [API reference](api-reference.md) — endpoint contract for the backend swap
- [Chat system](chat-system.md) — ride-scoped messaging rules

## Repository map

```text
frontend/   React + Vite employee, organization-admin, and super-admin prototype
backend/    Flask + PyMongo (MongoDB) API, reports, payments, and atomic booking route
docs/       Product, architecture, data, API, and demo documentation
```

## Important prototype boundary

Normal frontend flows currently use a deterministic localStorage data layer so the
prototype can run without a database. Razorpay order creation and payment
verification call the Flask backend. The backend already contains the production
seat-reservation pattern: a conditional atomic decrement followed by booking
creation in one transaction. The localStorage layer is intentionally not a real
concurrency boundary.

## Demo accounts

Use the login page's demo dropdown, or load demo data from the landing page:

| Role | Email | Password |
|---|---|---|
| Employee rider | `priya@demo.com` | `demo123` |
| Employee driver | `raj@demo.com` | `demo123` |
| Organization admin | `admin@demo.com` | `demo123` |
| Platform super admin | `superadmin@platform.com` | `superadmin123` |

Organization join codes in the seeded demo include `DEMO01` and `ACME01`.
