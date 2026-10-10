// Cloudflare Pages Function: the worldwide box counter and the Deepest Box leaderboard.
//
//   GET  /api/stats              → { total, board }
//   POST /api/open  {n}          → { total }        (n is clamped to 1..50 per request)
//   POST /api/score {name,depth} → { board, rank }
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

// ---------------------------------------------------------------- D1
let d1Ready = false;
async function d1Init(db, kv) {
  if (d1Ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, v INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS board (name_key TEXT PRIMARY KEY, name TEXT NOT NULL, depth INTEGER NOT NULL, t INTEGER NOT NULL)'),
  ]);
  const row = await db.prepare("SELECT v FROM counters WHERE k = 'total'").first();
  if (!row) {
    // First run: carry over whatever KV had so nobody loses their box.
    let total = 0, board = [];
    if (kv) {
      try { total = parseInt((await kv.get('total')) || '0', 10) || 0; } catch {}
      try { board = (await kv.get('board', 'json')) || []; } catch {}
    }
    await db.prepare("INSERT OR IGNORE INTO counters (k, v) VALUES ('total', ?)").bind(total).run();
    for (const b of board) {
      const name = cleanName(b.name);
      await db.prepare('INSERT OR IGNORE INTO board (name_key, name, depth, t) VALUES (?, ?, ?, ?)')
        .bind(name.toLowerCase(), name, clampInt(b.depth, 1, MAX_DEPTH), Number(b.t) || Date.now()).run();
    }
  }
  d1Ready = true;
}
const d1Total = async (db) => (await db.prepare("SELECT v FROM counters WHERE k = 'total'").first('v')) || 0;
const d1Board = async (db, n = BOARD_SIZE) =>
  (await db.prepare('SELECT name, depth, t FROM board ORDER BY depth DESC, t ASC LIMIT ?').bind(n).all()).results || [];

async function d1Handle(db, kv, action, method, request) {
  await d1Init(db, kv);
  if (action === 'stats' && method === 'GET') {
    const [total, board] = await Promise.all([d1Total(db), d1Board(db)]);
    return json({ total, board });
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
    await db.prepare(
      'INSERT INTO board (name_key, name, depth, t) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(name_key) DO UPDATE SET name = excluded.name, depth = excluded.depth, t = excluded.t WHERE excluded.depth > board.depth',
    ).bind(key, name, depth, Date.now()).run();
    const mine = await db.prepare('SELECT depth, t FROM board WHERE name_key = ?').bind(key).first();
    const rank = mine
      ? ((await db.prepare('SELECT COUNT(*) AS c FROM board WHERE depth > ? OR (depth = ? AND t < ?)').bind(mine.depth, mine.depth, mine.t).first('c')) || 0) + 1
      : 0;
    return json({ board: await d1Board(db), rank });
  }
  return json({ error: 'That box does not exist.' }, 404);
}

// ---------------------------------------------------------------- KV fallback
const kvTotal = async (kv) => parseInt((await kv.get('total')) || '0', 10) || 0;
const kvBoard = async (kv) => { try { return (await kv.get('board', 'json')) || []; } catch { return []; } };

async function kvHandle(kv, action, method, request) {
  if (action === 'stats' && method === 'GET') {
    const [total, board] = await Promise.all([kvTotal(kv), kvBoard(kv)]);
    return json({ total, board: board.slice(0, BOARD_SIZE) });
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
    return json({ board: board.slice(0, BOARD_SIZE), rank: board.findIndex((b) => String(b.name).toLowerCase() === key) + 1 });
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
