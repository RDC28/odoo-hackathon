import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request
from flask import Blueprint, request, jsonify, current_app
from pymongo import DESCENDING
from models import db, serialize, serialize_many
from models.payment import new_payment, new_wallet_transaction
from models.rating import new_rating
from models.review import new_review_feedback
from utils.auth_middleware import require_auth

payments_bp = Blueprint('payments', __name__, url_prefix='/api')


def _create_order_at_razorpay(key_id, key_secret, amount_paise, booking_id):
    """POST the order to Razorpay's API using plain stdlib urllib (no SDK)."""
    payload = json.dumps({
        'amount': amount_paise,
        'currency': 'INR',
        'receipt': ('ride_' + booking_id.replace('-', ''))[:40] or 'ride_payment',
        'notes': {'booking_id': booking_id},
    }).encode('utf-8')
    credentials = base64.b64encode(f'{key_id}:{key_secret}'.encode('utf-8')).decode('ascii')
    req = urllib.request.Request(
        'https://api.razorpay.com/v1/orders',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Basic {credentials}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode('utf-8'))


def _signature_is_valid(order_id, payment_id, signature, secret):
    """Razorpay signs 'order_id|payment_id' with the secret; recompute and compare."""
    if not (order_id and payment_id and signature and secret):
        return False
    expected = hmac.new(
        secret.encode('utf-8'), f'{order_id}|{payment_id}'.encode('utf-8'), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@payments_bp.route('/payments/razorpay/order', methods=['POST'])
def create_razorpay_order():
    """Create a test-mode Razorpay order. The secret key never leaves the server."""
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        return jsonify({'error': 'Razorpay keys are not configured on the server'}), 503

    data = request.get_json() or {}
    try:
        amount_paise = int(round(float(data.get('amount', 0)) * 100))
    except (TypeError, ValueError):
        amount_paise = 0
    if amount_paise < 100:
        return jsonify({'error': 'Razorpay amount must be at least ₹1'}), 400

    try:
        order = _create_order_at_razorpay(key_id, key_secret, amount_paise, str(data.get('booking_id', '')))
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError) as exc:
        return jsonify({'error': f'Unable to create Razorpay order: {exc}'}), 502
    order['key_id'] = key_id  # public key only — the browser needs it for checkout
    return jsonify(order)


@payments_bp.route('/payments/razorpay/verify', methods=['POST'])
def verify_razorpay_payment():
    data = request.get_json() or {}
    ok = _signature_is_valid(
        str(data.get('razorpay_order_id', '')),
        str(data.get('razorpay_payment_id', '')),
        str(data.get('razorpay_signature', '')),
        current_app.config.get('RAZORPAY_KEY_SECRET', ''),
    )
    if not ok:
        return jsonify({'verified': False, 'error': 'Razorpay signature verification failed'}), 400
    return jsonify({'verified': True})


@payments_bp.route('/payments', methods=['POST'])
@require_auth
def pay_booking(current_user):
    data = request.get_json()
    booking_id = data.get('booking_id')
    method = data.get('method', 'cash')
    b = db.bookings.find_one({'_id': booking_id})
    if not b:
        return jsonify({'error': 'Booking not found'}), 404
    if b['status'] == 'payment_completed':
        return jsonify({'ok': True})

    ride = db.rides.find_one({'_id': b['ride_id']})
    rider = db.users.find_one({'_id': b['rider_id']})

    if method == 'wallet':
        if rider['wallet_balance'] < b['fare']:
            return jsonify({'error': 'Insufficient wallet balance — recharge first'}), 400
        new_balance = rider['wallet_balance'] - b['fare']
        db.users.update_one({'_id': rider['_id']}, {'$set': {'wallet_balance': new_balance}})
        db.wallet_transactions.insert_one(new_wallet_transaction(
            user_id=rider['_id'], type='debit', amount=b['fare'],
            balance_after=new_balance, reference='ride payment',
        ))

    if method != 'cash' and ride:
        driver = db.users.find_one({'_id': ride['driver_id']})
        if driver:
            driver_balance = driver['wallet_balance'] + b['fare']
            db.users.update_one({'_id': driver['_id']}, {'$set': {'wallet_balance': driver_balance}})
            db.wallet_transactions.insert_one(new_wallet_transaction(
                user_id=driver['_id'], type='credit', amount=b['fare'],
                balance_after=driver_balance, reference='ride earnings',
            ))

    db.payments.insert_one(new_payment(
        booking_id=booking_id, user_id=b['rider_id'],
        amount=b['fare'], method=method,
    ))
    db.bookings.update_one({'_id': booking_id}, {'$set': {'status': 'payment_completed'}})
    return jsonify({'ok': True})


