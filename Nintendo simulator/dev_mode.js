'use strict';

/* 1 — дев-мод включён, 0 — выключен */
window.DEV_MODE = 0;

window.Dev = (() => {
  const enabled = Number(window.DEV_MODE) === 1;
  const api = { on: enabled };
  if (!enabled) return api;

  const MAX = 140;
  const entries = [];
  let panel = null;
  let list = null;
  let drag = null;
  const STORE_KEY = 'switch2.devPanel';

  const LAYER_NAMES = {
    off: 'выключена',
    boot: 'загрузка',
    home: 'главный экран',
    library: 'библиотека',
    loader: 'Game Loader',
    game: 'игра',
    settings: 'настройки',
    welcome: 'вход в аккаунт',
    shop: 'eShop',
    insertCard: 'терминал',
  };

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function visible() {
    if (!panel) return false;
    return !panel.hidden;
  }

  function render() {
    if (!list) return;
    list.innerHTML = '';
    for (const e of entries) {
      const row = document.createElement('div');
      const time = document.createElement('b');
      time.textContent = e.time + ' ';
      row.appendChild(time);
      row.appendChild(document.createTextNode(e.text));
      list.appendChild(row);
    }
    list.scrollTop = list.scrollHeight;
  }

  function build() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'devPanel';
    panel.innerHTML =
      '<div id="devHead"><b>Дев-мод</b><span>потяните за заголовок</span>' +
      '<button type="button" data-dev-clear>Очистить</button>' +
      '<button type="button" data-dev-close aria-label="Скрыть журнал">×</button></div>' +
      '<div id="devList" data-dev-list></div>';
    document.body.appendChild(panel);
    list = panel.querySelector('[data-dev-list]');

    panel.querySelector('[data-dev-clear]').addEventListener('click', () => {
      entries.length = 0;
      log('Журнал очищен');
    });
    panel.querySelector('[data-dev-close]').addEventListener('click', () => hide());

    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;
    const head = panel.querySelector('#devHead');
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: panel.offsetLeft, oy: panel.offsetTop };
      head.classList.add('dragging');
      try { head.setPointerCapture(e.pointerId); } catch (err) { /* синтетические события */ }
      sx = drag.sx; sy = drag.sy; ox = drag.ox; oy = drag.oy;
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const nx = Math.min(Math.max(4, ox + e.clientX - sx), window.innerWidth - w - 4);
      const ny = Math.min(Math.max(4, oy + e.clientY - sy), window.innerHeight - h - 4);
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    });
    const stop = () => { if (drag) { drag = null; head.classList.remove('dragging'); } };
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
    render();
    panel.hidden = true;
  }

  function show() {
    build();
    panel.hidden = false;
    try { localStorage.setItem(STORE_KEY, '1'); } catch (err) { /* приватный режим */ }
    render();
  }

  function hide() {
    if (panel) panel.hidden = true;
    try { localStorage.setItem(STORE_KEY, '0'); } catch (err) { /* приватный режим */ }
  }

  function toggle() {
    if (visible()) hide();
    else show();
  }

  function log(text) {
    entries.push({ time: stamp(), text: String(text) });
    if (entries.length > MAX) entries.shift();
    if (list) render();
    try { console.log('[dev] ' + text); } catch (err) { /* нет консоли */ }
  }

  function variable(name, value) {
    log('Переменная «' + name + '» = ' + value);
  }

  function check(name, ok) {
    log('Проверка «' + name + '»: ' + (ok ? 'да' : 'нет'));
    return ok;
  }

  function describe(el) {
    if (!el || !el.tagName) return 'пусто';
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      const t = el.getAttribute('aria-label') || el.placeholder || el.type || 'поле';
      return 'поле «' + t + '»';
    }
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (tag === 'button' || tag === 'a') {
      return (tag === 'button' ? 'кнопка «' : 'ссылка «') + (text || el.getAttribute('aria-label') || tag) + '»';
    }
    const cls = String(el.className || '').split(' ')[0];
    const kind = {
      setRow: 'строка настроек',
      libCard: 'карточка библиотеки',
      shopCard: 'карточка магазина',
      tile: 'плитка меню',
      osLayer: 'экран консоли',
      phoneApp: 'приложение телефона',
      manPage: 'страница мануала',
      toast: 'уведомление',
    }[cls];
    return (kind || 'элемент ' + tag) + (text ? ' «' + text + '»' : '');
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest
      ? e.target.closest('button,a,input,label,[data-i],[data-buy],[data-app],[data-ph-back],.setRow,.shopCard,.tile,.libCard')
      : null;
    if (!el) return;
    log('Клик по «' + describe(el) + '»');
  }, true);

  api.log = log;
  api.variable = variable;
  api.check = check;
  api.show = show;
  api.hide = hide;
  api.toggle = toggle;
  api.visible = visible;
  api.layerName = (name) => LAYER_NAMES[name] || name;
  api.expose = (name, obj) => { api[name] = obj; return obj; };

  build();
  log('Дев-мод включён — журнал готов');
  let open = true;
  try { open = localStorage.getItem(STORE_KEY) !== '0'; } catch (err) { /* приватный режим */ }
  if (open) show();
  else hide();

  return api;
})();
