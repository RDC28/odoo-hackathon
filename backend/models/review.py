from models import db, gen_id, utcnow


class ReviewFeedback(db.Model):
    __tablename__ = 'review_feedback'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    booking_id = db.Column(db.String(36), db.ForeignKey('bookings._id'), nullable=False, unique=True)
    rater_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    ratee_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    stars = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id, 'booking_id': self.booking_id, 'rater_id': self.rater_id,
            'ratee_id': self.ratee_id, 'stars': self.stars, 'comment': self.comment or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
