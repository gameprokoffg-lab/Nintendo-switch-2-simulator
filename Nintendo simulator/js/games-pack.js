'use strict';

/* =====================================================================
   Игровой пакет Switch 2.
   Пять игр в одном файле:
     1. БЛОК-ПАД        — тетрис
     2. НЕОН-ГРАН-ПРИ   — псевдо-3D гонки с таблицей лидеров
     3. УЗЕЛОК          — визуальный движок на нодах
     4. СЕРДЦЕ НЕБУЛЫ   — bullet-hell РПГ (формат NBS, нужна NEBULA OS)
     5. КРАСНЫЙ СЕКТОР  — шутер от первого лица (нужна NEBULA OS)

   Игры 4 и 5 запускаются только на кастомной прошивке NEBULA OS:
   их форматы (NBS и SEC) понимает только её рантайм.
   ===================================================================== */
var GamePack = (function () {
  const W = 1280, H = 720;
  const registry = [];

  function add(meta) {
    registry.push(meta);
  }

  function get(id) {
    return registry.find((g) => g.id === id) || null;
  }

  function list() {
    return registry.map((g) => ({
      id: g.id,
      name: g.name,
      desc: g.desc,
      author: g.author || 'Switch 2',
      sizeMB: g.sizeMB || 0,
      format: g.format || 'JS',
      needFw: g.needFw || null,
      icon: g.icon || 'cart',
      color: g.color || '#10202a',
    }));
  }

  function hasFirmware(feature) {
    if (!window.Firmware) return false;
    const fw = Firmware.active();
    return !!(fw && Array.isArray(fw.features) && fw.features.indexOf(feature) >= 0);
  }

  /* ------------------------------ общие рисовалки ------------------------------ */
  function txt(ctx, s, x, y, size, color, align, weight) {
    ctx.font = (weight || 600) + ' ' + size + 'px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = color || '#eaf2f8';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(s), x, y);
  }

  function panel(ctx, x, y, w, h, r, fill, stroke) {
    U.rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* приватный режим */ }
  }

  /* ------------------------------ общее меню игр ------------------------------ */
  const SKINS = [
    { id: 'neon', name: 'НЕОН', c1: '#19c3e8', c2: '#8ce6a5', price: 0 },
    { id: 'ember', name: 'УГОЛЬ', c1: '#ff6b4a', c2: '#f2c14e', price: 40 },
    { id: 'jade', name: 'НЕФРИТ', c1: '#8ce6a5', c2: '#19c3e8', price: 80 },
    { id: 'nebula', name: 'НЕБУЛА', c1: '#b06bff', c2: '#ff4a57', price: 120 },
    { id: 'gold', name: 'ЗОЛОТО', c1: '#f2c14e', c2: '#ff9f4a', price: 160 },
  ];

  function exitToOS() {
    try {
      if (typeof OS !== 'undefined' && OS && OS.goHome) { OS.goHome(); return true; }
    } catch (e) { /* вне консоли */ }
    return false;
  }

  function makeMenu(ctx, meta, opts) {
    const o = opts || {};
    const kk = (k) => 'switch2.' + k + '.' + meta.id;
    const read = (k, d) => { try { const raw = localStorage.getItem(kk(k)); return raw ? JSON.parse(raw) : d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(kk(k), JSON.stringify(v)); } catch (e) { /* приватный режим */ } };
    const DIFFS = ['ЛЕГКО', 'НОРМА', 'СЛОЖНО'];
    let page = 'main';
    let i = 0;
    let shopI = 0;
    let setI = 0;
    let confirmT = 0;
    let note = '';
    let noteT = 0;
    let coins = Number(read('coins', 0)) || 0;
    let owned = read('skins', ['neon']);
    if (!Array.isArray(owned)) owned = ['neon'];
    if (owned.indexOf('neon') < 0) owned.unshift('neon');
    let skinId = read('skin', 'neon');
    if (owned.indexOf(skinId) < 0) skinId = 'neon';
    const st = read('settings', { sound: true, shake: true, difficulty: 1 });
    let sound = st.sound !== false;
    let shake = st.shake !== false;
    let diff = U.clamp(Math.round(Number(st.difficulty) || 0), 0, 2);

    function currentSkin() { return SKINS.find((s) => s.id === skinId) || SKINS[0]; }
    function accent() { return currentSkin().c1; }
    function settings() { return { sound, shake, difficulty: diff }; }
    function addCoins(n) { coins = Math.max(0, coins + Math.round(n)); write('coins', coins); return coins; }
    function saveSkins() { write('skins', owned); write('skin', skinId); }
    function persist() { write('settings', { sound, shake, difficulty: diff }); }
    function setNote(t) { note = t; noteT = 2.2; }
    function rowsCount() { return o.difficulty === false ? 3 : 4; }
    function open() { page = 'main'; i = 0; shopI = 0; setI = 0; note = ''; noteT = 0; confirmT = 0; }

    function update(dt, input) {
      const p = (input && input.pressed) || new Set();
      noteT = Math.max(0, noteT - dt);
      confirmT = Math.max(0, confirmT - dt);
      if (page === 'main') {
        if (p.has('up')) { i = (i + 3) % 4; Sfx.move(); }
        if (p.has('down')) { i = (i + 1) % 4; Sfx.move(); }
        if (p.has('back') || p.has('b')) return 'exit';
        if (p.has('ok') || p.has('a')) {
          if (i === 0) { Sfx.ok(); return 'play'; }
          if (i === 1) { page = 'shop'; shopI = 0; Sfx.ok(); }
          else if (i === 2) { page = 'settings'; setI = 0; Sfx.ok(); }
          else if (i === 3) { Sfx.back(); return 'exit'; }
        }
        return null;
      }
      if (page === 'shop') {
        if (p.has('left')) { shopI = (shopI + SKINS.length - 1) % SKINS.length; Sfx.move(); }
        if (p.has('right')) { shopI = (shopI + 1) % SKINS.length; Sfx.move(); }
        if (p.has('up') || p.has('down')) Sfx.move();
        if (p.has('back') || p.has('b')) { page = 'main'; Sfx.back(); return null; }
        if (p.has('ok') || p.has('a')) {
          const s = SKINS[shopI];
          if (owned.indexOf(s.id) < 0) {
            if (coins >= s.price) {
              coins -= s.price;
              owned.push(s.id);
              skinId = s.id;
              write('coins', coins);
              saveSkins();
              Sfx.ok();
              setNote('Куплено: ' + s.name);
            } else {
              Sfx.error();
              setNote('Не хватает ' + (s.price - coins) + ' монет');
            }
          } else if (skinId !== s.id) {
            skinId = s.id;
            saveSkins();
            Sfx.ok();
            setNote('Скин: ' + s.name);
          }
        }
        return null;
      }
      if (page === 'settings') {
        if (p.has('up')) { setI = (setI + rowsCount() - 1) % rowsCount(); Sfx.move(); }
        if (p.has('down')) { setI = (setI + 1) % rowsCount(); Sfx.move(); }
        if (p.has('back') || p.has('b')) { page = 'main'; Sfx.back(); return null; }
        const isDiff = o.difficulty !== false;
        const resetRow = isDiff ? 3 : 2;
        const act = (dir) => {
          if (setI === 0) {
            sound = !sound;
            Sfx.setEnabled(sound);
            if (sound) Sfx.ok();
          } else if (setI === 1) {
            shake = !shake;
            Sfx.move();
          } else if (isDiff && setI === 2) {
            diff = (diff + dir + 3) % 3;
            Sfx.move();
          } else if (setI === resetRow) {
            if (confirmT > 0) {
              if (o.reset) o.reset();
              confirmT = 0;
              Sfx.ok();
              setNote('Прогресс игры стёрт');
            } else {
              confirmT = 3;
              setNote('A ещё раз — стереть прогресс');
            }
          }
          persist();
        };
        if (p.has('left')) act(-1);
        if (p.has('right')) act(1);
        if (p.has('ok') || p.has('a')) act(1);
        return null;
      }
      return null;
    }

    function wrapText(text, x, y, maxW, size, color, lh) {
      ctx.font = '500 ' + size + 'px "Segoe UI", system-ui, sans-serif';
      const words = String(text || '').split(' ');
      let line = '';
      let yy = y;
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) {
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(line, x, yy);
          line = w;
          yy += lh || size * 1.45;
        } else {
          line = t;
        }
      }
      if (line) {
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(line, x, yy);
      }
      return yy;
    }

    function drawBase(title, sub) {
      const acc = accent();
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#070a10');
      bg.addColorStop(1, '#04060a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W * 0.2, H * 0.18, 30, W * 0.2, H * 0.18, 640);
      glow.addColorStop(0, U.hexToRgba(acc, 0.2));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = U.hexToRgba(acc, 0.3);
      ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(W * 0.2, H * 0.2, 110 + k * 72, 0, U.TAU);
        ctx.stroke();
      }
      ctx.restore();
      txt(ctx, meta.name, 84, 148, 54, '#f2f8ff', 'left', 800);
      txt(ctx, sub, 88, 184, 15, acc, 'left', 700);
      panel(ctx, 86, 202, 88, 4, 2, acc, null);
      txt(ctx, title, 88, 244, 17, '#8fb4c9', 'left', 600);
    }

    function footer(text) {
      ctx.fillStyle = 'rgba(6,9,13,.75)';
      ctx.fillRect(0, H - 64, W, 64);
      ctx.fillStyle = U.hexToRgba(accent(), 0.45);
      ctx.fillRect(0, H - 64, W, 2);
      if (text) txt(ctx, text, 40, H - 26, 14, '#7f93a5', 'left', 500);
      const acc = accent();
      txt(ctx, 'МОНЕТЫ: ' + coins, W - 40, H - 26, 16, acc, 'right', 700);
      if (noteT > 0) {
        const a = Math.min(1, noteT * 2);
        txt(ctx, note, W / 2, H - 26, 15, 'rgba(242,193,78,' + a + ')', 'center', 600);
      }
    }

    function drawMain() {
      drawBase('ГЛАВНОЕ МЕНЮ', o.subtitle || (meta.format + ' · ' + (o.author || 'Switch 2')));
      const acc = accent();
      wrapText(o.desc || meta.desc || '', 88, 300, 600, 17, '#9fb2c2', 27);
      if (o.bestText) txt(ctx, o.bestText(), 88, 388, 16, '#f2c14e', 'left', 600);
      txt(ctx, 'Скин: ' + currentSkin().name, 88, 422, 15, '#7f93a5', 'left', 500);
      const BX = 760, BY = 176, BW = 432, BH = 62, GAP = 14;
      const items = [o.playLabel || 'ИГРАТЬ', 'МАГАЗИН', 'НАСТРОЙКИ', 'ВЫХОД'];
      for (let k = 0; k < items.length; k++) {
        const y = BY + k * (BH + GAP);
        const sel = i === k;
        panel(ctx, BX, y, BW, BH, 14, sel ? U.hexToRgba(acc, 0.2) : 'rgba(255,255,255,.035)', sel ? acc : 'rgba(120,160,190,.16)');
        txt(ctx, items[k], BX + 26, y + 40, 22, sel ? '#ffffff' : '#c4d2df', 'left', 700);
        if (sel) txt(ctx, '›', BX + BW - 26, y + 41, 24, acc, 'right', 800);
      }
      txt(ctx, 'A — выбрать · B — выйти в консоль', BX + 4, BY + 4 * (BH + GAP) + 22, 13, '#7f93a5', 'left', 500);
      footer('↑↓ — выбор · A — ок · B — выход');
    }

    function drawShop() {
      drawBase('МАГАЗИН СКИНОВ', 'Покупайте скины за монеты');
      const acc = accent();
      const CW = 208, CH = 262, GAP = 20;
      const x0 = 84;
      const y0 = 286;
      for (let k = 0; k < SKINS.length; k++) {
        const s = SKINS[k];
        const x = x0 + k * (CW + GAP);
        const sel = shopI === k;
        const have = owned.indexOf(s.id) >= 0;
        panel(ctx, x, y0, CW, CH, 16, sel ? U.hexToRgba(acc, 0.16) : 'rgba(255,255,255,.035)', sel ? s.c1 : 'rgba(120,160,190,.16)');
        ctx.save();
        const gr = ctx.createLinearGradient(x + 40, y0 + 40, x + CW - 40, y0 + 120);
        gr.addColorStop(0, s.c1);
        gr.addColorStop(1, s.c2);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x + CW / 2, y0 + 78, 38, 0, U.TAU);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x + CW / 2, y0 + 78, 52, 0, U.TAU);
        ctx.fill();
        ctx.restore();
        txt(ctx, s.name, x + CW / 2, y0 + 156, 20, '#eaf3fb', 'center', 700);
        if (have) {
          txt(ctx, skinId === s.id ? 'ВЫБРАН' : 'КУПЛЕНО', x + CW / 2, y0 + 190, 13, skinId === s.id ? '#8ce6a5' : '#7f93a5', 'center', 700);
        } else {
          txt(ctx, s.price + ' МОНЕТ', x + CW / 2, y0 + 190, 13, '#f2c14e', 'center', 700);
        }
        if (s.price === 0 && !have) txt(ctx, 'БЕСПЛАТНО', x + CW / 2, y0 + 212, 11, '#7f93a5', 'center', 500);
      }
      footer('← → — выбор · A — купить/надеть · B — назад');
    }

    function drawSettings() {
      drawBase('НАСТРОЙКИ ИГРЫ', 'Общие для всех запусков');
      const acc = accent();
      const rows = ['Звук', 'Тряска экрана'];
      if (o.difficulty !== false) rows.push('Сложность');
      rows.push('Стереть прогресс игры');
      const vals = [sound ? 'ВКЛ' : 'ВЫКЛ', shake ? 'ВКЛ' : 'ВЫКЛ'];
      if (o.difficulty !== false) vals.push(DIFFS[diff]);
      vals.push(confirmT > 0 ? 'A — ПОДТВЕРДИТЬ' : 'A ДВАЖДЫ');
      const X = 260, Y = 262, WW = 760, RH = 66, GAP = 8;
      for (let k = 0; k < rows.length; k++) {
        const y = Y + k * (RH + GAP);
        const sel = setI === k;
        panel(ctx, X, y, WW, RH, 12, sel ? U.hexToRgba(acc, 0.16) : 'rgba(255,255,255,.03)', sel ? acc : 'rgba(120,160,190,.14)');
        txt(ctx, rows[k], X + 24, y + 41, 19, sel ? '#ffffff' : '#c4d2df', 'left', 600);
        txt(ctx, vals[k], X + WW - 24, y + 41, 16, k === rows.length - 1 ? '#ff8e9b' : acc, 'right', 700);
      }
      footer('↑↓ — выбор · ← → / A — изменить · B — назад');
    }

    function draw() {
      if (page === 'shop') drawShop();
      else if (page === 'settings') drawSettings();
      else drawMain();
    }

    return {
      open: open,
      update: update,
      draw: draw,
      accent: accent,
      settings: settings,
      addCoins: addCoins,
      coins: () => coins,
      page: () => page,
      skin: currentSkin,
    };
  }

  function gate(meta, ctx, probe) {
    let t = 0;
    const p = probe || (window.Nebula ? Nebula.probe() : {
      abi: 'NEBULA-ABI-1.0',
      ready: false,
      firmware: 'Switch OS 2.0',
      missing: ['nb_save', 'nb_load', 'nb_haptic', 'nb_audio', 'nb_skin'],
    });
    const missing = p.missing && p.missing.length ? p.missing : ['nb_save'];
    return {
      gated: true,
      start() { t = 0; Sfx.error(); },
      destroy() {},
      update(dt, input) {
        t += dt;
        if (input && input.pressed && (input.pressed.has('ok') || input.pressed.has('a'))) Sfx.error();
      },
      draw() {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#12081c');
        g.addColorStop(1, '#05070c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
        ctx.save();
        ctx.translate(W / 2, 178);
        ctx.shadowColor = 'rgba(176,107,255,' + (0.35 + pulse * 0.4) + ')';
        ctx.shadowBlur = 40;
        panel(ctx, -56, -56, 112, 112, 24, 'rgba(30,12,48,.9)', 'rgba(176,107,255,.8)');
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#b06bff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, -6, 24, 0, U.TAU);
        ctx.stroke();
        ctx.fillStyle = '#b06bff';
        ctx.fillRect(-8, 20, 16, 24);
        ctx.restore();
        txt(ctx, 'RUNTIME НЕ НАЙДЕН', W / 2, 286, 44, '#f3e9ff', 'center', 800);
        txt(ctx, meta.name + ' · формат ' + (meta.format || 'NBS'), W / 2, 330, 24, '#c9a6ff', 'center', 700);
        txt(ctx, 'Формат — это контейнер. Игра вызывает системные вызовы Nebula:', W / 2, 378, 18, '#9f8bbd', 'center', 500);
        const cw = 128, gap = 10;
        const total = missing.length;
        const startX = W / 2 - (total * cw + (total - 1) * gap) / 2;
        for (let i = 0; i < total; i++) {
          const x = startX + i * (cw + gap);
          panel(ctx, x, 396, cw, 30, 8, 'rgba(80,30,110,.55)', 'rgba(176,107,255,.5)');
          txt(ctx, missing[i], x + cw / 2, 417, 13, '#e7d6ff', 'center', 700);
        }
        txt(ctx, 'Прошивка: ' + p.firmware + ' · ABI ' + p.abi + ': ENOSYS', W / 2, 464, 16, '#ff8e9b', 'center', 600);
        txt(ctx, 'Поставьте NEBULA OS: Настройки → Разблокировать загрузчик →', W / 2, 508, 17, '#8fb4c9', 'center', 500);
        txt(ctx, 'Поставить кастомную ОС → картридж NEBULA_OS.js в терминал.', W / 2, 534, 17, '#8fb4c9', 'center', 500);
        txt(ctx, meta.format || 'NBS', W - 46, H - 34, 15, 'rgba(176,107,255,.55)', 'right', 700);
      },
    };
  }

  function crash(meta, ctx, err) {
    let t = 0;
    const msg = String((err && err.message) || err || 'неизвестная ошибка');
    const code = (err && err.code) || 'EUNKNOWN';
    return {
      crashed: true,
      start() {},
      destroy() {},
      update(dt) { t += dt; },
      draw() {
        ctx.fillStyle = '#0b0508';
        ctx.fillRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(120,20,30,.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'RUNTIME ERROR', W / 2, 220, 56, '#ff5a5a', 'center', 800);
        txt(ctx, meta.name, W / 2, 268, 24, '#e9dcff', 'center', 700);
        txt(ctx, msg, W / 2, 330, 18, '#ffb3b8', 'center', 500);
        txt(ctx, 'КОД: ' + code, W / 2, 368, 16, '#ff8e9b', 'center', 700);
        txt(ctx, 'Home — выйти в меню консоли', W / 2, 430, 16, '#8fb4c9', 'center', 500);
        txt(ctx, 'STACK · nb_runtime · ' + Math.floor(t * 60), W - 40, H - 20, 11, 'rgba(255,90,90,.4)', 'right', 600);
      },
    };
  }

  /* ============================== 1. БЛОК-ПАД ============================== */
  function tetris(ctx) {
    const CELL = 30, COLS = 10, ROWS = 20;
    const BX = 330, BY = 54;
    const BW = COLS * CELL, BH = ROWS * CELL;
    const COLORS = { 1: '#19c3e8', 2: '#6ea8ff', 3: '#ff9f4a', 4: '#f2c14e', 5: '#8ce6a5', 6: '#b06bff', 7: '#ff4a57' };
    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      J: [[0, 0, 0], [2, 2, 2], [0, 0, 0]],
      L: [[3, 0, 0], [3, 3, 3], [0, 0, 0]],
      O: [[4, 4], [4, 4]],
      S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
      T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
      Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
    };
    const KEYS = Object.keys(SHAPES);

    const g = {
      mode: 'intro',
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      cur: null,
      bag: [],
      next: [],
      score: 0,
      lines: 0,
      level: 1,
      dropT: 0,
      moveT: 0,
      dir: 0,
      best: readJson('switch2.tetris.best', 0),
      flash: [],
      t: 0,
    };

    const menu = makeMenu(ctx,
      { id: 'tetris', name: 'БЛОК-ПАД', format: 'JS', desc: 'Тетрис: стакан 10×20, семь фигур, уровни и hard drop.' },
      {
        author: 'Switch 2',
        playLabel: 'ИГРАТЬ',
        bestText: () => (g.best ? 'РЕКОРД: ' + g.best : 'РЕКОРДА ПОКА НЕТ'),
        reset: () => { g.best = 0; writeJson('switch2.tetris.best', 0); },
      }
    );

    function rot(m) {
      const n = m.length;
      const out = [];
      for (let y = 0; y < n; y++) {
        out.push([]);
        for (let x = 0; x < n; x++) out[y].push(m[n - 1 - x][y]);
      }
      return out;
    }

    function emptyBoard() {
      return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function refill() {
      const names = KEYS.slice();
      for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = names[i];
        names[i] = names[j];
        names[j] = tmp;
      }
      g.bag = g.bag.concat(names);
    }

    function takeName() {
      if (!g.bag.length) refill();
      return g.bag.pop();
    }

    function spawn(name) {
      const key = name || takeName();
      const m = SHAPES[key].map((row) => row.slice());
      g.cur = { key, m, x: key === 'O' ? 4 : 3, y: 0 };
      if (collide(g.cur.m, g.cur.x, g.cur.y)) {
        g.mode = 'over';
        g.best = Math.max(g.best, g.score);
        writeJson('switch2.tetris.best', g.best);
        menu.addCoins(4 + Math.floor(g.score / 1200));
      }
      if (g.next.length < 3) g.next.push(takeName());
    }

    function collide(m, px, py) {
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue;
          const bx = px + x, by = py + y;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && g.board[by][bx]) return true;
        }
      }
      return false;
    }

    function clearLines() {
      let n = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (g.board[y].every((v) => v)) {
          g.board.splice(y, 1);
          g.board.unshift(Array(COLS).fill(0));
          g.flash.push({ y, t: 0.45 });
          n++;
          y++;
        }
      }
      if (!n) return;
      g.lines += n;
      g.score += [0, 100, 300, 500, 800][n] * g.level;
      g.level = 1 + Math.floor(g.lines / 10);
      Sfx.ok();
    }

    function lock() {
      const m = g.cur.m;
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue;
          const by = g.cur.y + y, bx = g.cur.x + x;
          if (by >= 0) g.board[by][bx] = m[y][x];
        }
      }
      clearLines();
      Sfx.drop();
      g.cur = null;
      g.dropT = 0;
      spawn(g.next.shift());
      if (g.next.length < 3) g.next.push(takeName());
    }

    function stepDown() {
      if (!g.cur) return;
      if (!collide(g.cur.m, g.cur.x, g.cur.y + 1)) g.cur.y++;
      else lock();
    }

    function reset() {
      g.board = emptyBoard();
      g.bag = [];
      g.next = [];
      g.score = 0;
      g.lines = 0;
      g.level = 1;
      g.dropT = 0;
      g.flash = [];
      g.mode = 'play';
      g.cur = null;
      spawn(takeName());
      spawn(takeName());
      Sfx.ok();
    }

    function shift(dir) {
      if (!g.cur) return;
      if (!collide(g.cur.m, g.cur.x + dir, g.cur.y)) {
        g.cur.x += dir;
        Sfx.move();
      }
    }

    function rotate() {
      if (!g.cur) return;
      const m = rot(g.cur.m);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!collide(m, g.cur.x + kick, g.cur.y)) {
          g.cur.m = m;
          g.cur.x += kick;
          Sfx.btn();
          return;
        }
      }
    }

    function hardDrop() {
      if (!g.cur) return;
      while (!collide(g.cur.m, g.cur.x, g.cur.y + 1)) g.cur.y++;
      Sfx.cart();
      lock();
    }

    g.start = () => {
      g.mode = 'menu';
      g.t = 0;
      menu.open();
    };

    g.destroy = () => {};

    g.update = (dt, input) => {
      dt = Math.min(dt, 0.05);
      g.t += dt;
      for (let i = g.flash.length - 1; i >= 0; i--) {
        g.flash[i].t -= dt;
        if (g.flash[i].t <= 0) g.flash.splice(i, 1);
      }
      if (g.mode === 'menu') {
        const act = menu.update(dt, input);
        if (act === 'play') reset();
        else if (act === 'exit') exitToOS();
        return;
      }
      if (g.mode === 'intro' || g.mode === 'over') {
        if (input.pressed.has('ok') || input.pressed.has('a')) reset();
        return;
      }
      if (g.mode === 'pause') {
        if (input.pressed.has('back') || input.pressed.has('b') || input.pressed.has('ok')) {
          g.mode = 'play';
          Sfx.back();
        }
        return;
      }
      if (input.pressed.has('back') || input.pressed.has('b')) {
        g.mode = 'pause';
        Sfx.back();
        return;
      }
      if (!g.cur) return;
      if (input.pressed.has('up') || input.pressed.has('x')) rotate();
      if (input.pressed.has('ok') || input.pressed.has('a')) hardDrop();
      const dir = (input.held.has('left') ? -1 : 0) + (input.held.has('right') ? 1 : 0);
      if (dir !== g.dir) {
        g.dir = dir;
        g.moveT = 0;
        if (dir) shift(dir);
      }
      if (dir) {
        g.moveT += dt;
        if (g.moveT > 0.16) {
          g.moveT = 0.07;
          shift(dir);
        }
      }
      const interval = Math.max(0.07, 0.72 - (g.level - 1) * 0.055);
      g.dropT += dt * (input.held.has('down') ? 11 : 1);
      while (g.dropT >= interval) {
        g.dropT -= interval;
        stepDown();
        if (g.mode !== 'play') return;
      }
    };

    function block(x, y, color, alpha) {
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      panel(ctx, x + 1.5, y + 1.5, CELL - 3, CELL - 3, 6, color, 'rgba(255,255,255,.18)');
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.fillRect(x + 5, y + 5, CELL - 10, 5);
      ctx.globalAlpha = 1;
    }

    function drawMini(x, y, key) {
      const m = SHAPES[key];
      const n = m.length;
      const s = 15;
      let minX = n, maxX = -1, minY = n, maxY = -1;
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) {
          if (!m[yy][xx]) continue;
          if (xx < minX) minX = xx;
          if (xx > maxX) maxX = xx;
          if (yy < minY) minY = yy;
          if (yy > maxY) maxY = yy;
        }
      }
      const ox = x - ((maxX - minX + 1) * s) / 2 - minX * s;
      const oy = y - ((maxY - minY + 1) * s) / 2 - minY * s;
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) {
          if (!m[yy][xx]) continue;
          panel(ctx, ox + xx * s, oy + yy * s, s - 2, s - 2, 3, COLORS[m[yy][xx]]);
        }
      }
    }

    g.draw = () => {
      if (g.mode === 'menu') { menu.draw(); return; }
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0a1220');
      bg.addColorStop(0.55, '#070b12');
      bg.addColorStop(1, '#120a1e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 70; i++) {
        const x = (i * 197 + 40) % W;
        const y = (i * 313 + (g.t * 18) % H) % H;
        ctx.globalAlpha = 0.12 + (i % 5) * 0.04;
        ctx.fillStyle = i % 3 ? '#19c3e8' : '#b06bff';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      panel(ctx, BX - 12, BY - 12, BW + 24, BH + 24, 16, 'rgba(6,10,16,.78)', 'rgba(120,170,210,.28)');
      ctx.strokeStyle = 'rgba(120,170,210,.10)';
      ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(BX + x * CELL, BY);
        ctx.lineTo(BX + x * CELL, BY + BH);
        ctx.stroke();
      }
      for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(BX, BY + y * CELL);
        ctx.lineTo(BX + BW, BY + y * CELL);
        ctx.stroke();
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = g.board[y][x];
          if (v) block(BX + x * CELL, BY + y * CELL, COLORS[v]);
        }
      }

      if (g.cur && g.mode === 'play') {
        let gy = g.cur.y;
        while (!collide(g.cur.m, g.cur.x, gy + 1)) gy++;
        for (let y = 0; y < g.cur.m.length; y++) {
          for (let x = 0; x < g.cur.m[y].length; x++) {
            if (!g.cur.m[y][x]) continue;
            const px = BX + (g.cur.x + x) * CELL;
            const py = BY + (gy + y) * CELL;
            if (gy + y >= 0) block(px, py, COLORS[g.cur.m[y][x]], 0.18);
          }
        }
        for (let y = 0; y < g.cur.m.length; y++) {
          for (let x = 0; x < g.cur.m[y].length; x++) {
            if (!g.cur.m[y][x]) continue;
            const px = BX + (g.cur.x + x) * CELL;
            const py = BY + (g.cur.y + y) * CELL;
            if (g.cur.y + y >= 0) block(px, py, COLORS[g.cur.m[y][x]]);
          }
        }
      }

      for (const f of g.flash) {
        const a = Math.max(0, f.t / 0.45);
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.55) + ')';
        ctx.fillRect(BX, BY + f.y * CELL, BW, CELL);
      }

      const PX = BX + BW + 60;
      txt(ctx, 'БЛОК-ПАД', PX, 78, 30, '#eaf6ff', 'left', 800);
      txt(ctx, 'тетрис · Switch 2', PX, 102, 14, '#7f93a6', 'left', 500);

      panel(ctx, PX, 126, 250, 116, 14, 'rgba(12,20,30,.72)', 'rgba(120,170,210,.18)');
      txt(ctx, 'СЧЁТ', PX + 18, 156, 12, '#7f93a6', 'left', 600);
      txt(ctx, String(g.score).padStart(5, '0'), PX + 18, 196, 32, '#19c3e8', 'left', 800);
      txt(ctx, 'УРОВЕНЬ ' + g.level, PX + 18, 226, 13, '#9fc8e0', 'left', 600);
      txt(ctx, 'ЛИНИИ ' + g.lines, PX + 130, 226, 13, '#9fc8e0', 'left', 600);

      txt(ctx, 'ДАЛЬШЕ', PX, 286, 12, '#7f93a6', 'left', 700);
      for (let i = 0; i < g.next.length; i++) {
        panel(ctx, PX, 300 + i * 82, 120, 70, 12, 'rgba(12,20,30,.6)', 'rgba(120,170,210,.14)');
        drawMini(PX + 60, 335 + i * 82, g.next[i]);
      }

      txt(ctx, 'РЕКОРД', PX, 578, 12, '#7f93a6', 'left', 700);
      txt(ctx, String(g.best), PX, 606, 24, '#f2c14e', 'left', 800);

      txt(ctx, '← → — ДВИЖЕНИЕ   ↑ — ПОВОРОТ', PX, 654, 12, '#8fb4c9', 'left', 600);
      txt(ctx, 'A — СБРОС   B — ПАУЗА', PX, 676, 12, '#8fb4c9', 'left', 600);
      txt(ctx, 'Home — в меню', PX, 698, 12, '#5f7488', 'left', 500);

      if (g.mode === 'intro') {
        ctx.fillStyle = 'rgba(4,8,14,.78)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'БЛОК-ПАД', W / 2, 300, 84, '#eaf6ff', 'center', 800);
        txt(ctx, 'Классический тетрис: собирайте линии, пока стакан не переполнился.', W / 2, 350, 20, '#9fc8e0', 'center', 500);
        txt(ctx, 'A — НАЧАТЬ', W / 2, 424, 22, '#19c3e8', 'center', 700);
        txt(ctx, 'РЕКОРД: ' + g.best, W / 2, 470, 18, '#f2c14e', 'center', 600);
      }
      if (g.mode === 'pause') {
        ctx.fillStyle = 'rgba(4,8,14,.7)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ПАУЗА', W / 2, H / 2, 64, '#eaf6ff', 'center', 800);
        txt(ctx, 'B — ПРОДОЛЖИТЬ', W / 2, H / 2 + 52, 20, '#9fc8e0', 'center', 600);
      }
      if (g.mode === 'over') {
        ctx.fillStyle = 'rgba(4,8,14,.78)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'СТАКАН ПЕРЕПОЛНЕН', W / 2, H / 2 - 60, 46, '#ff6b76', 'center', 800);
        txt(ctx, 'Счёт: ' + g.score, W / 2, H / 2 + 6, 30, '#eaf6ff', 'center', 700);
        txt(ctx, 'Рекорд: ' + g.best, W / 2, H / 2 + 44, 20, '#f2c14e', 'center', 600);
        txt(ctx, 'A — ЕЩЁ РАЗ', W / 2, H / 2 + 108, 20, '#9fc8e0', 'center', 700);
      }
    };

    return g;
  }

  add({
    id: 'tetris',
    name: 'БЛОК-ПАД',
    desc: 'Тетрис: линии, уровни и рекорд. Просто, но затягивает.',
    author: 'Switch 2',
    sizeMB: 30,
    format: 'JS',
    icon: 'blocks',
    color: '#0e2a3a',
    create: tetris,
  });

  /* ============================== 2. НЕОН-ГРАН-ПРИ ============================== */
  function racing(ctx) {
    const SEG = 200, RUMBLE = 3, ROAD_W = 2100, DRAW = 150, CAM_H = 1050, FOV = 100;
    const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
    const MAX_SPEED = SEG * 60;
    const LAPS = 2;
    const COL = {
      light: { road: '#2b3140', grass: '#0e1d1a', rumble: '#e8eef5', lane: '#dbe6f0' },
      dark: { road: '#242a36', grass: '#0a1613', rumble: '#ff4a57', lane: null },
    };

    const segments = [];
    const trackLength = () => segments.length * SEG;

    function lastY() { return segments.length ? segments[segments.length - 1].p2.world.y : 0; }
    function easeIn(a, b, p) { return a + (b - a) * p * p; }
    function easeOut(a, b, p) { return a + (b - a) * (1 - Math.pow(1 - p, 2)); }
    function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }
    function interp(a, b, p) { return a + (b - a) * p; }

    function addSegment(curve, y) {
      const n = segments.length;
      segments.push({
        index: n,
        p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
        p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
        curve,
        color: Math.floor(n / RUMBLE) % 2 ? COL.dark : COL.light,
      });
    }

    function addRoad(enter, hold, leave, curve, y) {
      const startY = lastY();
      const endY = startY + y * SEG;
      const total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }

    addRoad(40, 40, 40, 0, 0);
    addRoad(40, 40, 40, 4, -25);
    addRoad(40, 40, 40, 0, 32);
    addRoad(40, 40, 40, -5, 0);
    addRoad(40, 40, 40, 0, -38);
    addRoad(40, 40, 40, 6, 24);
    addRoad(40, 40, 40, -6, -22);
    addRoad(40, 40, 40, 0, 0);
    addRoad(30, 30, 30, 3, 16);

    const LEN = trackLength();

    const g = {
      mode: 'intro',
      t: 0,
      position: 0,
      playerX: 0,
      speed: 0,
      lap: 0,
      raceTime: 0,
      countT: 3.2,
      boost: 1,
      boosting: 0,
      lastLap: 0,
      best: 0,
      board: readJson('switch2.race.board', []),
      shake: 0,
      cars: [],
      finished: false,
      newRecord: false,
    };

    const CAR_COLORS = ['#19c3e8', '#b06bff', '#8ce6a5', '#f2c14e', '#ff9f4a', '#6ea8ff'];
    for (let i = 0; i < 8; i++) {
      g.cars.push({
        offset: U.rand(-0.72, 0.72),
        z: ((i + 1) * LEN / 9 + U.rand(-2000, 2000)) % LEN,
        speed: U.rand(4800, 7600),
        color: CAR_COLORS[i % CAR_COLORS.length],
        wobble: U.rand(0, 6.28),
      });
    }

    const menu = makeMenu(ctx,
      { id: 'race', name: 'НЕОН-ГРАН-ПРИ', format: 'JS', desc: 'Гонки с видом сзади: повороты, трафик, нитро и таблица лидеров.' },
      {
        author: 'Switch 2',
        playLabel: 'ЗАЕЗД',
        bestText: () => (g.board.length ? 'ЛУЧШЕЕ ВРЕМЯ: ' + fmtTime(g.board[0]) : 'РЕКОРДОВ ПОКА НЕТ'),
        reset: () => { g.board = []; g.best = 0; writeJson('switch2.race.board', []); },
      }
    );

    function reset() {
      g.position = 0;
      g.playerX = 0;
      g.speed = 0;
      g.lap = 1;
      g.raceTime = 0;
      g.countT = 2.8;
      g.boost = 1;
      g.boosting = 0;
      g.finished = false;
      g.newRecord = false;
      g.mode = 'count';
      for (const c of g.cars) c.z = (c.z + 3000) % LEN;
      Sfx.ok();
    }

    function findSegment(z) {
      return segments[Math.floor((((z % LEN) + LEN) % LEN) / SEG) % segments.length];
    }

    function project(p, camX, camY, camZ) {
      p.camera.x = -camX;
      p.camera.y = (p.world.y || 0) - camY;
      p.camera.z = p.world.z - camZ;
      p.screen.scale = CAM_DEPTH / Math.max(1, p.camera.z);
      p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
      p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
      p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
    }

    function polygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();
    }

    function drawSegment(seg, maxy) {
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      const y1 = p1.y, y2 = p2.y;
      const w1 = p1.w, w2 = p2.w;
      const x1 = p1.x, x2 = p2.x;
      const c = seg.color;

      ctx.fillStyle = c.grass;
      ctx.fillRect(0, Math.max(0, y2), W, Math.min(H, y1) - Math.max(0, y2) + 1);

      const r1 = w1 * 0.16, r2 = w2 * 0.16;
      polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, c.rumble);
      polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, c.rumble);
      polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, c.road);

      if (c.lane) {
        const lw1 = w1 * 0.02, lw2 = w2 * 0.02;
        for (let lane = 1; lane < 3; lane++) {
          const l1 = -w1 + (w1 * 2 / 3) * lane;
          const l2 = -w2 + (w2 * 2 / 3) * lane;
          polygon(x1 + l1 - lw1, y1, x1 + l1 + lw1, y1, x2 + l2 + lw2, y2, x2 + l2 - lw2, y2, 'rgba(220,232,245,.55)');
        }
      }

      if (seg.index % 12 === 0 && seg.index > 0) {
        const s = Math.max(1, p1.scale * 900 * W / 2);
        ctx.fillStyle = '#9fe8ff';
        ctx.fillRect(x1 - w1 - r1 - s * 0.8, y1 - s * 2.6, s * 0.16, s * 2.6);
        ctx.fillStyle = 'rgba(159,232,255,.35)';
        ctx.beginPath();
        ctx.arc(x1 - w1 - r1 - s * 0.72, y1 - s * 2.7, s * 0.22, 0, U.TAU);
        ctx.fill();
      }

      void maxy;
    }

    function drawSky() {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
      sky.addColorStop(0, '#120a26');
      sky.addColorStop(0.55, '#391a4d');
      sky.addColorStop(1, '#b4476b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.62);

      const sunX = W * 0.5 - g.playerX * 90;
      ctx.save();
      ctx.shadowColor = 'rgba(255,140,90,.8)';
      ctx.shadowBlur = 80;
      ctx.fillStyle = '#ffb15c';
      ctx.beginPath();
      ctx.arc(sunX, H * 0.44, 120, 0, U.TAU);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,120,90,.25)';
      ctx.beginPath();
      ctx.arc(sunX, H * 0.44, 190, 0, U.TAU);
      ctx.fill();

      const off = (g.position * 0.000035 + g.playerX * 40) % W;
      ctx.fillStyle = '#1b1030';
      for (let i = -1; i < 8; i++) {
        const bx = i * 240 - off;
        ctx.beginPath();
        ctx.moveTo(bx, H * 0.58);
        ctx.lineTo(bx + 120, H * 0.34);
        ctx.lineTo(bx + 240, H * 0.58);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#24123a';
      for (let i = -1; i < 10; i++) {
        const bx = i * 170 - off * 1.8;
        ctx.beginPath();
        ctx.moveTo(bx, H * 0.62);
        ctx.lineTo(bx + 85, H * 0.46);
        ctx.lineTo(bx + 170, H * 0.62);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,180,120,.06)';
      ctx.fillRect(0, H * 0.42, W, H * 0.2);
    }

    function drawCarShape(x, y, w, h, color, tilt, accent) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt || 0);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.42, w * 0.62, h * 0.18, 0, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = color;
      U.rr(ctx, -w / 2, -h / 2, w, h, h * 0.18);
      ctx.fill();
      ctx.fillStyle = 'rgba(10,14,20,.85)';
      U.rr(ctx, -w * 0.34, -h * 0.42, w * 0.68, h * 0.42, h * 0.12);
      ctx.fill();
      ctx.fillStyle = accent || 'rgba(190,230,255,.7)';
      ctx.fillRect(-w * 0.26, -h * 0.36, w * 0.52, h * 0.1);
      ctx.fillStyle = '#11151b';
      ctx.fillRect(-w * 0.52, h * 0.05, w * 0.16, h * 0.36);
      ctx.fillRect(w * 0.36, h * 0.05, w * 0.16, h * 0.36);
      ctx.fillStyle = 'rgba(255,90,90,.9)';
      ctx.fillRect(-w * 0.42, h * 0.3, w * 0.12, h * 0.08);
      ctx.fillRect(w * 0.3, h * 0.3, w * 0.12, h * 0.08);
      ctx.restore();
    }

    function updateRace(dt, input) {
      const playerSegment = findSegment(g.position + CAM_H * 2);
      const speedPercent = g.speed / MAX_SPEED;

      if (input.held.has('up')) g.speed += 4200 * dt;
      else if (input.held.has('down')) g.speed -= 9000 * dt;
      else g.speed -= 1800 * dt;

      if (input.pressed.has('ok') && g.boost > 0.05) {
        g.boost = 0;
        g.boosting = 2.1;
        Sfx.shoot();
      }
      g.boosting = Math.max(0, g.boosting - dt);
      g.boost = Math.min(1, g.boost + dt / 9);

      const steer = (input.held.has('left') ? -1 : 0) + (input.held.has('right') ? 1 : 0);
      const dx = dt * 2.1 * speedPercent;
      g.playerX += steer * dx;

      const centrifugal = dt * speedPercent * playerSegment.curve * 0.55;
      g.playerX -= centrifugal;

      if (g.playerX < -1.9) g.playerX = -1.9;
      if (g.playerX > 1.9) g.playerX = 1.9;

      const speedLimit = (input.held.has('down') ? 1500 : (g.boosting > 0 ? MAX_SPEED * 1.25 : MAX_SPEED));
      g.speed = U.clamp(g.speed, 0, speedLimit);

      if (Math.abs(g.playerX) > 1) {
        g.speed -= 3800 * dt;
        g.shake = Math.min(1, g.shake + dt * 3);
      } else {
        g.shake = Math.max(0, g.shake - dt * 4);
      }

      g.position = (g.position + g.speed * dt) % LEN;
      g.raceTime += dt;

      for (const c of g.cars) {
        c.z = (c.z + c.speed * dt) % LEN;
        const rel = (c.z - g.position + LEN) % LEN;
        if (rel < 4200 && Math.abs(c.offset - g.playerX) < 0.52) {
          g.speed = Math.min(g.speed, c.speed * 0.55);
          g.shake = Math.min(1, g.shake + dt * 3);
        }
      }

      if (g.position < 2000 && g.lap > 0 && g.lastLapPosition > LEN - 2000) {
        g.lap++;
        g.lastLap = g.raceTime;
        if (g.lap > LAPS) {
          g.mode = 'finish';
          g.finished = true;
          g.best = Math.min.apply(null, g.board.concat([g.raceTime]));
          g.board = g.board.concat([g.raceTime]).sort((a, b) => a - b).slice(0, 5);
          writeJson('switch2.race.board', g.board);
          g.newRecord = g.board[0] === g.raceTime;
          Sfx.ok();
          menu.addCoins(g.newRecord ? 25 : 10);
        } else {
          Sfx.ok();
        }
      }
      g.lastLapPosition = g.position;
    }

    g.start = () => {
      g.mode = 'menu';
      g.t = 0;
      g.board = readJson('switch2.race.board', []);
      g.best = g.board.length ? g.board[0] : 0;
      g.lastLapPosition = 0;
      menu.open();
    };

    g.destroy = () => {};

    g.update = (dt, input) => {
      dt = Math.min(dt, 0.05);
      g.t += dt;
      if (g.mode === 'menu') {
        const act = menu.update(dt, input);
        if (act === 'play') reset();
        else if (act === 'exit') exitToOS();
        return;
      }
      if (g.mode === 'intro') {
        if (input.pressed.has('ok') || input.pressed.has('a')) reset();
        return;
      }
      if (g.mode === 'finish') {
        if (input.pressed.has('ok') || input.pressed.has('a')) reset();
        return;
      }
      if (g.mode === 'pause') {
        if (input.pressed.has('back') || input.pressed.has('b') || input.pressed.has('ok')) {
          g.mode = 'race';
          Sfx.back();
        }
        return;
      }
      if (input.pressed.has('back') || input.pressed.has('b')) {
        g.mode = 'pause';
        Sfx.back();
        return;
      }
      if (g.mode === 'count') {
        g.countT -= dt;
        if (g.countT <= 0) {
          g.mode = 'race';
          Sfx.ok();
        }
        return;
      }
      updateRace(dt, input);
    };

    g.draw = () => {
      if (g.mode === 'menu') { menu.draw(); return; }
      ctx.save();
      const sh = g.shake * (2 + g.speed / MAX_SPEED * 6);
      ctx.translate(U.rand(-sh, sh), U.rand(-sh, sh));
      drawSky();

      const base = findSegment(g.position);
      const basePercent = (g.position % SEG) / SEG;
      const playerSeg = findSegment(g.position + CAM_H * 2.2);
      const playerPercent = ((g.position + CAM_H * 2.2) % SEG) / SEG;
      const playerY = interp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPercent);

      let x = 0;
      let dx = -(base.curve * basePercent);
      let maxy = H;

      for (let n = 0; n < DRAW; n++) {
        const seg = segments[(base.index + n) % segments.length];
        seg.looped = seg.index < base.index;
        const loopedOffset = seg.looped ? LEN : 0;
        project(seg.p1, g.playerX * ROAD_W - x, playerY + CAM_H, g.position - loopedOffset);
        project(seg.p2, g.playerX * ROAD_W - x - dx, playerY + CAM_H, g.position - loopedOffset);
        x += dx;
        dx += seg.curve;
        if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
        drawSegment(seg, maxy);
        maxy = seg.p2.screen.y;
      }

      const sprites = [];
      for (const c of g.cars) {
        const rel = (c.z - g.position + LEN) % LEN;
        if (rel < 4 || rel > DRAW * SEG * 0.92) continue;
        const cseg = findSegment(c.z);
        const pct = (c.z % SEG) / SEG;
        const scale = interp(cseg.p1.screen.scale, cseg.p2.screen.scale, pct);
        const sx = interp(cseg.p1.screen.x, cseg.p2.screen.x, pct) + scale * c.offset * ROAD_W * W / 2;
        const sy = interp(cseg.p1.screen.y, cseg.p2.screen.y, pct);
        const w = Math.max(10, scale * ROAD_W * W / 2 * 0.22);
        sprites.push({ rel, x: sx, y: sy, w, c });
      }
      sprites.sort((a, b) => b.rel - a.rel);
      for (const s of sprites) {
        drawCarShape(s.x, s.y - s.w * 0.22, s.w, s.w * 0.42, s.c.color, 0, 'rgba(220,240,255,.75)');
      }

      // машина игрока
      const tilt = U.clamp((g.playerX - (g.prevX == null ? g.playerX : g.prevX)) * 2.2, -0.22, 0.22);
      g.prevX = g.playerX;
      const pw = 250 + g.speed / MAX_SPEED * 24;
      drawCarShape(W / 2 + g.playerX * 26, H - 96, pw, pw * 0.4, '#ff4a57', tilt, 'rgba(255,235,235,.8)');

      if (g.boosting > 0) {
        ctx.fillStyle = 'rgba(120,220,255,' + (0.25 + Math.random() * 0.2) + ')';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = 'rgba(180,240,255,.5)';
          ctx.fillRect(U.rand(0, W), U.rand(H * 0.3, H), 2, U.rand(20, 90));
        }
      }

      // HUD
      const kmh = Math.round(g.speed / 28);
      panel(ctx, 40, 36, 250, 92, 14, 'rgba(8,12,20,.62)', 'rgba(255,255,255,.12)');
      txt(ctx, kmh + ' КМ/Ч', 60, 82, 30, '#eaf6ff', 'left', 800);
      txt(ctx, 'КРУГ ' + Math.min(LAPS, Math.max(1, g.lap)) + '/' + LAPS, 60, 108, 14, '#9fc8e0', 'left', 600);

      const t = g.mode === 'finish' ? (g.lastLap || g.raceTime) : g.raceTime;
      panel(ctx, W - 290, 36, 250, 92, 14, 'rgba(8,12,20,.62)', 'rgba(255,255,255,.12)');
      txt(ctx, fmtTime(t), W - 270, 82, 30, '#f2c14e', 'left', 800);
      txt(ctx, 'ВРЕМЯ', W - 270, 108, 14, '#9fc8e0', 'left', 600);

      const bwidth = 220;
      panel(ctx, W - 290, 140, 250, 24, 10, 'rgba(8,12,20,.55)', 'rgba(255,255,255,.1)');
      ctx.fillStyle = g.boost > 0.999 ? '#8ce6a5' : '#19c3e8';
      U.rr(ctx, W - 287, 143, (bwidth) * g.boost, 18, 8);
      ctx.fill();
      txt(ctx, 'НИТРО · A', W - 290, 186, 12, '#9fc8e0', 'left', 600);

      txt(ctx, '↑ ГАЗ   ↓ ТОРМОЗ   ← → РУЛЬ   A НИТРО   B ПАУЗА', 40, H - 34, 14, 'rgba(220,235,250,.65)', 'left', 600);

      if (g.mode === 'intro') {
        ctx.fillStyle = 'rgba(8,6,16,.82)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'НЕОН-ГРАН-ПРИ', W / 2, 250, 80, '#ffd9e2', 'center', 800);
        txt(ctx, 'Два круга по ночному шоссе. Обгоняйте соперников и держите нитро.', W / 2, 306, 20, '#c9a6d8', 'center', 500);
        txt(ctx, 'A — СТАРТ', W / 2, 386, 24, '#19c3e8', 'center', 700);
        txt(ctx, 'ЛИДЕРЫ', W / 2, 452, 14, '#9fc8e0', 'center', 700);
        if (!g.board.length) txt(ctx, 'пока пусто — установите первый рекорд', W / 2, 486, 17, '#7f93a6', 'center', 500);
        for (let i = 0; i < g.board.length; i++) {
          txt(ctx, (i + 1) + '.  ' + fmtTime(g.board[i]), W / 2, 486 + i * 28, 18, i === 0 ? '#f2c14e' : '#a9bccd', 'center', 600);
        }
      }

      if (g.mode === 'count') {
        const n = Math.ceil(g.countT - 0.2);
        const label = n > 0 ? String(n) : 'ГАЗ!';
        const pulse = 1 + (g.countT % 1) * 0.4;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(pulse, pulse);
        txt(ctx, label, 0, 24, 110, n > 0 ? '#eaf6ff' : '#8ce6a5', 'center', 800);
        ctx.restore();
        txt(ctx, '↑ — газ', W / 2, H / 2 + 92, 18, '#9fc8e0', 'center', 600);
      }

      if (g.mode === 'pause') {
        ctx.fillStyle = 'rgba(8,6,16,.72)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ПАУЗА', W / 2, H / 2, 64, '#eaf6ff', 'center', 800);
        txt(ctx, 'B — ПРОДОЛЖИТЬ', W / 2, H / 2 + 50, 18, '#9fc8e0', 'center', 600);
      }

      if (g.mode === 'finish') {
        ctx.fillStyle = 'rgba(8,6,16,.82)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ФИНИШ', W / 2, 170, 64, '#8ce6a5', 'center', 800);
        txt(ctx, 'Ваше время: ' + fmtTime(g.lastLap || g.raceTime), W / 2, 222, 24, '#eaf6ff', 'center', 700);
        if (g.newRecord) txt(ctx, 'НОВЫЙ РЕКОРД!', W / 2, 258, 20, '#f2c14e', 'center', 700);
        txt(ctx, 'ТАБЛИЦА ЛИДЕРОВ', W / 2, 318, 14, '#9fc8e0', 'center', 700);
        for (let i = 0; i < g.board.length; i++) {
          const isNew = g.board[i] === g.lastLap;
          txt(ctx, (i + 1) + '.   ' + fmtTime(g.board[i]), W / 2, 354 + i * 32, 22, isNew ? '#f2c14e' : '#cfe0ee', 'center', isNew ? 800 : 600);
        }
        txt(ctx, 'A — ЕЩЁ РАЗ', W / 2, 560, 20, '#19c3e8', 'center', 700);
      }
      ctx.restore();
    };

    return g;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return m + ':' + String(sec).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
  }

  add({
    id: 'race',
    name: 'НЕОН-ГРАН-ПРИ',
    desc: 'Гонки с видом сзади: повороты, соперники, нитро и таблица лидеров.',
    author: 'Switch 2',
    sizeMB: 60,
    format: 'JS',
    icon: 'race',
    color: '#2a1020',
    create: racing,
  });

  /* ============================== 3. УЗЕЛОК ============================== */
  function nodesGame(ctx) {
    const TYPES = {
      start: { title: 'СТАРТ', kind: 'event', outs: ['out'], color: '#8ce6a5', hint: 'один раз при запуске' },
      tick: { title: 'КАЖДЫЙ КАДР', kind: 'event', outs: ['out'], color: '#8ce6a5', hint: 'постоянно' },
      key: { title: 'НАЖАТИЕ', kind: 'event', outs: ['out'], color: '#8ce6a5', p: { action: 'left' }, hint: 'кнопка' },
      timer: { title: 'ТАЙМЕР', kind: 'event', outs: ['out'], color: '#8ce6a5', p: { sec: 1 }, hint: 'каждые N секунд' },
      onHit: { title: 'ПРИ КАСАНИИ', kind: 'event', outs: ['out'], color: '#8ce6a5', hint: 'игрок поймал предмет' },

      num: { title: 'ЧИСЛО', kind: 'value', outs: ['v'], color: '#19c3e8', p: { v: 1 }, hint: 'значение' },
      rand: { title: 'СЛУЧАЙНОЕ', kind: 'value', outs: ['v'], color: '#19c3e8', p: { max: 10 }, hint: 'от 0 до N' },
      score: { title: 'СЧЁТ', kind: 'value', outs: ['v'], color: '#19c3e8', hint: 'текущие очки' },
      keyVal: { title: 'КНОПКА ±1', kind: 'value', outs: ['v'], color: '#19c3e8', p: { action: 'left' }, hint: 'нажата = 1' },
      posX: { title: 'ИГРОК X', kind: 'value', outs: ['v'], color: '#19c3e8', hint: 'координата' },
      add: { title: 'СЛОЖИТЬ', kind: 'value', ins: ['a', 'b'], outs: ['v'], color: '#19c3e8', hint: 'A + B' },
      gt: { title: 'БОЛЬШЕ', kind: 'value', ins: ['a', 'b'], outs: ['v'], color: '#19c3e8', hint: 'A > B' },

      control: { title: 'УПРАВЛЕНИЕ', kind: 'action', ins: ['exec'], color: '#f2c14e', hint: 'игрок ходит сам' },
      move: { title: 'ДВИГАТЬ ИГРОКА', kind: 'action', ins: ['exec'], color: '#f2c14e', p: { dx: 4, dy: 0 }, hint: 'сдвиг за кадр' },
      spawn: { title: 'СПАВН ЗВЕЗДЫ', kind: 'action', ins: ['exec'], color: '#f2c14e', hint: 'новая цель' },
      plusScore: { title: '+ ОЧКИ', kind: 'action', ins: ['exec', 'v'], color: '#f2c14e', p: { amount: 1 }, hint: 'награда' },
      bg: { title: 'ЦВЕТ ФОНА', kind: 'action', ins: ['exec'], color: '#f2c14e', p: { color: '#0b1220' }, hint: 'переключить' },
      say: { title: 'НАДПИСЬ', kind: 'action', ins: ['exec'], color: '#f2c14e', p: { text: 'Привет!' }, hint: 'подсказка' },
      goal: { title: 'ЦЕЛЬ', kind: 'action', ins: ['exec'], color: '#b06bff', p: { n: 10 }, hint: 'победа при N очках' },
      ifNode: { title: 'ЕСЛИ', kind: 'cond', ins: ['exec', 'v'], outs: ['then', 'else'], color: '#b06bff', hint: 'ветвление' },
      win: { title: 'ПОБЕДА', kind: 'action', ins: ['exec'], color: '#b06bff', hint: 'финал' },
      lose: { title: 'ПОРАЖЕНИЕ', kind: 'action', ins: ['exec'], color: '#ff4a57', hint: 'финал' },
    };
    const ORDER = Object.keys(TYPES);
    const KEY_ACTIONS = ['left', 'right', 'up', 'down', 'ok'];
    const BG_COLORS = ['#0b1220', '#140b1e', '#0d1a14', '#1a100b'];
    const SAYS = ['Поймал!', 'Отлично!', 'Ещё раз!', 'Так держать!'];
    const PARAM_LABEL = { v: 'значение', max: 'до', sec: 'секунд', action: 'кнопка', dx: 'сдвиг X', dy: 'сдвиг Y', amount: 'очки', color: 'цвет', text: 'текст', n: 'очков для победы' };

    const canvas = ctx.canvas;
    let nodes = [];
    let wires = [];
    let nextId = 1;
    let sel = null;
    let drag = null;
    let wireDrag = null;
    let mode = 'edit';
    let paletteOpen = false;
    let paletteSel = 0;
    let rt = null;
    let saveT = 0;

    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function preset() {
      const ns = [
        { id: 1, type: 'start', x: 300, y: 80, p: {} },
        { id: 2, type: 'say', x: 560, y: 80, p: { text: 'Ловите звёзды!' } },
        { id: 3, type: 'timer', x: 300, y: 190, p: { sec: 0.8 } },
        { id: 4, type: 'spawn', x: 560, y: 190, p: {} },
        { id: 5, type: 'tick', x: 300, y: 300, p: {} },
        { id: 6, type: 'control', x: 560, y: 270, p: {} },
        { id: 7, type: 'goal', x: 560, y: 370, p: { n: 10 } },
        { id: 8, type: 'onHit', x: 300, y: 430, p: {} },
        { id: 9, type: 'plusScore', x: 560, y: 470, p: { amount: 1 } },
      ];
      const ws = [
        { from: [1, 'out'], to: [2, 'exec'] },
        { from: [3, 'out'], to: [4, 'exec'] },
        { from: [5, 'out'], to: [6, 'exec'] },
        { from: [5, 'out'], to: [7, 'exec'] },
        { from: [8, 'out'], to: [9, 'exec'] },
      ];
      return { ns, ws };
    }

    function load() {
      let data = null;
      try {
        const raw = localStorage.getItem('switch2.nodes.graph');
        if (raw) data = JSON.parse(raw);
      } catch (e) { data = null; }
      if (!data || !Array.isArray(data.nodes) || !data.nodes.length) {
        const p = preset();
        nodes = p.ns;
        wires = p.ws;
      } else {
        nodes = data.nodes.filter((n) => n && TYPES[n.type]);
        wires = (data.wires || []).filter((w) => w && w.from && w.to);
      }
      nextId = 1;
      for (const n of nodes) nextId = Math.max(nextId, n.id + 1);
    }

    function save() {
      saveT = 0;
      try {
        localStorage.setItem('switch2.nodes.graph', JSON.stringify({ nodes, wires }));
      } catch (e) { /* приватный режим */ }
    }

    function node(id) { return nodes.find((n) => n.id === id) || null; }

    function paramsOf(t) { return t.p ? Object.keys(t.p) : []; }

    function rectOf(n) {
      const t = TYPES[n.type];
      const ins = t.ins ? t.ins.length : 0;
      const outs = t.outs ? t.outs.length : 0;
      const pp = paramsOf(t);
      const h = 38 + Math.max(ins, outs) * 26 + pp.length * 26 + (pp.length ? 12 : 6);
      return { x: n.x, y: n.y, w: 200, h };
    }

    function portPos(n, port, isOut) {
      const r = rectOf(n);
      const t = TYPES[n.type];
      const list = isOut ? (t.outs || []) : (t.ins || []);
      const i = Math.max(0, list.indexOf(port));
      return { x: r.x + (isOut ? r.w : 0), y: r.y + 38 + 13 + i * 26 };
    }

    function isExecPort(port) { return port === 'out' || port === 'exec' || port === 'then' || port === 'else'; }

    function execFrom(id, port, depth) {
      if (!rt || rt.over || depth > 40) return;
      const outs = wires.filter((w) => w.from[0] === id && w.from[1] === port);
      for (const w of outs) execNode(w.to[0], depth + 1);
    }

    function execNode(id, depth) {
      if (!rt || rt.over || depth > 40) return;
      const n = node(id);
      if (!n) return;
      const t = TYPES[n.type];
      if (t.kind === 'action') {
        doAction(n);
        execFrom(n.id, 'out', depth);
      } else if (t.kind === 'cond') {
        const v = valPort(n, 'v', 0);
        execFrom(n.id, v ? 'then' : 'else', depth);
      }
    }

    function valPort(n, port, depth) {
      const w = wires.find((x) => x.to[0] === n.id && x.to[1] === port);
      if (!w) return 0;
      return evalOut(w.from[0], depth + 1);
    }

    function evalOut(id, depth) {
      if (depth > 30) return 0;
      const n = node(id);
      if (!n) return 0;
      const t = TYPES[n.type];
      const p = n.p || {};
      switch (n.type) {
        case 'num': return +p.v || 0;
        case 'rand': return Math.random() * (+p.max || 1);
        case 'score': return rt ? rt.score : 0;
        case 'keyVal': {
          if (!rt || !rt.input) return 0;
          const h = rt.input.held;
          if (p.action === 'left') return h.has('left') ? -1 : 0;
          if (p.action === 'right') return h.has('right') ? 1 : 0;
          if (p.action === 'up') return h.has('up') ? 1 : 0;
          if (p.action === 'down') return h.has('down') ? 1 : 0;
          return h.has(p.action) ? 1 : 0;
        }
        case 'posX': return rt ? rt.player.x : 0;
        case 'add': return valPort(n, 'a', depth) + valPort(n, 'b', depth);
        case 'gt': return valPort(n, 'a', depth) > valPort(n, 'b', depth) ? 1 : 0;
        default: return 0;
      }
    }

    function clampPlayer() {
      rt.player.x = U.clamp(rt.player.x, 50, W - 50);
      rt.player.y = U.clamp(rt.player.y, H - 240, H - 60);
    }

    function doAction(n) {
      const p = n.p || {};
      const dt = rt.dt || 0;
      switch (n.type) {
        case 'control': {
          const dir = (rt.input.held.has('right') ? 1 : 0) - (rt.input.held.has('left') ? 1 : 0);
          const vert = (rt.input.held.has('down') ? 1 : 0) - (rt.input.held.has('up') ? 1 : 0);
          rt.player.x += dir * 470 * dt;
          rt.player.y += vert * 340 * dt;
          clampPlayer();
          break;
        }
        case 'move':
          rt.player.x += (+p.dx || 0) * 6;
          rt.player.y += (+p.dy || 0) * 6;
          clampPlayer();
          break;
        case 'spawn':
          rt.items.push({ x: U.rand(70, W - 70), y: 66, r: 13, vy: U.rand(85, 150), spin: U.rand(0, 6.28) });
          break;
        case 'plusScore': {
          const v = valPort(n, 'v', 0);
          rt.score += v || (+p.amount || 1);
          break;
        }
        case 'bg': rt.bg = p.color || rt.bg; break;
        case 'say': rt.msg = p.text || ''; rt.msgT = 2.2; break;
        case 'goal': if (rt.score >= (+p.n || 10)) rt.over = 'win'; break;
        case 'win': rt.over = 'win'; break;
        case 'lose': rt.over = 'lose'; break;
        default: break;
      }
    }

    function newRt() {
      return {
        player: { x: W / 2, y: H - 96, r: 20 },
        items: [],
        score: 0,
        msg: '',
        msgT: 0,
        bg: '#0b1220',
        over: null,
        t: 0,
        dt: 0,
        input: { held: new Set(), pressed: new Set() },
      };
    }

    function startPlay() {
      mode = 'play';
      rt = newRt();
      for (const n of nodes) {
        const t = TYPES[n.type];
        if (t.kind === 'event' && n.type === 'start') execFrom(n.id, 'out', 0);
      }
      Sfx.ok();
    }

    function stopPlay() {
      mode = 'edit';
      rt = null;
      Sfx.back();
    }

    function addNode(type, x, y) {
      const t = TYPES[type];
      const n = { id: nextId++, type, x: U.clamp(x || 640, 280, W - 240), y: U.clamp(y || 320, 70, H - 220), p: t.p ? clone(t.p) : {} };
      nodes.push(n);
      sel = n.id;
      save();
      Sfx.ok();
    }

    function deleteSel() {
      if (sel == null) return;
      nodes = nodes.filter((n) => n.id !== sel);
      wires = wires.filter((w) => w.from[0] !== sel && w.to[0] !== sel);
      sel = nodes.length ? nodes[nodes.length - 1].id : null;
      save();
      Sfx.back();
    }

    function connect(fromNode, fromPort, toNode, toPort) {
      if (fromNode === toNode) return false;
      if (isExecPort(fromPort) !== isExecPort(toPort)) return false;
      if (isExecPort(fromPort) && toPort !== 'exec') return false;
      if (!isExecPort(fromPort) && toPort === 'exec') return false;
      wires = wires.filter((w) => !(w.to[0] === toNode && w.to[1] === toPort));
      wires.push({ from: [fromNode, fromPort], to: [toNode, toPort] });
      save();
      Sfx.move();
      return true;
    }

    function hitPort(p, isOut) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const t = TYPES[n.type];
        const list = isOut ? (t.outs || []) : (t.ins || []);
        for (const port of list) {
          const q = portPos(n, port, isOut);
          if (U.dist(p.x, p.y, q.x, q.y) < 12) return { n, port };
        }
      }
      return null;
    }

    function hitNode(p) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const r = rectOf(nodes[i]);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return nodes[i];
      }
      return null;
    }

    function paramRect(n, j) {
      const r = rectOf(n);
      const t = TYPES[n.type];
      const top = 38 + Math.max(t.ins ? t.ins.length : 0, t.outs ? t.outs.length : 0) * 26 + 8;
      return { x: r.x + 10, y: r.y + top + j * 26, w: r.w - 20, h: 22 };
    }

    function cycleParam(n, name, dir) {
      const p = n.p;
      if (name === 'action') {
        let i = KEY_ACTIONS.indexOf(p.action);
        i = (i + dir + KEY_ACTIONS.length) % KEY_ACTIONS.length;
        p.action = KEY_ACTIONS[i];
      } else if (name === 'color') {
        let i = BG_COLORS.indexOf(p.color);
        i = (i + dir + BG_COLORS.length) % BG_COLORS.length;
        p.color = BG_COLORS[i];
      } else if (name === 'text') {
        let i = SAYS.indexOf(p.text);
        i = (i + dir + SAYS.length) % SAYS.length;
        p.text = SAYS[i];
      } else if (name === 'sec') {
        p.sec = U.clamp(Math.round(((+p.sec || 1) + dir * 0.5) * 2) / 2, 0.5, 5);
      } else {
        const step = 1;
        p[name] = U.clamp(Math.round((+p[name] || 0) + dir * step), -40, 60);
      }
      save();
      Sfx.move();
    }

    /* ------------------------------ мышь ------------------------------ */
    function local(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }

    const BTN = { play: { x: W - 500, y: 12, w: 150, h: 34 }, reset: { x: W - 340, y: 12, w: 140, h: 34 }, clear: { x: W - 190, y: 12, w: 170, h: 34 } };
    function inBtn(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

    function paletteRect(i) {
      return { x: 12, y: 126 + i * 27, w: 236, h: 25 };
    }

    function onDown(e) {
      if (e.button === 2) return;
      e.preventDefault();
      e.stopPropagation();
      const p = local(e);
      if (mode === 'play') {
        if (rt && rt.over && p.y > H / 2 && p.y < H / 2 + 70) startPlay();
        return;
      }
      if (inBtn(p, BTN.play)) { startPlay(); return; }
      if (inBtn(p, BTN.reset)) {
        const pr = preset();
        nodes = pr.ns;
        wires = pr.ws;
        nextId = 10;
        save();
        Sfx.back();
        return;
      }
      if (inBtn(p, BTN.clear)) {
        nodes = [];
        wires = [];
        sel = null;
        save();
        Sfx.error();
        return;
      }
      if (paletteOpen) {
        for (let i = 0; i < ORDER.length; i++) {
          const r = paletteRect(i);
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
            addNode(ORDER[i], 640, 320);
            paletteOpen = false;
            return;
          }
        }
        paletteOpen = false;
        return;
      }
      for (let i = 0; i < ORDER.length; i++) {
        const r = paletteRect(i);
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          addNode(ORDER[i], 620, 300);
          return;
        }
      }

      const out = hitPort(p, true);
      if (out) {
        wireDrag = { from: out.n.id, port: out.port, x: p.x, y: p.y };
        sel = out.n.id;
        return;
      }
      const into = hitPort(p, false);
      if (into && wireDrag) return;

      const n = hitNode(p);
      if (n) {
        sel = n.id;
        const r = rectOf(n);
        const t = TYPES[n.type];
        const pp = paramsOf(t);
        for (let j = 0; j < pp.length; j++) {
          const pr = paramRect(n, j);
          if (p.x >= pr.x && p.x <= pr.x + pr.w && p.y >= pr.y && p.y <= pr.y + pr.h) {
            cycleParam(n, pp[j], p.x > pr.x + pr.w - 34 ? 1 : p.x > pr.x + pr.w - 68 ? -1 : 1);
            return;
          }
        }
        drag = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
        void r;
        return;
      }
      sel = null;
    }

    function onMove(e) {
      if (mode !== 'edit') return;
      const p = local(e);
      if (drag) {
        const n = node(drag.id);
        if (!n) return;
        n.x = U.clamp(p.x - drag.dx, 268, W - 220);
        n.y = U.clamp(p.y - drag.dy, 66, H - 140);
        drag.moved = true;
      }
      if (wireDrag) {
        wireDrag.x = p.x;
        wireDrag.y = p.y;
      }
    }

    function onUp(e) {
      if (mode !== 'edit') return;
      const p = local(e);
      if (drag) {
        if (drag.moved) save();
        drag = null;
      }
      if (wireDrag) {
        const into = hitPort(p, false);
        if (into) connect(wireDrag.from, wireDrag.port, into.n.id, into.port);
        wireDrag = null;
      }
    }

    function onContext(e) {
      e.preventDefault();
      e.stopPropagation();
      if (mode !== 'edit') return;
      const n = hitNode(local(e));
      if (n) {
        sel = n.id;
        deleteSel();
      }
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('contextmenu', onContext);

    load();

    /* ------------------------------ отрисовка ------------------------------ */
    function drawStar(x, y, r, rot, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i / 10) * U.TAU - Math.PI / 2;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    function drawPort(q, color, filled) {
      ctx.beginPath();
      ctx.arc(q.x, q.y, 6.5, 0, U.TAU);
      ctx.fillStyle = filled ? color : '#0b1220';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    function drawWire(a, b, exec) {
      const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x + dx, a.y, b.x - dx, b.y, b.x, b.y);
      ctx.strokeStyle = exec ? 'rgba(140,230,165,.75)' : 'rgba(25,195,232,.75)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    function drawEdit() {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0a1119');
      g.addColorStop(1, '#0b0a17');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(120,170,210,.06)';
      ctx.lineWidth = 1;
      for (let x = 270; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 60; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(260, y); ctx.lineTo(W, y); ctx.stroke();
      }

      ctx.fillStyle = 'rgba(10,16,24,.9)';
      ctx.fillRect(0, 0, 260, H);
      ctx.fillStyle = 'rgba(120,170,210,.18)';
      ctx.fillRect(260, 0, 1, H);

      txt(ctx, 'УЗЕЛОК', 20, 36, 24, '#eaf6ff', 'left', 800);
      txt(ctx, 'визуальный движок', 20, 56, 12, '#7f93a6', 'left', 500);
      panel(ctx, BTN.play.x, BTN.play.y, BTN.play.w, BTN.play.h, 10, 'rgba(140,230,165,.12)', 'rgba(140,230,165,.45)');
      panel(ctx, BTN.reset.x, BTN.reset.y, BTN.reset.w, BTN.reset.h, 10, 'rgba(120,170,210,.08)', 'rgba(120,170,210,.28)');
      panel(ctx, BTN.clear.x, BTN.clear.y, BTN.clear.w, BTN.clear.h, 10, 'rgba(255,74,87,.08)', 'rgba(255,74,87,.35)');
      txt(ctx, 'ИГРАТЬ', W - 470, 35, 15, '#8ce6a5', 'center', 800);
      txt(ctx, 'СБРОС', W - 316, 35, 14, '#9fc8e0', 'center', 700);
      txt(ctx, 'ОЧИСТИТЬ', W - 162, 35, 14, '#ff9f9f', 'center', 700);

      txt(ctx, 'УЗЛЫ', 16, 112, 12, '#7f93a6', 'left', 700);
      for (let i = 0; i < ORDER.length; i++) {
        const t = TYPES[ORDER[i]];
        const r = paletteRect(i);
        ctx.fillStyle = 'rgba(255,255,255,.03)';
        U.rr(ctx, r.x, r.y, r.w, r.h, 7);
        ctx.fill();
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(r.x + 14, r.y + 12.5, 4.5, 0, U.TAU);
        ctx.fill();
        txt(ctx, t.title, r.x + 28, r.y + 17, 12.5, '#cfe0ee', 'left', 600);
      }

      for (const w of wires) {
        const a = node(w.from[0]);
        const b = node(w.to[0]);
        if (!a || !b) continue;
        drawWire(portPos(a, w.from[1], true), portPos(b, w.to[1], false), isExecPort(w.from[1]));
      }
      if (wireDrag) {
        const a = node(wireDrag.from);
        if (a) drawWire(portPos(a, wireDrag.port, true), { x: wireDrag.x, y: wireDrag.y }, isExecPort(wireDrag.port));
      }

      for (const n of nodes) {
        const t = TYPES[n.type];
        const r = rectOf(n);
        ctx.save();
        ctx.shadowColor = sel === n.id ? 'rgba(25,195,232,.5)' : 'rgba(0,0,0,.45)';
        ctx.shadowBlur = sel === n.id ? 18 : 10;
        panel(ctx, r.x, r.y, r.w, r.h, 12, 'rgba(15,22,32,.96)', sel === n.id ? 'rgba(25,195,232,.85)' : 'rgba(120,170,210,.22)');
        ctx.shadowBlur = 0;
        ctx.fillStyle = t.color;
        U.rr(ctx, r.x, r.y, r.w, 30, 12);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.16)';
        ctx.fillRect(r.x, r.y + 20, r.w, 10);
        txt(ctx, t.title, r.x + 12, r.y + 21, 12.5, '#0b1118', 'left', 800);
        ctx.restore();

        const ins = t.ins || [];
        const outs = t.outs || [];
        for (const port of ins) {
          const q = portPos(n, port, false);
          drawPort(q, isExecPort(port) ? '#8ce6a5' : '#19c3e8', false);
          txt(ctx, port === 'exec' ? 'вход' : port, q.x + 11, q.y + 4, 9.5, '#7f93a6', 'left', 500);
        }
        for (const port of outs) {
          const q = portPos(n, port, true);
          drawPort(q, isExecPort(port) ? '#8ce6a5' : '#19c3e8', false);
          txt(ctx, port === 'out' ? 'далее' : port, q.x - 11, q.y + 4, 9.5, '#7f93a6', 'right', 500);
        }

        const pp = paramsOf(t);
        for (let j = 0; j < pp.length; j++) {
          const pr = paramRect(n, j);
          const name = pp[j];
          ctx.fillStyle = 'rgba(255,255,255,.045)';
          U.rr(ctx, pr.x, pr.y, pr.w, pr.h, 6);
          ctx.fill();
          txt(ctx, PARAM_LABEL[name] || name, pr.x + 8, pr.y + 15, 10.5, '#8fb4c9', 'left', 500);
          txt(ctx, name === 'text' ? '«' + n.p[name] + '»' : String(n.p[name]), pr.x + pr.w - 46, pr.y + 15, 11, '#eaf6ff', 'right', 700);
          txt(ctx, '−', pr.x + pr.w - 30, pr.y + 15, 12, '#9fc8e0', 'center', 700);
          txt(ctx, '+', pr.x + pr.w - 12, pr.y + 15, 12, '#9fc8e0', 'center', 700);
        }
      }

      if (!nodes.length) {
        txt(ctx, 'Пусто. Нажмите узел слева, чтобы начать.', W / 2, H / 2, 22, '#5f7488', 'center', 600);
      }

      txt(ctx, 'МЫШЬ: тащите узлы · ЛКМ по кружку — связать · ПКМ — удалить · Плюс — играть', 280, H - 16, 12, 'rgba(180,205,225,.55)', 'left', 500);

      if (paletteOpen) {
        ctx.fillStyle = 'rgba(4,8,14,.6)';
        ctx.fillRect(0, 0, W, H);
        panel(ctx, W / 2 - 260, 70, 520, 620, 16, 'rgba(14,20,30,.98)', 'rgba(120,170,210,.35)');
        txt(ctx, 'ДОБАВИТЬ УЗЕЛ', W / 2, 104, 18, '#eaf6ff', 'center', 800);
        for (let i = 0; i < ORDER.length; i++) {
          const t = TYPES[ORDER[i]];
          const y = 136 + i * 25;
          const on = i === paletteSel;
          if (on) {
            ctx.fillStyle = 'rgba(25,195,232,.14)';
            U.rr(ctx, W / 2 - 230, y - 15, 460, 23, 6);
            ctx.fill();
          }
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.arc(W / 2 - 214, y - 5, 4, 0, U.TAU);
          ctx.fill();
          txt(ctx, t.title, W / 2 - 200, y, 12.5, on ? '#ffffff' : '#cfe0ee', 'left', on ? 700 : 500);
          txt(ctx, t.hint, W / 2 + 210, y, 10, '#6f8294', 'right', 500);
        }
        txt(ctx, '↑ ↓ выбрать · A добавить · B закрыть', W / 2, 678, 12, '#8fb4c9', 'center', 500);
      }
    }

    function drawPlay() {
      if (!rt) return;
      ctx.fillStyle = rt.bg || '#0b1220';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 60; i++) {
        const x = (i * 211) % W;
        const y = (i * 137 + rt.t * 12) % H;
        ctx.fillStyle = i % 3 ? 'rgba(127,216,255,.35)' : 'rgba(176,107,255,.35)';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      for (const it of rt.items) {
        drawStar(it.x, it.y, it.r, it.spin + rt.t * 2, '#f2c14e');
      }

      const p = rt.player;
      panel(ctx, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, 8, '#19c3e8', 'rgba(255,255,255,.5)');
      ctx.fillStyle = '#07121c';
      ctx.beginPath();
      ctx.arc(p.x - 6, p.y - 4, 3, 0, U.TAU);
      ctx.arc(p.x + 6, p.y - 4, 3, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = '#07121c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 3, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();

      txt(ctx, 'ОЧКИ: ' + rt.score, 40, 56, 26, '#eaf6ff', 'left', 800);
      txt(ctx, 'ЦЕЛЬ: ' + goalText(), W - 40, 56, 16, '#9fc8e0', 'right', 600);

      if (rt.msg && rt.msgT > 0) {
        ctx.globalAlpha = Math.min(1, rt.msgT);
        panel(ctx, W / 2 - 170, H - 168, 340, 46, 12, 'rgba(8,14,22,.8)', 'rgba(25,195,232,.4)');
        txt(ctx, rt.msg, W / 2, H - 138, 18, '#d8f3ff', 'center', 700);
        ctx.globalAlpha = 1;
      }

      txt(ctx, 'Плюс / B — остановить', 40, H - 20, 12, 'rgba(180,205,225,.45)', 'left', 500);

      if (rt.over) {
        ctx.fillStyle = 'rgba(4,8,14,.78)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, rt.over === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', W / 2, H / 2 - 40, 64, rt.over === 'win' ? '#8ce6a5' : '#ff6b76', 'center', 800);
        txt(ctx, 'Очки: ' + rt.score, W / 2, H / 2 + 14, 26, '#eaf6ff', 'center', 700);
        txt(ctx, 'A — ЕЩЁ РАЗ', W / 2, H / 2 + 66, 18, '#19c3e8', 'center', 700);
      }
    }

    function goalText() {
      const g = nodes.find((n) => n.type === 'goal');
      return g ? String((g.p && g.p.n) || 10) : '—';
    }

    const menu = makeMenu(ctx,
      { id: 'nodes', name: 'УЗЕЛОК', format: 'JS', desc: 'Визуальный движок: собирайте игры из узлов, без кода.' },
      {
        author: 'Switch 2',
        playLabel: 'КОНСТРУКТОР',
        bestText: () => 'УЗЛОВ В ГРАФЕ: ' + nodes.length,
        reset: () => { try { localStorage.removeItem('switch2.nodes.graph'); } catch (e) { /* приватный режим */ } },
      }
    );
    let menuOn = true;

    const game = {
      start() {
        mode = 'edit';
        rt = null;
        load();
        menu.open();
        menuOn = true;
      },
      destroy() {
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('contextmenu', onContext);
      },
      update(dt, input) {
        dt = Math.min(dt, 0.05);
        saveT += dt;
        if (menuOn) {
          const act = menu.update(dt, input);
          if (act === 'play') { menuOn = false; mode = 'edit'; load(); }
          else if (act === 'exit') exitToOS();
          return;
        }
        if (saveT > 2 && mode === 'edit') save();
        if (input.pressed.has('plus')) {
          if (mode === 'play') { stopPlay(); return; }
          startPlay();
          return;
        }
        if (input.pressed.has('back') || input.pressed.has('b')) {
          if (mode === 'play') { stopPlay(); return; }
        }
        if (input.pressed.has('x')) {
          paletteOpen = !paletteOpen;
          paletteSel = 0;
          Sfx.move();
        }
        if (mode === 'edit') {
          if (paletteOpen) {
            if (input.pressed.has('up')) { paletteSel = (paletteSel - 1 + ORDER.length) % ORDER.length; Sfx.move(); }
            if (input.pressed.has('down')) { paletteSel = (paletteSel + 1) % ORDER.length; Sfx.move(); }
            if (input.pressed.has('ok') || input.pressed.has('a')) {
              addNode(ORDER[paletteSel], 640, 300);
              paletteOpen = false;
            }
          } else {
            if (input.pressed.has('left') || input.pressed.has('right')) {
              if (!nodes.length) return;
              const i = nodes.findIndex((n) => n.id === sel);
              const d = input.pressed.has('left') ? -1 : 1;
              sel = nodes[(i < 0 ? 0 : (i + d + nodes.length) % nodes.length)].id;
              Sfx.move();
            }
            if (input.pressed.has('up') || input.pressed.has('down')) {
              const n = node(sel);
              if (n) { n.y = U.clamp(n.y + (input.pressed.has('up') ? -16 : 16), 66, H - 140); save(); }
            }
            if (input.pressed.has('ok') || input.pressed.has('a')) startPlay();
            if (input.pressed.has('y')) {
              const first = nodes[0];
              if (sel != null && first && first.id !== sel) connect(sel, first.type === 'cond' ? 'then' : 'out', first.id, 'exec');
            }
            if (input.pressed.has('back') && sel != null) deleteSel();
          }
          return;
        }

        if (mode === 'play' && rt) {
          if (rt.over) {
            if (input.pressed.has('ok') || input.pressed.has('a')) startPlay();
            return;
          }
          rt.dt = dt;
          rt.t += dt;
          rt.input = input;
          if (rt.msgT > 0) rt.msgT -= dt;

          for (const n of nodes) {
            if (n.type === 'key' && input.pressed.has(n.p.action)) execFrom(n.id, 'out', 0);
            if (n.type === 'timer') {
              n._t = (n._t || 0) + dt;
              if (n._t >= (+n.p.sec || 1)) { n._t = 0; execFrom(n.id, 'out', 0); }
            }
          }
          for (const n of nodes) if (n.type === 'tick') execFrom(n.id, 'out', 0);

          for (let i = rt.items.length - 1; i >= 0; i--) {
            const it = rt.items[i];
            it.y += it.vy * dt;
            it.spin += dt * 1.6;
            if (it.y > H + 40) { rt.items.splice(i, 1); continue; }
            if (U.dist(it.x, it.y, rt.player.x, rt.player.y) < it.r + rt.player.r) {
              rt.items.splice(i, 1);
              for (const n of nodes) if (n.type === 'onHit') execFrom(n.id, 'out', 0);
            }
          }
        }
      },
      draw() {
        if (menuOn) { menu.draw(); return; }
        if (mode === 'play') drawPlay();
        else drawEdit();
      },
      debug() {
        return {
          mode, nodes: nodes.length, wires: wires.length,
          score: rt ? rt.score : null, over: rt ? rt.over : null,
          player: rt ? { x: Math.round(rt.player.x), y: Math.round(rt.player.y) } : null,
          items: rt ? rt.items.map((i) => ({ x: Math.round(i.x), y: Math.round(i.y) })).slice(0, 4) : [],
        };
      },
    };

    return game;
  }

  add({
    id: 'nodes',
    name: 'УЗЕЛОК',
    desc: 'Визуальный движок: собирайте игры из узлов мышью, без кода.',
    author: 'Switch 2',
    sizeMB: 45,
    format: 'JS',
    icon: 'nodes',
    color: '#12241c',
    create: nodesGame,
  });

  /* ============================== 4. СЕРДЦЕ НЕБУЛЫ ============================== */
  function heartGame(ctx) {
    const BOX = { x: W / 2 - 290, y: 296, w: 580, h: 268 };
    const MENU = [
      { id: 'attack', label: 'АТАКА', sub: 'точный удар' },
      { id: 'act', label: 'ДЕЙСТВИЕ', sub: 'поговорить' },
      { id: 'item', label: 'ПРЕДМЕТ', sub: 'пирог ×1' },
      { id: 'spare', label: 'ПОЩАДА', sub: 'милосердие' },
    ];
    const ACTS = [
      { label: 'ПРОВЕРИТЬ', text: 'Вы проверяете врага. Видны слабые места: щит опускается.' },
      { label: 'О ФОРМАТЕ', text: 'Вы спрашиваете о NBS. Формат действительно быстрее — враг смягчается.' },
      { label: 'ПОХВАЛИТЬ', text: 'Вы хвалите оптимизацию. Враг довольно гудит и опускает щит.' },
    ];

    const FOES = [
      { id: 'trainer', name: 'ТРЕНЕР', hp: 36, speed: 0.8, intro: ['ТРЕНЕР: «Это ядро NBS. Здесь учатся выживать.»', 'Стрелки — двигать сердечко. Не касайся пуль.', 'A — удар по полосе точности. ДЕЙСТВИЕ — разговор.', 'ПОЩАДА при 100% милосердия. Тренировка — без риска.'], outro: ['ТРЕНЕР: «Неплохо. Дальше — настоящие сторожа.»'] },
      { id: 'guard', name: 'СТРАЖ ФОРМАТА', hp: 60, speed: 1, intro: ['СТРАЖ: «Формат закрыт. Докажи, что тебе можно дальше.»'], outro: ['Страж рассыпается на байты. Путь открыт.'] },
      { id: 'imp', name: 'ИМП БАЙТОВ', hp: 52, speed: 1.15, intro: ['ИМП: «Мелкий формат! Сейчас сожму!»'], outro: ['Имп схлопнулся в точку.'] },
      { id: 'virus', name: 'ВИРУС', hp: 66, speed: 1.25, intro: ['ВИРУС: «Твоё ядро — моя копия.»'], outro: ['Вирус стёрт антивирусом ядра.'] },
      { id: 'hunter', name: 'ОХОТНИК', hp: 74, speed: 1.35, intro: ['ОХОТНИК: «Я собираю сердца форматов.»'], outro: ['Охотник отступает в тень.'] },
      { id: 'boss1', name: 'КОМПИЛЯТОР', hp: 120, speed: 1.2, boss: true, intro: ['КОМПИЛЯТОР: «Ты не пройдёшь сборку.»'], outro: ['Компилятор падает: ошибок больше, чем байтов.'] },
      { id: 'boss2', name: 'ЧЁРНАЯ ДЫРА', hp: 150, speed: 1.45, boss: true, intro: ['ЧЁРНАЯ ДЫРА: «Ядро поглотит всё.»'], outro: ['Дыра схлопывается. Формат свободен.'] },
    ];
    let progress = (window.Nebula ? Nebula.load('heart.save', null) : null) || { unlocked: 0, done: [] };
    if (!Array.isArray(progress.done)) progress.done = [];
    if (typeof progress.unlocked !== 'number') progress.unlocked = 0;

    const menu = makeMenu(ctx,
      { id: 'heart', name: 'СЕРДЦЕ НЕБУЛЫ', format: 'NBS', desc: 'Bullet-hell РПГ: обучение, враги и боссы. Уворачивайтесь, говорите, щадите.' },
      {
        author: 'NEBULA OS',
        playLabel: 'В БОЙ',
        bestText: () => 'ПОБЕЖДЕНО: ' + progress.done.filter(Boolean).length + ' / ' + FOES.length,
        reset: () => { progress = { unlocked: 0, done: [] }; if (window.Nebula) Nebula.save('heart.save', progress); },
      }
    );

    const g = {
      mode: 'home',
      t: 0,
      foeI: -1,
      foe: null,
      rosterI: 0,
      shake: 0,
      hp: 20,
      maxHp: 20,
      mercy: 0,
      enemyHp: 60,
      enemyMax: 60,
      items: 1,
      turn: 0,
      menuI: 0,
      actI: 0,
      lines: [],
      lineI: 0,
      charT: 0,
      after: null,
      text: '',
      soul: { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 },
      bullets: [],
      spawnT: 0,
      pattern: 0,
      angle: 0,
      turnT: 0,
      invuln: 0,
      attackPos: 0,
      attackDir: 1,
      winKind: null,
      intro: true,
    };

    function menuPrompt() {
      const lines = [
        'Враг молча смотрит. Формат ждёт вашего хода.',
        'Байты дрожат под вашими шагами.',
        'Враг проверяет: достоин ли ты кастомной прошивки?',
        'Ядро NBS мерцает. Ещё немного — и шлюз откроется.',
      ];
      return lines[Math.min(lines.length - 1, Math.max(0, g.turn - 1))];
    }

    function say(lines, after) {
      g.lines = lines.slice();
      g.lineI = 0;
      g.charT = 0;
      g.after = after || null;
      g.mode = 'dialog';
    }

    function currentLine() {
      return g.lines[g.lineI] || '';
    }

    function finishDialog() {
      const a = g.after;
      g.after = null;
      if (a === 'enemy') { startEnemy(); return; }
      if (a === 'win-spare') { win('spare'); return; }
      if (a === 'win-kill') { win('kill'); return; }
      toMenu();
    }

    function toMenu() {
      g.mode = 'menu';
      g.text = menuPrompt();
      g.soul.x = BOX.x + BOX.w / 2;
      g.soul.y = BOX.y + BOX.h / 2;
      g.bullets = [];
      g.menuI = 0;
      Sfx.move();
    }

    function startEnemy() {
      g.mode = 'enemy';
      g.turn++;
      g.pattern = (g.turn - 1) % 4;
      g.bullets = [];
      g.spawnT = 0.45;
      g.turnT = 6.4;
      g.angle = 0;
      g.invuln = 0;
      g.soul.x = BOX.x + BOX.w / 2;
      g.soul.y = BOX.y + BOX.h / 2;
      Sfx.move();
    }

    function win(kind) {
      g.mode = 'win';
      g.winKind = kind;
      if (g.foeI >= 0) {
        progress.done[g.foeI] = true;
        progress.unlocked = Math.max(progress.unlocked, Math.min(FOES.length - 1, g.foeI + 1));
        if (window.Nebula) Nebula.save('heart.save', progress);
        menu.addCoins(8);
      }
      Sfx.ok();
    }

    function lose() {
      g.mode = 'lose';
      Sfx.explode();
    }

    function hurt() {
      if (g.invuln > 0) return;
      g.invuln = 0.9;
      g.hp--;
      g.shake = 1;
      Sfx.error();
      if (g.hp <= 0) lose();
    }

    function chooseMenu(id) {
      Sfx.ok();
      if (id === 'attack') {
        g.mode = 'attackBar';
        g.attackPos = 0;
        g.attackDir = 1;
        return;
      }
      if (id === 'act') {
        g.mode = 'act';
        g.actI = 0;
        return;
      }
      if (id === 'item') {
        if (g.items > 0) {
          g.items--;
          g.hp = Math.min(g.maxHp, g.hp + 9);
          say(['Вы съедаете пирог формата. +9 HP. Вкус — как у сжатого кода.'], 'enemy');
        } else {
          say(['Пирог закончился. Карман пуст, как несжатый блок.'], 'enemy');
        }
        return;
      }
      if (id === 'spare') {
        if (g.mercy >= 100) say(['Враг открывает шлюз. Вы прошли без боя.'], 'win-spare');
        else say(['Шлюз закрыт. Милосердие: ' + Math.round(g.mercy) + '%.'], 'enemy');
      }
    }

    function chooseAct(i) {
      Sfx.ok();
      const a = ACTS[i] || ACTS[0];
      const gain = [10, 35, 25][i] || 10;
      g.mercy = Math.min(100, g.mercy + gain);
      say([a.text], 'enemy');
    }

    function resolveAttack() {
      const acc = 1 - Math.abs(g.attackPos - 0.5) * 2;
      const dmg = Math.max(4, Math.round(5 + acc * 13));
      g.enemyHp = Math.max(0, g.enemyHp - dmg);
      g.shake = 0.8;
      Sfx.shoot();
      if (g.enemyHp <= 0) {
        say(['Удар достигает цели. Враг рассыпается на байты.', 'Формат освобождён. Но тишина звенит.'], 'win-kill');
        return;
      }
      say(['Точность ' + Math.round(acc * 100) + '%. Урон ' + dmg + '. Враг готовит ответ.'], 'enemy');
    }

    function spawnBullets(dt) {
      g.spawnT -= dt;
      if (g.spawnT > 0) return;
      const sp = (1 + g.turn * 0.055) * (g.foe ? g.foe.speed : 1) * (g.foe && g.foe.boss && g.enemyHp < g.enemyMax * 0.5 ? 1.25 : 1);
      if (g.pattern === 0) {
        g.bullets.push({ x: U.rand(BOX.x + 18, BOX.x + BOX.w - 18), y: BOX.y + 6, vx: U.rand(-25, 25), vy: U.rand(150, 220) * sp, r: 7 });
        g.spawnT = 0.14 / sp;
      } else if (g.pattern === 1) {
        const left = Math.random() < 0.5;
        const y0 = U.rand(BOX.y + 20, BOX.y + BOX.h - 120);
        for (let k = 0; k < 3; k++) {
          g.bullets.push({ x: left ? BOX.x - 12 : BOX.x + BOX.w + 12, y: y0 + k * 38, vx: (left ? 1 : -1) * 250 * sp, vy: 0, r: 8 });
        }
        g.spawnT = 0.72 / sp;
      } else if (g.pattern === 2) {
        g.angle += 0.5;
        const cx = BOX.x + BOX.w / 2;
        const cy = BOX.y + BOX.h / 2;
        for (let k = 0; k < 2; k++) {
          const a = g.angle + k * Math.PI;
          g.bullets.push({ x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30, vx: Math.cos(a) * 135 * sp, vy: Math.sin(a) * 135 * sp, r: 6 });
        }
        g.spawnT = 0.09 / sp;
      } else {
        const side = Math.floor(Math.random() * 4);
        let x;
        let y;
        if (side === 0) { x = U.rand(BOX.x, BOX.x + BOX.w); y = BOX.y - 10; }
        else if (side === 1) { x = U.rand(BOX.x, BOX.x + BOX.w); y = BOX.y + BOX.h + 10; }
        else if (side === 2) { x = BOX.x - 10; y = U.rand(BOX.y, BOX.y + BOX.h); }
        else { x = BOX.x + BOX.w + 10; y = U.rand(BOX.y, BOX.y + BOX.h); }
        const a = Math.atan2(g.soul.y - y, g.soul.x - x);
        g.bullets.push({ x, y, vx: Math.cos(a) * 92 * sp, vy: Math.sin(a) * 92 * sp, r: 9, homing: true });
        g.spawnT = 0.6 / sp;
      }
    }

    function updateEnemy(dt, input) {
      const sp = 265;
      if (input.held.has('left')) g.soul.x -= sp * dt;
      if (input.held.has('right')) g.soul.x += sp * dt;
      if (input.held.has('up')) g.soul.y -= sp * dt;
      if (input.held.has('down')) g.soul.y += sp * dt;
      g.soul.x = U.clamp(g.soul.x, BOX.x + 10, BOX.x + BOX.w - 10);
      g.soul.y = U.clamp(g.soul.y, BOX.y + 10, BOX.y + BOX.h - 10);

      spawnBullets(dt);
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i];
        if (b.homing) {
          const a = Math.atan2(g.soul.y - b.y, g.soul.x - b.x);
          b.vx += Math.cos(a) * 55 * dt;
          b.vy += Math.sin(a) * 55 * dt;
          const v = Math.hypot(b.vx, b.vy);
          const max = 170;
          if (v > max) { b.vx = b.vx / v * max; b.vy = b.vy / v * max; }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < BOX.x - 90 || b.x > BOX.x + BOX.w + 90 || b.y < BOX.y - 90 || b.y > BOX.y + BOX.h + 90) {
          g.bullets.splice(i, 1);
          continue;
        }
        if (U.dist(b.x, b.y, g.soul.x, g.soul.y) < b.r + 7) {
          g.bullets.splice(i, 1);
          hurt();
          if (g.mode !== 'enemy') return;
        }
      }
      if (g.invuln > 0) g.invuln = Math.max(0, g.invuln - dt);
      g.turnT -= dt;
      if (g.turnT <= 0) toMenu();
    }

    g.start = () => {
      g.mode = 'home';
      g.hp = g.maxHp;
      g.mercy = 0;
      g.items = 1;
      g.turn = 0;
      g.bullets = [];
      g.winKind = null;
      g.t = 0;
      menu.open();
    };

    function startBattle(i) {
      const foe = FOES[i] || FOES[0];
      g.foeI = i;
      g.foe = foe;
      g.hp = g.maxHp;
      g.mercy = 0;
      g.items = 1;
      g.turn = 0;
      g.bullets = [];
      g.winKind = null;
      g.enemyHp = foe.hp;
      g.enemyMax = foe.hp;
      g.pattern = 0;
      say(foe.intro.slice(), 'menu');
    }

    g.destroy = () => {};

    g.update = (dt, input) => {
      dt = Math.min(dt, 0.05);
      g.t += dt;
      g.shake = Math.max(0, g.shake - dt * 3);

      if (g.mode === 'home') {
        const act = menu.update(dt, input);
        if (act === 'play') {
          g.mode = 'roster';
          g.rosterI = Math.min(progress.unlocked, FOES.length - 1);
        } else if (act === 'exit') {
          exitToOS();
        }
        return;
      }
      if (g.mode === 'roster') {
        if (input.pressed.has('back') || input.pressed.has('b')) { g.mode = 'home'; menu.open(); Sfx.back(); return; }
        const cols = 3;
        if (input.pressed.has('left')) { g.rosterI = (g.rosterI + FOES.length - 1) % FOES.length; Sfx.move(); }
        if (input.pressed.has('right')) { g.rosterI = (g.rosterI + 1) % FOES.length; Sfx.move(); }
        if (input.pressed.has('up')) { g.rosterI = (g.rosterI + FOES.length - cols) % FOES.length; Sfx.move(); }
        if (input.pressed.has('down')) { g.rosterI = (g.rosterI + cols) % FOES.length; Sfx.move(); }
        if ((input.pressed.has('ok') || input.pressed.has('a')) && g.rosterI <= progress.unlocked) startBattle(g.rosterI);
        return;
      }

      if (g.mode === 'dialog') {
        const line = currentLine();
        g.charT += dt * 46;
        if (input.pressed.has('ok') || input.pressed.has('a')) {
          if (g.charT < line.length) g.charT = line.length;
          else if (g.lineI < g.lines.length - 1) { g.lineI++; g.charT = 0; }
          else finishDialog();
          Sfx.move();
        }
        return;
      }
      if (g.mode === 'menu') {
        if (input.pressed.has('left')) { g.menuI = (g.menuI + MENU.length - 1) % MENU.length; Sfx.move(); }
        if (input.pressed.has('right')) { g.menuI = (g.menuI + 1) % MENU.length; Sfx.move(); }
        if (input.pressed.has('ok') || input.pressed.has('a')) chooseMenu(MENU[g.menuI].id);
        return;
      }
      if (g.mode === 'act') {
        if (input.pressed.has('left')) { g.actI = (g.actI + ACTS.length - 1) % ACTS.length; Sfx.move(); }
        if (input.pressed.has('right')) { g.actI = (g.actI + 1) % ACTS.length; Sfx.move(); }
        if (input.pressed.has('ok') || input.pressed.has('a')) chooseAct(g.actI);
        if (input.pressed.has('back') || input.pressed.has('b')) { g.mode = 'menu'; Sfx.back(); }
        return;
      }
      if (g.mode === 'attackBar') {
        g.attackPos += g.attackDir * dt * 1.15;
        if (g.attackPos > 1) { g.attackPos = 1; g.attackDir = -1; }
        if (g.attackPos < 0) { g.attackPos = 0; g.attackDir = 1; }
        if (input.pressed.has('ok') || input.pressed.has('a')) resolveAttack();
        return;
      }
      if (g.mode === 'enemy') {
        updateEnemy(dt, input);
        return;
      }
      if (g.mode === 'win' || g.mode === 'lose') {
        if (input.pressed.has('ok') || input.pressed.has('a')) {
          g.mode = 'roster';
          g.rosterI = Math.max(0, g.foeI);
        }
      }
    };

    function heartPath(cx, cy, s) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.72);
      ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.8, cy - s * 1.1, cx, cy - s * 0.42);
      ctx.bezierCurveTo(cx + s * 0.8, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.72);
      ctx.closePath();
    }

    function drawEnemy() {
      const cx = W / 2;
      const cy = 168;
      const hurtRatio = 1 - g.enemyHp / g.enemyMax;
      const calm = g.mercy / 100;
      ctx.save();
      ctx.translate(cx, cy + Math.sin(g.t * 1.6) * 6);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = 'rgba(176,107,255,' + (0.12 + i * 0.07) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 96 + i * 20, 58 + i * 12, Math.sin(g.t * 0.5 + i) * 0.4, 0, U.TAU);
        ctx.stroke();
      }
      ctx.rotate(Math.sin(g.t * 0.8) * 0.05);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU - Math.PI / 2;
        const px = Math.cos(a) * 76;
        const py = Math.sin(a) * 76;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      const body = ctx.createLinearGradient(-70, -70, 70, 70);
      body.addColorStop(0, calm > 0.5 ? '#5b3a8c' : '#4a2a72');
      body.addColorStop(0.5, '#2a1640');
      body.addColorStop(1, '#140a22');
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,180,255,.7)';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (hurtRatio > 0.35) {
        ctx.strokeStyle = 'rgba(255,120,140,.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-30 + i * 18, -44);
          ctx.lineTo(-18 + i * 22, -10);
          ctx.lineTo(-28 + i * 20, 24);
          ctx.stroke();
        }
      }

      const eye = calm > 0.55 ? '#8ce6a5' : '#ff5c7a';
      ctx.shadowColor = eye;
      ctx.shadowBlur = 26;
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, calm > 0.55 ? 8 : 20, 0, 0, U.TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0612';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }

    function drawMenuButtons() {
      const w = 265;
      const gap = 12;
      const x0 = (W - (w * 4 + gap * 3)) / 2;
      for (let i = 0; i < MENU.length; i++) {
        const it = MENU[i];
        const x = x0 + i * (w + gap);
        const y = 622;
        const on = g.mode === 'menu' && g.menuI === i;
        panel(ctx, x, y, w, 58, 10, on ? 'rgba(255,196,87,.16)' : 'rgba(10,8,20,.72)', on ? '#ffc457' : 'rgba(200,180,255,.22)');
        txt(ctx, it.label, x + w / 2, y + 26, 16, on ? '#ffe6a8' : '#d9c9ff', 'center', 800);
        const sub = it.id === 'item' ? 'пирог ×' + g.items : it.id === 'spare' ? 'милосердие ' + Math.round(g.mercy) + '%' : it.sub;
        txt(ctx, sub, x + w / 2, y + 46, 11, on ? '#ffc457' : '#8f7fb0', 'center', 600);
      }
    }

    function drawActButtons() {
      const w = 300;
      const x0 = (W - (w * 3 + 24)) / 2;
      for (let i = 0; i < ACTS.length; i++) {
        const x = x0 + i * (w + 12);
        const y = 636;
        const on = g.actI === i;
        panel(ctx, x, y, w, 48, 10, on ? 'rgba(25,195,232,.16)' : 'rgba(10,8,20,.72)', on ? '#19c3e8' : 'rgba(200,180,255,.22)');
        txt(ctx, ACTS[i].label, x + w / 2, y + 30, 14, on ? '#bff3ff' : '#d9c9ff', 'center', 800);
      }
    }

    function drawDialog() {
      const line = currentLine();
      const shown = line.slice(0, Math.floor(g.charT));
      panel(ctx, 80, 592, W - 160, 102, 12, 'rgba(8,6,16,.82)', 'rgba(200,180,255,.28)');
      txt(ctx, shown, 104, 628, 18, '#efe6ff', 'left', 500);
      if (Math.floor(g.t * 2) % 2 === 0 || g.charT >= line.length) {
        txt(ctx, 'A — далее', W - 104, 674, 12, '#8f7fb0', 'right', 600);
      }
    }

    function drawRoster() {
      const acc = menu.accent();
      const bg = ctx.createRadialGradient(W / 2, H * 0.3, 60, W / 2, H * 0.5, W * 0.85);
      bg.addColorStop(0, '#1a0b2a');
      bg.addColorStop(0.6, '#0b0714');
      bg.addColorStop(1, '#040308');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      txt(ctx, 'ВЫБОР ПРОТИВНИКА', 84, 90, 34, '#f2eaff', 'left', 800);
      txt(ctx, 'ОБУЧЕНИЕ · ВРАГИ · БОССЫ', 86, 120, 13, acc, 'left', 700);
      txt(ctx, 'ПОБЕЖДЕНО ' + progress.done.filter(Boolean).length + ' / ' + FOES.length, W - 40, 92, 15, '#f2c14e', 'right', 700);
      const COLS = 3, CW = 340, CH = 120, GX = 24, GY = 18;
      const x0 = 84, y0 = 170;
      for (let i = 0; i < FOES.length; i++) {
        const col = i % COLS, row = Math.floor(i / COLS);
        const x = x0 + col * (CW + GX), y = y0 + row * (CH + GY);
        const sel = i === g.rosterI;
        const locked = i > progress.unlocked;
        const done = !!progress.done[i];
        panel(ctx, x, y, CW, CH, 14, sel ? U.hexToRgba(acc, 0.18) : 'rgba(255,255,255,.035)', sel ? acc : 'rgba(120,160,190,.16)');
        txt(ctx, (i + 1) + '. ' + FOES[i].name, x + 18, y + 36, 18, locked ? '#5c6670' : (done ? '#8ce6a5' : '#f2eaff'), 'left', 700);
        txt(ctx, FOES[i].boss ? 'БОСС' : (i === 0 ? 'ОБУЧЕНИЕ' : 'ВРАГ'), x + 18, y + 60, 11, FOES[i].boss ? '#ff8e9b' : '#7f93a5', 'left', 700);
        txt(ctx, 'HP ' + FOES[i].hp, x + 18, y + 92, 14, locked ? '#5c6670' : '#c9d6e2', 'left', 600);
        if (locked) txt(ctx, 'ЗАКРЫТО', x + CW - 18, y + 92, 12, '#5c6670', 'right', 700);
        else if (done) txt(ctx, '✓', x + CW - 18, y + 92, 18, '#8ce6a5', 'right', 800);
        else if (sel) txt(ctx, 'A →', x + CW - 18, y + 92, 12, acc, 'right', 700);
      }
      txt(ctx, '↑↓←→ — выбор · A — в бой · B — в меню', 84, H - 60, 13, '#7f93a5', 'left', 500);
      txt(ctx, 'МОНЕТЫ: ' + menu.coins(), W - 40, H - 60, 14, acc, 'right', 700);
    }

    g.draw = () => {
      if (g.mode === 'home') { menu.draw(); return; }
      if (g.mode === 'roster') { drawRoster(); return; }
      ctx.save();
      const sh = g.shake * 10;
      ctx.translate(U.rand(-sh, sh), U.rand(-sh, sh));
      const bg = ctx.createRadialGradient(W / 2, H * 0.35, 80, W / 2, H * 0.5, W * 0.8);
      bg.addColorStop(0, '#1a0b2a');
      bg.addColorStop(0.55, '#0c0714');
      bg.addColorStop(1, '#040308');
      ctx.fillStyle = bg;
      ctx.fillRect(-30, -30, W + 60, H + 60);

      for (let i = 0; i < 80; i++) {
        const x = (i * 167 + g.t * 8) % W;
        const y = (i * 281) % H;
        ctx.globalAlpha = 0.1 + (i % 4) * 0.05;
        ctx.fillStyle = i % 3 ? '#8f6bd8' : '#19c3e8';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      drawEnemy();

      txt(ctx, g.foe ? g.foe.name : 'СТРАЖ ФОРМАТА', 40, 44, 18, '#e9dcff', 'left', 800);
      panel(ctx, 40, 56, 300, 18, 9, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.14)');
      ctx.fillStyle = '#ff5c7a';
      U.rr(ctx, 42, 58, 296 * (g.enemyHp / g.enemyMax), 14, 7);
      ctx.fill();
      txt(ctx, g.enemyHp + ' / ' + g.enemyMax, 356, 70, 11, '#c9b6ea', 'left', 600);

      txt(ctx, 'HP', W - 360, 44, 12, '#c9b6ea', 'left', 700);
      txt(ctx, g.hp + ' / ' + g.maxHp, W - 40, 44, 20, g.hp > 6 ? '#8ce6a5' : '#ff6b76', 'right', 800);
      panel(ctx, W - 340, 56, 300, 18, 9, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.14)');
      ctx.fillStyle = g.hp > 6 ? '#8ce6a5' : '#ff6b76';
      U.rr(ctx, W - 338, 58, 296 * Math.max(0, g.hp / g.maxHp), 14, 7);
      ctx.fill();
      txt(ctx, 'МИЛОСЕРДИЕ ' + Math.round(g.mercy) + '%', W - 40, 100, 12, g.mercy >= 100 ? '#ffc457' : '#9f8bbd', 'right', 700);

      panel(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 14, 'rgba(3,2,8,.5)', 'rgba(235,225,255,.75)');

      if (g.mode === 'enemy' || g.mode === 'attackBar') {
        if (g.mode === 'enemy') {
          for (const b of g.bullets) {
            ctx.save();
            ctx.shadowColor = b.homing ? 'rgba(25,195,232,.9)' : 'rgba(255,255,255,.8)';
            ctx.shadowBlur = 14;
            ctx.fillStyle = b.homing ? '#7fe3ff' : '#fff6ff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, U.TAU);
            ctx.fill();
            ctx.restore();
          }
          if (g.invuln > 0 && Math.floor(g.t * 20) % 2 === 0) ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ff2f4a';
          heartPath(g.soul.x, g.soul.y, 9);
          ctx.fill();
          ctx.globalAlpha = 1;
          txt(ctx, Math.ceil(g.turnT) + ' c', BOX.x + BOX.w - 16, BOX.y + 26, 12, 'rgba(235,225,255,.5)', 'right', 600);
        } else {
          panel(ctx, BOX.x + 60, BOX.y + BOX.h / 2 - 18, BOX.w - 120, 36, 8, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.28)');
          ctx.fillStyle = 'rgba(255,196,87,.85)';
          ctx.fillRect(BOX.x + 60 + (BOX.w - 120) * 0.5 - 2, BOX.y + BOX.h / 2 - 26, 4, 52);
          ctx.fillStyle = '#ff2f4a';
          ctx.fillRect(BOX.x + 60 + (BOX.w - 120) * g.attackPos - 3, BOX.y + BOX.h / 2 - 30, 6, 60);
          txt(ctx, 'A — УДАР В ЦЕНТР', BOX.x + BOX.w / 2, BOX.y + BOX.h / 2 + 62, 15, '#ffe6a8', 'center', 700);
        }
      } else {
        txt(ctx, 'ФОРМАТ NBS · ЯДРО', BOX.x + BOX.w / 2, BOX.y + BOX.h / 2 - 6, 14, 'rgba(220,205,255,.22)', 'center', 700);
        txt(ctx, 'оптимизировано', BOX.x + BOX.w / 2, BOX.y + BOX.h / 2 + 20, 11, 'rgba(220,205,255,.14)', 'center', 500);
      }

      if (g.mode === 'dialog') drawDialog();
      if (g.mode === 'menu') {
        panel(ctx, 80, 584, W - 160, 32, 8, 'rgba(8,6,16,.6)');
        txt(ctx, g.text, 100, 606, 14, '#cbb8ef', 'left', 500);
        drawMenuButtons();
      }
      if (g.mode === 'act') {
        panel(ctx, 80, 584, W - 160, 38, 8, 'rgba(8,6,16,.6)');
        txt(ctx, 'Выберите действие. Милосердие: ' + Math.round(g.mercy) + '%', 100, 610, 14, '#cbb8ef', 'left', 500);
        drawActButtons();
      }
      if (g.mode === 'win' || g.mode === 'lose') {
        ctx.fillStyle = 'rgba(3,2,8,.84)';
        ctx.fillRect(0, 0, W, H);
        if (g.mode === 'win') {
          txt(ctx, g.winKind === 'spare' ? 'ПОЩАДА' : 'ПОБЕДА', W / 2, H / 2 - 50, 68, g.winKind === 'spare' ? '#8ce6a5' : '#ffc457', 'center', 800);
          txt(ctx, g.winKind === 'spare' ? 'Враг пропустил вас. Формат открыт.' : 'Враг рассыпался на байты.', W / 2, H / 2 + 8, 22, '#e9dcff', 'center', 600);
          txt(ctx, 'Милосердие ' + Math.round(g.mercy) + '% · ходов ' + g.turn, W / 2, H / 2 + 46, 16, '#9f8bbd', 'center', 500);
        } else {
          txt(ctx, 'СЕРДЦЕ РАЗБИТО', W / 2, H / 2 - 50, 60, '#ff6b76', 'center', 800);
          txt(ctx, 'Формат закрывается. Попробуйте снова.', W / 2, H / 2 + 8, 20, '#e9dcff', 'center', 600);
        }
        txt(ctx, 'A — ЕЩЁ РАЗ', W / 2, H / 2 + 110, 18, '#19c3e8', 'center', 700);
      }

      txt(ctx, 'NBS · NebulaScript runtime · pattern stream 1.0', W - 40, H - 16, 10, 'rgba(176,107,255,.45)', 'right', 600);
      ctx.restore();
    };

    g.debug = () => ({
      mode: g.mode, hp: g.hp, mercy: Math.round(g.mercy), enemyHp: g.enemyHp,
      turn: g.turn, bullets: g.bullets.length, win: g.winKind,
      list: g.bullets.slice(0, 10).map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), r: b.r })),
      soul: { x: Math.round(g.soul.x), y: Math.round(g.soul.y) },
    });

    return g;
  }

  add({
    id: 'heart',
    name: 'СЕРДЦЕ НЕБУЛЫ',
    desc: 'Bullet-hell РПГ: уворачивайтесь, говорите и щадите. Формат NBS.',
    author: 'NEBULA OS',
    sizeMB: 220,
    format: 'NBS',
    needFw: 'nebula',
    icon: 'heart',
    color: '#2a0e22',
    create: heartGame,
  });

  /* ============================== 5. КРАСНЫЙ СЕКТОР ============================== */
  function doomGame(ctx) {
    const MW = 24, MH = 24;
    const MAP = [];
    for (let y = 0; y < MH; y++) {
      const row = [];
      for (let x = 0; x < MW; x++) row.push('.');
      MAP.push(row);
    }
    for (let x = 0; x < MW; x++) { MAP[0][x] = '#'; MAP[MH - 1][x] = '#'; }
    for (let y = 0; y < MH; y++) { MAP[y][0] = '#'; MAP[y][MW - 1] = '#'; }
    const BLOCKS = [
      [5, 5, 6, 6], [17, 5, 18, 6], [5, 17, 6, 18], [17, 17, 18, 18],
      [10, 4, 13, 4], [10, 19, 13, 19],
      [4, 10, 4, 13], [19, 10, 19, 13],
      [8, 8, 10, 8], [13, 8, 15, 8], [8, 15, 10, 15], [13, 15, 15, 15],
      [8, 8, 8, 10], [15, 8, 15, 10], [8, 13, 8, 15], [15, 13, 15, 15],
    ];
    for (const b of BLOCKS) {
      for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) MAP[y][x] = '#';
    }
    const TECH = [[10, 4, 13, 4], [10, 19, 13, 19], [4, 10, 4, 13], [19, 10, 19, 13]];
    for (const b of TECH) {
      for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) MAP[y][x] = '=';
    }

    const SPAWNS = [
      { x: 3.5, y: 3.5 }, { x: 20.5, y: 3.5 }, { x: 3.5, y: 20.5 }, { x: 20.5, y: 20.5 },
      { x: 12.5, y: 2.5 }, { x: 12.5, y: 21.5 }, { x: 2.5, y: 12.5 }, { x: 21.5, y: 12.5 },
    ];
    const PICKS = [
      { x: 12.5, y: 7.5, kind: 'health' }, { x: 7.5, y: 12.5, kind: 'shells' },
      { x: 16.5, y: 12.5, kind: 'health' }, { x: 12.5, y: 16.5, kind: 'shells' },
      { x: 2.5, y: 2.5, kind: 'shells' }, { x: 21.5, y: 21.5, kind: 'health' },
    ];
    const PORTAL = { x: 11.5, y: 11.5 };

    const FOV = Math.PI / 3;
    const PLANE = (W / 2) / Math.tan(FOV / 2);
    const WALL_COL = { '#': [104, 92, 84], '=': [54, 108, 100] };
    const WEAPONS = [
      { name: 'ПУЛЬСАР', ammo: null, dmg: 17, rate: 0.3, pellets: 1, spread: 0.014, range: 22, kick: 1 },
      { name: 'ДРОБОВИК', ammo: 'shells', dmg: 11, rate: 0.8, pellets: 7, spread: 0.1, range: 12, kick: 2.4 },
      { name: 'ПЛАЗМА', ammo: 'cells', dmg: 24, rate: 0.22, pellets: 1, spread: 0.03, range: 20, kick: 1.3 },
      { name: 'РЕЛЬСА', ammo: 'cells', dmg: 55, rate: 1.1, pellets: 1, spread: 0.002, range: 26, kick: 3.2 },
    ];

    const CHAPTERS = [
      {
        name: 'ГЛАВА 1 · АНГАР',
        levels: [
          { name: 'ПОГРУЗКА', enemies: ['imp', 'imp', 'imp'], weapon: 1, ammo: 'shells' },
          { name: 'ТЕХНО-ЗАЛ', enemies: ['imp', 'imp', 'brute', 'imp'], weapon: 2, ammo: 'cells' },
          { name: 'ШЛЮЗ', enemies: ['imp', 'brute', 'brute', 'imp'], weapon: 0, ammo: 'shells' },
        ],
        trial: { name: 'ИСПЫТАНИЕ · ВЫЖИТЬ 40 С', time: 40 },
      },
      {
        name: 'ГЛАВА 2 · ЛАБОРАТОРИЯ',
        levels: [
          { name: 'ПРОБИРКИ', enemies: ['imp', 'brute', 'imp', 'brute'], weapon: 3, ammo: 'cells' },
          { name: 'РЕАКТОР', enemies: ['brute', 'brute', 'imp', 'imp', 'brute'], weapon: 0, ammo: 'shells' },
          { name: 'КРИО-ЗАЛ', enemies: ['brute', 'imp', 'brute', 'brute', 'imp'], weapon: 0, ammo: 'cells' },
        ],
        trial: { name: 'ИСПЫТАНИЕ · ВЫЖИТЬ 55 С', time: 55 },
      },
      {
        name: 'ГЛАВА 3 · ЯДРО',
        levels: [
          { name: 'ОХРАНА', enemies: ['brute', 'brute', 'brute', 'imp'], weapon: 0, ammo: 'cells' },
          { name: 'ПЛАВИЛЬНЯ', enemies: ['brute', 'brute', 'brute', 'brute'], weapon: 0, ammo: 'shells' },
          { name: 'ТРОН', enemies: ['brute', 'brute', 'brute', 'brute', 'brute'], weapon: 0, ammo: 'cells' },
        ],
        trial: { name: 'ИСПЫТАНИЕ · ВЫЖИТЬ 70 С', time: 70 },
      },
    ];
    const ENTRY_COUNT = CHAPTERS.length * 4;

    function defaultCampaign() { return { unlocked: 0, done: [], coins: 0 }; }
    let campaign = (window.Nebula ? Nebula.load('doom.save', null) : null) || defaultCampaign();
    if (!Array.isArray(campaign.done)) campaign.done = [];
    if (typeof campaign.unlocked !== 'number') campaign.unlocked = 0;

    function saveCampaign() {
      if (window.Nebula) Nebula.save('doom.save', campaign);
    }

    const g = {
      mode: 'menu', t: 0, best: 0, newBest: false,
      hp: 100, maxHp: 100, shells: 12, cells: 0, weapon: 0, unlocked: [true, false, false, false],
      levelIndex: 0, entryI: 0, trialT: 0, trialOn: false, spawnT: 1.5,
      wave: 0, kills: 0, score: 0, time: 0, gapT: -1, portal: false,
      msg: '', msgT: 0, cool: 0, flash: 0, recoil: 0, hitMark: 0, hurt: 0, shake: 0,
      bobT: 0, moving: false,
      p: { x: 1.5, y: 1.5, a: 0 },
      enemies: [], shots: [], pickups: [],
      zbuf: new Float32Array(Math.ceil(W / 2)),
    };
    let horizon = H / 2;

    const menu = makeMenu(ctx,
      { id: 'doom', name: 'КРАСНЫЙ СЕКТОР', format: 'SEC', desc: 'Шутер от первого лица: главы, уровни, испытания и оружие, которое находится на уровнях.' },
      {
        author: 'NEBULA OS',
        playLabel: 'КАМПАНИЯ',
        bestText: () => 'ПРОЙДЕНО: ' + campaign.done.filter(Boolean).length + ' / ' + ENTRY_COUNT,
        reset: () => { campaign = defaultCampaign(); saveCampaign(); },
      }
    );

    function solid(x, y) {
      const mx = Math.floor(x), my = Math.floor(y);
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) return true;
      return MAP[my][mx] === '#' || MAP[my][mx] === '=';
    }

    function free(x, y, r) {
      return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r);
    }

    function castRay(px, py, ang, maxD) {
      const dx = Math.cos(ang), dy = Math.sin(ang);
      let mx = Math.floor(px), my = Math.floor(py);
      const ddx = Math.abs(1 / (dx || 1e-9));
      const ddy = Math.abs(1 / (dy || 1e-9));
      let stepX, stepY, sideX, sideY;
      if (dx < 0) { stepX = -1; sideX = (px - mx) * ddx; } else { stepX = 1; sideX = (mx + 1 - px) * ddx; }
      if (dy < 0) { stepY = -1; sideY = (py - my) * ddy; } else { stepY = 1; sideY = (my + 1 - py) * ddy; }
      let side = 0, dist = maxD, cell = '#';
      for (let i = 0; i < 72; i++) {
        if (sideX < sideY) { dist = sideX; sideX += ddx; mx += stepX; side = 0; }
        else { dist = sideY; sideY += ddy; my += stepY; side = 1; }
        if (dist > maxD) { dist = maxD; break; }
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) { dist = maxD; break; }
        const c = MAP[my][mx];
        if (c === '#' || c === '=') { cell = c; break; }
      }
      const hx = px + dx * dist;
      const hy = py + dy * dist;
      const wx = side === 0 ? hy - Math.floor(hy) : hx - Math.floor(hx);
      return { dist, side, cell, wx };
    }

    function los(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d < 0.05) return true;
      const hit = castRay(x0, y0, Math.atan2(y1 - y0, x1 - x0), d);
      return hit.dist >= d - 0.12;
    }

    function levelConfig(index) {
      const ch = Math.floor(index / 4);
      const slot = index % 4;
      if (slot === 3) {
        return { trial: true, chapter: ch, name: CHAPTERS[ch].trial.name, time: CHAPTERS[ch].trial.time };
      }
      const cfg = CHAPTERS[ch].levels[slot];
      return { trial: false, chapter: ch, name: cfg.name, enemies: cfg.enemies, weapon: cfg.weapon, ammo: cfg.ammo };
    }

    function enemyOf(type, s, diff) {
      const brute = type === 'brute';
      const hp = (brute ? 78 : 34) + diff * 20;
      return {
        x: s.x, y: s.y, r: brute ? 0.34 : 0.26,
        hp: hp, maxHp: hp,
        speed: brute ? 1.0 : 1.55, type: brute ? 'brute' : 'imp',
        dead: false, hurt: 0, atkT: 0.8, fireT: 1.2 + Math.random(),
        wob: U.rand(0, U.TAU),
      };
    }

    function startLevel(index) {
      const cfg = levelConfig(index);
      const diff = menu.settings().difficulty;
      g.levelIndex = index;
      g.trialOn = !!cfg.trial;
      g.trialT = cfg.trial ? cfg.time : 0;
      g.spawnT = 1.6;
      g.hp = g.maxHp;
      g.kills = 0; g.score = 0; g.time = 0; g.portal = false; g.gapT = -1;
      g.enemies = []; g.shots = [];
      g.p = { x: 1.5, y: 1.5, a: 0 };
      g.shells = Math.max(g.shells, 8);
      g.pickups = PICKS.map((p) => ({ x: p.x, y: p.y, kind: p.kind, taken: false }));
      if (!cfg.trial) {
        cfg.enemies.forEach((t, i) => {
          const s = SPAWNS[(i + 3) % SPAWNS.length];
          g.enemies.push(enemyOf(t, s, diff));
        });
        if (cfg.weapon && !g.unlocked[cfg.weapon]) {
          g.pickups.push({ x: 5.5, y: 3.5, kind: 'weapon', idx: cfg.weapon, taken: false });
        }
        const ammoKind = cfg.ammo === 'cells' ? 'cells' : 'shells';
        g.pickups.push({ x: 8.5, y: 3.5, kind: ammoKind, taken: false });
      }
      g.mode = 'play';
      g.msg = cfg.name;
      g.msgT = 2.4;
      Sfx.ok();
    }

    function completeLevel() {
      if (g.mode !== 'play') return;
      const idx = g.levelIndex;
      campaign.done[idx] = true;
      campaign.unlocked = Math.max(campaign.unlocked, Math.min(ENTRY_COUNT - 1, idx + 1));
      campaign.coins = (campaign.coins || 0) + 10 + Math.floor(idx / 4) * 5;
      saveCampaign();
      menu.addCoins(6 + Math.floor(idx / 4) * 4);
      g.mode = 'campaign';
      g.entryI = idx;
      Sfx.ok();
    }

    function movePlayer(dx, dy) {
      if (free(g.p.x + dx, g.p.y, 0.18)) g.p.x += dx;
      if (free(g.p.x, g.p.y + dy, 0.18)) g.p.y += dy;
    }

    function moveEnemy(e, dx, dy) {
      const r = e.r * 0.9;
      if (free(e.x + dx, e.y, r)) e.x += dx;
      if (free(e.x, e.y + dy, r)) e.y += dy;
    }

    function hitEnemy(e, dmg) {
      e.hp -= dmg;
      e.hurt = 0.18;
      g.hitMark = 0.16;
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        g.kills++;
        g.score += e.type === 'brute' ? 250 : 100;
        Sfx.explode();
      }
    }

    function pickTarget(ang, wallDist, range) {
      let best = null;
      let bestD = 1e9;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const dx = e.x - g.p.x;
        const dy = e.y - g.p.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.2 || d > range) continue;
        let da = Math.atan2(dy, dx) - ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const rad = Math.atan2(e.r + 0.06, d);
        if (Math.abs(da) > rad) continue;
        if (d > wallDist - 0.08) continue;
        if (d < bestD) { bestD = d; best = e; }
      }
      return best;
    }

    function fire() {
      if (g.cool > 0) return;
      const w = WEAPONS[g.weapon];
      if (w.ammo && g[w.ammo] <= 0) {
        g.msg = 'НЕТ ЗАРЯДОВ — B СМЕНИТЬ';
        g.msgT = 1.4;
        Sfx.back();
        g.cool = 0.35;
        return;
      }
      if (w.ammo) g[w.ammo]--;
      g.cool = w.rate;
      g.flash = 0.1;
      g.recoil = w.kick;
      Sfx.shoot();
      for (let i = 0; i < w.pellets; i++) {
        const ang = g.p.a + U.rand(-w.spread, w.spread);
        const wall = castRay(g.p.x, g.p.y, ang, w.range + 1);
        const e = pickTarget(ang, wall.dist, w.range);
        if (e) hitEnemy(e, w.dmg);
      }
    }

    function hurtPlayer(n) {
      if (g.mode !== 'play') return;
      g.hp = Math.max(0, g.hp - n);
      g.hurt = Math.min(1, g.hurt + 0.62);
      g.shake = Math.min(1, g.shake + 0.75);
      Sfx.error();
      if (g.hp <= 0) {
        g.mode = 'dead';
        Sfx.explode();
      }
    }

    function spit(e) {
      const dx = g.p.x - e.x;
      const dy = g.p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const a = Math.atan2(dy, dx) + U.rand(-0.05, 0.05);
      g.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, life: 7 });
      Sfx.shoot();
    }

    function updateEnemies(dt) {
      for (const e of g.enemies) {
        if (e.dead) continue;
        e.hurt = Math.max(0, e.hurt - dt);
        e.atkT -= dt;
        e.fireT -= dt;
        const dx = g.p.x - e.x;
        const dy = g.p.y - e.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const see = d < 16 && los(e.x, e.y, g.p.x, g.p.y);
        if (d > 1.02) {
          let ax = dx / d;
          let ay = dy / d;
          if (!see && d > 2.5) {
            const w = Math.sin(g.t * 1.7 + e.wob) * 0.55;
            const nx = ax * Math.cos(w) - ay * Math.sin(w);
            const ny = ax * Math.sin(w) + ay * Math.cos(w);
            ax = nx; ay = ny;
          }
          moveEnemy(e, ax * e.speed * dt, ay * e.speed * dt);
        }
        if (see && d < 1.3 && e.atkT <= 0) {
          e.atkT = 1.2;
          hurtPlayer(e.type === 'brute' ? 13 : 7);
        }
        if (e.type === 'brute' && see && d > 1.6 && d < 11 && e.fireT <= 0) {
          e.fireT = 2.4;
          spit(e);
        }
      }
    }

    function updateShots(dt) {
      for (let i = g.shots.length - 1; i >= 0; i--) {
        const s = g.shots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || solid(s.x, s.y)) { g.shots.splice(i, 1); continue; }
        if (U.dist(s.x, s.y, g.p.x, g.p.y) < 0.34) {
          g.shots.splice(i, 1);
          hurtPlayer(7);
        }
      }
    }

    function updatePickups() {
      for (const p of g.pickups) {
        if (p.taken) continue;
        if (U.dist(p.x, p.y, g.p.x, g.p.y) > 0.5) continue;
        p.taken = true;
        if (p.kind === 'health') {
          g.hp = Math.min(g.maxHp, g.hp + 25);
          g.msg = '+25 HP';
          g.msgT = 1.2;
        } else if (p.kind === 'weapon') {
          g.unlocked[p.idx] = true;
          g.weapon = p.idx;
          if (p.idx === 1) g.shells += 8;
          else g.cells += 12;
          g.msg = 'ОРУЖИЕ: ' + WEAPONS[p.idx].name;
          g.msgT = 2;
          Sfx.ok();
        } else if (p.kind === 'cells') {
          g.cells += 8;
          g.msg = '+8 ЗАРЯДОВ';
          g.msgT = 1.2;
        } else {
          g.shells += 6;
          g.msg = '+6 ПАТРОНОВ';
          g.msgT = 1.2;
        }
        Sfx.pick();
      }
    }

    function win() {
      if (g.mode !== 'play') return;
      g.mode = 'win';
      g.score += Math.round(g.hp * 4) + Math.max(0, 400 - Math.floor(g.time) * 5);
      if (g.score > g.best) {
        g.best = g.score;
        g.newBest = true;
        writeJson('switch2.doom.best', g.best);
      }
      Sfx.ok();
    }

    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    g.start = () => {
      g.best = Number(readJson('switch2.doom.best', 0)) || 0;
      g.mode = 'menu';
      menu.open();
    };

    g.destroy = () => {};

    g.update = (dt, input) => {
      dt = Math.min(dt, 0.05);
      const held = (input && input.held) || new Set();
      const pressed = (input && input.pressed) || new Set();
      g.t += dt;
      g.flash = Math.max(0, g.flash - dt * 7);
      g.recoil = Math.max(0, g.recoil - dt * 5);
      g.hitMark = Math.max(0, g.hitMark - dt * 8);
      g.hurt = Math.max(0, g.hurt - dt * 1.7);
      g.shake = Math.max(0, g.shake - dt * 3.2);
      g.msgT = Math.max(0, g.msgT - dt);
      g.cool = Math.max(0, g.cool - dt);

      if (g.mode === 'menu') {
        const act = menu.update(dt, input);
        if (act === 'play') {
          g.mode = 'campaign';
          g.entryI = Math.min(campaign.unlocked, ENTRY_COUNT - 1);
        } else if (act === 'exit') {
          exitToOS();
        }
        return;
      }
      if (g.mode === 'campaign') {
        if (pressed.has('back') || pressed.has('b')) { g.mode = 'menu'; Sfx.back(); return; }
        if (pressed.has('up')) { g.entryI = Math.max(0, g.entryI - 4); Sfx.move(); }
        if (pressed.has('down')) { g.entryI = Math.min(ENTRY_COUNT - 1, g.entryI + 4); Sfx.move(); }
        if (pressed.has('left')) { g.entryI = Math.max(0, g.entryI - 1); Sfx.move(); }
        if (pressed.has('right')) { g.entryI = Math.min(ENTRY_COUNT - 1, g.entryI + 1); Sfx.move(); }
        if ((pressed.has('ok') || pressed.has('a')) && g.entryI <= campaign.unlocked) startLevel(g.entryI);
        return;
      }
      if (g.mode === 'dead' || g.mode === 'win') {
        if (pressed.has('ok') || pressed.has('a')) startLevel(g.levelIndex);
        return;
      }
      if (g.mode === 'pause') {
        if (pressed.has('plus') || pressed.has('ok') || pressed.has('a') || pressed.has('back') || pressed.has('b')) {
          g.mode = 'play';
          Sfx.btn();
        }
        return;
      }
      if (pressed.has('plus')) {
        g.mode = 'pause';
        Sfx.btn();
        return;
      }
      if (pressed.has('b') || pressed.has('back')) {
        let n = g.weapon;
        for (let i = 0; i < WEAPONS.length; i++) {
          n = (n + 1) % WEAPONS.length;
          if (g.unlocked[n]) { g.weapon = n; break; }
        }
        g.cool = Math.max(g.cool, 0.25);
        Sfx.move();
      }

      const turn = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      g.p.a += turn * 2.35 * dt;
      const fwd = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
      const str = (held.has('y') ? 1 : 0) - (held.has('x') ? 1 : 0);
      const ca = Math.cos(g.p.a);
      const sa = Math.sin(g.p.a);
      movePlayer((ca * fwd * 2.45 - sa * str * 2.05) * dt, (sa * fwd * 2.45 + ca * str * 2.05) * dt);
      g.moving = !!(fwd || str);
      if (g.moving) g.bobT += dt * 8;

      if (held.has('ok') || held.has('a') || pressed.has('ok') || pressed.has('a')) fire();

      updateEnemies(dt);
      updateShots(dt);
      updatePickups();

      if (g.trialOn) {
        g.trialT = Math.max(0, g.trialT - dt);
        g.spawnT -= dt;
        if (g.trialT > 0 && g.spawnT <= 0) {
          g.spawnT = 2.4;
          const s = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
          g.enemies.push(enemyOf(Math.random() < 0.35 ? 'brute' : 'imp', s, menu.settings().difficulty));
        }
        if (g.trialT <= 0 && !g.portal) {
          g.portal = true;
          g.msg = 'ИСПЫТАНИЕ ПРОЙДЕНО — К ПОРТАЛУ';
          g.msgT = 2.6;
          Sfx.ok();
        }
      } else {
        let alive = 0;
        for (const e of g.enemies) if (!e.dead) alive++;
        if (alive === 0 && !g.portal) {
          g.portal = true;
          g.msg = 'УРОВЕНЬ ЗАЧИЩЕН — К ПОРТАЛУ';
          g.msgT = 2.4;
          Sfx.ok();
        }
      }

      if (g.portal && U.dist(g.p.x, g.p.y, PORTAL.x, PORTAL.y) < 0.62) completeLevel();
      g.time += dt;
    };

    function drawWorld() {
      horizon = H / 2 + Math.sin(g.bobT) * 3;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#05070b');
      sky.addColorStop(1, '#1c1017');
      ctx.fillStyle = sky;
      ctx.fillRect(-30, -30, W + 60, Math.max(0, horizon) + 30);
      const fl = ctx.createLinearGradient(0, horizon, 0, H);
      fl.addColorStop(0, '#1b1512');
      fl.addColorStop(1, '#08070a');
      ctx.fillStyle = fl;
      ctx.fillRect(-30, horizon, W + 60, H - horizon + 30);

      for (let x = 0; x < W; x += 2) {
        const cam = ((x + 1) / W) * 2 - 1;
        const ang = g.p.a + Math.atan(cam * Math.tan(FOV / 2));
        const ray = castRay(g.p.x, g.p.y, ang, 28);
        const perp = Math.max(0.06, ray.dist * Math.cos(ang - g.p.a));
        g.zbuf[x >> 1] = perp;
        const lh = Math.min(H * 3, H / perp);
        const top = horizon - lh / 2;
        const base = WALL_COL[ray.cell] || WALL_COL['#'];
        const fog = U.clamp(1.12 - perp * 0.08, 0.12, 1);
        const side = ray.side ? 0.76 : 1;
        const tex = 0.84 + 0.16 * Math.abs(Math.sin(ray.wx * Math.PI * 3));
        const k = fog * side * tex;
        ctx.fillStyle = 'rgb(' + Math.round(base[0] * k) + ',' + Math.round(base[1] * k) + ',' + Math.round(base[2] * k) + ')';
        ctx.fillRect(x, top, 2.5, lh);
        if (ray.cell === '=') {
          ctx.fillStyle = 'rgba(150,235,215,' + (0.2 * fog) + ')';
          ctx.fillRect(x, top + lh * 0.16, 2.5, Math.max(1, lh * 0.055));
        } else if (lh > 60) {
          ctx.fillStyle = 'rgba(0,0,0,' + (0.16 * fog) + ')';
          ctx.fillRect(x, top + lh * 0.88, 2.5, Math.max(1, lh * 0.12));
        }
      }
    }

    function drawDemon(sx, foot, h, e) {
      const hurt = e.hurt > 0;
      const w = h * 0.56;
      ctx.save();
      ctx.translate(sx, foot);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.6, h * 0.06, 0, 0, U.TAU);
      ctx.fill();
      const body = hurt ? '#ffe2dc' : (e.type === 'brute' ? '#6f2a4c' : '#8e2f2a');
      const dark = hurt ? '#ffbdb2' : (e.type === 'brute' ? '#3c1429' : '#5a1c19');
      const glow = e.type === 'brute' ? '#9dffcf' : '#ffd24a';
      ctx.fillStyle = dark;
      ctx.fillRect(-w * 0.34, -h * 0.34, w * 0.22, h * 0.34);
      ctx.fillRect(w * 0.12, -h * 0.34, w * 0.22, h * 0.34);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, w * 0.42, h * 0.26, 0, 0, U.TAU);
      ctx.fill();
      const swing = Math.sin(g.t * 5 + e.wob) * h * 0.05;
      ctx.fillRect(-w * 0.62, -h * 0.62 + swing, w * 0.18, h * 0.3);
      ctx.fillRect(w * 0.44, -h * 0.62 - swing, w * 0.18, h * 0.3);
      ctx.beginPath();
      ctx.arc(0, -h * 0.78, h * 0.14, 0, U.TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-h * 0.1, -h * 0.88);
      ctx.lineTo(-h * 0.26, -h * 1.04);
      ctx.lineTo(-h * 0.02, -h * 0.94);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(h * 0.1, -h * 0.88);
      ctx.lineTo(h * 0.26, -h * 1.04);
      ctx.lineTo(h * 0.02, -h * 0.94);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = glow;
        ctx.shadowColor = glow;
        ctx.shadowBlur = h * 0.12;
        ctx.beginPath();
        ctx.arc(-h * 0.055, -h * 0.8, h * 0.024, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(h * 0.055, -h * 0.8, h * 0.024, 0, U.TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (e.hp < e.maxHp) {
        const bw = w * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(-bw / 2, -h * 1.14, bw, Math.max(3, h * 0.04));
        ctx.fillStyle = e.type === 'brute' ? '#9dffcf' : '#ff6b76';
        ctx.fillRect(-bw / 2, -h * 1.14, bw * Math.max(0, e.hp / e.maxHp), Math.max(3, h * 0.04));
      }
      ctx.restore();
    }

    function drawPickup(sx, foot, size, p) {
      const bob = Math.sin(g.t * 3 + p.x) * size * 0.12;
      ctx.save();
      ctx.translate(sx, foot - size * 0.45 - bob);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(0, size * 1.1, size * 0.5, size * 0.12, 0, 0, U.TAU);
      ctx.fill();
      if (p.kind === 'health') {
        ctx.fillStyle = '#eef4f8';
        U.rr(ctx, -size * 0.5, -size * 0.5, size, size, size * 0.16);
        ctx.fill();
        ctx.fillStyle = '#e8443f';
        ctx.fillRect(-size * 0.1, -size * 0.36, size * 0.2, size * 0.72);
        ctx.fillRect(-size * 0.36, -size * 0.1, size * 0.72, size * 0.2);
      } else {
        ctx.fillStyle = '#f2c14e';
        U.rr(ctx, -size * 0.55, -size * 0.36, size * 1.1, size * 0.72, size * 0.1);
        ctx.fill();
        ctx.fillStyle = '#5a4210';
        ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.8, size * 0.2);
      }
      ctx.restore();
    }

    function drawBall(sx, sy, r) {
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.4);
      gr.addColorStop(0, 'rgba(255,240,180,.95)');
      gr.addColorStop(0.35, 'rgba(255,150,60,.85)');
      gr.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.4, 0, U.TAU);
      ctx.fill();
    }

    function drawPortal(sx, foot, scale) {
      const active = g.portal;
      const h = scale * 1.35;
      const w = h * 0.42;
      const pulse = 0.5 + Math.sin(g.t * 4) * 0.5;
      const col = active ? '140,230,165' : '90,120,130';
      ctx.save();
      ctx.translate(sx, foot);
      ctx.fillStyle = 'rgba(' + col + ',' + (active ? 0.22 + pulse * 0.18 : 0.12) + ')';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, w, h * 0.5, 0, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + col + ',' + (active ? 0.85 : 0.4) + ')';
      ctx.lineWidth = Math.max(2, scale * 0.02);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, w, h * 0.5, 0, 0, U.TAU);
      ctx.stroke();
      if (active) {
        ctx.strokeStyle = 'rgba(210,255,220,' + (0.4 + pulse * 0.4) + ')';
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.5, w * 0.62, h * 0.36, 0, 0, U.TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawSprites() {
      const items = [];
      for (const e of g.enemies) {
        if (e.dead) continue;
        items.push({ kind: 'enemy', e, d: U.dist(e.x, e.y, g.p.x, g.p.y) });
      }
      for (const p of g.pickups) {
        if (p.taken) continue;
        items.push({ kind: 'pickup', p, d: U.dist(p.x, p.y, g.p.x, g.p.y) });
      }
      for (const s of g.shots) items.push({ kind: 'shot', s, d: U.dist(s.x, s.y, g.p.x, g.p.y) });
      items.push({ kind: 'portal', d: U.dist(PORTAL.x, PORTAL.y, g.p.x, g.p.y) });
      items.sort((a, b) => b.d - a.d);

      const ca = Math.cos(g.p.a);
      const sa = Math.sin(g.p.a);
      for (const it of items) {
        const x = it.kind === 'portal' ? PORTAL.x : it.kind === 'enemy' ? it.e.x : it.kind === 'pickup' ? it.p.x : it.s.x;
        const y = it.kind === 'portal' ? PORTAL.y : it.kind === 'enemy' ? it.e.y : it.kind === 'pickup' ? it.p.y : it.s.y;
        const dx = x - g.p.x;
        const dy = y - g.p.y;
        const depth = dx * ca + dy * sa;
        if (depth < 0.2) continue;
        const lat = -dx * sa + dy * ca;
        const sx = W / 2 + (lat / depth) * PLANE;
        if (sx < -260 || sx > W + 260) continue;
        const col = U.clamp(Math.floor(sx / 2), 0, g.zbuf.length - 1);
        if (g.zbuf[col] < depth - 0.22) continue;
        const scale = H / depth;
        const foot = horizon + scale * 0.5;
        if (it.kind === 'enemy') {
          drawDemon(sx, foot, (it.e.type === 'brute' ? 1.02 : 0.8) * scale, it.e);
        } else if (it.kind === 'pickup') {
          drawPickup(sx, foot, scale * 0.34, it.p);
        } else if (it.kind === 'shot') {
          drawBall(sx, foot - scale * 0.45, Math.max(3, scale * 0.09));
        } else {
          drawPortal(sx, foot, scale);
        }
      }
    }

    function drawWeapon() {
      const bobX = Math.sin(g.bobT) * 9;
      const bobY = Math.abs(Math.cos(g.bobT)) * 6;
      const rec = g.recoil * (g.weapon ? 30 : 18);
      ctx.save();
      ctx.translate(W * 0.63 + bobX, H - 30 + bobY + rec);
      if (g.weapon === 2) {
        ctx.fillStyle = '#16283a';
        U.rr(ctx, -28, -78, 56, 96, 12);
        ctx.fill();
        ctx.fillStyle = '#28536e';
        U.rr(ctx, -20, -150, 40, 84, 10);
        ctx.fill();
        const pg = ctx.createLinearGradient(0, -150, 0, -74);
        pg.addColorStop(0, 'rgba(140,230,255,.95)');
        pg.addColorStop(0.5, 'rgba(90,150,255,.7)');
        pg.addColorStop(1, 'rgba(40,80,160,.15)');
        ctx.fillStyle = pg;
        ctx.fillRect(-7, -142, 14, 62);
        ctx.fillStyle = '#8d5a43';
        U.rr(ctx, -32, -16, 64, 52, 14);
        ctx.fill();
        if (g.flash > 0.02) {
          ctx.fillStyle = 'rgba(150,230,255,' + Math.min(1, g.flash * 10) + ')';
          ctx.beginPath();
          ctx.arc(0, -156, 30, 0, U.TAU);
          ctx.fill();
        }
      } else if (g.weapon === 3) {
        ctx.fillStyle = '#20262e';
        U.rr(ctx, -22, -70, 44, 88, 10);
        ctx.fill();
        ctx.fillStyle = '#2c343e';
        U.rr(ctx, -12, -186, 24, 120, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,90,90,.9)';
        ctx.fillRect(-3, -182, 6, 96);
        ctx.fillStyle = '#8d5a43';
        U.rr(ctx, -30, -14, 60, 50, 14);
        ctx.fill();
        if (g.flash > 0.02) {
          ctx.fillStyle = 'rgba(255,120,90,' + Math.min(1, g.flash * 10) + ')';
          ctx.beginPath();
          ctx.arc(0, -190, 26, 0, U.TAU);
          ctx.fill();
        }
      } else if (g.weapon === 1) {
        ctx.fillStyle = '#2a2320';
        U.rr(ctx, -46, -26, 92, 120, 14);
        ctx.fill();
        ctx.fillStyle = '#3b322d';
        U.rr(ctx, -38, -60, 76, 70, 12);
        ctx.fill();
        ctx.fillStyle = '#15191f';
        ctx.fillRect(-36, -150, 28, 96);
        ctx.fillRect(8, -150, 28, 96);
        ctx.fillStyle = '#232a33';
        ctx.fillRect(-36, -158, 28, 12);
        ctx.fillRect(8, -158, 28, 12);
        ctx.fillStyle = '#8d5a43';
        U.rr(ctx, -54, -6, 108, 46, 16);
        ctx.fill();
        if (g.flash > 0.02) {
          ctx.fillStyle = 'rgba(255,224,150,' + Math.min(1, g.flash * 10) + ')';
          ctx.beginPath();
          ctx.arc(-22, -166, 20, 0, U.TAU);
          ctx.arc(22, -166, 20, 0, U.TAU);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#2b3038';
        U.rr(ctx, -24, -74, 48, 84, 10);
        ctx.fill();
        ctx.fillStyle = '#171c22';
        U.rr(ctx, -18, -150, 36, 82, 8);
        ctx.fill();
        ctx.fillStyle = '#232a33';
        ctx.fillRect(-20, -160, 40, 14);
        ctx.fillStyle = '#8d5a43';
        U.rr(ctx, -30, -18, 60, 56, 14);
        ctx.fill();
        if (g.flash > 0.02) {
          ctx.fillStyle = 'rgba(255,224,150,' + Math.min(1, g.flash * 10) + ')';
          ctx.beginPath();
          ctx.arc(0, -168, 26, 0, U.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawMinimap() {
      const cell = 5.2;
      const size = MW * cell;
      const x0 = W - size - 28;
      const y0 = 22;
      ctx.fillStyle = 'rgba(6,8,12,.72)';
      ctx.fillRect(x0 - 8, y0 - 8, size + 16, size + 16);
      ctx.strokeStyle = 'rgba(255,74,87,.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 8, y0 - 8, size + 16, size + 16);
      for (let y = 0; y < MH; y++) {
        for (let x = 0; x < MW; x++) {
          const c = MAP[y][x];
          if (c === '.') continue;
          ctx.fillStyle = c === '=' ? '#3d7a72' : '#6a4a46';
          ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 0.4, cell - 0.4);
        }
      }
      ctx.fillStyle = g.portal ? 'rgba(140,230,165,.95)' : 'rgba(90,120,130,.55)';
      ctx.beginPath();
      ctx.arc(x0 + PORTAL.x * cell, y0 + PORTAL.y * cell, 3.4, 0, U.TAU);
      ctx.fill();
      for (const e of g.enemies) {
        if (e.dead) continue;
        ctx.fillStyle = e.type === 'brute' ? '#c77dff' : '#ff5a5a';
        ctx.beginPath();
        ctx.arc(x0 + e.x * cell, y0 + e.y * cell, 2.4, 0, U.TAU);
        ctx.fill();
      }
      for (const p of g.pickups) {
        if (p.taken) continue;
        ctx.fillStyle = p.kind === 'health' ? '#eef4f8' : '#f2c14e';
        ctx.fillRect(x0 + p.x * cell - 1.5, y0 + p.y * cell - 1.5, 3, 3);
      }
      const px = x0 + g.p.x * cell;
      const py = y0 + g.p.y * cell;
      ctx.fillStyle = '#eaf2f8';
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(g.p.a) * 5.4, py + Math.sin(g.p.a) * 5.4);
      ctx.lineTo(px + Math.cos(g.p.a + 2.5) * 4, py + Math.sin(g.p.a + 2.5) * 4);
      ctx.lineTo(px + Math.cos(g.p.a - 2.5) * 4, py + Math.sin(g.p.a - 2.5) * 4);
      ctx.closePath();
      ctx.fill();
    }

    function drawHud() {
      const top = H - 82;
      ctx.fillStyle = 'rgba(6,8,12,.82)';
      ctx.fillRect(0, top, W, 82);
      ctx.fillStyle = 'rgba(255,74,87,.55)';
      ctx.fillRect(0, top, W, 2);
      txt(ctx, 'HP', 40, top + 26, 14, '#8fb4c9', 'left', 700);
      txt(ctx, String(Math.max(0, Math.ceil(g.hp))), 40, top + 66, 34, g.hp > 35 ? '#eaf2f8' : '#ff6b76', 'left', 800);
      const bw = 160;
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(110, top + 40, bw, 10);
      ctx.fillStyle = g.hp > 35 ? '#8ce6a5' : '#ff6b76';
      ctx.fillRect(110, top + 40, bw * U.clamp(g.hp / g.maxHp, 0, 1), 10);
      txt(ctx, 'ПАТРОНЫ', 320, top + 26, 14, '#8fb4c9', 'left', 700);
      const wpn = WEAPONS[g.weapon];
      const ammoVal = wpn.ammo ? Math.max(0, g[wpn.ammo]) : '∞';
      txt(ctx, String(ammoVal), 320, top + 66, 30, '#f2c14e', 'left', 800);
      txt(ctx, wpn.name, 440, top + 50, 20, '#eaf2f8', 'left', 700);
      txt(ctx, 'B — СМЕНИТЬ · ' + g.unlocked.filter(Boolean).length + '/4', 440, top + 70, 12, '#7e93a4', 'left', 600);
      const cfg = levelConfig(g.levelIndex);
      const chName = CHAPTERS[Math.floor(g.levelIndex / 4)].name;
      txt(ctx, chName, W - 40, top + 30, 14, '#c9a6ff', 'right', 700);
      txt(ctx, cfg.name + (g.trialOn ? ' · ' + Math.ceil(g.trialT) + ' С' : ''), W - 40, top + 56, 18, '#eaf2f8', 'right', 800);
      txt(ctx, 'УБИТО ' + g.kills + ' · ОЧКИ ' + g.score, W - 40, top + 76, 12, '#8fb4c9', 'right', 600);

      const cx = W / 2, cy = H / 2;
      ctx.strokeStyle = g.hitMark > 0 ? 'rgba(255,90,90,.95)' : 'rgba(235,245,255,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5);
      ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      if (g.hitMark > 0) {
        ctx.strokeStyle = 'rgba(255,90,90,' + (g.hitMark * 5) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - 9); ctx.lineTo(cx - 4, cy - 4);
        ctx.moveTo(cx + 9, cy - 9); ctx.lineTo(cx + 4, cy - 4);
        ctx.moveTo(cx - 9, cy + 9); ctx.lineTo(cx - 4, cy + 4);
        ctx.moveTo(cx + 9, cy + 9); ctx.lineTo(cx + 4, cy + 4);
        ctx.stroke();
      }
      if (g.msgT > 0) {
        const a = Math.min(1, g.msgT * 2);
        ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,224,150,' + a + ')';
        ctx.fillText(g.msg, W / 2, H - 118);
      }
      drawMinimap();
    }

    function drawOverlays() {
      if (g.mode === 'pause') {
        ctx.fillStyle = 'rgba(4,6,10,.72)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ПАУЗА', W / 2, H / 2 - 20, 54, '#eaf2f8', 'center', 800);
        txt(ctx, '+ — ПРОДОЛЖИТЬ · HOME — ВЫЙТИ', W / 2, H / 2 + 40, 18, '#8fb4c9', 'center', 600);
      }
      if (g.hurt > 0 || g.hp < 30) {
        const a = Math.max(g.hurt * 0.6, g.hp < 30 ? 0.18 + Math.sin(g.t * 4) * 0.06 : 0);
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.78);
        vg.addColorStop(0, 'rgba(140,0,0,0)');
        vg.addColorStop(1, 'rgba(150,0,0,' + Math.max(0, Math.min(0.7, a)) + ')');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      if (g.mode === 'dead') {
        ctx.fillStyle = 'rgba(10,2,4,.78)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'ВЫ ПОГИБЛИ', W / 2, H / 2 - 40, 62, '#ff5a5a', 'center', 800);
        txt(ctx, levelConfig(g.levelIndex).name + ' · убито ' + g.kills, W / 2, H / 2 + 16, 20, '#e9dcff', 'center', 600);
        txt(ctx, 'A — ЗАНОВО', W / 2, H / 2 + 90, 20, '#19c3e8', 'center', 700);
      }
      if (g.mode === 'win') {
        ctx.fillStyle = 'rgba(4,10,8,.82)';
        ctx.fillRect(0, 0, W, H);
        txt(ctx, 'СЕКТОР ЗАЧИЩЕН', W / 2, H / 2 - 60, 58, '#8ce6a5', 'center', 800);
        txt(ctx, 'Очки ' + g.score + ' · время ' + fmt(g.time) + ' · убито ' + g.kills, W / 2, H / 2 + 6, 20, '#e9dcff', 'center', 600);
        txt(ctx, (g.newBest ? 'НОВЫЙ РЕКОРД · ' : 'Рекорд: ') + g.best, W / 2, H / 2 + 44, 18, '#f2c14e', 'center', 700);
        txt(ctx, 'A — ЕЩЁ РАЗ', W / 2, H / 2 + 110, 20, '#19c3e8', 'center', 700);
      }
    }

    function drawIntro() {
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#160508');
      bg.addColorStop(1, '#05070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#ff4a57';
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 + 40, 90 + i * 52 + Math.sin(g.t + i) * 8, 0, U.TAU);
        ctx.stroke();
      }
      ctx.restore();
      txt(ctx, 'КРАСНЫЙ СЕКТОР', W / 2, 220, 74, '#ff6070', 'center', 800);
      txt(ctx, 'ФОРМАТ SEC · NEBULA RUNTIME · 3 СЕКТОРА', W / 2, 268, 18, '#c9a6ff', 'center', 700);
      txt(ctx, 'Три волны демонов. Дробовик, пульсар и портал в центре.', W / 2, 330, 21, '#eef4f8', 'center', 600);
      txt(ctx, '↑↓ — идти · ←→ — поворот · X / Y — стрейф', W / 2, 398, 17, '#8fb4c9', 'center', 500);
      txt(ctx, 'A — огонь · B — сменить оружие · + — пауза', W / 2, 426, 17, '#8fb4c9', 'center', 500);
      const blink = 0.55 + Math.sin(g.t * 3) * 0.45;
      ctx.fillStyle = 'rgba(25,195,232,' + blink + ')';
      ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('A — НАЧАТЬ ЗАЧИСТКУ', W / 2, 520);
      if (g.best) txt(ctx, 'Рекорд: ' + g.best, W / 2, 566, 16, '#f2c14e', 'center', 700);
      txt(ctx, 'SEC · NebulaShell runtime 1.0', W - 40, H - 18, 11, 'rgba(255,74,87,.5)', 'right', 600);
    }

    function drawCampaign() {
      const acc = '#ff7048';
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#120608');
      bg.addColorStop(1, '#05070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W * 0.5, -100, 40, W * 0.5, -100, 900);
      glow.addColorStop(0, U.hexToRgba(acc, 0.18));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      txt(ctx, 'КАМПАНИЯ', 84, 86, 40, '#f2f8ff', 'left', 800);
      txt(ctx, 'ТРИ ГЛАВЫ · 9 УРОВНЕЙ · 3 ИСПЫТАНИЯ', 86, 118, 14, acc, 'left', 700);
      txt(ctx, 'ПРОЙДЕНО ' + campaign.done.filter(Boolean).length + ' / ' + ENTRY_COUNT, W - 40, 92, 16, '#f2c14e', 'right', 700);
      const CW = 356, CH = 68, GX = 10;
      for (let ch = 0; ch < CHAPTERS.length; ch++) {
        const x0 = 84 + ch * (CW + 24);
        txt(ctx, CHAPTERS[ch].name, x0 + 4, 186, 18, '#e9dcff', 'left', 700);
        for (let slot = 0; slot < 4; slot++) {
          const idx = ch * 4 + slot;
          const cfg = levelConfig(idx);
          const y = 214 + slot * (CH + GX);
          const sel = g.entryI === idx;
          const locked = idx > campaign.unlocked;
          const done = !!campaign.done[idx];
          panel(ctx, x0, y, CW, CH, 12, sel ? U.hexToRgba(acc, 0.18) : 'rgba(255,255,255,.035)', sel ? acc : 'rgba(120,160,190,.16)');
          txt(ctx, slot === 3 ? 'ИСПЫТАНИЕ' : 'УРОВЕНЬ ' + (slot + 1), x0 + 18, y + 26, 11, slot === 3 ? '#c9a6ff' : '#7f93a5', 'left', 700);
          txt(ctx, cfg.name, x0 + 18, y + 50, 17, locked ? '#5c6a76' : (done ? '#8ce6a5' : '#eaf2f8'), 'left', 700);
          if (locked) txt(ctx, 'ЗАКРЫТО', x0 + CW - 18, y + 42, 12, '#5c6a76', 'right', 700);
          else if (done) txt(ctx, '✓', x0 + CW - 18, y + 44, 18, '#8ce6a5', 'right', 800);
          else if (sel) txt(ctx, 'A →', x0 + CW - 18, y + 42, 12, acc, 'right', 700);
        }
      }
      txt(ctx, '↑↓←→ — выбор · A — начать · B — в меню', 84, H - 108, 13, '#7f93a5', 'left', 500);
      txt(ctx, 'Оружие, найденное на уровнях, остаётся с вами', 84, H - 84, 13, '#7f93a5', 'left', 500);
    }

    g.draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (g.mode === 'menu') { menu.draw(); return; }
      if (g.mode === 'campaign') { drawCampaign(); return; }
      if (g.mode === 'intro') { drawIntro(); return; }
      ctx.save();
      if (g.shake > 0.01) ctx.translate(U.rand(-1, 1) * 5 * g.shake, U.rand(-1, 1) * 5 * g.shake);
      drawWorld();
      drawSprites();
      drawWeapon();
      ctx.restore();
      drawHud();
      drawOverlays();
    };

    g.debug = () => ({
      mode: g.mode, hp: g.hp, shells: g.shells, cells: g.cells, weapon: WEAPONS[g.weapon].name,
      level: g.levelIndex, entry: g.entryI, trial: g.trialOn, trialT: Math.ceil(g.trialT),
      done: campaign.done.filter(Boolean).length, unlocked: campaign.unlocked,
      kills: g.kills, score: g.score, portal: g.portal,
      alive: g.enemies.filter((e) => !e.dead).length,
      shots: g.shots.length,
      pickups: g.pickups.filter((p) => !p.taken).length,
      x: +g.p.x.toFixed(2), y: +g.p.y.toFixed(2), a: +g.p.a.toFixed(2),
      enemies: g.enemies.filter((e) => !e.dead).slice(0, 8).map((e) => ({ x: +e.x.toFixed(2), y: +e.y.toFixed(2), hp: e.hp, type: e.type })),
    });

    return g;
  }

  add({
    id: 'doom',
    name: 'КРАСНЫЙ СЕКТОР',
    desc: 'Шутер от первого лица: три волны демонов, дробовик и портал. Формат SEC.',
    author: 'NEBULA OS',
    sizeMB: 480,
    format: 'SEC',
    needFw: 'nebula',
    icon: 'doom',
    color: '#2a0d12',
    create: doomGame,
  });

  /* --- конец реестра --- */
  return {
    W, H, list, has: (id) => !!get(id), get,
    probe: () => (window.Nebula ? Nebula.probe() : null),
    create(id, ctx) {
      const meta = get(id);
      if (!meta) return null;
      if (meta.needFw) {
        const p = window.Nebula ? Nebula.probe() : {
          ready: false, abi: 'NEBULA-ABI-1.0', firmware: 'Switch OS 2.0',
          missing: ['nb_save', 'nb_load', 'nb_haptic', 'nb_audio', 'nb_skin'],
        };
        if (!p.ready) return gate(meta, ctx, p);
      }
      try {
        return meta.create(ctx);
      } catch (e) {
        return crash(meta, ctx, e);
      }
    },
  };
})();
