from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, abort
from pymongo import ASCENDING
from models import db, serialize
from models.conversation import new_message
from utils.auth_middleware import require_auth

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')


def _has_active_booking(ride, user):
    """True if the user is riding on (or driving) this ride with a live booking."""
    booking_filter = {'ride_id': ride['_id'], 'status': {'$ne': 'cancelled'}}
    if ride['driver_id'] != user['_id']:
        booking_filter['rider_id'] = user['_id']  # riders need their own booking
    return db.bookings.find_one(booking_filter) is not None


@chat_bp.route('/conversations', methods=['GET'])
@require_auth
def get_conversations(current_user):
    conversations = db.conversations.find({
        'company_id': current_user['company_id'],
        'type': 'ride',
    })

    results = []
    for c in conversations:
        if current_user['_id'] not in (c.get('participant_ids') or []):
            continue
        ride = db.rides.find_one({'_id': c.get('ride_id')})
        if not ride or ride['status'] not in ['active', 'started', 'in_progress']:
            continue
        if not _has_active_booking(ride, current_user):
            continue

        d = serialize(c)
        driver = db.users.find_one({'_id': ride['driver_id']})
        start = (ride.get('start_location') or {}).get('address', '').split(',')[0]
        end = (ride.get('destination_location') or {}).get('address', '').split(',')[0]
        d['title'] = f'{start} → {end}'
        d['subtitle'] = f"Ride chat · driver {driver['name']}" if driver else 'Ride chat'
        d['closed'] = ride['status'] in ['completed', 'cancelled']
        results.append(d)

    results.sort(key=lambda x: x.get('last_message_at') or '', reverse=True)
    return jsonify(results)


@chat_bp.route('/conversations/<cid>/messages', methods=['GET'])
@require_auth
def get_messages(current_user, cid):
    _assert_access(cid, current_user)
    msgs = db.messages.find({'conversation_id': cid}).sort('created_at', ASCENDING)
    results = []
    for m in msgs:
        d = serialize(m)
        sender = db.users.find_one({'_id': m['sender_id']})
        d['sender'] = serialize(sender)
        results.append(d)
    return jsonify(results)


@chat_bp.route('/conversations/<cid>/messages', methods=['POST'])
@require_auth
def send_message(current_user, cid):
    conv = _assert_access(cid, current_user)
    if conv['type'] == 'ride' and conv.get('ride_id'):
        ride = db.rides.find_one({'_id': conv['ride_id']})
        if ride and ride['status'] in ['completed', 'cancelled']:
            return jsonify({'error': 'This ride chat is closed — the trip has ended'}), 400

    data = request.get_json()
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': 'Message cannot be empty'}), 400

    msg = new_message(conversation_id=cid, sender_id=current_user['_id'], content=content)
    db.messages.insert_one(msg)
    db.conversations.update_one(
        {'_id': cid},
        {'$set': {'last_message_at': datetime.now(timezone.utc).isoformat()}},
    )
    d = serialize(msg)
    d['sender'] = serialize(current_user)
    return jsonify(d), 201


def _assert_access(conv_id, user):
    """Only participants of a live ride conversation in the same company get in."""
    conv = db.conversations.find_one({'_id': conv_id})
    if not conv:
        abort(404, description='Conversation not found')
    if user['company_id'] != conv['company_id']:
        abort(403, description='Not authorized for this conversation')
    if user['_id'] not in (conv.get('participant_ids') or []):
        abort(403, description='Not authorized for this conversation')

    ride = db.rides.find_one({'_id': conv.get('ride_id')}) if conv['type'] == 'ride' else None
    if not ride or ride['status'] not in ['active', 'started', 'in_progress']:
        abort(403, description='Ride chat is available only during an active booking')
    if not _has_active_booking(ride, user):
        abort(403, description='Ride chat is available only during an active booking')
    return conv
