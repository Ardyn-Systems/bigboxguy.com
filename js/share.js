// "I opened N boxes and all I found was this box."
import { drawBox } from './draw.js';

export function shareText(opened) {
  return `I have loved ${Number(opened).toLocaleString('en-US')} boxes. Every shape. Every size. bigboxguy.com`;
}

export async function renderShare({ opened }) {
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load("150px 'Permanent Marker'"),
      document.fonts.load('500 44px Rubik'),
    ]).catch(() => {});
  }
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1e7d2';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,.025)'; ctx.lineWidth = 3;
  for (let i = -H; i < W + H; i += 14) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  ctx.strokeStyle = '#a57a3d'; ctx.lineWidth = 10;
  ctx.setLineDash([22, 14]);
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.setLineDash([]);

  drawBox(ctx, 80, 130, 380, 1, { inner: true, label: false });

  const x = 540;
  ctx.fillStyle = '#2b2117';
  ctx.textAlign = 'left';
  ctx.font = '500 44px Rubik';
  ctx.fillText('I have loved', x, 150);
  ctx.font = "150px 'Permanent Marker'";
  const n = Number(opened).toLocaleString('en-US');
  let size = 150;
  while (ctx.measureText(n).width > 600 && size > 60) { size -= 10; ctx.font = `${size}px 'Permanent Marker'`; }
  ctx.fillText(n, x, 290);
  ctx.font = '500 44px Rubik';
  ctx.fillText(opened === 1 ? 'box' : 'boxes', x, 350);
  ctx.font = "48px 'Permanent Marker'";
  ctx.fillText('Every shape.', x, 440);
  ctx.fillText('Every size.', x, 500);
  ctx.fillStyle = '#c8322b';
  ctx.font = '700 32px Rubik';
  ctx.textAlign = 'right';
  ctx.fillText('bigboxguy.com', W - 60, H - 56);
  return c;
}
