import { useState } from 'react';

const SAMPLE_TRIPS = [
  { label: 'Chicago → LA',      current: 'Chicago, IL',    pickup: 'Chicago, IL',       dropoff: 'Los Angeles, CA', cycle: 20 },
  { label: 'Green Bay → STL',   current: 'Green Bay, WI',  pickup: 'Green Bay, WI',     dropoff: 'St. Louis, MO',   cycle: 0  },
  { label: 'NYC → Dallas',      current: 'New York, NY',   pickup: 'Philadelphia, PA',  dropoff: 'Dallas, TX',      cycle: 35 },
];

const HOS_RULES = [
  'Property-carrying driver',
  '70 hr / 8-day cycle',
  '11-hr daily drive limit',
  '14-hr on-duty window',
  '30-min break after 8 hrs',
  '10-hr off-duty reset',
  '1 hr pickup & dropoff',
  'Fuel every 1,000 mi',
];

const MapPinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const BoxIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  </svg>
);

const FlagIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

const fields = [
  { name: 'current_location',  label: 'Current Location',       placeholder: 'e.g. Chicago, IL',        icon: <MapPinIcon />, color: '#22C55E', hint: null },
  { name: 'pickup_location',   label: 'Pickup Location',         placeholder: 'e.g. Milwaukee, WI',      icon: <BoxIcon />,    color: '#F97316', hint: null },
  { name: 'dropoff_location',  label: 'Dropoff Location',        placeholder: 'e.g. St. Louis, MO',      icon: <FlagIcon />,   color: '#3B82F6', hint: null },
  { name: 'current_cycle_used', label: 'Current Cycle Used (hrs)', placeholder: '0 – 70  (default: 0)', icon: <ClockIcon />,  color: '#8B5CF6', hint: 'Hours used in your current 70 hr / 8-day cycle' },
];

export default function InputForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const loadSample = (s) => {
    setForm({
      current_location:  s.current,
      pickup_location:   s.pickup,
      dropoff_location:  s.dropoff,
      current_cycle_used: String(s.cycle),
    });
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!form.current_location.trim())  errs.current_location  = 'Required';
    if (!form.pickup_location.trim())   errs.pickup_location   = 'Required';
    if (!form.dropoff_location.trim())  errs.dropoff_location  = 'Required';
    const cycle = parseFloat(form.current_cycle_used);
    if (form.current_cycle_used !== '' && (isNaN(cycle) || cycle < 0 || cycle > 70)) {
      errs.current_cycle_used = 'Must be 0 – 70';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit({ ...form, current_cycle_used: parseFloat(form.current_cycle_used) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Quick Examples ── */}
      <div className="card">
        <div className="card-title">
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          Quick Examples
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          {SAMPLE_TRIPS.map(s => (
            <button
              key={s.label}
              type="button"
              className="quick-trip-btn"
              onClick={() => loadSample(s)}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Trip Details ── */}
      <div className="card">
        <div className="card-title">
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          Trip Details
        </div>

        {fields.map(f => (
          <div className="form-group" key={f.name}>
            <label className="form-label" htmlFor={f.name}>
              <span style={{ color: f.color, display: 'flex', alignItems: 'center' }}>{f.icon}</span>
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type={f.name === 'current_cycle_used' ? 'number' : 'text'}
              {...(f.name === 'current_cycle_used' ? { min: 0, max: 70, step: 0.5 } : {})}
              className={`form-input${errors[f.name] ? ' error' : ''}`}
              placeholder={f.placeholder}
              value={form[f.name]}
              onChange={handleChange}
              autoComplete="off"
              style={errors[f.name] ? { borderColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
            />
            {f.hint && !errors[f.name] && (
              <span className="form-hint">{f.hint}</span>
            )}
            {errors[f.name] && (
              <span className="form-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errors[f.name]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── HOS Assumptions ── */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="card-title" style={{ marginBottom: '10px' }}>
          <div className="card-title-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          FMCSA HOS Assumptions
        </div>
        <ul className="hos-list">
          {HOS_RULES.map(r => (
            <li key={r} className="hos-item">
              <span className="hos-check">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        className="btn btn-primary"
        id="plan-trip-btn"
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="spinner" />
            Planning Route...
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
            Plan Trip &amp; Generate Logs
          </>
        )}
      </button>
    </form>
  );
}
