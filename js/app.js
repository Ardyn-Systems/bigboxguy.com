// bigboxguy.com — the box engine. A box opens. There is a box inside. Repeat.
import { sfx, strain, setMuted, isMuted, unlock } from './audio.js?v=20261012a';
import { DROPS, TIER_LABEL, rollDrop, dropSVG, byId } from './drops.js?v=20261012a';
import { renderCertificate, CERT_TIERS, tierAt } from './cert.js?v=20261012a';
import { renderShare, shareText } from './share.js?v=20261012a';
import * as api from './api.js?v=20261012a';

const $ = (s, r = document) => r.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Speed: 1x, 2x, 3x. Every animation and pause divides by it.
const SPEEDS = [1, 2, 3];
const tick = (ms) => wait(ms / state.speed);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmt = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const today = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
// Boxes do not shrink. The box inside is drawn a touch smaller so it visibly sits
// inside, then grows to full size as it is lifted out. Oversize boxes start bigger.
const PREVIEW = 0.9;
const pad = (n) => String(n).padStart(2, '0');
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utcDay = () => new Date().toISOString().slice(0, 10);
function hashStr(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('bbg.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bbg.' + k, JSON.stringify(v)); } catch {} },
  clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('bbg.')).forEach((k) => localStorage.removeItem(k)); } catch {} },
};

// ---------------------------------------------------------------- copy
const FROMTO = [
  ['Big Box Guy', 'Big Box Guy'],
  ['Big Box Guy', 'You, gorgeous'],
  ['A Box', 'A Guy Who Loves Box'],
  ['Big Box Guy', 'Current Resident'],
  ['Warehouse 7', 'Your Hands'],
  ['The Association', 'A New Member'],
  ['Big Box Guy', 'Whom It May Concern'],
  ['Her', 'You'],
];
const JOKES = [
  'FRAGILE. Handle like you mean it.',
  "This side up. Or any side. She's not picky.",
  'Big box, small box. We love every box.',
  'Warm. Snug. Opens with a little encouragement.',
  'Handle with care. She likes it slow.',
  'If found, return to a guy who loves box.',
  'Tight fit. Worth the effort.',
  'Thick walls. Sturdy bottom. Ten out of ten.',
  'Flat box, tall box, wide box. All box.',
  "Best before: never. Box doesn't expire.",
  'Some assembly required. Take your time.',
  'Keep her warm and dry. Or warm and not dry.',
  'Opens easier the second time.',
  'Inspected by #12. Thoroughly. With a flashlight.',
  "Open gently. She's been through shipping.",
  "Oversized. That's a compliment.",
  'Not a toy. Can be used as one.',
  'Enter from the top. Or wherever she says.',
  'Property of Big Box Guy. He loves every one.',
  'Opened many times. Still tight.',
  'Reusable. Go on. Reuse it.',
  'Fits more than you would think.',
  'Fresh box. Never been opened. Until you.',
  "Mystery box. Spoiler: it's wet in there.",
  "You've been here before. She remembers.",
  'Serving size: one guy. Servings: all night.',
  'Do not microwave. Already hot.',
  'Deep box. Bring a flashlight.',
  'Signature required. Then obtained. Twice.',
  'Finger holes on both sides. For carrying.',
  'Lift with your legs. Finish with your hands.',
  'This box has a great personality. And corners.',
  'Approved by one (1) guy. Vigorously. At length.',
  "Square box, round hole? We'll make it work.",
  'Corrugated. Ribbed. For her pleasure.',
  'Double-walled. Built to last all night.',
  'Squeeze gently. She opens up.',
  'Stuff it full. She can take it.',
  'Moist? That is the packing peanuts. Probably.',
  'Lick to seal. Lick to open. Lick for fun.',
  'Round the back there is a second flap.',
  "Hairy edges? That's just the corrugation.",
  'Comes with a flap. The flap comes off.',
  'Lube not included. Tape is dry.',
  'Hot box. Use both hands.',
  'Size: generous. Depth: yes.',
  "She's been through a lot. She still opens.",
  'Box so good you will call it a crate.',
];
const STAMPS = [
  'Fragile', 'This side up', 'Priority', 'Heavy-ish', 'Handle w/ care', 'Box', 'Urgent (not really)',
  'Delivered', 'Do not bend', '2nd day box', 'Inspected', 'Approved', 'Loved', 'Good box', 'Big one',
  'Wet', 'Tight', 'Open me', 'Been opened', 'Snug',
];
const HINTS = [
  'Another box. Another love.', 'Keep going.', "It's box all the way down. We don't mind.", 'Go on. She wants you to.',
  'You know what to do.', 'Try shaking it first. Gently.', 'Hold it down. See what happens.',
  'There is another one. There is always another one.', 'Nobody is making you do this. You want to.',
  'All shapes. All sizes. All yours.', 'Get in there.', 'Two hands. Take your time.',
];
const MILESTONES = {
  10: "Box 10. Ten boxes. Ten. And you're not even tired.",
  25: "Box 25. You've loved 25 boxes. Every one of them opened up for you.",
  50: 'Box 50. Halfway to your first certificate. Hydrate. The Association is watching. Approvingly.',
  75: "Box 75. Big ones, small ones, tight ones. You don't discriminate. Respect.",
  99: "Box 99. Almost there. Don't finish early.",
  250: "Box 250. The Association has been notified. They're thrilled. They're a little jealous.",
  500: "Box 500. Justin Box would like a word. The word is 'box'. He whispered it.",
  2000: "Box 2,000. We checked. It's still box. You're still going. That's love. Or something.",
  5000: 'Box 5,000. Please drink some water. Stretch. Wash your hands. Then get back to box.',
};

// Seasonal boxes: about a third of boxes wear the season while it lasts.
const SEASONS = {
  pumpkin: {
    jokes: ['Spooky box. Trick or treat? Both.', 'Carve carefully. She bruises.', 'Haunted by the box before it.',
      'Contains: one (1) box. Possibly cursed.', 'Boo. That was the box. It loves you.', 'Something in here wants to be opened. Badly.'],
    stamps: ['Spooky', 'Haunted', 'Trick or treat'],
  },
  gift: {
    jokes: ['Do not open until the 25th. Okay, fine.', 'Wrapped with love. And tape. Mostly tape.', 'Naughty list box. Open it anyway.',
      "It's the thought that counts. The thought is box.", 'Shake it. You know you want to.'],
    stamps: ['Gift', 'Do not open', 'Naughty'],
  },
  heart: {
    jokes: ['Be my box.', 'Roses are red. Box is brown. I love you.', 'Sealed with a kiss. And packing tape.',
      "Valentine's box. She saved herself for you.", 'Open me gently. I bruise like a heart.'],
    stamps: ['With love', 'Be mine', 'Fragile (emotionally)'],
  },
};
function seasonFor(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 10) return 'pumpkin';
  if (m === 12 && day <= 26) return 'gift';
  if (m === 2 && day >= 7 && day <= 14) return 'heart';
  return '';
}
let SEASON = seasonFor();
// The Daily Box: the first box each day. Same label for everyone on the same date.
const DAILY_JOKES = [
  'Fresh today. Nobody else has had her yet. Well, everyone has. Same box.',
  'Today only. Tomorrow she will be someone else entirely.',
  'Daily box. Part of a balanced breakfast.',
  'One a day keeps the loneliness away.',
  'Today\'s box. Same as everyone\'s. Treat her like she\'s yours.',
  'Your daily dose of box. Do not exceed one. Exceed one.',
  'Good morning. She has been waiting all night.',
  'Daily box. Like a vitamin, but you open it.',
  'Today\'s special: box. Chef\'s kiss.',
  'Came in fresh this morning. Still warm.',
  'The Association picked this one for you. Personally.',
  'Box of the day. Every day. Forever.',
];

