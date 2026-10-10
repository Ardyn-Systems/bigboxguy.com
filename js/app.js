// bigboxguy.com — the box engine. A box opens. There is a box inside. Repeat.
import { sfx, strain, setMuted, isMuted, unlock } from './audio.js';
import { DROPS, TIER_LABEL, byId, rollDrop, dropSVG } from './drops.js';
import { renderCertificate } from './cert.js';
import { renderShare, shareText } from './share.js';
import * as api from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmt = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k, d) { try { const v = localStorage.getItem('bbg.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bbg.' + k, JSON.stringify(v)); } catch {} },
  clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('bbg.')).forEach((k) => localStorage.removeItem(k)); } catch {} },
};

// ---------------------------------------------------------------- copy
const FROMTO = [
  ['Big Box Guy', 'Big Box Guy'],
  ['Big Box Guy', 'You, apparently'],
  ['The Box', 'The Next Box'],
  ['Big Box Guy', 'Current Resident'],
  ['Warehouse 7', 'Warehouse 7'],
  ['A Box', 'A Guy'],
  ['Big Box Guy', 'Whom It May Concern'],
];
const JOKES = [
  'FRAGILE: contents may contain box.',
  'This side up (any side is up).',
  'Do not open. Just kidding. Open.',
  'Contents: 1 (one) box.',
  "Handle with care. Or don't. It's a box.",
  'If found, please return to box.',
  'Batteries not included. Box included.',
  'Net weight: one box.',
  'May contain traces of box.',
  'Best before: the next box.',
  "Some assembly required (it's assembled).",
  'Keep refrigerated. (optional)',
  'Do not stack more than ∞ high.',
  'Inspected by #12. #12 is a box.',
  'Shipped from inside a slightly larger box.',
  'Ships in original packaging (this).',
  'Not a toy. Also not not a toy.',
  'Open here ↓ (or anywhere)',
  'Property of Big Box Guy. Do not fold.',
  'Opened 0 times. Until now.',
  'Warranty void if box.',
  'Reusable! (You are reusing it right now.)',
  'Guaranteed box or your box back.',
  'Made in a facility that also makes boxes.',
  "Mystery box. The mystery: it's a box.",
  "You've been here before.",
  'Serving size: 1 box. Servings: 1.',
  'Do not microwave. We tried.',
  'Quality boxes since whenever.',
  'Tracking: delivered. To itself.',
  'Contains: the next part of your day.',
  'Please recycle me after the last box.',
  'Lift with your legs, not your hopes.',
  'This box has a great personality.',
  'Approved by one (1) guy.',
];
const STAMPS = [
  'Fragile', 'This side up', 'Priority', 'Heavy-ish', 'Handle w/ care', 'Box', 'Urgent (not really)',
  'Delivered', 'Do not bend', '2nd day box', 'Inspected', 'Approved', 'Perishable?', 'Contains box',
];
const HINTS = [
  'There is another box.', 'Keep going.', "It's boxes all the way down.", 'Go on.', 'You know what to do.',
  'Try shaking it first.', 'Hold it down. See what happens.', 'Each one is slightly smaller.', 'No one is making you do this.',
];
const MILESTONES = {
  10: "Box 10. You've got the hang of it. There is nothing to get the hang of.",
  25: 'Box 25. A quarter of the way to something.',
  50: "Box 50. Halfway to a certificate. Of what? You'll see.",
  75: 'Box 75. The boxes have noticed you.',
  99: 'Box 99. Something is about to happen. It is a box, but also something.',
  250: 'Box 250. The Association has been notified.',
  500: "Box 500. Justin Box would like a word. The word is 'box'.",
  2000: "Box 2,000. We checked. It's still boxes.",
  5000: 'Box 5,000. Please drink some water.',
};

// ---------------------------------------------------------------- state
const state = {
  depth: 1, opened: 0, coll: {}, fresh: [], lastDrop: 0, name: '', cert: false, seen: {},
  s: 1, busy: false, lastClick: 0, skip: false, el: null, current: null, next: null,
};
const stage = $('#stage');

