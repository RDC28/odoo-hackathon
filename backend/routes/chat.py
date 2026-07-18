from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from models import db
from models.conversation import Conversation, Message
from models.user import User
from models.ride import Ride
from models.booking import Booking
from utils.auth_middleware import require_auth

chat_bp = Blueprint('chat', __name__, url_prefix='/api')


@chat_bp.route('/conversations', methods=['GET'])
@require_auth
def get_conversations(current_user):
    mine = Conversation.query.filter(
        Conversation.company_id == current_user.company_id,
        Conversation.type == 'ride',
    ).all()
    mine = [
        c for c in mine
        if current_user._id in c.participant_ids
        and (ride := Ride.query.get(c.ride_id))
        and ride.status in ['active', 'started', 'in_progress']
        and Booking.query.filter(
            Booking.ride_id == ride._id,
            Booking.status != 'cancelled',
            or_(
                Booking.rider_id == current_user._id,
                ride.driver_id == current_user._id,
            ),
        ).first()
    ]

    def enrich(c):
        d = c.to_dict()
        if c.type == 'global':
            d['title'] = '# general'
            d['subtitle'] = 'Everyone in your company'
        elif c.type == 'dm':
            other_id = next((i for i in c.participant_ids if i != current_user._id), None)
            other = User.query.get(other_id) if other_id else None
            d['title'] = other.name if other else 'Unknown'
            d['subtitle'] = 'Direct message'
        else:
            ride = Ride.query.get(c.ride_id) if c.ride_id else None
            driver = User.query.get(ride.driver_id) if ride else None
            if ride:
                sl = ride.start_location or {}
                dl = ride.destination_location or {}
                d['title'] = f"{sl.get('address', '').split(',')[0]} → {dl.get('address', '').split(',')[0]}"
                d['subtitle'] = f"Ride chat · driver {driver.name}" if driver else 'Ride chat'
                d['closed'] = ride.status in ['completed', 'cancelled']
            else:
                d['title'] = 'Ride chat'
                d['subtitle'] = 'Ride chat'
                d['closed'] = False
        return d

    sorted_mine = sorted(
        [enrich(c) for c in mine],
        key=lambda x: x.get('last_message_at') or '',
        reverse=True
    )
    return jsonify(sorted_mine)


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
    conv = Conversation.query.get(conv_id)
    if not conv:
        from flask import abort
        abort(404, description='Conversation not found')
    if user.company_id != conv.company_id:
        from flask import abort
        abort(403, description='Not authorized for this conversation')
    ride = Ride.query.get(conv.ride_id) if conv.type == 'ride' else None
    booking = Booking.query.filter(
        Booking.ride_id == ride._id if ride else False,
        Booking.status != 'cancelled',
        or_(
            Booking.rider_id == user._id,
            ride.driver_id == user._id if ride else False,
        ),
    ).first() if ride else None
    if not ride or not booking or ride.status not in ['active', 'started', 'in_progress']:
        from flask import abort
        abort(403, description='Ride chat is available only during an active booking')
    if user._id not in conv.participant_ids:
        from flask import abort
        abort(403, description='Not authorized for this conversation')
    return conv