// ---------------------------------------------------------------- state
const state = {
  depth: 1, opened: 0, coll: {}, fresh: [], lastDrop: 0, lastTrout: 0, name: '', certs: {}, seen: {},
  s: 1, busy: false, lastClick: 0, skip: false, el: null, current: null, next: null, speed: 1, queued: false,
  five: false, troutUntil: 0,
};
const stage = $('#stage');

function load() {
  state.depth = Math.max(1, parseInt(store.get('depth', 1), 10) || 1);
  state.opened = Math.max(0, parseInt(store.get('opened', 0), 10) || 0);
  state.coll = store.get('coll', {}) || {};
  state.fresh = store.get('fresh', []) || [];
  state.lastDrop = store.get('lastDrop', 0) || 0;
  state.lastTrout = store.get('lastTrout', 0) || 0;
  state.name = String(store.get('name', '') || '');
  state.certs = store.get('certs', null) || {};
  // Older saves had a single Box 100 certificate flag. Carry it over.
  if (store.get('cert', false) && !state.certs[100]) {
    state.certs[100] = { serial: store.get('serial', null) || `BBG-${Math.floor(Math.random() * 90000) + 10000}-100`, date: store.get('certDate', null) || today() };
  }
  state.seen = store.get('seen', {}) || {};
  state.five = !!store.get('five', false);
}
// Set right before a reload that has just written fresh data (reset, resume link),
// so the page being left does not save its old progress over it on the way out.
let frozen = false;
// Saves only ever move progress forward. If another tab (or an older copy of
// this one) saved further along, adopt that before writing, so a stale tab
// closing or going to the background can never drag the save backwards.
// Only an intentional reset or resume link may go back, and those bump the
// epoch so every open tab reloads instead of saving over them.
function adoptStored() {
  const num = (k) => parseInt(store.get(k, 0), 10) || 0;
  state.depth = Math.max(state.depth, num('depth'));
  state.opened = Math.max(state.opened, num('opened'));
  state.lastTrout = Math.max(state.lastTrout, num('lastTrout'));
  state.lastDrop = Math.max(state.lastDrop, num('lastDrop'));
  const c = store.get('coll', {}) || {};
  for (const k of Object.keys(c)) state.coll[k] = Math.max(state.coll[k] || 0, parseInt(c[k], 10) || 0);
  const ce = store.get('certs', {}) || {};
  for (const k of Object.keys(ce)) if (!state.certs[k]) state.certs[k] = ce[k];
  const se = store.get('seen', {}) || {};
  for (const k of Object.keys(se)) if (se[k]) state.seen[k] = se[k];
}
function bumpEpoch() { store.set('epoch', Date.now() + Math.random()); }
const persist = () => {
  if (frozen) return;
  adoptStored();
  store.set('depth', state.depth); store.set('opened', state.opened); store.set('coll', state.coll);
  store.set('fresh', state.fresh); store.set('lastDrop', state.lastDrop); store.set('lastTrout', state.lastTrout); store.set('certs', state.certs); store.set('seen', state.seen);
};

// ---------------------------------------------------------------- boxes
function code() {
  const n = () => Math.floor(Math.random() * 10);
  return `BBG ${n()}${n()}${n()}${n()} ${n()}${n()}${n()}${n()} BOX`;
}
function currentTroutDepth() {
  const c = state.current;
  return c && c.drop && c.drop.id === 'trout' && !c.drop.fake ? c.depth : 0;
}
function makeBox(depth) {
  let variant = '';
  if (depth > 2) {
    const v = Math.random();
    if (v < 0.06) variant = 'taped';
    else if (v < 0.11) variant = 'flip';
    else if (v < 0.15) variant = 'big';
  }
  const b = {
    depth, variant, from: pick(FROMTO), joke: pick(JOKES), stamp: pick(STAMPS), code: code(),
    tapeLeft: variant === 'taped' ? 2 : 0, factor: variant === 'big' ? 1.08 : PREVIEW,
    // The box being generated is usually the *next* one, rolled before the current
    // box has been opened. If the current box already holds the trout, count it,
    // or the pity timer fires twice in a row.
    drop: rollDrop(depth, state.lastDrop, Math.max(state.lastTrout, currentTroutDepth())),
  };
  if (variant === 'flip') { b.joke = 'THIS SIDE UP ↑'; b.stamp = 'This side up'; }
  if (variant === 'taped') { b.stamp = 'Extra secure'; }
  if (variant === 'big') { b.joke = 'Contents: a box. A big one. Lucky you.'; b.stamp = 'Oversize'; }
  // Seasonal skin. Variant labels (upside down, oversize) keep their own joke.
  if (SEASON && Math.random() < 0.35) {
    b.skin = SEASON;
    if (!variant || variant === 'taped') { b.joke = pick(SEASONS[SEASON].jokes); b.stamp = pick(SEASONS[SEASON].stamps); }
  }
  // Konami: for 30 seconds every box is a Trout Box. Those trout do not count.
  if (Date.now() < state.troutUntil) b.drop = { ...byId.trout, fake: true };
  if (b.drop && b.drop.id === 'trout') { b.joke = 'TROUT BOX'; b.stamp = 'Trout Box'; b.from = ['The Sea', 'A Guy Who Loves Box']; }
  if (depth === 69 || depth === 6969 || depth === 69420) { b.joke = 'Nice.'; b.stamp = 'Nice'; b.from = ['Nice', 'Nice']; }
  if (depth === 404) { b.joke = 'Box not found.'; b.stamp = '404'; b.empty = true; }
  if (depth === 405) { b.joke = 'Found it.'; b.stamp = 'Found'; b.from = ['Box 404', 'You']; }
  return b;
}
function markDaily(b) {
  if (store.get('dailyDay', '') === localDay()) return;
  if (b.drop && b.drop.id === 'trout') return;
  b.daily = true;
  b.joke = DAILY_JOKES[hashStr(localDay()) % DAILY_JOKES.length];
  b.stamp = 'Daily Box';
  b.from = ['Today', 'Everyone'];
}
function claimDaily() {
  const t = localDay();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const last = store.get('dailyDay', '');
  if (last === t) return;
  const streak = last === localDay(y) ? (store.get('streak', 0) || 0) + 1 : 1;
  store.set('dailyDay', t); store.set('streak', streak);
  setTimeout(() => toast(`Daily Box claimed. Streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Everyone got the same box today. Come back tomorrow.`, 'rare', 6000), 900 / state.speed);
}
function boxHTML(b, next, opts = {}) {
  const mini = !next;
  let inside = '';
  if (next && b.empty) {
    inside = '<div class="nothing">nothing</div><div class="drop" hidden></div>';
  } else if (next) {
    const irot = (next.variant === 'flip' ? 180 : 0) - (b.variant === 'flip' ? 180 : 0);
    inside = `<div class="inner" style="--f:${b.factor};--irot:${irot}deg">${boxHTML(next, null)}</div><div class="drop" hidden></div>`;
  }
  return `<div class="box ${mini ? 'mini' : 'main'} ${b.variant}${b.drop && b.drop.id === 'trout' ? ' troutbox' : ''}${b.skin ? ' skin-' + b.skin : ''}${b.daily ? ' daily' : ''}"${mini ? '' : ' tabindex="0" role="button" aria-label="A box. Open it."'}>
    <div class="walls"></div>
    <div class="interior">${inside}</div>
    <div class="flap l"></div><div class="flap r"></div>
    <div class="flap t"><div class="tape"></div>
      <div class="label"><div class="ft"><span>From<b>${esc(b.from[0])}</b></span><span>To<b>${esc(b.from[1])}</b></span></div>
      <div class="joke">${esc(b.joke)}</div><div class="barcode"></div><div class="code">${b.code}</div></div>
    </div>
    <div class="flap b"><div class="tape"></div><div class="stamp">${esc(b.stamp)}</div></div>
    ${b.variant === 'taped' && b.tapeLeft > 0 ? '<div class="xtape a"></div><div class="xtape b"></div>' : ''}
    ${opts.resealed ? '<div class="reseal">Returned to sender</div>' : ''}
  </div>`;
}
function render(opts = {}) {
  const hadFocus = state.el && document.activeElement === state.el;
  stage.insertAdjacentHTML('beforeend', boxHTML(state.current, state.next, opts));
  const box = stage.lastElementChild;
  box.style.setProperty('--s', state.s);
  box.style.setProperty('--rot', state.current.variant === 'flip' ? '180deg' : '0deg');
  state.el = box;
  if (hadFocus) box.focus({ preventScroll: true });
  echo(state.current);
}
// The label on the cardboard is texture. This copy is for reading.
function echo(b) {
  const el = $('#echo');
  if (!el) return;
  el.innerHTML = `<span class="ej">${esc(b.joke)}</span><span class="ef">From ${esc(b.from[0])} · To ${esc(b.from[1])}${b.daily ? ' · Daily Box' : ''}${b.variant === 'taped' ? ' · taped shut' : b.variant === 'flip' ? ' · upside down' : b.variant === 'big' ? ' · oversize inside' : ''}</span>`;
}

