from flask import Blueprint, request, jsonify
from models import db
from models.user import User
from models.company import Company
from utils.auth_middleware import require_auth

users_bp = Blueprint('users', __name__, url_prefix='/api')


@users_bp.route('/users/<uid>', methods=['PUT'])
@require_auth
def update_profile(current_user, uid):
    if current_user._id != uid:
        return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json()
    if 'name' in data:
        current_user.name = data['name']
    if 'phone' in data:
        current_user.phone = data['phone']
    db.session.commit()
    return jsonify(current_user.to_dict())


@users_bp.route('/companies/<cid>', methods=['GET'])
@require_auth
def get_company(current_user, cid):
    company = Company.query.get(cid)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    return jsonify(company.to_dict())
