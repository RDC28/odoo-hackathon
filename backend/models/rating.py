from models import gen_id, utcnow


def new_rating(booking_id, rater_id, ratee_id, stars):
    """ratings collection document."""
    return {
        '_id': gen_id(),
        'booking_id': booking_id,
        'rater_id': rater_id,
        'ratee_id': ratee_id,
        'stars': stars,
        'created_at': utcnow(),
    }


def new_saved_place(user_id, label, address, lat, lng):
    """saved_places collection document."""
    return {
        '_id': gen_id(),
        'user_id': user_id,
        'label': label,
        'address': address,
        'lat': lat,
        'lng': lng,
        'created_at': utcnow(),
    }
