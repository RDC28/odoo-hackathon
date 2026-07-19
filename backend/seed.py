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
                rating_avg=0,
                rating_count=0,
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
            owner.rating_avg = round(4.4 + (len(owner.name) % 6) * 0.1, 1)
            owner.rating_count = 6 + (len(owner.name) % 15)
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

        # A larger network makes the map and search experience useful during
        # demos. These organizations intentionally share the same Ahmedabad /
        # Gandhinagar corridor, while remaining isolated by company_id.
        demo_locations = [
            ISKCON, INFOCITY, BOPAL, SATELLITE, SG_HIGHWAY, GIFT,
            {"address": "Prahlad Nagar, Ahmedabad", "lat": 23.0124, "lng": 72.5101},
            {"address": "Vastrapur, Ahmedabad", "lat": 23.0395, "lng": 72.5293},
            {"address": "Thaltej, Ahmedabad", "lat": 23.0505, "lng": 72.5070},
            {"address": "Navrangpura, Ahmedabad", "lat": 23.0350, "lng": 72.5600},
            {"address": "Paldi, Ahmedabad", "lat": 23.0120, "lng": 72.5620},
            {"address": "Motera, Ahmedabad", "lat": 23.0932, "lng": 72.5970},
            {"address": "Chandkheda, Ahmedabad", "lat": 23.1090, "lng": 72.5850},
            {"address": "Raysan, Gandhinagar", "lat": 23.1830, "lng": 72.6380},
        ]
        vehicle_specs = [
            ("car", "Maruti Suzuki Swift", 4, 18.2),
            ("car", "Hyundai Grand i10", 4, 17.5),
            ("car", "Tata Nexon", 4, 16.8),
            ("car", "Honda City", 4, 15.2),
            ("van", "Maruti Ertiga", 6, 14.1),
        ]
        generated_companies = [
            ("Vertex Mobility", "Mobility", "Prahlad Nagar, Ahmedabad", "VERTEX26", "admin@vertex26.com"),
            ("Nimbus Analytics", "Analytics", "Vastrapur, Ahmedabad", "NIMBUS26", "admin@nimbus26.com"),
            ("Greenfield Foods", "Food Services", "Thaltej, Ahmedabad", "GREEN26", "admin@green26.com"),
        ]
        # Give the canonical Odoo demo rider a rich local network as well.
        odoo_network = [(raj, dzire), (krishna, alto), (neha, neha_bike)]
        odoo_riders = [priya, arjun]
        for driver_index, (driver, vehicle) in enumerate(odoo_network):
            for ride_index in range(7):
                start = demo_locations[(driver_index + ride_index + 1) % len(demo_locations)]
                destination = demo_locations[(driver_index + ride_index + 4) % len(demo_locations)]
                network_ride = make_ride(
                    odoo, driver, vehicle, start, destination,
                    7 + ((driver_index + ride_index) % 4),
                    vehicle.seating_capacity, 85 + (ride_index % 4) * 15,
                    add_days=ride_index % 2,
                    recurring=["Mo", "Tu", "We", "Th", "Fr"],
                )
                if ride_index % 4 == 0:
                    make_booking(network_ride, odoo_riders[(driver_index + ride_index) % len(odoo_riders)])

        # Golden-path showcase data: Priya can search ISKCON Cross Road ->
        # Infocity today and see a dense, varied set of nearby driver pins.
        showcase_starts = [ISKCON, SATELLITE, demo_locations[7], demo_locations[9], BOPAL, SG_HIGHWAY]
        showcase_destinations = [INFOCITY, GIFT, demo_locations[13], INFOCITY, GIFT, demo_locations[13]]
        showcase_drivers = [(raj, dzire), (krishna, alto), (neha, neha_bike)]
        for showcase_index in range(12):
            driver, vehicle = showcase_drivers[showcase_index % len(showcase_drivers)]
            make_ride(
                odoo, driver, vehicle,
                showcase_starts[showcase_index % len(showcase_starts)],
                showcase_destinations[showcase_index % len(showcase_destinations)],
                8 + (showcase_index % 8), vehicle.seating_capacity,
                90 + (showcase_index % 5) * 10,
                recurring=["Mo", "Tu", "We", "Th", "Fr"],
            )

        generated_names = [
            "Aarav Mehta", "Ishita Shah", "Kabir Joshi", "Meera Patel",
            "Vihaan Desai", "Anaya Rao", "Aditya Trivedi", "Kiara Mehta",
            "Yash Kapoor", "Riya Soni", "Dhruv Parmar", "Tara Shah",
        ]
        generated_departments = ["Engineering", "Operations", "Sales", "Design", "Finance", "Human Resources"]

        for company_index, (company_name, industry, address, join_code, admin_email) in enumerate(generated_companies):
            company = make_company(company_name, industry, address, join_code, admin_email)
            admin = make_user(company, f"{company_name} Admin", admin_email, "Administration", "admin")
            employees = []
            for person_index, name in enumerate(generated_names):
                slug = name.lower().replace(" ", ".")
                email = f"{slug}.{company_index + 3}@demo.ascend.local"
                employee = make_user(
                    company, name, email,
                    generated_departments[person_index % len(generated_departments)]
                )
                employees.append(employee)

            drivers = employees[:6]
            riders = employees[6:]
            vehicles = []
            for vehicle_index, driver in enumerate(drivers):
                vehicle_type, model, seats, mileage = vehicle_specs[vehicle_index % len(vehicle_specs)]
                vehicle = make_vehicle(
                    company, driver, vehicle_type, model,
                    f"GJ{company_index + 7:02d}{vehicle_index + 1:02d}D{company_index}{vehicle_index}",
                    seats, mileage,
                )
                vehicles.append(vehicle)

            for person_index, employee in enumerate(employees):
                make_place(employee, "Home", demo_locations[(person_index + company_index) % len(demo_locations)])
                make_place(employee, "Office", demo_locations[(person_index + 1 + company_index) % len(demo_locations)])

            # Eight recurring rides per driver place many real, bookable cars
            # around the same corridors for the live nearby-driver preview.
            for driver_index, (driver, vehicle) in enumerate(zip(drivers, vehicles)):
                for ride_index in range(8):
                    start = demo_locations[(driver_index + ride_index + company_index) % len(demo_locations)]
                    destination = demo_locations[(driver_index + ride_index + 3 + company_index) % len(demo_locations)]
                    seats = vehicle.seating_capacity
                    ride = make_ride(
                        company, driver, vehicle, start, destination,
                        7 + ((driver_index + ride_index) % 4), seats,
                        75 + (ride_index % 5) * 15,
                        add_days=ride_index % 3,
                        recurring=["Mo", "Tu", "We", "Th", "Fr"],
                    )
                    # Seed a mix of open and partially occupied rides. The
                    # remaining seats are always kept within vehicle capacity.
                    if ride_index % 3 == 0 and riders:
                        make_booking(ride, riders[(driver_index + ride_index) % len(riders)])
                    if ride_index == 1 and len(riders) > 1:
                        make_booking(ride, riders[(driver_index + ride_index + 1) % len(riders)])

                # Historical rides feed rider/driver history and analytics.
                for history_index in range(3):
                    history = make_ride(
                        company, driver, vehicle,
                        demo_locations[(driver_index + history_index + 2) % len(demo_locations)],
                        demo_locations[(driver_index + history_index + 5) % len(demo_locations)],
                        8 + history_index, vehicle.seating_capacity,
                        80 + history_index * 10, add_days=-(history_index + 1),
                        status="completed",
                    )
                    history.seats_available = max(0, history.seats_total - 2)
                    history_booking, history_chat = make_booking(
                        history, riders[(driver_index + history_index) % len(riders)],
                        seats=1, status="payment_completed",
                    )
                    db.session.add(Message(
                        conversation_id=history_chat._id,
                        sender_id=history_booking.rider_id,
                        content="Thanks for the smooth ride!",
                    ))

        # Add a few deliberately non-operational records so admin filters and
        # status summaries show more than only the happy path.
        suspended = make_user(odoo, "Demo Suspended User", "suspended@demo.com", "Operations")
        suspended.status = "suspended"
        suspended.rating_avg = 0
        suspended.rating_count = 0
        inactive_vehicle = make_vehicle(odoo, suspended, "car", "Demo Inactive Car", "GJ99ZZ0001", 4, 14.0)
        inactive_vehicle.status = "inactive"

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
