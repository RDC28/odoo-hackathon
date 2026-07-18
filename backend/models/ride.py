import json
from models import db, gen_id, utcnow


class Ride(db.Model):
    __tablename__ = 'rides'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles._id'), nullable=False)
    # Locations stored as JSON strings
    start_location_json = db.Column(db.Text, nullable=False)
    destination_location_json = db.Column(db.Text, nullable=False)
    departure_at = db.Column(db.String(30), nullable=False)
    recurring_days_json = db.Column(db.Text, default='[]')
    seats_total = db.Column(db.Integer, nullable=False)
    seats_available = db.Column(db.Integer, nullable=False)
    price_per_seat = db.Column(db.Float, default=0.0)
    route_coords_json = db.Column(db.Text, nullable=True)
    distance_km = db.Column(db.Float, nullable=True)
    duration_min = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=utcnow)

    @property
    def start_location(self):
        return json.loads(self.start_location_json) if self.start_location_json else None

    @start_location.setter
    def start_location(self, val):
        self.start_location_json = json.dumps(val) if val else None

    @property
    def destination_location(self):
        return json.loads(self.destination_location_json) if self.destination_location_json else None

    @destination_location.setter
    def destination_location(self, val):
        self.destination_location_json = json.dumps(val) if val else None

    @property
    def recurring_days(self):
        return json.loads(self.recurring_days_json) if self.recurring_days_json else []

    @recurring_days.setter
    def recurring_days(self, val):
        self.recurring_days_json = json.dumps(val) if val else '[]'

    @property
    def route_coords(self):
        return json.loads(self.route_coords_json) if self.route_coords_json else None

    @route_coords.setter
    def route_coords(self, val):
        self.route_coords_json = json.dumps(val) if val else None

    def to_dict(self):
        return {
            '_id': self._id,
            'company_id': self.company_id,
            'driver_id': self.driver_id,
            'vehicle_id': self.vehicle_id,
            'start_location': self.start_location,
            'destination_location': self.destination_location,
            'departure_at': self.departure_at,
            'recurring_days': self.recurring_days,
            'seats_total': self.seats_total,
            'seats_available': self.seats_available,
            'price_per_seat': self.price_per_seat,
            'route_coords': self.route_coords,
            'distance_km': self.distance_km,
            'duration_min': self.duration_min,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
