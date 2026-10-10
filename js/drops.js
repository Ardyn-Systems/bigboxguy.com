// Things that are occasionally in the box instead of (as well as) a box.
export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const TIER_LABEL = {
  common: 'Common', uncommon: 'Uncommon', rare: 'RARE', epic: 'EPIC', legendary: '★ LEGENDARY ★',
};

export const DROPS = [
  { id: 'peanut',  name: 'Packing Peanut',      tier: 'common',    odds: 1 / 9,   sfx: 'paper', ms: 1800,
    desc: 'A single packing peanut. It got around.' },
  { id: 'bubble',  name: 'One Bubble of Wrap',  tier: 'common',    odds: 1 / 14,  sfx: 'pop',   ms: 1400,
    desc: "Already popped. Someone couldn't wait." },
  { id: 'receipt', name: 'Receipt for $0.00',   tier: 'uncommon',  odds: 1 / 26,  sfx: 'paper', ms: 2000,
    desc: 'The box was free. The love was priceless. Keep it for your records.' },
  { id: 'manual',  name: 'Instruction Manual',  tier: 'uncommon',  odds: 1 / 34,  sfx: 'paper', ms: 2000,
    desc: "Page 1 of 1. The page is blank. You'll figure it out. You always do." },
  { id: 'cat',     name: 'Cat',                 tier: 'rare',      odds: 1 / 65,  sfx: 'meow',  ms: 2100,
    desc: 'It has already moved into the next box. Cats know a good box.' },
  { id: 'guy',     name: 'Smaller Big Box Guy', tier: 'epic',      odds: 1 / 160, sfx: 'hi',    ms: 2400,
    desc: 'He waved. Then he left, to go love a box of his own.' },
  { id: 'trout',   name: 'Trout',               tier: 'legendary', odds: 1 / 500, sfx: 'flop',  ms: 2600,
    desc: "A trout. In a box. It's a fish. It's in a box. Nobody is judging." },
];

export const byId = Object.fromEntries(DROPS.map((d) => [d.id, d]));

// Boxes without a trout before the trout is guaranteed. Bad luck has a ceiling.
export const TROUT_PITY = 1000;

// Roll rarest-first so a legendary roll is never eaten by a peanut.
export function rollDrop(depth, lastDropDepth, lastTroutDepth = 0) {
  if (depth < 3) return null;
  // Pity timer: a guy who has loved 1,000 boxes without a trout gets a trout.
  if (depth - (lastTroutDepth || 0) >= TROUT_PITY) return byId.trout;
  for (let i = DROPS.length - 1; i >= 0; i--) {
    if (Math.random() < DROPS[i].odds) return DROPS[i];
  }
  // Pity: a first-timer gets a peanut by box 7, and nobody waits more than 25 boxes.
  if (!lastDropDepth && depth >= 7) return DROPS[0];
  if (lastDropDepth && depth - lastDropDepth >= 25) return DROPS[Math.random() < 0.5 ? 0 : 1];
  return null;
}

