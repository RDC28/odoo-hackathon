import json
from models import db, gen_id, utcnow


class Booking(db.Model):
    __tablename__ = 'bookings'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    ride_id = db.Column(db.String(36), db.ForeignKey('rides._id'), nullable=False)
    rider_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    seats_booked = db.Column(db.Integer, nullable=False)
    pickup_point_json = db.Column(db.Text, nullable=False)
    drop_point_json = db.Column(db.Text, nullable=False)
    fare = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='booked')
    conversation_id = db.Column(db.String(36), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    @property
    def pickup_point(self):
        return json.loads(self.pickup_point_json) if self.pickup_point_json else None

    @pickup_point.setter
    def pickup_point(self, val):
        self.pickup_point_json = json.dumps(val) if val else None

    @property
    def drop_point(self):
        return json.loads(self.drop_point_json) if self.drop_point_json else None

    @drop_point.setter
    def drop_point(self, val):
        self.drop_point_json = json.dumps(val) if val else None

    def to_dict(self):
        return {
            '_id': self._id,
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'seats_booked': self.seats_booked,
            'pickup_point': self.pickup_point,
            'drop_point': self.drop_point,
            'fare': self.fare,
            'status': self.status,
            'conversation_id': self.conversation_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
