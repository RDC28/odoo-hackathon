from flask import Blueprint, jsonify
from utils.auth_middleware import require_superadmin
from models import db, serialize

superadmin_bp = Blueprint('superadmin', __name__, url_prefix='/api/superadmin')


@superadmin_bp.route('/stats', methods=['GET'])
@require_superadmin
def get_stats(current_user):
    return jsonify({
        'total_organizations': db.companies.count_documents({}),
        'total_users': db.users.count_documents({}),
        'total_rides': db.rides.count_documents({}),
        'total_vehicles': db.vehicles.count_documents({}),
        'total_bookings': db.bookings.count_documents({}),
        'active_users': db.users.count_documents({'status': 'active'}),
        'completed_rides': db.rides.count_documents({'status': 'completed'}),
    })


@superadmin_bp.route('/companies', methods=['GET'])
@require_superadmin
def list_companies(current_user):
    companies = db.companies.find()
    # For each company, find the admin and employee count
    result = []
    for c in companies:
        admin = db.users.find_one({'company_id': c['_id'], 'role': 'admin'})
        c_dict = serialize(c)
        c_dict['admin_name'] = admin['name'] if admin else 'No Admin'
        c_dict['admin_email'] = admin['email'] if admin else 'N/A'
        c_dict['employee_count'] = db.users.count_documents({'company_id': c['_id']})
        c_dict['vehicle_count'] = db.vehicles.count_documents({'company_id': c['_id']})
        c_dict['ride_count'] = db.rides.count_documents({'company_id': c['_id']})
        c_dict['status'] = 'active'
        result.append(c_dict)

    return jsonify(result)
