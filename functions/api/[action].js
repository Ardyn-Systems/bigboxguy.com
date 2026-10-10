// Cloudflare Pages Function: the worldwide box counter and the Deepest Box leaderboard.
// Needs a KV namespace bound as BOXES (Pages project → Settings → Bindings). Without
// it, every route answers {offline:true} and the site simply hides those features.
//
//   GET  /api/stats            → { total, board }
//   POST /api/open  {n}        → { total }      (n is clamped to 1..50 per request)
//   POST /api/score {name,depth} → { board, rank }
//
// KV writes are last-writer-wins, so the total is approximate under heavy load.
// It is a joke counter. That is fine.

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: HEADERS });
const clampInt = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const readTotal = async (kv) => parseInt((await kv.get('total')) || '0', 10) || 0;
const readBoard = async (kv) => { try { return (await kv.get('board', 'json')) || []; } catch { return []; } };
const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} _.\-'!?]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20) || 'A Guy';
const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function onRequest({ request, env, params }) {
  const kv = env.BOXES;
  const action = params.action;
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!kv) return json({ offline: true, reason: 'No KV namespace bound as BOXES. See README.' }, 503);

  if (action === 'stats' && method === 'GET') {
    const [total, board] = await Promise.all([readTotal(kv), readBoard(kv)]);
    return json({ total, board: board.slice(0, 20) });
  }

  if (action === 'open' && method === 'POST') {
    const body = await readBody(request);
    const n = clampInt(body.n, 1, 50);
    const total = (await readTotal(kv)) + n;
    await kv.put('total', String(total));
    return json({ total });
  }

  if (action === 'score' && method === 'POST') {
    const body = await readBody(request);
    const name = cleanName(body.name);
    const depth = clampInt(body.depth, 1, 10000000);
    const key = name.toLowerCase();
    let board = await readBoard(kv);
    const i = board.findIndex((b) => String(b.name).toLowerCase() === key);
    if (i >= 0) { if (board[i].depth < depth) board[i] = { name, depth, t: Date.now() }; }
    else board.push({ name, depth, t: Date.now() });
    board.sort((a, b) => b.depth - a.depth || a.t - b.t);
    board = board.slice(0, 50);
    await kv.put('board', JSON.stringify(board));
    return json({ board: board.slice(0, 20), rank: board.findIndex((b) => String(b.name).toLowerCase() === key) + 1 });
  }

  return json({ error: 'That box does not exist.' }, 404);
}
