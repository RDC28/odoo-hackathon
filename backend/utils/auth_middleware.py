from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models import db


def _current_user():
    """Read the JWT from the request and load that user document from MongoDB."""
    verify_jwt_in_request()
    return db.users.find_one({'_id': get_jwt_identity()})


def require_auth(f):
    """Any logged-in user whose account is active."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = _current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 401
        if user.get('status') != 'active':
            return jsonify({'error': 'Your account is not active. Please contact your administrator.'}), 403
        return f(user, *args, **kwargs)
    return wrapper


def require_admin(f):
    """Only organization admins."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = _current_user()
        if not user:
            return jsonify({'error': 'User not found'}), 401
        if user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(user, *args, **kwargs)
    return wrapper


def require_superadmin(f):
    """Only the platform superadmin."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = _current_user()
        if not user or user.get('role') != 'superadmin':
            return jsonify({'error': 'Superadmin access required'}), 403
        return f(user, *args, **kwargs)
    return wrapper