function load() {
  state.depth = Math.max(1, parseInt(store.get('depth', 1), 10) || 1);
  state.opened = Math.max(0, parseInt(store.get('opened', 0), 10) || 0);
  state.coll = store.get('coll', {}) || {};
  state.fresh = store.get('fresh', []) || [];
  state.lastDrop = store.get('lastDrop', 0) || 0;
  state.name = String(store.get('name', '') || '');
  state.cert = !!store.get('cert', false);
  state.seen = store.get('seen', {}) || {};
}
const persist = () => {
  store.set('depth', state.depth); store.set('opened', state.opened); store.set('coll', state.coll);
  store.set('fresh', state.fresh); store.set('lastDrop', state.lastDrop); store.set('cert', state.cert); store.set('seen', state.seen);
};

// ---------------------------------------------------------------- boxes
function code() {
  const n = () => Math.floor(Math.random() * 10);
  return `BBG ${n()}${n()}${n()}${n()} ${n()}${n()}${n()}${n()} BOX`;
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
    tapeLeft: variant === 'taped' ? 2 : 0, factor: variant === 'big' ? 1.08 : 0.88,
    drop: rollDrop(depth, state.lastDrop),
  };
  if (variant === 'flip') { b.joke = 'THIS SIDE UP ↑'; b.stamp = 'This side up'; }
  if (variant === 'taped') { b.stamp = 'Extra secure'; }
  if (variant === 'big') { b.joke = 'Contents: a box. A big one.'; b.stamp = 'Oversize'; }
  return b;
}
function boxHTML(b, next, opts = {}) {
  const mini = !next;
  let inside = '';
  if (next) {
    const irot = (next.variant === 'flip' ? 180 : 0) - (b.variant === 'flip' ? 180 : 0);
    inside = `<div class="inner" style="--f:${b.factor};--irot:${irot}deg">${boxHTML(next, null)}</div><div class="drop" hidden></div>`;
  }
  return `<div class="box ${mini ? 'mini' : 'main'} ${b.variant}"${mini ? '' : ' tabindex="0" role="button" aria-label="A box. Open it."'}>
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
}

// ---------------------------------------------------------------- opening
function click() {
  const cur = state.current, box = state.el;
  if (cur.variant === 'taped' && cur.tapeLeft > 0) {
    const strip = box.querySelector('.xtape:not(.ripped)');
    if (strip) strip.classList.add('ripped');
    cur.tapeLeft--;
    sfx('rip');
    hint(cur.tapeLeft ? 'Extra secure. Keep going.' : 'There. Now open it.');
    return;
  }
  open();
}
async function open() {
  if (state.busy) return;
  state.busy = true; state.skip = false;
  const box = state.el, cur = state.current;
  unlock(); sfx('fwump');
  box.classList.remove('rattling');
  box.classList.add('open');
  peanuts(box);
  hint('');
  state.opened++;
  history.pushState({ depth: state.depth + 1 }, '');
  await wait(850);
  if (cur.drop) await showDrop(box, cur.drop);
  else await wait(320);
  let n = 1;
  if (state.skip) {
    n = 2; state.opened++;
    sfx('tut');
    toast("You didn't even savor that one. You skipped a box. It had a label and everything.", 'scold');
  }
  advance(n);
}
function advance(n) {
  const old = state.el, cur = state.current;
  state.depth += n;
  state.s = state.s * cur.factor * (n === 2 ? 0.88 : 1);
  state.current = n === 1 ? state.next : makeBox(state.depth);
  state.next = makeBox(state.depth + 1);
  persist();
  old.classList.remove('main');
  old.classList.add('spent');
  setTimeout(() => old.remove(), 500);
  render();
  const zoom = state.depth > 1 && (state.depth - 1) % 12 === 0;
  if (zoom) {
    const el = state.el;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('zooming');
      state.s = 1;
      el.style.setProperty('--s', 1);
      sfx('whoosh');
      hint('Lean in.');
      setTimeout(() => el.classList.remove('zooming'), 1000);
    }));
  }
  updateUI();
  api.queueOpen(n);
  state.busy = false;
  milestones();
}

async function showDrop(box, drop) {
  const slot = box.querySelector('.drop');
  slot.className = 'drop ' + drop.id;
  slot.innerHTML = dropSVG(drop.id);
  slot.hidden = false;
  sfx(drop.sfx);
  state.coll[drop.id] = (state.coll[drop.id] || 0) + 1;
  state.lastDrop = state.depth;
  const first = state.coll[drop.id] === 1;
  if (first && !state.fresh.includes(drop.id)) state.fresh.push(drop.id);
  persist();
  updateBadge();
  toast(`${TIER_LABEL[drop.tier]}: ${drop.name}. ${drop.desc}${first ? ' Added to your collection.' : ''}`, 'rare', drop.tier === 'legendary' ? 7000 : 4500);
  if (drop.id === 'trout') setTimeout(() => toast('You found the trout. There is nothing above the trout.', 'rare', 7000), 900);
  await wait(drop.ms);
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
    p.style.setProperty('--dur', 1.1 + Math.random() * 0.6 + 's');
    host.appendChild(p);
    setTimeout(() => p.remove(), 1900);
  }
}

// ---------------------------------------------------------------- ui
function hint(t) { $('#hint').textContent = t; }
function updateUI() {
  $('#depth').textContent = fmt(state.depth);
  $('#depth-sub').textContent = `You have opened ${fmt(state.opened)} ${state.opened === 1 ? 'box' : 'boxes'}.`;
  document.title = `Box ${fmt(state.depth)} - bigboxguy.com`;
  favicon(((state.depth - 1) % 12) / 11);
  if (state.depth > 1 && state.depth % 3 === 0 && Math.random() < 0.6) hint(pick(HINTS));
  updateBadge();
}
function updateBadge() {
  const b = $('#coll-badge');
  b.textContent = state.fresh.length;
  b.hidden = state.fresh.length === 0;
}
function favicon(p) {
  const fh = 22 * (1 - p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="7" fill="#8a6130"/><rect x="10" y="10" width="44" height="44" fill="#2a1a09"/><rect x="22" y="22" width="20" height="20" fill="#c99b5e" opacity="${p > 0.1 ? 1 : 0}"/><rect x="10" y="10" width="44" height="${fh}" fill="#c99b5e"/><rect x="10" y="${54 - fh}" width="44" height="${fh}" fill="#c99b5e"/><rect x="29" y="10" width="6" height="44" fill="#f6e5ac" opacity="${p < 0.05 ? 0.95 : 0}"/></svg>`;
  $('#favicon').href = 'data:image/svg+xml,' + encodeURIComponent(svg);
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
  if (d >= 100 && !state.cert) {
    state.cert = true; persist();
    sfx('tada');
    setTimeout(() => openCertificate(true), 700);
  }
  if (d >= 1000 && !state.seen.shortage) { state.seen.shortage = true; persist(); setTimeout(shortage, 600); }
  if (d >= 10000 && !state.seen.credits) { state.seen.credits = true; persist(); setTimeout(credits, 600); }
}

