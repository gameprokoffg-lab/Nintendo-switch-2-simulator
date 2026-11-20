'use strict';

const U = (() => {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.pow(1 - k, dt * 60));
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const sign = (v) => (v < 0 ? -1 : 1);

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }

  /* стилизованный знак Switch: две «половинки» с кругом-стиком */
  function drawMark(ctx, cx, cy, s, opt = {}) {
    const w = 100 * s, h = 100 * s;
    const x = cx - w / 2, y = cy - h / 2;
    const accent = opt.accent || '#19c3e8';
    const accent2 = opt.accent2 || '#ff4a57';
    const light = opt.light || '#f2f6fa';

    ctx.save();
    rr(ctx, x, y, w, h, 22 * s);
    ctx.fillStyle = opt.bg || 'rgba(255,255,255,.04)';
    ctx.fill();

    // левая половина
    ctx.save();
    rr(ctx, x, y, w, h, 22 * s);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 34 * s, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x, y, 34 * s, h);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.92;
    circle(ctx, x + 17 * s, y + 30 * s, 9 * s);
    ctx.fill();
    ctx.restore();

    // правая часть — контур и кнопки
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = light;
    ctx.globalAlpha = 0.9;
    rr(ctx, x + 44 * s, y + 16 * s, 40 * s, 68 * s, 20 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent2;
    circle(ctx, x + 64 * s, y + 34 * s, 7 * s);
    ctx.fill();
    ctx.fillStyle = light;
    circle(ctx, x + 64 * s, y + 66 * s, 5.5 * s);
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
  }

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function shadows(ctx, on, color = 'rgba(0,0,0,.5)', blur = 24, oy = 12) {
    if (!on) {
      ctx.shadowColor = 'transparent';
      return;
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = oy;
  }

  return { TAU, clamp, lerp, damp, rand, randInt, pick, dist, sign, rr, circle, drawMark, hexToRgba, shadows };
})();

/* ---------------------------------------------------------------
   Звук: всё синтезируется на лету, никаких внешних файлов.
   --------------------------------------------------------------- */
const Sfx = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function tone({ freq = 440, freq2 = null, type = 'sine', dur = 0.18, vol = 0.22, delay = 0, attack = 0.005, glide = 0 }) {
    if (!enabled || !init()) return;
    const t = now() + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freq2 !== null) {
      if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + glide);
      else o.frequency.setValueAtTime(freq2, t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.16, vol = 0.25, delay = 0, type = 'highpass', freq = 1200, q = 0.9 }) {
    if (!enabled || !init()) return;
    const t = now() + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  const api = {
    unlock() {
      init();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setEnabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? 0.5 : 0;
    },
    get enabled() {
      return enabled;
    },
    /* магнит отпустил */
    detach() {
      noise({ dur: 0.09, vol: 0.3, freq: 2400, type: 'highpass' });
      tone({ freq: 320, freq2: 150, type: 'triangle', dur: 0.13, vol: 0.16, glide: 0.12 });
    },
    /* магнит схватил */
    attach(side) {
      noise({ dur: 0.07, vol: 0.22, freq: 3000 });
      tone({ freq: side === 'L' ? 520 : 700, type: 'sine', dur: 0.1, vol: 0.2 });
      tone({ freq: side === 'L' ? 1040 : 1400, type: 'sine', dur: 0.14, vol: 0.09, delay: 0.03 });
    },
    pick() {
      tone({ freq: 220, freq2: 340, type: 'sine', dur: 0.07, vol: 0.1, glide: 0.06 });
    },
    drop() {
      noise({ dur: 0.1, vol: 0.16, freq: 900, type: 'lowpass' });
    },
    /* кнопка на джойконе */
    btn() {
      tone({ freq: 880, type: 'square', dur: 0.045, vol: 0.06 });
    },
    move() {
      tone({ freq: 1200, type: 'sine', dur: 0.04, vol: 0.05 });
    },
    ok() {
      tone({ freq: 660, type: 'triangle', dur: 0.07, vol: 0.14 });
      tone({ freq: 990, type: 'triangle', dur: 0.1, vol: 0.1, delay: 0.055 });
    },
    back() {
      tone({ freq: 520, freq2: 320, type: 'triangle', dur: 0.09, vol: 0.1, glide: 0.08 });
    },
    error() {
      tone({ freq: 200, type: 'square', dur: 0.12, vol: 0.1 });
      tone({ freq: 150, type: 'square', dur: 0.16, vol: 0.08, delay: 0.09 });
    },
    /* включение — собственная короткая фраза */
    boot() {
      const seq = [523.25, 659.25, 783.99, 1046.5];
      seq.forEach((f, i) => {
        tone({ freq: f, type: 'sine', dur: 1.5, vol: 0.13, delay: i * 0.135, attack: 0.02 });
        tone({ freq: f * 2, type: 'triangle', dur: 1.0, vol: 0.035, delay: i * 0.135 });
      });
      noise({ dur: 0.9, vol: 0.05, freq: 500, type: 'lowpass', delay: 0.05 });
    },
    off() {
      tone({ freq: 520, freq2: 130, type: 'sine', dur: 0.45, vol: 0.16, glide: 0.4 });
    },
    dock() {
      noise({ dur: 0.14, vol: 0.32, freq: 700, type: 'lowpass' });
      tone({ freq: 140, freq2: 90, type: 'sine', dur: 0.3, vol: 0.22, glide: 0.25 });
      tone({ freq: 660, type: 'sine', dur: 0.22, vol: 0.1, delay: 0.18 });
      tone({ freq: 880, type: 'sine', dur: 0.3, vol: 0.08, delay: 0.26 });
    },
    plug() {
      noise({ dur: 0.06, vol: 0.25, freq: 2600 });
      tone({ freq: 380, type: 'square', dur: 0.06, vol: 0.08 });
    },
    tvOn() {
      noise({ dur: 0.5, vol: 0.07, freq: 3000, type: 'highpass' });
      tone({ freq: 220, freq2: 660, type: 'sine', dur: 0.35, vol: 0.1, glide: 0.3 });
    },
    cart() {
      noise({ dur: 0.09, vol: 0.22, freq: 1800 });
      tone({ freq: 500, freq2: 760, type: 'triangle', dur: 0.12, vol: 0.12, glide: 0.1 });
    },
    explode() {
      noise({ dur: 0.55, vol: 0.4, freq: 420, type: 'lowpass' });
      tone({ freq: 90, freq2: 40, type: 'sine', dur: 0.5, vol: 0.25, glide: 0.45 });
    },
    shoot() {
      tone({ freq: 900, freq2: 300, type: 'sawtooth', dur: 0.09, vol: 0.06, glide: 0.08 });
    },
  };

  return api;
})();
