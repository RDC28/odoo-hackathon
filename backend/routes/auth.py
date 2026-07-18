import random
import string
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from models import db
from models.user import User
from models.company import Company
from models.rating import SavedPlace
from utils.auth_middleware import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    user = User.query.filter(db.func.lower(User.email) == email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid email or password'}), 401
    if user.status == 'pending_approval':
        return jsonify({'error': 'Your registration is pending admin approval.'}), 403
    if user.status != 'active':
        return jsonify({'error': f'Your account is {user.status}. Please contact your administrator.'}), 403
    token = create_access_token(identity=user._id)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/me', methods=['GET'])
def me():
    try:
        verify_jwt_in_request()
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify(None), 200
        return jsonify(user.to_dict())
    except Exception:
        return jsonify(None), 200


@auth_bp.route('/register-org', methods=['POST'])
def register_org():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400
    join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    company = Company(
        name=data.get('companyName', ''),
        industry=data.get('industry', ''),
        registered_address=data.get('address', ''),
        admin_contact=email,
        join_code=join_code,
    )
    db.session.add(company)
    db.session.flush()
    admin = User(
        company_id=company._id,
        name=data.get('adminName', ''),
        email=email,
        phone=data.get('phone', ''),
        password=generate_password_hash(data.get('password', '')),
        role='admin',
        status='active',
        department='Administration',
    )
    db.session.add(admin)
    db.session.commit()
    token = create_access_token(identity=admin._id)
    return jsonify({'token': token, 'company': company.to_dict(), 'admin': admin.to_dict()})


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    join_code = (data.get('joinCode') or '').strip().upper()
    company = Company.query.filter_by(join_code=join_code).first()
    if not company:
        return jsonify({'error': 'Invalid organization join code'}), 400
    email = (data.get('email') or '').strip().lower()
    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({'error': 'An account with this email already exists'}), 400
    user = User(
        company_id=company._id,
        name=data.get('name', ''),
        email=email,
        phone=data.get('phone', ''),
        password=generate_password_hash(data.get('password', '')),
        department=data.get('department', ''),
        status='pending_approval',
    )
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=user._id)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    # JWT is stateless; the frontend simply discards the token
    return jsonify({'ok': True})


@auth_bp.route('/onboard', methods=['POST'])
@require_auth
def complete_onboarding(current_user):
    data = request.json or {}
    home = data.get('home')
    office = data.get('office')
    
    if home:
        p1 = SavedPlace(user_id=current_user._id, label='Home', address=home.get('address'), lat=home.get('lat', 23.0), lng=home.get('lng', 72.0))
        db.session.add(p1)
    if office:
        p2 = SavedPlace(user_id=current_user._id, label='Office', address=office.get('address'), lat=office.get('lat', 23.0), lng=office.get('lng', 72.0))
        db.session.add(p2)

    current_user.has_onboarded = True
    db.session.commit()
    return jsonify(current_user.to_dict())
