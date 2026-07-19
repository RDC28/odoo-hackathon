import sys
import os

# Add the backend directory to the path for model imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import ensure_indexes


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    CORS(app, supports_credentials=True)
    JWTManager(app)

    # Register blueprints. Each blueprint declares its own url_prefix.
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.vehicles import vehicles_bp
    from routes.rides import rides_bp
    from routes.bookings import bookings_bp
    from routes.payments import payments_bp
    from routes.chat import chat_bp
    from routes.places import places_bp
    from routes.admin import admin_bp
    from routes.superadmin import superadmin_bp

    for bp in [auth_bp, users_bp, vehicles_bp, rides_bp, bookings_bp,
               payments_bp, chat_bp, places_bp, admin_bp, superadmin_bp]:
        app.register_blueprint(bp)

    # MongoDB needs no schema, but the unique indexes back the app's
    # duplicate-email / join-code / one-review-per-booking guarantees.
    ensure_indexes()

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'ok', 'message': 'Carpool API is running'}

    return app


if __name__ == '__main__':
    app = create_app()
    print('Carpool API running on http://localhost:5000')
    app.run(debug=True, port=5000)
