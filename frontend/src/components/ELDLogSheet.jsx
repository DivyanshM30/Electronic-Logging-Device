import { useEffect, useRef } from 'react';

/**
 * ELDLogSheet — renders a single day's paper ELD log using HTML Canvas.
 * Matches the standard FMCSA Driver's Daily Log format.
 */

const STATUS_ROW = {
  OFF: 0,  // Off Duty — row 1
  SB: 1,   // Sleeper Berth — row 2
  D: 2,    // Driving — row 3
  ON: 3,   // On Duty (not driving) — row 4
};

const STATUS_COLORS = {
  OFF: '#374151',
  SB:  '#1D4ED8',
  D:   '#059669',
  ON:  '#D97706',
};

const STATUS_LABELS = {
  OFF: '1. Off Duty',
  SB:  '2. Sleeper Berth',
  D:   '3. Driving',
  ON:  '4. On Duty (Not Driving)',
};

const CANVAS_W = 900;
const CANVAS_H = 480;

// Grid layout constants
const GRID_LEFT = 180;
const GRID_RIGHT = CANVAS_W - 24;
const GRID_TOP = 160;
const GRID_ROW_H = 36;
const GRID_ROWS = 4;
const GRID_BOTTOM = GRID_TOP + GRID_ROWS * GRID_ROW_H;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const HOURS = 24;

function hourToX(hour) {
  return GRID_LEFT + (hour / HOURS) * GRID_W;
}

export default function ELDLogSheet({ dayLog, dayNumber, startDate }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dayLog) return;
    const ctx = canvas.getContext('2d');
    draw(ctx, dayLog, dayNumber, startDate);
  }, [dayLog, dayNumber, startDate]);

  return (
    <div className="eld-sheet-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </div>
  );
}

function draw(ctx, dayLog, dayNumber, startDate) {
  const dpr = 1;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Header ──────────────────────────────────────────────────────────────
  drawHeader(ctx, dayLog, dayNumber, startDate);

  // ── Grid background ──────────────────────────────────────────────────────
  drawGridBackground(ctx);

  // ── Hour labels ──────────────────────────────────────────────────────────
  drawHourLabels(ctx);

  // ── Row labels ───────────────────────────────────────────────────────────
  drawRowLabels(ctx);

  // ── Grid lines ───────────────────────────────────────────────────────────
  drawGridLines(ctx);

  // ── Activity bars ─────────────────────────────────────────────────────────
  if (dayLog.activities && dayLog.activities.length > 0) {
    drawActivities(ctx, dayLog.activities);
  }

  // ── Summary boxes ────────────────────────────────────────────────────────
  drawSummary(ctx, dayLog);

  // ── Remarks section ──────────────────────────────────────────────────────
  drawRemarks(ctx, dayLog);

  // ── Totals row ───────────────────────────────────────────────────────────
  drawTotals(ctx, dayLog);
}

function drawHeader(ctx, dayLog, dayNumber, startDate) {
  // Title
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px "Fira Code", monospace';
  ctx.textAlign = 'left';
  ctx.fillText("Driver's Daily Log", 16, 22);

  ctx.font = '10px "Fira Sans", sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('(24 Hours)', 16, 35);

  // Day label
  ctx.font = 'bold 12px "Fira Code", monospace';
  ctx.fillStyle = '#1D4ED8';
  ctx.textAlign = 'right';
  ctx.fillText(`Day ${dayNumber + 1}`, CANVAS_W - 16, 22);

  // Date line
  const dateStr = startDate
    ? formatDate(startDate, dayNumber)
    : `Day ${dayNumber + 1}`;

  ctx.fillStyle = '#374151';
  ctx.font = '11px "Fira Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Date: ${dateStr}`, GRID_LEFT, 22);

  // Carrier / location info
  const info = [
    `From: ${dayLog.from_location || '—'}`,
    `Total Miles: ${dayLog.total_miles || 0}`,
  ];
  info.forEach((text, i) => {
    ctx.fillStyle = '#374151';
    ctx.font = '10.5px "Fira Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, GRID_LEFT, 38 + i * 13);
  });

  // Horizontal divider
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 65);
  ctx.lineTo(CANVAS_W - 8, 65);
  ctx.stroke();

  // Hours of service label above grid
  ctx.font = 'bold 9px "Fira Sans", sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.fillText('HOURS OF SERVICE GRID', (GRID_LEFT + GRID_RIGHT) / 2, 80);
}