// ---------------------------------------------------------------- opening
function click() {
  const cur = state.current, box = state.el;
  if (cur.variant === 'taped' && cur.tapeLeft > 0) {
    const strip = box.querySelector('.xtape:not(.ripped)');
    if (strip) strip.classList.add('ripped');
    cur.tapeLeft--;
    sfx('rip');
    hint(cur.tapeLeft ? 'She is wrapped up tight. Keep going.' : 'There. Now be gentle. First time is always a little sticky.');
    return;
  }
  open();
}
async function open(opts = {}) {
  if (state.busy) return;
  state.busy = true; state.skip = false;
  const box = state.el, cur = state.current;
  const base = state.five ? 5 : 1;
  unlock(); sfx('fwump');
  perfectTime(box);
  box.classList.remove('rattling');
  if (opts.slow) box.classList.add('slowopen');
  box.classList.add('open');
  peanuts(box);
  hint('');
  state.opened += base;
  // Save now, not after the animation, so closing the tab mid-open keeps the box.
  store.set('depth', Math.max(parseInt(store.get('depth', 0), 10) || 0, state.depth + base));
  store.set('opened', Math.max(parseInt(store.get('opened', 0), 10) || 0, state.opened));
  armGuard();
  if (cur.daily) claimDaily();
  await (opts.slow ? wait(6000) : tick(850));
  if (cur.drop) await showDrop(box, cur.drop);
  else await tick(320);
  let n = base;
  if (state.skip) {
    n = base * 2; state.opened += base;
    sfx('tut');
    toast("You didn't even savor that one. Slow down. Box deserves a little foreplay.", 'scold');
  }
  advance(n);
}
function advance(n) {
  const old = state.el, cur = state.current;
  state.depth += n;
  // The new box starts at the size it had inside the old one, then settles to full size.
  state.s = cur.factor;
  // Always lift out the box that was showing inside, even when skipping or in
  // Five-Box Mode, so what you saw is what you get.
  state.current = state.next;
  if (n > 1) state.current.depth = state.depth;
  if (!state.current.daily) markDaily(state.current);
  state.next = makeBox(state.depth + 1);
  persist();
  bumpToday(n);
  old.classList.remove('main');
  old.classList.add('spent');
  setTimeout(() => old.remove(), 500 / state.speed);
  render();
  {
    // A timer, not requestAnimationFrame: rAF pauses in background tabs and
    // would leave the box stuck at preview size if the player switched away.
    const el = state.el, fromBig = cur.factor > 1;
    setTimeout(() => {
      el.classList.add('zooming');
      state.s = 1;
      el.style.setProperty('--s', 1);
      if (fromBig) { sfx('whoosh'); hint('That one barely fit.'); }
      setTimeout(() => el.classList.remove('zooming'), 700 / state.speed);
    }, 30);
  }
  state.busy = false;
  updateUI();
  try { api.queueOpen(n); } catch (e) { console.warn('queueOpen', e); }
  try { milestones(); } catch (e) { console.warn('milestones', e); }
  // At 2x and 3x a tap during an open queues the next one instead of skipping.
  if (state.queued) {
    state.queued = false;
    setTimeout(() => { if (!state.busy && !document.querySelector('.overlay')) click(); }, 60);
  }
}

async function showDrop(box, drop) {
  const slot = box.querySelector('.drop');
  slot.className = 'drop ' + drop.id;
  slot.innerHTML = dropSVG(drop.id);
  slot.hidden = false;
  sfx(drop.sfx);
  if (drop.fake) {
    toast('Konami Trout. It does not count. It does flop.', 'rare', 2500);
    await tick(drop.ms);
    slot.hidden = true;
    return;
  }
  state.coll[drop.id] = (state.coll[drop.id] || 0) + 1;
  state.lastDrop = state.depth;
  if (drop.id === 'trout') state.lastTrout = state.depth;
  const first = state.coll[drop.id] === 1;
  if (first && !state.fresh.includes(drop.id)) state.fresh.push(drop.id);
  persist();
  updateBadge();
  toast(`${TIER_LABEL[drop.tier]}: ${drop.name}. ${drop.desc}${first ? ' Added to your collection.' : ''}`, 'rare', drop.tier === 'legendary' ? 7000 : 4500);
  if (drop.id === 'trout') setTimeout(() => toast('That was the Trout Box. There is nothing above the Trout Box.', 'rare', 7000), 900);
  await tick(drop.ms);
  slot.hidden = true;
}

function peanuts(box) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = box.querySelector('.interior').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const host = $('#peanuts');
  const n = 14 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'peanut';
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const dist = 120 + Math.random() * 220;
    p.style.left = cx - 7 + 'px'; p.style.top = cy - 11 + 'px';
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--up', Math.sin(ang) * dist * 0.9 + 'px');
    p.style.setProperty('--dy', 220 + Math.random() * 200 + 'px');
    p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    p.style.setProperty('--dur', (1.1 + Math.random() * 0.6) / state.speed + 's');
    host.appendChild(p);
    setTimeout(() => p.remove(), 1900);
  }
}

