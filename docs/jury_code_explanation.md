# Carpool Platform - Technical Highlights for the Jury

This document highlights two of the most impressive technical implementations in the codebase (one from the Frontend, one from the Backend). You can use this guide to confidently explain the architecture and logic to the jury members.

---

## 1. Frontend Highlight: Interactive React Map Architecture
**File Location:** `frontend/src/components/MapView.jsx`

### What it does:
This code bridges the gap between **Declarative React** and **Imperative Leaflet (OpenStreetMap)**. Managing a dynamic map inside a React component can be notoriously buggy due to React's lifecycle re-renders, but our implementation handles it cleanly and efficiently.

### Key Features to Explain to the Jury:

1. **DOM Ref & State Synchronization (`useRef` & `useEffect`)**
   Instead of constantly destroying and rebuilding the map when React state changes, we store the map instance in a `useRef`. The component intelligently observes changes to the `markers` and `polyline` props, updates the map layers in-place, and forces React to leave the map container alone.

2. **Algorithmic Auto-Fitting (`autoFit`)**
   When multiple points (like a Start location, a Drop location, and a live Car position) are placed on the map, the component dynamically calculates a "bounding box" using `L.latLngBounds()`. It then automatically smoothly pans and zooms the camera so that all relevant points are perfectly in frame.

3. **Custom HTML DOM Markers**
   Instead of using standard boring image pins, we implemented custom `divIcon` markers that render modern Material UI Symbols (`<span class="material-symbols-rounded">`) directly onto the Leaflet canvas. This allows the pins to inherit CSS styles, ensuring they flawlessly support Light and Dark modes.

---

## 2. Backend Highlight: Geospatial Logic & State Management
**File Locations:** `backend/utils/__init__.py` & `backend/routes/rides.py`

### What it does:
The backend efficiently calculates real-world distances between users and manages complex, multi-table transactional state changes (e.g., when a ride is completed, what happens to all the passengers?).

### Key Features to Explain to the Jury:

1. **The Haversine Formula (`haversine_km`)**
   ```python
   def haversine_km(a, b):
       # Calculates distance in km accounting for the Earth's spherical curvature
       ...
   ```
   To calculate the distance between a rider and a driver, we don't just use standard 2D Cartesian math (like the Pythagorean theorem). Because the Earth is a sphere, we implemented the **Haversine Formula**. This uses advanced trigonometry (sine, cosine, arcsine) to calculate the "great-circle distance" between two GPS coordinates (latitude/longitude), giving highly accurate distances in kilometers.

2. **Atomic Bulk Status Updates (`_set_ride_and_bookings`)**
   ```python
   def _set_ride_and_bookings(ride_id, ride_status, booking_status, skip_booking_statuses):
   ```
   When a driver starts or completes a ride, it doesn't just affect them—it affects every single employee who booked a seat in their car. This helper function uses **SQLAlchemy** to perform bulk, transactional updates. It safely updates the parent `Ride` status while simultaneously updating all child `Booking` statuses in a single database transaction, ensuring the system never ends up in a corrupted state (e.g., a ride is "completed" but a passenger is still stuck in "in-progress").

3. **Strict Business Logic Validation (`publish_ride`)**
   Before a ride is written to the database, the backend performs robust validation. It verifies that the user actually owns the `vehicle_id` they are trying to use, ensures they aren't offering more seats than the vehicle's physical `seating_capacity`, and blocks negative pricing. This robust validation ensures data integrity for enterprise use.
