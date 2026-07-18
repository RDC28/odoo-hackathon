from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import uuid

db = SQLAlchemy()


def gen_id():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


from .user import User
from .company import Company
from .company_branch import CompanyBranch
from .vehicle import Vehicle
from .ride import Ride
from .booking import Booking
from .payment import Payment, WalletTransaction
from .conversation import Conversation, Message
from .rating import SavedPlace

__all__ = ['db', 'User', 'Company', 'CompanyBranch', 'Vehicle', 'Ride', 'Booking', 'Payment', 'WalletTransaction', 'Conversation', 'Message', 'SavedPlace']