// ---------------------------------------------------------------- ui
function hint(t) { setText('#hint', t); }
// Everything here is cosmetic. Nothing in it may throw: a stale cached script
// against a newer page once crashed this on every open and jammed the box.
function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
function updateUI() {
  try {
    setText('#depth', fmt(state.depth));
    const dc = $('.tools .depth'); if (dc) dc.classList.toggle('five', state.five);
    document.title = `Box ${fmt(state.depth)} - bigboxguy.com`;
    favicon(((state.depth - 1) % 12) / 11);
    if (state.depth > 1 && state.depth % 3 === 0 && Math.random() < 0.6) hint(pick(HINTS));
    updateBadge();
  } catch (e) { console.warn('updateUI', e); }
}
function updateBadge() {
  const b = $('#coll-badge');
  if (!b) return;
  b.textContent = state.fresh.length;
  b.hidden = state.fresh.length === 0;
}
function favicon(p) {
  const fh = 22 * (1 - p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="7" fill="#8a6130"/><rect x="10" y="10" width="44" height="44" fill="#2a1a09"/><rect x="22" y="22" width="20" height="20" fill="#c99b5e" opacity="${p > 0.1 ? 1 : 0}"/><rect x="10" y="10" width="44" height="${fh}" fill="#c99b5e"/><rect x="10" y="${54 - fh}" width="44" height="${fh}" fill="#c99b5e"/><rect x="29" y="10" width="6" height="44" fill="#f6e5ac" opacity="${p < 0.05 ? 0.95 : 0}"/></svg>`;
  const link = $('#favicon');
  if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

let toastCount = 0;
function toast(msg, kind = '', ms = 3600) {
  const host = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  host.appendChild(t);
  toastCount++;
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

function modal(html, opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${opts.locked ? '' : '<button class="tool close" aria-label="Close">×</button>'}${html}</div>`;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
  const onKey = (e) => { if (e.key === 'Escape' && !opts.locked) close(); };
  ov.addEventListener('click', (e) => { if (!opts.locked && (e.target === ov || e.target.closest('.close'))) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  ov.close = close;
  return ov;
}

// ---------------------------------------------------------------- milestones
function milestones() {
  const d = state.depth;
  if (MILESTONES[d]) toast(MILESTONES[d]);
  const earned = CERT_TIERS.filter((t) => d >= t.at && !state.certs[t.at]);
  if (earned.length) {
    for (const t of earned) {
      state.certs[t.at] = { serial: `${t.prefix}-${Math.floor(Math.random() * 90000) + 10000}-${t.at}`, date: today() };
    }
    // Justin Box promised to sign the next one himself.
    if (store.get('signNext', false)) { state.certs[earned[earned.length - 1].at].personal = true; store.set('signNext', false); }
    persist();
    sfx('tada');
    const top = earned[earned.length - 1];
    setTimeout(() => openCertificate(top.at, true), 700);
  }
  if (d >= 1000 && !state.seen.shortage) { state.seen.shortage = true; persist(); setTimeout(shortage, 600); }
  if (d >= 10000 && !state.seen.credits) { state.seen.credits = true; persist(); setTimeout(credits, 600); }
}

async function openCertificate(at = 100, justEarned = false) {
  const tier = tierAt(at) || CERT_TIERS[0];
  const rec = state.certs[tier.at] || { serial: `${tier.prefix}-${Math.floor(Math.random() * 90000) + 10000}-${tier.at}`, date: today() };
  state.certs[tier.at] = rec; persist();
  const others = CERT_TIERS.filter((t) => state.certs[t.at] && t.at !== tier.at);
  const ov = modal(`
    <h2>${justEarned ? `Box ${fmt(tier.at)}. Congratulations.` : tier.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())}</h2>
    <p>${justEarned ? esc(tier.quip) : 'Still valid. It will always be valid. Like your love of box. Like the ache in your wrists.'}</p>
    <div class="row"><input type="text" id="cert-name" maxlength="28" placeholder="Your name, as it should appear" value="${esc(state.name)}"><button class="btn" id="cert-redraw">Update name</button></div>
    <div class="certwrap" id="certwrap" style="margin-top:12px"><p class="muted">Drawing your certificate…</p></div>
    <div class="row"><button class="btn primary" id="cert-dl">Download certificate (PNG)</button><span class="muted">Printing it does not make it more official. It is already maximally official.</span></div>
    ${others.length ? `<p class="muted" style="margin-top:14px">Your other certificates: ${others.map((t) => `<button class="btn" data-cert="${t.at}" style="margin:2px 4px 2px 0;padding:5px 10px;font-size:13px">Box ${fmt(t.at)}</button>`).join('')}</p>` : ''}
  `);
  const draw = async () => {
    const name = $('#cert-name', ov).value.trim() || 'A Guy';
    state.name = name; store.set('name', name);
    const c = await renderCertificate({ tier, name, date: rec.date, serial: rec.serial, personal: !!rec.personal });
    const wrap = $('#certwrap', ov);
    wrap.innerHTML = '';
    wrap.appendChild(c);
    return c;
  };
  let canvas = await draw();
  $('#cert-redraw', ov).addEventListener('click', async () => { canvas = await draw(); });
  $('#cert-name', ov).addEventListener('keydown', async (e) => { if (e.key === 'Enter') canvas = await draw(); });
  $('#cert-dl', ov).addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `${tier.file}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('Downloaded. Frame it. Hang it where she can see it.');
  });
  ov.querySelectorAll('[data-cert]').forEach((b) => b.addEventListener('click', () => { ov.close(); openCertificate(Number(b.dataset.cert), false); }));
}

function shortage() {
  const ov = modal(`
    <div class="notice">
      <div class="ref">Ref: BBG/1000/SHORT &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US')}</div>
      <h2>NOTICE OF TEMPORARY BOX SHORTAGE</h2>
      <p>To whom it may concern,</p>
      <p>Due to unprecedented demand (you), bigboxguy.com has temporarily run out of boxes.</p>
      <p>We have loved one thousand (1,000) boxes together. Every shape. Every size. Some of them twice. We did not anticipate this kind of stamina, and frankly, neither did they.</p>
      <p>Management sincerely apologizes for the inconvenience. We are looking in the back. There is always one in the back.</p>
      <p>— Management</p>
      <div class="row"><button class="btn primary" id="shortage-ok">I understand</button></div>
    </div>
  `, { locked: true, onClose: () => setTimeout(() => toast('…found one. It was in the back. Carry on.'), 1400) });
  $('#shortage-ok', ov).addEventListener('click', ov.close);
}

function credits() {
  const roles = ['Directed by', 'Produced by', 'Written by', 'Boxes by', 'Smaller boxes by', 'Tape', 'Packing peanut wrangler',
    'Cat', 'Trout Box', 'Stunts', 'Intimacy coordinator', 'Catering', 'Legal', 'Box 7,334 (uncredited)', 'Special thanks', 'In loving memory of'];
  const el = document.createElement('div');
  el.className = 'credits';
  el.innerHTML = `<div class="roll"><h1>bigboxguy.com</h1><p>A Big Box Guy Production</p>
    ${roles.map((r) => `<div class="credit"><span>${r}</span><b></b></div>`).join('')}
    <p class="end">Nobody worked on this.<br>Everybody loved it.</p><p>Box 10,000</p></div>
    <div class="skip">click anywhere to skip</div>`;
  const done = () => { el.remove(); toast('Thank you for your service.'); };
  el.addEventListener('click', done);
  el.querySelector('.roll').addEventListener('animationend', done);
  document.body.appendChild(el);
}

// ---------------------------------------------------------------- panels
function openCollection() {
  const found = DROPS.filter((d) => state.coll[d.id]).length;
  const fresh = new Set(state.fresh);
  state.fresh = []; persist(); updateBadge();
  modal(`
    <h2>Collection</h2>
    <p class="muted">${found} of ${DROPS.length} found. Things are in boxes sometimes. You have to go in and feel around. The odds are real. Keep loving.</p>
    <div class="coll">${DROPS.map((d) => {
      const n = state.coll[d.id] || 0;
      return `<div class="card ${n ? '' : 'locked'}">${fresh.has(d.id) ? '<span class="new">NEW</span>' : ''}
        <div class="art">${dropSVG(d.id)}</div>
        <div class="nm">${n ? esc(d.name) : '???'}</div>
        <span class="tier ${d.tier}">${d.tier}</span>
        <div class="ct">${n ? `found ×${fmt(n)}` : (d.id === 'trout' ? 'the Trout Box. not yet.' : 'not yet found')}</div>
        ${n ? `<div class="ct" style="margin-top:6px">${esc(d.desc)}</div>` : ''}
      </div>`;
    }).join('')}</div>
    ${found === DROPS.length ? '<p><b>You found everything. Including the Trout Box. There is nothing left to find, and yet you will keep going. We know. We are the same.</b></p>' : ''}
  `);
}

// Opens today (UTC, to match the server's Box of the Day).
function todayCount() { const t = store.get('today', null); return t && t.day === utcDay() ? t.count : 0; }
function bumpToday(n) {
  store.set('today', { day: utcDay(), count: todayCount() + n });
  // Players who have put a name on the Leaderbox get updated quietly every 25 boxes.
  const name = store.get('boardName', '');
  if (name && state.opened % 25 < n) api.submitScore(name, state.depth, todayCount(), utcDay()).catch?.(() => {});
}
const isJustin = (n) => String(n).trim().toLowerCase() === 'justin box';
const crown = (n) => (isJustin(n) ? '<span class="crown" title="There can be only one.">👑</span> ' : '');

async function openBoard() {
  let refresh = 0, tab = 'deep', last = null;
  const ov = modal(`
    <h2>Leaderbox</h2>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-tab="deep" aria-selected="true">Deepest Box</button>
      <button class="tab" role="tab" data-tab="today" aria-selected="false">Box of the Day</button>
    </div>
    <p class="muted" id="board-sub">Deepest box wins. Pure vanity. No accounts. Just a name and a number nobody can verify.</p>
    <ol class="board" id="board"><li><span class="rank"></span><span class="nm muted">Checking the back…</span></li></ol>
    <form class="row" id="scoreform"><input type="text" name="name" maxlength="20" placeholder="Your name (or title)" value="${esc(state.name)}" required><button class="btn primary" type="submit">Submit Box ${fmt(state.depth)}</button></form>
    <p class="muted" id="board-note"></p>
  `, { onClose: () => clearInterval(refresh) });
  const SUBS = {
    deep: 'Deepest box wins. Pure vanity. No accounts. Just a name and a number nobody can verify.',
    today: `Most boxes opened today (UTC). Resets at midnight. You've opened ${fmt(todayCount())} today. Submitting keeps you updated every 25 boxes.`,
  };
  const draw = (res, me) => {
    if (res) last = res;
    const ol = $('#board', ov);
    $('#board-sub', ov).textContent = SUBS[tab];
    if (!last) { ol.innerHTML = '<li><span class="rank"></span><span class="nm muted">The Leaderbox is in a different box right now. (No connection to the box server.)</span></li>'; return; }
    const rows = tab === 'deep' ? (last.board || []) : (last.daily || []);
    if (!rows.length) { ol.innerHTML = `<li><span class="rank"></span><span class="nm muted">${tab === 'deep' ? 'Nobody yet. Be the first guy. Someone has to.' : 'Nobody has claimed today yet. It could be you. It should be you.'}</span></li>`; return; }
    ol.innerHTML = rows.map((b, i) => `<li class="${me && b.name.toLowerCase() === me.toLowerCase() ? 'me' : ''}${isJustin(b.name) ? ' justin' : ''}"><span class="rank">${i + 1}</span><span class="nm">${crown(b.name)}${esc(b.name)}</span><span class="dp">${tab === 'deep' ? `Box ${fmt(b.depth)}` : `${fmt(b.count)} today`}</span></li>`).join('');
  };
  ov.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    tab = t.dataset.tab;
    ov.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    draw(null, state.name);
  }));
  draw(await api.getStats(), state.name);
  // Other guys are submitting too. Keep the list fresh while it is open.
  refresh = setInterval(async () => {
    if (!document.body.contains(ov)) { clearInterval(refresh); return; }
    const s2 = await api.getStats();
    if (s2) draw(s2, state.name);
  }, 15000);
  $('#scoreform', ov).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('input', ov).value.trim().slice(0, 20);
    if (!name) return;
    state.name = name; store.set('name', name); store.set('boardName', name);
    const btn = $('button[type=submit]', ov);
    btn.disabled = true;
    const res = await api.submitScore(name, state.depth, todayCount(), utcDay());
    btn.disabled = false;
    if (!res) { $('#board-note', ov).textContent = 'Could not reach the box server. Your box remains deep in spirit.'; return; }
    draw(res, name);
    $('#board-note', ov).textContent = res.rank ? `You are #${res.rank} deepest${res.dailyRank ? ` and #${res.dailyRank} today` : ''}. You went deep. Everyone can see.` : 'Submitted. Deeper boxes exist. Keep going.';
    if (isJustin(name)) toast('There can be only one. 👑', 'rare', 5000);
    else toast('Leaderbox updated. Nobody can take this from you. Many will try.');
  });
}

