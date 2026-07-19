from models import gen_id, utcnow


def new_booking(ride_id, rider_id, seats_booked=1, pickup_point=None,
                drop_point=None, fare=0.0, status='booked', conversation_id=None):
    """bookings collection document.
    status: booked | started | in_progress | payment_pending | payment_completed | cancelled
    """
    return {
        '_id': gen_id(),
        'ride_id': ride_id,
        'rider_id': rider_id,
        'seats_booked': seats_booked,
        'pickup_point': pickup_point,
        'drop_point': drop_point,
        'fare': fare,
        'status': status,
        'conversation_id': conversation_id,
        'created_at': utcnow(),
    }
