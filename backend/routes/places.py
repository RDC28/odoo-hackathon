from flask import Blueprint, request, jsonify
from models import db, serialize, serialize_many
from models.rating import new_saved_place
from utils.auth_middleware import require_auth

places_bp = Blueprint('places', __name__, url_prefix='/api/saved-places')


@places_bp.route('', methods=['GET'])
@require_auth
def list_places(current_user):
    uid = request.args.get('user', current_user['_id'])
    places = db.saved_places.find({'user_id': uid})
    return jsonify(serialize_many(places))


@places_bp.route('', methods=['POST'])
@require_auth
def add_place(current_user):
    data = request.get_json()
    p = new_saved_place(
        user_id=current_user['_id'],
        label=data.get('label', 'Place'),
        address=data.get('address', ''),
        lat=float(data.get('lat', 0)),
        lng=float(data.get('lng', 0)),
    )
    db.saved_places.insert_one(p)
    return jsonify(serialize(p)), 201


@places_bp.route('/<pid>', methods=['DELETE'])
@require_auth
def remove_place(current_user, pid):
    db.saved_places.delete_one({'_id': pid})
    return jsonify({'ok': True})