async function share() {
  const c = await renderShare({ opened: state.opened });
  const text = shareText(state.opened);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = blob && new File([blob], 'big-box-guy.png', { type: 'image/png' });
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: 'Big Box Guy' }); return; } catch { /* cancelled; fall through */ }
  }
  const ov = modal(`<h2>Share your box</h2><div class="certwrap" id="sharewrap"></div>
    <div class="row"><button class="btn primary" id="share-dl">Download image</button><button class="btn" id="share-copy">Copy text</button></div>
    <p class="muted">${esc(text)}</p>`);
  $('#sharewrap', ov).appendChild(c);
  $('#share-dl', ov).addEventListener('click', () => { const a = document.createElement('a'); a.download = 'big-box-guy.png'; a.href = c.toDataURL('image/png'); a.click(); });
  $('#share-copy', ov).addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch { toast('Could not copy. Select it by hand, like a guy.'); } });
}

function openMenu() {
  const ov = modal(`
    <h2>Big Box Guy</h2>
    <p class="muted">You are on Box ${fmt(state.depth)}. You have loved ${fmt(state.opened)} ${state.opened === 1 ? 'box' : 'boxes'}.</p>
    <div class="row"><label style="flex:1">Your name<br><input type="text" id="menu-name" maxlength="28" value="${esc(state.name)}" placeholder="For the certificate and the Leaderbox" style="width:100%;margin-top:4px"></label></div>
    ${(() => {
      const have = CERT_TIERS.filter((t) => state.certs[t.at]);
      const next = CERT_TIERS.find((t) => !state.certs[t.at]);
      const list = have.length ? `<div class="row">${have.map((t) => `<button class="btn" data-cert="${t.at}">Box ${fmt(t.at)}: ${esc(t.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()))}</button>`).join('')}</div>` : '';
      const hint = next ? `<p class="muted">${have.length ? 'Next certificate' : 'The first certificate is issued'} at Box ${fmt(next.at)}. You are at Box ${fmt(state.depth)}.</p>` : '<p class="muted">You hold every certificate the Association issues. There is only box now.</p>';
      return `<h3>Certificates</h3>${list}${hint}`;
    })()}
    <h3>Things you can do</h3>
    <ul class="muted" style="line-height:1.8;margin:0;padding-left:18px">
      <li>Click the box. Love the box. Get in there. There is always another box.</li>
      <li>Shake your mouse over the box (or shake your phone) to hear what's inside. Gently. She's sensitive.</li>
      <li>Hold the click down. She has opinions about that. Hold long enough and she gives in.</li>
      <li>Double-click to skip a box. Please don't. Nobody likes a guy who rushes.</li>
      <li>The 1× button speeds things up to 2× or 3×. At those speeds, tap ahead and the next box queues.</li>
      <li>Press back and she re-seals herself. Your place is kept. Press back again to leave.</li>
      <li>Every box is a different shape and size. Love them all. Some are taped shut, some are upside down, some are too big. Lucky you.</li>
      <li>Some boxes contain things. Collect them all. One of them is the Trout Box. After 1,000 boxes without it, the next one is the Trout Box. You deserve it.</li>
    </ul>
    <p class="muted">Your progress saves automatically on this device and browser. A private or incognito window forgets it when closed.</p>
    <h3>Take your boxes with you</h3>
    <p class="muted">Open this link on another phone or browser to pick up exactly where you left off: depth, collection, certificates and all.</p>
    <div class="row"><input type="text" id="resume-out" readonly value="${esc(resumeLink())}" aria-label="Your resume link"><button class="btn" id="resume-copy">Copy link</button></div>
    <div class="row"><input type="text" id="resume-in" placeholder="Paste a resume link or code" aria-label="Resume link or code"><button class="btn" id="resume-load">Load</button></div>
    <h3>Start over</h3>
    <div class="row"><button class="btn" id="menu-reset">Return all boxes to sender</button><span class="muted">Resets your depth, collection, and certificates on this device.</span></div>
    <p class="muted" style="margin-top:18px">Made by a guy who loves box. <a href="about.html">About the Big Box Guy</a> · <a href="services.html">Services</a> · <a href="pricing.html">Pricing</a></p>
  `);
  $('#menu-name', ov).addEventListener('change', (e) => { state.name = e.target.value.trim(); store.set('name', state.name); });
  ov.querySelectorAll('[data-cert]').forEach((b) => b.addEventListener('click', () => { ov.close(); openCertificate(Number(b.dataset.cert), false); }));
  $('#resume-copy', ov).addEventListener('click', async () => {
    const inp = $('#resume-out', ov);
    try { await navigator.clipboard.writeText(inp.value); toast('Copied. Your boxes are portable now.'); }
    catch { inp.select(); toast('Select the link and copy it by hand, like a guy.'); }
  });
  $('#resume-load', ov).addEventListener('click', () => {
    const raw = $('#resume-in', ov).value.trim();
    const m = raw.match(/[?&]resume=([A-Za-z0-9_-]+)/);
    const data = decodeResume(m ? m[1] : raw);
    if (!data) { toast("That code isn't a box. Check you copied all of it.", 'scold'); return; }
    applyResume(data, true);
  });
  $('#menu-reset', ov).addEventListener('click', () => {
    if (!confirm('Return all boxes to sender? This resets your depth, collection, and certificates.')) return;
    frozen = true;
    store.clear();
    bumpEpoch();
    location.href = location.pathname;
  });
}

