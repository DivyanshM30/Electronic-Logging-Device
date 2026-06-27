"""
Route service using OpenRouteService (free, no key required for basic geocoding)
and OSRM for routing.
"""
import requests
import math


OSRM_BASE = "https://router.project-osrm.org/route/v1/driving"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"


def geocode(location_name: str) -> dict:
    """
    Geocode a location using Nominatim (OpenStreetMap).
    Returns {'lat': float, 'lng': float, 'display_name': str}
    """
    try:
        resp = requests.get(
            NOMINATIM_BASE,
            params={
                'q': location_name,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1,
            },
            headers={'User-Agent': 'SpotterELDApp/1.0'},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            raise ValueError(f"Location not found: {location_name}")
        result = data[0]
        return {
            'lat': float(result['lat']),
            'lng': float(result['lon']),
            'display_name': result.get('display_name', location_name),
            'short_name': _extract_short_name(result),
        }
    except Exception as e:
        raise ValueError(f"Geocoding failed for '{location_name}': {e}")


def _extract_short_name(result: dict) -> str:
    """Extract a readable short name from Nominatim result."""
    addr = result.get('address', {})
    city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('county', '')
    state = addr.get('state', '')
    if city and state:
        return f"{city}, {state}"
    return result.get('display_name', '').split(',')[0]


def get_route(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> dict:
    """
    Get route between two coordinates using OSRM.
    Returns {'distance_miles': float, 'duration_hours': float, 'geometry': [...]}
    """
    try:
        url = f"{OSRM_BASE}/{from_lng},{from_lat};{to_lng},{to_lat}"
        resp = requests.get(
            url,
            params={'overview': 'full', 'geometries': 'geojson', 'annotations': 'false'},
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get('code') != 'Ok' or not data.get('routes'):
            raise ValueError("No route found")

        route = data['routes'][0]
        distance_m = route['distance']
        duration_s = route['duration']
        geometry = route['legs'][0].get('steps', [])

        # Extract coordinate list from full geometry
        coords = route.get('geometry', {}).get('coordinates', [])

        return {
            'distance_miles': distance_m / 1609.344,
            'duration_hours': duration_s / 3600,
            'geometry': [[c[1], c[0]] for c in coords],  # [lat, lng] format for Leaflet
        }
    except Exception as e:
        # Fallback: straight-line estimate
        dist = _haversine_miles(from_lat, from_lng, to_lat, to_lng)
        return {
            'distance_miles': dist,
            'duration_hours': dist / 55.0,  # ~55 mph average
            'geometry': [[from_lat, from_lng], [to_lat, to_lng]],
        }


def _haversine_miles(lat1, lon1, lat2, lon2) -> float:
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def plan_route(current_location: str, pickup_location: str, dropoff_location: str) -> dict:
    """
    Geocode all three locations and get two route segments.
    Returns full route data including coordinates and geometry.
    """
    # Geocode
    current = geocode(current_location)
    pickup = geocode(pickup_location)
    dropoff = geocode(dropoff_location)

    # Route segment 1: current → pickup
    seg1 = get_route(current['lat'], current['lng'], pickup['lat'], pickup['lng'])
    # Route segment 2: pickup → dropoff
    seg2 = get_route(pickup['lat'], pickup['lng'], dropoff['lat'], dropoff['lng'])

    return {
        'locations': {
            'current': current,
            'pickup': pickup,
            'dropoff': dropoff,
        },
        'segments': [
            {
                'from_name': current['short_name'],
                'to_name': pickup['short_name'],
                'from_lat': current['lat'],
                'from_lng': current['lng'],
                'to_lat': pickup['lat'],
                'to_lng': pickup['lng'],
                'distance_miles': seg1['distance_miles'],
                'duration_hours': seg1['duration_hours'],
                'geometry': seg1['geometry'],
            },
            {
                'from_name': pickup['short_name'],
                'to_name': dropoff['short_name'],
                'from_lat': pickup['lat'],
                'from_lng': pickup['lng'],
                'to_lat': dropoff['lat'],
                'to_lng': dropoff['lng'],
                'distance_miles': seg2['distance_miles'],
                'duration_hours': seg2['duration_hours'],
                'geometry': seg2['geometry'],
            },
        ],
        'total_distance_miles': seg1['distance_miles'] + seg2['distance_miles'],
        'total_duration_hours': seg1['duration_hours'] + seg2['duration_hours'],
    }
