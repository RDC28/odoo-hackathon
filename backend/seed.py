import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash
from app import create_app
from models import db
from models.company import Company
from models.user import User
from models.vehicle import Vehicle
from models.ride import Ride
from models.rating import SavedPlace

app = create_app()

def seed():
    with app.app_context():
        # Clear existing
        db.drop_all()
        db.create_all()

        print("Seeding database...")

        c = Company(
            name="Odoo Pvt. Ltd.",
            industry="Software",
            registered_address="Gandhinagar, Gujarat",
            admin_contact="admin@odoo.com",
            join_code="DEMO01"
        )
        db.session.add(c)
        db.session.commit()

        # Company Branches
        from models.company_branch import CompanyBranch
        b1 = CompanyBranch(
            company_id=c._id,
            name="Odoo Gandhinagar HQ",
            address="Gandhinagar, Gujarat",
            lat=23.19,
            lng=72.63
        )
        b2 = CompanyBranch(
            company_id=c._id,
            name="Odoo Ahmedabad Office",
            address="Satellite, Ahmedabad",
            lat=23.03,
            lng=72.51
        )
        db.session.add_all([b1, b2])

        # Admin
        admin = User(
            company_id=c._id,
            name="Admin User",
            email="admin@odoo.com",
            password=generate_password_hash('admin123'),
            role='admin',
            status='active',
            has_onboarded=True,
            department="Administration"
        )
        db.session.add(admin)

        # Users
        u1 = User(
            company_id=c._id,
            name="Alice Driver",
            email="alice@odoo.com",
            phone="9876543210",
            password=generate_password_hash('alice123'),
            department="Engineering",
            status='active',
            has_onboarded=True,
            wallet_balance=500
        )
        u2 = User(
            company_id=c._id,
            name="Bob Rider",
            email="bob@odoo.com",
            phone="9876543211",
            password=generate_password_hash('bob123'),
            department="Sales",
            status='active',
            has_onboarded=True,
            wallet_balance=1000
        )
        db.session.add(u1)
        db.session.add(u2)

        # Super Admin
        superadmin = User(
            name="Super Admin",
            email="superadmin@platform.com",
            phone="",
            password=generate_password_hash('superadmin123'),
            role='superadmin',
            status='active',
            has_onboarded=True,
            department="Platform Operations"
        )
        db.session.add(superadmin)
        db.session.commit()

        # Assign Branches to Users
        from models.rating import SavedPlace
        db.session.add_all([
            SavedPlace(user_id=admin._id, label=b1.name, address=b1.address, lat=b1.lat, lng=b1.lng),
            SavedPlace(user_id=u1._id, label=b1.name, address=b1.address, lat=b1.lat, lng=b1.lng),
            SavedPlace(user_id=u2._id, label=b2.name, address=b2.address, lat=b2.lat, lng=b2.lng)
        ])
        db.session.commit()

        # Vehicle
        v1 = Vehicle(
            company_id=c._id,
            owner_id=u1._id,
            type="car",
            model="Hyundai i20",
            registration_number="GJ01AB1234",
            seating_capacity=3
        )
        db.session.add(v1)
        db.session.flush()

        # Saved Places
        p1 = SavedPlace(user_id=u1._id, label="Home", address="Satellite, Ahmedabad", lat=23.03, lng=72.51)
        p2 = SavedPlace(user_id=u1._id, label="Office", address="Odoo, Gandhinagar", lat=23.19, lng=72.63)
        p3 = SavedPlace(user_id=u2._id, label="Home", address="Bopal, Ahmedabad", lat=23.02, lng=72.46)
        db.session.add_all([p1, p2, p3])

        # Active Ride
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=9, minute=0, second=0).isoformat()
        r1 = Ride(
            company_id=c._id,
            driver_id=u1._id,
            vehicle_id=v1._id,
            departure_at=tomorrow,
            seats_total=3,
            seats_available=3,
            price_per_seat=50,
            distance_km=22.5,
            duration_min=45,
            status='active'
        )
        r1.start_location = {"address": p1.address, "lat": p1.lat, "lng": p1.lng}
        r1.destination_location = {"address": p2.address, "lat": p2.lat, "lng": p2.lng}
        db.session.add(r1)

        db.session.commit()
        print(f"Seed complete!")
        print(f"Company Join Code: {c.join_code}")
        print("Login credentials:")
        print("Admin: admin@odoo.com / admin123")
        print("Alice (Driver): alice@odoo.com / alice123")
        print("Bob (Rider): bob@odoo.com / bob123")

if __name__ == '__main__':
    seed()