async function openCertificate(justEarned = false) {
  const serial = store.get('serial', null) || `BBG-${String(Math.floor(Math.random() * 90000) + 10000)}-100`;
  store.set('serial', serial);
  const date = store.get('certDate', null) || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  store.set('certDate', date);
  const ov = modal(`
    <h2>${justEarned ? 'Box 100. Congratulations.' : 'Your certificate'}</h2>
    <p>${justEarned ? 'You have been certified. This was not optional.' : 'Still valid. It will always be valid.'}</p>
    <div class="row"><input type="text" id="cert-name" maxlength="28" placeholder="Your name, as it should appear" value="${esc(state.name)}"><button class="btn" id="cert-redraw">Update name</button></div>
    <div class="certwrap" id="certwrap" style="margin-top:12px"><p class="muted">Drawing your certificate…</p></div>
    <div class="row"><button class="btn primary" id="cert-dl">Download certificate (PNG)</button><span class="muted">Printing it does not make it more official. It is already maximally official.</span></div>
  `);
  const draw = async () => {
    const name = $('#cert-name', ov).value.trim() || 'A Guy';
    state.name = name; store.set('name', name);
    const c = await renderCertificate({ name, date, serial });
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
    a.download = 'certified-big-box-guy.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast('Downloaded. Frame it. Or box it.');
  });
}

