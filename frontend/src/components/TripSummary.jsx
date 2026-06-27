const STOP_COLORS = {
  start:   '#22C55E',
  pickup:  '#F97316',
  dropoff: '#3B82F6',
  fuel:    '#F59E0B',
  rest:    '#8B5CF6',
};

const STOP_LABELS = {
  start:   'Trip Start',
  pickup:  'Pickup',
  dropoff: 'Dropoff',
  fuel:    'Fuel Stop',
  rest:    'Rest Break',
};

const STOP_ICONS = {
  start: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  pickup: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    </svg>
  ),
  dropoff: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>
    </svg>
  ),
  fuel: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 22V7l6-4 6 4v15"/><path d="M3 11h12M15 11l3-3 3 3v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2"/>
    </svg>
  ),
  rest: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 12h4l3-8 4 16 3-8h4"/>
    </svg>
  ),
};

function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatHour(h) {
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHr = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHr}:${mins.toString().padStart(2, '0')} ${period}`;
}

const DUTY_BADGE_STYLES = {
  OFF: { color: '#94A3B8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' },
  SB:  { color: '#60A5FA', background: 'rgba(96,165,250,0.1)',  border: '1px solid rgba(96,165,250,0.2)'  },
  D:   { color: '#4ADE80', background: 'rgba(74,222,128,0.1)',  border: '1px solid rgba(74,222,128,0.2)'  },
  ON:  { color: '#FB923C', background: 'rgba(251,146,60,0.1)',  border: '1px solid rgba(251,146,60,0.2)'  },
};

export default function TripSummary({ tripData }) {
  if (!tripData) return null;
  const { trip, hos, inputs } = tripData;

  const totalDrivingHrs = hos.day_logs.reduce((s, d) => s + (d.hours_driving || 0), 0);
  const totalOnDutyHrs  = hos.day_logs.reduce((s, d) => s + (d.hours_driving || 0) + (d.hours_on_duty || 0), 0);

  const statCards = [
    { value: Math.round(trip.total_distance_miles), unit: 'mi',       label: 'Total Miles',   cls: 'accent',  color: '#F97316', accentClass: 'accent-orange' },
    { value: hos.total_days,                        unit: ' days',    label: 'Days Required', cls: 'primary', color: '#3B82F6', accentClass: 'accent-blue'   },
    { value: fmtHours(totalDrivingHrs),             unit: '',         label: 'Drive Time',    cls: 'success', color: '#22C55E', accentClass: 'accent-green'  },
    { value: fmtHours(totalOnDutyHrs),              unit: '',         label: 'Total On-Duty', cls: '',        color: '#94A3B8', accentClass: 'accent-gray'   },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Route Summary ── */}
      <div className="card animate-in">
        <div className="card-title">
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </div>
          Route Summary
        </div>

        <div className="stats-grid">
          {statCards.map(s => (
            <div className={`stat-card ${s.accentClass}`} key={s.label}>
              <span className={`stat-value ${s.cls}`} style={s.cls === '' ? { color: s.color } : {}}>
                {s.value}<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{s.unit}</span>
              </span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Route breadcrumb */}
        <div className="route-path">
          <span className="route-node start">{inputs.current_location}</span>
          {trip.segments.map((seg, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg className="route-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              <span className={`route-node ${i === trip.segments.length - 1 ? 'dropoff' : 'pickup'}`}>
                {seg.to_name}
              </span>
              <span className="route-miles">({Math.round(seg.distance_miles)} mi)</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Stop Timeline ── */}
      <div className="card animate-in" style={{ animationDelay: '50ms' }}>
        <div className="card-title">
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          Stop Timeline
        </div>

        <div className="stop-list">
          {hos.stops.map((stop, i) => (
            <div key={i} className="stop-item">
              <div
                className={`stop-dot ${stop.stop_type}`}
                style={{ color: STOP_COLORS[stop.stop_type] }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill={STOP_COLORS[stop.stop_type]}>
                  <circle cx="12" cy="12" r="6"/>
                </svg>
              </div>
              <div className="stop-info">
                <div className="stop-name">{stop.location}</div>
                <div className="stop-meta">
                  <span className="stop-tag" style={{ color: STOP_COLORS[stop.stop_type] }}>
                    {STOP_LABELS[stop.stop_type]}
                  </span>
                  {' · '}Day {stop.arrival_day + 1}, {formatHour(stop.arrival_hour)}
                  {stop.duration_hours > 0 && (
                    <span style={{ color: 'var(--color-text-dim)' }}>{' · '}{fmtHours(stop.duration_hours)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily HOS Breakdown ── */}
      <div className="card animate-in" style={{ animationDelay: '100ms' }}>
        <div className="card-title">
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          Daily HOS Breakdown
        </div>

        {hos.day_logs.map((day, i) => {
          const totalOD = day.hours_driving + day.hours_on_duty;
          const pct = Math.min(100, (totalOD / 14) * 100);
          const gradColor = pct > 90
            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
            : pct > 70
              ? 'linear-gradient(90deg, #F59E0B, #D97706)'
              : 'linear-gradient(90deg, #22C55E, #16A34A)';

          return (
            <div className="day-breakdown" key={i}>
              <div className="day-breakdown-header">
                <span className="day-breakdown-title">Day {i + 1}</span>
                <span className="day-breakdown-miles">{Math.round(day.total_miles)} mi</span>
              </div>
              <div className="duty-badges">
                {[
                  { key: 'OFF', val: day.hours_off_duty },
                  { key: 'SB',  val: day.hours_sleeper },
                  { key: 'D',   val: day.hours_driving },
                  { key: 'ON',  val: day.hours_on_duty },
                ].map(b => (
                  <span key={b.key} className="duty-badge" style={DUTY_BADGE_STYLES[b.key]}>
                    {b.key} {fmtHours(b.val)}
                  </span>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`, background: gradColor }} />
              </div>
              <div className="progress-label">
                {fmtHours(totalOD)} / 14 hr on-duty window ({Math.round(pct)}%)
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
