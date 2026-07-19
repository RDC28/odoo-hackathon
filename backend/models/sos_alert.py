from models import db, gen_id, utcnow


class SOSAlert(db.Model):
    __tablename__ = 'sos_alerts'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    booking_id = db.Column(db.String(36), db.ForeignKey('bookings._id'), nullable=False)
    requester_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    admin_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=True)
    trusted_contact = db.Column(db.String(20), nullable=False)
    message = db.Column(db.String(500), default='Emergency assistance requested')
    status = db.Column(db.String(20), default='open')
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'booking_id': self.booking_id,
            'requester_id': self.requester_id,
            'company_id': self.company_id,
            'admin_id': self.admin_id,
            'trusted_contact': self.trusted_contact,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
