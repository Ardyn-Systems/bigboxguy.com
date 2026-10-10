// The certificate. Box 100. Maximally official.
import { drawBox } from './draw.js';

async function fonts() {
  if (!document.fonts || !document.fonts.load) return;
  await Promise.all([
    document.fonts.load("110px 'Permanent Marker'"),
    document.fonts.load("64px 'Homemade Apple'"),
    document.fonts.load('600 26px Rubik'),
    document.fonts.load('italic 34px Rubik'),
  ]).catch(() => {});
}

function center(ctx, text, x, y) { ctx.textAlign = 'center'; ctx.fillText(text, x, y); }

export async function renderCertificate({ name, date, serial }) {
  await fonts();
  const W = 1600, H = 1131;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // paper
  ctx.fillStyle = '#f7f0df';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.025)';
  for (let i = -H; i < W + H; i += 14) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.022)'; ctx.stroke();
  }
  // borders
  ctx.strokeStyle = '#a57a3d'; ctx.lineWidth = 18; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = '#c99b5e'; ctx.lineWidth = 4; ctx.strokeRect(72, 72, W - 144, H - 144);
  // corner tape
  ctx.fillStyle = 'rgba(246,229,172,.9)';
  [[0, 0, 1], [W, 0, -1], [0, H, 1], [W, H, -1]].forEach(([x, y, d], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i < 2 ? 1 : -1) * d * Math.PI / 4);
    ctx.fillRect(-70, 40, 140, 36);
    ctx.restore();
  });
  // boxes in the corners
  drawBox(ctx, 120, 118, 120, 0.35);
  drawBox(ctx, W - 240, 118, 120, 0);

  // header
  ctx.fillStyle = '#6f5d47';
  ctx.font = '600 26px Rubik';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '9px';
  center(ctx, 'CERTIFICATE OF ACHIEVEMENT', W / 2, 190);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  ctx.fillStyle = '#2b2117';
  ctx.font = "112px 'Permanent Marker'";
  center(ctx, 'CERTIFIED BIG BOX GUY', W / 2, 330);

  ctx.fillStyle = '#6f5d47';
  ctx.font = 'italic 36px Rubik';
  center(ctx, 'Association of Guys who love Box', W / 2, 392);

  // ribbon rule
  ctx.strokeStyle = '#a57a3d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(500, 425); ctx.lineTo(1100, 425); ctx.stroke();

  ctx.fillStyle = '#2b2117';
  ctx.font = '30px Rubik';
  center(ctx, 'This certifies that', W / 2, 490);

  ctx.font = "78px 'Permanent Marker'";
  const nm = (name || 'A Guy').slice(0, 28);
  center(ctx, nm, W / 2, 580);
  ctx.strokeStyle = '#2b2117'; ctx.lineWidth = 3;
  const nw = Math.max(420, ctx.measureText(nm).width + 80);
  ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 600); ctx.lineTo(W / 2 + nw / 2, 600); ctx.stroke();

  ctx.font = '30px Rubik';
  center(ctx, 'has personally loved one hundred (100) boxes, of every shape and size, gone all the way in, and asked for nothing in return.', W / 2, 660);
  center(ctx, 'They did not stop. Nobody asked them to. They are, henceforth and forever, a Big Box Guy.', W / 2, 704);

  // seal
  const sx = 360, sy = 905;
  const sg = ctx.createRadialGradient(sx - 20, sy - 25, 10, sx, sy, 100);
  sg.addColorStop(0, '#ffe08a'); sg.addColorStop(1, '#d9a62a');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = sg;
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r = i % 2 ? 100 : 90;
    ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#8f6a16'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(sx, sy, 72, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#5d4037';
  ctx.font = "54px 'Permanent Marker'";
  center(ctx, '100', sx, sy + 8);
  ctx.font = '700 16px Rubik';
  center(ctx, 'BOXES', sx, sy + 36);
  ctx.font = '700 13px Rubik';
  center(ctx, 'A.G.W.L.B.', sx, sy - 40);

  // signature
  const cx = 1180;
  ctx.save();
  ctx.translate(cx, 915);
  ctx.rotate(-0.05);
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
  ctx.font = '19px Rubik';
  center(ctx, 'Founding Guy, Association of Guys who love Box', cx, 1006);

  // date + serial
  ctx.fillStyle = '#6f5d47';
  ctx.font = '18px Rubik';
  ctx.textAlign = 'center';
  ctx.fillText(`Issued ${date}`, W / 2 + 40, 950);
  ctx.fillText(`Certificate No. ${serial}`, W / 2 + 40, 978);
  ctx.font = 'italic 15px Rubik';
  ctx.fillText('Valid in all boxes.', W / 2 + 40, 1006);
  return c;
}
