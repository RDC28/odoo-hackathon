from flask import Blueprint, jsonify
from utils.auth_middleware import require_superadmin
from models import db
from models.company import Company
from models.user import User
from models.ride import Ride

superadmin_bp = Blueprint('superadmin', __name__)

@superadmin_bp.route('/stats', methods=['GET'])
@require_superadmin
def get_stats(current_user):
    total_companies = Company.query.count()
    total_users = User.query.count()
    total_rides = Ride.query.count()
    
    return jsonify({
        'total_organizations': total_companies,
        'total_users': total_users,
        'total_rides': total_rides
    })

@superadmin_bp.route('/companies', methods=['GET'])
@require_superadmin
def list_companies(current_user):
    companies = Company.query.all()
    # For each company, let's find the admin and employee count
    result = []
    for c in companies:
        admin = User.query.filter_by(company_id=c._id, role='admin').first()
        emp_count = User.query.filter_by(company_id=c._id).count()
        
        c_dict = c.to_dict()
        c_dict['admin_name'] = admin.name if admin else 'No Admin'
        c_dict['admin_email'] = admin.email if admin else 'N/A'
        c_dict['employee_count'] = emp_count
        result.append(c_dict)
        
    return jsonify(result)
