from models import gen_id, utcnow


def new_ride(company_id, driver_id, vehicle_id, start_location=None,
             destination_location=None, departure_at='', recurring_days=None,
             seats_total=0, seats_available=0, price_per_seat=0.0,
             route_coords=None, distance_km=None, duration_min=None, status='active'):
    """rides collection document.
    start/destination_location: { address, lat, lng }
    status: active | started | in_progress | completed | cancelled
    """
    return {
        '_id': gen_id(),
        'company_id': company_id,
        'driver_id': driver_id,
        'vehicle_id': vehicle_id,
        'start_location': start_location,
        'destination_location': destination_location,
        'departure_at': departure_at,
        'recurring_days': recurring_days or [],
        'seats_total': seats_total,
        'seats_available': seats_available,
        'price_per_seat': price_per_seat,
        'route_coords': route_coords,
        'distance_km': distance_km,
        'duration_min': duration_min,
        'status': status,
        'created_at': utcnow(),
    }