@payments_bp.route('/wallet/<uid>', methods=['GET'])
@require_auth
def wallet_for(current_user, uid):
    user = db.users.find_one({'_id': uid})
    txns = db.wallet_transactions.find({'user_id': uid}).sort('created_at', DESCENDING)
    return jsonify({
        'balance': user['wallet_balance'] if user else 0,
        'transactions': serialize_many(txns),
    })


@payments_bp.route('/wallet/<uid>/transactions', methods=['GET'])
@require_auth
def transaction_history(current_user, uid):
    if uid != current_user['_id']:
        return jsonify({'error': 'You can only view your own transactions'}), 403
    txns = db.wallet_transactions.find({'user_id': uid}).sort('created_at', DESCENDING)
    return jsonify(serialize_many(txns))


@payments_bp.route('/wallet/<uid>/recharge', methods=['POST'])
@require_auth
def recharge_wallet(current_user, uid):
    data = request.get_json()
    amount = float(data.get('amount', 0))
    method = data.get('method', 'upi')
    user = db.users.find_one({'_id': uid})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    new_balance = user['wallet_balance'] + amount
    db.users.update_one({'_id': uid}, {'$set': {'wallet_balance': new_balance}})
    db.wallet_transactions.insert_one(new_wallet_transaction(
        user_id=uid, type='credit', amount=amount,
        balance_after=new_balance,
        reference=f'wallet recharge ({method})',
    ))
    return jsonify({'balance': new_balance})


def _bump_driver_rating(driver_id, stars):
    driver = db.users.find_one({'_id': driver_id})
    if not driver:
        return
    count = driver['rating_count'] + 1
    avg = round(((driver['rating_avg'] * driver['rating_count']) + stars) / count, 1)
    db.users.update_one({'_id': driver_id}, {'$set': {'rating_avg': avg, 'rating_count': count}})


@payments_bp.route('/ratings', methods=['POST'])
@require_auth
def rate_booking(current_user):
    data = request.get_json()
    booking_id = data.get('booking_id')
    stars = int(data.get('stars', 0))
    b = db.bookings.find_one({'_id': booking_id})
    if not b:
        return jsonify({'ok': True})
    ride = db.rides.find_one({'_id': b['ride_id']})
    if not ride:
        return jsonify({'ok': True})
    db.ratings.insert_one(new_rating(
        booking_id=booking_id, rater_id=b['rider_id'],
        ratee_id=ride['driver_id'], stars=stars,
    ))
    _bump_driver_rating(ride['driver_id'], stars)
    return jsonify({'ok': True})


@payments_bp.route('/reviews', methods=['POST'])
@require_auth
def review_booking(current_user):
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    stars = int(data.get('stars', 0))
    comment = str(data.get('comment', '')).strip()[:500]
    if not 1 <= stars <= 5:
        return jsonify({'error': 'A review must be between 1 and 5 stars'}), 400
    booking = db.bookings.find_one({'_id': booking_id})
    if not booking or booking['rider_id'] != current_user['_id']:
        return jsonify({'error': 'Review is only available to the passenger'}), 403
    if booking['status'] != 'payment_completed':
        return jsonify({'error': 'Complete payment before reviewing this ride'}), 400
    existing = db.review_feedback.find_one({'booking_id': booking_id})
    if existing:
        return jsonify(serialize(existing))
    ride = db.rides.find_one({'_id': booking['ride_id']})
    if not ride:
        return jsonify({'error': 'Ride not found'}), 404
    review = new_review_feedback(
        booking_id=booking_id, rater_id=current_user['_id'],
        ratee_id=ride['driver_id'], stars=stars, comment=comment,
    )
    db.review_feedback.insert_one(review)
    _bump_driver_rating(ride['driver_id'], stars)
    return jsonify(serialize(review)), 201


@payments_bp.route('/reviews/driver/<uid>', methods=['GET'])
@require_auth
def driver_reviews(current_user, uid):
    if uid != current_user['_id']:
        return jsonify({'error': 'You can only view your own driver feedback'}), 403
    driver = db.users.find_one({'_id': uid})
    reviews = []
    for rating in db.ratings.find({'ratee_id': uid}).sort('created_at', DESCENDING):
        rater = db.users.find_one({'_id': rating['rater_id']})
        reviews.append({**serialize(rating), 'comment': '', 'rater': {'name': rater['name']} if rater else None})
    for review in db.review_feedback.find({'ratee_id': uid}).sort('created_at', DESCENDING):
        rater = db.users.find_one({'_id': review['rater_id']})
        reviews.append({**serialize(review), 'rater': {'name': rater['name']} if rater else None})
    reviews.sort(key=lambda item: item.get('created_at') or '', reverse=True)
    return jsonify({
        'average': driver['rating_avg'] if driver else 0,
        'count': driver['rating_count'] if driver else 0,
        'reviews': reviews,
    })
