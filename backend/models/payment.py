from models import gen_id, utcnow


def new_payment(booking_id, user_id, amount, method, status='success'):
    """payments collection document. method: cash | card | upi | wallet"""
    return {
        '_id': gen_id(),
        'booking_id': booking_id,
        'user_id': user_id,
        'amount': amount,
        'method': method,
        'status': status,
        'created_at': utcnow(),
    }


def new_wallet_transaction(user_id, type, amount, balance_after, reference=''):
    """wallet_transactions collection document. type: credit | debit"""
    return {
        '_id': gen_id(),
        'user_id': user_id,
        'type': type,
        'amount': amount,
        'balance_after': balance_after,
        'reference': reference,
        'created_at': utcnow(),
    }
