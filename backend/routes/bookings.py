from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from models import db
from models.booking import Booking
from models.ride import Ride
from models.user import User
from models.vehicle import Vehicle
from models.conversation import Conversation
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
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({'error': 'This ride no longer exists'}), 404
    if ride.company_id != current_user.company_id:
        return jsonify({'error': 'This ride is not available to your organization'}), 403
    if ride.status != 'active':
        return jsonify({'error': 'This ride is no longer available'}), 400
    # Atomic capacity reservation. Multiple requests may read the same
    # search result, so the availability check must happen in the UPDATE
    # itself; only one request can decrement a given remaining seat.
    reserved = (
        db.session.query(Ride)
        .filter(
            Ride._id == ride_id,
            Ride.status == 'active',
            Ride.seats_available >= seats,
        )
        .update(
            {Ride.seats_available: Ride.seats_available - seats},
            synchronize_session=False,
        )
    )
    if reserved != 1:
        db.session.rollback()
        return jsonify({'error': 'Not enough seats available; refresh the ride list'}), 409
    db.session.refresh(ride)

    conv = Conversation(
        company_id=current_user.company_id,
        type='ride',
        ride_id=ride._id,
    )
    conv.participant_ids = [current_user._id, ride.driver_id]
    conv.last_message_at = datetime.now(timezone.utc).isoformat()
    db.session.add(conv)
    db.session.flush()

    booking = Booking(
        ride_id=ride._id,
        rider_id=current_user._id,
        seats_booked=seats,
        fare=ride.price_per_seat * seats,
        conversation_id=conv._id,
    )
    booking.pickup_point = ride.start_location
    booking.drop_point = ride.destination_location
    db.session.add(booking)
    db.session.commit()
    return jsonify(booking.to_dict()), 201


@bookings_bp.route('', methods=['GET'])
@require_auth
def my_bookings(current_user):
    rider = request.args.get('rider', current_user._id)
    bookings = Booking.query.filter(
        Booking.rider_id == rider,
        ~Booking.status.in_(['payment_completed', 'cancelled'])
    ).order_by(Booking.created_at.desc()).all()
    return jsonify([_enrich(b) for b in bookings])


@bookings_bp.route('/<bid>', methods=['GET'])
@require_auth
def get_booking(current_user, bid):
    b = Booking.query.get(bid)
    if not b:
        return jsonify({'error': 'Booking not found'}), 404
    return jsonify(_enrich(b))


@bookings_bp.route('/<bid>/cancel', methods=['PUT'])
@require_auth
def cancel_booking(current_user, bid):
    b = Booking.query.get(bid)
    if not b or b.status == 'cancelled':
        return jsonify({'ok': True})
    ride = Ride.query.get(b.ride_id)
    # Make cancellation idempotent as well: only the request that changes
    # booked -> cancelled returns the seats to the ride.
    changed = (
        db.session.query(Booking)
        .filter(Booking._id == bid, Booking.status != 'cancelled')
        .update({Booking.status: 'cancelled'}, synchronize_session=False)
    )
    if changed == 1 and ride:
        db.session.query(Ride).filter(Ride._id == ride._id).update(
            {Ride.seats_available: Ride.seats_available + b.seats_booked},
            synchronize_session=False,
        )
    db.session.commit()
    return jsonify({'ok': True})


@bookings_bp.route('/history/<uid>', methods=['GET'])
@require_auth
def history(current_user, uid):
    as_rider = Booking.query.filter(
        Booking.rider_id == uid,
        Booking.status == 'payment_completed'
    ).order_by(Booking.created_at.desc()).all()

    as_driver_rides = Ride.query.filter(
        Ride.driver_id == uid,
        Ride.status == 'completed'
    ).order_by(Ride.created_at.desc()).all()

    as_driver = []
    for r in as_driver_rides:
        rd = r.to_dict()
        v = Vehicle.query.get(r.vehicle_id)
        rd['vehicle'] = v.to_dict() if v else None
        ride_bookings = Booking.query.filter_by(ride_id=r._id).all()
        active = [b for b in ride_bookings if b.status != 'cancelled']
        rd['passengers'] = len(active)
        rd['earned'] = sum(b.fare for b in active if b.status == 'payment_completed')
        as_driver.append(rd)

    return jsonify({
        'asRider': [_enrich(b) for b in as_rider],
        'asDriver': as_driver,
    })


def _enrich(b):
    d = b.to_dict()
    ride = Ride.query.get(b.ride_id)
    d['ride'] = ride.to_dict() if ride else None
    driver = User.query.get(ride.driver_id) if ride else None
    d['driver'] = driver.to_dict() if driver else None
    vehicle = Vehicle.query.get(ride.vehicle_id) if ride else None
    d['vehicle'] = vehicle.to_dict() if vehicle else None
    return d
