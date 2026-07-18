from models import db, gen_id, utcnow


class User(db.Model):
    __tablename__ = 'users'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    phone = db.Column(db.String(20), default='')
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='employee')  # employee | admin
    status = db.Column(db.String(20), default='pending_approval')  # pending_approval | active | rejected | suspended | deactivated
    has_onboarded = db.Column(db.Boolean, default=False)
    department = db.Column(db.String(100), default='')
    wallet_balance = db.Column(db.Float, default=0.0)
    rating_avg = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self, include_password=False):
        d = {
            '_id': self._id,
            'company_id': self.company_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'status': self.status,
            'has_onboarded': self.has_onboarded,
            'department': self.department,
            'wallet_balance': self.wallet_balance,
            'rating_avg': self.rating_avg,
            'rating_count': self.rating_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_password:
            d['password'] = self.password
        return d
