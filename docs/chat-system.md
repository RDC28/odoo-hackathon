# Ride chat

Ascend uses a small, ride-scoped chat rather than a permanent organization-wide
messenger. This keeps the prototype focused and matches the expected carpooling
flow.

## Rules

| Rule | Behavior |
|---|---|
| Scope | One conversation belongs to one booking/ride |
| Members | The driver and the booked rider(s) only |
| Creation | Created when a booking is created |
| Availability | Visible while the booking is active |
| End | Read-only after cancellation or completion |
| Access | Tenant and participant checks apply on every request |

The employee Chat navigation item shows the caller's ride conversations. Trip
Detail also exposes the same conversation through “Chat with Driver”. A call
button uses `tel:` and is intentionally separate from chat.

## Prototype implementation

The frontend stores conversations and messages in the localStorage mock database.
The `storage` event lets two open browser tabs refresh their conversation list
after the other tab sends a message. This is adequate for a demo but is not a
distributed realtime system.

## Production implementation

Keep the same conversation model and replace the transport with authenticated
REST plus WebSocket events. On connect, and again for every join/send operation,
verify that the user belongs to the booking and organization. Close or reject
messages when the booking enters `completed` or `cancelled`. Use Redis as the
Socket.IO message queue when more than one backend worker is deployed.

Permanent global chat, employee directory DMs, threads, reactions, and push
notifications are deliberately out of scope for this prototype.
