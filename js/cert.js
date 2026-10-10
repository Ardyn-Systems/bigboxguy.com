// The certificates. Issued by the Association of Guys who love Box. Maximally official.
import { drawBox } from './draw.js?v=20261010b';

// Each tier: the box count that earns it, and the wording. Higher is better.
export const CERT_TIERS = [
  {
    at: 100, prefix: 'BBG', title: 'CERTIFIED BIG BOX GUY', honor: 'Association of Guys who love Box',
    body: 'has personally loved one hundred (100) boxes, of every shape and size, gone all the way in, and asked for nothing in return. They did not stop. Nobody asked them to. They are, henceforth and forever, a Big Box Guy.',
    seal: ['100', 'BOXES'], palette: ['#ffe08a', '#d9a62a', '#8f6a16'], ribbons: 0,
    quip: 'One hundred boxes, loved. Deeply. You have been certified. This was not optional.',
    file: 'certified-big-box-guy',
  },
  {
    at: 500, prefix: 'DBG', title: 'DISTINGUISHED BIG BOX GUY', honor: 'Association of Guys who love Box · Order of the Open Flap',
    body: 'has loved five hundred (500) boxes with a tenderness the Association describes, in writing, as "frankly a lot." Their hands are steady. Their tape is never dry. They are hereby Distinguished.',
    seal: ['500', 'DISTINGUISHED'], palette: ['#f4f4f4', '#b9bec7', '#6b7280'], ribbons: 1,
    quip: 'Five hundred. The Association has upgraded you. Please stop opening boxes long enough to read this.',
    file: 'distinguished-big-box-guy',
  },
  {
    at: 1000, prefix: 'MBG', title: 'MASTER BIG BOX GUY', honor: 'Association of Guys who love Box · Masters Division',
    body: 'has loved one thousand (1,000) boxes, survived the Box Shortage, and has very likely met the Trout Box. Boxes now open slightly before they are touched. This is documented. They are a Master.',
    seal: ['1,000', 'MASTER'], palette: ['#ffe08a', '#d9a62a', '#8f6a16'], ribbons: 2,
    quip: 'One thousand. You are a Master now. Boxes will begin opening slightly before you touch them.',
    file: 'master-big-box-guy',
  },
  {
    at: 2500, prefix: 'GMB', title: 'GRAND MASTER OF BOX', honor: 'Association of Guys who love Box · Inner Circle',
    body: 'has loved two thousand five hundred (2,500) boxes and has stopped counting, which is why we count for them. Cardboard trembles at their approach. Tape surrenders. They are a Grand Master.',
    seal: ['2,500', 'GRAND MASTER'], palette: ['#f8d7da', '#c8322b', '#7a1d18'], ribbons: 2,
    quip: 'Two thousand five hundred. Grand Master. The Inner Circle has a chair with your name on it. It is a box.',
    file: 'grand-master-of-box',
  },
  {
    at: 10000, prefix: 'LBG', title: 'LEGENDARY BIG BOX GUY', honor: 'Association of Guys who love Box · Hall of Box',
    body: 'has loved ten thousand (10,000) boxes. The Association has reviewed the footage and would like to lie down. There is nothing left to teach them. They are Legendary, and they are not done.',
    seal: ['10,000', 'LEGEND'], palette: ['#e8d5ff', '#8e44ad', '#4a148c'], ribbons: 3,
    quip: 'Ten thousand. Legendary. Someone at the Association has fainted. We think it was Justin.',
    file: 'legendary-big-box-guy',
  },
  {
    at: 25000, prefix: 'EMB', title: 'BOX EMERITUS', honor: 'Association of Guys who love Box · Emeritus Council',
    body: 'has loved twenty-five thousand (25,000) boxes and is now consulted by other boxes on matters of box. They have been offered retirement. They declined. They had a box to open.',
    seal: ['25,000', 'EMERITUS'], palette: ['#d4f1f4', '#2b8a9b', '#134e5c'], ribbons: 3,
    quip: 'Twenty-five thousand. Emeritus. Other boxes consult you now. Be kind to them.',
    file: 'box-emeritus',
  },
  {
    at: 50000, prefix: 'PSB', title: 'PATRON SAINT OF BOX', honor: 'Association of Guys who love Box · Canonized',
    body: 'has loved fifty thousand (50,000) boxes. Miracles have been reported, and every one of them involved a box. Guys who love box now say this name before opening a difficult flap. It helps.',
    seal: ['50,000', 'SAINT'], palette: ['#fff5cc', '#f1c232', '#b8860b'], ribbons: 4,
    quip: 'Fifty thousand. Canonized. Guys say your name before difficult flaps now.',
    file: 'patron-saint-of-box',
  },
  {
    at: 100000, prefix: 'CEN', title: 'BIG BOX GUY OF THE CENTURY', honor: 'Association of Guys who love Box · Special Session',
    body: 'has loved one hundred thousand (100,000) boxes. The Association voted unanimously, then wept, then voted again. Justin Box has asked that his own name be replaced with this one. Request pending.',
    seal: ['100,000', 'CENTURY'], palette: ['#e0f2e9', '#2e7d32', '#1b4d1f'], ribbons: 4,
    quip: 'One hundred thousand. Big Box Guy of the Century. The century is honored.',
    file: 'big-box-guy-of-the-century',
  },
  {
    at: 1000000, prefix: 'BOX', title: 'THE BOX', honor: 'Association of Guys who love Box · Final Form',
    body: 'has loved one million (1,000,000) boxes and, somewhere along the way, became box. There is no certificate above this one. There is no box above this one. There is only box.',
    seal: ['1,000,000', 'BOX'], palette: ['#dfb67f', '#c99b5e', '#8a6130'], ribbons: 5,
    quip: 'One million. You are the box now. There is nothing else to say. We said it anyway.',
    file: 'the-box',
  },
];
export const tierAt = (at) => CERT_TIERS.find((t) => t.at === at);