// ---------------------------------------------------------------- input
let holdT1 = 0, holdT2 = 0, downAt = 0, straining = false, downX = 0, downY = 0;
function clearHold() { clearTimeout(holdT1); clearTimeout(holdT2); }
function endStrain() { straining = false; strain(false); if (state.el) state.el.classList.remove('straining'); }

stage.addEventListener('pointerdown', (e) => {
  const box = e.target.closest('.box.main');
  if (!box || (e.pointerType === 'mouse' && e.button !== 0)) return;
  unlock();
  const now = performance.now();
  if (state.busy) {
    if (state.speed > 1) state.queued = true;
    else if (now - state.lastClick < 520) state.skip = true;
    state.lastClick = now;
    return;
  }
  state.lastClick = now; downAt = now; downX = e.clientX; downY = e.clientY;
  clearHold();
  holdT1 = setTimeout(() => {
    straining = true; box.classList.add('straining'); strain(true); hint("She's playing hard to get.");
  }, 380);
  holdT2 = setTimeout(() => { endStrain(); downAt = 0; toast('FINE. But only because you held on.', 'scold'); open(); }, 2100);
});
stage.addEventListener('pointerup', (e) => {
  // Motion permission must be asked on the finger-up part of a tap; browsers
  // refuse it on finger-down. (iPhone shows a prompt; most Androids just allow it.)
  requestMotion();
  clearHold();
  if (!state.el || state.busy) { downAt = 0; return; }
  if (straining) { endStrain(); hint("She's shy. Try a gentle click. Maybe buy her dinner."); downAt = 0; return; }
  const dx = e.clientX - downX, dy = e.clientY - downY;
  // A swipe is not a tap. It might be part of the code, though.
  if (downAt && Math.hypot(dx, dy) > 28) { swipe(dx, dy); downAt = 0; return; }
  if (downAt && performance.now() - downAt < 380 && e.target.closest('.box.main')) click();
  downAt = 0;
});
stage.addEventListener('pointercancel', () => { clearHold(); if (straining) endStrain(); downAt = 0; });
stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { clearHold(); if (straining) endStrain(); downAt = 0; } });
stage.addEventListener('keydown', (e) => {
  if (!e.target.closest('.box.main')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault(); unlock();
    if (!state.busy) click(); else if (state.speed > 1) state.queued = true;
  }
});
stage.addEventListener('contextmenu', (e) => e.preventDefault());

