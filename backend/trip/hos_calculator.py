"""
HOS (Hours of Service) Calculator for property-carrying drivers.
Rules: 70hr/8-day cycle, 11-hr daily drive limit, 14-hr on-duty window,
30-min break required after 8 hrs driving, 10-hr off-duty reset,
1-hr for pickup/dropoff, fuel every 1000 miles (30 min stop).
"""

from dataclasses import dataclass, field
from typing import List, Optional
import math


@dataclass
class Activity:
    """Represents a single activity/duty-status block on an ELD log."""
    duty_status: str          # 'OFF', 'SB' (sleeper berth), 'D' (driving), 'ON' (on duty not driving)
    start_hour: float         # hours from midnight (0.0 = 12:00 AM, 13.5 = 1:30 PM)
    end_hour: float
    location: str
    remark: str = ''

    @property
    def duration(self) -> float:
        return self.end_hour - self.start_hour


@dataclass
class DayLog:
    """Represents one day's ELD log sheet."""
    date_offset: int          # 0 = day 1, 1 = day 2, etc.
    activities: List[Activity] = field(default_factory=list)
    total_miles: float = 0.0
    from_location: str = ''
    to_location: str = ''

    def hours_by_status(self):
        totals = {'OFF': 0.0, 'SB': 0.0, 'D': 0.0, 'ON': 0.0}
        for act in self.activities:
            totals[act.duty_status] += act.duration
        return totals

    def total_on_duty_hours(self):
        h = self.hours_by_status()
        return h['D'] + h['ON']


@dataclass
class Stop:
    """A stop on the route shown on the map."""
    location: str
    lat: float
    lng: float
    stop_type: str            # 'pickup', 'dropoff', 'fuel', 'rest', 'start'
    arrival_day: int
    arrival_hour: float
    duration_hours: float
    notes: str = ''


