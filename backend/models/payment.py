from models import db, gen_id, utcnow


class Payment(db.Model):
    __tablename__ = 'payments'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    booking_id = db.Column(db.String(36), db.ForeignKey('bookings._id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(20), nullable=False)  # cash | card | upi | wallet
    status = db.Column(db.String(20), default='success')
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'booking_id': self.booking_id,
            'user_id': self.user_id,
            'amount': self.amount,
            'method': self.method,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class WalletTransaction(db.Model):
    __tablename__ = 'wallet_transactions'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    user_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # credit | debit
    amount = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float, nullable=False)
    reference = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'type': self.type,
            'amount': self.amount,
            'balance_after': self.balance_after,
            'reference': self.reference,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