function drawGridBackground(ctx) {
  // Alternating hour columns
  for (let h = 0; h < HOURS; h++) {
    const x = hourToX(h);
    const w = GRID_W / HOURS;
    ctx.fillStyle = h % 2 === 0 ? '#F9FAFB' : '#F3F4F6';
    ctx.fillRect(x, GRID_TOP, w, GRID_ROWS * GRID_ROW_H);
  }
}

function drawHourLabels(ctx) {
  const labels = [
    'Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
    'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Mid'
  ];
  ctx.font = 'bold 9px "Fira Sans", sans-serif';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';

  for (let i = 0; i <= HOURS; i++) {
    const x = hourToX(i);
    ctx.fillText(labels[i], x, GRID_TOP - 8);
    // Tick mark
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP - 3);
    ctx.lineTo(x, GRID_TOP);
    ctx.stroke();
  }

  // 15-min ticks
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 0.4;
  for (let h = 0; h < HOURS; h++) {
    for (let q = 1; q < 4; q++) {
      const x = hourToX(h + q / 4);
      ctx.beginPath();
      ctx.moveTo(x, GRID_TOP);
      ctx.lineTo(x, GRID_TOP + 4);
      ctx.stroke();
    }
  }
}

function drawRowLabels(ctx) {
  const labels = [
    { key: 'OFF', label: '1. Off Duty' },
    { key: 'SB',  label: '2. Sleeper Berth' },
    { key: 'D',   label: '3. Driving' },
    { key: 'ON',  label: '4. On Duty\n(Not Driving)' },
  ];

  labels.forEach(({ key, label }, i) => {
    const y = GRID_TOP + i * GRID_ROW_H + GRID_ROW_H / 2;

    // Color swatch
    ctx.fillStyle = STATUS_COLORS[key];
    ctx.fillRect(8, GRID_TOP + i * GRID_ROW_H + 4, 4, GRID_ROW_H - 8);

    // Label text
    ctx.fillStyle = '#374151';
    ctx.font = '9.5px "Fira Sans", sans-serif';
    ctx.textAlign = 'right';

    const parts = label.split('\n');
    if (parts.length === 1) {
      ctx.fillText(label, GRID_LEFT - 8, y + 3);
    } else {
      ctx.fillText(parts[0], GRID_LEFT - 8, y - 3);
      ctx.fillText(parts[1], GRID_LEFT - 8, y + 9);
    }
  });
}

function drawGridLines(ctx) {
  // Outer border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(GRID_LEFT, GRID_TOP, GRID_W, GRID_ROWS * GRID_ROW_H);

  // Row dividers
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  for (let r = 1; r < GRID_ROWS; r++) {
    const y = GRID_TOP + r * GRID_ROW_H;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, y);
    ctx.lineTo(GRID_RIGHT, y);
    ctx.stroke();
  }

  // Hour column dividers
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 0.7;
  for (let h = 1; h < HOURS; h++) {
    const x = hourToX(h);
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_BOTTOM);
    ctx.stroke();
  }

  // Half-hour marks (slightly longer inside)
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 0.5;
  for (let h = 0; h < HOURS; h++) {
    const x = hourToX(h + 0.5);
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_BOTTOM);
    ctx.stroke();
  }
}

function drawActivities(ctx, activities) {
  activities.forEach(act => {
    const rowIdx = STATUS_ROW[act.duty_status];
    if (rowIdx === undefined) return;

    const x1 = hourToX(act.start_hour);
    const x2 = hourToX(act.end_hour);
    const y = GRID_TOP + rowIdx * GRID_ROW_H;
    const barH = GRID_ROW_H;

    // Fill
    const col = STATUS_COLORS[act.duty_status];
    ctx.fillStyle = col + '33'; // 20% opacity fill
    ctx.fillRect(x1, y, x2 - x1, barH);

    // Top bold line — the ELD "line" across the row
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y + barH / 2);
    ctx.lineTo(x2, y + barH / 2);
    ctx.stroke();

    // Vertical tick at start
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y + 4);
    ctx.lineTo(x1, y + barH - 4);
    ctx.stroke();

    // Vertical tick at end
    ctx.beginPath();
    ctx.moveTo(x2, y + 4);
    ctx.lineTo(x2, y + barH - 4);
    ctx.stroke();

    // Bracket notation for short stops (not driving + under 1hr)
    if (act.duty_status !== 'D' && (act.end_hour - act.start_hour) <= 1) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      // Bottom bracket
      ctx.beginPath();
      ctx.moveTo(x1, y + barH - 6);
      ctx.lineTo(x1, y + barH - 2);
      ctx.lineTo(x2, y + barH - 2);
      ctx.lineTo(x2, y + barH - 6);
      ctx.stroke();
    }

    // Status change diagonal notch at transitions
    if (act.duty_status === 'D' || act.duty_status === 'ON') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y + barH - 2);
      ctx.lineTo(x1 + 4, y + 2);
      ctx.stroke();
    }
  });

  // Draw connecting vertical lines between status changes
  for (let i = 1; i < activities.length; i++) {
    const prev = activities[i - 1];
    const curr = activities[i];
    if (Math.abs(prev.end_hour - curr.start_hour) < 0.01) {
      const x = hourToX(curr.start_hour);
      const prevRow = STATUS_ROW[prev.duty_status];
      const currRow = STATUS_ROW[curr.duty_status];
      const y1 = GRID_TOP + prevRow * GRID_ROW_H + GRID_ROW_H / 2;
      const y2 = GRID_TOP + currRow * GRID_ROW_H + GRID_ROW_H / 2;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
  }
}

