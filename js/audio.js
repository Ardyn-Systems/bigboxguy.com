// Every sound on the site is synthesized here. No audio files, no downloads, just a box.
let ctx = null;
let muted = false;
let strainOsc = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) { muted = !!m; if (muted) strain(false); }
export function isMuted() { return muted; }

function noise(c, seconds) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(c, node, t0, a, d, peak = 1) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  node.connect(g);
  g.connect(c.destination);
  return g;
}

const SFX = {
  // Cardboard flaps opening. Low noise with a thump.
  fwump(c, t) {
    const n = noise(c, 0.45);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.4);
    n.connect(f);
    env(c, f, t, 0.02, 0.4, 0.5);
    n.start(t); n.stop(t + 0.5);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    env(c, o, t, 0.01, 0.28, 0.35);
    o.start(t); o.stop(t + 0.3);
  },
  // Tape being torn off.
  rip(c, t) {
    const n = noise(c, 0.28);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(3800, t + 0.22);
    n.connect(f);
    env(c, f, t, 0.01, 0.25, 0.4);
    n.start(t); n.stop(t + 0.3);
  },
  // Something's in there.
  rattle(c, t) {
    let tt = t;
    for (let i = 0; i < 7; i++) {
      const n = noise(c, 0.04);
      const f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1400 + Math.random() * 800;
      n.connect(f);
      env(c, f, tt, 0.004, 0.035, 0.35);
      n.start(tt); n.stop(tt + 0.05);
      tt += 0.055 + Math.random() * 0.04;
    }
  },
  pop(c, t) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    env(c, o, t, 0.004, 0.09, 0.5);
    o.start(t); o.stop(t + 0.1);
  },
  meow(c, t) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(900, t + 0.14);
    o.frequency.linearRampToValueAtTime(520, t + 0.42);
    const v = c.createOscillator(); v.frequency.value = 9;
    const vg = c.createGain(); vg.gain.value = 18;
    v.connect(vg); vg.connect(o.frequency);
    env(c, o, t, 0.03, 0.42, 0.25);
    o.start(t); o.stop(t + 0.46); v.start(t); v.stop(t + 0.46);
  },
  // Wet slaps. A trout.
  flop(c, t) {
    let tt = t;
    for (let i = 0; i < 4; i++) {
      const n = noise(c, 0.12);
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, tt);
      f.frequency.exponentialRampToValueAtTime(200, tt + 0.1);
      n.connect(f);
      env(c, f, tt, 0.005, 0.11, 0.55);
      n.start(tt); n.stop(tt + 0.13);
      tt += 0.26;
    }
  },
  // Paper flutter.
  paper(c, t) {
    const n = noise(c, 0.5);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2; f.frequency.value = 2600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 5; i++) {
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.1 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.002, t + i * 0.1 + 0.09);
    }
    n.connect(f); f.connect(g); g.connect(c.destination);
    n.start(t); n.stop(t + 0.55);
  },
  // Little guy says hi.
  hi(c, t) {
    [520, 660].forEach((hz, i) => {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = hz;
      env(c, o, t + i * 0.12, 0.01, 0.1, 0.08);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.12);
    });
  },
  // Lean in.
  whoosh(c, t) {
    const n = noise(c, 0.9);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(220, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.7);
    n.connect(f);
    env(c, f, t, 0.25, 0.6, 0.25);
    n.start(t); n.stop(t + 0.95);
  },
  // Certificate earned.
  tada(c, t) {
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz;
      const start = t + i * 0.11;
      env(c, o, start, 0.01, i === 3 ? 0.7 : 0.25, 0.22);
      o.start(start); o.stop(start + 0.8);
    });
  },
  // Back button. Disapproval.
  thunk(c, t) {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    env(c, o, t, 0.005, 0.2, 0.18);
    o.start(t); o.stop(t + 0.22);
  },
  // Skipping. A tut.
  tut(c, t) {
    [0, 0.13].forEach((d) => {
      const n = noise(c, 0.03);
      const f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 3000;
      n.connect(f);
      env(c, f, t + d, 0.003, 0.03, 0.4);
      n.start(t + d); n.stop(t + d + 0.04);
    });
  },
};

export function sfx(name) {
  if (muted) return;
  const c = ac();
  if (!c || !SFX[name]) return;
  try { SFX[name](c, c.currentTime); } catch (e) { /* audio is optional */ }
}

// Continuous groan while the box resists being opened.
export function strain(on) {
  if (!on) {
    if (strainOsc) {
      try {
        const c = ac();
        strainOsc.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08);
        strainOsc.o.stop(c.currentTime + 0.1);
      } catch (e) {}
      strainOsc = null;
    }
    return;
  }
  if (muted || strainOsc) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(48, c.currentTime);
  o.frequency.linearRampToValueAtTime(78, c.currentTime + 1.6);
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 320;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.3);
  o.connect(f); f.connect(g); g.connect(c.destination);
  o.start();
  strainOsc = { o, g };
}

// Called on first user gesture so browsers let us make noise.
export function unlock() { ac(); }
