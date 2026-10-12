// Cloudflare Pages Function: the worldwide box counter and the Deepest Box leaderboard.
//
//   GET  /api/stats                    → { total, board, daily, day }
//   POST /api/open  {n}                → { total }   (n is clamped to 1..50 per request)
//   POST /api/score {name,depth,today,day,key?} → { board, rank, daily, dailyRank }
//   POST /api/claim {name,key,save}    → { save }   claim a Leaderbox name with a password
//   POST /api/login {name,key}         → { save }   load a claimed name's save
//   POST /api/sync  {name,key,save}    → { save }   merge a save forward and store it
//
// Accounts: no email, just a Leaderbox name and a password. The browser stretches
// the password with PBKDF2 (150,000 rounds, salted with the name) and sends only
// that 64-hex-char key; the server stores SHA-256(random salt + key). Saves only
// ever merge forward (higher box, higher counts, union of items/certificates).
// Wrong passwords: 8 per name or 30 per IP lock that one out for 15 minutes.
//
// "daily" is Box of the Day: most boxes opened today (UTC). A client's count is
// only accepted when its day matches the server's, so yesterday's never leaks in.
//
// Storage, in order of preference:
//   1. D1 bound as DB     — strongly consistent reads, atomic counter. Use this.
//   2. KV bound as BOXES  — the original backend. KV caches reads for 60 s, so a
//                           new leaderboard name can take a minute to show up, and
//                           the counter is last-writer-wins. Kept as a fallback and
//                           as the source for a one-time migration into D1.
//   3. Neither            → {offline:true}; the site hides those features.

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: HEADERS });
const clampInt = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} _.\-'!?]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20) || 'A Guy';
const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };
const MAX_DEPTH = 10000000;
const BOARD_SIZE = 20;
const utcDay = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- D1
let d1Ready = false;
async function d1Init(db, kv) {
  if (d1Ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, v INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS board (name_key TEXT PRIMARY KEY, name TEXT NOT NULL, depth INTEGER NOT NULL, t INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS board_daily (day TEXT NOT NULL, name_key TEXT NOT NULL, name TEXT NOT NULL, count INTEGER NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (day, name_key))'),
    db.prepare('CREATE TABLE IF NOT EXISTS saves (name_key TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, save TEXT NOT NULL, t INTEGER NOT NULL, created INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS auth_fail (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)'),
  ]);
  await db.prepare("INSERT OR IGNORE INTO counters (k, v) VALUES ('total', 0)").run();
  // One-time carry-over from KV so nobody loses their box. Keyed on its own
  // marker, because an environment without the KV binding (Preview) may have
  // initialised the shared database first.
  if (kv) {
    const done = await db.prepare("SELECT v FROM counters WHERE k = 'migrated_kv'").first();
    if (!done) {
      let total = 0, board = [];
      try { total = parseInt((await kv.get('total')) || '0', 10) || 0; } catch {}
      try { board = (await kv.get('board', 'json')) || []; } catch {}
      await db.prepare("UPDATE counters SET v = v + ? WHERE k = 'total'").bind(total).run();
      for (const b of board) {
        const name = cleanName(b.name);
        await db.prepare(
          'INSERT INTO board (name_key, name, depth, t) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(name_key) DO UPDATE SET depth = excluded.depth, t = excluded.t WHERE excluded.depth > board.depth',
        ).bind(name.toLowerCase(), name, clampInt(b.depth, 1, MAX_DEPTH), Number(b.t) || Date.now()).run();
      }
      await db.prepare("INSERT OR IGNORE INTO counters (k, v) VALUES ('migrated_kv', 1)").run();
    }
  }
  d1Ready = true;
}
const d1Total = async (db) => (await db.prepare("SELECT v FROM counters WHERE k = 'total'").first('v')) || 0;
const d1Board = async (db, n = BOARD_SIZE) =>
  (await db.prepare('SELECT b.name, b.depth, b.t, (s.name_key IS NOT NULL) AS claimed FROM board b LEFT JOIN saves s ON s.name_key = b.name_key ORDER BY b.depth DESC, b.t ASC LIMIT ?').bind(n).all()).results || [];

