from datetime import datetime
from flask import Blueprint, request, jsonify
from pymongo import DESCENDING
from models import db, serialize
from models.ride import new_ride
from utils import haversine_km
from utils.auth_middleware import require_auth

rides_bp = Blueprint('rides', __name__, url_prefix='/api/rides')

WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']


def _enrich_ride(ride):
    """Ride dict + its driver and vehicle details (for ride cards in the UI)."""
    d = serialize(ride)
    driver = db.users.find_one({'_id': ride['driver_id']})
    vehicle = db.vehicles.find_one({'_id': ride['vehicle_id']})
    d['driver'] = serialize(driver)
    d['vehicle'] = serialize(vehicle)
    return d


def _set_ride_and_bookings(ride_id, ride_status, booking_status, skip_booking_statuses):
    """Move a ride and its bookings to a new status (skipping some bookings)."""
    ride = db.rides.find_one({'_id': ride_id})
    if not ride:
        return
    db.rides.update_one({'_id': ride_id}, {'$set': {'status': ride_status}})
    booking_filter = {'ride_id': ride_id}
    if skip_booking_statuses:
        booking_filter['status'] = {'$nin': skip_booking_statuses}
    db.bookings.update_many(booking_filter, {'$set': {'status': booking_status}})


@rides_bp.route('', methods=['POST'])
@require_auth
def publish_ride(current_user):
    data = request.get_json()
    vehicles = list(db.vehicles.find({'owner_id': current_user['_id']}))
    if not vehicles:
        return jsonify({'error': 'Register a vehicle before publishing a ride'}), 400
    vehicle = next((v for v in vehicles if v['_id'] == data.get('vehicle_id')), None)
    if not vehicle:
        return jsonify({'error': 'Select one of your registered vehicles'}), 400
    seats = int(data.get('seats', 0))
    if seats < 1:
        return jsonify({'error': 'Available seats must be at least 1'}), 400
    if seats > vehicle['seating_capacity']:
        return jsonify({'error': f"{vehicle['model']} only seats {vehicle['seating_capacity']}"}), 400
    price = float(data.get('price_per_seat', 0))
    if price < 0:
        return jsonify({'error': 'Enter a valid fare per seat'}), 400

    ride = new_ride(
        company_id=current_user['company_id'],
        driver_id=current_user['_id'],
        vehicle_id=vehicle['_id'],
        start_location=data.get('start_location'),
        destination_location=data.get('destination_location'),
        departure_at=data.get('departure_at', ''),
        recurring_days=data.get('recurring_days', []),
        seats_total=seats,
        seats_available=seats,
        price_per_seat=price,
        route_coords=data.get('route_coords'),
        distance_km=data.get('distance_km'),
        duration_min=data.get('duration_min'),
        status='active',
    )
    db.rides.insert_one(ride)
    return jsonify(serialize(ride)), 201


@rides_bp.route('/search', methods=['POST'])
@require_auth
def search_rides(current_user):
    data = request.get_json()
    from_loc = data.get('from')
    to_loc = data.get('to')
    date = data.get('date', '')
    seats = int(data.get('seats', 1))
    MAX_KM = 8

    try:
        weekday = WEEKDAYS[datetime.strptime(date, '%Y-%m-%d').weekday() + 1]
    except Exception:
        weekday = ''

    rides = db.rides.find({
        'company_id': current_user['company_id'],
        'status': 'active',
        'driver_id': {'$ne': current_user['_id']},
        'seats_available': {'$gte': seats},
    })

    results = []
    for r in rides:
        same_day = (r.get('departure_at') or '')[:10] == date
        recurring_match = weekday in (r.get('recurring_days') or [])
        if not (same_day or recurring_match):
            continue
        if haversine_km(r['start_location'], from_loc) > MAX_KM:
            continue
        if haversine_km(r['destination_location'], to_loc) > MAX_KM:
            continue
        results.append(_enrich_ride(r))

    results.sort(key=lambda x: (
        -(x.get('driver') or {}).get('rating_avg', 0),
        -(x.get('driver') or {}).get('rating_count', 0),
        x.get('departure_at', ''),
    ))
    return jsonify(results)


@rides_bp.route('/<rid>', methods=['GET'])
@require_auth
def get_ride(current_user, rid):
    ride = db.rides.find_one({'_id': rid})
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    return jsonify(serialize(ride))


@rides_bp.route('', methods=['GET'])
@require_auth
def my_offered_rides(current_user):
    driver = request.args.get('driver')
    if not driver:
        return jsonify([])
    rides = db.rides.find({'driver_id': driver}).sort('created_at', DESCENDING)
    results = []
    for r in rides:
        rd = _enrich_ride(r)
        bookings = db.bookings.find({
            'ride_id': r['_id'],
            'status': {'$ne': 'cancelled'},
        })
        rd['bookings'] = []
        for b in bookings:
            bd = serialize(b)
            rider = db.users.find_one({'_id': b['rider_id']})
            bd['rider'] = serialize(rider)
            rd['bookings'].append(bd)
        results.append(rd)
    return jsonify(results)


@rides_bp.route('/<rid>/start', methods=['PUT'])
@require_auth
def start_ride(current_user, rid):
    _set_ride_and_bookings(rid, 'started', 'started', skip_booking_statuses=['cancelled'])
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/progress', methods=['PUT'])
@require_auth
def mark_in_progress(current_user, rid):
    _set_ride_and_bookings(rid, 'in_progress', 'in_progress', skip_booking_statuses=['cancelled'])
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/complete', methods=['PUT'])
@require_auth
def complete_ride(current_user, rid):
    # Bookings that are already paid stay paid.
    _set_ride_and_bookings(rid, 'completed', 'payment_pending',
                           skip_booking_statuses=['cancelled', 'payment_completed'])
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/cancel', methods=['PUT'])
@require_auth
def cancel_ride(current_user, rid):
    _set_ride_and_bookings(rid, 'cancelled', 'cancelled', skip_booking_statuses=[])
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/route', methods=['PUT'])
@require_auth
def update_ride_route(current_user, rid):
    ride = db.rides.find_one({'_id': rid})
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    data = request.get_json()
    updates = {
        'route_coords': data.get('route_coords'),
        'distance_km': data.get('distance_km'),
        'duration_min': data.get('duration_min'),
    }
    db.rides.update_one({'_id': rid}, {'$set': updates})
    ride.update(updates)
    return jsonify(serialize(ride))
