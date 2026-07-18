import sys
import os

# Add the backend directory to the path for model imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect, text
from config import Config
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    CORS(app, supports_credentials=True)
    JWTManager(app)
    db.init_app(app)

    # Import all models so SQLAlchemy knows about them
    from models.company import Company
    from models.user import User
    from models.vehicle import Vehicle
    from models.ride import Ride
    from models.booking import Booking
    from models.payment import Payment, WalletTransaction
    from models.conversation import Conversation, Message
    from models.rating import Rating, SavedPlace

    # Register blueprints
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

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(vehicles_bp)
    app.register_blueprint(rides_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(places_bp)
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(superadmin_bp, url_prefix='/api/superadmin')

    # Create tables
    with app.app_context():
        db.create_all()
        # Lightweight migration for the existing SQLite demo database.
        vehicle_columns = {column['name'] for column in inspect(db.engine).get_columns('vehicles')}
        if 'mileage_kmpl' not in vehicle_columns:
            db.session.execute(text('ALTER TABLE vehicles ADD COLUMN mileage_kmpl FLOAT NOT NULL DEFAULT 15'))
            db.session.commit()

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'ok', 'message': 'Carpool API is running'}

    return app


if __name__ == '__main__':
    app = create_app()
    print('Carpool API running on http://localhost:5000')
    app.run(debug=True, port=5000)