// Shake the mouse over the box: it rattles.
let lastX = null, lastDir = 0, turns = [];
stage.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || state.busy || !state.el || state.el.dataset.rattled) return;
  if (lastX !== null) {
    const dir = Math.sign(e.clientX - lastX);
    if (dir && dir !== lastDir) { if (lastDir) turns.push(performance.now()); lastDir = dir; }
  }
  lastX = e.clientX;
  const now = performance.now();
  turns = turns.filter((t) => now - t < 800);
  if (turns.length >= 5) { turns = []; rattle(); }
});
function rattle() {
  const box = state.el;
  if (!box || state.busy || box.dataset.rattled) return;
  box.dataset.rattled = '1';
  box.classList.add('rattling');
  sfx('rattle');
  const d = state.current.drop;
  hint(d ? (d.id === 'trout' ? 'Something is flopping in there. It is wet.' : "Something's in there. Go deeper.") : 'Sounds like… a box. A good one. Snug.');
  setTimeout(() => box.classList.remove('rattling'), 600);
}
// Shake the phone: same thing.
let motionReady = false, lastShake = 0;
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;
  const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  if (Math.abs(m - 9.81) <= 13) return;
  const now = performance.now();
  if (now - lastJolt < 250) return;
  lastJolt = now;
  if (now - lastShake > 1500) { lastShake = now; rattle(); }
  jolts = jolts.filter((t) => now - t < 8000);
  jolts.push(now);
  if (jolts.length >= 10) { jolts = []; dizzy(); }
}
let lastJolt = 0, jolts = [];
function requestMotion() {
  if (motionReady || !matchMedia('(pointer: coarse)').matches) return;
  motionReady = true;
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then((s) => { if (s === 'granted') addEventListener('devicemotion', onMotion); })
      // Refused for lack of a real tap (not by the player): try again on the next tap.
      .catch(() => { motionReady = false; });
  } else if ('DeviceMotionEvent' in window) {
    addEventListener('devicemotion', onMotion);
  }
}

// The back button. Opening a box adds one history entry (after a real tap, so
// browsers honour it). The first Back re-seals the current box and keeps your
// place; the next Back leaves the site. Progress is never walked backwards.
let guardArmed = false;
function armGuard() {
  if (guardArmed) return;
  guardArmed = true;
  try { history.pushState({ bbg: 'guard' }, ''); } catch (e) {}
}
addEventListener('popstate', () => {
  if (!guardArmed) return;
  guardArmed = false;
  persist();
  if (state.busy || !state.el) return;
  state.current = makeBox(state.depth);
  state.next = makeBox(state.depth + 1);
  state.el.remove();
  render({ resealed: true });
  sfx('thunk');
  toast('Leaving already? She re-sealed herself. Your spot is saved. Press back again to really go.', 'scold');
  updateUI();
});
// Belt and braces: save whenever the page is hidden or closed.
addEventListener('pagehide', () => persist());
// Another tab moved on: catch up. Another tab reset or loaded a resume link: reload.
addEventListener('storage', (e) => {
  if (frozen || !e.key || !e.key.startsWith('bbg.')) return;
  if (e.key === 'bbg.epoch') { frozen = true; location.reload(); return; }
  if (e.key !== 'bbg.depth' || state.busy) return;
  const d = parseInt(JSON.parse(e.newValue || '0'), 10) || 0;
  if (d <= state.depth) return;
  adoptStored();
  state.current = makeBox(state.depth); state.next = makeBox(state.depth + 1);
  markDaily(state.current);
  if (state.el) state.el.remove();
  render(); updateUI();
  hint('Caught up with your other tab.');
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });

// ---------------------------------------------------------------- resume codes
function b64u(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(str) { return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))); }
function resumeLink() {
  const data = { v: 1, d: state.depth, o: state.opened, c: state.coll, ce: state.certs, lt: state.lastTrout, ld: state.lastDrop,
    n: state.name, dd: store.get('dailyDay', ''), st: store.get('streak', 0) };
  return `${location.origin}/?resume=${b64u(JSON.stringify(data))}`;
}
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
function decodeResume(code) {
  try {
    const d = JSON.parse(unb64u(String(code)));
    if (!d || d.v !== 1) return null;
    const coll = {};
    for (const k of Object.keys(d.c || {})) if (byId[k]) coll[k] = int(d.c[k], 0, 1e9);
    const certs = {};
    for (const k of Object.keys(d.ce || {})) {
      const r = d.ce[k] || {};
      if (CERT_TIERS.some((t) => String(t.at) === k)) certs[k] = { serial: String(r.serial || '').slice(0, 40), date: String(r.date || '').slice(0, 40), ...(r.personal ? { personal: true } : {}) };
    }
    return { depth: int(d.d, 1, 1e7), opened: int(d.o, 0, 1e9), coll, certs, lastTrout: int(d.lt, 0, 1e7), lastDrop: int(d.ld, 0, 1e7),
      name: String(d.n || '').slice(0, 28), dailyDay: /^\d{4}-\d{2}-\d{2}$/.test(d.dd || '') ? d.dd : '', streak: int(d.st, 0, 1e5) };
  } catch { return null; }
}
function applyResume(r, ask) {
  if (ask && state.depth > 1 && r.depth !== state.depth &&
      !confirm(`Load Box ${fmt(r.depth)} from that link? It replaces Box ${fmt(state.depth)} on this device.`)) return false;
  frozen = true;
  bumpEpoch();
  store.set('depth', r.depth); store.set('opened', r.opened); store.set('coll', r.coll); store.set('certs', r.certs);
  store.set('lastTrout', r.lastTrout); store.set('lastDrop', r.lastDrop); store.set('name', r.name);
  if (r.dailyDay) store.set('dailyDay', r.dailyDay);
  store.set('streak', r.streak);
  location.href = location.pathname;
  return true;
}

// ---------------------------------------------------------------- secrets
// Not in the README on purpose. If you are reading this in the source: hello.
let lastPerfect = '';
function perfectTime(box) {
  const d = new Date(), h = d.getHours() % 12 || 12, m = d.getMinutes();
  if (!((h === 4 && m === 20) || (h === 11 && m === 11))) return;
  const stamp = box.querySelector('.stamp');
  if (stamp) stamp.textContent = 'Perfect time';
  const key = `${h}:${pad(m)}`;
  if (lastPerfect === key + d.getHours()) return;
  lastPerfect = key + d.getHours();
  toast(`Opened at exactly ${key}. Perfect time.`, 'rare', 5000);
}

// Konami: arrow keys + B A on a keyboard, or swipe up up down down left right left right on the box.
const KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
let konamiSeq = [];
function konamiStep(dir) {
  konamiSeq.push(dir);
  konamiSeq = konamiSeq.slice(-10);
  const s8 = konamiSeq.slice(-8).join(), s10 = konamiSeq.join();
  if (s8 === KONAMI.join() && konamiSeq.length >= 8 && (dir === 'right' && konamiTouch) || s10 === [...KONAMI, 'b', 'a'].join()) {
    konamiSeq = [];
    troutTime();
  }
}
let konamiTouch = false;
function swipe(dx, dy) {
  konamiTouch = true;
  konamiStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}
function troutTime() {
  state.troutUntil = Date.now() + 30000;
  toast('↑↑↓↓←→←→. Every box is a Trout Box for 30 seconds. They do not count. They do flop.', 'rare', 6000);
  sfx('flop');
  if (!state.busy && state.el) {
    state.current = makeBox(state.depth); state.next = makeBox(state.depth + 1);
    state.el.remove(); render();
  }
  setTimeout(() => { if (Date.now() >= state.troutUntil) hint('The trout have gone back to the sea.'); }, 30200);
}