class HOSCalculator:
    # HOS constants
    MAX_DRIVE_PER_DAY = 11.0        # hours
    ON_DUTY_WINDOW = 14.0           # hours from first on-duty
    REQUIRED_BREAK_AFTER = 8.0      # hours of driving before mandatory 30-min break
    MANDATORY_BREAK = 0.5           # hours
    DAILY_OFF_DUTY_RESET = 10.0     # hours off-duty before new 14-hr window
    CYCLE_HOURS = 70.0              # max on-duty in 8 days
    FUEL_INTERVAL_MILES = 1000.0    # fuel stop every 1000 miles
    FUEL_STOP_DURATION = 0.5        # hours
    PICKUP_DROPOFF_DURATION = 1.0   # hours
    PRE_POST_TRIP = 0.5             # hours for pre/post trip inspection
    START_HOUR = 6.0                # default start of day (6 AM)

    def __init__(self, segments, current_cycle_used: float = 0.0):
        """
        segments: list of dicts with keys:
          - from_name, to_name, from_lat, from_lng, to_lat, to_lng
          - distance_miles, duration_hours
        current_cycle_used: hours already used in current 8-day cycle
        """
        self.segments = segments
        self.current_cycle_used = current_cycle_used
        self.day_logs: List[DayLog] = []
        self.stops: List[Stop] = []

    def calculate(self) -> dict:
        """
        Main entrypoint. Returns dict with day_logs and stops.
        """
        # Build a flat list of "events" to process
        events = self._build_events()
        self._simulate(events)
        return {
            'day_logs': [self._serialize_day(d) for d in self.day_logs],
            'stops': [self._serialize_stop(s) for s in self.stops],
            'total_days': len(self.day_logs),
        }

    def _build_events(self):
        """
        Build ordered list of events:
        (type, location_name, lat, lng, miles_from_prev, drive_hours_from_prev)
        """
        events = []
        # Segment 0: current → pickup  (on-duty driving)
        # Segment 1: pickup → dropoff  (on-duty driving)
        seg_types = ['pickup', 'dropoff']
        for i, seg in enumerate(self.segments):
            events.append({
                'type': 'drive',
                'from_name': seg['from_name'],
                'to_name': seg['to_name'],
                'from_lat': seg['from_lat'],
                'from_lng': seg['from_lng'],
                'to_lat': seg['to_lat'],
                'to_lng': seg['to_lng'],
                'distance_miles': seg['distance_miles'],
                'drive_hours': seg['duration_hours'],
                'end_event': seg_types[i],
            })
        return events

    def _simulate(self, events):
        """Drive through events applying HOS rules."""
        # State
        day = 0
        hour = self.START_HOUR             # current clock hour within day
        drive_hours_today = 0.0
        drive_since_break = 0.0            # hours driven since last 30-min break
        window_start = self.START_HOUR     # when first on-duty today started
        cycle_used = self.current_cycle_used
        miles_since_fuel = 0.0
        current_log = DayLog(date_offset=day)
        current_location = self.segments[0]['from_name']
        current_lat = self.segments[0]['from_lat']
        current_lng = self.segments[0]['from_lng']
        self.day_logs = [current_log]

        # Add start stop
        self.stops.append(Stop(
            location=current_location,
            lat=current_lat,
            lng=current_lng,
            stop_type='start',
            arrival_day=day,
            arrival_hour=hour,
            duration_hours=0,
            notes='Trip start'
        ))

        # Pre-trip inspection (ON duty, not driving)
        hour, current_log = self._add_activity(
            current_log, 'ON', hour, hour + self.PRE_POST_TRIP,
            current_location, 'Pre-trip inspection'
        )
        drive_hours_today += 0
        window_start = hour - self.PRE_POST_TRIP  # window started at pre-trip

        for event in events:
            remaining_drive = event['drive_hours']
            remaining_miles = event['distance_miles']
            to_name = event['to_name']
            to_lat = event['to_lat']
            to_lng = event['to_lng']

            while remaining_drive > 0:
                # Check if mandatory 30-min break is needed before driving more
                if drive_since_break >= self.REQUIRED_BREAK_AFTER:
                    hour, current_log = self._add_activity(
                        current_log, 'OFF', hour, hour + self.MANDATORY_BREAK,
                        current_location, '30-min mandatory rest break'
                    )
                    drive_since_break = 0.0
                    self.stops.append(Stop(
                        location=current_location,
                        lat=current_lat, lng=current_lng,
                        stop_type='rest',
                        arrival_day=current_log.date_offset,
                        arrival_hour=hour - self.MANDATORY_BREAK,
                        duration_hours=self.MANDATORY_BREAK,
                        notes='30-min mandatory break'
                    ))

                # Fueling check
                if miles_since_fuel >= self.FUEL_INTERVAL_MILES:
                    hour, current_log = self._add_activity(
                        current_log, 'ON', hour, hour + self.FUEL_STOP_DURATION,
                        current_location, 'Fueling stop'
                    )
                    miles_since_fuel = 0.0
                    self.stops.append(Stop(
                        location=current_location,
                        lat=current_lat, lng=current_lng,
                        stop_type='fuel',
                        arrival_day=current_log.date_offset,
                        arrival_hour=hour - self.FUEL_STOP_DURATION,
                        duration_hours=self.FUEL_STOP_DURATION,
                        notes='Fuel stop'
                    ))

                # How many hours can we drive before hitting a limit?
                drive_remaining_in_window = self.ON_DUTY_WINDOW - (hour - window_start)
                drive_left_today = self.MAX_DRIVE_PER_DAY - drive_hours_today
                drive_to_next_break = self.REQUIRED_BREAK_AFTER - drive_since_break
                drive_to_fuel = max(0, self.FUEL_INTERVAL_MILES - miles_since_fuel) / max(remaining_miles / remaining_drive, 0.001)

                can_drive = min(
                    remaining_drive,
                    drive_left_today,
                    drive_remaining_in_window,
                    drive_to_next_break,
                    drive_to_fuel if drive_to_fuel > 0 else remaining_drive
                )
                can_drive = max(can_drive, 0.001)

                # Calculate miles for this driving block
                speed = remaining_miles / remaining_drive if remaining_drive > 0 else 0
                miles_driven = speed * can_drive

                # Drive!
                hour, current_log = self._add_activity(
                    current_log, 'D', hour, hour + can_drive,
                    current_location, f'Driving toward {to_name}'
                )
                current_log.total_miles += miles_driven
                drive_hours_today += can_drive
                drive_since_break += can_drive
                miles_since_fuel += miles_driven
                remaining_drive -= can_drive
                remaining_miles -= miles_driven

                # Update current position (interpolate for intermediate stops)
                frac = 1 - (remaining_drive / event['drive_hours']) if event['drive_hours'] > 0 else 1
                current_lat = event['from_lat'] + frac * (to_lat - event['from_lat'])
                current_lng = event['from_lng'] + frac * (to_lng - event['from_lng'])

                if remaining_drive <= 0.001:
                    break

                # Need a reset — are we out of daily drive, window, or both?
                needs_reset = (
                    drive_hours_today >= self.MAX_DRIVE_PER_DAY - 0.05 or
                    (hour - window_start) >= self.ON_DUTY_WINDOW - 0.05
                )
                if needs_reset:
                    # Post-trip, then off-duty / sleeper berth for 10 hrs
                    hour, current_log = self._add_activity(
                        current_log, 'ON', hour, hour + self.PRE_POST_TRIP,
                        current_location, 'Post-trip inspection'
                    )
                    # Sleep in sleeper berth for remainder
                    sleep_start = hour
                    sleep_end = sleep_start + self.DAILY_OFF_DUTY_RESET

                    if sleep_end <= 24.0:
                        current_log = self._add_activity(
                            current_log, 'SB', sleep_start, sleep_end,
                            current_location, 'Sleeper berth'
                        )[1]
                        # New day
                        day += 1
                        hour = sleep_end - 24 if sleep_end > 24 else sleep_end
                        # reset
                        current_log = DayLog(
                            date_offset=day,
                            from_location=current_location
                        )
                        self.day_logs.append(current_log)
                    else:
                        # Spans midnight
                        remaining_tonight = 24.0 - sleep_start
                        current_log = self._add_activity(
                            current_log, 'SB', sleep_start, 24.0,
                            current_location, 'Sleeper berth'
                        )[1]
                        day += 1
                        remaining_sleep = self.DAILY_OFF_DUTY_RESET - remaining_tonight
                        current_log = DayLog(
                            date_offset=day,
                            from_location=current_location
                        )
                        self.day_logs.append(current_log)
                        hour, current_log = self._add_activity(
                            current_log, 'SB', 0.0, remaining_sleep,
                            current_location, 'Sleeper berth'
                        )

                    self.stops.append(Stop(
                        location=current_location,
                        lat=current_lat, lng=current_lng,
                        stop_type='rest',
                        arrival_day=current_log.date_offset - 1,
                        arrival_hour=sleep_start,
                        duration_hours=self.DAILY_OFF_DUTY_RESET,
                        notes='10-hr mandatory rest (sleeper berth)'
                    ))

                    # Reset daily counters
                    drive_hours_today = 0.0
                    drive_since_break = 0.0
                    window_start = hour
                    cycle_used += self.total_on_duty_today(current_log)

                    # Pre-trip for new day
                    hour, current_log = self._add_activity(
                        current_log, 'ON', hour, hour + self.PRE_POST_TRIP,
                        current_location, 'Pre-trip inspection'
                    )

            # Arrived at destination of this segment
            current_location = to_name
            current_lat = to_lat
            current_lng = to_lng

            if event['end_event'] in ('pickup', 'dropoff'):
                label = 'Pickup — loading freight' if event['end_event'] == 'pickup' else 'Dropoff — unloading freight'
                hour, current_log = self._add_activity(
                    current_log, 'ON', hour, hour + self.PICKUP_DROPOFF_DURATION,
                    current_location, label
                )
                self.stops.append(Stop(
                    location=current_location,
                    lat=to_lat, lng=to_lng,
                    stop_type=event['end_event'],
                    arrival_day=current_log.date_offset,
                    arrival_hour=hour - self.PICKUP_DROPOFF_DURATION,
                    duration_hours=self.PICKUP_DROPOFF_DURATION,
                    notes=label
                ))

        # Post-trip at end of trip
        hour, current_log = self._add_activity(
            current_log, 'ON', hour, min(hour + self.PRE_POST_TRIP, 24.0),
            current_location, 'Post-trip inspection'
        )
        # Final rest / off-duty
        if hour < 24.0:
            off_end = 24.0
            hour, current_log = self._add_activity(
                current_log, 'OFF', hour, off_end,
                current_location, 'Off duty'
            )

        # Set from/to on logs
        for i, log in enumerate(self.day_logs):
            if not log.from_location and i > 0:
                log.from_location = self.day_logs[i-1].to_location or ''

    def total_on_duty_today(self, log: DayLog) -> float:
        h = log.hours_by_status()
        return h['D'] + h['ON']

    def _add_activity(self, log: DayLog, status: str, start: float, end: float,
                      location: str, remark: str):
        """Add an activity to the log. Returns (new_hour, log)."""
        end = min(end, 24.0)
        if end <= start:
            return start, log
        act = Activity(
            duty_status=status,
            start_hour=start,
            end_hour=end,
            location=location,
            remark=remark
        )
        log.activities.append(act)
        return end, log

    def _serialize_day(self, day: DayLog) -> dict:
        h = day.hours_by_status()
        return {
            'date_offset': day.date_offset,
            'total_miles': round(day.total_miles, 1),
            'from_location': day.from_location,
            'to_location': day.to_location,
            'hours_off_duty': round(h['OFF'], 2),
            'hours_sleeper': round(h['SB'], 2),
            'hours_driving': round(h['D'], 2),
            'hours_on_duty': round(h['ON'], 2),
            'activities': [
                {
                    'duty_status': a.duty_status,
                    'start_hour': round(a.start_hour, 4),
                    'end_hour': round(a.end_hour, 4),
                    'location': a.location,
                    'remark': a.remark,
                }
                for a in day.activities
            ]
        }

    def _serialize_stop(self, stop: Stop) -> dict:
        return {
            'location': stop.location,
            'lat': stop.lat,
            'lng': stop.lng,
            'stop_type': stop.stop_type,
            'arrival_day': stop.arrival_day,
            'arrival_hour': round(stop.arrival_hour, 2),
            'duration_hours': round(stop.duration_hours, 2),
            'notes': stop.notes,
        }
