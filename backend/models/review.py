from models import gen_id, utcnow


def new_review_feedback(booking_id, rater_id, ratee_id, stars, comment=''):
    """review_feedback collection document (one per booking)."""
    return {
        '_id': gen_id(),
        'booking_id': booking_id,
        'rater_id': rater_id,
        'ratee_id': ratee_id,
        'stars': stars,
        'comment': comment,
        'created_at': utcnow(),
    }