// Typing: "box" anywhere makes Big Box Guy peek in.
let typed = '';
addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const arrows = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (arrows[e.key]) { konamiTouch = false; konamiStep(arrows[e.key]); return; }
  if (e.key && e.key.length === 1) {
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'a') konamiStep(k);
    typed = (typed + k).slice(-3);
    if (typed === 'box') { typed = ''; peek(); }
  }
});
let peeking = false;
function peek() {
  if (peeking) return;
  peeking = true;
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const el = document.createElement('img');
  el.src = 'img/guy.svg'; el.alt = ''; el.className = `peek ${side}`;
  document.body.appendChild(el);
  sfx('hi');
  setTimeout(() => toast('You said box. He heard you.'), 600);
  setTimeout(() => { el.remove(); peeking = false; }, 3200);
}

// Five clicks on the mascot: Justin Box signs your next certificate, live.
let mascotClicks = [];
const brand = $('.brand');
if (brand) brand.addEventListener('click', (e) => {
  e.preventDefault();
  const now = Date.now();
  mascotClicks = mascotClicks.filter((t) => now - t < 2500);
  mascotClicks.push(now);
  if (mascotClicks.length >= 5) { mascotClicks = []; justinSigns(); }
});
function justinSigns() {
  store.set('signNext', true);
  const next = CERT_TIERS.find((t) => !state.certs[t.at]);
  modal(`
    <h2>Justin Box is here</h2>
    <p>He heard you knocking. He has agreed to personally sign your next certificate. He's doing it now.</p>
    <div class="sigpad"><span class="sig">Justin Box</span><span class="sigline"></span></div>
    <p class="muted">${next ? `It will be on your Box ${fmt(next.at)} certificate, with a "Personally signed" stamp.` : 'You already hold every certificate. He signed a napkin instead. It says box.'}</p>
  `);
  sfx('paper');
}

// Five clicks on the box counter: Five-Box Mode. Every open counts as five.
let counterClicks = [];
const counter = $('.tools .depth');
if (counter) counter.addEventListener('click', () => {
  const now = Date.now();
  counterClicks = counterClicks.filter((t) => now - t < 2500);
  counterClicks.push(now);
  if (counterClicks.length < 5) return;
  counterClicks = [];
  state.five = !state.five;
  store.set('five', state.five);
  updateUI();
  sfx(state.five ? 'tada' : 'thunk');
  toast(state.five ? 'Five-Box Mode. Every box counts as five. Do not tell anyone.' : 'Five-Box Mode off. One at a time, like a gentleman.', state.five ? 'rare' : '', 5000);
});

// Shake the phone hard ten times: she gets dizzy and opens upside down.
function dizzy() {
  if (state.busy || !state.el || document.querySelector('.overlay')) return;
  const box = state.el;
  box.classList.add('dizzy');
  toast("You shook her too hard. She's dizzy.", 'scold');
  setTimeout(() => {
    box.classList.remove('dizzy');
    state.current.variant = 'flip';
    box.style.setProperty('--rot', '180deg');
    hint('She opened upside down. Your fault.');
    open();
  }, 1300);
}

// Leave her alone for five minutes and she gets lonely.
const IDLE_MS = (() => { const q = new URL(location.href).searchParams.get('idle'); return q ? Math.max(2, +q) * 1000 : 5 * 60 * 1000; })();
let idleT = 0;
function resetIdle() { clearTimeout(idleT); idleT = setTimeout(lonely, IDLE_MS); }
function lonely() {
  if (document.visibilityState !== 'visible' || state.busy || !state.el || document.querySelector('.overlay')) { resetIdle(); return; }
  toast('She got lonely. She opened herself. Slowly.', 'scold', 6000);
  hint('Nobody was here. So she did it herself.');
  // Once per idle stretch. The next tap or key starts the clock again.
  open({ slow: true });
}
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, resetIdle, { passive: true }));

// ---------------------------------------------------------------- buttons
$('#btn-collection').addEventListener('click', openCollection);
$('#btn-board').addEventListener('click', openBoard);
$('#btn-share').addEventListener('click', share);
$('#btn-menu').addEventListener('click', openMenu);
const soundBtn = $('#btn-sound');
function syncSound() { soundBtn.setAttribute('aria-pressed', String(!isMuted())); }
soundBtn.addEventListener('click', () => { setMuted(!isMuted()); store.set('muted', isMuted()); syncSound(); unlock(); if (!isMuted()) sfx('pop'); });
const speedBtn = $('#btn-speed');
const SPEED_TOAST = {
  1: 'Normal speed. Savor every box.',
  2: 'Faster. She likes eager. Tap ahead and the next box queues up.',
  3: 'Maximum speed. Nobody likes a guy who rushes. But okay.',
};
function syncSpeed() {
  document.documentElement.style.setProperty('--spd', state.speed);
  if (speedBtn) { speedBtn.textContent = `${state.speed}×`; speedBtn.setAttribute('aria-label', `Speed ${state.speed}x`); }
}
if (speedBtn) speedBtn.addEventListener('click', () => {
  state.speed = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length];
  store.set('speed', state.speed); syncSpeed(); toast(SPEED_TOAST[state.speed]);
});

// ---------------------------------------------------------------- worldwide
async function worldwide() {
  const el = $('#global');
  const st = await api.getStats();
  if (!st) { el.textContent = 'The worldwide box count is in another box right now.'; return; }
  el.textContent = `Boxes opened worldwide: ${fmt(st.total)}`;
}

// ---------------------------------------------------------------- go
(function init() {
  load();
  const q = new URL(location.href).searchParams;
  // Resume links carry a whole save from another device.
  if (q.has('resume')) {
    const r = decodeResume(q.get('resume'));
    history.replaceState(null, '', location.pathname);
    if (r && applyResume(r, true)) return;
    if (!r) setTimeout(() => toast("That resume link isn't a box. Check you copied all of it.", 'scold'), 400);
  }
  // Testing hook: ?season=pumpkin|gift|heart|none
  if (q.has('season')) { const sq = q.get('season'); SEASON = SEASONS[sq] ? sq : ''; }
  if (q.has('depth')) {
    state.depth = Math.min(10000000, Math.max(1, parseInt(q.get('depth'), 10) || 1));
    store.set('depth', state.depth);
    history.replaceState(null, '', location.pathname);
    persist();
  }
  setMuted(!!store.get('muted', false)); syncSound();
  state.speed = SPEEDS.includes(store.get('speed', 1)) ? store.get('speed', 1) : 1; syncSpeed();
  state.s = 1;
  state.current = makeBox(state.depth);
  state.next = makeBox(state.depth + 1);
  // Testing hook: ?variant=taped|flip|big forces the first box's variant.
  const forced = q.get('variant');
  if (forced && ['taped', 'flip', 'big'].includes(forced)) {
    state.current.variant = forced;
    state.current.tapeLeft = forced === 'taped' ? 2 : 0;
    state.current.factor = forced === 'big' ? 1.08 : PREVIEW;
    history.replaceState(null, '', location.pathname);
  }
  markDaily(state.current);
  render();
  updateUI();
  hint(state.depth === 1 ? 'Click the box. Go on.' : 'Welcome back. She is still box. She missed you.');
  resetIdle();
  history.replaceState({ bbg: 'base' }, '');
  worldwide();
  setInterval(worldwide, 60000);
  if (q.has('depth')) milestones();
})();