function shortage() {
  const ov = modal(`
    <div class="notice">
      <div class="ref">Ref: BBG/1000/SHORT &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US')}</div>
      <h2>NOTICE OF TEMPORARY BOX SHORTAGE</h2>
      <p>To whom it may concern,</p>
      <p>Due to unprecedented demand (you), bigboxguy.com has temporarily run out of boxes.</p>
      <p>We have opened one thousand (1,000) boxes together. Each one contained a box. We did not anticipate this, despite it being the only thing that has ever happened here.</p>
      <p>Management sincerely apologizes for the inconvenience. We are looking in the back.</p>
      <p>— Management</p>
      <div class="row"><button class="btn primary" id="shortage-ok">I understand</button></div>
    </div>
  `, { locked: true, onClose: () => setTimeout(() => toast('…found one. It was in a box. Carry on.'), 1400) });
  $('#shortage-ok', ov).addEventListener('click', ov.close);
}

function credits() {
  const roles = ['Directed by', 'Produced by', 'Written by', 'Boxes by', 'Smaller boxes by', 'Tape', 'Packing peanut wrangler',
    'Cat', 'Trout', 'Stunts', 'Catering', 'Legal', 'Box 7,334 (uncredited)', 'Special thanks', 'In loving memory of'];
  const el = document.createElement('div');
  el.className = 'credits';
  el.innerHTML = `<div class="roll"><h1>bigboxguy.com</h1><p>A Big Box Guy Production</p>
    ${roles.map((r) => `<div class="credit"><span>${r}</span><b></b></div>`).join('')}
    <p class="end">Nobody worked on this.<br>Thank you for watching.</p><p>Box 10,000</p></div>
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
    <p class="muted">${found} of ${DROPS.length} found. Things are in boxes sometimes. The odds are real. Keep clicking.</p>
    <div class="coll">${DROPS.map((d) => {
      const n = state.coll[d.id] || 0;
      return `<div class="card ${n ? '' : 'locked'}">${fresh.has(d.id) ? '<span class="new">NEW</span>' : ''}
        <div class="art">${dropSVG(d.id)}</div>
        <div class="nm">${n ? esc(d.name) : '???'}</div>
        <span class="tier ${d.tier}">${d.tier}</span>
        <div class="ct">${n ? `found ×${fmt(n)}` : 'not yet found'}</div>
        ${n ? `<div class="ct" style="margin-top:6px">${esc(d.desc)}</div>` : ''}
      </div>`;
    }).join('')}</div>
    ${found === DROPS.length ? '<p><b>You found everything. Including the trout. There is nothing left to find, and yet.</b></p>' : ''}
  `);
}

