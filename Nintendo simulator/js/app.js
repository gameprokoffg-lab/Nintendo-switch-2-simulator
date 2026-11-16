'use strict';

/* =====================================================================
   Связка: сцена, камера, ввод, тосты, столы
   ===================================================================== */
window.App = (() => {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const handheldSlot = document.getElementById('handheldSlot');
  const tvSlot = document.getElementById('tvSlot');
  const deskTab = document.getElementById('deskTab');
  const deskNameText = document.getElementById('deskNameText');
  const helpBtn = document.getElementById('helpBtn');
  const helpPanel = document.getElementById('helpPanel');
  const toasts = document.getElementById('toasts');
  const bootVeil = document.getElementById('bootVeil');
  const kbdToggle = document.getElementById('kbdToggle');
  let keyboardOn = true;
  try { keyboardOn = localStorage.getItem('switch2.kbd') !== '0'; } catch (err) { /* приватный режим */ }

  function renderKbdToggle() {
    if (!kbdToggle) return;
    kbdToggle.textContent = keyboardOn ? 'Отключить' : 'Включить';
    kbdToggle.setAttribute('aria-pressed', String(keyboardOn));
  }

  let osHost = null;
  let view = { base: 1, zoom: 1, zoomTarget: 1, zoomMode: 'screen' };
  let vw = window.innerWidth, vh = window.innerHeight;
  let target = null;
  let lastRectKey = '';
  let started = false;

  /* ------------------------------ тосты ------------------------------ */
  function toast(text, kind) {
    if (!toasts) return;
    while (toasts.children.length >= 3) toasts.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    if (kind) el.dataset.kind = kind;
    el.textContent = text;
    toasts.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  /* ------------------------------ ОС в слоте ------------------------------ */
  function ensureHost() {
    if (osHost) return osHost;
    osHost = document.createElement('div');
    osHost.id = 'osHost';
    osHost.style.display = 'none';
    document.body.appendChild(osHost);
    OS.mount(osHost);
    return osHost;
  }

  function slotRectFor(name) {
    if (name === 'tv') return World.TV.screen;
    return World.screenRect();
  }

  function placeOS(name) {
    ensureHost();
    const parent = name === 'tv' ? tvSlot : handheldSlot;
    const rect = slotRectFor(name);
    if (osHost.parentNode !== parent) parent.appendChild(osHost);
    const k = rect.w / 1280;
    const key = name + ':' + k.toFixed(4) + ':' + rect.w.toFixed(1) + 'x' + rect.h.toFixed(1);
    if (key !== lastRectKey) {
      osHost.style.transform = `scale(${k})`;
      lastRectKey = key;
    }
    osHost.style.display = 'block';
  }

  /* ------------------------------ камера ------------------------------ */
  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    view.base = Math.min(vw / 1600, vh / 900);
  }

  function applyCamera() {
    const z = view.base * view.zoom;
    let tx, ty;
    if (view.zoom > 1.02) {
      const foc = view.zoomMode === 'tv' ? World.TV.screen : World.screenRect();
      const fx = foc.x + foc.w / 2;
      const fy = foc.y + foc.h / 2;
      tx = vw / 2 - fx * z;
      ty = vh / 2 - fy * z;
    } else {
      tx = (vw - 1600 * view.base) / 2;
      ty = (vh - 900 * view.base) / 2;
    }
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
  }

  function toStage(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 1600,
      y: ((clientY - r.top) / r.height) * 900,
    };
  }

  function inRect(x, y, r) {
    return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  }

  const OS_CONTROL = 'button,a,input,textarea,select,label,[data-i],[data-sec],[data-get],[data-del],[data-mact],[data-login],[data-app],[data-buy],[data-ph-back],[data-drop],[data-pick],[data-add],[data-cancel],[data-template],[data-publish],[data-export],[data-import],[data-tab],[data-act],[data-key],[data-grad],[data-avup],[data-wsubmit],[data-wswitch]';

  function screenModeAt(p) {
    const con = World.state.con;
    if (!con.owned) return null;
    if (con.docked) {
      if (World.desk === 1 && World.cableConnected() && inRect(p.x, p.y, World.TV.screen)) return 'tv';
      return null;
    }
    return inRect(p.x, p.y, World.screenRect()) ? 'screen' : null;
  }

  let screenPress = null;

  /* ------------------------------ питание ------------------------------ */
  function togglePower() {
    Sfx.unlock();
    if (!World.state.con.owned) {
      Sfx.error();
      toast('Сначала распакуйте Nintendo Switch 2 — закажите её в Nintendo Shop на телефоне');
      return;
    }
    const on = !World.state.powered;
    if (on && World.state.con.battery <= 0) {
      Sfx.error();
      toast('Батарея разряжена — подключите док к розетке и вставьте консоль в док', 'red');
      return;
    }
    World.state.powered = on;
    World.state.hintPowerUntil = 0;
    if (window.Dev && Dev.on) Dev.variable('консоль включена', on ? 'да' : 'нет');
    if (on) {
      toast('Switch 2 включается…');
      setZoom(2.5, 'screen');
      OS.boot(() => {
        toast('Добро пожаловать! Выберите игру или загрузите свою через Game Loader');
      });
    } else {
      OS.powerOff();
      if (view.zoomTarget > 1.2) setZoom(1);
      toast('Консоль выключена');
    }
    if (on && World.state.desk === 1 && !World.state.con.docked) {
      // подсказка про второй стол
      setTimeout(() => toast('Кстати, слева есть стрелка — там док-станция и телевизор'), 3200);
    }
  }

  /* ------------------------------ события мира ------------------------------ */
  World.eventHandler = (type, payload) => {
    switch (type) {
      case 'toast':
        toast(payload.text, payload.kind);
        break;
      case 'power':
        togglePower();
        break;
      case 'zoomScreen':
        setZoom(2.5, 'screen');
        break;
      case 'attach':
        OS.flash(payload.side);
        toast(payload.side === 'L' ? 'Левый Joy-Con 2 на магнитах' : 'Правый Joy-Con 2 на магнитах',
          payload.side === 'L' ? 'cyan' : 'red');
        break;
      case 'detach':
        break;
      case 'dock':
        toast('Консоль в док-станции');
        if (World.cableConnected()) {
          setTimeout(() => {
            setZoom(2.2, 'tv');
            toast('HDMI подключён — картинка на телевизоре', 'cyan');
          }, 320);
        } else {
          setTimeout(() => toast('Осталось протянуть HDMI от дока к телевизору'), 900);
        }
        if (!World.powerConnected()) {
          setTimeout(() => toast('Док не подключён к розетке — зарядки нет'), 1500);
        }
        break;
      case 'undock':
        toast('Консоль вынута из дока');
        if (view.zoomTarget > 1.2) setZoom(1);
        break;
      case 'hdmi':
        if (World.state.con.docked) {
          setZoom(2.2, 'tv');
          toast('Телевизор показывает Switch 2', 'cyan');
        }
        break;
      case 'plug':
        if (!payload.connected) toast('Кабель подключён с одной стороны — нужен второй конец');
        break;
      case 'powerPlug':
        if (payload.connected) toast('Блок питания подключён — док заряжает консоль', 'cyan');
        else toast('Кабель питания подключён с одной стороны — нужен второй конец');
        break;
      case 'batteryDead':
        World.state.powered = false;
        OS.powerOff();
        if (view.zoomTarget > 1.2) setZoom(1);
        toast('Батарея разряжена — поставьте консоль в док и подключите питание', 'red');
        break;
      case 'cartInsert': {
        const handled = OS.onCartInsert(payload);
        if (!handled) toast('Картридж «' + payload.name + '» установлен — игра в библиотеке', 'cyan');
        break;
      }
      case 'cartEject':
        OS.onCartEject(payload);
        toast('Картридж извлечён');
        break;
      case 'stored':
        toast('Картридж «' + payload.name + '» убран в хранилище', 'cyan');
        break;
      case 'readManual':
        if (window.Life) Life.openManual();
        break;
      case 'desk':
        deskNameText.textContent = payload.name;
        if (view.zoomTarget > 1.2) setZoom(1);
        break;
      default:
        break;
    }
  };

  /* ------------------------------ контроллер ------------------------------ */
  const ACTION_MAP = {
    up: 'up', down: 'down', left: 'left', right: 'right',
    A: 'ok', B: 'back', X: 'x', Y: 'y',
    plus: 'plus', minus: 'minus', home: 'home',
    L: 'l', R: 'r', ZL: 'zl', ZR: 'zr', C: 'c', capture: 'capture', stick: 'stick',
    SL: 'sl', SR: 'sr',
  };
  const QUIET_BUTTONS = new Set(['up', 'down', 'left', 'right', 'A', 'B', 'home']);

  /* ------------------------------ стики: мышь → ОС ------------------------------ */
  const stickAxes = { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } };
  const stickDirs = { L: new Set(), R: new Set() };

  function dirsOf(x, y) {
    const s = new Set();
    if (x < -0.42) s.add('left');
    if (x > 0.42) s.add('right');
    if (y < -0.42) s.add('up');
    if (y > 0.42) s.add('down');
    return s;
  }

  function releaseStickDirs(side) {
    for (const d of stickDirs[side]) OS.release(d);
    stickDirs[side].clear();
  }

  World.stickHandler = ({ side, x, y }) => {
    stickAxes[side] = { x, y };
    if (!World.state.powered) return;
    const next = dirsOf(x, y);
    const prev = stickDirs[side];
    for (const d of prev) if (!next.has(d)) OS.release(d);
    for (const d of next) if (!prev.has(d)) OS.press(d, false);
    stickDirs[side] = next;
  };

  World.controllerHandler = ({ side, button, attached }) => {
    if (!QUIET_BUTTONS.has(button)) {
      toast('Joy-Con 2 (' + side + ') · ' + (World.BUTTON_NAMES[button] || button));
    }
    if (!World.state.powered) {
      if (button === 'home') toast('Сначала включите консоль кнопкой сверху');
      return;
    }
    if (!target) return;
    const action = ACTION_MAP[button];
    if (!action) return;
    OS.press(action, true);
    if (button === 'x' || button === 'y') OS.release(action);
  };

  /* ------------------------------ ввод: мышь ------------------------------ */
  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  stage.addEventListener('pointerdown', (e) => {
    Sfx.unlock();
    const t = e.target;
    const p = toStage(e.clientX, e.clientY);
    const osEl = t.closest ? t.closest('#os') : null;
    const onControl = osEl ? t.closest(OS_CONTROL) : null;

    if (e.button === 2) {
      if (osEl) return;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* синтетические события */ }
      World.pointerDownRight(p.x, p.y);
      return;
    }
    if (e.button !== 0) return;

    if (osEl) {
      // клик по кнопке консоли — обычное управление
      if (onControl) return;
      // клик по фону экрана — приблизить
      if (view.zoomTarget <= 1.2) {
        const mode = screenModeAt(p);
        if (mode) screenPress = { mode, x: e.clientX, y: e.clientY, t: performance.now() };
      }
      return;
    }

    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* синтетические события */ }

    // из зума выходит только Esc: клики мимо экрана уходят в мир — можно брать Joy-Con
    const mode = screenModeAt(p);
    if (mode) {
      screenPress = { mode, x: e.clientX, y: e.clientY, t: performance.now() };
      return;
    }

    World.pointerDown(p.x, p.y);
  });

  stage.addEventListener('pointermove', (e) => {
    const p = toStage(e.clientX, e.clientY);
    World.pointerMove(p.x, p.y);
    const hov = World.state.hover;
    stage.style.cursor = ['joycon', 'console', 'cart', 'item', 'router'].indexOf(World.state.dragKind) >= 0
      ? 'grabbing'
      : hov ? 'pointer' : 'default';
  });

  function finishScreenPress(e) {
    if (!screenPress) return;
    const pr = screenPress;
    screenPress = null;
    const dist = Math.hypot(e.clientX - pr.x, e.clientY - pr.y);
    if (dist <= 8 && performance.now() - pr.t <= 700) {
      setZoom(pr.mode === 'tv' ? 2.4 : 2.5, pr.mode);
      Sfx.move();
    }
  }

  const endPointer = (e) => {
    const p = toStage(e.clientX, e.clientY);
    World.pointerUp(p.x, p.y, e.button);
    if (e.button === 0) finishScreenPress(e);
  };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', (e) => { screenPress = null; endPointer(e); });
  window.addEventListener('pointerup', (e) => {
    finishScreenPress(e);
    if (World.state.dragKind) endPointer(e);
  });

  /* ------------------------------ ввод: клавиатура ------------------------------ */
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'ok', Enter: 'ok', NumpadEnter: 'ok',
    KeyX: 'back', Backspace: 'back',
    KeyC: 'x', KeyV: 'y',
    KeyH: 'home',
    KeyP: 'plus', KeyM: 'minus',
    KeyQ: 'l', KeyE: 'r',
    KeyF: 'capture',
    Space: 'ok',
  };

  window.addEventListener('keydown', (e) => {
    Sfx.unlock();
    const typing = !!(e.target && e.target.closest && e.target.closest('input,textarea,select'));
    if (e.code === 'Escape') {
      e.preventDefault();
      if (window.Life && Life.closeTop && Life.closeTop()) return;
      if (!helpPanel.hidden) {
        helpPanel.hidden = true;
        helpBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (typing && e.target.blur) { e.target.blur(); return; }
      if (view.zoomTarget > 1.2) { setZoom(1); return; }
      return;
    }
    if (typing || !keyboardOn) return;
    const action = KEYMAP[e.code];
    if (action) {
      e.preventDefault();
      if (e.repeat) return;
      if (!World.state.powered) {
        if (action === 'home' || action === 'ok') toast('Консоль выключена — нажмите кнопку питания сверху');
        return;
      }
      OS.press(action, false);
    }
    if (e.code === 'KeyO') {
      e.preventDefault();
      togglePower();
    }
    if (e.code === 'KeyT') {
      e.preventDefault();
      switchDesk();
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) OS.release(action);
  });

  /* ------------------------------ зум ------------------------------ */
  function setZoom(z, mode) {
    view.zoomTarget = z;
    if (mode) view.zoomMode = mode;
    if (window.Dev && Dev.on) Dev.log('Камера: масштаб ×' + z + (mode ? ' (' + (mode === 'tv' ? 'телевизор' : 'консоль') + ')' : ''));
  }

  /* ------------------------------ столы ------------------------------ */
  function switchDesk() {
    const n = World.DESKS.length;
    const next = (World.desk + 1) % n;
    if (World.setDesk(next)) {
      deskNameText.textContent = World.DESKS[next].name;
      Sfx.move();
      if (World.DESKS[next].storage) {
        toast('Хранилище: перетащите картридж в свободный слот. T — следующая комната', 'cyan');
      }
    }
  }
  deskTab.addEventListener('click', (e) => {
    e.preventDefault();
    Sfx.unlock();
    switchDesk();
  });

  /* ------------------------------ помощь ------------------------------ */
  const wipeBtn = document.getElementById('wipeBtn');
  if (wipeBtn) {
    wipeBtn.addEventListener('click', () => {
      if (typeof OS !== 'undefined' && OS.wipe) OS.wipe();
    });
  }

  helpBtn.addEventListener('click', () => {
    const open = helpPanel.hidden;
    helpPanel.hidden = !open;
    helpBtn.setAttribute('aria-expanded', String(open));
  });

  renderKbdToggle();
  if (kbdToggle) {
    kbdToggle.addEventListener('click', () => {
      keyboardOn = !keyboardOn;
      try { localStorage.setItem('switch2.kbd', keyboardOn ? '1' : '0'); } catch (err) { /* приватный режим */ }
      renderKbdToggle();
      Sfx.move();
      toast(keyboardOn ? 'Управление с клавиатуры включено' : 'Клавиатура отключена — управляйте мышью', keyboardOn ? 'cyan' : undefined);
    });
  }

  const devRow = document.getElementById('devRow');
  const devBtn = document.getElementById('devBtn');
  if (window.Dev && Dev.on && devRow && devBtn) {
    devRow.hidden = false;
    const paintDev = () => { devBtn.textContent = Dev.visible() ? 'Скрыть логи' : 'Показать логи'; };
    devBtn.addEventListener('click', () => {
      Dev.toggle();
      paintDev();
      Sfx.move();
    });
    paintDev();
  }

  /* ------------------------------ старт ------------------------------ */
  window.addEventListener('resize', resize);
  resize();
  ensureHost();

  World.state.hintPowerUntil = World.clock + 9;
  World.spawnStockFirmware();

  bootVeil.addEventListener('click', () => {
    Sfx.unlock();
    bootVeil.classList.add('hide');
    started = true;
    if (World.state.con.owned) {
      toast('Нажмите кнопку питания на верхней грани консоли', 'cyan');
      World.state.hintPowerUntil = World.clock + 14;
    } else {
      toast('Откройте телефон справа внизу: закажите Nintendo Switch 2 и роутер', 'cyan');
    }
  });

  // не даём браузеру открыть файл, брошенный мимо дропзоны
  ['dragover', 'drop'].forEach((ev) => {
    window.addEventListener(ev, (e) => {
      if (!(e.target.closest && e.target.closest('[data-drop]'))) e.preventDefault();
    });
  });

  /* ------------------------------ цикл ------------------------------ */
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    view.zoom = U.damp(view.zoom, view.zoomTarget, 0.18, dt);
    if (Math.abs(view.zoom - view.zoomTarget) < 0.004) view.zoom = view.zoomTarget;

    World.update(dt);
    ctx.clearRect(0, 0, 1600, 900);
    World.draw(ctx);

    // слоты под ОС
    const tgt = World.screenTarget();
    const sr = World.screenRect();
    handheldSlot.style.left = sr.x + 'px';
    handheldSlot.style.top = sr.y + 'px';
    handheldSlot.style.width = sr.w + 'px';
    handheldSlot.style.height = sr.h + 'px';

    const ts = World.TV.screen;
    tvSlot.style.left = ts.x + 'px';
    tvSlot.style.top = ts.y + 'px';
    tvSlot.style.width = ts.w + 'px';
    tvSlot.style.height = ts.h + 'px';

    if (tgt !== target) {
      target = tgt;
      if (target) placeOS(target);
      else if (osHost) osHost.style.display = 'none';
      handheldSlot.style.opacity = target === 'handheld' ? '1' : '0';
      tvSlot.style.opacity = target === 'tv' ? '1' : '0';
    } else if (target) {
      placeOS(target);
    } else {
      handheldSlot.style.opacity = '0';
      tvSlot.style.opacity = '0';
    }

    applyCamera();
    try {
      OS.update(dt);
      if (OS.setBattery) OS.setBattery(World.state.con.battery, World.state.con.charging);
    } catch (err) {
      if (window.console && console.error) console.error(err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (window.Life && Life.init) Life.init({ toast });

  if (window.Dev && Dev.on) Dev.expose('app', { view, setZoom, screenModeAt });

  return { toast, setZoom, switchDesk, previewGame: (n, t) => OS.previewGame(n, t) };
})();