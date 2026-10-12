// Talks to the Pages Function in functions/api/. If there is no API (running the
// files locally, or no KV namespace bound yet) everything here fails quietly and
// the site keeps working without a worldwide count or leaderboard.
const BASE = '/api';
const MAX_PENDING = 1000;
let offline = false;
let pending = load();

function load() {
  try { return Math.min(MAX_PENDING, parseInt(localStorage.getItem('bbg.pending') || '0', 10) || 0); } catch { return 0; }
}
function save() { try { localStorage.setItem('bbg.pending', String(pending)); } catch {} }

export function isOffline() { return offline; }

export async function getStats() {
  try {
    const r = await fetch(`${BASE}/stats`, { cache: 'no-store' });
    if (!r.ok) throw new Error('bad status');
    const j = await r.json();
    if (j.offline) throw new Error('offline');
    offline = false;
    return j;
  } catch {
    offline = true;
    return null;
  }
}

export function queueOpen(n) {
  pending = Math.min(MAX_PENDING, pending + n);
  save();
  if (pending >= 10) flush();
}

export async function flush(beacon = false) {
  if (pending <= 0 || offline) return null;
  const n = pending;
  pending = 0; save();
  const body = JSON.stringify({ n });
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(`${BASE}/open`, new Blob([body], { type: 'application/json' }));
    return null;
  }
  try {
    const r = await fetch(`${BASE}/open`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (!r.ok) throw new Error('bad status');
    const j = await r.json();
    if (j.offline) throw new Error('offline');
    return j.total;
  } catch {
    pending = Math.min(MAX_PENDING, pending + n); save();
    offline = true;
    return null;
  }
}

export async function submitScore(name, depth, today = 0, day = '') {
  try {
    const r = await fetch(`${BASE}/score`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, depth, today, day }),
    });
    if (!r.ok) throw new Error('bad status');
    const j = await r.json();
    if (j.offline) throw new Error('offline');
    return j;
  } catch {
    return null;
  }
}

setInterval(() => flush(), 15000);
addEventListener('pagehide', () => flush(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
