from models import db, gen_id, utcnow


class Company(db.Model):
    __tablename__ = 'companies'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    name = db.Column(db.String(200), nullable=False)
    industry = db.Column(db.String(100), default='')
    registered_address = db.Column(db.String(300), default='')
    admin_contact = db.Column(db.String(200), default='')
    join_code = db.Column(db.String(10), unique=True, nullable=False)
    carpool_config = db.Column(db.JSON, default=lambda: {
        'fuel_cost_per_liter': 100.0,
        'cost_per_km': 10.0,
        'travel_cost_operational_per_km': 3.0,
    })
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'name': self.name,
            'industry': self.industry,
            'registered_address': self.registered_address,
            'admin_contact': self.admin_contact,
            'join_code': self.join_code,
            'carpool_config': self.carpool_config or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