async function fonts() {
  if (!document.fonts || !document.fonts.load) return;
  await Promise.all([
    document.fonts.load("110px 'Permanent Marker'"),
    document.fonts.load("64px 'Homemade Apple'"),
    document.fonts.load('600 26px Rubik'),
    document.fonts.load('italic 34px Rubik'),
    document.fonts.load('700 24px Rubik'),
  ]).catch(() => {});
}

// Shrink the font until the text fits the width. Leaves ctx.font set. Returns the size used.
function fit(ctx, text, maxWidth, family, size, minSize, weight = '') {
  for (let s = size; s >= minSize; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxWidth) return s;
  }
  ctx.font = `${weight} ${minSize}px ${family}`.trim();
  return minSize;
}
// Word-wrap at the current font.
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function center(ctx, text, x, y) { ctx.textAlign = 'center'; ctx.fillText(text, x, y); }

export async function renderCertificate({ tier, name, date, serial }) {
  await fonts();
  const t = tier || CERT_TIERS[0];
  const W = 1600, H = 1131;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const [light, mid, dark] = t.palette;

  // paper
  ctx.fillStyle = '#f7f0df';
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.022)';
  for (let i = -H; i < W + H; i += 14) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  // borders, inner one tinted by tier
  ctx.strokeStyle = '#a57a3d'; ctx.lineWidth = 18; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = mid; ctx.lineWidth = 4; ctx.strokeRect(72, 72, W - 144, H - 144);
  // corner tape
  ctx.fillStyle = 'rgba(246,229,172,.9)';
  [[0, 0, 1], [W, 0, -1], [0, H, 1], [W, H, -1]].forEach(([x, y, d], i) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate((i < 2 ? 1 : -1) * d * Math.PI / 4); ctx.fillRect(-70, 40, 140, 36); ctx.restore();
  });
  drawBox(ctx, 120, 118, 120, 0.35);
  drawBox(ctx, W - 240, 118, 120, 0);

  // header
  ctx.fillStyle = '#6f5d47';
  ctx.font = '600 26px Rubik';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '9px';
  center(ctx, 'CERTIFICATE OF ACHIEVEMENT', W / 2, 190);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // title, sits below the corner boxes so it may use nearly the full width
  ctx.fillStyle = '#2b2117';
  fit(ctx, t.title, W - 220, "'Permanent Marker'", 112, 56);
  center(ctx, t.title, W / 2, 330);

  ctx.fillStyle = '#6f5d47';
  fit(ctx, t.honor, W - 300, 'Rubik', 36, 22, 'italic');
  center(ctx, t.honor, W / 2, 392);

  ctx.strokeStyle = mid; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(500, 425); ctx.lineTo(1100, 425); ctx.stroke();

  ctx.fillStyle = '#2b2117';
  ctx.font = '30px Rubik';
  center(ctx, 'This certifies that', W / 2, 490);

  // name, shrunk to fit
  const nm = (name || 'A Guy').slice(0, 28);
  fit(ctx, nm, 820, "'Permanent Marker'", 78, 40);
  center(ctx, nm, W / 2, 580);
  ctx.strokeStyle = '#2b2117'; ctx.lineWidth = 3;
  const nw = Math.max(420, ctx.measureText(nm).width + 80);
  ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 600); ctx.lineTo(W / 2 + nw / 2, 600); ctx.stroke();

  // body: wrapped, shrunk until it fits in three lines
  const bodyWidth = W - 320;
  let size = 30, lines = [];
  for (; size >= 20; size -= 2) {
    ctx.font = `${size}px Rubik`;
    lines = wrap(ctx, t.body, bodyWidth);
    if (lines.length <= 3) break;
  }
  const lh = size * 1.45;
  const startY = 700 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => center(ctx, l, W / 2, startY + i * lh));

  // seal, with ribbons for the higher tiers
  const sx = 360, sy = 905;
  for (let r = 0; r < t.ribbons; r++) {
    ctx.save();
    ctx.translate(sx, sy + 40);
    ctx.rotate((r - (t.ribbons - 1) / 2) * 0.28);
    ctx.fillStyle = r % 2 ? dark : mid;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.lineTo(22, 150); ctx.lineTo(0, 128); ctx.lineTo(-22, 150); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const sg = ctx.createRadialGradient(sx - 20, sy - 25, 10, sx, sy, 100);
  sg.addColorStop(0, light); sg.addColorStop(1, mid);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = sg;
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const rr = i % 2 ? 100 : 90;
    ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(sx, sy, 72, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = dark;
  fit(ctx, t.seal[0], 120, "'Permanent Marker'", 54, 26);
  center(ctx, t.seal[0], sx, sy + 8);
  fit(ctx, t.seal[1], 110, 'Rubik', 16, 10, '700');
  center(ctx, t.seal[1], sx, sy + 36);
  ctx.font = '700 13px Rubik';
  center(ctx, 'A.G.W.L.B.', sx, sy - 40);

  // signature
  const cx = 1180;
  ctx.save();
  ctx.translate(cx, 915); ctx.rotate(-0.05);
  ctx.fillStyle = '#1d2a6b';
  ctx.font = "62px 'Homemade Apple'";
  center(ctx, 'Justin Box', 0, 0);
  ctx.strokeStyle = '#1d2a6b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-150, 18); ctx.bezierCurveTo(-60, 30, 60, 4, 170, 20); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#2b2117'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 230, 945); ctx.lineTo(cx + 230, 945); ctx.stroke();
  ctx.fillStyle = '#2b2117';
  ctx.font = '700 24px Rubik';
  center(ctx, 'Justin Box', cx, 978);
  ctx.fillStyle = '#6f5d47';
  const role = t.at >= 10000 ? 'Founding Guy, Association of Guys who love Box (visibly moved)' : 'Founding Guy, Association of Guys who love Box';
  fit(ctx, role, 470, 'Rubik', 19, 14);
  center(ctx, role, cx, 1006);

  // date + serial
  ctx.fillStyle = '#6f5d47';
  ctx.font = '18px Rubik';
  center(ctx, `Issued ${date}`, W / 2 - 30, 950);
  center(ctx, `Certificate No. ${serial}`, W / 2 - 30, 978);
  ctx.font = 'italic 15px Rubik';
  center(ctx, t.at >= 1000000 ? 'Valid in all boxes. Is all boxes.' : 'Valid in all boxes.', W / 2 - 30, 1006);
  return c;
}
