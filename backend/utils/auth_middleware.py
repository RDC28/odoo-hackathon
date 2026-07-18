from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.user import User


def require_auth(f):
    """Decorator that validates JWT and checks user still has platform access."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        if user.status != 'active':
            return jsonify({'error': 'Your account is not active. Please contact your administrator.'}), 403
        return f(user, *args, **kwargs)
    return wrapper


def require_admin(f):
    """Decorator that validates JWT and checks user is an admin."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(user, *args, **kwargs)
    return wrapper

def require_superadmin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user or user.role != 'superadmin':
            return jsonify({'error': 'Superadmin access required'}), 403
        return f(user, *args, **kwargs)
    return wrapper
