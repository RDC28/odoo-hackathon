from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import db
from models.user import User
from models.vehicle import Vehicle
from models.ride import Ride
from models.booking import Booking
from models.company import Company
from utils.auth_middleware import require_admin

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


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
    mileage = float(data.get('mileage_kmpl', 15))
    if mileage <= 0:
        return jsonify({'error': 'Mileage must be greater than 0'}), 400
    v = Vehicle(
        company_id=current_user.company_id,
        owner_id=data.get('owner_id'),
        type=data.get('type', 'car'),
        model=data.get('model', ''),
        registration_number=reg,
        seating_capacity=int(data.get('seating_capacity', 4)),
        mileage_kmpl=mileage,
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
    new_cfg = data.get('carpool_config', {})
    if new_cfg:
        cfg = dict(company.carpool_config or {})
        for key in ['fuel_cost_per_liter', 'cost_per_km', 'travel_cost_operational_per_km']:
            if key in new_cfg:
                cfg[key] = float(new_cfg[key])
        company.carpool_config = cfg  # reassign so SQLAlchemy notices the JSON change
    db.session.commit()
    return jsonify(company.to_dict())


@admin_bp.route('/reports', methods=['GET'])
@require_admin
def reports(current_user):
    company = Company.query.get(current_user.company_id)
    config = company.carpool_config or {}
    fuel_price = config.get('fuel_cost_per_liter', 100.0)

    employees = User.query.filter_by(company_id=current_user.company_id).all()
    vehicles = Vehicle.query.filter_by(company_id=current_user.company_id).all()
    rides = Ride.query.filter_by(company_id=current_user.company_id).all()
    bookings = Booking.query.join(Ride, Booking.ride_id == Ride._id).filter(
        Ride.company_id == current_user.company_id
    ).all()

    # Look up vehicles/owners once instead of re-querying inside loops
    vehicle_by_id = {v._id: v for v in vehicles}
    user_by_id = {u._id: u for u in employees}

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rides_this_month = sum(1 for r in rides if r.departure_at and r.departure_at.year == month_start.year and r.departure_at.month == month_start.month)

    AVG_MILEAGE = 15
    completed = [r for r in rides if r.status == 'completed']
    total_distance = sum(r.distance_km or 0 for r in completed)

    fuel_cost = 0
    for r in completed:
        vehicle = vehicle_by_id.get(r.vehicle_id)
        mileage = (vehicle.mileage_kmpl if vehicle else 0) or AVG_MILEAGE
        fuel_cost += (r.distance_km or 0) / mileage * fuel_price
    fuel_cost = round(fuel_cost)

    vehicle_wise = []
    for v in vehicles:
        vehicle_rides = [r for r in completed if r.vehicle_id == v._id]
        km = sum(r.distance_km or 0 for r in vehicle_rides)
        owner = user_by_id.get(v.owner_id)
        vehicle_wise.append({
            **v.to_dict(),
            'owner': owner.to_dict() if owner else None,
            'trips': len(vehicle_rides),
            'km': round(km, 1),
            'cost': round(km / (v.mileage_kmpl or AVG_MILEAGE) * fuel_price),
        })

    active_rides = [r for r in rides if r.status in ['active', 'started', 'in_progress']]
    paid_bookings = [b for b in bookings if b.status == 'payment_completed']
    revenue = sum(b.fare for b in paid_bookings)

    published_seats = sum(r.seats_total or 0 for r in rides)
    shared_seats = sum((r.seats_total or 0) - (r.seats_available or 0) for r in rides)

    def location_insights(field):
        counts = {}
        ride_by_id = {r._id: r for r in rides}
        for booking in bookings:
            if booking.status == 'cancelled':
                continue
            ride = ride_by_id.get(booking.ride_id)
            location = getattr(ride, field, None) if ride else None
            if not location or not location.get('address'):
                continue
            name = location['address'].split(',')[0]
            counts[name] = counts.get(name, 0) + (booking.seats_booked or 1)
        return [{'name': name, 'seats': seats} for name, seats in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:5]]

    return jsonify({
        'totalEmployees': len([u for u in employees if u.role != 'admin']),
        'totalVehicles': len(vehicles),
        'ridesThisMonth': rides_this_month,
        'totalTrips': len(completed),
        'totalDistance': round(total_distance, 1),
        'fuelCost': fuel_cost,
        'costPerKm': config.get('cost_per_km', 10.0),
        'utilization': round((shared_seats / published_seats * 100) if published_seats else 0),
        'vehicleWise': vehicle_wise,
        'totalBookings': len([b for b in bookings if b.status != 'cancelled']),
        'activeRides': len(active_rides),
        'activeSeats': sum(r.seats_available for r in active_rides),
        'sharedSeats': shared_seats,
        'drivers': len({r.driver_id for r in rides}),
        'riders': len({b.rider_id for b in bookings if b.status != 'cancelled'}),
        'revenue': round(revenue, 2),
        'averageFare': round(revenue / len(paid_bookings), 2) if paid_bookings else 0,
        'locationInsights': {
            'origins': location_insights('start_location'),
            'destinations': location_insights('destination_location'),
        },
    })
