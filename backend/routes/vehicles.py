from flask import Blueprint, request, jsonify
from models import db
from models.vehicle import Vehicle
from models.ride import Ride
from utils.auth_middleware import require_auth

vehicles_bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')


@vehicles_bp.route('', methods=['GET'])
@require_auth
def list_vehicles(current_user):
    owner = request.args.get('owner', current_user._id)
    vehicles = Vehicle.query.filter_by(owner_id=owner).all()
    return jsonify([v.to_dict() for v in vehicles])


@vehicles_bp.route('', methods=['POST'])
@require_auth
def add_vehicle(current_user):
    data = request.get_json()
    reg = (data.get('registration_number') or '').strip().upper()
    existing = Vehicle.query.filter_by(
        company_id=current_user.company_id,
        registration_number=reg
    ).first()
    if existing:
        return jsonify({'error': 'A vehicle with this registration number is already registered'}), 400
    mileage = float(data.get('mileage_kmpl', 15))
    if mileage <= 0:
        return jsonify({'error': 'Mileage must be greater than 0'}), 400
    v = Vehicle(
        company_id=current_user.company_id,
        owner_id=current_user._id,
        type=data.get('type', 'car'),
        model=data.get('model', ''),
        registration_number=reg,
        seating_capacity=int(data.get('seating_capacity', 4)),
        mileage_kmpl=mileage,
        photo=data.get('photo')
    )
    db.session.add(v)
    db.session.commit()
    return jsonify(v.to_dict()), 201


@vehicles_bp.route('/<vid>', methods=['PUT'])
@require_auth
def update_vehicle(current_user, vid):
    v = Vehicle.query.get(vid)
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    data = request.get_json()
    reg = (data.get('registration_number') or '').strip().upper()
    existing = Vehicle.query.filter(
        Vehicle.company_id == current_user.company_id,
        Vehicle.registration_number == reg,
        Vehicle._id != vid
    ).first()
    if existing:
        return jsonify({'error': 'A vehicle with this registration number is already registered'}), 400
    mileage = float(data.get('mileage_kmpl', 15))
    if mileage <= 0:
        return jsonify({'error': 'Mileage must be greater than 0'}), 400
    v.type = data.get('type', 'car')
    v.model = data.get('model', '')
    v.registration_number = reg
    v.seating_capacity = int(data.get('seating_capacity', 4))
    v.mileage_kmpl = mileage
    if 'photo' in data:
        v.photo = data.get('photo')
    db.session.commit()
    return jsonify(v.to_dict())


@vehicles_bp.route('/<vid>', methods=['DELETE'])
@require_auth
def remove_vehicle(current_user, vid):
    v = Vehicle.query.get(vid)
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    in_use = Ride.query.filter(
        Ride.vehicle_id == vid,
        Ride.status.in_(['active', 'started', 'in_progress'])
    ).first()
    if in_use:
        return jsonify({'error': 'This vehicle is used by an active ride — cancel or complete it first'}), 400
    db.session.delete(v)
    db.session.commit()
    return jsonify({'ok': True})
