from models import db, gen_id, utcnow


class Ride(db.Model):
    __tablename__ = 'rides'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles._id'), nullable=False)
    start_location = db.Column(db.JSON, nullable=False)        # { address, lat, lng }
    destination_location = db.Column(db.JSON, nullable=False)  # { address, lat, lng }
    departure_at = db.Column(db.String(30), nullable=False)
    recurring_days = db.Column(db.JSON, default=list)          # e.g. ["Mo", "Tu"]
    seats_total = db.Column(db.Integer, nullable=False)
    seats_available = db.Column(db.Integer, nullable=False)
    price_per_seat = db.Column(db.Float, default=0.0)
    route_coords = db.Column(db.JSON, nullable=True)           # [[lat, lng], ...]
    distance_km = db.Column(db.Float, nullable=True)
    duration_min = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='active')  # active | started | in_progress | completed | cancelled
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'company_id': self.company_id,
            'driver_id': self.driver_id,
            'vehicle_id': self.vehicle_id,
            'start_location': self.start_location,
            'destination_location': self.destination_location,
            'departure_at': self.departure_at,
            'recurring_days': self.recurring_days or [],
            'seats_total': self.seats_total,
            'seats_available': self.seats_available,
            'price_per_seat': self.price_per_seat,
            'route_coords': self.route_coords,
            'distance_km': self.distance_km,
            'duration_min': self.duration_min,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
