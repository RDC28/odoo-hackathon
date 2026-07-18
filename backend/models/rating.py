from models import db, gen_id, utcnow


class Rating(db.Model):
    __tablename__ = 'ratings'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    booking_id = db.Column(db.String(36), db.ForeignKey('bookings._id'), nullable=False)
    rater_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    ratee_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    stars = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'booking_id': self.booking_id,
            'rater_id': self.rater_id,
            'ratee_id': self.ratee_id,
            'stars': self.stars,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SavedPlace(db.Model):
    __tablename__ = 'saved_places'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    label = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(300), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'label': self.label,
            'address': self.address,
            'lat': self.lat,
            'lng': self.lng,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
