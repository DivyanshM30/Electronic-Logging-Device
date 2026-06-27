import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

// SVG shapes per stop type
const STOP_SHAPES = {
  start:   `<circle cx="10" cy="10" r="5" fill="currentColor"/>`,
  pickup:  `<path d="M10 3l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>`,
  dropoff: `<rect x="5" y="5" width="10" height="10" fill="currentColor" rx="1"/>`,
  fuel:    `<path d="M5 18V7l4-3 4 3v11M5 11h8M13 11l2-2 2 2v4a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>`,
  rest:    `<path d="M4 12h3l2-5 3 11 2-6h4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>`,
};

function createMarker(stopType) {
  const color = STOP_COLORS[stopType] || '#94A3B8';
  const shape = STOP_SHAPES[stopType] || STOP_SHAPES.start;
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
      ">
        <!-- Outer glow ring -->
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: ${color}20;
          animation: marker-pulse 2.5s ease-in-out infinite;
        "></div>
        <!-- Main circle -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${color}ee, ${color}99);
          border: 2.5px solid white;
          box-shadow: 0 2px 12px ${color}66, 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 20 20" style="color:white">
            ${shape}
          </svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

function buildPopup(stop) {
  const color = STOP_COLORS[stop.stop_type] || '#94A3B8';
  const label = STOP_LABELS[stop.stop_type] || stop.stop_type;
  const timeStr = formatHour(stop.arrival_hour);
  const dur = stop.duration_hours > 0 ? fmtHours(stop.duration_hours) : null;

  return `
    <div style="
      font-family: Inter, -apple-system, sans-serif;
      min-width: 200px;
      padding: 0;
      overflow: hidden;
      border-radius: 12px;
    ">
      <!-- Header strip -->
      <div style="
        background: linear-gradient(135deg, ${color}33, ${color}18);
        border-bottom: 1px solid ${color}30;
        padding: 10px 14px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
          flex-shrink: 0;
        "></div>
        <div>
          <div style="
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: ${color};
          ">${label} · Day ${stop.arrival_day + 1}</div>
        </div>
      </div>
      <!-- Body -->
      <div style="padding: 10px 14px 12px;">
        <div style="
          font-size: 13px;
          font-weight: 700;
          color: #F1F5F9;
          margin-bottom: 8px;
          line-height: 1.3;
        ">${stop.location}</div>
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94A3B8;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span>Arrive: </span>
            <span style="color: #CBD5E1; font-weight: 600;">${timeStr}</span>
          </div>
          ${dur ? `
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94A3B8;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            <span>Duration: </span>
            <span style="color: #CBD5E1; font-weight: 600;">${dur}</span>
          </div>` : ''}
          ${stop.notes ? `
          <div style="
            margin-top: 4px;
            font-size: 10.5px;
            color: #64748B;
            padding: 5px 8px;
            background: rgba(255,255,255,0.04);
            border-radius: 6px;
            border-left: 2px solid ${color}60;
            line-height: 1.5;
          ">${stop.notes}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

export default function MapView({ tripData }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef      = useRef([]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile — Carto dark matter
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control (bottom-right)
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: '© <a href="https://carto.com">CartoDB</a> © <a href="https://www.openstreetmap.org">OSM</a>' }).addTo(map);

    // Add marker pulse keyframe
    const style = document.createElement('style');
    style.textContent = `
      @keyframes marker-pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0; transform: scale(1.8); }
      }
    `;
    document.head.appendChild(style);

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Draw layers on data change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tripData) return;

    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const { trip, hos } = tripData;
    const allBounds = [];

    // Background glow line (full route)
    if (trip.full_geometry?.length > 1) {
      const glow = L.polyline(trip.full_geometry, {
        color: '#3B82F6',
        weight: 8,
        opacity: 0.08,
      }).addTo(map);
      layersRef.current.push(glow);
    }

    // Route segments with distinct colors
    const routeColors = ['#3B82F6', '#F97316'];
    if (trip.segments) {
      trip.segments.forEach((seg, idx) => {
        if (!seg.geometry?.length > 1) return;

        // Shadow line
        const shadow = L.polyline(seg.geometry, {
          color: '#000',
          weight: 7,
          opacity: 0.35,
        }).addTo(map);
        layersRef.current.push(shadow);

        // Main colored line
        const line = L.polyline(seg.geometry, {
          color: routeColors[idx] || '#3B82F6',
          weight: 4.5,
          opacity: 0.92,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);
        layersRef.current.push(line);

        seg.geometry.forEach(c => allBounds.push(c));
      });
    }

    // Stop markers
    if (hos?.stops) {
      hos.stops.forEach(stop => {
        if (!stop.lat || !stop.lng) return;
        const icon = createMarker(stop.stop_type);
        const marker = L.marker([stop.lat, stop.lng], { icon })
          .bindPopup(buildPopup(stop), {
            maxWidth: 240,
            className: 'spotter-popup',
          })
          .addTo(map);
        layersRef.current.push(marker);
        allBounds.push([stop.lat, stop.lng]);
      });
    }

    if (allBounds.length > 0) {
      map.fitBounds(allBounds, { padding: [48, 48] });
    }
  }, [tripData]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} />
  );
}

function formatHour(h) {
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHr = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHr}:${mins.toString().padStart(2, '0')} ${period}`;
}

function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
