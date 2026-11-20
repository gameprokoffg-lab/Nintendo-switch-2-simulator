'use strict';

/* =====================================================================
   Мир: комната, столы, консоль, Joy-Con 2, грип, док, телевизор, HDMI
   ===================================================================== */

const World = (() => {
  const W = 1600, H = 900;
  const SURFACE = 700;          // линия столешницы / тумбы
  const CONSOLE_W = 420, CONSOLE_H = 250;
  const JC_W = 76, JC_H = 250;
  const GRIP_W = 76;
  const DOCK = { x: 1130, y: 634, w: 140, h: 132 };      // центр + размеры
  const GRIP = { x: 1470, y: 575 };
  const TV = {
    left: 40, top: 126, w: 540, h: 316,
    screen: { x: 54, y: 140, w: 452, h: 254 },
  };
  const PORTS = {
    tv: { x: 528, y: 424, label: 'HDMI IN' },
    dock: { x: 1056, y: 648, label: 'HDMI OUT' },
  };

  // ящик стола, мусорка и Wi-Fi
  const DRAWER = { x: 150, y: SURFACE + 60, w: 420, h: 120 };
  const DRAWER_HANDLE = { x: 298, y: SURFACE + 112, w: 74, h: 12 };
  const TRASH = { x: 30, y: 744, w: 118, h: 138 };
  const WIFI_DEFAULT = { ssid: 'SW2-HOME', pass: 'switch2' };

  const DESKS = [
    { name: 'Стол у окна', consoleX: 800, dock: false },
    { name: 'ТВ-зона', consoleX: 780, dock: true },
    { name: 'Хранилище', consoleX: 820, dock: false, storage: true },
  ];

  // стеллаж в комнате-хранилище
  const STORAGE = { cols: 5, rows: 2, x: 300, y: 152, dx: 250, dy: 192, scale: 0.86 };

  function storageSlots() {
    const out = [];
    for (let r = 0; r < STORAGE.rows; r++) {
      for (let c = 0; c < STORAGE.cols; c++) {
        out.push({ i: r * STORAGE.cols + c, x: STORAGE.x + c * STORAGE.dx, y: STORAGE.y + r * STORAGE.dy });
      }
    }
    return out;
  }
  const SLOTS = storageSlots();

  const COL = {
    l: '#19c3e8',
    r: '#ff4a57',
  };

  /* ---------- раскладка кнопок Joy-Con (локальные координаты) ---------- */
  const LAYOUT = {
    L: [
      { id: 'ZL', kind: 'pill', x: 0, y: -119, w: 46, h: 11, label: 'ZL', small: true },
      { id: 'L', kind: 'pill', x: 0, y: -103, w: 54, h: 17, label: 'L' },
      { id: 'stick', kind: 'stick', x: 0, y: -62, r: 24, label: 'L' },
      { id: 'up', kind: 'rbtn', x: 0, y: -14, r: 9, label: '▲' },
      { id: 'left', kind: 'rbtn', x: -20, y: 8, r: 9, label: '◀' },
      { id: 'right', kind: 'rbtn', x: 20, y: 8, r: 9, label: '▶' },
      { id: 'down', kind: 'rbtn', x: 0, y: 30, r: 9, label: '▼' },
      { id: 'minus', kind: 'pill', x: 0, y: 58, w: 18, h: 6, label: '−' },
      { id: 'capture', kind: 'rbtn', x: 0, y: 90, r: 11, label: '◉' },
      { id: 'SL', kind: 'pill', x: 32, y: -46, w: 9, h: 30, label: 'SL', small: true },
      { id: 'SR', kind: 'pill', x: 32, y: 46, w: 9, h: 30, label: 'SR', small: true },
      { id: 'release', kind: 'rbtn', x: 26, y: -92, r: 7, label: '⏏', release: true },
    ],
    R: [
      { id: 'ZR', kind: 'pill', x: 0, y: -119, w: 46, h: 11, label: 'ZR', small: true },
      { id: 'R', kind: 'pill', x: 0, y: -103, w: 54, h: 17, label: 'R' },
      { id: 'X', kind: 'rbtn', x: 0, y: -88, r: 10, label: 'X' },
      { id: 'Y', kind: 'rbtn', x: -22, y: -64, r: 10, label: 'Y' },
      { id: 'A', kind: 'rbtn', x: 22, y: -64, r: 10, label: 'A' },
      { id: 'B', kind: 'rbtn', x: 0, y: -40, r: 10, label: 'B' },
      { id: 'stick', kind: 'stick', x: 0, y: 14, r: 24, label: 'R' },
      { id: 'plus', kind: 'pill', x: 0, y: 64, w: 18, h: 6, label: '+' },
      { id: 'home', kind: 'rbtn', x: 0, y: 92, r: 11, label: '⌂' },
      { id: 'C', kind: 'rbtn', x: 0, y: 117, r: 8, label: 'C', accent: true },
      { id: 'SL', kind: 'pill', x: -32, y: -46, w: 9, h: 30, label: 'SL', small: true },
      { id: 'SR', kind: 'pill', x: -32, y: 46, w: 9, h: 30, label: 'SR', small: true },
      { id: 'release', kind: 'rbtn', x: -26, y: -92, r: 7, label: '⏏', release: true },
    ],
  };

  const BUTTON_NAMES = {
    'up': 'Крестовина ▲', 'down': 'Крестовина ▼', 'left': 'Крестовина ◀', 'right': 'Крестовина ▶',
    'A': 'A', 'B': 'B', 'X': 'X', 'Y': 'Y', 'L': 'L', 'R': 'R', 'ZL': 'ZL', 'ZR': 'ZR',
    'plus': '+', 'minus': '−', 'home': 'Home', 'capture': 'Capture', 'C': 'C', 'stick': 'Стик',
    'SL': 'SL', 'SR': 'SR', 'release': 'Снятие с магнита',
  };

  /* ------------------------------- состояние ------------------------------- */
  const state = {
    desk: 0,
    powered: false,
    con: { x: DESKS[0].consoleX, y: SURFACE - CONSOLE_H / 2, w: CONSOLE_W, h: CONSOLE_H, docked: false, dragging: false, cart: null, cartRef: null, battery: 58, charging: false, owned: false },
    joycons: [
      { side: 'L', x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0, w: JC_W, h: JC_H, attached: 'consoleL', dragging: false, press: {}, stick: { x: 0, y: 0 } },
      { side: 'R', x: 0, y: 0, angle: 0, vx: 0, vy: 0, va: 0, w: JC_W, h: JC_H, attached: 'consoleR', dragging: false, press: {}, stick: { x: 0, y: 0 } },
    ],
    carts: [],
    items: [],
    drawer: { open: false, anim: 0, manual: false },
    wifi: { mounted: false, x: 0, y: 0, room: 0, online: false, ssid: WIFI_DEFAULT.ssid, pass: WIFI_DEFAULT.pass },
    cable: { a: { x: 470, y: 684, port: null }, b: { x: 560, y: 688, port: null } },
    powerCable: { a: { x: 930, y: 640, port: null }, b: { x: 866, y: 672, port: null } },
    fx: [],
    hover: null,
    dragKind: null,
    dragRef: null,
    grabDX: 0,
    grabDY: 0,
    lastMouse: { x: 0, y: 0, t: 0 },
    mouse: { x: 0, y: 0 },
    hintPowerUntil: 0,
  };

  let controllerHandler = () => {};
  let eventHandler = () => {};
  let stickHandler = () => {};
  let clock = 0;

  /* ------------------------------- помощники ------------------------------- */
  const con = () => state.con;
  const consoleRect = (c = state.con) => ({ x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h });
  const screenRect = (c = state.con) => ({ x: c.x - 186, y: c.y - 105, w: 372, h: 210 });
  const jc = (side) => state.joycons[side === 'L' ? 0 : 1];

  function powerRect(c = state.con) {
    const top = c.y - c.h / 2;
    return { x: c.x - c.w / 2 + 26, y: top - 7, w: 46, h: 18 };
  }
  function volumeRect(c = state.con) {
    const top = c.y - c.h / 2;
    return { x: c.x - c.w / 2 + 82, y: top - 6, w: 54, h: 16 };
  }
  function cartSlotRect(c = state.con) {
    const top = c.y - c.h / 2;
    return { x: c.x + c.w / 2 - 92, y: top - 7, w: 62, h: 18 };
  }
  function dockRect() {
    return { x: DOCK.x - DOCK.w / 2, y: DOCK.y - DOCK.h / 2, w: DOCK.w, h: DOCK.h };
  }

  function attachedPos(side, target) {
    const c = state.con;
    if (target === 'consoleL') return { x: c.x - (c.w / 2 + JC_W / 2 - 2), y: c.y, angle: 0 };
    if (target === 'consoleR') return { x: c.x + (c.w / 2 + JC_W / 2 - 2), y: c.y, angle: 0 };
    if (target === 'gripL') return { x: GRIP.x - (GRIP_W / 2 + JC_W / 2), y: GRIP.y, angle: 0 };
    if (target === 'gripR') return { x: GRIP.x + (GRIP_W / 2 + JC_W / 2), y: GRIP.y, angle: 0 };
    return null;
  }

  function jcToWorld(j, lx, ly) {
    const s = Math.sin(j.angle), c = Math.cos(j.angle);
    return { x: j.x + lx * c - ly * s, y: j.y + lx * s + ly * c };
  }
  function pointToJc(j, px, py) {
    const dx = px - j.x, dy = py - j.y;
    const s = Math.sin(-j.angle), c = Math.cos(-j.angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  function hitButton(j, px, py) {
    const p = pointToJc(j, px, py);
    const list = LAYOUT[j.side];
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.kind === 'rbtn' || b.kind === 'stick') {
        if (U.dist(p.x, p.y, b.x, b.y) <= (b.r + 4)) return b;
      } else {
        const hw = b.w / 2 + 4, hh = b.h / 2 + 4;
        if (Math.abs(p.x - b.x) <= hw && Math.abs(p.y - b.y) <= hh) return b;
      }
    }
    return null;
  }

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  /* ------------------------------- стики ------------------------------- */
  function setStick(j, b, px, py) {
    const p = pointToJc(j, px, py);
    let dx = p.x - b.x, dy = p.y - b.y;
    const max = b.r * 0.66;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    j.stickKnob = { x: dx, y: dy };
    j.stick.x = dx / max;
    j.stick.y = dy / max;
    stickHandler({ side: j.side, x: j.stick.x, y: j.stick.y, attached: !!j.attached });
  }

  function releaseStick(j) {
    j.stickKnob = { x: 0, y: 0 };
    j.stick.x = 0;
    j.stick.y = 0;
    stickHandler({ side: j.side, x: 0, y: 0, attached: !!j.attached });
  }

  function cableConnected() {
    const a = state.cable.a.port, b = state.cable.b.port;
    return (a === 'tv' && b === 'dock') || (a === 'dock' && b === 'tv');
  }

  const POWER_SOCKET = { x: 980, y: 505 };
  const POWER_PORTS = {
    socket: { x: POWER_SOCKET.x, y: POWER_SOCKET.y + 8, label: 'РОЗЕТКА' },
    dockp: { x: 1058, y: 692, label: 'POWER' },
  };
  function powerConnected() {
    const a = state.powerCable.a.port, b = state.powerCable.b.port;
    return (a === 'socket' && b === 'dockp') || (a === 'dockp' && b === 'socket');
  }

  /* --------------------------- физика джойконов --------------------------- */
  const GRAVITY = 2700;

  function surfaceY(j) {
    const c = Math.abs(Math.cos(j.angle)), s = Math.abs(Math.sin(j.angle));
    return SURFACE - (c * j.h + s * j.w) / 2;
  }

  function stepBody(b, dt, isJoycon) {
    if (b.dragging) return;
    b.vy += GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.va * dt;

    const groundY = surfaceY(b);
    if (b.y >= groundY) {
      const impact = b.vy;
      b.y = groundY;
      if (b.vy > 0) b.vy = -b.vy * 0.26;
      if (Math.abs(b.vy) < 90) b.vy = 0;
      b.vx *= Math.pow(0.02, dt);
      b.va *= Math.pow(0.02, dt);
      b.resting = true;
      if (impact > 700 && isJoycon) {
        Sfx.drop();
        state.fx.push({ kind: 'dust', x: b.x, y: SURFACE - 4, t: 0, life: 0.5 });
      }
      // мягко укладываем на грань
      const quarter = Math.PI / 2;
      let target = Math.round(b.angle / quarter) * quarter;
      if (Math.abs(b.angle - target) > 0.1 && Math.abs(b.angle) < 1.3) {
        // заваливается на бок, если уже накренился
        b.angle += Math.sign(b.angle) * 2.6 * dt;
      } else {
        b.angle = U.damp(b.angle, target, 0.22, dt);
      }
    } else {
      b.resting = false;
      b.va *= Math.pow(0.6, dt);
    }

    const halfW = (Math.abs(Math.cos(b.angle)) * b.w + Math.abs(Math.sin(b.angle)) * b.h) / 2;
    if (b.x < halfW + 14) { b.x = halfW + 14; b.vx = Math.abs(b.vx) * 0.4; }
    if (b.x > W - halfW - 14) { b.x = W - halfW - 14; b.vx = -Math.abs(b.vx) * 0.4; }
  }

  /* ------------------------------ события ------------------------------ */
  function emit(type, payload) { eventHandler(type, payload); }

  function ripple(x, y, color) {
    state.fx.push({ kind: 'ring', x, y, t: 0, life: 0.85, color });
    state.fx.push({ kind: 'ring', x, y, t: -0.12, life: 0.95, color, thin: true });
  }

  /* ------------------------------ действия ------------------------------ */
  function attachJoycon(j, target) {
    const p = attachedPos(j.side, target);
    if (!p) return;
    j.attached = target;
    j.dragging = false;
    j.x = p.x; j.y = p.y; j.angle = 0; j.vx = 0; j.vy = 0; j.va = 0;
    Sfx.attach(j.side);
    ripple(j.x, j.y, j.side === 'L' ? COL.l : COL.r);
    emit('attach', { side: j.side, target });
  }

  function detachJoycon(j, silent) {
    if (!j.attached) return;
    const p = jcToWorld(j, 0, 0);
    j.attached = null;
    j.x = p.x; j.y = p.y;
    j.vy = 20;
    j.va = U.rand(-0.4, 0.4);
    if (!silent) Sfx.detach();
    emit('detach', { side: j.side });
  }

  function snapTargetOf(j) {
    const c = state.con;
    const cands = [];
    if (!c.docked) {
      cands.push({ t: 'consoleL', p: attachedPos(j.side, 'consoleL') });
      cands.push({ t: 'consoleR', p: attachedPos(j.side, 'consoleR') });
    }
    if (state.desk === 1) {
      cands.push({ t: 'gripL', p: attachedPos(j.side, 'gripL') });
      cands.push({ t: 'gripR', p: attachedPos(j.side, 'gripR') });
    }
    let best = null;
    for (const cand of cands) {
      if (!cand.p) continue;
      const d = U.dist(j.x, j.y, cand.p.x, cand.p.y);
      const okSide = (cand.t === 'consoleL' || cand.t === 'gripL') ? j.side === 'L' : j.side === 'R';
      if (!okSide) continue;
      if (d < 62 && !best) best = cand;
      else if (d < 62 && d < U.dist(j.x, j.y, best.p.x, best.p.y)) best = cand;
    }
    return best;
  }

  function nearestDockDrop(px, py) {
    const d = dockRect();
    return px > d.x - 130 && px < d.x + d.w + 130 && py > d.y - 220 && py < d.y + d.h + 120;
  }

  function nearestStorageSlot(cart) {
    let best = null, bestD = 104;
    for (const s of SLOTS) {
      const d = U.dist(cart.x, cart.y, s.x, s.y);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  function dockConsole() {
    const c = state.con;
    if (state.desk !== 1) return false;
    const attached = state.joycons.some((j) => j.attached === 'consoleL' || j.attached === 'consoleR');
    if (attached) {
      emit('toast', { text: 'Сначала снимите Joy-Con с консоли — иначе она не влезет в док', kind: 'red' });
      Sfx.error();
      return false;
    }
    c.docked = true;
    c.x = DOCK.x;
    c.y = (DOCK.y - DOCK.h / 2) + 52 - c.h / 2;
    Sfx.dock();
    ripple(DOCK.x, DOCK.y - 40, '#f2c14e');
    emit('dock', {});
    return true;
  }

  function undockConsole() {
    if (!state.con.docked) return;
    state.con.docked = false;
    state.con.y = SURFACE - CONSOLE_H / 2;
    Sfx.detach();
    emit('undock', {});
  }

  function insertCart(cart) {
    const c = state.con;
    if (c.cart) {
      emit('toast', { text: 'В консоли уже картридж — сначала извлеките его', kind: 'red' });
      Sfx.error();
      return false;
    }
    c.cart = cart.gameId;
    c.cartRef = cart;
    Sfx.cart();
    ripple(c.x, c.y - c.h / 2, '#f2c14e');
    state.carts = state.carts.filter((x) => x !== cart);
    emit('cartInsert', { gameId: cart.gameId, name: cart.name, cart });
    return true;
  }

  function ejectCart() {
    const c = state.con;
    if (!c.cart) return;
    const id = c.cart;
    const ref = c.cartRef || null;
    const info = window.Library ? window.Library.get(id) : null;
    c.cart = null;
    c.cartRef = null;
    const cart = {
      gameId: id, name: ref ? ref.name : (info ? info.name : 'Игра'),
      x: c.x, y: c.y - c.h / 2 - 70, vx: U.rand(-40, 40), vy: -260, angle: U.rand(-0.2, 0.2), va: U.rand(-1.2, 1.2),
      w: 92, h: 132, dragging: false, desk: state.desk, slot: null,
      img: ref ? ref.img || null : (info ? info.img || null : null),
      menuImg: ref ? ref.menuImg || null : (info ? info.menuImg || null : null),
      stockFw: !!(ref && ref.stockFw),
      customOs: !!(ref && ref.customOs),
      firmwareText: ref ? ref.firmwareText || null : null,
      sizeMB: ref ? ref.sizeMB || null : null,
      phys: !!(ref && ref.phys),
      code: ref ? ref.code || null : null,
      desc: ref ? ref.desc || '' : '',
      author: ref ? ref.author || '' : '',
      pubId: ref ? ref.pubId || null : null,
    };
    state.carts.push(cart);
    Sfx.cart();
    emit('cartEject', { gameId: id });
  }

  function addCart(name, gameId, opts) {
    const o = opts || {};
    const cart = {
      gameId, name,
      x: o.x != null ? o.x : (state.desk === 1 ? 880 : 1080),
      y: o.y != null ? o.y : 420, vx: U.rand(-60, 60), vy: 0, angle: U.rand(-0.25, 0.25), va: U.rand(-1, 1),
      w: 92, h: 132, dragging: false,
      desk: o.desk != null ? o.desk : state.desk,
      slot: o.slot != null ? o.slot : null,
      img: o.img || null, menuImg: o.menuImg || null,
      stockFw: !!o.stockFw, customOs: !!o.customOs,
      firmwareText: o.firmwareText || null,
      sizeMB: o.sizeMB || null,
      phys: !!o.phys, code: o.code || null, desc: o.desc || '',
      author: o.author || '', pubId: o.pubId || null,
    };
    if (cart.slot != null) {
      const s = SLOTS[cart.slot];
      if (s) {
        cart.x = o.x != null ? o.x : s.x;
        cart.y = o.y != null ? o.y : s.y;
        cart.vx = 0; cart.vy = 0; cart.angle = 0;
      }
    }
    state.carts.push(cart);
    return cart;
  }

  function spawnStockFirmware() {
    if (state.carts.some((c) => c.stockFw)) return null;
    const s = firstFreeSlot(0) || SLOTS[0];
    return addCart('Обычная прошивка', 'stock-fw', { desk: 2, slot: s.i, x: s.x, y: s.y, stockFw: true });
  }

  /* ------------------------ коробки, роутер, мануал, Wi-Fi ------------------------ */
  const LIFE_KEY = 'switch2.life.v1';

  function firstFreeSlot(from) {
    for (let i = from || 0; i < SLOTS.length; i++) {
      if (!state.carts.some((c) => c.slot === i)) return SLOTS[i];
    }
    return null;
  }

  function addItem(o) {
    addItem.seq = (addItem.seq || 0) + 1;
    const it = {
      id: 'it' + addItem.seq,
      kind: o.kind, box: o.box || null, opened: !!o.opened,
      x: o.x, y: o.y, w: o.w, h: o.h,
      desk: o.desk != null ? o.desk : 0,
      dragging: false,
    };
    state.items.push(it);
    return it;
  }

  function itemAt(px, py) {
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      if (it.desk !== state.desk) continue;
      if (Math.abs(px - it.x) <= it.w / 2 + 6 && Math.abs(py - it.y) <= it.h / 2 + 6) return it;
    }
    return null;
  }

  const DRAWER_OPEN = 28;
  function drawerHandleRect() {
    const off = state.drawer.anim * DRAWER_OPEN;
    return { x: DRAWER_HANDLE.x, y: DRAWER_HANDLE.y + off, w: DRAWER_HANDLE.w, h: DRAWER_HANDLE.h };
  }
  function drawerOpenRect() {
    return { x: DRAWER.x + 18, y: DRAWER.y - 26, w: DRAWER.w - 36, h: 52 };
  }
  function trashRect() { return { x: TRASH.x, y: TRASH.y, w: TRASH.w, h: TRASH.h }; }
  function inTrash(px, py) { return inRect(px, py, trashRect()); }

  function lifeData() {
    const manual = state.items.find((it) => it.kind === 'manual');
    const router = state.items.find((it) => it.kind === 'router');
    return {
      owned: state.con.owned,
      wifi: { mounted: state.wifi.mounted, online: state.wifi.online, x: state.wifi.x, y: state.wifi.y, room: state.wifi.room },
      drawerManual: state.drawer.manual,
      manual: manual ? { x: manual.x, y: manual.y } : null,
      router: router ? { x: router.x, y: router.y } : null,
      boxes: state.items.filter((it) => it.kind === 'box').map((it) => ({ box: it.box, opened: !!it.opened })),
      carts: state.carts.filter((c) => c.phys).map((c) => ({
        gameId: c.gameId, name: c.name, code: c.code || null, desc: c.desc || '',
        author: c.author || '', sizeMB: c.sizeMB || null, img: c.img || null,
        menuImg: c.menuImg || null, pubId: c.pubId || null,
        desk: c.desk, slot: c.slot, x: c.x, y: c.y, angle: c.angle,
      })),
    };
  }

  function lifeSave() {
    try { localStorage.setItem(LIFE_KEY, JSON.stringify(lifeData())); } catch (err) { /* приватный режим */ }
  }

  function deliver(kind, opts) {
    const o = opts || {};
    if (kind === 'console') {
      if (state.con.owned) return { ok: false, reason: 'owned' };
      if (state.items.some((it) => it.kind === 'box' && it.box === 'console')) return { ok: false, reason: 'pending' };
      addItem({ kind: 'box', box: 'console', x: 500, y: SURFACE - 108, w: 330, h: 200 });
      emit('toast', { text: 'Коробка с Nintendo Switch 2 — на столе у окна', kind: 'cyan' });
      lifeSave();
      return { ok: true };
    }
    if (kind === 'router') {
      if (state.wifi.mounted || state.items.some((it) => (it.kind === 'box' && it.box === 'router') || it.kind === 'router')) return { ok: false, reason: 'pending' };
      addItem({ kind: 'box', box: 'router', x: 1030, y: SURFACE - 84, w: 260, h: 152 });
      emit('toast', { text: 'Коробка с Wi-Fi роутером — на столе у окна', kind: 'cyan' });
      lifeSave();
      return { ok: true };
    }
    if (kind === 'manual') {
      if (state.drawer.manual || state.items.some((it) => it.kind === 'manual')) return { ok: false, reason: 'owned' };
      addItem({ kind: 'manual', x: 470, y: SURFACE - 84, w: 124, h: 152 });
      emit('toast', { text: 'Мануал на столе — перетащите его в ящик', kind: 'cyan' });
      lifeSave();
      return { ok: true };
    }
    if (kind === 'cart') {
      if (o.gameId && state.carts.some((c) => c.phys && c.gameId === o.gameId)) return { ok: false, reason: 'owned' };
      const slot = firstFreeSlot(0);
      if (!slot) return { ok: false, reason: 'full' };
      const cart = addCart(o.name || o.gameId, o.gameId, {
        desk: 2, slot: slot.i, x: slot.x, y: slot.y,
        img: o.img || null, menuImg: o.menuImg || null, sizeMB: o.sizeMB || null,
        phys: true, code: o.code || null, desc: o.desc || '',
        author: o.author || '', pubId: o.pubId || null,
      });
      cart.phys = true;
      emit('toast', { text: 'Картридж «' + (o.name || o.gameId) + '» доставлен в хранилище', kind: 'cyan' });
      lifeSave();
      return { ok: true };
    }
    return { ok: false, reason: 'unknown' };
  }

  function openBox(it) {
    if (!it || it.kind !== 'box') return;
    if (it.box === 'console') {
      if (!it.opened) {
        it.opened = true;
        state.con.owned = true;
        state.con.docked = false;
        state.con.x = DESKS[0].consoleX;
        state.con.y = SURFACE - CONSOLE_H / 2;
        for (const j of state.joycons) {
          j.attached = j.side === 'L' ? 'consoleL' : 'consoleR';
          j.angle = 0;
          j.dragging = false;
        }
        Sfx.attach('L');
        emit('toast', { text: 'В коробке: консоль, станция и Joy-Con 2. Коробку можно выбросить', kind: 'cyan' });
      } else {
        emit('toast', { text: 'Коробка пуста — перетащите её в мусорку' });
      }
    } else if (it.box === 'router') {
      if (!it.opened) {
        it.opened = true;
        addItem({ kind: 'router', x: it.x, y: SURFACE - 58, w: 176, h: 96 });
        emit('toast', { text: 'Роутер в коробке. Зажмите его ПКМ и перетащите на стену', kind: 'cyan' });
        Sfx.pick();
      } else {
        emit('toast', { text: 'Коробка пуста — перетащите её в мусорку' });
      }
    }
    lifeSave();
  }

  function trashItem(it) {
    if (it.kind !== 'box') {
      emit('toast', { text: 'В мусорку можно выбрасывать только коробки', kind: 'red' });
      return false;
    }
    if (!it.opened) {
      Sfx.error();
      emit('toast', { text: 'Сначала откройте коробку', kind: 'red' });
      return false;
    }
    state.items = state.items.filter((x) => x !== it);
    Sfx.drop();
    emit('toast', { text: 'Коробка в мусорке', kind: 'cyan' });
    lifeSave();
    return true;
  }

  function storeManualInDrawer() {
    const m = state.items.find((it) => it.kind === 'manual');
    if (!m) return false;
    state.items = state.items.filter((x) => x !== m);
    state.drawer.manual = true;
    Sfx.cart();
    emit('toast', { text: 'Мануал в ящике — нажмите на ручку, чтобы закрыть', kind: 'cyan' });
    lifeSave();
    return true;
  }

  function takeManualFromDrawer() {
    if (!state.drawer.manual) return false;
    state.drawer.manual = false;
    addItem({ kind: 'manual', x: 360, y: SURFACE - 84, w: 124, h: 152 });
    Sfx.cart();
    emit('toast', { text: 'Мануал на столе — нажмите на него, чтобы читать', kind: 'cyan' });
    lifeSave();
    return true;
  }

  function connectWifi(pass) {
    if (window.Dev && Dev.on) Dev.check('роутер на стене', state.wifi.mounted);
    if (!state.wifi.mounted) return { ok: false, error: 'Роутер не установлен' };
    if (String(pass || '') !== state.wifi.pass) return { ok: false, error: 'Неверный пароль Wi-Fi' };
    state.wifi.online = true;
    if (window.Dev && Dev.on) Dev.variable('Wi-Fi подключён', 'да');
    lifeSave();
    emit('toast', { text: 'Wi-Fi подключён · ' + state.wifi.ssid, kind: 'cyan' });
    return { ok: true };
  }

  function wifiInfo() {
    return { ssid: state.wifi.ssid, mounted: state.wifi.mounted, online: state.wifi.online, x: state.wifi.x, y: state.wifi.y, room: state.wifi.room };
  }

  function isOnline() { return state.wifi.mounted && state.wifi.online; }

  function lifeLoad() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LIFE_KEY) || 'null'); } catch (err) { d = null; }
    if (!d) return;
    state.con.owned = !!d.owned;
    if (state.con.owned) {
      for (const j of state.joycons) j.attached = j.side === 'L' ? 'consoleL' : 'consoleR';
    }
    if (d.wifi) {
      state.wifi.mounted = !!d.wifi.mounted;
      state.wifi.online = !!d.wifi.mounted && !!d.wifi.online;
      state.wifi.x = d.wifi.x || 0;
      state.wifi.y = d.wifi.y || 0;
      state.wifi.room = d.wifi.room || 0;
    }
    state.drawer.manual = !!d.drawerManual;
    if (Array.isArray(d.boxes)) {
      for (const b of d.boxes) {
        const consoleBox = b.box === 'console';
        addItem({
          kind: 'box', box: b.box, opened: !!b.opened,
          x: consoleBox ? 500 : 1030,
          y: consoleBox ? SURFACE - 108 : SURFACE - 84,
          w: consoleBox ? 330 : 260,
          h: consoleBox ? 200 : 152,
        });
      }
    }
    if (d.manual && !state.drawer.manual) {
      addItem({ kind: 'manual', x: U.clamp(d.manual.x, 160, W - 160), y: Math.min(d.manual.y, SURFACE - 84), w: 124, h: 152 });
    }
    if (d.router && !state.wifi.mounted) {
      addItem({ kind: 'router', x: U.clamp(d.router.x || 1030, 160, W - 160), y: Math.min(d.router.y || SURFACE - 58, SURFACE - 60), w: 176, h: 96 });
    }
    if (Array.isArray(d.carts)) {
      for (const c of d.carts) {
        if (state.carts.some((x) => x.phys && x.gameId === c.gameId)) continue;
        const onDesk = c.desk != null ? c.desk : 2;
        let slot = null;
        if (onDesk === 2 && c.slot != null && SLOTS[c.slot] && !state.carts.some((x) => x.slot === c.slot)) slot = SLOTS[c.slot];
        if (onDesk === 2 && !slot) slot = firstFreeSlot(0);
        addCart(c.name || c.gameId, c.gameId, {
          desk: onDesk, slot: slot ? slot.i : null,
          x: slot ? slot.x : U.clamp(c.x || 400, 80, W - 80),
          y: slot ? slot.y : Math.min(c.y || SURFACE - 110, SURFACE - 80),
          phys: true, code: c.code || null, desc: c.desc || '', author: c.author || '',
          sizeMB: c.sizeMB || null, img: c.img || null, menuImg: c.menuImg || null,
          pubId: c.pubId || null,
        });
      }
    }
  }

  /* ------------------------------ ввод ------------------------------ */
  function pointerDown(px, py) {
    state.mouse = { x: px, y: py };
    state.lastMouse = { x: px, y: py, t: performance.now() };

    // ящик стола, мануал и коробки
    if (state.desk === 0) {
      if (inRect(px, py, drawerHandleRect())) {
        state.drawer.open = !state.drawer.open;
        Sfx.btn();
        if (state.drawer.open && state.drawer.manual) emit('toast', { text: 'Нажмите на мануал в ящике, чтобы достать', kind: 'cyan' });
        return 'drawer';
      }
      if (state.drawer.open && state.drawer.manual && inRect(px, py, drawerOpenRect())) {
        takeManualFromDrawer();
        return 'drawer';
      }
      const hit = itemAt(px, py);
      if (hit) {
        hit.dragging = true;
        state.dragKind = 'item';
        state.dragRef = hit;
        state.dragButton = 0;
        state.grabDX = hit.x - px;
        state.grabDY = hit.y - py;
        state.itemMoved = 0;
        Sfx.pick();
        return 'item';
      }
    }

    // картриджи
    for (let i = state.carts.length - 1; i >= 0; i--) {
      const cart = state.carts[i];
      if (cart.desk !== state.desk) continue;
      const halfW = cart.w / 2 + 6, halfH = cart.h / 2 + 6;
      if (Math.abs(px - cart.x) < halfW && Math.abs(py - cart.y) < halfH) {
        cart.dragging = true;
        cart.slot = null;
        state.dragKind = 'cart';
        state.dragRef = cart;
        state.grabDX = cart.x - px;
        state.grabDY = cart.y - py;
        cart.vy = 0; cart.vx = 0; cart.va = 0;
        // поднимаем над столом
        Sfx.pick();
        return 'cart';
      }
    }

    // джойконы: сначала кнопки
    for (const j of state.joycons) {
      if (!state.con.owned) break;
      if (state.desk === 0 && (j.attached === 'gripL' || j.attached === 'gripR')) continue;
      const b = hitButton(j, px, py);
      if (b) {
        if (b.release) {
          if (j.attached) { detachJoycon(j); emit('toast', { text: 'Магнит отпустил — Joy-Con 2 снят', kind: j.side === 'L' ? 'cyan' : 'red' }); }
          else emit('toast', { text: 'Joy-Con 2 и так не на магнитах' });
          return 'button';
        }
        if (b.kind === 'stick') {
          j.press[b.id] = clock;
          state.dragKind = 'stick';
          state.dragRef = { j, b };
          setStick(j, b, px, py);
          controllerHandler({ side: j.side, button: 'stick', attached: !!j.attached });
          return 'stick';
        }
        j.press[b.id] = clock;
        Sfx.btn();
        controllerHandler({ side: j.side, button: b.id, attached: !!j.attached });
        return 'button';
      }
      // корпус
      const hw = j.w / 2 + 4, hh = j.h / 2 + 4;
      const p = pointToJc(j, px, py);
      if (Math.abs(p.x) < hw && Math.abs(p.y) < hh) {
        if (j.attached) detachJoycon(j);
        j.dragging = true;
        state.dragKind = 'joycon';
        state.dragRef = j;
        state.grabDX = j.x - px;
        state.grabDY = j.y - py;
        j.vx = 0; j.vy = 0; j.va = 0;
        Sfx.pick();
        return 'joycon';
      }
    }

    // кабель
    if (state.desk === 1) {
      for (const [cid, obj] of [['hdmi', state.cable], ['power', state.powerCable]]) {
        for (const key of ['a', 'b']) {
          const e = obj[key];
          if (U.dist(px, py, e.x, e.y) < 28) {
            e.port = null;
            state.dragKind = 'cable';
            state.dragRef = { cid, key };
            Sfx.pick();
            return 'cable';
          }
        }
      }
    }

    // хитбоксы консоли
    const c = state.con;
    if (c.owned) {
      if (inRect(px, py, powerRect(c))) {
        emit('power', {});
        return 'power';
      }
      if (inRect(px, py, volumeRect(c))) {
        Sfx.btn();
        emit('toast', { text: 'Громкость — нажмите − или + (кнопки сверху корпуса)' });
        return 'volume';
      }
      if (inRect(px, py, cartSlotRect(c))) {
        if (c.cart) ejectCart();
        else emit('toast', { text: 'Слот для картриджа пуст. Загрузите игру через Game Loader' });
        Sfx.btn();
        return 'cartslot';
      }

      // экран — зум
      if (inRect(px, py, screenRect(c)) && state.powered && !c.docked) {
        emit('zoomScreen', {});
        return 'screen';
      }

      if (inRect(px, py, consoleRect(c))) {
        if (c.docked) undockConsole();
        c.dragging = true;
        state.dragKind = 'console';
        state.dragRef = c;
        state.grabDX = c.x - px;
        state.grabDY = c.y - py;
        Sfx.pick();
        return 'console';
      }
    }

    return null;
  }

  /* ПКМ: роутер на стену */
  function pointerDownRight(px, py) {
    state.mouse = { x: px, y: py };
    state.lastMouse = { x: px, y: py, t: performance.now() };
    if (state.desk !== 0) return null;
    const it = itemAt(px, py);
    if (it && it.kind === 'router') {
      it.dragging = true;
      state.dragKind = 'item';
      state.dragRef = it;
      state.dragButton = 2;
      state.grabDX = it.x - px;
      state.grabDY = it.y - py;
      state.itemMoved = 0;
      Sfx.pick();
      return 'router';
    }
    if (state.wifi.mounted && state.wifi.room === state.desk && U.dist(px, py, state.wifi.x, state.wifi.y) < 74) {
      emit('toast', { text: 'Роутер уже закреплён на стене' });
    }
    return null;
  }

  function pointerMove(px, py) {
    const now = performance.now();
    const dx = px - state.lastMouse.x, dy = py - state.lastMouse.y;
    const dt = Math.max(0.008, (now - state.lastMouse.t) / 1000);
    state.mouse = { x: px, y: py };

    if (state.dragKind === 'stick') {
      const { j, b } = state.dragRef;
      setStick(j, b, px, py);
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }
    if (state.dragKind === 'joycon') {
      const j = state.dragRef;
      j.x = px + state.grabDX;
      j.y = py + state.grabDY;
      j.vx = U.clamp((dx / dt) * 0.6, -2600, 2600);
      j.vy = U.clamp((dy / dt) * 0.6, -2600, 2600);
      j.angle = U.damp(j.angle, 0, 0.25, 0.016);
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }
    if (state.dragKind === 'cart') {
      const cart = state.dragRef;
      cart.x = px + state.grabDX;
      cart.y = py + state.grabDY;
      cart.vx = U.clamp((dx / dt) * 0.6, -2600, 2600);
      cart.vy = U.clamp((dy / dt) * 0.6, -2600, 2600);
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }
    if (state.dragKind === 'item') {
      const it = state.dragRef;
      if (it) {
        it.x = px + state.grabDX;
        it.y = py + state.grabDY;
        state.itemMoved = (state.itemMoved || 0) + Math.hypot(dx, dy);
      }
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }
    if (state.dragKind === 'console') {
      const c = state.con;
      c.x = U.clamp(px + state.grabDX, 240, W - 240);
      c.y = U.clamp(py + state.grabDY, 200, SURFACE - 60);
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }
    if (state.dragKind === 'cable') {
      const { cid, key } = state.dragRef;
      const e = (cid === 'hdmi' ? state.cable : state.powerCable)[key];
      e.x = px; e.y = py;
      state.lastMouse = { x: px, y: py, t: now };
      return;
    }

    // hover
    computeHover(px, py);
    state.lastMouse = { x: px, y: py, t: now };
  }

  function computeHover(px, py) {
    const c = state.con;
    let hover = null;
    if (state.desk === 0) {
      if (inRect(px, py, drawerHandleRect())) hover = 'drawer';
      else if (itemAt(px, py)) hover = 'item';
    }
    if (!hover && c.owned) {
      if (inRect(px, py, powerRect(c))) hover = 'power';
      else if (inRect(px, py, volumeRect(c))) hover = 'volume';
      else if (inRect(px, py, cartSlotRect(c))) hover = 'cartslot';
    }
    for (const j of state.joycons) {
      if (hover || !c.owned) break;
      const b = hitButton(j, px, py);
      if (b) hover = 'btn:' + j.side + ':' + b.id;
    }
    if (state.desk === 1) {
      for (const key of ['a', 'b']) {
        const e = state.cable[key];
        if (U.dist(px, py, e.x, e.y) < 22) hover = 'cable';
      }
      for (const key of ['a', 'b']) {
        const e = state.powerCable[key];
        if (U.dist(px, py, e.x, e.y) < 24) hover = 'powercable';
      }
    }
    state.hover = hover;
  }

  function pointerUp(px, py) {
    const kind = state.dragKind;
    state.dragKind = null;

    if (kind === 'stick') {
      releaseStick(state.dragRef.j);
      state.dragRef = null;
      return;
    }

    if (kind === 'item') {
      const it = state.dragRef;
      if (!it) return;
      it.dragging = false;
      const moved = state.itemMoved || 0;
      const right = state.dragButton === 2;
      let keep = true;
      const dropRect = { x: DRAWER.x, y: DRAWER.y - 30, w: DRAWER.w, h: DRAWER.h + 30 };
      if (it.kind === 'manual' && state.drawer.open && inRect(px, py, dropRect)) {
        keep = !storeManualInDrawer();
      } else if (it.kind === 'box' && inTrash(px, py)) {
        keep = !trashItem(it);
      } else if (it.kind === 'router' && right && py < SURFACE - 150) {
        it.dragging = false;
        state.wifi.mounted = true;
        state.wifi.online = false;
        state.wifi.x = U.clamp(px, 90, W - 90);
        state.wifi.y = U.clamp(py, 130, SURFACE - 170);
        state.wifi.room = state.desk;
        state.items = state.items.filter((k) => k !== it);
        keep = false;
        Sfx.attach('L');
        emit('toast', { text: 'Роутер на стене. Wi-Fi: ' + state.wifi.ssid + ', пароль: ' + state.wifi.pass, kind: 'cyan' });
        lifeSave();
      } else if (moved < 9) {
        if (it.kind === 'box') openBox(it);
        else if (it.kind === 'manual') emit('readManual', {});
        else if (it.kind === 'router') emit('toast', { text: 'Зажмите роутер ПКМ и перетащите на стену' });
      }
      if (keep && state.items.indexOf(it) >= 0) {
        it.x = U.clamp(it.x, 80, W - 80);
        it.y = Math.min(it.y, SURFACE - it.h / 2 - 6);
      }
      lifeSave();
      state.dragRef = null;
      state.itemMoved = 0;
      state.dragButton = 0;
      return;
    }

    if (kind === 'joycon') {
      const j = state.dragRef;
      j.dragging = false;
      const target = snapTargetOf(j);
      if (target) {
        attachJoycon(j, target.t);
      } else {
        j.vy = Math.max(j.vy, 0);
        if (Math.abs(j.vx) > 120) j.va += j.vx * 0.0016;
        Sfx.drop();
      }
      state.dragRef = null;
      return;
    }

    if (kind === 'cart') {
      const cart = state.dragRef;
      cart.dragging = false;
      if (px < 40 || px > W - 40) {
        const step = px < 40 ? DESKS.length - 1 : 1;
        const next = (state.desk + step) % DESKS.length;
        cart.desk = next;
        cart.slot = null;
        cart.x = U.clamp(DESKS[next].consoleX + 300, 150, W - 150);
        cart.y = SURFACE - 110;
        cart.vx = 0; cart.vy = 0; cart.va = 0;
        cart.angle = 0;
        Sfx.cart();
        emit('toast', { text: 'Картридж «' + cart.name + '» перемещён на соседний стол', kind: 'cyan' });
        lifeSave();
        state.dragRef = null;
        return;
      }
      if (state.desk === 2) {
        const slot = nearestStorageSlot(cart);
        if (slot) {
          const busy = state.carts.some((c) => c !== cart && c.slot === slot.i);
          if (busy) {
            emit('toast', { text: 'Этот слот занят', kind: 'red' });
          } else {
            cart.slot = slot.i;
            cart.x = slot.x;
            cart.y = slot.y;
            cart.vx = 0; cart.vy = 0; cart.va = 0;
            cart.angle = 0;
            Sfx.cart();
            emit('stored', { name: cart.name, slot: slot.i });
          }
        }
      } else {
        const slot = cartSlotRect();
        if (U.dist(cart.x, cart.y, slot.x + slot.w / 2, slot.y + slot.h / 2) < 90) {
          insertCart(cart);
        }
      }
      lifeSave();
      state.dragRef = null;
      return;
    }

    if (kind === 'console') {
      const c = state.con;
      c.dragging = false;
      if (state.desk === 1 && nearestDockDrop(px, py) && !c.docked) {
        const ok = dockConsole();
        if (!ok) {
          c.y = SURFACE - c.h / 2;
          c.x = U.clamp(c.x, 240, W - 240);
        }
      } else if (!c.docked) {
        c.y = SURFACE - c.h / 2;
        c.x = U.clamp(c.x, 230, W - 230);
      }
      Sfx.drop();
      state.dragRef = null;
      return;
    }

    if (kind === 'cable') {
      const { cid, key } = state.dragRef;
      const obj = cid === 'hdmi' ? state.cable : state.powerCable;
      const e = obj[key];
      const allowed = cid === 'hdmi' ? ['tv', 'dock'] : ['socket', 'dockp'];
      let best = null, bestD = 76;
      for (const pk of allowed) {
        const p = cid === 'hdmi' ? PORTS[pk] : POWER_PORTS[pk];
        const d = U.dist(e.x, e.y, p.x, p.y);
        if (d < bestD) { best = pk; bestD = d; }
      }
      const other = obj[key === 'a' ? 'b' : 'a'];
      if (best && other.port !== best) {
        e.port = best;
        const p = cid === 'hdmi' ? PORTS[best] : POWER_PORTS[best];
        e.x = p.x; e.y = p.y;
        Sfx.plug();
        if (cid === 'hdmi') {
          emit('plug', { port: best, connected: cableConnected() });
          if (cableConnected()) {
            Sfx.tvOn();
            emit('hdmi', { connected: true });
          }
        } else {
          const on = powerConnected();
          if (on) Sfx.tvOn();
          emit('powerPlug', { port: best, connected: on });
        }
      }
      state.dragRef = null;
      return;
    }
  }

  /* ------------------------------ обновление ------------------------------ */
  function update(dt) {
    clock += dt;

    state.drawer.anim = U.damp(state.drawer.anim, state.drawer.open ? 1 : 0, 0.22, dt);

    const con = state.con;
    const dockPower = con.docked && powerConnected();
    con.charging = dockPower;
    if (dockPower) {
      con.battery = Math.min(100, con.battery + 0.06 * dt);
    } else if (state.powered) {
      const before = con.battery;
      con.battery = Math.max(0, con.battery - 0.012 * dt);
      if (before > 0 && con.battery <= 0) emit('batteryDead', {});
    }

    for (const j of state.joycons) {
      if (j.attached) {
        const p = attachedPos(j.side, j.attached);
        if (p) { j.x = p.x; j.y = p.y; j.angle = 0; }
      } else {
        stepBody(j, dt, true);
      }
    }
    for (const cart of state.carts) if (cart.slot == null) stepBody(cart, dt, false);

    if (state.con.docked) {
      const c = state.con;
      c.x = DOCK.x;
      c.y = (DOCK.y - DOCK.h / 2) + 52 - c.h / 2;
    } else if (!state.con.dragging) {
      state.con.y = SURFACE - CONSOLE_H / 2;
    }

    for (let i = state.fx.length - 1; i >= 0; i--) {
      const f = state.fx[i];
      f.t += dt;
      if (f.t > f.life) state.fx.splice(i, 1);
    }
  }

  /* ------------------------------ отрисовка ------------------------------ */
  function drawRoom(ctx) {
    // стена
    const g = ctx.createLinearGradient(0, 0, 0, SURFACE);
    g.addColorStop(0, '#202d3c');
    g.addColorStop(0.55, '#16202b');
    g.addColorStop(1, '#0d1319');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, SURFACE + 6);

    // панели на стене
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#a9c6dc';
    ctx.lineWidth = 2;
    for (let x = 80; x < W; x += 168) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SURFACE - 24);
      ctx.stroke();
    }
    ctx.restore();

    // мягкий свет сверху
    const rg = ctx.createRadialGradient(state.desk === 0 ? 800 : 760, 150, 40, state.desk === 0 ? 800 : 760, 380, 760);
    rg.addColorStop(0, 'rgba(255,220,160,.20)');
    rg.addColorStop(0.5, 'rgba(255,210,150,.07)');
    rg.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    if (state.desk === 0) drawWindow(ctx, 84, 78, 320, 296);
    else if (state.desk === 1) { drawWallDecor(ctx); drawWallSocket(ctx); }

    // столешница
    const wood = ctx.createLinearGradient(0, SURFACE - 26, 0, SURFACE + 130);
    wood.addColorStop(0, state.desk === 0 ? '#5a4130' : '#4a382c');
    wood.addColorStop(0.12, state.desk === 0 ? '#4a3427' : '#3c2e24');
    wood.addColorStop(1, state.desk === 0 ? '#2b1e16' : '#241b15');
    ctx.fillStyle = wood;
    ctx.fillRect(0, SURFACE - 4, W, H - SURFACE + 4);

    // блик на кромке
    const edge = ctx.createLinearGradient(0, SURFACE - 12, 0, SURFACE + 14);
    edge.addColorStop(0, 'rgba(255,228,190,.42)');
    edge.addColorStop(0.5, 'rgba(255,228,190,.08)');
    edge.addColorStop(1, 'rgba(255,228,190,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, SURFACE - 10, W, 22);

    // текстура досок
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 1.5;
    for (let y = SURFACE + 28; y < H; y += 36) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 40) {
        const yy = y + Math.sin((x + y) * 0.01) * 2.4;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // передняя панель стола с ящиком
    ctx.save();
    const front = ctx.createLinearGradient(0, SURFACE + 120, 0, H);
    front.addColorStop(0, 'rgba(0,0,0,.0)');
    front.addColorStop(0.4, 'rgba(0,0,0,.28)');
    front.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = front;
    ctx.fillRect(0, SURFACE + 120, W, H - SURFACE - 120);
    if (state.desk === 0) {
      U.rr(ctx, 90, SURFACE + 60, 430, 120, 10);
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,225,190,.10)';
      ctx.lineWidth = 2;
      ctx.stroke();
      U.rr(ctx, 270, SURFACE + 112, 70, 10, 5);
      ctx.fillStyle = 'rgba(255,225,190,.22)';
      ctx.fill();
    }
    ctx.restore();

    // виньетка
    const vg = ctx.createRadialGradient(W / 2, H * 0.44, H * 0.34, W / 2, H * 0.5, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawWindow(ctx, x, y, w, h) {
    ctx.save();
    // рама
    U.rr(ctx, x - 12, y - 12, w + 24, h + 24, 8);
    ctx.fillStyle = '#2b3138';
    ctx.fill();
    // ночное небо
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#0b1a2c');
    sky.addColorStop(0.6, '#12263a');
    sky.addColorStop(1, '#1d3448');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // звёзды
    ctx.fillStyle = 'rgba(210,235,255,.7)';
    for (let i = 0; i < 26; i++) {
      const sx = x + ((i * 97) % w);
      const sy = y + ((i * 151) % (h * 0.7));
      ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100;
      ctx.fillRect(sx, sy, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;
    // луна
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.26, 22, 0, U.TAU);
    ctx.fillStyle = 'rgba(226,240,255,.9)';
    ctx.shadowColor = 'rgba(180,215,255,.8)';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;
    // город внизу
    ctx.fillStyle = 'rgba(6,12,20,.85)';
    for (let i = 0; i < 12; i++) {
      const bw = 18 + ((i * 13) % 26);
      const bh = 30 + ((i * 47) % 70);
      ctx.fillRect(x + i * 27, y + h - bh, bw, bh);
    }
    // переплёт
    ctx.strokeStyle = '#39424c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    U.rr(ctx, x - 3, y - 3, w + 6, h + 6, 4);
    ctx.strokeStyle = 'rgba(180,205,230,.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // подоконник
    U.rr(ctx, x - 26, y + h + 10, w + 52, 14, 5);
    ctx.fillStyle = '#3a4149';
    ctx.fill();
    ctx.restore();
  }

  function drawWallDecor(ctx) {
    // полка с коробками игр
    ctx.save();
    const shelfY = 240;
    U.rr(ctx, 1160, shelfY, 400, 14, 6);
    ctx.fillStyle = '#3d2f26';
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // кронштейны полки
    for (const bx of [1194, 1526]) {
      U.rr(ctx, bx - 5, shelfY + 12, 10, 34, 4);
      ctx.fillStyle = '#2c221b';
      ctx.fill();
    }
    const cases = ['#19c3e8', '#ff4a57', '#f2c14e', '#8ce6a5', '#9a7bff', '#ff9f4a'];
    for (let i = 0; i < 6; i++) {
      const cw = 38, ch = 64 + (i % 2) * 4;
      const cx = 1188 + i * 52;
      const top = shelfY - ch;
      U.rr(ctx, cx, top, cw, ch, 3);
      ctx.fillStyle = '#1b222b';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // цветная полоса-корешок
      ctx.fillStyle = cases[i];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(cx, top, 5, ch);
      ctx.globalAlpha = 1;
      // верхняя плашка
      ctx.fillStyle = cases[i];
      ctx.globalAlpha = 0.8;
      ctx.fillRect(cx + 8, top + 8, cw - 16, 4);
      ctx.globalAlpha = 1;
      U.drawMark(ctx, cx + cw / 2, top + 34, 0.17, { accent: cases[i], accent2: cases[i] });
    }
    ctx.restore();
    // растение на полке
    drawPlant(ctx, 1512, shelfY, 0.52);
  }

  function drawWallSocket(ctx) {
    const s = POWER_SOCKET;
    ctx.save();
    U.shadows(ctx, true, 'rgba(0,0,0,.45)', 14, 6);
    U.rr(ctx, s.x - 27, s.y - 34, 54, 68, 9);
    const g = ctx.createLinearGradient(s.x - 27, s.y - 34, s.x + 27, s.y + 34);
    g.addColorStop(0, '#2a3138');
    g.addColorStop(1, '#171c21');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // гнездо
    U.circle(ctx, s.x, s.y + 2, 18);
    ctx.fillStyle = '#0b0e11';
    ctx.fill();
    ctx.fillStyle = '#05070a';
    ctx.beginPath(); ctx.arc(s.x - 6, s.y + 7, 3.4, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + 6, s.y + 7, 3.4, 0, U.TAU); ctx.fill();
    // индикатор
    const on = powerConnected();
    U.circle(ctx, s.x, s.y - 23, 3.2);
    ctx.fillStyle = on ? '#4fe08a' : 'rgba(255,255,255,.18)';
    if (on) {
      ctx.shadowColor = '#4fe08a';
      ctx.shadowBlur = 12;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,235,.4)';
    ctx.font = '600 7px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('220V', s.x, s.y + 30);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawProps(ctx) {
    if (state.desk === 0) {
      // кружка
      const mx = 232, my = SURFACE - 4;
      shadowOnDesk(ctx, mx, my + 6, 66, 0.5);
      ctx.save();
      ctx.lineCap = 'round';
      // ручка за корпусом
      ctx.beginPath();
      ctx.arc(mx + 23, my - 30, 13, -1.15, 1.15);
      ctx.strokeStyle = '#d3dde6';
      ctx.lineWidth = 7;
      ctx.stroke();
      // корпус
      U.rr(ctx, mx - 26, my - 58, 52, 58, 9);
      const mg = ctx.createLinearGradient(mx - 26, my - 58, mx + 26, my);
      mg.addColorStop(0, '#f0f4f7');
      mg.addColorStop(0.55, '#dfe7ee');
      mg.addColorStop(1, '#c3ced8');
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,158,.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // блик
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      U.rr(ctx, mx - 18, my - 50, 5, 38, 2.5);
      ctx.fill();
      // ободок и кофе
      ctx.beginPath();
      ctx.ellipse(mx, my - 58, 26, 6, 0, 0, U.TAU);
      ctx.fillStyle = '#eef4f8';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mx, my - 58.5, 22, 4.6, 0, 0, U.TAU);
      ctx.fillStyle = 'rgba(88,55,32,.92)';
      ctx.fill();
      // пар
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 2.4;
      for (let k = 0; k < 2; k++) {
        const sx = mx - 10 + k * 20;
        const wob = Math.sin(clock * 1.6 + k * 1.7) * 4;
        ctx.beginPath();
        ctx.moveTo(sx, my - 68);
        ctx.bezierCurveTo(sx - 6 + wob, my - 80, sx + 6 - wob, my - 90, sx + wob, my - 102);
        ctx.stroke();
      }
      ctx.restore();

      // блокнот с ручкой
      ctx.save();
      ctx.translate(1350, SURFACE - 6);
      shadowOnDesk(ctx, 0, 6, 110, 0.45);
      U.rr(ctx, -70, -26, 150, 34, 5);
      ctx.fillStyle = '#e8e2d6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-56, -18 + i * 7);
        ctx.lineTo(60, -18 + i * 7);
        ctx.stroke();
      }
      U.rr(ctx, 20, -34, 96, 8, 4);
      ctx.fillStyle = '#2b5f74';
      ctx.fill();
      ctx.restore();

      // растение
      drawPlant(ctx, 1500, SURFACE - 4, 1);
    } else {
      // растение слева от телевизора
      drawPlant(ctx, 124, SURFACE - 4, 0.7);
      // колонка/саундбар
      ctx.save();
      U.rr(ctx, 600, SURFACE - 26, 190, 26, 8);
      ctx.fillStyle = '#1b2026';
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      for (let i = 0; i < 7; i++) ctx.fillRect(618 + i * 24, SURFACE - 18, 14, 10);
      ctx.restore();
    }
  }

  function drawPlant(ctx, x, y, s) {
    shadowOnDesk(ctx, x, y + 4, 70 * s, 0.45);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // горшок
    ctx.beginPath();
    ctx.moveTo(-24, -44);
    ctx.lineTo(24, -44);
    ctx.lineTo(18, 0);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    const pg = ctx.createLinearGradient(-24, -44, 24, 0);
    pg.addColorStop(0, '#c9784f');
    pg.addColorStop(0.5, '#b4674a');
    pg.addColorStop(1, '#8d4d31');
    ctx.fillStyle = pg;
    ctx.fill();
    // ободок
    U.rr(ctx, -27, -50, 54, 10, 4);
    ctx.fillStyle = '#d98d63';
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(-27, -43, 54, 2);
    // земля
    ctx.beginPath();
    ctx.ellipse(0, -48, 22, 4, 0, 0, U.TAU);
    ctx.fillStyle = '#2b1d15';
    ctx.fill();
    // листья: симметричный веер
    for (let i = -4; i <= 4; i++) {
      const a = -Math.PI / 2 + i * 0.36;
      const len = 62 + (4 - Math.abs(i)) * 7;
      ctx.save();
      ctx.translate(0, -48);
      ctx.rotate(a);
      const lg = ctx.createLinearGradient(0, 0, 0, -len);
      lg.addColorStop(0, '#1c5233');
      lg.addColorStop(1, '#3f9463');
      ctx.beginPath();
      ctx.ellipse(0, -len / 2 - 4, 10, len / 2, 0, 0, U.TAU);
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -len + 6);
      ctx.strokeStyle = 'rgba(12,42,26,.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }


  function shadowOnDesk(ctx, x, y, w, alpha = 0.42) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, w);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.22);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, U.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawConsole(ctx) {
    const c = state.con;
    const r = consoleRect(c);
    shadowOnDesk(ctx, c.x, SURFACE + 4, 250, 0.5);

    const hoverPower = state.hover === 'power';
    const hoverSlot = state.hover === 'cartslot';

    // подсветка от экрана
    if (state.powered && !c.docked) {
      const g = ctx.createRadialGradient(c.x, c.y, 40, c.x, c.y, 420);
      g.addColorStop(0, 'rgba(90,190,255,.16)');
      g.addColorStop(1, 'rgba(90,190,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 220, r.y - 160, r.w + 440, r.h + 320);
    }

    // корпус
    ctx.save();
    U.shadows(ctx, true, 'rgba(0,0,0,.6)', 40, 18);
    U.rr(ctx, r.x, r.y, r.w, r.h, 18);
    const bg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    bg.addColorStop(0, '#33383f');
    bg.addColorStop(0.08, '#22262c');
    bg.addColorStop(0.92, '#191d22');
    bg.addColorStop(1, '#101317');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();

    // кромка
    U.rr(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 18);
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // верхняя панель: кнопки
    const top = r.y;
    ctx.save();
    // выемка
    U.rr(ctx, r.x + 18, top - 3, r.w - 36, 6, 3);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fill();

    const pr = powerRect(c);
    // «едва видимая» полоска кнопки питания
    U.rr(ctx, pr.x + 10, top - 3.5, pr.w - 20, 3.2, 1.6);
    ctx.fillStyle = hoverPower ? '#8fe6ff' : 'rgba(180,200,215,.55)';
    ctx.fill();

    const vr = volumeRect(c);
    U.rr(ctx, vr.x + 8, top - 3.2, 16, 3, 1.5);
    U.rr(ctx, vr.x + 30, top - 3.2, 16, 3, 1.5);
    ctx.fillStyle = 'rgba(180,200,215,.4)';
    ctx.fill();

    const sr = cartSlotRect(c);
    U.rr(ctx, sr.x + 6, top - 3.4, sr.w - 12, 3.2, 1.6);
    ctx.fillStyle = c.cart ? '#f2c14e' : 'rgba(180,200,215,.5)';
    ctx.fill();
    ctx.restore();

    // экран
    const sc = screenRect(c);
    U.rr(ctx, sc.x - 3, sc.y - 3, sc.w + 6, sc.h + 6, 8);
    ctx.fillStyle = '#07090c';
    ctx.fill();
    if (!state.powered || c.docked) {
      const sg = ctx.createLinearGradient(sc.x, sc.y, sc.x + sc.w, sc.y + sc.h);
      sg.addColorStop(0, '#0a0e12');
      sg.addColorStop(1, '#05070a');
      U.rr(ctx, sc.x, sc.y, sc.w, sc.h, 5);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.font = '600 13px "Segoe UI",system-ui,sans-serif';
      ctx.textAlign = 'center';
      if (c.docked) {
        ctx.fillText('ВЫВОД НА ТЕЛЕВИЗОР', c.x, c.y + 4);
      } else {
        ctx.fillText('ПИТАНИЕ ВЫКЛЮЧЕНО', c.x, c.y + 4);
      }
      ctx.textAlign = 'left';
    }

    // джойкон-рельсы
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const side of [-1, 1]) {
      const x = c.x + side * (c.w / 2) - side * 2;
      ctx.fillStyle = side < 0 ? COL.l : COL.r;
      ctx.fillRect(x - 1, r.y + 16, 2.5, r.h - 32);
    }
    ctx.restore();

    // подпись
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.font = '600 10px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SWITCH 2', r.x + 26, r.y + r.h - 7);
    ctx.textAlign = 'right';
    ctx.fillText('7.9" OLED', r.x + r.w - 26, r.y + r.h - 7);
    ctx.textAlign = 'left';

    // хитбокс кнопки питания при наведении
    if (hoverPower || hoverSlot || state.hover === 'volume') {
      const hr = hoverPower ? pr : state.hover === 'volume' ? vr : sr;
      const label = hoverPower ? 'Питание' : state.hover === 'volume' ? 'Громкость' : (c.cart ? 'Извлечь картридж' : 'Слот картриджа');
      ctx.save();
      ctx.strokeStyle = hoverPower ? 'rgba(143,230,255,.95)' : 'rgba(242,193,78,.95)';
      ctx.lineWidth = 2;
      ctx.shadowColor = hoverPower ? 'rgba(143,230,255,.85)' : 'rgba(242,193,78,.85)';
      ctx.shadowBlur = 22;
      U.rr(ctx, hr.x, hr.y, hr.w, hr.h, 6);
      ctx.stroke();
      ctx.fillStyle = hoverPower ? 'rgba(143,230,255,.16)' : 'rgba(242,193,78,.16)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = hoverPower ? '#bff3ff' : '#ffe9a8';
      ctx.font = '600 13px "Segoe UI",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, hr.x + hr.w / 2, hr.y - 12);
      ctx.restore();
    }

    // подсказка «включить» на старте
    if (!state.powered && state.hintPowerUntil > clock) {
      const pr2 = powerRect(c);
      const px = pr2.x + pr2.w / 2;
      const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
      const txt = 'нажмите, чтобы включить';
      ctx.save();
      ctx.font = '600 15px "Segoe UI",system-ui,sans-serif';
      const tw = ctx.measureText(txt).width + 28;
      const bx = px - tw / 2;
      const by = pr2.y - 62;
      ctx.globalAlpha = 0.85 + pulse * 0.15;
      U.rr(ctx, bx, by, tw, 34, 10);
      ctx.fillStyle = 'rgba(10,16,22,.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(143,230,255,.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 7, by + 34);
      ctx.lineTo(px, by + 46);
      ctx.lineTo(px + 7, by + 34);
      ctx.closePath();
      ctx.fillStyle = 'rgba(10,16,22,.88)';
      ctx.fill();
      ctx.fillStyle = '#dff7ff';
      ctx.textAlign = 'center';
      ctx.fillText(txt, px, by + 22);
      ctx.beginPath();
      ctx.moveTo(px, by + 48);
      ctx.lineTo(px, pr2.y - 8);
      ctx.strokeStyle = 'rgba(143,230,255,.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px, pr2.y - 4, 4, 0, U.TAU);
      ctx.fillStyle = 'rgba(143,230,255,.95)';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawJoycon(ctx, j) {
    const accent = j.side === 'L' ? COL.l : COL.r;
    shadowOnDesk(ctx, j.x, Math.min(SURFACE + 4, j.y + j.h / 2 - 4), 74, 0.42);

    ctx.save();
    ctx.translate(j.x, j.y);
    ctx.rotate(j.angle);

    // корпус
    U.shadows(ctx, true, 'rgba(0,0,0,.55)', 26, 10);
    U.rr(ctx, -j.w / 2, -j.h / 2, j.w, j.h, 34);
    const bg = ctx.createLinearGradient(-j.w / 2, -j.h / 2, j.w / 2, j.h / 2);
    bg.addColorStop(0, '#2c3138');
    bg.addColorStop(0.5, '#20242a');
    bg.addColorStop(1, '#171a1f');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // цветная полоса у рельса
    ctx.save();
    U.rr(ctx, -j.w / 2, -j.h / 2, j.w, j.h, 34);
    ctx.clip();
    const inner = j.side === 'L' ? 1 : -1;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(inner * (j.w / 2 - 5), -j.h / 2, 5, j.h);
    ctx.globalAlpha = 0.28;
    ctx.fillRect(inner * (j.w / 2 - 12), -j.h / 2, 7, j.h);
    ctx.globalAlpha = 1;
    // блик
    const gl = ctx.createLinearGradient(-j.w / 2, -j.h / 2, j.w / 2, j.h / 2);
    gl.addColorStop(0, 'rgba(255,255,255,.10)');
    gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-j.w / 2, -j.h / 2, j.w, j.h);
    ctx.restore();

    U.rr(ctx, -j.w / 2 + 0.5, -j.h / 2 + 0.5, j.w - 1, j.h - 1, 34);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // кнопки
    for (const b of LAYOUT[j.side]) {
      const pressed = j.press[b.id] != null && clock - j.press[b.id] < 0.14;
      const deep = pressed ? 0.7 : 1;
      if (b.kind === 'stick') {
        const knob = j.stickKnob || { x: 0, y: 0 };
        const kx = b.x + knob.x, ky = b.y + knob.y;
        // основание
        U.circle(ctx, b.x, b.y, b.r);
        ctx.fillStyle = '#0d0f12';
        ctx.fill();
        const sg = ctx.createRadialGradient(kx - 6, ky - 8, 4, kx, ky, b.r);
        sg.addColorStop(0, pressed ? '#4a5560' : '#3a424c');
        sg.addColorStop(1, '#15181d');
        U.circle(ctx, kx, ky, b.r - 5);
        ctx.fillStyle = sg;
        ctx.fill();
        U.circle(ctx, kx, ky, b.r - 5);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        U.circle(ctx, kx - 5, ky - 7, b.r * 0.34);
        ctx.fill();
      } else if (b.kind === 'rbtn') {
        U.circle(ctx, b.x, b.y, b.r * deep);
        const cg = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 1, b.x, b.y, b.r);
        cg.addColorStop(0, b.accent ? '#ff6b76' : '#333a44');
        cg.addColorStop(1, b.accent ? '#c1283a' : '#191d23');
        ctx.fillStyle = cg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.13)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (b.release) {
          ctx.strokeStyle = 'rgba(255,255,255,.55)';
        }
        if (b.label && b.r > 8) {
          ctx.fillStyle = b.label === '⌂' ? '#e9f2f8' : 'rgba(232,242,250,.82)';
          ctx.font = `700 ${Math.round(b.r * 0.92)}px "Segoe UI",system-ui,sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.label, b.x, b.y + 0.5);
          ctx.textBaseline = 'alphabetic';
        }
      } else {
        U.rr(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h * deep, Math.min(b.w, b.h) / 2);
        ctx.fillStyle = pressed ? '#5c6773' : b.small ? '#2a3038' : '#242a31';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (b.label && b.w > 24) {
          ctx.fillStyle = 'rgba(232,242,250,.72)';
          ctx.font = '700 9px "Segoe UI",system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.label, b.x, b.y + 0.5);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
    ctx.restore();
  }

  function drawGrip(ctx) {
    const x = GRIP.x, y = GRIP.y;
    shadowOnDesk(ctx, x, SURFACE + 4, 170, 0.45);
    ctx.save();
    // центральная часть
    U.shadows(ctx, true, 'rgba(0,0,0,.55)', 26, 10);
    U.rr(ctx, x - GRIP_W / 2, y - JC_H / 2, GRIP_W, JC_H, 26);
    const g = ctx.createLinearGradient(x, y - JC_H / 2, x, y + JC_H / 2);
    g.addColorStop(0, '#2a2f36');
    g.addColorStop(0.5, '#1d2126');
    g.addColorStop(1, '#14171b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    U.rr(ctx, x - GRIP_W / 2 + 0.5, y - JC_H / 2 + 0.5, GRIP_W - 1, JC_H - 1, 26);
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.stroke();

    // рукоятки
    for (const s of [-1, 1]) {
      U.rr(ctx, x + s * (GRIP_W / 2) - (s > 0 ? 0 : 26), y + 10, 26, 96, 13);
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      ctx.fill();
    }
    // пазы
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? U.hexToRgba(COL.l, 0.5) : U.hexToRgba(COL.r, 0.5);
      ctx.fillRect(x + s * (GRIP_W / 2) - 2, y - JC_H / 2 + 22, 4, JC_H - 44);
    }
    // логотип
    ctx.globalAlpha = 0.18;
    U.drawMark(ctx, x, y - 6, 0.34, { accent: '#9fb4c6', accent2: '#9fb4c6', light: '#ffffff' });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawDock(ctx, front) {
    const d = dockRect();
    shadowOnDesk(ctx, d.x + d.w / 2, SURFACE + 4, 110, 0.45);
    ctx.save();
    if (!front) {
      U.shadows(ctx, true, 'rgba(0,0,0,.55)', 30, 12);
      U.rr(ctx, d.x, d.y, d.w, d.h, 12);
      const g = ctx.createLinearGradient(d.x, d.y, d.x + d.w, d.y + d.h);
      g.addColorStop(0, '#3a4149');
      g.addColorStop(0.6, '#282e35');
      g.addColorStop(1, '#1c2127');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      // верхний паз
      U.rr(ctx, d.x + 8, d.y - 2, d.w - 16, 12, 6);
      ctx.fillStyle = '#05070a';
      ctx.fill();
      ctx.fillStyle = state.con.docked ? 'rgba(25,195,232,.7)' : 'rgba(255,255,255,.18)';
      ctx.fillRect(d.x + 16, d.y + 2, d.w - 32, 2);
      // логотип
      ctx.globalAlpha = 0.3;
      U.drawMark(ctx, d.x + d.w / 2, d.y + d.h - 40, 0.42, {});
      ctx.globalAlpha = 1;
      // порт HDMI
      const p = PORTS.dock;
      U.rr(ctx, p.x - 12, p.y - 9, 24, 18, 4);
      ctx.fillStyle = '#0a0d10';
      ctx.fill();
      ctx.strokeStyle = state.cable.a.port === 'dock' || state.cable.b.port === 'dock' ? 'rgba(25,195,232,.95)' : 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,220,235,.45)';
      ctx.font = '600 8px "Segoe UI",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HDMI', p.x, p.y + 22);
      // порт питания
      const pp = POWER_PORTS.dockp;
      U.rr(ctx, pp.x - 9, pp.y - 6, 18, 12, 3);
      ctx.fillStyle = '#0a0d10';
      ctx.fill();
      ctx.strokeStyle = powerConnected() ? 'rgba(79,224,138,.95)' : 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,220,235,.45)';
      ctx.fillText('POWER', pp.x, pp.y - 12);
      ctx.textAlign = 'left';
    } else {
      // передняя накладка дока
      U.rr(ctx, d.x + 4, d.y + d.h - 46, d.w - 8, 44, 10);
      const g = ctx.createLinearGradient(d.x, d.y + d.h - 46, d.x, d.y + d.h);
      g.addColorStop(0, '#242930');
      g.addColorStop(1, '#101317');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.stroke();
      // светодиод
      U.circle(ctx, d.x + d.w / 2, d.y + d.h - 24, 3.4);
      ctx.fillStyle = state.con.docked && state.powered && powerConnected() ? '#4fe08a' : 'rgba(255,255,255,.14)';
      ctx.fill();
      if (state.con.docked && state.powered && powerConnected()) {
        ctx.shadowColor = '#4fe08a';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  function drawTV(ctx) {
    const t = TV;
    shadowOnDesk(ctx, t.left + t.w / 2, SURFACE + 2, 190, 0.5);

    // подставка
    ctx.save();
    U.rr(ctx, t.left + t.w / 2 - 34, t.top + t.h - 4, 68, SURFACE - (t.top + t.h) - 40, 10);
    ctx.fillStyle = '#3a4149';
    ctx.fill();
    U.rr(ctx, t.left + t.w / 2 - 95, SURFACE - 42, 190, 20, 8);
    ctx.fillStyle = '#444c55';
    ctx.fill();
    ctx.restore();

    // корпус
    ctx.save();
    U.shadows(ctx, true, 'rgba(0,0,0,.6)', 44, 16);
    U.rr(ctx, t.left, t.top, t.w, t.h, 12);
    const g = ctx.createLinearGradient(t.left, t.top, t.left + t.w, t.top + t.h);
    g.addColorStop(0, '#39414a');
    g.addColorStop(0.55, '#262d35');
    g.addColorStop(1, '#171c22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.restore();
    // светлая кромка
    U.rr(ctx, t.left + 0.5, t.top + 0.5, t.w - 1, t.h - 1, 12);
    ctx.strokeStyle = 'rgba(200,225,245,.22)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // рамка экрана
    const s = t.screen;
    U.rr(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 6);
    ctx.fillStyle = '#05070a';
    ctx.fill();

    const tvOn = state.con.docked && state.powered && cableConnected();
    if (!tvOn) {
      const sg = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
      sg.addColorStop(0, '#0c1116');
      sg.addColorStop(0.5, '#080b0f');
      sg.addColorStop(1, '#04060a');
      U.rr(ctx, s.x, s.y, s.w, s.h, 4);
      ctx.fillStyle = sg;
      ctx.fill();
    }

    // логотип на рамке
    ctx.save();
    ctx.globalAlpha = 0.22;
    U.drawMark(ctx, t.left + 34, t.top + t.h - 15, 0.22, {});
    ctx.restore();

    // порт HDMI на телевизоре
    const p = PORTS.tv;
    U.rr(ctx, p.x - 12, p.y - 9, 24, 18, 4);
    ctx.fillStyle = '#0a0d10';
    ctx.fill();
    ctx.strokeStyle = state.cable.a.port === 'tv' || state.cable.b.port === 'tv' ? 'rgba(25,195,232,.95)' : 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,220,235,.45)';
    ctx.font = '600 8px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HDMI', p.x, p.y + 24);
    ctx.textAlign = 'left';
  }

  function drawCable(ctx) {
    const a = state.cable.a, b = state.cable.b;
    const sag = 46 + Math.abs(a.x - b.x) * 0.06;
    const cx = (a.x + b.x) / 2, cy = Math.max(a.y, b.y) + sag;
    ctx.save();
    ctx.lineCap = 'round';
    // тень
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 6);
    ctx.quadraticCurveTo(cx, cy + 8, b.x, b.y + 6);
    ctx.stroke();
    // сам кабель
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, '#2b3138');
    grad.addColorStop(0.5, '#1b2026');
    grad.addColorStop(1, '#2b3138');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 1.5);
    ctx.quadraticCurveTo(cx, cy - 1.5, b.x, b.y - 1.5);
    ctx.stroke();

    for (const [key, e] of [['a', a], ['b', b]]) {
      const plugged = !!e.port;
      // разъём
      U.rr(ctx, e.x - 9, e.y - 6, 18, 12, 3);
      ctx.fillStyle = plugged ? '#3a4550' : '#c9d6e0';
      ctx.shadowColor = plugged ? 'rgba(25,195,232,.8)' : 'rgba(0,0,0,.6)';
      ctx.shadowBlur = plugged ? 16 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = plugged ? '#8fe6ff' : '#7b8b99';
      ctx.fillRect(e.x - 3, e.y - 4, 6, 5);
      if (!plugged) {
        // подсказка-пульс
        const t = (clock * 1.6 + (key === 'a' ? 0 : 0.5)) % 1;
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.strokeStyle = '#c9d6e0';
        ctx.lineWidth = 1.6;
        U.circle(ctx, e.x, e.y, 12 + t * 12);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  function drawPowerCable(ctx) {
    const a = state.powerCable.a, b = state.powerCable.b;
    const sag = 54 + Math.abs(a.x - b.x) * 0.07;
    const cx = (a.x + b.x) / 2, cy = Math.max(a.y, b.y) + sag;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 5);
    ctx.quadraticCurveTo(cx, cy + 7, b.x, b.y + 5);
    ctx.stroke();
    ctx.strokeStyle = '#0d1114';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 1.2);
    ctx.quadraticCurveTo(cx, cy - 1.2, b.x, b.y - 1.2);
    ctx.stroke();

    // блок питания
    ctx.save();
    ctx.translate(a.x, a.y);
    U.shadows(ctx, true, 'rgba(0,0,0,.5)', 14, 6);
    U.rr(ctx, -20, -15, 40, 28, 7);
    const bg = ctx.createLinearGradient(-20, -15, 20, 13);
    bg.addColorStop(0, '#2c3238');
    bg.addColorStop(1, '#12161a');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const on = powerConnected();
    U.circle(ctx, 12, -8, 2.6);
    ctx.fillStyle = on ? '#4fe08a' : 'rgba(255,255,255,.22)';
    if (on) { ctx.shadowColor = '#4fe08a'; ctx.shadowBlur = 10; }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,235,.35)';
    ctx.font = '600 6px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PSU', 0, 6);
    ctx.textAlign = 'left';
    ctx.restore();

    // вилка у дока
    U.rr(ctx, b.x - 8, b.y - 6, 16, 12, 3);
    ctx.fillStyle = b.port ? '#3a4550' : '#c9d6e0';
    ctx.shadowColor = b.port ? 'rgba(79,224,138,.8)' : 'rgba(0,0,0,.5)';
    ctx.shadowBlur = b.port ? 14 : 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = b.port ? '#8fe6ff' : '#7b8b99';
    ctx.fillRect(b.x - 3, b.y - 4, 6, 5);
    ctx.restore();
  }

  function drawStorage(ctx) {
    const left = STORAGE.x - 96;
    const right = STORAGE.x + (STORAGE.cols - 1) * STORAGE.dx + 96;
    const top = STORAGE.y - 86;
    const bottom = STORAGE.y + (STORAGE.rows - 1) * STORAGE.dy + 92;

    ctx.save();
    U.rr(ctx, left - 18, top - 22, right - left + 36, bottom - top + 44, 12);
    const bg = ctx.createLinearGradient(0, top, 0, bottom);
    bg.addColorStop(0, 'rgba(12,18,25,.72)');
    bg.addColorStop(1, 'rgba(8,12,17,.88)');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,225,.10)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(160,200,225,.42)';
    ctx.font = '700 13px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ХРАНИЛИЩЕ КАРТРИДЖЕЙ', left + 2, top + 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(160,200,225,.3)';
    ctx.fillText(STORAGE.cols * STORAGE.rows + ' слотов', right + 18, top + 4);

    for (let r = 0; r < STORAGE.rows; r++) {
      const rowY = STORAGE.y + r * STORAGE.dy;
      U.rr(ctx, left, rowY + 72, right - left, 14, 5);
      ctx.fillStyle = '#3b2c21';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,228,190,.14)';
      ctx.fillRect(left + 4, rowY + 72, right - left - 8, 2);

      for (let c = 0; c < STORAGE.cols; c++) {
        const s = SLOTS[r * STORAGE.cols + c];
        const busy = state.carts.some((k) => k.slot === s.i);
        if (busy) continue;
        U.rr(ctx, s.x - 54, s.y - 76, 108, 152, 9);
        ctx.setLineDash([7, 7]);
        ctx.strokeStyle = 'rgba(160,200,225,.16)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  /* --------------------------- предметы: коробки, мануал, роутер --------------------------- */
  function drawTrash(ctx) {
    const t = trashRect();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(t.x + t.w / 2, t.y + t.h - 6, t.w * 0.58, 13, 0, 0, U.TAU);
    ctx.fill();
    const g = ctx.createLinearGradient(t.x, t.y, t.x + t.w, t.y + t.h);
    g.addColorStop(0, '#4b5763');
    g.addColorStop(0.45, '#333d47');
    g.addColorStop(1, '#171d24');
    ctx.beginPath();
    ctx.moveTo(t.x + 4, t.y + 28);
    ctx.lineTo(t.x + t.w - 4, t.y + 28);
    ctx.lineTo(t.x + t.w - 18, t.y + t.h);
    ctx.lineTo(t.x + 18, t.y + t.h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const rx = t.x + 18 + (t.w - 36) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(rx, t.y + 36);
      ctx.lineTo(rx + (t.w / 2 - rx) * 0.12, t.y + t.h - 10);
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    U.rr(ctx, t.x - 8, t.y + 6, t.w + 16, 24, 8);
    ctx.fillStyle = '#3d4854';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    U.rr(ctx, t.x + t.w / 2 - 24, t.y + 13, 48, 8, 4);
    ctx.fillStyle = '#0c1015';
    ctx.fill();
    U.rr(ctx, t.x + 20, t.y + t.h - 22, t.w - 40, 9, 4);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    ctx.fillStyle = 'rgba(214,232,244,.55)';
    ctx.font = '700 9px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('МУСОР', t.x + t.w / 2, t.y + t.h - 38);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawDrawer(ctx) {
    const d = DRAWER;
    const off = state.drawer.anim * DRAWER_OPEN;
    ctx.save();
    if (state.drawer.anim > 0.02) {
      const oy = d.y - 26 + off * 0.15;
      U.rr(ctx, d.x + 12, oy, d.w - 24, 34, 6);
      ctx.fillStyle = 'rgba(6,8,10,.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (state.drawer.manual) {
        U.rr(ctx, d.x + d.w / 2 - 34, oy + 10, 68, 12, 3);
        ctx.fillStyle = '#d9c89b';
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.32)';
        ctx.fillRect(d.x + d.w / 2 - 30, oy + 13.5, 60, 1.5);
      }
      if (state.drawer.open && state.drawer.manual && state.drawer.anim > 0.6) {
        const txt = 'нажмите на мануал, чтобы достать';
        const pulse = 0.6 + 0.4 * Math.sin(clock * 3);
        ctx.font = '600 12px "Segoe UI",system-ui,sans-serif';
        const tw = ctx.measureText(txt).width + 20;
        U.rr(ctx, d.x + d.w / 2 - tw / 2, oy - 36, tw, 26, 8);
        ctx.fillStyle = 'rgba(10,16,22,.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(242,193,78,' + (0.35 + pulse * 0.45).toFixed(2) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#ffe9a8';
        ctx.textAlign = 'center';
        ctx.fillText(txt, d.x + d.w / 2, oy - 18);
        ctx.textAlign = 'left';
      } else if (state.drawer.open && !state.drawer.manual) {
        ctx.fillStyle = 'rgba(180,215,240,.5)';
        ctx.font = '600 10px "Segoe UI",system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('положите мануал сюда', d.x + d.w / 2, oy + 20);
        ctx.textAlign = 'left';
      }
    }
    const fy = d.y + off;
    U.shadows(ctx, true, 'rgba(0,0,0,.45)', 22, 10);
    U.rr(ctx, d.x, fy, d.w, d.h, 10);
    const fg = ctx.createLinearGradient(d.x, fy, d.x, fy + d.h);
    fg.addColorStop(0, '#5a4130');
    fg.addColorStop(0.5, '#4a3427');
    fg.addColorStop(1, '#33241a');
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,225,190,.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const hr = drawerHandleRect();
    U.rr(ctx, hr.x, hr.y, hr.w, hr.h, 6);
    ctx.fillStyle = state.hover === 'drawer' ? 'rgba(255,233,168,.9)' : 'rgba(255,225,190,.24)';
    ctx.fill();
    ctx.restore();
  }

  function drawBox(ctx, it) {
    const { x, y, w, h } = it;
    shadowOnDesk(ctx, x, SURFACE + 4, w * 0.62, 0.42);
    ctx.save();
    ctx.translate(x, y);
    U.shadows(ctx, true, 'rgba(0,0,0,.5)', 26, 12);
    U.rr(ctx, -w / 2, -h / 2, w, h, 8);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#c99c66');
    g.addColorStop(0.55, '#b3854f');
    g.addColorStop(1, '#8c6238');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(238,222,190,.6)';
    ctx.fillRect(-w / 2, -10, w, 20);
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    ctx.fillRect(-w / 2, 9, w, 2);
    ctx.textAlign = 'center';
    if (it.box === 'console') {
      U.rr(ctx, -72, -h / 2 + 30, 144, 74, 7);
      ctx.fillStyle = '#14181d';
      ctx.fill();
      U.rr(ctx, -58, -h / 2 + 38, 116, 50, 4);
      ctx.fillStyle = '#0a0e12';
      ctx.fill();
      U.rr(ctx, -72, -h / 2 + 30, 14, 74, 5);
      ctx.fillStyle = '#22b7d6';
      ctx.fill();
      U.rr(ctx, 58, -h / 2 + 30, 14, 74, 5);
      ctx.fillStyle = '#e63b4d';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.font = '700 9px "Segoe UI",system-ui,sans-serif';
      ctx.fillText('NINTENDO SWITCH 2', 0, h / 2 - 26);
    } else {
      U.rr(ctx, -46, -h / 2 + 40, 92, 40, 7);
      ctx.fillStyle = '#20262c';
      ctx.fill();
      ctx.strokeStyle = '#7d8b98';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, -h / 2 + 40);
      ctx.lineTo(-38, -h / 2 + 16);
      ctx.moveTo(30, -h / 2 + 40);
      ctx.lineTo(38, -h / 2 + 16);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      ctx.font = '700 9px "Segoe UI",system-ui,sans-serif';
      ctx.fillText('WI-FI ROUTER', 0, h / 2 - 26);
    }
    if (it.opened) {
      ctx.fillStyle = 'rgba(150,110,66,.95)';
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(-w / 2 + 40, -h / 2 - 34);
      ctx.lineTo(-w / 2 + 86, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2, -h / 2);
      ctx.lineTo(w / 2 - 40, -h / 2 - 34);
      ctx.lineTo(w / 2 - 86, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(0, -h / 2 + 4, w / 2 - 18, 10, 0, 0, Math.PI);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawManualItem(ctx, it) {
    const { x, y, w, h } = it;
    shadowOnDesk(ctx, x, SURFACE + 4, 54, 0.4);
    ctx.save();
    ctx.translate(x, y);
    U.shadows(ctx, true, 'rgba(0,0,0,.5)', 18, 8);
    U.rr(ctx, -w / 2, -h / 2, w, h, 6);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#2b333d');
    g.addColorStop(1, '#151b22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    U.rr(ctx, -w / 2 + 6, -h / 2 + 8, w - 12, h - 16, 3);
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#c9a86a';
    ctx.font = '700 11px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MANUAL', 0, -h / 2 + 26);
    ctx.globalAlpha = 0.85;
    U.drawMark(ctx, 0, 26, 0.2, { accent: '#c9a86a', accent2: '#c9a86a' });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawRouterItem(ctx, it) {
    const { x, y, w, h } = it;
    shadowOnDesk(ctx, x, SURFACE + 4, w * 0.6, 0.4);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#8f9aa5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-40, -h / 2 + 4);
    ctx.lineTo(-54, -h / 2 - 34);
    ctx.moveTo(40, -h / 2 + 4);
    ctx.lineTo(54, -h / 2 - 34);
    ctx.stroke();
    U.shadows(ctx, true, 'rgba(0,0,0,.5)', 20, 9);
    U.rr(ctx, -w / 2, -h / 2, w, h, 10);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#e8eef3');
    g.addColorStop(1, '#aebac6');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    U.circle(ctx, -w / 2 + 16, -h / 2 + 16, 3);
    ctx.fillStyle = 'rgba(79,224,138,.9)';
    ctx.fill();
    U.circle(ctx, -w / 2 + 28, -h / 2 + 16, 3);
    ctx.fillStyle = 'rgba(25,195,232,.9)';
    ctx.fill();
    ctx.fillStyle = 'rgba(30,40,50,.55)';
    ctx.font = '700 7px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WI-FI', 0, h / 2 - 8);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawMountedRouter(ctx) {
    const x = state.wifi.x, y = state.wifi.y;
    ctx.save();
    ctx.strokeStyle = '#75818c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 44, y - 34);
    ctx.lineTo(x - 60, y - 92);
    ctx.moveTo(x + 44, y - 34);
    ctx.lineTo(x + 60, y - 92);
    ctx.stroke();
    U.shadows(ctx, true, 'rgba(0,0,0,.55)', 24, 10);
    U.rr(ctx, x - 74, y - 36, 148, 72, 12);
    const g = ctx.createLinearGradient(x - 74, y - 36, x + 74, y + 36);
    g.addColorStop(0, '#eef3f7');
    g.addColorStop(1, '#b4c0cb');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    U.circle(ctx, x - 40, y + 22, 3.4);
    ctx.fillStyle = state.wifi.online ? '#4fe08a' : 'rgba(255,190,90,.95)';
    if (state.wifi.online) { ctx.shadowColor = '#4fe08a'; ctx.shadowBlur = 10; }
    ctx.fill();
    ctx.shadowBlur = 0;
    U.rr(ctx, x - 26, y - 22, 52, 6, 3);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fill();
    // наклейка с доступом
    U.rr(ctx, x - 80, y + 48, 160, 56, 8);
    ctx.fillStyle = '#f3efe3';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#2b2417';
    ctx.font = '700 9px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wi-Fi: ' + state.wifi.ssid, x, y + 66);
    ctx.font = '600 8.5px "Segoe UI",system-ui,sans-serif';
    ctx.fillStyle = '#5d4d2f';
    ctx.fillText('пароль: ' + state.wifi.pass, x, y + 80);
    ctx.fillStyle = 'rgba(90,75,50,.7)';
    ctx.font = '500 6.5px "Segoe UI",system-ui,sans-serif';
    ctx.fillText('подключение: Настройки консоли → Wi-Fi', x, y + 96);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawBuyHint(ctx) {
    const x = 800, y = 552;
    const pulse = 0.55 + 0.45 * Math.sin(clock * 2.4);
    ctx.save();
    ctx.font = '600 15px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    U.rr(ctx, x - 250, y - 44, 500, 88, 16);
    ctx.fillStyle = 'rgba(8,14,20,.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(143,230,255,' + (0.18 + pulse * 0.3).toFixed(2) + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#dff7ff';
    ctx.fillText('Консоль ещё не куплена', x, y - 8);
    ctx.fillStyle = '#8fb4c9';
    ctx.font = '500 12px "Segoe UI",system-ui,sans-serif';
    ctx.fillText('Телефон справа внизу → Nintendo Shop', x, y + 16);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawItems(ctx) {
    for (const it of state.items) {
      if (it.desk !== state.desk) continue;
      if (it.kind === 'box') drawBox(ctx, it);
      else if (it.kind === 'manual') drawManualItem(ctx, it);
      else if (it.kind === 'router') drawRouterItem(ctx, it);
    }
  }

  /* ------------------------------ картинки картриджей ------------------------------ */
  const IMG_CACHE = new Map();
  function imgFor(src) {
    if (!src) return null;
    let im = IMG_CACHE.get(src);
    if (!im) {
      im = new Image();
      im.src = src;
      IMG_CACHE.set(src, im);
    }
    return im.complete && im.naturalWidth ? im : null;
  }

  function drawCart(ctx, cart) {
    const { x, y, w, h } = cart;
    shadowOnDesk(ctx, x, Math.min(SURFACE + 4, y + h / 2), 52, 0.4);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cart.angle);
    U.shadows(ctx, true, 'rgba(0,0,0,.5)', 20, 8);
    U.rr(ctx, -w / 2, -h / 2, w, h, 8);
    const special = cart.stockFw ? '#2a3340' : cart.customOs ? '#2a1f45' : null;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (special) {
      g.addColorStop(0, special);
      g.addColorStop(1, '#0f1319');
    } else {
      g.addColorStop(0, '#f2f5f8');
      g.addColorStop(1, '#d3dbe3');
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // прорезь
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, 2);
    // наклейка
    U.rr(ctx, -w / 2 + 7, -h / 2 + 16, w - 14, h - 30, 5);
    ctx.fillStyle = '#11151a';
    ctx.fill();
    ctx.globalAlpha = 0.95;
    const acc = cart.customOs ? '#b06bff' : cart.stockFw ? '#9fb4c6' : COL.l;
    const acc2 = cart.customOs ? '#19c3e8' : cart.stockFw ? '#9fb4c6' : COL.r;
    U.drawMark(ctx, 0, -h / 2 + 38, 0.2, { accent: acc, accent2: acc2 });
    ctx.globalAlpha = 1;
    // своя картинка под логотипом
    if (cart.img) {
      const ix = -w / 2 + 11, iy = -h / 2 + 55, iw = w - 22, ih = h - 96;
      const im = imgFor(cart.img);
      ctx.save();
      U.rr(ctx, ix, iy, iw, ih, 4);
      ctx.clip();
      if (im) {
        const s = Math.max(iw / im.naturalWidth, ih / im.naturalHeight);
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        ctx.drawImage(im, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#1b2431';
        ctx.fillRect(ix, iy, iw, ih);
      }
      ctx.restore();
    }
    // название
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8.5px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    const name = cart.name.length > 16 ? cart.name.slice(0, 15) + '…' : cart.name;
    const words = name.split(' ');
    let line = 1;
    let buf = '';
    const lines = [];
    for (const wd of words) {
      if ((buf + ' ' + wd).trim().length > 13) { lines.push(buf); buf = wd; } else buf = (buf + ' ' + wd).trim();
    }
    if (buf) lines.push(buf);
    for (const ln of lines.slice(0, 2)) {
      ctx.fillText(ln, 0, h / 2 - 26 + (line - 1) * 10);
      line++;
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '600 5.5px "Segoe UI",system-ui,sans-serif';
    ctx.fillText(cart.stockFw ? 'STOCK FW' : cart.customOs ? 'CUSTOM OS' : 'SWITCH 2', 0, h / 2 - 6);
    ctx.restore();
  }

  function drawFx(ctx) {
    for (const f of state.fx) {
      if (f.t < 0) continue;
      const k = f.t / f.life;
      if (f.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * (f.thin ? 0.35 : 0.8);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = f.thin ? 2 : 4 * (1 - k) + 1;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 20 + k * 190, 0, U.TAU);
        ctx.stroke();
        ctx.restore();
      } else if (f.kind === 'dust') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.fillStyle = '#d9c7a8';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          const r = 8 + k * 26;
          ctx.beginPath();
          ctx.arc(f.x + Math.cos(a) * r, f.y - 3 + Math.sin(a) * r * 0.3, 3 * (1 - k) + 1, 0, U.TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawMagnetHints(ctx) {
    if (state.dragKind !== 'joycon') return;
    const j = state.dragRef;
    if (!j) return;
    const cand = [];
    if (!state.con.docked) {
      cand.push({ t: 'consoleL', p: attachedPos(j.side, 'consoleL') }, { t: 'consoleR', p: attachedPos(j.side, 'consoleR') });
    }
    if (state.desk === 1) {
      cand.push({ t: 'gripL', p: attachedPos(j.side, 'gripL') }, { t: 'gripR', p: attachedPos(j.side, 'gripR') });
    }
    for (const c of cand) {
      if (!c.p) continue;
      const okSide = (c.t === 'consoleL' || c.t === 'gripL') ? j.side === 'L' : j.side === 'R';
      if (!okSide) continue;
      const d = U.dist(j.x, j.y, c.p.x, c.p.y);
      const near = d < 62;
      ctx.save();
      ctx.globalAlpha = near ? 0.95 : 0.22;
      ctx.strokeStyle = near ? (j.side === 'L' ? COL.l : COL.r) : 'rgba(255,255,255,.5)';
      ctx.lineWidth = 2;
      ctx.shadowColor = j.side === 'L' ? COL.l : COL.r;
      ctx.shadowBlur = near ? 22 : 0;
      U.rr(ctx, c.p.x - JC_W / 2, c.p.y - JC_H / 2, JC_W, JC_H, 34);
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw(ctx) {
    drawRoom(ctx);
    drawProps(ctx);

    if (state.desk === 0) {
      drawDrawer(ctx);
      drawTrash(ctx);
    }
    if (state.wifi.mounted && state.wifi.room === state.desk) drawMountedRouter(ctx);

    if (state.desk === 1) {
      drawTV(ctx);
      if (state.con.owned) {
        drawGrip(ctx);
        drawDock(ctx, false);
      }
    }
    if (state.desk === 2) drawStorage(ctx);

    drawItems(ctx);

    // картриджи (за консолью, если лежат левее)
    for (const cart of state.carts) {
      if (cart.desk !== state.desk) continue;
      drawCart(ctx, cart);
    }

    if (state.con.owned) {
      drawConsole(ctx);

      if (state.desk === 1 && state.con.docked) drawDock(ctx, true);

      for (const j of state.joycons) {
        const onOtherDesk = state.desk === 0 && (j.attached === 'gripL' || j.attached === 'gripR');
        if (onOtherDesk) continue;
        drawJoycon(ctx, j);
      }
    } else if (state.desk === 0 && !state.items.some((it) => it.kind === 'box' && it.box === 'console')) {
      drawBuyHint(ctx);
    }

    if (state.desk === 1) { drawCable(ctx); drawPowerCable(ctx); }
    drawMagnetHints(ctx);
    drawFx(ctx);

    // подпись стола
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.restore();
  }

  /* ------------------------------ смена стола ------------------------------ */
  function setDesk(i, force) {
    if (!force) {
      if (state.con.docked) {
        emit('toast', { text: 'Консоль в доке — сначала выньте её из станции', kind: 'red' });
        Sfx.error();
        return false;
      }
      if (state.dragKind && state.dragKind !== 'cart') return false;
    }
    if (state.con.docked) undockConsole();
    state.desk = i;
    if (window.Dev && Dev.on && DESKS[i]) Dev.log('Стол: «' + DESKS[i].name + '»');

    const carried = state.dragKind === 'cart' ? state.dragRef : null;
    if (carried) {
      carried.desk = i;
      carried.slot = null;
      carried.x = U.clamp(state.mouse.x, 90, W - 90);
      carried.y = U.clamp(state.mouse.y, 140, SURFACE - 40);
      carried.angle = 0;
      carried.vx = 0; carried.vy = 0; carried.va = 0;
    }

    // консоль переезжает на новый стол
    state.con.x = DESKS[i].consoleX;
    state.con.y = SURFACE - CONSOLE_H / 2;
    for (const j of state.joycons) {
      if (!j.attached) {
        j.x = U.clamp(j.x, 120, W - 120);
        j.y = Math.min(j.y, surfaceY(j));
      }
    }
    for (const cart of state.carts) {
      if (cart === carried || cart.slot != null) continue;
      cart.y = Math.min(cart.y, surfaceY(cart));
      cart.x = U.clamp(cart.x, 120, W - 120);
    }
    emit('desk', { desk: i, name: DESKS[i].name });
    return true;
  }

  function screenTarget() {
    const c = state.con;
    if (!c.owned) return null;
    if (!state.powered) return null;
    if (!c.docked) return 'handheld';
    if (state.desk === 1 && cableConnected()) return 'tv';
    return null;
  }

  function resetJoycons() {
    for (const j of state.joycons) {
      j.attached = j.side === 'L' ? 'consoleL' : 'consoleR';
      j.dragging = false;
      j.angle = 0;
    }
  }

  function resetProgress() {
    const c = state.con;
    c.owned = false;
    c.docked = false;
    c.dragging = false;
    c.cart = null;
    c.cartRef = null;
    c.charging = false;
    c.battery = 58;
    c.x = DESKS[0].consoleX;
    c.y = SURFACE - CONSOLE_H / 2;
    state.powered = false;
    state.desk = 0;
    state.carts = [];
    state.items = [];
    state.fx = [];
    state.hover = null;
    state.dragKind = null;
    state.dragRef = null;
    state.drawer.open = false;
    state.drawer.manual = false;
    state.wifi.mounted = false;
    state.wifi.online = false;
    state.cable.a.port = null;
    state.cable.b.port = null;
    state.cable.a.x = 470; state.cable.a.y = 684;
    state.cable.b.x = 560; state.cable.b.y = 688;
    state.powerCable.a.port = null;
    state.powerCable.b.port = null;
    state.powerCable.a.x = 930; state.powerCable.a.y = 640;
    state.powerCable.b.x = 866; state.powerCable.b.y = 672;
    resetJoycons();
    lifeSave();
  }

  lifeLoad();

  return {
    W, H, SURFACE, DESKS, PORTS, DOCK, GRIP, TV, BUTTON_NAMES, LAYOUT,
    TRASH, DRAWER, state,
    get desk() { return state.desk; },
    set controllerHandler(fn) { controllerHandler = fn; },
    set eventHandler(fn) { eventHandler = fn; },
    set stickHandler(fn) { stickHandler = fn; },
    update, draw, pointerDown, pointerDownRight, pointerMove, pointerUp, setDesk, screenTarget,
    consoleRect, screenRect, powerRect, volumeRect, cartSlotRect, dockRect,
    jcToWorld, pointToJc, attachedPos, cableConnected, surfaceY, storageSlots,
    powerConnected, POWER_PORTS, POWER_SOCKET,
    drawerHandleRect, drawerOpenRect, trashRect,
    addCart, spawnStockFirmware, insertCart, ejectCart, dockConsole, undockConsole, resetJoycons, resetProgress,
    deliver, connectWifi, wifiInfo, isOnline, lifeSave, lifeLoad,
    ripple, emit,
    get clock() { return clock; },
  };
})();
