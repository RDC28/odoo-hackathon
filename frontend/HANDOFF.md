# Frontend Simplification — Handoff

**Goal:** make the React frontend easier to understand **without changing how it looks or behaves**. Same stack (React + Vite + react-router + Leaflet), no new libraries (no axios, no UI kits), **no custom hooks**, no CSS/markup changes beyond what's listed. The localStorage data layer (`src/api/db.js` + `src/api/api.js`) stays exactly as it is — it *is* the simple design; only the two Razorpay `fetch()` calls talk to the Flask backend and they stay unchanged.

> Backend simplification is **already done and verified** (SQLAlchemy JSON columns, deduped auth decorators, fixed `carpool_config`, single-pass reports, blueprint prefixes, Razorpay helpers split). The demo DB was re-seeded; server runs on port 5000. **Do not touch `backend/`.**

Work through the checklist in order; tick items off as you complete them.

---

## 1. [x] Create `src/utils.js` — shared formatting helpers

Plain functions, no imports, no hooks:

```js
// Small formatting helpers shared across pages.

// "ISKCON Cross Road, Ahmedabad, Gujarat" -> "ISKCON Cross Road"
export function shortAddress(address) {
  return (address || '').split(',')[0]
}

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : ''
}

// "payment_pending" -> "payment pending"
export function statusLabel(status) {
  return (status || '').replace(/_/g, ' ')
}

// Trip/ride lifecycle colors ('active' ride = blue).
export function tripBadgeClass(status) {
  if (['booked', 'active'].includes(status)) return 'badge-blue'
  if (['started', 'in_progress'].includes(status)) return 'badge-amber'
  if (['completed', 'payment_completed'].includes(status)) return 'badge-green'
  if (status === 'payment_pending') return 'badge-amber'
  return 'badge-red'
}

// Employee-account colors ('active' account = green). Kept separate from
// tripBadgeClass because the word 'active' means different things.
export function accountBadgeClass(status) {
  if (status === 'active') return 'badge-green'
  if (status === 'pending_approval') return 'badge-amber'
  return 'badge-red'  // suspended | rejected | deactivated
}
```

## 2. [x] Replace the duplicated inline logic with the helpers

Rendered output must stay pixel-identical. Call sites (line numbers as of this handoff):

- **`.address.split(',')[0]` → `shortAddress(...)`**
  - `pages/Dashboard.jsx` line 75
  - `pages/MyTrips.jsx` lines 33, 48
  - `pages/RideHistory.jsx` lines 20, 35
  - `pages/FindRide.jsx` line 133
  - `pages/Payment.jsx` line 123
  - `pages/TripDetail.jsx` lines 33–34 (the `.split(',').slice(0, 2).join(',')` two-segment variant on lines 39–40 is intentional — leave it inline)
  - `src/api/api.js` line 445 (`getConversations` title) — import from `'../utils'`
- **`new Date(x).toLocaleString()` → `formatDateTime(x)`**
  - Dashboard 77, MyTrips 35 & 50, RideHistory 22 & 37, FindRide 136, TripDetail 41, Wallet 51
  - Note MyTrips 35 / RideHistory 22 / TripDetail 41 wrap it in a ternary on `b.ride` — `formatDateTime` already returns `''` for falsy input, so `formatDateTime(b.ride?.departure_at)` is equivalent.
- **`status.replace(/_/g, ' ')` → `statusLabel(status)`**
  - Dashboard 80, MyTrips 38 & 54, TripDetail 26, TrackRide 88, AdminEmployees 93 (that one uses single-char `.replace('_', ' ')` — global replace produces identical output for every current status)

## 3. [x] Move the two badge functions into utils

