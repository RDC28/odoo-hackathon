from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import db, gen_id
from models.user import User
from models.vehicle import Vehicle
from models.ride import Ride
from models.booking import Booking
from models.company import Company
from models.company_branch import CompanyBranch
from utils.auth_middleware import require_admin

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/companies/<company_id>/branches', methods=['GET'])
@require_admin
def get_company_branches(current_user, company_id):
    if current_user.company_id != company_id:
        return jsonify({'error': 'Unauthorized'}), 403
    branches = CompanyBranch.query.filter_by(company_id=company_id).all()
    return jsonify([b.to_dict() for b in branches])


@admin_bp.route('/companies/<company_id>/branches', methods=['POST'])
@require_admin
def add_company_branch(current_user, company_id):
    if current_user.company_id != company_id:
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    branch = CompanyBranch(
        _id=gen_id(),
        company_id=company_id,
        name=data.get('name'),
        address=data.get('address'),
        lat=data.get('lat', 23.0),
        lng=data.get('lng', 72.0)
    )
    db.session.add(branch)
    db.session.commit()
    return jsonify(branch.to_dict()), 201


@admin_bp.route('/companies/<company_id>/branches/<branch_id>', methods=['DELETE'])
@require_admin
def delete_company_branch(current_user, company_id, branch_id):
    if current_user.company_id != company_id:
        return jsonify({'error': 'Unauthorized'}), 403
    branch = CompanyBranch.query.filter_by(_id=branch_id, company_id=company_id).first()
    if branch:
        db.session.delete(branch)
        db.session.commit()
    return jsonify({'ok': True})


@admin_bp.route('/employees', methods=['GET'])
@require_admin
def list_employees(current_user):
    rows = User.query.filter_by(company_id=current_user.company_id).all()
    return jsonify([u.to_dict() for u in rows])


@admin_bp.route('/employees', methods=['POST'])
@require_admin
def add_employee(current_user):
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400
    user = User(
        company_id=current_user.company_id,
        name=data.get('name', ''),
        email=email,
        phone=data.get('phone', ''),
        department=data.get('department', ''),
        password=generate_password_hash(data.get('password', 'welcome123')),
        status='active',
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@admin_bp.route('/employees/<uid>/status', methods=['PUT'])
@require_admin
def set_status(current_user, uid):
    data = request.get_json()
    user = User.query.get(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    status = data.get('status')
    if status in ['pending_approval', 'active', 'rejected', 'suspended', 'deactivated']:
        user.status = status
    db.session.commit()
    return jsonify(user.to_dict())


@admin_bp.route('/vehicles', methods=['GET'])
@require_admin
def list_vehicles(current_user):
    vehicles = Vehicle.query.filter_by(company_id=current_user.company_id).all()
    results = []
    for v in vehicles:
        vd = v.to_dict()
        owner = User.query.get(v.owner_id)
        vd['owner'] = owner.to_dict() if owner else None
        results.append(vd)
    return jsonify(results)


@admin_bp.route('/vehicles', methods=['POST'])
@require_admin
def add_vehicle(current_user):
    data = request.get_json()
    reg = (data.get('registration_number') or '').strip().upper()
    if Vehicle.query.filter_by(
        company_id=current_user.company_id,
        registration_number=reg
    ).first():
        return jsonify({'error': 'A vehicle with this registration number is already registered'}), 400
    v = Vehicle(
        company_id=current_user.company_id,
        owner_id=data.get('owner_id'),
        type=data.get('type', 'car'),
        model=data.get('model', ''),
        registration_number=reg,
        seating_capacity=int(data.get('seating_capacity', 4)),
    )
    db.session.add(v)
    db.session.commit()
    return jsonify(v.to_dict()), 201


@admin_bp.route('/vehicles/<vid>/status', methods=['PUT'])
@require_admin
def set_vehicle_status(current_user, vid):
    data = request.get_json()
    v = Vehicle.query.get(vid)
    if not v:
        return jsonify({'error': 'Vehicle not found'}), 404
    v.status = data.get('status', 'active')
    db.session.commit()
    return jsonify(v.to_dict())


@admin_bp.route('/company', methods=['PUT'])
@require_admin
def update_company(current_user):
    data = request.get_json()
    company = Company.query.get(current_user.company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    for key in ['name', 'industry', 'registered_address', 'admin_contact']:
        if key in data:
            setattr(company, key, data[key])
    cfg = data.get('carpool_config', {})
    if 'fuel_cost_per_liter' in cfg:
        company.fuel_cost_per_liter = float(cfg['fuel_cost_per_liter'])
    if 'cost_per_km' in cfg:
        company.cost_per_km = float(cfg['cost_per_km'])
    if 'travel_cost_operational_per_km' in cfg:
        company.travel_cost_operational_per_km = float(cfg['travel_cost_operational_per_km'])
    db.session.commit()
    return jsonify(company.to_dict())


@admin_bp.route('/reports', methods=['GET'])
@require_admin
def reports(current_user):
    company = Company.query.get(current_user.company_id)
    employees = User.query.filter_by(company_id=current_user.company_id).all()
    vehicles = Vehicle.query.filter_by(company_id=current_user.company_id).all()
    rides = Ride.query.filter_by(company_id=current_user.company_id).all()

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rides_this_month = sum(1 for r in rides if r.created_at and r.created_at >= month_start)

    completed = [r for r in rides if r.status == 'completed']
    total_distance = sum(r.distance_km or 0 for r in completed)
    AVG_MILEAGE = 15
    fuel_liters = total_distance / AVG_MILEAGE
    fuel_cost = round(fuel_liters * company.fuel_cost_per_liter)

    vehicle_wise = []
    for v in vehicles:
        vr = [r for r in completed if r.vehicle_id == v._id]
        km = sum(r.distance_km or 0 for r in vr)
        owner = User.query.get(v.owner_id)
        vehicle_wise.append({
            **v.to_dict(),
            'owner': owner.to_dict() if owner else None,
            'trips': len(vr),
            'km': round(km, 1),
            'cost': round((km / AVG_MILEAGE) * company.fuel_cost_per_liter),
        })

    return jsonify({
        'totalEmployees': len(employees),
        'totalVehicles': len(vehicles),
        'ridesThisMonth': rides_this_month,
        'totalTrips': len(completed),
        'totalDistance': round(total_distance, 1),
        'fuelCost': fuel_cost,
        'costPerKm': company.cost_per_km,
        'utilization': round((len(completed) / len(rides) * 100) if rides else 0),
        'vehicleWise': vehicle_wise,
    })