async function openBoard() {
  const ov = modal(`
    <h2>Deepest Box</h2>
    <p class="muted">Pure vanity. No accounts. Just a name and a number nobody can verify.</p>
    <ol class="board" id="board"><li><span class="rank"></span><span class="nm muted">Checking the back…</span></li></ol>
    <form class="row" id="scoreform"><input type="text" name="name" maxlength="20" placeholder="Your name (or title)" value="${esc(state.name)}" required><button class="btn primary" type="submit">Submit Box ${fmt(state.depth)}</button></form>
    <p class="muted" id="board-note"></p>
  `);
  const draw = (board, me) => {
    const ol = $('#board', ov);
    if (!board) { ol.innerHTML = '<li><span class="rank"></span><span class="nm muted">The leaderboard is in a different box right now. (No connection to the box server.)</span></li>'; return; }
    if (!board.length) { ol.innerHTML = '<li><span class="rank"></span><span class="nm muted">Nobody yet. Be the first guy.</span></li>'; return; }
    ol.innerHTML = board.map((b, i) => `<li class="${me && b.name.toLowerCase() === me.toLowerCase() ? 'me' : ''}"><span class="rank">${i + 1}</span><span class="nm">${esc(b.name)}</span><span class="dp">Box ${fmt(b.depth)}</span></li>`).join('');
  };
  const st = await api.getStats();
  draw(st ? st.board : null, state.name);
  $('#scoreform', ov).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('input', ov).value.trim().slice(0, 20);
    if (!name) return;
    state.name = name; store.set('name', name);
    const btn = $('button[type=submit]', ov);
    btn.disabled = true;
    const res = await api.submitScore(name, state.depth);
    btn.disabled = false;
    if (!res) { $('#board-note', ov).textContent = 'Could not reach the box server. Your box remains deep in spirit.'; return; }
    draw(res.board, name);
    $('#board-note', ov).textContent = res.rank ? `You are #${res.rank}. Your box is deep.` : 'Submitted. Deeper boxes exist. Keep going.';
    toast('Leaderboard updated. Nobody can take this from you.');
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
  $('#share-copy', ov).addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch { toast('Could not copy. Select it like a guy.'); } });
}

function openMenu() {
  const ov = modal(`
    <h2>Big Box Guy</h2>
    <div class="row"><label style="flex:1">Your name<br><input type="text" id="menu-name" maxlength="28" value="${esc(state.name)}" placeholder="For the certificate and leaderboard" style="width:100%;margin-top:4px"></label></div>
    ${state.cert ? '<div class="row"><button class="btn" id="menu-cert">View my certificate</button></div>' : '<p class="muted">A certificate is issued at Box 100. You are at Box ' + fmt(state.depth) + '.</p>'}
    <h3>Things you can do</h3>
    <ul class="muted" style="line-height:1.8;margin:0;padding-left:18px">
      <li>Click the box. There is another box inside.</li>
      <li>Shake your mouse over the box (or shake your phone) to hear what's inside.</li>
      <li>Hold the click down. The box has opinions about that.</li>
      <li>Double-click to skip a box. Please don't.</li>
      <li>The browser back button goes back a box. The box remembers.</li>
      <li>Some boxes are taped shut, upside down, or too big for the box they came in.</li>
      <li>Some boxes contain things. Collect them all. One of them is a trout.</li>
    </ul>
    <h3>Start over</h3>
    <div class="row"><button class="btn" id="menu-reset">Return all boxes to sender</button><span class="muted">Resets your depth, collection, and certificate on this device.</span></div>
    <p class="muted" style="margin-top:18px">Made by a guy. <a href="about.html">About the Big Box Guy</a> · <a href="services.html">Services</a> · <a href="pricing.html">Pricing</a></p>
  `);
  $('#menu-name', ov).addEventListener('change', (e) => { state.name = e.target.value.trim(); store.set('name', state.name); });
  const cb = $('#menu-cert', ov);
  if (cb) cb.addEventListener('click', () => { ov.close(); openCertificate(false); });
  $('#menu-reset', ov).addEventListener('click', () => {
    if (!confirm('Return all boxes to sender? This resets your depth, collection, and certificate.')) return;
    store.clear();
    location.href = location.pathname;
  });
}

// ---------------------------------------------------------------- input
let holdT1 = 0, holdT2 = 0, downAt = 0, straining = false;
function clearHold() { clearTimeout(holdT1); clearTimeout(holdT2); }
function endStrain() { straining = false; strain(false); if (state.el) state.el.classList.remove('straining'); }

