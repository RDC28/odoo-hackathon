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
from models.booking import Booking
from models.conversation import Conversation, Message
from models.rating import SavedPlace

app = create_app()

ISKCON = {"address": "ISKCON Cross Road, Ahmedabad", "lat": 23.0295, "lng": 72.5062}
INFOCITY = {"address": "Infocity, Gandhinagar", "lat": 23.1893, "lng": 72.6367}
BOPAL = {"address": "Bopal, Ahmedabad", "lat": 23.0202, "lng": 72.4627}
SATELLITE = {"address": "Satellite, Ahmedabad", "lat": 23.0301, "lng": 72.5067}
SG_HIGHWAY = {"address": "SG Highway, Ahmedabad", "lat": 23.0734, "lng": 72.5258}
GIFT = {"address": "GIFT City, Gandhinagar", "lat": 23.1631, "lng": 72.6369}


def departure_at(hour, add_days=0):
    value = datetime.now(timezone.utc) + timedelta(days=add_days)
    return value.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()


def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("Seeding multi-organization demo data...")

        def make_company(name, industry, address, code, admin_email):
            company = Company(
                name=name, industry=industry, registered_address=address,
                admin_contact=admin_email, join_code=code,
            )
            db.session.add(company)
            db.session.flush()
            return company

        def make_user(company, name, email, department, role="employee"):
            user = User(
                company_id=company._id, name=name, email=email,
                phone="9876543210", password=generate_password_hash("demo123"),
                role=role, status="active", has_onboarded=True,
                department=department, wallet_balance=800 if role != "admin" else 0,
                rating_avg=4.7 if role != "admin" else 0,
                rating_count=8 if role != "admin" else 0,
            )
            db.session.add(user)
            db.session.flush()
            return user

        def make_vehicle(company, owner, vehicle_type, model, registration, seats, mileage):
            vehicle = Vehicle(
                company_id=company._id, owner_id=owner._id,
                type=vehicle_type, model=model,
                registration_number=registration, seating_capacity=seats,
                mileage_kmpl=mileage,
                status="active",
            )
            db.session.add(vehicle)
            db.session.flush()
            return vehicle

        def make_place(user, label, place):
            db.session.add(SavedPlace(
                user_id=user._id, label=label, address=place["address"],
                lat=place["lat"], lng=place["lng"],
            ))

        def make_ride(company, driver, vehicle, start, destination, hour, seats, price, add_days=0, recurring=None, status="active"):
            ride = Ride(
                company_id=company._id, driver_id=driver._id,
                vehicle_id=vehicle._id, departure_at=departure_at(hour, add_days),
                seats_total=seats, seats_available=seats,
                price_per_seat=price, distance_km=26.4,
                duration_min=45, status=status,
            )
            ride.start_location = start
            ride.destination_location = destination
            ride.recurring_days = recurring or []
            db.session.add(ride)
            db.session.flush()
            return ride

        def make_booking(ride, rider, seats=1, status="booked"):
            conversation = Conversation(
                company_id=ride.company_id, type="ride",
                ride_id=ride._id, last_message_at=datetime.now(timezone.utc).isoformat(),
            )
            conversation.participant_ids = [rider._id, ride.driver_id]
            db.session.add(conversation)
            db.session.flush()

            booking = Booking(
                ride_id=ride._id, rider_id=rider._id, seats_booked=seats,
                fare=ride.price_per_seat * seats, status=status,
                conversation_id=conversation._id,
            )
            booking.pickup_point = ride.start_location
            booking.drop_point = ride.destination_location
            db.session.add(booking)
            ride.seats_available -= seats
            db.session.flush()
            return booking, conversation

        odoo = make_company("Odoo Pvt. Ltd.", "Software", "Gandhinagar, Gujarat", "DEMO01", "admin@demo.com")
        odoo_admin = make_user(odoo, "Amit Shah", "admin@demo.com", "Administration", "admin")
        raj = make_user(odoo, "Raj Patel", "raj@demo.com", "Engineering")
        krishna = make_user(odoo, "Krishna Singh", "krishna@demo.com", "Sales")
        neha = make_user(odoo, "Neha Joshi", "neha@demo.com", "Design")
        priya = make_user(odoo, "Priya Nair", "priya@demo.com", "HR")
        arjun = make_user(odoo, "Arjun Mehta", "arjun@demo.com", "Finance")

        dzire = make_vehicle(odoo, raj, "car", "Swift Dzire", "GJ01AB1234", 4, 16.5)
        alto = make_vehicle(odoo, krishna, "car", "Alto 800", "GJ01AB5034", 3, 19)
        neha_bike = make_vehicle(odoo, neha, "bike", "Ather 450X", "GJ01CD7799", 1, 40)

        raj_ride = make_ride(odoo, raj, dzire, ISKCON, INFOCITY, 19, 4, 120, recurring=["Mo", "Tu", "We", "Th", "Fr"])
        make_ride(odoo, krishna, alto, BOPAL, INFOCITY, 20, 3, 100)
        make_ride(odoo, neha, neha_bike, SATELLITE, GIFT, 18, 1, 80, 1)
        completed = make_ride(odoo, raj, dzire, INFOCITY, ISKCON, 8, 4, 110, -1, status="completed")
        completed.seats_available = 3

        make_booking(raj_ride, priya)
        make_booking(raj_ride, arjun)
        history_booking, history_chat = make_booking(completed, priya, status="payment_completed")
        db.session.add(Message(conversation_id=history_chat._id, sender_id=priya._id, content="Thanks for the ride!"))

        for user, label, place in [
            (odoo_admin, "Office", INFOCITY), (raj, "Home", ISKCON), (raj, "Office", INFOCITY),
            (krishna, "Home", BOPAL), (krishna, "Office", INFOCITY),
            (neha, "Home", SATELLITE), (neha, "Office", GIFT),
            (priya, "Home", ISKCON), (priya, "Office", INFOCITY),
            (arjun, "Home", BOPAL), (arjun, "Office", INFOCITY),
        ]:
            make_place(user, label, place)

        acme = make_company("Acme Technologies", "Technology", "Ahmedabad, Gujarat", "ACME01", "admin@acme01.com")
        acme_admin = make_user(acme, "Maya Rao", "admin@acme01.com", "Administration", "admin")
        maya = make_user(acme, "Maya Driver", "maya@acme01.com", "Operations")
        rohan = make_user(acme, "Rohan Das", "rohan@acme01.com", "Product")
        sara = make_user(acme, "Sara Khan", "sara@acme01.com", "Marketing")
        dev = make_user(acme, "Dev Patel", "dev@acme01.com", "Support")

        creta = make_vehicle(acme, maya, "car", "Hyundai Creta", "GJ05EF4421", 5, 14.5)
        nexon = make_vehicle(acme, sara, "car", "Tata Nexon", "GJ05GH8810", 4, 17)
        make_vehicle(acme, dev, "bike", "Honda Activa", "GJ06JK1188", 1, 45)
        maya_ride = make_ride(acme, maya, creta, SG_HIGHWAY, GIFT, 18, 5, 140, recurring=["Mo", "Tu", "We", "Th", "Fr"])
        make_ride(acme, sara, nexon, BOPAL, SG_HIGHWAY, 8, 4, 90, 1)
        make_booking(maya_ride, rohan, 2)
        make_booking(maya_ride, dev)

        for user, label, place in [
            (acme_admin, "Office", GIFT), (maya, "Home", SG_HIGHWAY),
            (rohan, "Home", BOPAL), (sara, "Office", GIFT), (dev, "Home", SATELLITE),
        ]:
            make_place(user, label, place)

        superadmin = User(
            company_id=None, name="Super Admin", email="superadmin@platform.com",
            phone="", password=generate_password_hash("superadmin123"),
            role="superadmin", status="active", has_onboarded=True,
            department="Platform Operations",
        )
        db.session.add(superadmin)
        db.session.commit()

        print("Seed complete.")
        print("Organization 1: DEMO01")
        print("Organization 2: ACME01")
        print("Employee password for all seeded employees: demo123")
        print("Admins: admin@demo.com, admin@acme01.com")
        print("Super admin: superadmin@platform.com / superadmin123")


if __name__ == "__main__":
    seed()
