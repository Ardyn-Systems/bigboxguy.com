// Draws a box on a canvas. Used by the certificate and the share image.
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// open: 0 = sealed, 1 = flaps fully folded away.
export function drawBox(ctx, x, y, s, open = 0, opts = {}) {
  const wall = s * 0.055;
  ctx.save();
  ctx.shadowColor = 'rgba(40,25,5,.3)';
  ctx.shadowBlur = s * 0.14;
  ctx.shadowOffsetY = s * 0.06;
  ctx.fillStyle = '#8a6130';
  rr(ctx, x, y, s, s, s * 0.03);
  ctx.fill();
  ctx.restore();

  const g = ctx.createRadialGradient(x + s / 2, y + s * 0.4, s * 0.05, x + s / 2, y + s / 2, s * 0.72);
  g.addColorStop(0, '#5e4423');
  g.addColorStop(1, '#241708');
  ctx.fillStyle = g;
  ctx.fillRect(x + wall, y + wall, s - 2 * wall, s - 2 * wall);

  if (opts.inner) {
    const is = s * 0.6;
    drawBox(ctx, x + (s - is) / 2, y + (s - is) / 2, is, 0, { label: true });
  }

  const fh = (s / 2) * (1 - open);
  if (fh > 0.5) {
    const kg = ctx.createLinearGradient(x, y, x, y + s / 2);
    kg.addColorStop(0, '#dfb67f'); kg.addColorStop(0.55, '#c99b5e'); kg.addColorStop(1, '#a57a3d');
    ctx.fillStyle = kg;
    ctx.fillRect(x, y, s, fh);
    const kg2 = ctx.createLinearGradient(x, y + s, x, y + s / 2);
    kg2.addColorStop(0, '#dfb67f'); kg2.addColorStop(0.55, '#c99b5e'); kg2.addColorStop(1, '#a57a3d');
    ctx.fillStyle = kg2;
    ctx.fillRect(x, y + s - fh, s, fh);
    // corrugation hint
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = x + s * 0.02; i < x + s; i += s * 0.035) {
      ctx.fillRect(i, y, s * 0.012, fh);
      ctx.fillRect(i, y + s - fh, s * 0.012, fh);
    }
  }
  if (open < 0.05) {
    ctx.fillStyle = 'rgba(246,229,172,.92)';
    ctx.fillRect(x + s * 0.435, y + s * 0.18, s * 0.13, s * 0.64);
    ctx.strokeStyle = 'rgba(150,120,50,.5)';
    ctx.lineWidth = Math.max(1, s * 0.004);
    ctx.strokeRect(x + s * 0.435, y + s * 0.18, s * 0.13, s * 0.64);
  }
  if (opts.label !== false && fh > s * 0.3) {
    ctx.save();
    ctx.translate(x + s * 0.09, y + s * 0.1);
    ctx.rotate(-0.045);
    ctx.fillStyle = '#fffaf0';
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = s * 0.02; ctx.shadowOffsetY = s * 0.008;
    ctx.fillRect(0, 0, s * 0.5, s * 0.27);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.lineCap = 'round';
    [0.07, 0.13, 0.19].forEach((f, i) => {
      ctx.beginPath();
      ctx.moveTo(s * 0.05, s * f);
      ctx.lineTo(s * (i === 1 ? 0.3 : 0.42), s * f);
      ctx.stroke();
    });
    ctx.restore();
  }
}
