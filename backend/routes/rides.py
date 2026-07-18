import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db
from models.ride import Ride
from models.vehicle import Vehicle
from models.booking import Booking
from models.user import User
from utils import haversine_km
from utils.auth_middleware import require_auth

rides_bp = Blueprint('rides', __name__, url_prefix='/api/rides')

WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']


@rides_bp.route('', methods=['POST'])
@require_auth
def publish_ride(current_user):
    data = request.get_json()
    vehicles = Vehicle.query.filter_by(owner_id=current_user._id).all()
    if not vehicles:
        return jsonify({'error': 'Register a vehicle before publishing a ride'}), 400
    vehicle = next((v for v in vehicles if v._id == data.get('vehicle_id')), None)
    if not vehicle:
        return jsonify({'error': 'Select one of your registered vehicles'}), 400
    seats = int(data.get('seats', 0))
    if seats < 1:
        return jsonify({'error': 'Available seats must be at least 1'}), 400
    if seats > vehicle.seating_capacity:
        return jsonify({'error': f'{vehicle.model} only seats {vehicle.seating_capacity}'}), 400
    price = float(data.get('price_per_seat', 0))
    if price < 0:
        return jsonify({'error': 'Enter a valid fare per seat'}), 400

    ride = Ride(
        company_id=current_user.company_id,
        driver_id=current_user._id,
        vehicle_id=vehicle._id,
        departure_at=data.get('departure_at', ''),
        seats_total=seats,
        seats_available=seats,
        price_per_seat=price,
        distance_km=data.get('distance_km'),
        duration_min=data.get('duration_min'),
        status='active',
    )
    ride.start_location = data.get('start_location')
    ride.destination_location = data.get('destination_location')
    ride.recurring_days = data.get('recurring_days', [])
    ride.route_coords = data.get('route_coords')
    db.session.add(ride)
    db.session.commit()
    return jsonify(ride.to_dict()), 201


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

    rides = Ride.query.filter(
        Ride.company_id == current_user.company_id,
        Ride.status == 'active',
        Ride.driver_id != current_user._id,
        Ride.seats_available >= seats,
    ).all()

    results = []
    for r in rides:
        same_day = r.departure_at[:10] == date
        recurring_match = weekday in r.recurring_days
        if not (same_day or recurring_match):
            continue
        if haversine_km(r.start_location, from_loc) > MAX_KM:
            continue
        if haversine_km(r.destination_location, to_loc) > MAX_KM:
            continue

        rd = r.to_dict()
        driver = User.query.get(r.driver_id)
        vehicle = Vehicle.query.get(r.vehicle_id)
        rd['driver'] = driver.to_dict() if driver else None
        rd['vehicle'] = vehicle.to_dict() if vehicle else None
        results.append(rd)

    results.sort(key=lambda x: x.get('departure_at', ''))
    return jsonify(results)


@rides_bp.route('/<rid>', methods=['GET'])
@require_auth
def get_ride(current_user, rid):
    ride = Ride.query.get(rid)
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    return jsonify(ride.to_dict())


@rides_bp.route('', methods=['GET'])
@require_auth
def my_offered_rides(current_user):
    driver = request.args.get('driver')
    if not driver:
        return jsonify([])
    rides = Ride.query.filter_by(driver_id=driver).order_by(Ride.created_at.desc()).all()
    results = []
    for r in rides:
        rd = r.to_dict()
        rd['vehicle'] = Vehicle.query.get(r.vehicle_id).to_dict() if Vehicle.query.get(r.vehicle_id) else None
        bookings = Booking.query.filter(
            Booking.ride_id == r._id,
            Booking.status != 'cancelled'
        ).all()
        rd['bookings'] = []
        for b in bookings:
            bd = b.to_dict()
            rider = User.query.get(b.rider_id)
            bd['rider'] = rider.to_dict() if rider else None
            rd['bookings'].append(bd)
        results.append(rd)
    return jsonify(results)


@rides_bp.route('/<rid>/start', methods=['PUT'])
@require_auth
def start_ride(current_user, rid):
    _set_ride_and_bookings(rid, 'started', 'started')
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/progress', methods=['PUT'])
@require_auth
def mark_in_progress(current_user, rid):
    _set_ride_and_bookings(rid, 'in_progress', 'in_progress')
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/complete', methods=['PUT'])
@require_auth
def complete_ride(current_user, rid):
    ride = Ride.query.get(rid)
    if ride:
        ride.status = 'completed'
        bookings = Booking.query.filter(
            Booking.ride_id == rid,
            ~Booking.status.in_(['cancelled', 'payment_completed'])
        ).all()
        for b in bookings:
            b.status = 'payment_pending'
        db.session.commit()
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/cancel', methods=['PUT'])
@require_auth
def cancel_ride(current_user, rid):
    ride = Ride.query.get(rid)
    if ride:
        ride.status = 'cancelled'
        bookings = Booking.query.filter_by(ride_id=rid).all()
        for b in bookings:
            b.status = 'cancelled'
        db.session.commit()
    return jsonify({'ok': True})


@rides_bp.route('/<rid>/route', methods=['PUT'])
@require_auth
def update_ride_route(current_user, rid):
    ride = Ride.query.get(rid)
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    data = request.get_json()
    ride.route_coords = data.get('route_coords')
    ride.distance_km = data.get('distance_km')
    ride.duration_min = data.get('duration_min')
    db.session.commit()
    return jsonify(ride.to_dict())


def _set_ride_and_bookings(ride_id, ride_status, booking_status):
    ride = Ride.query.get(ride_id)
    if ride:
        ride.status = ride_status
        bookings = Booking.query.filter(
            Booking.ride_id == ride_id,
            Booking.status != 'cancelled'
        ).all()
        for b in bookings:
            b.status = booking_status
        db.session.commit()
