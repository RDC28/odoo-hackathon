from models import gen_id, utcnow


def new_user(company_id=None, name='', email='', phone='', password='',
             role='employee', status='pending_approval', has_onboarded=False,
             department='', wallet_balance=0.0, rating_avg=0.0, rating_count=0):
    """users collection document.
    role: employee | admin | superadmin
    status: pending_approval | active | rejected | suspended | deactivated
    """
    return {
        '_id': gen_id(),
        'company_id': company_id,
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': role,
        'status': status,
        'has_onboarded': has_onboarded,
        'department': department,
        'wallet_balance': wallet_balance,
        'rating_avg': rating_avg,
        'rating_count': rating_count,
        'created_at': utcnow(),
    }
