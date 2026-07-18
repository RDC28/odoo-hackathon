import math


def haversine_km(a, b):
    """Calculate distance in km between two points with lat/lng."""
    R = 6371
    d_lat = math.radians(b['lat'] - a['lat'])
    d_lng = math.radians(b['lng'] - a['lng'])
    s = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(a['lat'])) *
         math.cos(math.radians(b['lat'])) *
         math.sin(d_lng / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(s))
