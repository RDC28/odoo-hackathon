import random
import string
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, serialize
from models.user import new_user
from models.company import new_company
from models.rating import new_saved_place
from utils.auth_middleware import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    user = db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    if user['status'] == 'pending_approval':
        return jsonify({'error': 'Your registration is pending admin approval.'}), 403
    if user['status'] != 'active':
        return jsonify({'error': f"Your account is {user['status']}. Please contact your administrator."}), 403
    token = create_access_token(identity=user['_id'])
    return jsonify({'token': token, 'user': serialize(user)})


@auth_bp.route('/me', methods=['GET'])
def me():
    try:
        verify_jwt_in_request()
        user = db.users.find_one({'_id': get_jwt_identity()})
        if not user:
            return jsonify(None), 200
        return jsonify(serialize(user))
    except Exception:
        return jsonify(None), 200


@auth_bp.route('/register-org', methods=['POST'])
def register_org():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'An account with this email already exists'}), 400
    join_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    company = new_company(
        name=data.get('companyName', ''),
        industry=data.get('industry', ''),
        registered_address=data.get('address', ''),
        admin_contact=email,
        join_code=join_code,
    )
    db.companies.insert_one(company)
    admin = new_user(
        company_id=company['_id'],
        name=data.get('adminName', ''),
        email=email,
        phone=data.get('phone', ''),
        password=generate_password_hash(data.get('password', '')),
        role='admin',
        status='active',
        department='Administration',
    )
    db.users.insert_one(admin)
    token = create_access_token(identity=admin['_id'])
    return jsonify({'token': token, 'company': serialize(company), 'admin': serialize(admin)})


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    join_code = (data.get('joinCode') or '').strip().upper()
    company = db.companies.find_one({'join_code': join_code})
    if not company:
        return jsonify({'error': 'Invalid organization join code'}), 400
    email = (data.get('email') or '').strip().lower()
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'An account with this email already exists'}), 400
    user = new_user(
        company_id=company['_id'],
        name=data.get('name', ''),
        email=email,
        phone=data.get('phone', ''),
        password=generate_password_hash(data.get('password', '')),
        department=data.get('department', ''),
        status='pending_approval',
    )
    db.users.insert_one(user)
    token = create_access_token(identity=user['_id'])
    return jsonify({'token': token, 'user': serialize(user)})


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
        db.saved_places.insert_one(new_saved_place(
            user_id=current_user['_id'], label='Home',
            address=home.get('address'), lat=home.get('lat', 23.0), lng=home.get('lng', 72.0),
        ))
    if office:
        db.saved_places.insert_one(new_saved_place(
            user_id=current_user['_id'], label='Office',
            address=office.get('address'), lat=office.get('lat', 23.0), lng=office.get('lng', 72.0),
        ))

    db.users.update_one({'_id': current_user['_id']}, {'$set': {'has_onboarded': True}})
    current_user['has_onboarded'] = True
    return jsonify(serialize(current_user))
