from models import gen_id, utcnow


def new_conversation(company_id, type, participant_ids=None, ride_id=None,
                     last_message_at=None):
    """conversations collection document. type: global | dm | ride"""
    return {
        '_id': gen_id(),
        'company_id': company_id,
        'type': type,
        'participant_ids': participant_ids or [],
        'ride_id': ride_id,
        'last_message_at': last_message_at,
        'created_at': utcnow(),
    }


def new_message(conversation_id, sender_id, content):
    """messages collection document."""
    return {
        '_id': gen_id(),
        'conversation_id': conversation_id,
        'sender_id': sender_id,
        'content': content,
        'created_at': utcnow(),
    }