function drawSummary(ctx, dayLog) {
  const summaryX = CANVAS_W - 120;
  const summaryY = GRID_TOP;
  const colW = 96;

  // Total hours header
  ctx.font = 'bold 8.5px "Fira Sans", sans-serif';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.fillText('Total Hours', summaryX + colW / 2, summaryY - 6);

  const statuses = ['OFF', 'SB', 'D', 'ON'];
  const vals = {
    OFF: dayLog.hours_off_duty || 0,
    SB:  dayLog.hours_sleeper || 0,
    D:   dayLog.hours_driving || 0,
    ON:  dayLog.hours_on_duty || 0,
  };

  statuses.forEach((s, i) => {
    const y = summaryY + i * GRID_ROW_H;
    const h = GRID_ROW_H;

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.strokeRect(summaryX, y, colW, h);

    ctx.font = 'bold 14px "Fira Code", monospace';
    ctx.fillStyle = STATUS_COLORS[s];
    ctx.textAlign = 'center';
    ctx.fillText(fmtHours(vals[s]), summaryX + colW / 2, y + h / 2 + 5);
  });
}

function drawRemarks(ctx, dayLog) {
  const remarkY = GRID_BOTTOM + 14;

  ctx.font = 'bold 9px "Fira Sans", sans-serif';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'left';
  ctx.fillText('Remarks:', 8, remarkY);

  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 0.5;

  const activities = dayLog.activities || [];
  const changes = activities.filter(a =>
    a.remark && a.remark.trim().length > 0
  );

  const maxRemarks = 6;
  const shown = changes.slice(0, maxRemarks);

  shown.forEach((act, i) => {
    const y = remarkY + 14 + i * 13;
    const timeStr = formatHour(act.start_hour);
    const statusLabel = act.duty_status;

    ctx.font = '8.5px "Fira Code", monospace';
    ctx.fillStyle = STATUS_COLORS[act.duty_status] || '#374151';
    ctx.fillText(`${timeStr} [${statusLabel}]`, 8, y);

    ctx.font = '8.5px "Fira Sans", sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText(`${act.location} — ${act.remark}`, 90, y);

    // Underline
    ctx.beginPath();
    ctx.moveTo(8, y + 2);
    ctx.lineTo(GRID_LEFT - 8, y + 2);
    ctx.stroke();
  });

  if (changes.length > maxRemarks) {
    ctx.font = 'italic 8px "Fira Sans", sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(`...and ${changes.length - maxRemarks} more entries`, 8, remarkY + 14 + maxRemarks * 13);
  }
}

function drawTotals(ctx, dayLog) {
  const totalY = CANVAS_H - 28;
  const h = dayLog.hours_driving || 0;
  const od = dayLog.hours_on_duty || 0;
  const totalOnDuty = h + od;

  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(GRID_LEFT, totalY - 12, GRID_W, 22);
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(GRID_LEFT, totalY - 12, GRID_W, 22);

  ctx.font = '9px "Fira Sans", sans-serif';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Total On-Duty (Drive + On-Duty Not Driving): ${fmtHours(totalOnDuty)} hrs   |   Driving: ${fmtHours(h)} hrs   |   Miles: ${dayLog.total_miles || 0}`,
    GRID_LEFT + 8,
    totalY + 3
  );
}

function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

function formatHour(h) {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHr = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHr}:${mins.toString().padStart(2, '0')} ${period}`;
}

function formatDate(startDate, offset) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