// ---------------------------------------------------------------- accounts
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha = async (str) => hex(await crypto.subtle.digest('SHA-256', enc.encode(str)));
const validKey = (k) => typeof k === 'string' && /^[0-9a-f]{64}$/.test(k);
function sameStr(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function cleanSave(x) {
  x = x && typeof x === 'object' ? x : {};
  const coll = {};
  for (const k of Object.keys(x.coll || {}).slice(0, 40)) if (/^[a-z]{1,16}$/.test(k)) coll[k] = clampInt(x.coll[k], 0, 1e9);
  const certs = {};
  for (const k of Object.keys(x.certs || {}).slice(0, 20)) {
    if (!/^\d{1,8}$/.test(k)) continue;
    const r = x.certs[k] || {};
    certs[k] = { serial: String(r.serial || '').slice(0, 40), date: String(r.date || '').slice(0, 40), ...(r.personal ? { personal: true } : {}) };
  }
  return {
    depth: clampInt(x.depth, 1, MAX_DEPTH), opened: clampInt(x.opened, 0, 1e9), coll, certs,
    lastTrout: clampInt(x.lastTrout, 0, MAX_DEPTH), lastDrop: clampInt(x.lastDrop, 0, MAX_DEPTH),
    dailyDay: /^\d{4}-\d{2}-\d{2}$/.test(x.dailyDay || '') ? x.dailyDay : '', streak: clampInt(x.streak, 0, 1e5),
  };
}
// Forward only: nothing a client sends can lower what is stored.
function mergeSave(a, b) {
  const coll = { ...a.coll };
  for (const k of Object.keys(b.coll)) coll[k] = Math.max(coll[k] || 0, b.coll[k]);
  const later = b.dailyDay > a.dailyDay ? b : a;
  return {
    depth: Math.max(a.depth, b.depth), opened: Math.max(a.opened, b.opened), coll, certs: { ...b.certs, ...a.certs },
    lastTrout: Math.max(a.lastTrout, b.lastTrout), lastDrop: Math.max(a.lastDrop, b.lastDrop),
    dailyDay: later.dailyDay, streak: a.dailyDay === b.dailyDay ? Math.max(a.streak, b.streak) : later.streak,
  };
}
const LOCK_MS = 15 * 60 * 1000;
async function locked(db, k) { const r = await db.prepare('SELECT until FROM auth_fail WHERE k = ?').bind(k).first(); return !!(r && r.until > Date.now()); }
async function noteFail(db, k, limit) {
  const r = await db.prepare('SELECT n FROM auth_fail WHERE k = ?').bind(k).first();
  const n = (r ? r.n : 0) + 1;
  const hit = n >= limit;
  await db.prepare('INSERT INTO auth_fail (k, n, until) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET n = excluded.n, until = excluded.until')
    .bind(k, hit ? 0 : n, hit ? Date.now() + LOCK_MS : 0).run();
}
// Returns { row } on success, or { res } with the error response to send.
async function checkAuth(db, request, name, key) {
  const nk = name.toLowerCase();
  const ip = 'ip:' + (request.headers.get('cf-connecting-ip') || '?');
  if (await locked(db, 'name:' + nk) || await locked(db, ip)) return { res: json({ error: 'locked', message: 'Too many wrong passwords. Try again in 15 minutes.' }, 429) };
  const row = await db.prepare('SELECT name, salt, hash, save FROM saves WHERE name_key = ?').bind(nk).first();
  if (!row) return { res: json({ error: 'unknown', message: 'Nobody has claimed that name yet.' }, 404) };
  if (!validKey(key) || !sameStr(await sha(row.salt + key), row.hash)) {
    await noteFail(db, 'name:' + nk, 8);
    await noteFail(db, ip, 30);
    return { res: json({ error: 'wrong', message: "That password doesn't match that name." }, 401) };
  }
  await db.prepare('DELETE FROM auth_fail WHERE k = ?').bind('name:' + nk).run();
  return { row };
}
async function raiseBoard(db, name, depth) {
  await db.prepare(
    'INSERT INTO board (name_key, name, depth, t) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(name_key) DO UPDATE SET name = excluded.name, depth = excluded.depth, t = excluded.t WHERE excluded.depth > board.depth',
  ).bind(name.toLowerCase(), name, depth, Date.now()).run();
}
async function accountHandle(db, action, request) {
  const body = await readBody(request);
  const name = cleanName(body.name);
  const nk = name.toLowerCase();
  if (action === 'claim') {
    if (!validKey(body.key)) return json({ error: 'bad', message: 'That password could not be read. Try again.' }, 400);
    if (await db.prepare('SELECT 1 FROM saves WHERE name_key = ?').bind(nk).first()) return json({ error: 'taken', message: 'Someone already claimed that name. Sign in, or pick another.' }, 409);
    const save = cleanSave(body.save);
    const onBoard = await db.prepare('SELECT depth FROM board WHERE name_key = ?').bind(nk).first();
    if (onBoard && save.depth < onBoard.depth) return json({ error: 'behind', need: onBoard.depth, message: `The Leaderbox has ${name} at Box ${onBoard.depth}. Claim it from a save at least that deep.` }, 403);
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const now = Date.now();
    await db.prepare('INSERT INTO saves (name_key, name, salt, hash, save, t, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(nk, name, salt, await sha(salt + body.key), JSON.stringify(save), now, now).run();
    await raiseBoard(db, name, save.depth);
    return json({ ok: true, name, save });
  }
  const auth = await checkAuth(db, request, name, body.key);
  if (auth.res) return auth.res;
  const stored = cleanSave(JSON.parse(auth.row.save || '{}'));
  if (action === 'login') return json({ ok: true, name: auth.row.name, save: stored });
  const merged = mergeSave(stored, cleanSave(body.save));
  await db.prepare('UPDATE saves SET save = ?, t = ? WHERE name_key = ?').bind(JSON.stringify(merged), Date.now(), nk).run();
  await raiseBoard(db, auth.row.name, merged.depth);
  return json({ ok: true, name: auth.row.name, save: merged });
}
const d1Daily = async (db, day, n = BOARD_SIZE) =>
  (await db.prepare('SELECT name, count, t FROM board_daily WHERE day = ? ORDER BY count DESC, t ASC LIMIT ?').bind(day, n).all()).results || [];

async function d1Handle(db, kv, action, method, request) {
  await d1Init(db, kv);
  if (action === 'stats' && method === 'GET') {
    const day = utcDay();
    const [total, board, daily] = await Promise.all([d1Total(db), d1Board(db), d1Daily(db, day)]);
    return json({ total, board, daily, day });
  }
  if (action === 'open' && method === 'POST') {
    const n = clampInt((await readBody(request)).n, 1, 50);
    const total = await db.prepare("UPDATE counters SET v = v + ? WHERE k = 'total' RETURNING v").bind(n).first('v');
    return json({ total });
  }
  if (action === 'score' && method === 'POST') {
    const body = await readBody(request);
    const name = cleanName(body.name);
    const key = name.toLowerCase();
    const depth = clampInt(body.depth, 1, MAX_DEPTH);
    // A claimed name only takes scores from someone signed in as it.
    if (await db.prepare('SELECT 1 FROM saves WHERE name_key = ?').bind(key).first()) {
      // No password at all: just refuse. Only a wrong password counts toward the lockout,
      // so nobody can lock an owner out by spamming scores under their name.
      if (!validKey(body.key)) return json({ error: 'claimed', message: `${name} is claimed. Sign in from the menu to post as ${name}.` }, 403);
      const auth = await checkAuth(db, request, name, body.key);
      if (auth.res) return json({ error: 'claimed', message: `${name} is claimed. Sign in from the menu to post as ${name}.` }, 403);
    }
    await raiseBoard(db, name, depth);
    const mine = await db.prepare('SELECT depth, t FROM board WHERE name_key = ?').bind(key).first();
    const rank = mine
      ? ((await db.prepare('SELECT COUNT(*) AS c FROM board WHERE depth > ? OR (depth = ? AND t < ?)').bind(mine.depth, mine.depth, mine.t).first('c')) || 0) + 1
      : 0;
    // Box of the Day: today's opens for this name, if the client's day is today.
    const day = utcDay();
    const todayCount = clampInt(body.today, 0, MAX_DEPTH);
    let dailyRank = 0;
    if (todayCount > 0 && body.day === day) {
      await db.prepare(
        'INSERT INTO board_daily (day, name_key, name, count, t) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(day, name_key) DO UPDATE SET name = excluded.name, count = excluded.count, t = excluded.t WHERE excluded.count > board_daily.count',
      ).bind(day, key, name, todayCount, Date.now()).run();
      const d = await db.prepare('SELECT count, t FROM board_daily WHERE day = ? AND name_key = ?').bind(day, key).first();
      if (d) dailyRank = ((await db.prepare('SELECT COUNT(*) AS c FROM board_daily WHERE day = ? AND (count > ? OR (count = ? AND t < ?))').bind(day, d.count, d.count, d.t).first('c')) || 0) + 1;
    }
    return json({ board: await d1Board(db), rank, daily: await d1Daily(db, day), dailyRank, day });
  }
  if ((action === 'claim' || action === 'login' || action === 'sync') && method === 'POST') return accountHandle(db, action, request);
  return json({ error: 'That box does not exist.' }, 404);
}

// ---------------------------------------------------------------- KV fallback
const kvTotal = async (kv) => parseInt((await kv.get('total')) || '0', 10) || 0;
const kvBoard = async (kv) => { try { return (await kv.get('board', 'json')) || []; } catch { return []; } };

async function kvHandle(kv, action, method, request) {
  if (action === 'stats' && method === 'GET') {
    const [total, board] = await Promise.all([kvTotal(kv), kvBoard(kv)]);
    return json({ total, board: board.slice(0, BOARD_SIZE), daily: [], day: utcDay() });
  }
  if (action === 'open' && method === 'POST') {
    const n = clampInt((await readBody(request)).n, 1, 50);
    const total = (await kvTotal(kv)) + n;
    await kv.put('total', String(total));
    return json({ total });
  }
  if (action === 'score' && method === 'POST') {
    const body = await readBody(request);
    const name = cleanName(body.name);
    const depth = clampInt(body.depth, 1, MAX_DEPTH);
    const key = name.toLowerCase();
    let board = await kvBoard(kv);
    const i = board.findIndex((b) => String(b.name).toLowerCase() === key);
    if (i >= 0) { if (board[i].depth < depth) board[i] = { name, depth, t: Date.now() }; }
    else board.push({ name, depth, t: Date.now() });
    board.sort((a, b) => b.depth - a.depth || a.t - b.t);
    board = board.slice(0, 50);
    await kv.put('board', JSON.stringify(board));
    return json({ board: board.slice(0, BOARD_SIZE), rank: board.findIndex((b) => String(b.name).toLowerCase() === key) + 1, daily: [], dailyRank: 0, day: utcDay() });
  }
  return json({ error: 'That box does not exist.' }, 404);
}

// ---------------------------------------------------------------- entry
export async function onRequest({ request, env, params }) {
  const { action } = params;
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    if (env.DB) return await d1Handle(env.DB, env.BOXES, action, method, request);
    if (env.BOXES) return await kvHandle(env.BOXES, action, method, request);
  } catch (e) {
    return json({ offline: true, reason: 'The box server tripped over something: ' + (e && e.message) }, 500);
  }
  return json({ offline: true, reason: 'No D1 database bound as DB (or KV as BOXES). See README.' }, 503);
}
