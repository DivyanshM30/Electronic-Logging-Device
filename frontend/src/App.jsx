import { useState, lazy, Suspense } from 'react';
import axios from 'axios';
import InputForm from './components/InputForm';
import TripSummary from './components/TripSummary';
import ELDLogSheet from './components/ELDLogSheet';

const MapView = lazy(() => import('./components/MapView'));

const API_BASE = 'http://localhost:8000/api';
const TAB_MAP = 'map';
const TAB_LOGS = 'logs';

function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tripData, setTripData] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_MAP);
  const [selectedDay, setSelectedDay] = useState(0);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    setTripData(null);
    try {
      const res = await axios.post(`${API_BASE}/trip/plan`, formData, { timeout: 30000 });
      setTripData(res.data);
      setActiveTab(TAB_MAP);
      setSelectedDay(0);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Planning failed. Is the server running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const dayLogs = tripData?.hos?.day_logs || [];

  return (
    <div className="app-wrapper">

      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 6v4h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <div className="app-title">Spotter ELD</div>
            <div className="app-subtitle">Trip Planner &amp; Log Generator</div>
          </div>
        </div>
        <div className="header-badge">FMCSA HOS Compliant</div>
      </header>

      {/* ── MAIN ── */}
      <div className="app-main">

        {/* Sidebar */}
        <aside className="sidebar">
          <InputForm onSubmit={handleSubmit} loading={loading} />

          {error && (
            <div className="error-banner animate-in">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {tripData && <TripSummary tripData={tripData} />}
          
          <div style={{ marginTop: 'auto', paddingTop: '24px', paddingBottom: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-dim)', letterSpacing: '0.02em' }}>
            Created by <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>Divyansh Mishra</span>
          </div>
        </aside>

        {/* Content */}
        <main className="content-area">

          {/* ── EMPTY STATE ── */}
          {!tripData && !loading && (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <div className="empty-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                </div>
              </div>
              <div className="empty-title">Ready to Plan Your Trip</div>
              <div className="empty-desc">
                Enter your trip details on the left to generate a compliant route plan with interactive map and ELD daily log sheets.
              </div>
              <div className="empty-features">
                {[
                  {
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>,
                    label: 'Route Map'
                  },
                  {
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
                    label: 'ELD Logs'
                  },
                  {
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
                    label: 'HOS Schedule'
                  },
                ].map(f => (
                  <div className="empty-feature" key={f.label}>
                    <div className="empty-feature-icon">{f.icon}</div>
                    <div className="empty-feature-label">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOADING STATE ── */}
          {loading && (
            <div className="empty-state">
              <div className="loading-state">
                <div className="loading-ring" />
                <div>
                  <div className="loading-text">Calculating route &amp; HOS schedule</div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                    <div className="loading-dots">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── RESULT TABS ── */}
          {tripData && !loading && (
            <>
              {/* Tab bar */}
              <div className="tabs-wrapper">
                <div className="tabs">
                  <button
                    id="tab-map"
                    className={`tab-btn ${activeTab === TAB_MAP ? 'active' : ''}`}
                    onClick={() => setActiveTab(TAB_MAP)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                    Route Map
                  </button>
                  <button
                    id="tab-logs"
                    className={`tab-btn ${activeTab === TAB_LOGS ? 'active' : ''}`}
                    onClick={() => setActiveTab(TAB_LOGS)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="3" y1="15" x2="21" y2="15"/>
                      <line x1="9" y1="3" x2="9" y2="21"/>
                    </svg>
                    ELD Logs
                    <span className="tab-badge">{dayLogs.length}</span>
                  </button>
                </div>
              </div>

              {/* Map tab */}
              {activeTab === TAB_MAP && (
                <div className="map-container" style={{ flex: 1 }}>
                  <Suspense fallback={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.85rem', gap: '10px' }}>
                      <div className="spinner" />
                      Loading map...
                    </div>
                  }>
                    <MapView tripData={tripData} />
                  </Suspense>
                </div>
              )}

              {/* ELD logs tab */}
              {activeTab === TAB_LOGS && (
                <div className="eld-area">
                  <div className="eld-header">
                    <div>
                      <div className="eld-title">
                        ELD Daily Log Sheets
                        <span style={{ color: 'var(--color-primary)', marginLeft: '8px' }}>({dayLogs.length} day{dayLogs.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: '3px', fontFamily: 'var(--font-heading)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        FMCSA Driver&apos;s Daily Log Format
                      </div>
                    </div>
                  </div>

                  {/* Day pills */}
                  <div className="day-pills">
                    {dayLogs.map((_, i) => (
                      <button
                        key={i}
                        id={`day-pill-${i}`}
                        className={`day-pill ${selectedDay === i ? 'active' : ''}`}
                        onClick={() => setSelectedDay(i)}
                      >
                        Day {i + 1}
                      </button>
                    ))}
                    <button
                      id="show-all-logs"
                      className={`day-pill ${selectedDay === -1 ? 'active' : ''}`}
                      onClick={() => setSelectedDay(-1)}
                    >
                      All Days
                    </button>
                  </div>

                  {/* Log sheets */}
                  <div className="eld-days">
                    {(selectedDay === -1 ? dayLogs : [dayLogs[selectedDay]]).map((day, relIdx) => {
                      const absoluteDay = selectedDay === -1 ? relIdx : selectedDay;
                      return (
                        <div key={absoluteDay} className="animate-in">
                          <div className="day-log-header">
                            <div className="day-log-label">Day {absoluteDay + 1}</div>
                            <div className="day-log-meta">
                              <div className="day-log-meta-item">
                                <div className="day-log-meta-dot" style={{ background: '#22C55E' }} />
                                <span>{Math.round(day.total_miles)} mi</span>
                              </div>
                              <div className="day-log-meta-item">
                                <div className="day-log-meta-dot" style={{ background: '#3B82F6' }} />
                                <span>Drive: {fmtHours(day.hours_driving)}</span>
                              </div>
                              <div className="day-log-meta-item">
                                <div className="day-log-meta-dot" style={{ background: '#F97316' }} />
                                <span>On-Duty: {fmtHours(day.hours_on_duty)}</span>
                              </div>
                              <div className="day-log-meta-item">
                                <div className="day-log-meta-dot" style={{ background: '#475569' }} />
                                <span>Off: {fmtHours(day.hours_off_duty + day.hours_sleeper)}</span>
                              </div>
                            </div>
                          </div>
                          <ELDLogSheet
                            dayLog={day}
                            dayNumber={absoluteDay}
                            startDate={new Date().toISOString()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
