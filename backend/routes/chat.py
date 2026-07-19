from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, abort
from models import db
from models.conversation import Conversation, Message
from models.user import User
from models.ride import Ride
from models.booking import Booking
from utils.auth_middleware import require_auth

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')


def _has_active_booking(ride, user):
    """True if the user is riding on (or driving) this ride with a live booking."""
    query = Booking.query.filter(Booking.ride_id == ride._id, Booking.status != 'cancelled')
    if ride.driver_id != user._id:
        query = query.filter(Booking.rider_id == user._id)  # riders need their own booking
    return query.first() is not None


@chat_bp.route('/conversations', methods=['GET'])
@require_auth
def get_conversations(current_user):
    conversations = Conversation.query.filter(
        Conversation.company_id == current_user.company_id,
        Conversation.type == 'ride',
    ).all()

    results = []
    for c in conversations:
        if current_user._id not in (c.participant_ids or []):
            continue
        ride = Ride.query.get(c.ride_id)
        if not ride or ride.status not in ['active', 'started', 'in_progress']:
            continue
        if not _has_active_booking(ride, current_user):
            continue

        d = c.to_dict()
        driver = User.query.get(ride.driver_id)
        start = (ride.start_location or {}).get('address', '').split(',')[0]
        end = (ride.destination_location or {}).get('address', '').split(',')[0]
        d['title'] = f'{start} → {end}'
        d['subtitle'] = f'Ride chat · driver {driver.name}' if driver else 'Ride chat'
        d['closed'] = ride.status in ['completed', 'cancelled']
        results.append(d)

    results.sort(key=lambda x: x.get('last_message_at') or '', reverse=True)
    return jsonify(results)


@chat_bp.route('/conversations/<cid>/messages', methods=['GET'])
@require_auth
def get_messages(current_user, cid):
    _assert_access(cid, current_user)
    msgs = Message.query.filter_by(conversation_id=cid).order_by(Message.created_at.asc()).all()
    results = []
    for m in msgs:
        d = m.to_dict()
        sender = User.query.get(m.sender_id)
        d['sender'] = sender.to_dict() if sender else None
        results.append(d)
    return jsonify(results)


@chat_bp.route('/conversations/<cid>/messages', methods=['POST'])
@require_auth
def send_message(current_user, cid):
    conv = _assert_access(cid, current_user)
    if conv.type == 'ride' and conv.ride_id:
        ride = Ride.query.get(conv.ride_id)
        if ride and ride.status in ['completed', 'cancelled']:
            return jsonify({'error': 'This ride chat is closed — the trip has ended'}), 400

    data = request.get_json()
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': 'Message cannot be empty'}), 400

    msg = Message(conversation_id=cid, sender_id=current_user._id, content=content)
    db.session.add(msg)
    conv.last_message_at = datetime.now(timezone.utc).isoformat()
    db.session.commit()
    d = msg.to_dict()
    d['sender'] = current_user.to_dict()
    return jsonify(d), 201


def _assert_access(conv_id, user):
    """Only participants of a live ride conversation in the same company get in."""
    conv = Conversation.query.get(conv_id)
    if not conv:
        abort(404, description='Conversation not found')
    if user.company_id != conv.company_id:
        abort(403, description='Not authorized for this conversation')
    if user._id not in (conv.participant_ids or []):
        abort(403, description='Not authorized for this conversation')

    ride = Ride.query.get(conv.ride_id) if conv.type == 'ride' else None
    if not ride or ride.status not in ['active', 'started', 'in_progress']:
        abort(403, description='Ride chat is available only during an active booking')
    if not _has_active_booking(ride, user):
        abort(403, description='Ride chat is available only during an active booking')
    return conv
