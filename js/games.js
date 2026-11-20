'use strict';

/* =====================================================================
   Рантайм игр: Space Survivor + игры из картриджей
   ===================================================================== */
const GameRuntime = (() => {
  const W = 1280, H = 720;

  function readBest() {
    try { return +(localStorage.getItem('switch2.ss.best') || 0) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem('switch2.ss.best', String(Math.floor(v))); } catch (e) { /* ignore */ }
  }

  /* ------------------------------ Space Survivor ------------------------------ */
  function spaceSurvivor(canvas, ctx) {
    const g = {
      mode: 'intro',
      t: 0,
      rocket: { x: W / 2, y: H - 150, vx: 0, vy: 0, r: 26, thrust: 0 },
      rocks: [],
      stars: [],
      bits: [],
      spawn: 0,
      score: 0,
      best: readBest(),
      shake: 0,
      flash: 0,
      pointer: null,
    };

    for (let i = 0; i < 130; i++) {
      g.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.25 + Math.random() * 0.9, r: 0.6 + Math.random() * 1.6 });
    }

    function reset() {
      g.rocket = { x: W / 2, y: H - 150, vx: 0, vy: 0, r: 26, thrust: 0 };
      g.rocks = [];
      g.bits = [];
      g.score = 0;
      g.spawn = 0.6;
      g.flash = 0;
      g.shake = 0;
      g.mode = 'play';
    }

    function spawnRock() {
      const r = U.rand(16, 44);
      const edge = Math.random() < 0.72;
      const x = edge ? U.rand(60, W - 60) : (Math.random() < 0.5 ? -60 : W + 60);
      const speed = U.rand(170, 300) + Math.min(260, g.score * 1.5);
      g.rocks.push({
        x, y: -70, r,
        vx: U.rand(-70, 70) + (edge ? 0 : (x < 0 ? 90 : -90)),
        vy: speed,
        rot: U.rand(0, U.TAU),
        vr: U.rand(-2.4, 2.4),
        pts: Array.from({ length: 9 }, () => 0.72 + Math.random() * 0.42),
      });
    }

    function boom(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * U.TAU;
        const sp = U.rand(40, 420);
        g.bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rand(0.3, 0.9), t: 0, r: U.rand(1.5, 4), col: col || '#ffb45c' });
      }
    }

    g.start = () => {
      g.mode = 'intro';
      g.t = 0;
    };

    g.destroy = () => {};

    g.update = (dt, input) => {
      dt = Math.min(dt, 0.05);
      g.t += dt;
      for (const s of g.stars) {
        s.y += (12 + s.z * 60) * dt * (g.mode === 'play' ? 1 : 0.4);
        if (s.y > H) { s.y = -4; s.x = Math.random() * W; }
      }
      g.shake = Math.max(0, g.shake - dt * 3);
      g.flash = Math.max(0, g.flash - dt * 2.4);

      for (let i = g.bits.length - 1; i >= 0; i--) {
        const b = g.bits[i];
        b.t += dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.vx *= 0.97; b.vy *= 0.97;
        if (b.t > b.life) g.bits.splice(i, 1);
      }

      if (g.mode !== 'play') {
        if (input.pressed.has('ok') || input.pressed.has('a') || input.pressed.has('start')) {
          Sfx.ok();
          reset();
        }
        return;
      }

      g.score += dt * 10;

      // управление
      const R = g.rocket;
      let ax = 0, ay = 0;
      const acc = 2100;
      if (input.held.has('left')) ax -= 1;
      if (input.held.has('right')) ax += 1;
      if (input.held.has('up')) ay -= 1;
      if (input.held.has('down')) ay += 1;

      R.vx += ax * acc * dt;
      R.vy += ay * acc * dt;
      // в космосе ракета всё время чуть «всплывает»
      R.vy -= 120 * dt;
      R.vx *= Math.pow(0.02, dt);
      R.vy *= Math.pow(0.02, dt);
      R.vx = U.clamp(R.vx, -520, 520);
      R.vy = U.clamp(R.vy, -520, 520);
      R.x += R.vx * dt;
      R.y += R.vy * dt;
      R.x = U.clamp(R.x, 40, W - 40);
      R.y = U.clamp(R.y, 60, H - 60);
      R.thrust = U.lerp(R.thrust, 0.6 + Math.hypot(R.vx, R.vy) / 900, 0.2);

      if (Math.random() < 0.7) {
        g.bits.push({ x: R.x + U.rand(-6, 6), y: R.y + 30, vx: U.rand(-40, 40), vy: U.rand(120, 260), life: 0.45, t: 0, r: U.rand(1.5, 3.5), col: '#7fe3ff' });
      }

      // спавн
      g.spawn -= dt;
      if (g.spawn <= 0) {
        g.spawn = Math.max(0.16, 0.72 - g.score * 0.0028);
        spawnRock();
        if (g.score > 120 && Math.random() < 0.35) spawnRock();
      }

      // метеоры
      for (let i = g.rocks.length - 1; i >= 0; i--) {
        const r = g.rocks[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.rot += r.vr * dt;
        if (r.y - r.r > H + 80 || r.x < -160 || r.x > W + 160) { g.rocks.splice(i, 1); continue; }
        if (U.dist(r.x, r.y, R.x, R.y) < r.r + R.r * 0.72) {
          boom(R.x, R.y, 46, '#ff8a5c');
          boom(R.x, R.y, 22, '#ffe4a8');
          Sfx.explode();
          g.flash = 1;
          g.shake = 1;
          g.best = Math.max(g.best, g.score);
          writeBest(g.best);
          g.mode = 'over';
        }
      }
    };

    g.draw = () => {
      ctx.save();
      const sx = (Math.random() - 0.5) * 22 * g.shake;
      const sy = (Math.random() - 0.5) * 22 * g.shake;
      ctx.translate(sx, sy);

      // фон
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 60, W * 0.5, H * 0.5, W * 0.75);
      bg.addColorStop(0, '#0d2233');
      bg.addColorStop(0.5, '#071320');
      bg.addColorStop(1, '#03070c');
      ctx.fillStyle = bg;
      ctx.fillRect(-40, -40, W + 80, H + 80);

      // звёзды
      for (const s of g.stars) {
        ctx.globalAlpha = 0.25 + s.z * 0.55;
        ctx.fillStyle = '#bfe6ff';
        ctx.fillRect(s.x, s.y, s.r, s.r * (1 + s.z));
      }
      ctx.globalAlpha = 1;

      // ракета
      const R = g.rocket;
      if (g.mode !== 'over') {
        ctx.save();
        ctx.translate(R.x, R.y);
        ctx.rotate(U.clamp(R.vx / 900, -0.4, 0.4));
        // пламя
        const fl = 26 + Math.sin(g.t * 40) * 6 + R.thrust * 20;
        const fg = ctx.createLinearGradient(0, 18, 0, 18 + fl);
        fg.addColorStop(0, 'rgba(255,240,180,.95)');
        fg.addColorStop(0.45, 'rgba(255,150,60,.8)');
        fg.addColorStop(1, 'rgba(255,60,40,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(-11, 16);
        ctx.quadraticCurveTo(0, 16 + fl, 11, 16);
        ctx.closePath();
        ctx.fill();

        // корпус
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.quadraticCurveTo(19, -8, 15, 18);
        ctx.lineTo(-15, 18);
        ctx.quadraticCurveTo(-19, -8, 0, -34);
        const body = ctx.createLinearGradient(-18, -30, 18, 20);
        body.addColorStop(0, '#f3f8fc');
        body.addColorStop(0.5, '#b9cbd8');
        body.addColorStop(1, '#6f8595');
        ctx.fillStyle = body;
        ctx.fill();
        // окно
        ctx.beginPath();
        ctx.arc(0, -8, 7.5, 0, U.TAU);
        ctx.fillStyle = '#19c3e8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-2.5, -10.5, 2.6, 0, U.TAU);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fill();
        // крылья
        ctx.fillStyle = '#ff4a57';
        ctx.beginPath();
        ctx.moveTo(-15, 4); ctx.lineTo(-27, 22); ctx.lineTo(-13, 18); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(15, 4); ctx.lineTo(27, 22); ctx.lineTo(13, 18); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // метеоры
      for (const r of g.rocks) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.beginPath();
        const n = r.pts.length;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * U.TAU;
          const rr = r.r * r.pts[i];
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        const rg = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.3, r.r * 0.15, 0, 0, r.r);
        rg.addColorStop(0, '#9aa7b2');
        rg.addColorStop(0.6, '#5d6a75');
        rg.addColorStop(1, '#333d46');
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-r.r * 0.28, -r.r * 0.2, r.r * 0.18, 0, U.TAU);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fill();
        ctx.restore();
      }

      // частицы
      for (const b of g.bits) {
        const k = 1 - b.t / b.life;
        ctx.globalAlpha = Math.max(0, k);
        ctx.fillStyle = b.col;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * k + 0.4, 0, U.TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = '700 28px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.floor(g.score)).padStart(5, '0'), 40, 62);
      ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(159,200,224,.8)';
      ctx.fillText('СЧЁТ', 40, 84);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('РЕКОРД ' + Math.floor(g.best), W - 40, 62);

      if (g.mode === 'intro') {
        ctx.fillStyle = 'rgba(3,7,12,.62)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 74px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('SPACE SURVIVOR', W / 2, H / 2 - 40);
        ctx.fillStyle = '#7fd8ff';
        ctx.font = '500 22px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Ракета одна, метеоров много. Продержитесь как можно дольше.', W / 2, H / 2 + 14);
        ctx.fillStyle = 'rgba(255,255,255,.65)';
        ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('СТИК / СТРЕЛКИ — ВЛЁТ   ·   A — СТАРТ', W / 2, H / 2 + 76);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Home — вернуться в меню консоли', W / 2, H - 44);
      }

      if (g.mode === 'over') {
        ctx.fillStyle = 'rgba(3,7,12,.72)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff6b76';
        ctx.font = '800 64px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('РАКЕТА УНИЧТОЖЕНА', W / 2, H / 2 - 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 40px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Счёт: ' + Math.floor(g.score), W / 2, H / 2 + 24);
        ctx.fillStyle = '#9fc8e0';
        ctx.font = '500 20px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Рекорд: ' + Math.floor(g.best), W / 2, H / 2 + 62);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('A — ЕЩЁ РАЗ    ·    Home — В МЕНЮ', W / 2, H / 2 + 128);
      }

      if (g.flash > 0) {
        ctx.fillStyle = `rgba(255,180,120,${g.flash * 0.45})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    };

    return g;
  }

  /* ------------------------------ пользовательская игра ------------------------------ */
  function customGame(entry, ctx) {
    const g = { mod: null, err: null, time: 0, api: null, entry };

    const apiObj = {
      width: W,
      height: H,
      time: 0,
      held: (k) => g.api.held.has(k),
      pressed: (k) => g.api.pressed.has(k),
    };
    g.api = { held: new Set(), pressed: new Set() };

    g.start = () => {
      g.time = 0;
      if (entry && entry.code) {
        try {
          const factory = new Function('"use strict";\n' + entry.code + '\n;return (typeof SwitchGame !== "undefined") ? SwitchGame : null;');
          const mod = factory();
          if (!mod || (typeof mod.update !== 'function' && typeof mod.draw !== 'function')) {
            throw new Error('В файле нет объекта SwitchGame с методами update/draw');
          }
          g.mod = mod;
          if (mod.start) mod.start(apiObj);
        } catch (e) {
          g.err = e.message || String(e);
        }
      }
    };

    g.destroy = () => {};

    g.update = (dt, input) => {
      g.time += dt;
      apiObj.time = g.time;
      g.api.held = input.held;
      g.api.pressed = input.pressed;
      if (g.err || !g.mod) return;
      try {
        if (g.mod.update) g.mod.update(Math.min(dt, 0.05), apiObj);
      } catch (e) {
        g.err = e.message || String(e);
      }
    };

    g.draw = () => {
      ctx.save();
      if (g.err) {
        ctx.fillStyle = '#160a0e';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff6b76';
        ctx.font = '800 40px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ИГРА НЕ ЗАПУСТИЛАСЬ', W / 2, H / 2 - 30);
        ctx.fillStyle = '#e6b6bd';
        ctx.font = '500 20px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(g.err.slice(0, 120), W / 2, H / 2 + 16);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Home — назад в меню', W / 2, H / 2 + 62);
        ctx.restore();
        return;
      }
      if (!g.mod) {
        // демо-картридж без кода
        const t = g.time;
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0a1a26');
        bg.addColorStop(1, '#120a1a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 90; i++) {
          const x = (i * 173 + t * (20 + (i % 7) * 9)) % (W + 40) - 20;
          const y = (i * 271) % H;
          ctx.globalAlpha = 0.2 + ((i * 37) % 50) / 100;
          ctx.fillStyle = '#7fd8ff';
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        U.drawMark(ctx, W / 2, H / 2 - 90, 1.1, {});
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(g.entry ? g.entry.name : 'ИГРА', W / 2, H / 2 + 40);
        ctx.fillStyle = '#8fb4c9';
        ctx.font = '500 20px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('демо-картридж · добавьте объект SwitchGame, чтобы оживить', W / 2, H / 2 + 84);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(t.toFixed(1) + ' c · Home — в меню', W / 2, H - 48);
        ctx.restore();
        return;
      }
      try {
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, W, H);
        g.mod.draw(ctx, apiObj);
      } catch (e) {
        g.err = e.message || String(e);
      }
      ctx.restore();
    };

    return g;
  }

  return {
    create(id, entry, canvas, ctx) {
      if (id === 'space') return spaceSurvivor(canvas, ctx);
      if (window.GamePack && GamePack.has(id)) return GamePack.create(id, ctx);
      if (entry) return customGame(entry, ctx);
      return null;
    },
  };
})();
