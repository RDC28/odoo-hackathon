from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from pymongo import DESCENDING
from models import db, serialize
from models.booking import new_booking
from models.conversation import new_conversation
from utils.auth_middleware import require_auth

bookings_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')


@bookings_bp.route('', methods=['POST'])
@require_auth
def book_ride(current_user):
    data = request.get_json()
    ride_id = data.get('ride_id')
    seats = int(data.get('seats', 1))
    if seats < 1:
        return jsonify({'error': 'Select at least 1 seat'}), 400
    ride = db.rides.find_one({'_id': ride_id})
    if not ride:
        return jsonify({'error': 'This ride no longer exists'}), 404
    if ride['company_id'] != current_user['company_id']:
        return jsonify({'error': 'This ride is not available to your organization'}), 403
    if ride['status'] != 'active':
        return jsonify({'error': 'This ride is no longer available'}), 400
    # Atomic capacity reservation. Multiple requests may read the same
    # search result, so the availability check must happen in the update
    # filter itself; only one request can decrement a given remaining seat.
    reserved = db.rides.update_one(
        {
            '_id': ride_id,
            'status': 'active',
            'seats_available': {'$gte': seats},
        },
        {'$inc': {'seats_available': -seats}},
    )
    if reserved.modified_count != 1:
        return jsonify({'error': 'Not enough seats available; refresh the ride list'}), 409

    conv = new_conversation(
        company_id=current_user['company_id'],
        type='ride',
        ride_id=ride['_id'],
        participant_ids=[current_user['_id'], ride['driver_id']],
        last_message_at=datetime.now(timezone.utc).isoformat(),
    )
    db.conversations.insert_one(conv)

    booking = new_booking(
        ride_id=ride['_id'],
        rider_id=current_user['_id'],
        seats_booked=seats,
        pickup_point=ride['start_location'],
        drop_point=ride['destination_location'],
        fare=ride['price_per_seat'] * seats,
        conversation_id=conv['_id'],
    )
    db.bookings.insert_one(booking)
    return jsonify(serialize(booking)), 201


@bookings_bp.route('', methods=['GET'])
@require_auth
def my_bookings(current_user):
    rider = request.args.get('rider', current_user['_id'])
    bookings = db.bookings.find({
        'rider_id': rider,
        'status': {'$nin': ['payment_completed', 'cancelled']},
    }).sort('created_at', DESCENDING)
    return jsonify([_enrich(b) for b in bookings])


@bookings_bp.route('/<bid>', methods=['GET'])
@require_auth
def get_booking(current_user, bid):
    b = db.bookings.find_one({'_id': bid})
    if not b:
        return jsonify({'error': 'Booking not found'}), 404
    return jsonify(_enrich(b))


@bookings_bp.route('/<bid>/cancel', methods=['PUT'])
@require_auth
def cancel_booking(current_user, bid):
    b = db.bookings.find_one({'_id': bid})
    if not b or b['status'] == 'cancelled':
        return jsonify({'ok': True})
    # Make cancellation idempotent as well: only the request that changes
    # booked -> cancelled returns the seats to the ride.
    changed = db.bookings.update_one(
        {'_id': bid, 'status': {'$ne': 'cancelled'}},
        {'$set': {'status': 'cancelled'}},
    )
    if changed.modified_count == 1:
        db.rides.update_one(
            {'_id': b['ride_id']},
            {'$inc': {'seats_available': b['seats_booked']}},
        )
    return jsonify({'ok': True})


@bookings_bp.route('/history/<uid>', methods=['GET'])
@require_auth
def history(current_user, uid):
    as_rider = db.bookings.find({
        'rider_id': uid,
        'status': 'payment_completed',
    }).sort('created_at', DESCENDING)

    as_driver_rides = db.rides.find({
        'driver_id': uid,
        'status': 'completed',
    }).sort('created_at', DESCENDING)

    as_driver = []
    for r in as_driver_rides:
        rd = serialize(r)
        v = db.vehicles.find_one({'_id': r['vehicle_id']})
        rd['vehicle'] = serialize(v)
        ride_bookings = list(db.bookings.find({'ride_id': r['_id']}))
        active = [b for b in ride_bookings if b['status'] != 'cancelled']
        rd['passengers'] = len(active)
        rd['earned'] = sum(b['fare'] for b in active if b['status'] == 'payment_completed')
        as_driver.append(rd)

    return jsonify({
        'asRider': [_enrich(b) for b in as_rider],
        'asDriver': as_driver,
    })


def _enrich(b):
    d = serialize(b)
    ride = db.rides.find_one({'_id': b['ride_id']})
    d['ride'] = serialize(ride)
    driver = db.users.find_one({'_id': ride['driver_id']}) if ride else None
    d['driver'] = serialize(driver)
    vehicle = db.vehicles.find_one({'_id': ride['vehicle_id']}) if ride else None
    d['vehicle'] = serialize(vehicle)
    return d
