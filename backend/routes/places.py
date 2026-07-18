from flask import Blueprint, request, jsonify
from models import db
from models.rating import SavedPlace
from utils.auth_middleware import require_auth

places_bp = Blueprint('places', __name__, url_prefix='/api/saved-places')


@places_bp.route('', methods=['GET'])
@require_auth
def list_places(current_user):
    uid = request.args.get('user', current_user._id)
    places = SavedPlace.query.filter_by(user_id=uid).all()
    return jsonify([p.to_dict() for p in places])


@places_bp.route('', methods=['POST'])
@require_auth
def add_place(current_user):
    data = request.get_json()
    p = SavedPlace(
        user_id=current_user._id,
        label=data.get('label', 'Place'),
        address=data.get('address', ''),
        lat=float(data.get('lat', 0)),
        lng=float(data.get('lng', 0)),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@places_bp.route('/<pid>', methods=['DELETE'])
@require_auth
def remove_place(current_user, pid):
    p = SavedPlace.query.get(pid)
    if p:
        db.session.delete(p)
        db.session.commit()
    return jsonify({'ok': True})
