from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime, timezone
import uuid

from config import Config

client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB_NAME]


def gen_id():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


def serialize(doc, include_password=False):
    """Turn a MongoDB document into a JSON-safe dict (datetimes -> isoformat)."""
    if doc is None:
        return None
    d = dict(doc)
    if not include_password:
        d.pop('password', None)
    for key, value in d.items():
        if isinstance(value, datetime):
            d[key] = value.isoformat()
    return d


def serialize_many(docs, include_password=False):
    return [serialize(doc, include_password) for doc in docs]


def ensure_indexes():
    db.users.create_index([('email', ASCENDING)], unique=True)
    db.users.create_index([('company_id', ASCENDING)])
    db.companies.create_index([('join_code', ASCENDING)], unique=True)
    db.vehicles.create_index([('owner_id', ASCENDING)])
    db.vehicles.create_index([('company_id', ASCENDING), ('registration_number', ASCENDING)])
    db.rides.create_index([('company_id', ASCENDING), ('status', ASCENDING)])
    db.rides.create_index([('driver_id', ASCENDING), ('created_at', DESCENDING)])
    db.bookings.create_index([('ride_id', ASCENDING)])
    db.bookings.create_index([('rider_id', ASCENDING), ('created_at', DESCENDING)])
    db.payments.create_index([('booking_id', ASCENDING)])
    db.wallet_transactions.create_index([('user_id', ASCENDING), ('created_at', DESCENDING)])
    db.conversations.create_index([('company_id', ASCENDING), ('type', ASCENDING)])
    db.messages.create_index([('conversation_id', ASCENDING), ('created_at', ASCENDING)])
    db.ratings.create_index([('ratee_id', ASCENDING)])
    db.saved_places.create_index([('user_id', ASCENDING)])
    db.review_feedback.create_index([('booking_id', ASCENDING)], unique=True)
    db.review_feedback.create_index([('ratee_id', ASCENDING)])


__all__ = ['client', 'db', 'gen_id', 'utcnow', 'serialize', 'serialize_many', 'ensure_indexes']
