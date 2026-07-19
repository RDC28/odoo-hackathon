from models import gen_id, utcnow


def new_vehicle(company_id, owner_id, type='car', model='', registration_number='',
                seating_capacity=4, mileage_kmpl=15.0, photo=None, status='active'):
    """vehicles collection document.
    type: car | bike | van — status: active | inactive
    """
    return {
        '_id': gen_id(),
        'company_id': company_id,
        'owner_id': owner_id,
        'type': type,
        'model': model,
        'registration_number': registration_number,
        'seating_capacity': seating_capacity,
        'mileage_kmpl': mileage_kmpl,
        'photo': photo,
        'status': status,
        'created_at': utcnow(),
    }
