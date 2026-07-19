from flask import Blueprint, request, jsonify
from models import db
from models.booking import Booking
from models.ride import Ride
from models.user import User
from models.sos_alert import SOSAlert
from utils.auth_middleware import require_auth, require_admin

safety_bp = Blueprint('safety', __name__, url_prefix='/api/safety')


@safety_bp.route('/sos', methods=['POST'])
@require_auth
def create_sos(current_user):
    data = request.get_json() or {}
    booking = Booking.query.get(data.get('booking_id'))
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    ride = Ride.query.get(booking.ride_id)
    if not ride or current_user._id not in [booking.rider_id, ride.driver_id]:
        return jsonify({'error': 'You are not part of this ride'}), 403
    if booking.status == 'cancelled' or ride.status in ['completed', 'cancelled']:
        return jsonify({'error': 'SOS is only available for an active ride'}), 400

    admin = User.query.filter_by(company_id=ride.company_id, role='admin', status='active').first()
    trusted = (current_user.trusted_contact or '').strip() or (admin.phone if admin else '')
    if not trusted:
        return jsonify({'error': 'Add a trusted emergency contact before using SOS'}), 400
    alert = SOSAlert(
        booking_id=booking._id, requester_id=current_user._id,
        company_id=ride.company_id, admin_id=admin._id if admin else None,
        trusted_contact=trusted,
        message=(data.get('message') or 'Emergency assistance requested')[:500],
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify({**alert.to_dict(), 'admin_contact': admin.phone if admin else ''}), 201


@safety_bp.route('/sos', methods=['GET'])
@require_admin
def list_sos(current_user):
    alerts = SOSAlert.query.filter_by(company_id=current_user.company_id).order_by(SOSAlert.created_at.desc()).all()
    return jsonify([a.to_dict() for a in alerts])
