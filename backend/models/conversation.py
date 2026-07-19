from models import db, gen_id, utcnow


class Conversation(db.Model):
    __tablename__ = 'conversations'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # global | dm | ride
    participant_ids = db.Column(db.JSON, default=list)  # list of user _ids
    ride_id = db.Column(db.String(36), nullable=True)
    last_message_at = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'company_id': self.company_id,
            'type': self.type,
            'participant_ids': self.participant_ids or [],
            'ride_id': self.ride_id,
            'last_message_at': self.last_message_at,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Message(db.Model):
    __tablename__ = 'messages'
    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations._id'), nullable=False)
    sender_id = db.Column(db.String(36), db.ForeignKey('users._id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            '_id': self._id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
