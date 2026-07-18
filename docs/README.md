# Enterprise Carpooling Platform — Technical Documentation

This is the technical documentation for the Enterprise Carpooling Platform: an internal
app that lets employees of a company offer and find rides with each other, tracks trips
and payments, gives admins oversight of employees/vehicles, and (new) gives employees a
Discord-style chat system for talking to each other.

Sources:
- Problem statement: [`Carpooling Platform (1).pdf`](../Carpooling%20Platform%20(1).pdf) — the hackathon brief this design must satisfy (see [requirements-mapping.md](requirements-mapping.md) for the checklist)
- Wireframe: [`Carpooling Platform - 24 hours.svg`](../Carpooling%20Platform%20-%2024%20hours.svg) (Excalidraw, employee app + admin dashboard)
- Product reference: **BlaBlaCar** — the closest real-world product. We borrow its proven patterns: per-seat pricing, instant booking, driver profile with ratings, recurring commute rides and in-app rider↔driver messaging — adapted to a closed enterprise context (only verified employees of the same company).

## Stack

| Layer | Choice |
|---|---|
| Mobile/employee app | React (React Native) |
| Admin web dashboard | React |
| Backend API | Python + Flask |
| Realtime (chat, live tracking) | Flask-SocketIO |
| Database | MongoDB |
| Maps / geocoding / routing | Leaflet + OpenStreetMap tiles, Nominatim (geocoding), OSRM (routing) |
| Payments | Razorpay **Test Mode** (card/UPI sandbox, per the problem statement) + internal wallet |
| Auth | JWT (access + refresh) |

## Documents

1. [Architecture](architecture.md) — system diagram, services, repo layout, deployment
2. [Data Model](data-model.md) — MongoDB collections and their fields
3. [API Reference](api-reference.md) — REST endpoints, grouped by module
4. [Chat System](chat-system.md) — the Discord-like employee chat (global channel + DMs) and how it folds in the wireframe's existing "Chat with Driver" ride chat
5. [Screens & Flows](screens-flows.md) — every screen from the wireframe mapped to its purpose and backing endpoints
6. [Requirements Mapping](requirements-mapping.md) — problem-statement mandatory/bonus features → where each is covered in this design

## Core domain, in one paragraph

A **company** has **employees** (users), some of whom register **vehicles**. An employee
with a vehicle can **offer a ride** (publish start/destination, time, seats, per-seat
fare — BlaBlaCar-style); other employees can **find a ride** and **book** seats on it
(one driver, one or more passengers). Bookings become **trips** with a defined lifecycle
(booked → started → in progress → completed → payment pending → payment completed),
are tracked live on a map while active, paid via **wallet/cash/card/UPI** (Razorpay
test mode), and logged to **ride history** which feeds the **reports** dashboard.
Admins manage employee access, vehicle approval, and company-wide settings/reports.
Employees can also **chat** with each other — one-to-one, or in a single company-wide
channel — independently of any ride, plus a per-trip chat with their driver/rider.
