from flask import Blueprint, request, jsonify
from models import db, serialize
from utils.auth_middleware import require_auth

users_bp = Blueprint('users', __name__, url_prefix='/api')


@users_bp.route('/users/<uid>', methods=['PUT'])
@require_auth
def update_profile(current_user, uid):
    if current_user['_id'] != uid:
        return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json()
    updates = {}
    if 'name' in data:
        updates['name'] = data['name']
    if 'phone' in data:
        updates['phone'] = data['phone']
    if updates:
        db.users.update_one({'_id': uid}, {'$set': updates})
        current_user.update(updates)
    return jsonify(serialize(current_user))


@users_bp.route('/companies/<cid>', methods=['GET'])
@require_auth
def get_company(current_user, cid):
    company = db.companies.find_one({'_id': cid})
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    return jsonify(serialize(company))
