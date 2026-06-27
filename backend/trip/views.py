from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .route_service import plan_route
from .hos_calculator import HOSCalculator
import traceback


class TripPlanView(APIView):
    """
    POST /api/trip/plan
    Body: {
        "current_location": "Green Bay, WI",
        "pickup_location": "Chicago, IL",
        "dropoff_location": "St. Louis, MO",
        "current_cycle_used": 20.5
    }
    """

    def post(self, request):
        data = request.data

        # Validate inputs
        required = ['current_location', 'pickup_location', 'dropoff_location']
        for field in required:
            if not data.get(field, '').strip():
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        current_location = data['current_location'].strip()
        pickup_location = data['pickup_location'].strip()
        dropoff_location = data['dropoff_location'].strip()
        current_cycle_used = float(data.get('current_cycle_used', 0) or 0)

        # Clamp cycle hours
        current_cycle_used = max(0.0, min(70.0, current_cycle_used))

        try:
            # Get route data
            route_data = plan_route(current_location, pickup_location, dropoff_location)

            # Run HOS simulation
            calculator = HOSCalculator(
                segments=route_data['segments'],
                current_cycle_used=current_cycle_used
            )
            hos_result = calculator.calculate()

            # Build full geometry (concatenate both segments, deduplicate)
            full_geometry = []
            for seg in route_data['segments']:
                if full_geometry and seg['geometry']:
                    full_geometry.extend(seg['geometry'][1:])
                else:
                    full_geometry.extend(seg['geometry'])

            return Response({
                'success': True,
                'trip': {
                    'current_location': route_data['locations']['current'],
                    'pickup_location': route_data['locations']['pickup'],
                    'dropoff_location': route_data['locations']['dropoff'],
                    'total_distance_miles': round(route_data['total_distance_miles'], 1),
                    'total_duration_hours': round(route_data['total_duration_hours'], 2),
                    'full_geometry': full_geometry,
                    'segments': route_data['segments'],
                },
                'hos': hos_result,
                'inputs': {
                    'current_location': current_location,
                    'pickup_location': pickup_location,
                    'dropoff_location': dropoff_location,
                    'current_cycle_used': current_cycle_used,
                }
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            traceback.print_exc()
            return Response(
                {'error': f'Planning failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
