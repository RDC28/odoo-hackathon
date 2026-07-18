from flask import Blueprint, request, jsonify
from models import db
from models.booking import Booking
from models.ride import Ride
from models.user import User
from models.payment import Payment, WalletTransaction
from models.rating import Rating
from utils.auth_middleware import require_auth

payments_bp = Blueprint('payments', __name__, url_prefix='/api')


@payments_bp.route('/payments', methods=['POST'])
@require_auth
def pay_booking(current_user):
    data = request.get_json()
    booking_id = data.get('booking_id')
    method = data.get('method', 'cash')
    b = Booking.query.get(booking_id)
    if not b:
        return jsonify({'error': 'Booking not found'}), 404
    if b.status == 'payment_completed':
        return jsonify({'ok': True})

    ride = Ride.query.get(b.ride_id)
    rider = User.query.get(b.rider_id)

    if method == 'wallet':
        if rider.wallet_balance < b.fare:
            return jsonify({'error': 'Insufficient wallet balance — recharge first'}), 400
        rider.wallet_balance -= b.fare
        db.session.add(WalletTransaction(
            user_id=rider._id, type='debit', amount=b.fare,
            balance_after=rider.wallet_balance, reference='ride payment',
        ))

    if method != 'cash' and ride:
        driver = User.query.get(ride.driver_id)
        if driver:
            driver.wallet_balance += b.fare
            db.session.add(WalletTransaction(
                user_id=driver._id, type='credit', amount=b.fare,
                balance_after=driver.wallet_balance, reference='ride earnings',
            ))

    db.session.add(Payment(
        booking_id=booking_id, user_id=b.rider_id,
        amount=b.fare, method=method,
    ))
    b.status = 'payment_completed'
    db.session.commit()
    return jsonify({'ok': True})


@payments_bp.route('/wallet/<uid>', methods=['GET'])
@require_auth
def wallet_for(current_user, uid):
    user = User.query.get(uid)
    txns = WalletTransaction.query.filter_by(user_id=uid).order_by(
        WalletTransaction.created_at.desc()
    ).all()
    return jsonify({
        'balance': user.wallet_balance if user else 0,
        'transactions': [t.to_dict() for t in txns],
    })


@payments_bp.route('/wallet/<uid>/recharge', methods=['POST'])
@require_auth
def recharge_wallet(current_user, uid):
    data = request.get_json()
    amount = float(data.get('amount', 0))
    method = data.get('method', 'upi')
    user = User.query.get(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.wallet_balance += amount
    db.session.add(WalletTransaction(
        user_id=uid, type='credit', amount=amount,
        balance_after=user.wallet_balance,
        reference=f'wallet recharge ({method})',
    ))
    db.session.commit()
    return jsonify({'balance': user.wallet_balance})


@payments_bp.route('/ratings', methods=['POST'])
@require_auth
def rate_booking(current_user):
    data = request.get_json()
    booking_id = data.get('booking_id')
    stars = int(data.get('stars', 0))
    b = Booking.query.get(booking_id)
    if not b:
        return jsonify({'ok': True})
    ride = Ride.query.get(b.ride_id)
    if not ride:
        return jsonify({'ok': True})
    db.session.add(Rating(
        booking_id=booking_id, rater_id=b.rider_id,
        ratee_id=ride.driver_id, stars=stars,
    ))
    driver = User.query.get(ride.driver_id)
    if driver:
        count = driver.rating_count + 1
        avg = round(((driver.rating_avg * driver.rating_count) + stars) / count, 1)
        driver.rating_avg = avg
        driver.rating_count = count
    db.session.commit()
    return jsonify({'ok': True})