stage.addEventListener('pointerdown', (e) => {
  const box = e.target.closest('.box.main');
  if (!box || (e.pointerType === 'mouse' && e.button !== 0)) return;
  unlock(); requestMotion();
  const now = performance.now();
  if (state.busy) {
    if (now - state.lastClick < 520) state.skip = true;
    state.lastClick = now;
    return;
  }
  state.lastClick = now; downAt = now;
  clearHold();
  holdT1 = setTimeout(() => {
    straining = true; box.classList.add('straining'); strain(true); hint('It does not want to.');
  }, 380);
  holdT2 = setTimeout(() => { endStrain(); downAt = 0; toast('FINE.', 'scold'); open(); }, 2100);
});
stage.addEventListener('pointerup', (e) => {
  clearHold();
  if (!state.el || state.busy) { downAt = 0; return; }
  if (straining) { endStrain(); hint("It's shy. Try a normal click."); downAt = 0; return; }
  if (downAt && performance.now() - downAt < 380 && e.target.closest('.box.main')) click();
  downAt = 0;
});
['pointercancel', 'pointerleave'].forEach((t) => stage.addEventListener(t, () => { clearHold(); if (straining) endStrain(); downAt = 0; }));
stage.addEventListener('keydown', (e) => {
  if (!e.target.closest('.box.main')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); unlock(); if (!state.busy) click(); }
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
  hint(d ? "Something's in there." : 'Sounds like… a box.');
  setTimeout(() => box.classList.remove('rattling'), 600);
}
// Shake the phone: same thing.
let motionReady = false, lastShake = 0;
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;
  const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  if (Math.abs(m - 9.81) > 13 && performance.now() - lastShake > 1500) { lastShake = performance.now(); rattle(); }
}
function requestMotion() {
  if (motionReady || !matchMedia('(pointer: coarse)').matches) return;
  motionReady = true;
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then((s) => { if (s === 'granted') addEventListener('devicemotion', onMotion); }).catch(() => {});
  } else if ('DeviceMotionEvent' in window) {
    addEventListener('devicemotion', onMotion);
  }
}

// The back button. The box notices.
addEventListener('popstate', (e) => {
  const d = e.state && e.state.depth;
  if (!d || d >= state.depth || state.busy) { history.replaceState({ depth: state.depth }, ''); return; }
  state.depth = d;
  state.s = Math.pow(0.88, (d - 1) % 12);
  state.current = makeBox(d);
  state.next = makeBox(d + 1);
  persist();
  if (state.el) state.el.remove();
  render({ resealed: true });
  sfx('thunk');
  toast('The box noticed you came back. It has been re-sealed.', 'scold');
  updateUI();
});

// ---------------------------------------------------------------- buttons
$('#btn-collection').addEventListener('click', openCollection);
$('#btn-board').addEventListener('click', openBoard);
$('#btn-share').addEventListener('click', share);
$('#btn-menu').addEventListener('click', openMenu);
const soundBtn = $('#btn-sound');
function syncSound() { soundBtn.setAttribute('aria-pressed', String(!isMuted())); }
soundBtn.addEventListener('click', () => { setMuted(!isMuted()); store.set('muted', isMuted()); syncSound(); unlock(); if (!isMuted()) sfx('pop'); });

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
  if (q.has('depth')) {
    state.depth = Math.min(10000000, Math.max(1, parseInt(q.get('depth'), 10) || 1));
    history.replaceState(null, '', location.pathname);
    persist();
  }
  setMuted(!!store.get('muted', false)); syncSound();
  state.s = Math.pow(0.88, (state.depth - 1) % 12);
  state.current = makeBox(state.depth);
  state.next = makeBox(state.depth + 1);
  render();
  updateUI();
  hint(state.depth === 1 ? 'Click the box.' : 'Welcome back. It is still a box.');
  history.replaceState({ depth: state.depth }, '');
  worldwide();
  setInterval(worldwide, 60000);
  if (q.has('depth')) milestones();
})();
