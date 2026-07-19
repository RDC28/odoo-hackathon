from flask import Blueprint, request, jsonify
from models import db, serialize, serialize_many
from models.vehicle import new_vehicle
from utils.auth_middleware import require_auth

vehicles_bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')


@vehicles_bp.route('', methods=['GET'])
@require_auth
def list_vehicles(current_user):
    owner = request.args.get('owner', current_user['_id'])
    vehicles = db.vehicles.find({'owner_id': owner})
    return jsonify(serialize_many(vehicles))


@vehicles_bp.route('', methods=['POST'])
@require_auth
def add_vehicle(current_user):
    data = request.get_json()
    reg = (data.get('registration_number') or '').strip().upper()
    existing = db.vehicles.find_one({
        'company_id': current_user['company_id'],
        'registration_number': reg,
    })
    if existing:
        return jsonify({'error': 'A vehicle with this registration number is already registered'}), 400
    mileage = float(data.get('mileage_kmpl', 15))
    if mileage <= 0:
        return jsonify({'error': 'Mileage must be greater than 0'}), 400
    v = new_vehicle(
        company_id=current_user['company_id'],
        owner_id=current_user['_id'],
        type=data.get('type', 'car'),
        model=data.get('model', ''),
        registration_number=reg,
        seating_capacity=int(data.get('seating_capacity', 4)),
        mileage_kmpl=mileage,
        photo=data.get('photo'),
    )
    db.vehicles.insert_one(v)
    return jsonify(serialize(v)), 201


@vehicles_bp.route('/<vid>', methods=['PUT'])
@require_auth
def update_vehicle(current_user, vid):
    v = db.vehicles.find_one({'_id': vid})
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    data = request.get_json()
    reg = (data.get('registration_number') or '').strip().upper()
    existing = db.vehicles.find_one({
        'company_id': current_user['company_id'],
        'registration_number': reg,
        '_id': {'$ne': vid},
    })
    if existing:
        return jsonify({'error': 'A vehicle with this registration number is already registered'}), 400
    mileage = float(data.get('mileage_kmpl', 15))
    if mileage <= 0:
        return jsonify({'error': 'Mileage must be greater than 0'}), 400
    updates = {
        'type': data.get('type', 'car'),
        'model': data.get('model', ''),
        'registration_number': reg,
        'seating_capacity': int(data.get('seating_capacity', 4)),
        'mileage_kmpl': mileage,
    }
    if 'photo' in data:
        updates['photo'] = data.get('photo')
    db.vehicles.update_one({'_id': vid}, {'$set': updates})
    v.update(updates)
    return jsonify(serialize(v))


@vehicles_bp.route('/<vid>', methods=['DELETE'])
@require_auth
def remove_vehicle(current_user, vid):
    v = db.vehicles.find_one({'_id': vid})
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    in_use = db.rides.find_one({
        'vehicle_id': vid,
        'status': {'$in': ['active', 'started', 'in_progress']},
    })
    if in_use:
        return jsonify({'error': 'This vehicle is used by an active ride — cancel or complete it first'}), 400
    db.vehicles.delete_one({'_id': vid})
    return jsonify({'ok': True})
