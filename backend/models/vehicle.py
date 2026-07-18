from models import db, gen_id, utcnow


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    owner_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    type = db.Column(db.String(20), default='car')  # car | bike | van
    model = db.Column(db.String(100), nullable=False)
    registration_number = db.Column(db.String(20), nullable=False)
    seating_capacity = db.Column(db.Integer, nullable=False)
    mileage_kmpl = db.Column(db.Float, nullable=False, default=15.0)
    status = db.Column(db.String(20), default='active')  # active | inactive
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'company_id': self.company_id,
            'owner_id': self.owner_id,
            'type': self.type,
            'model': self.model,
            'registration_number': self.registration_number,
            'seating_capacity': self.seating_capacity,
            'mileage_kmpl': self.mileage_kmpl,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
