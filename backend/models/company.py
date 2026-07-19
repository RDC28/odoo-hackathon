from models import gen_id, utcnow


def default_carpool_config():
    return {
        'fuel_cost_per_liter': 100.0,
        'cost_per_km': 10.0,
        'travel_cost_operational_per_km': 3.0,
    }


def new_company(name='', industry='', registered_address='', admin_contact='',
                join_code='', carpool_config=None):
    """companies collection document."""
    return {
        '_id': gen_id(),
        'name': name,
        'industry': industry,
        'registered_address': registered_address,
        'admin_contact': admin_contact,
        'join_code': join_code,
        'carpool_config': carpool_config or default_carpool_config(),
        'created_at': utcnow(),
    }