- `pages/Dashboard.jsx` lines 88–94: delete the exported `badgeClass` and use `tripBadgeClass` from `../utils`. Update the two importers — `pages/MyTrips.jsx` line 5 and `pages/TripDetail.jsx` line 5 — from `import { badgeClass } from './Dashboard'` to `import { tripBadgeClass } from '../utils'` (and rename at call sites).
- `pages/admin/AdminEmployees.jsx` lines 127–136: delete the local `badgeClass` switch and use `accountBadgeClass` from `../../utils`.
- Leave the inline vehicle ternary in `AdminVehicles.jsx` line 96 alone (it's one expression, clear as-is).

## 4. [x] `pages/TrackRide.jsx` — replace the rAF simulation with a plain interval

Lines 36–49 currently use `requestAnimationFrame` + `performance.now()` + `startedAtRef`. Replace that whole effect with:

```js
// Simulated playback: the whole trip replays in 90 seconds, the marker
// following the real OSRM route geometry (see pointAlongRoute below).
useEffect(() => {
  if (!running) return
  const timer = setInterval(() => setProgress(p => Math.min(1, p + 0.25 / 90)), 250)
  return () => clearInterval(timer)
}, [running])
```

- Delete `startedAtRef` (line 19). **Keep** `doneRef` — it stops React 18 StrictMode's dev double-invoke from firing `completeRide` twice; add that one-line comment above it.
- **Keep** `pointAlongRoute` (lines 122–144) unchanged — it's what makes the car follow the road.
- Everything else in the file stays (thresholds like `>= 0.98`, banner text, buttons).

## 5. [x] `pages/superadmin/SuperAdminOrganizations.jsx` — drop the useMemo

Lines 12–16: the only `useMemo` in the app. Replace with a plain variable (filtering ~2 orgs per render costs nothing):

```js
const value = query.trim().toLowerCase()
const filtered = !value ? orgs : orgs.filter(org =>
  [org.name, org.industry, org.join_code, org.admin_email].some(x => String(x || '').toLowerCase().includes(value)))
```

Remove `useMemo` from the import on line 1.

## 6. [x] `pages/Signup.jsx` — remove dead auth import

Line 8 `const { refresh } = useAuth()` is never used. Delete it and the now-unused `import { useAuth } from '../context/AuthContext'` (line 4).

## 7. [x] `src/api/api.js` — remove dead export

Lines 208–210: `getRide` is exported but never called from any page (verify with grep before deleting). Everything else in api.js stays structurally as-is.

## 8. [x] **Bug fix** — `pages/admin/AdminVehicles.jsx` line 18

```js
const active = all.filter(u => u.platform_access === 'granted')
```

`platform_access` no longer exists on any user record (the app moved to `status`), so this filter is always empty and the **"+ Add Vehicle" button is permanently disabled**. Change to:

```js
const active = all.filter(u => u.status === 'active')
```

This restores intended behavior (it's the only place `platform_access` still appears in the frontend).

## 9. [x] Explanatory comments (no logic changes)

Add a one-or-two-line plain-English comment explaining *why* each of these load-bearing mechanisms exists — do not restructure them:
- `components/MapView.jsx`: the `onMapPickRef`/`onMarkerDragRef` pattern (map is created once; refs let it see the latest callbacks) and the `JSON.stringify(markers)` dependency (re-render only when marker *content* changes, not array identity).
- `components/LocationInput.jsx`: the 450 ms debounce (don't spam Nominatim per keystroke) and the `reqId` guard (a slow older response must not overwrite newer suggestions).
- `pages/Chat.jsx`: the `storage` event listener (this is the cross-tab "realtime" — another tab writing localStorage triggers a refetch here).

## Do NOT

- Change any CSS, class names, markup structure, icons, or text.
- Add libraries, custom hooks, `useCallback`/`useMemo` anywhere.
- Touch `backend/`, `src/api/db.js`, `src/api/geo.js`, `src/api/seed.js`, or the two Razorpay fetches.
- Convert the localStorage layer to real HTTP calls — explicitly out of scope.
- Heads-up: several files start with a UTF-8 BOM (e.g. TrackRide.jsx, Payment.jsx) — preserve the file encoding when editing.

## Verification

1. `cd frontend && npm run build` — must pass with no errors.
2. `npm run dev` → Landing → "Load demo data" → click through:
   - Login as each role tab (employee `raj@demo.com`, org admin `admin@demo.com`, superadmin `superadmin@platform.com`; passwords `demo123` / `superadmin123`).
   - Find → book → track (simulate) → pay a ride; check badges/dates/addresses render exactly as before.
   - Admin → Vehicles: **"+ Add Vehicle" must now be enabled** and save a vehicle.
   - Superadmin → Organizations: search box still filters.
   - Chat: open two tabs as rider + driver on a booked ride; messages appear across tabs.
3. Grep sweeps (should all be empty): `platform_access` anywhere in `frontend/src`; `requestAnimationFrame` in `pages/TrackRide.jsx`; `useMemo` in `pages/superadmin/`; `badgeClass` outside `src/utils.js`; `getRide` in `src/api/api.js`.