const ART = {
  peanut: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 18c-10-2-20 6-18 17 1 6-3 10-3 17 0 12 11 21 23 19 7-1 11 3 18 2 12-2 18-14 13-25-3-6 2-13-1-20-3-9-14-14-22-10-3 1-7 1-10 0z" fill="#efe3c6" stroke="#cdbb90" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 30c-4 8-2 20 6 26" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/></svg>`,
  bubble: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="rgba(200,225,255,.5)" stroke="#9fc3ea" stroke-width="3"/><path d="M34 36c4-8 14-12 22-9" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M50 26l6 12-8 6 10 10-6 10" stroke="#3b6fa3" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>`,
  receipt: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M28 6h44v84l-5-4-6 4-6-4-5 4-6-4-5 4-6-4-5 4z" fill="#fff" stroke="#ccc" stroke-width="1.5"/><text x="50" y="22" font-size="7" text-anchor="middle" font-family="monospace" fill="#222">BIG BOX GUY</text><g stroke="#bbb" stroke-width="2"><path d="M34 32h32M34 40h24M34 48h30M34 56h20"/></g><text x="50" y="72" font-size="8" text-anchor="middle" font-family="monospace" font-weight="bold" fill="#222">TOTAL $0.00</text><text x="50" y="81" font-size="5" text-anchor="middle" font-family="monospace" fill="#666">THANK YOU</text></svg>`,
  manual: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M22 14h56v72H22z" fill="#f4efe4" stroke="#c9bfa8" stroke-width="2"/><path d="M22 14h8v72h-8z" fill="#c8322b"/><text x="54" y="34" font-size="9" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#222">MANUAL</text><text x="54" y="80" font-size="5" text-anchor="middle" font-family="sans-serif" fill="#888">p. 1 of 1</text></svg>`,
  cat: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="52" cy="68" rx="26" ry="18" fill="#e8963e"/><path d="M76 70c10-2 16-12 10-20" stroke="#e8963e" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="40" cy="46" r="18" fill="#e8963e"/><path d="M26 38l-2-16 14 8zM54 38l2-16-14 8z" fill="#e8963e"/><path d="M28 40l-1-9 7 4zM52 40l1-9-7 4z" fill="#f7c59b"/><circle cx="34" cy="46" r="2.8" fill="#222"/><circle cx="46" cy="46" r="2.8" fill="#222"/><path d="M40 51l-2.5 3h5z" fill="#c8322b"/><path d="M37 54q3 3 6 0" stroke="#222" stroke-width="1.5" fill="none"/><g stroke="#222" stroke-width="1.2"><path d="M22 50h10M22 54h10M48 50h10M48 54h10"/></g><g stroke="#c87a2a" stroke-width="3" stroke-linecap="round"><path d="M46 56v8M56 58v8M66 62v6"/></g></svg>`,
  guy: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><g stroke="#2b2117" stroke-width="4.5" stroke-linecap="round" fill="none"><path d="M22 60L8 44M78 60l14-20"/><path d="M36 86l-3 24M64 86l3 24"/></g><rect x="20" y="30" width="60" height="56" rx="3" fill="#c99b5e" stroke="#a57a3d" stroke-width="3"/><rect x="45" y="30" width="10" height="56" fill="#f6e5ac" opacity=".9"/><circle cx="37" cy="52" r="4.2" fill="#2b2117"/><circle cx="63" cy="52" r="4.2" fill="#2b2117"/><path d="M36 67q14 12 28 0" stroke="#2b2117" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="31" cy="112" rx="9" ry="4" fill="#2b2117"/><ellipse cx="69" cy="112" rx="9" ry="4" fill="#2b2117"/></svg>`,
  trout: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 50c14-18 40-26 62-16 8 4 14 10 16 16-2 6-8 12-16 16-22 10-48 2-62-16z" fill="#7fa37a"/><path d="M14 50c14-10 40-14 60-8 6 2 10 5 12 8-2 3-6 6-12 8-20 6-46 2-60-8z" fill="#f0a3a0" opacity=".8"/><path d="M18 50c14-6 40-10 58-6" stroke="#dfe8e2" stroke-width="6" stroke-linecap="round" fill="none" opacity=".8"/><path d="M12 50L0 36v28z" fill="#5f8a5c"/><path d="M48 36l8-12 4 14zM50 64l8 12 4-14z" fill="#5f8a5c"/><g fill="#3f5f3d"><circle cx="30" cy="44" r="1.8"/><circle cx="42" cy="40" r="1.8"/><circle cx="56" cy="42" r="1.8"/><circle cx="38" cy="58" r="1.8"/><circle cx="52" cy="60" r="1.8"/><circle cx="66" cy="54" r="1.8"/></g><circle cx="78" cy="46" r="4" fill="#fff"/><circle cx="79" cy="46" r="2" fill="#111"/><path d="M84 54q3 2 4-1" stroke="#3f5f3d" stroke-width="1.5" fill="none"/></svg>`,
};

export function dropSVG(id) { return ART[id] || ''; }
