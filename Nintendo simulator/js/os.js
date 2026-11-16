'use strict';

/* =====================================================================
   Библиотека игр (общий реестр)
   ===================================================================== */
var Library = {
  items: [],
  seq: 1,
  add(entry) {
    const item = Object.assign({
      id: 'g' + this.seq++,
      name: 'Без названия',
      author: 'неизвестный',
      desc: '',
      kind: 'demo',
      code: null,
      installed: false,
      cart: false,
      img: null,
      menuImg: null,
      sizeMB: 100,
      addedAt: Date.now(),
      lastPlayed: null,
    }, entry);
    this.items.push(item);
    return item;
  },
  get(id) { return this.items.find((i) => i.id === id) || null; },
  byName(n) { return this.items.find((i) => i.name === n) || null; },
  installed() { return this.items.filter((i) => i.installed); },
};

function sizeLabel(mb) {
  if (mb == null) return '—';
  if (mb >= 1024) return (mb / 1024).toFixed(1).replace('.0', '') + ' ГБ';
  return Math.max(1, Math.round(mb)) + ' МБ';
}

function dateLabel(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/* =====================================================================
   ОС консоли
   ===================================================================== */
const OS = (() => {
  let root = null;
  let host = null;
  let layer = 'off';
  let focus = 0;
  let busy = false;

  const held = new Set();
  const pressed = new Set();
  const padTimers = new Map();

  let game = null;          // активный рантайм
  let gameCanvas = null;
  let gameCtx = null;
  let currentGameId = null;

  let loaderFiles = [];
  let pending = null;

  let welcomeMode = 'register';
  let welcomeAvatar = null;
  let modalOpen = false;
  let installing = false;
  let shopSection = 'games';
  let shopFocus = 0;
  let pubImg = null;
  let pubMenuImg = null;

  const AV_GRADS = [
    'linear-gradient(140deg,#2ee6a8,#19c3e8)',
    'linear-gradient(140deg,#ff9f4a,#ff4a57)',
    'linear-gradient(140deg,#b06bff,#19c3e8)',
    'linear-gradient(140deg,#f2c14e,#ff4a57)',
  ];

  const SHOP_SECTIONS = [
    { id: 'games', label: 'Игры' },
    { id: 'apps', label: 'Приложения' },
    { id: 'soft', label: 'Софт' },
    { id: 'firmware', label: 'Кастомная ОС' },
  ];

  const state = { brightness: 1 };
  let batShown = -1;
  let batCharging = false;

  /* ------------------------------ разметка ------------------------------ */
  const ICONS = {
    rocket: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ff0ff"/><stop offset="1" stop-color="#2a7ff0"/></linearGradient></defs><path d="M32 4c10 9 14 22 14 33l-8 9H26l-8-9C18 26 22 13 32 4z" fill="url(#rk)"/><circle cx="32" cy="25" r="5.5" fill="#06121c"/><path d="M18 42l-9 14 12-5z" fill="#2a7ff0"/><path d="M46 42l9 14-12-5z" fill="#2a7ff0"/><path d="M27 50h10l-5 11z" fill="#ffb45c" opacity=".9"/></svg>`,
    grid: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="9" width="20" height="20" rx="5" fill="#19c3e8"/><rect x="35" y="9" width="20" height="20" rx="5" fill="#ff4a57"/><rect x="9" y="35" width="20" height="20" rx="5" fill="#f2c14e"/><rect x="35" y="35" width="20" height="20" rx="5" fill="#8ce6a5"/></svg>`,
    box: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 20l24-11 24 11-24 11z" fill="#3b4a5a"/><path d="M8 20v24l24 11V31z" fill="#25313d"/><path d="M56 20v24L32 55V31z" fill="#1b2530"/><path d="M32 8v13" stroke="#8ce6a5" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="24" r="4" fill="#8ce6a5"/></svg>`,
    gear: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="11" fill="none" stroke="#9fb4c6" stroke-width="5"/><g stroke="#9fb4c6" stroke-width="5" stroke-linecap="round"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6"/></g></svg>`,
    blocks: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="8" width="20" height="20" rx="4" fill="#19c3e8"/><rect x="36" y="8" width="20" height="20" rx="4" fill="#f2c14e"/><rect x="8" y="36" width="20" height="20" rx="4" fill="#b06bff"/><rect x="36" y="36" width="20" height="20" rx="4" fill="#8ce6a5"/></svg>`,
    race: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 40l6-14 10-4h12l10 6 6 12v8H10z" fill="#ff4a57"/><path d="M20 26h24l-4-6H24z" fill="#bfe9ff"/><circle cx="20" cy="48" r="5" fill="#1b2530"/><circle cx="44" cy="48" r="5" fill="#1b2530"/><path d="M4 46h14M46 46h14" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/></svg>`,
    nodes: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 20h16M26 30v8M36 46h12" stroke="#8ce6a5" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="20" r="7" fill="#19c3e8"/><circle cx="28" cy="40" r="7" fill="#f2c14e"/><circle cx="50" cy="46" r="7" fill="#b06bff"/></svg>`,
    heart: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 54S10 40 10 24a12 12 0 0122-6 12 12 0 0122 6c0 16-22 30-22 30z" fill="#ff4a57"/><path d="M22 26c0-4 3-7 7-7" stroke="#ffd0d4" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`,
    doom: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="18" fill="none" stroke="#ff4a57" stroke-width="4"/><path d="M32 8v12M32 44v12M8 32h12M44 32h12" stroke="#ff4a57" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="#f2c14e"/></svg>`,
    photo: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="12" width="48" height="40" rx="6" fill="#1d2530" stroke="#3a4755" stroke-width="2"/><circle cx="22" cy="24" r="4" fill="#f2c14e"/><path d="M12 46l14-16 11 12 8-8 7 12z" fill="#3a4755"/></svg>`,
    shop: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 22h32l-3 32H19z" fill="#1d2530" stroke="#3a4755" stroke-width="2"/><path d="M24 26v-6a8 8 0 0116 0v6" fill="none" stroke="#ff4a57" stroke-width="3" stroke-linecap="round"/></svg>`,
    cart: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="18" y="10" width="28" height="44" rx="5" fill="#e7eef4"/><rect x="22" y="18" width="20" height="22" rx="3" fill="#0f141a"/><circle cx="32" cy="29" r="6" fill="#19c3e8"/></svg>`,
    chip: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="16" y="16" width="32" height="32" rx="6" fill="#1d2530" stroke="#8ce6a5" stroke-width="2"/><path d="M24 8v6M32 8v6M40 8v6M24 50v6M32 50v6M40 50v6M8 24h6M8 32h6M8 40h6M50 24h6M50 32h6M50 40h6" stroke="#8ce6a5" stroke-width="2" stroke-linecap="round"/><rect x="26" y="26" width="12" height="12" rx="2" fill="#8ce6a5"/></svg>`,
  };

  function packGames() {
    return window.GamePack ? GamePack.list() : [];
  }

  function libraryGames() {
    return [{ id: 'space', name: 'Space Survivor', sys: true, desc: 'Встроенная игра' }]
      .concat(packGames().map((g) => Object.assign({ sys: false, pack: true }, g)))
      .concat(Library.installed().filter((g) => g.id !== 'space'));
  }

  function appDefs() {
    const base = [
      { id: 'space', name: 'Space Survivor', icon: 'rocket', color: '#0e2a3a', desc: 'Ракета, метеоры и бесконечный космос. Уворачивайтесь как можно дольше.', sys: true },
      { id: 'library', name: 'Библиотека', icon: 'grid', color: '#1a2130', desc: 'Все игры, установленные на консоли.' },
      { id: 'loader', name: 'Game Loader', icon: 'box', color: '#1d2620', desc: 'Перетащите файл с кодом игры — получите картридж с логотипом Switch 2.' },
      { id: 'settings', name: 'Настройки', icon: 'gear', color: '#161b22', desc: 'Звук, подсказки и справка по управлению.' },
      { id: 'album', name: 'Альбом', icon: 'photo', color: '#141a22', desc: 'Скриншоты пока не поддерживаются.', disabled: true },
      { id: 'shop', name: 'eShop', icon: 'shop', color: '#1a1030', desc: 'Публикуйте картриджи и скачивайте игры других игроков.' },
    ];
    const pack = packGames();
    for (let i = pack.length - 1; i >= 0; i--) {
      const g = pack[i];
      base.splice(1, 0, {
        id: g.id, name: g.name, icon: g.icon, color: g.color,
        desc: g.desc + (g.needFw ? ' · нужна прошивка NEBULA OS' : ''),
        pack: true,
      });
    }
    for (const g of Library.installed()) {
      if (g.id === 'space') continue;
      base.splice(1 + pack.length, 0, {
        id: g.id, name: g.name, icon: 'cart', color: '#10202a', img: g.menuImg || null,
        desc: g.desc || ('Загружено ' + (g.author || 'неизвестным автором')),
      });
    }
    return base;
  }

  function build() {
    root.innerHTML = `
      <div class="osLayer" data-layer="off"><div class="standby">standby · switch 2</div></div>
      <div class="osLayer os-boot" data-layer="boot">
        <div class="logoWrap">
          <canvas class="mark" width="300" height="300"></canvas>
          <div class="word">Nintendo Switch 2</div>
        </div>
        <div class="shine"></div>
        <div class="powered">система готова</div>
      </div>
      <div class="osLayer os-home" data-layer="home">
        <div class="osTopbar">
          <div class="avatar" data-avatar>2</div>
          <div>Игрок</div>
          <div class="clock" data-clock>--:--</div>
          <div class="bat"><i></i><span data-battext>78%</span></div>
        </div>
        <div class="homeTitle"><h1 data-title>Главное меню</h1><p data-desc>Выберите игру</p></div>
        <div class="homeRow" data-row></div>
        <div class="homeHint">
          <div>стик / стрелки — выбор · A — открыть</div>
          <div>Home — назад в меню · B — отмена</div>
        </div>
      </div>
      <div class="osLayer os-lib" data-layer="library">
        <div class="osTopbar">
          <div class="avatar" data-avatar>2</div>
          <div>Игрок</div>
          <div class="clock" data-clock>--:--</div>
          <div class="bat"><i></i><span data-battext>78%</span></div>
        </div>
        <div class="libHead"><h1>Библиотека</h1><span data-libcount></span></div>
        <div class="libGrid" data-grid></div>
      </div>
      <div class="osLayer os-loader" data-layer="loader">
        <div class="osTopbar">
          <div class="avatar" data-avatar>2</div>
          <div>Game Loader</div>
          <div class="clock" data-clock>--:--</div>
          <div class="bat"><i></i><span data-battext>78%</span></div>
        </div>
          <div class="loaderWrap">
          <div class="dropzone" data-drop tabindex="0">
            <div>
              <div class="big">Перетащите файл игры</div>
              <div class="small">.js с объектом <b>SwitchGame</b>, .json или .txt с параметрами.<br>
              Игра станет картриджем на столе — вставьте его в консоль.</div>
            </div>
          </div>
          <div class="loaderForm" data-form hidden>
            <div class="formInner">
              <div class="cartMock">
                <div class="cmBody">
                  <canvas class="cmLogo" width="162" height="40" data-cplogo></canvas>
                  <div class="cmArt" data-cpart><span>картинка картриджа</span></div>
                  <div class="cmName" data-cpname>Игра</div>
                </div>
              </div>
              <div class="formSide">
                <label class="fld">Название игры
                  <input data-fname type="text" maxlength="40" autocomplete="off" spellcheck="false" aria-label="Название игры">
                </label>
                <div class="fldInfo">
                  <span>Вес: <b data-fsize>—</b></span>
                  <span>Установка: <b data-fdate>—</b></span>
                  <span>Строк кода: <b data-flines>—</b></span>
                </div>
                <label class="chk"><input type="checkbox" data-fos aria-label="Это кастомная ОС (прошивка)"> <span>Это кастомная ОС (прошивка)</span></label>
                <div class="pickRow">
                  <button class="loaderBtn" data-pick="cart" tabindex="0">Картинка картриджа</button>
                  <button class="loaderBtn" data-pick="menu" tabindex="0">Картинка в меню</button>
                </div>
                <div class="menuPrev" data-menuprev><span>картинка меню</span></div>
                <div class="pickRow">
                  <button class="loaderBtn primary" data-add tabindex="0">Добавить картридж</button>
                  <button class="loaderBtn" data-cancel tabindex="0">Отмена</button>
                </div>
              </div>
            </div>
          </div>
          <div class="loaderSide">
            <h2>Формат файла</h2>
            <div class="loaderCode" data-code></div>
            <button class="loaderBtn" data-template tabindex="0">Скачать шаблон игры</button>
            <h2>Загружено</h2>
            <div class="loaderList" data-list></div>
          </div>
        </div>
      </div>
      <div class="osLayer os-game" data-layer="game"><canvas width="1280" height="720" data-game></canvas></div>
      <div class="osLayer os-settings" data-layer="settings">
        <div class="osTopbar">
          <div class="avatar" data-avatar>2</div>
          <div>Настройки</div>
          <div class="clock" data-clock>--:--</div>
          <div class="bat"><i></i><span data-battext>78%</span></div>
        </div>
        <h1>Настройки</h1>
        <div data-setrows></div>
        <div class="setFoot">
          Консоль: Switch 2, 7.9" OLED, 256 ГБ · Joy-Con 2 на магнитах<br>
          Симулятор работает полностью локально: без сети и внешних файлов.
        </div>
      </div>
      <div class="osLayer os-welcome" data-layer="welcome">
        <div class="welcomeLeft">
          <canvas class="welcomeMark" width="420" height="420" data-wmark></canvas>
          <div class="welcomeBrand">Nintendo Switch 2</div>
        </div>
        <div class="welcomeForm">
          <h2 data-wtitle>Создайте аккаунт</h2>
          <p class="welcomeSub" data-wsub>Аккаунт Nintendo нужен для eShop и сохранения прогресса.</p>
          <label class="wFld">Логин
            <input data-wlogin type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="например, Player One" aria-label="Логин">
          </label>
          <label class="wFld">Пароль
            <input data-wpass type="password" maxlength="32" autocomplete="off" placeholder="минимум 4 символа" aria-label="Пароль">
          </label>
          <div class="wAvatarRow">
            <span>Аватар (необязательно)</span>
            <div class="wAvatars" data-wavatars></div>
          </div>
          <div class="wErr" data-werr></div>
          <button class="loaderBtn primary" data-wsubmit>Создать аккаунт</button>
          <button class="wLink" data-wswitch>У меня уже есть аккаунт</button>
        </div>
      </div>
      <div class="osLayer os-shop" data-layer="shop">
        <div class="osTopbar">
          <div class="avatar" data-avatar>2</div>
          <div data-user>Игрок</div>
          <div class="clock" data-clock>--:--</div>
          <div class="bat"><i></i><span data-battext>78%</span></div>
        </div>
        <div class="shopHead">
          <div>
            <h1>Nintendo eShop</h1>
            <p data-shopnote>Публикации всех аккаунтов сети</p>
          </div>
          <button class="loaderBtn primary" data-publish>Выложить</button>
        </div>
        <div class="shopTabs" data-tabs></div>
        <div class="shopGrid" data-shopgrid></div>
        <div class="shopFoot">
          <span data-shopmem></span>
          <div class="shopLinks">
            <button data-export>Сохранить файл сети</button>
            <button data-import>Загрузить файл</button>
          </div>
        </div>
      </div>
      <div class="osLayer os-terminal" data-layer="insertCard">
        <div class="term" data-term></div>
      </div>
      <div class="osModal" data-modal hidden></div>
      <div class="os-flash" data-flash></div>
    `;

    // заставка
    const mk = root.querySelector('.mark');
    const mctx = mk.getContext('2d');
    U.drawMark(mctx, 150, 150, 2.4, {});
    const wm = root.querySelector('.welcomeMark');
    if (wm) U.drawMark(wm.getContext('2d'), 210, 210, 1.05, {});
    const word = root.querySelector('.word');
    word.style.color = '#9fb2c4';

    // логотип на макете картриджа
    const cpLogo = root.querySelector('[data-cplogo]');
    if (cpLogo) {
      const lctx = cpLogo.getContext('2d');
      U.drawMark(lctx, 26, 20, 0.26, {});
      lctx.fillStyle = '#28323d';
      lctx.font = '700 10px "Segoe UI",system-ui,sans-serif';
      lctx.textAlign = 'left';
      lctx.fillText('NINTENDO SWITCH 2', 54, 24);
    }

    // демонстрационный код в лоадере
    const codeEl = root.querySelector('[data-code]');
    if (codeEl) {
      codeEl.textContent = `//#name: Моя игра\n//#author: Вы\n\nvar SwitchGame = {\n  start(api){ this.x = 640; this.y = 360; },\n  update(dt, api){\n    if(api.held('left'))  this.x -= 420*dt;\n    if(api.held('right')) this.x += 420*dt;\n    if(api.held('up'))    this.y -= 420*dt;\n    if(api.held('down'))  this.y += 420*dt;\n  },\n  draw(ctx, api){\n    ctx.fillStyle = '#08131c';\n    ctx.fillRect(0,0,api.width,api.height);\n    ctx.beginPath();\n    ctx.arc(this.x, this.y, 26, 0, 6.283);\n    ctx.fillStyle = '#19c3e8';\n    ctx.fill();\n  }\n};`;
    }

    gameCanvas = root.querySelector('[data-game]');
    gameCtx = gameCanvas.getContext('2d');

    // обработчики
    const dz = root.querySelector('[data-drop]');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.js,.json,.txt';
    fileInput.setAttribute('aria-label', 'Файл игры для Game Loader');
    fileInput.tabIndex = -1;
    fileInput.style.display = 'none';
    root.appendChild(fileInput);

    dz.addEventListener('click', () => fileInput.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('hot'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('hot'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('hot');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readGameFile(f);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) readGameFile(fileInput.files[0]);
      fileInput.value = '';
    });

    root.querySelector('[data-template]').addEventListener('click', downloadTemplate);

    // картинки картриджа и меню
    const imgCart = document.createElement('input');
    imgCart.type = 'file';
    imgCart.accept = 'image/*';
    imgCart.style.display = 'none';
    imgCart.setAttribute('aria-label', 'Картинка картриджа');
    root.appendChild(imgCart);

    const imgMenu = document.createElement('input');
    imgMenu.type = 'file';
    imgMenu.accept = 'image/*';
    imgMenu.style.display = 'none';
    imgMenu.setAttribute('aria-label', 'Картинка в меню');
    root.appendChild(imgMenu);

    const nameEl = root.querySelector('[data-fname]');
    nameEl.addEventListener('input', () => {
      if (!pending) return;
      pending.name = nameEl.value.trim() || pending.meta.name;
      setPreviewName(pending.name);
    });

    root.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!pending) return;
        (btn.dataset.pick === 'cart' ? imgCart : imgMenu).click();
      });
    });

    imgCart.addEventListener('change', () => {
      const f = imgCart.files && imgCart.files[0];
      if (f && pending) readImage(f, (url) => { pending.cartImg = url; drawCartPreview(); });
      imgCart.value = '';
    });
    imgMenu.addEventListener('change', () => {
      const f = imgMenu.files && imgMenu.files[0];
      if (f && pending) readImage(f, (url) => { pending.menuImg = url; drawMenuPreview(); });
      imgMenu.value = '';
    });

    root.querySelector('[data-add]').addEventListener('click', commitPending);
    root.querySelector('[data-cancel]').addEventListener('click', cancelPending);

    // первый запуск и аккаунты
    root.querySelector('[data-wsubmit]').addEventListener('click', submitWelcome);
    root.querySelector('[data-wswitch]').addEventListener('click', () => {
      welcomeMode = welcomeMode === 'register' ? 'login' : 'register';
      renderWelcome();
      Sfx.move();
    });
    root.querySelectorAll('[data-wlogin],[data-wpass]').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitWelcome(); });
    });

    const mkFile = (attr, accept, label) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept;
      inp.style.display = 'none';
      inp.setAttribute('aria-label', label || 'Файл');
      inp.setAttribute(attr, '');
      root.appendChild(inp);
      return inp;
    };

    const avFile = mkFile('data-avfile', 'image/*', 'Аватар');
    avFile.addEventListener('change', () => {
      const f = avFile.files && avFile.files[0];
      if (f) shrinkImage(f, 96, (url) => { welcomeAvatar = url; renderAvatars(); });
      avFile.value = '';
    });

    const pubFile = mkFile('data-pubfile', 'image/*', 'Картинка публикации');
    const netFile = mkFile('data-netfile', '.json,application/json', 'Файл сети eShop');
    netFile.addEventListener('change', () => {
      const f = netFile.files && netFile.files[0];
      if (f) importNet(f);
      netFile.value = '';
    });

    // eShop
    root.querySelector('[data-publish]').addEventListener('click', openPublish);
    root.querySelector('[data-export]').addEventListener('click', exportNet);
    root.querySelector('[data-import]').addEventListener('click', () => netFile.click());

    // кастомная ОС в форме загрузчика
    const osChk = root.querySelector('[data-fos]');
    if (osChk) osChk.addEventListener('change', () => { if (pending) pending.customOs = osChk.checked; });

    setClock();
    setInterval(setClock, 15000);
  }

  function setClock() {
    if (!root) return;
    const d = new Date();
    const t = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    root.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = t; });
  }

  function setBattery(pct, charging) {
    if (!root) return;
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    const ch = !!charging;
    if (p === batShown && ch === batCharging) return;
    batShown = p;
    batCharging = ch;
    root.querySelectorAll('.bat').forEach((el) => {
      el.classList.toggle('charging', ch);
      el.classList.toggle('low', p <= 15);
      const fill = el.querySelector('i');
      if (fill) fill.style.setProperty('--p', String(Math.max(0, Math.min(1, p / 100))));
      const txt = el.querySelector('[data-battext]');
      if (txt) txt.textContent = p + '%';
    });
  }

  function show(name) {
    layer = name;
    if (window.Dev && Dev.on) Dev.log('Консоль: экран «' + Dev.layerName(name) + '»');
    if (!root) return;
    root.querySelectorAll('.osLayer').forEach((el) => {
      el.classList.toggle('on', el.dataset.layer === name);
    });
    if (name !== 'boot') {
      const boot = root.querySelector('.os-boot');
      if (boot) boot.classList.remove('play');
    }
  }

  /* ------------------------------ домашний экран ------------------------------ */
  function renderHome(animate) {
    const row = root.querySelector('[data-row]');
    const apps = appDefs();
    focus = U.clamp(focus, 0, apps.length - 1);
    row.innerHTML = apps.map((a, i) => `
      <button class="tile${i === focus ? ' sel' : ''}" data-i="${i}" ${a.disabled ? 'data-disabled="1"' : ''} style="--i:${i}">
        <div class="art" style="${a.img
          ? `background-image:url('${a.img}');background-size:cover;background-position:center`
          : `background:radial-gradient(120% 120% at 30% 20%, ${a.color}, #0b0f14)`}">
          ${a.img ? '' : (ICONS[a.icon] || ICONS.box)}
          ${a.disabled ? '<div class="badge">demo</div>' : ''}
        </div>
        <div class="cap">${escapeHtml(a.name)}</div>
      </button>`).join('');
    const a = apps[focus];
    root.querySelector('[data-title]').textContent = a ? a.name : 'Главное меню';
    root.querySelector('[data-desc]').textContent = a ? a.desc : '';
    row.classList.remove('anim');
    if (animate) {
      void row.offsetWidth;
      row.classList.add('anim');
    }
    row.querySelectorAll('.tile').forEach((el) => {
      el.addEventListener('click', () => {
        focus = +el.dataset.i;
        renderHome();
        openSelected();
      });
    });
    const sel = row.querySelector('.tile.sel');
    if (sel) {
      const targetLeft = sel.offsetLeft - row.clientWidth / 2 + sel.offsetWidth / 2;
      row.scrollLeft = Math.max(0, targetLeft);
    }
    userbar();
  }

  function renderLibrary() {
    const grid = root.querySelector('[data-grid]');
    const games = libraryGames();
    root.querySelector('[data-libcount]').textContent = games.length + ' игр(ы)';
    if (!games.length) {
      grid.innerHTML = '<div class="libEmpty">Пока пусто. Откройте Game Loader и загрузите игру.</div>';
      return;
    }
    grid.innerHTML = games.map((g, i) => {
      const size = g.sys ? 1200 : g.sizeMB;
      const last = g.sys ? null : g.lastPlayed;
      return `
      <button class="libCard${i === focus ? ' sel' : ''}" data-i="${i}">
        <div class="cover" style="${g.menuImg
          ? `background-image:url('${g.menuImg}');background-size:cover;background-position:center`
          : `background:radial-gradient(120% 120% at 30% 10%, ${g.sys ? '#0e2a3a' : '#10202a'}, #0a0d12)`}">
          ${g.menuImg ? '' : ICONS[g.sys ? 'rocket' : 'cart']}
        </div>
        <div class="name">${escapeHtml(g.name)}</div>
        <div class="sub">${g.sys ? 'система' : 'картридж'} · ${sizeLabel(size)}${last ? ' · запуск ' + dateLabel(last) : ' · не запускалась'}</div>
      </button>`;
    }).join('');
    grid.querySelectorAll('.libCard').forEach((el) => {
      el.addEventListener('click', () => { focus = +el.dataset.i; renderLibrary(); openLibraryItem(); });
    });
  }

  function renderLoaderList() {
    const list = root.querySelector('[data-list]');
    if (!loaderFiles.length) {
      list.innerHTML = '<div class="loaderRow" style="opacity:.5"><span class="nm">пока ничего не загружено</span></div>';
      return;
    }
    list.innerHTML = loaderFiles.map((f) => `
      <div class="loaderRow">
        <span class="nm">${escapeHtml(f.name)}</span>
        <span class="sz">${sizeLabel(f.sizeMB)}</span>
        <span class="tag">${f.os ? 'прошивка' : f.installed ? 'в библиотеке' : f.cart ? 'картридж' : 'загрузка'}</span>
      </div>`).join('');
  }

  state.hints = true;

  function settingRows() {
    const acc = Store.current();
    const mem = memInfo();
    const fw = Firmware.active();
    const wifi = World.wifiInfo();
    const rows = [
      { key: 'account', label: 'Аккаунт', text: acc ? acc.login : 'не выбран' },
      { key: 'wifi', label: 'Wi-Fi', text: World.isOnline() ? 'подключено · ' + wifi.ssid : (wifi.mounted ? 'не подключено' : 'роутер не установлен') },
      { key: 'memory', label: 'Память', text: sizeLabel(mem.used) + ' из ' + sizeLabel(mem.total) + ' · свободно ' + sizeLabel(mem.free) },
      { key: 'system', label: 'Система', text: fw.name + ' ' + fw.version + ' · ' + sizeLabel(fw.weightMB) },
      { key: 'sound', label: 'Звук', text: Sfx.enabled ? 'включён' : 'выключен' },
      { key: 'hint', label: 'Подсказки на столе', text: state.hints ? 'включены' : 'выключены' },
    ];
    if (!Store.unlocked()) rows.push({ key: 'unlock', label: 'Разблокировать загрузчик', text: 'нужен пароль аккаунта' });
    else rows.push({ key: 'installOs', label: 'Поставить кастомную ОС', text: 'терминал INSERT CARD' });
    if (Store.firmwareText()) rows.push({ key: 'stockOs', label: 'Вернуть заводскую прошивку', text: 'удалить кастомную ОС' });
    for (const s of fw.settings) {
      const val = fwValue(s);
      rows.push({
        key: 'fw:' + s.key,
        label: s.label,
        text: s.type === 'bool' ? (val ? 'включено' : 'выключено') : String(val || '—'),
        fw: s,
      });
    }
    rows.push({ key: 'resetJc', label: 'Joy-Con 2', text: 'вернуть на магниты' });
    rows.push({ key: 'wipe', label: 'Стереть прогресс', text: 'приставка, игры, прошивка — заново' });
    rows.push({ key: 'factory', label: 'Сбросить до заводских', text: 'как при первом запуске' });
    return rows;
  }

  function renderSettings() {
    const rows = settingRows();
    focus = U.clamp(focus, 0, rows.length - 1);
    const box = root.querySelector('[data-setrows]');
    box.innerHTML = rows.map((s, i) => `
      <div class="setRow${i === focus ? ' sel' : ''}${s.key === 'installOs' ? ' hot' : ''}" data-i="${i}">
        <b class="k">${escapeHtml(s.label)}</b><span>${escapeHtml(s.text)}</span>
      </div>`).join('');
    box.querySelectorAll('.setRow').forEach((el) => {
      el.addEventListener('click', () => { focus = +el.dataset.i; renderSettings(); activateSetting(); });
    });
    const sel = box.querySelector('.setRow.sel');
    if (sel && box.scrollHeight > box.clientHeight + 2) {
      try { sel.scrollIntoView({ block: 'nearest' }); } catch (err) { /* старые движки */ }
    }
  }

  function activateSetting() {
    const rows = settingRows();
    const s = rows[focus];
    if (!s) return;
    Sfx.ok();
    if (s.key === 'sound') { Sfx.setEnabled(!Sfx.enabled); renderSettings(); return; }
    if (s.key === 'hint') { state.hints = !state.hints; renderSettings(); return; }
    if (s.key === 'resetJc') { World.resetJoycons(); Sfx.attach('L'); flashText('Joy-Con 2 вернулись на магниты'); renderSettings(); return; }
    if (s.key === 'account') { openAccountModal(); return; }
    if (s.key === 'wifi') { openWifiModal(); return; }
    if (s.key === 'memory') { openMemoryModal(); return; }
    if (s.key === 'system') { openSystemModal(); return; }
    if (s.key === 'unlock') { openUnlockModal(); return; }
    if (s.key === 'installOs') { openTerminal(); return; }
    if (s.key === 'stockOs') { openStockOsModal(); return; }
    if (s.key === 'wipe') { openWipeModal(); return; }
    if (s.key === 'factory') { openFactoryModal(); return; }
    if (s.key.indexOf('fw:') === 0) { toggleFwSetting(s.fw); return; }
  }

  /* ------------------------------ навигация ------------------------------ */
  function openSelected() {
    const apps = appDefs();
    const a = apps[focus];
    if (!a) return;
    if (a.disabled) { Sfx.error(); flashText('Этот раздел в симуляторе недоступен'); return; }
    Sfx.ok();
    if (a.id === 'library') { focus = 0; show('library'); renderLibrary(); return; }
    if (a.id === 'loader') { show('loader'); renderLoaderList(); return; }
    if (a.id === 'shop') { shopFocus = 0; show('shop'); renderShop(); return; }
    if (a.id === 'settings') { focus = 0; show('settings'); renderSettings(); return; }
    startGame(a.id);
  }

  function openLibraryItem() {
    const games = libraryGames();
    const g = games[focus];
    if (!g) return;
    Sfx.ok();
    startGame(g.id);
  }

  function flashText(t) {
    if (window.App && App.toast) App.toast(t);
  }

  /* ------------------------------ игры ------------------------------ */
  function clearGameCanvas() {
    if (!gameCanvas || !gameCtx) return;
    try {
      gameCtx.save();
      gameCtx.setTransform(1, 0, 0, 1, 0, 0);
      gameCtx.globalAlpha = 1;
      gameCtx.fillStyle = '#05070a';
      gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      gameCtx.restore();
    } catch (e) { /* канвас ещё не готов */ }
  }

  function startGame(id) {
    const entry = id === 'space' ? null : Library.get(id);
    if (entry) { entry.lastPlayed = Date.now(); persistLibrary(); }
    currentGameId = id;
    show('game');
    clearGameCanvas();
    game = GameRuntime.create(id, entry, gameCanvas, gameCtx);
    if (game) game.start();
  }

  function stopGame() {
    if (game && game.destroy) game.destroy();
    game = null;
    currentGameId = null;
    held.clear();
    pressed.clear();
    clearGameCanvas();
  }

  function goHome() {
    stopGame();
    show('home');
    renderHome();
    Sfx.back();
  }

  /* ------------------------------ ввод ------------------------------ */
  const NAV = {
    home: { left: () => { focus--; Sfx.move(); renderHome(); }, right: () => { focus++; Sfx.move(); renderHome(); }, up: () => {}, down: () => {} },
  };

  function press(action, fromPad) {
    if (!root) return;
    held.add(action);
    pressed.add(action);
    if (fromPad) {
      clearTimeout(padTimers.get(action));
      padTimers.set(action, setTimeout(() => held.delete(action), 170));
    }

    if (modalOpen) {
      if (action === 'back' || action === 'b' || action === 'home') { closeModal(); Sfx.back(); }
      return;
    }

    if (layer === 'game') {
      if (action === 'home') goHome();
      return;
    }

    if (layer === 'home') {
      const apps = appDefs();
      if (action === 'left') { focus = (focus - 1 + apps.length) % apps.length; Sfx.move(); renderHome(); }
      else if (action === 'right') { focus = (focus + 1) % apps.length; Sfx.move(); renderHome(); }
      else if (action === 'ok' || action === 'a') openSelected();
      else if (action === 'home') { Sfx.back(); }
      else if (action === 'back' || action === 'b') { Sfx.back(); }
      else if (action === 'settings') { openSettingsFromAnywhere('settings'); }
      return;
    }

    if (layer === 'library') {
      const n = libraryGames().length;
      if (action === 'left') { focus = (focus - 1 + n) % n; Sfx.move(); renderLibrary(); }
      else if (action === 'right') { focus = (focus + 1) % n; Sfx.move(); renderLibrary(); }
      else if (action === 'up') { focus = Math.max(0, focus - 4); Sfx.move(); renderLibrary(); }
      else if (action === 'down') { focus = Math.min(n - 1, focus + 4); Sfx.move(); renderLibrary(); }
      else if (action === 'ok' || action === 'a') openLibraryItem();
      else if (action === 'back' || action === 'b' || action === 'home') goHome();
      return;
    }

    if (layer === 'welcome') return;

    if (layer === 'settings') {
      const n = settingRows().length;
      if (action === 'up') { focus = Math.max(0, focus - 1); Sfx.move(); renderSettings(); }
      else if (action === 'down') { focus = Math.min(n - 1, focus + 1); Sfx.move(); renderSettings(); }
      else if (action === 'ok' || action === 'a') activateSetting();
      else if (action === 'back' || action === 'b' || action === 'home') goHome();
      return;
    }

    if (layer === 'shop') {
      if (action === 'back' || action === 'b' || action === 'home') { goHome(); return; }
      const items = shopItems();
      if (!items.length) return;
      if (action === 'left') { shopFocus = (shopFocus - 1 + items.length) % items.length; Sfx.move(); renderShop(); }
      else if (action === 'right') { shopFocus = (shopFocus + 1) % items.length; Sfx.move(); renderShop(); }
      else if (action === 'up') { shopFocus = (shopFocus - 3 + items.length) % items.length; Sfx.move(); renderShop(); }
      else if (action === 'down') { shopFocus = Math.min(items.length - 1, shopFocus + 3); Sfx.move(); renderShop(); }
      else if (action === 'ok' || action === 'a') { const it = items[shopFocus]; if (it) downloadPublished(it); }
      return;
    }

    if (layer === 'insertCard') {
      if ((action === 'back' || action === 'b' || action === 'home') && !installing) goHome();
      return;
    }

    if (layer === 'loader') {
      if (action === 'ok' || action === 'a') root.querySelector('[data-drop]').click();
      else if (action === 'back' || action === 'b' || action === 'home') goHome();
      return;
    }
  }

  function openSettingsFromAnywhere() {
    if (layer === 'home') { show('settings'); focus = 0; renderSettings(); }
  }

  function release(action) {
    held.delete(action);
    clearTimeout(padTimers.get(action));
  }

  /* ------------------------------ загрузка игр ------------------------------ */
  function readImage(file, done) {
    if (!/^image\//.test(file.type)) { flashText('Это не картинка'); Sfx.error(); return; }
    const fr = new FileReader();
    fr.onload = () => done(String(fr.result || ''));
    fr.onerror = () => Sfx.error();
    fr.readAsDataURL(file);
  }

  function setPreviewName(name) {
    const el = root.querySelector('[data-cpname]');
    if (el) el.textContent = name;
  }

  function drawCartPreview() {
    const art = root.querySelector('[data-cpart]');
    if (!art) return;
    if (pending && pending.cartImg) {
      art.style.backgroundImage = `url('${pending.cartImg}')`;
      art.classList.add('has');
    } else {
      art.style.backgroundImage = '';
      art.classList.remove('has');
    }
  }

  function drawMenuPreview() {
    const el = root.querySelector('[data-menuprev]');
    if (!el) return;
    if (pending && pending.menuImg) {
      el.style.backgroundImage = `url('${pending.menuImg}')`;
      el.classList.add('has');
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('has');
    }
  }

  function openLoaderForm(p) {
    pending = p;
    pending.customOs = !!p.customOs;
    root.querySelector('[data-drop]').hidden = true;
    root.querySelector('[data-form]').hidden = false;
    root.querySelector('[data-fname]').value = p.name;
    root.querySelector('[data-fsize]').textContent = sizeLabel(p.sizeMB);
    root.querySelector('[data-flines]').textContent = String(p.lines);
    root.querySelector('[data-fdate]').textContent = dateLabel(Date.now());
    const osChk = root.querySelector('[data-fos]');
    if (osChk) osChk.checked = !!p.customOs;
    setPreviewName(p.name);
    drawCartPreview();
    drawMenuPreview();
  }

  function closeLoaderForm() {
    pending = null;
    const drop = root.querySelector('[data-drop]');
    const form = root.querySelector('[data-form]');
    if (drop) drop.hidden = false;
    if (form) form.hidden = true;
  }

  function commitPending() {
    if (!pending) return;
    const name = (pending.name || pending.meta.name || 'Игра').slice(0, 40);
    const mem = memInfo();
    if (pending.sizeMB > mem.free) {
      Sfx.error();
      flashText('Не хватает памяти: нужно ' + sizeLabel(pending.sizeMB) + ', свободно ' + sizeLabel(mem.free));
      return;
    }
    if (pending.customOs) {
      const fw = Firmware.parse(pending.text || '');
      if (!fw.valid) {
        Sfx.error();
        flashText('В файле нет объекта SwitchFirmware — это не прошивка');
        return;
      }
      const id = 'os' + Date.now().toString(36);
      const cart = World.addCart(name, id, {
        img: pending.cartImg,
        menuImg: pending.menuImg,
        customOs: true,
        firmwareText: pending.text,
        sizeMB: pending.sizeMB,
      });
      loaderFiles.push({ name, id, cart: true, installed: false, sizeMB: pending.sizeMB, os: true });
      renderLoaderList();
      Sfx.cart();
      World.ripple(cart.x, cart.y, '#b06bff');
      flashText('Картридж прошивки «' + name + '» появился на столе');
      if (window.App) App.toast('Прошивка — вставьте картридж в терминале установки', 'cyan');
      closeLoaderForm();
      return;
    }
    const entry = Library.add({
      name,
      author: pending.meta.author || 'вы',
      desc: pending.meta.desc || '',
      kind: pending.meta.kind || 'demo',
      code: pending.meta.code,
      sizeMB: pending.sizeMB,
      img: pending.cartImg,
      menuImg: pending.menuImg,
      addedAt: Date.now(),
    });
    const cart = World.addCart(entry.name, entry.id, { img: entry.img, menuImg: entry.menuImg });
    entry.cart = true;
    persistLibrary();
    loaderFiles.push({ name: entry.name, id: entry.id, cart: true, installed: false, sizeMB: entry.sizeMB });
    renderLoaderList();
    Sfx.cart();
    World.ripple(cart.x, cart.y, '#f2c14e');
    flashText('Картридж «' + entry.name + '» появился на столе');
    if (window.App) App.toast('Картридж «' + entry.name + '» — вставьте его в консоль', 'cyan');
    closeLoaderForm();
  }

  function cancelPending() {
    if (!pending) return;
    closeLoaderForm();
    Sfx.back();
    flashText('Загрузка отменена');
  }

  function loadGameText(filename, text) {
    const meta = parseMeta(filename, text);
    const lines = Math.max(1, text.split(/\r?\n/).length);
    openLoaderForm({
      meta,
      name: meta.name,
      lines,
      sizeMB: lines * 100,
      cartImg: null,
      menuImg: null,
      text,
    });
  }

  function readGameFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadGameText(file.name, String(reader.result || ''));
        Sfx.ok();
      } catch (err) {
        Sfx.error();
        flashText('Не получилось прочитать файл: ' + err.message);
      }
    };
    reader.onerror = () => Sfx.error();
    reader.readAsText(file, 'utf-8');
  }

  function parseMeta(filename, text) {
    const base = filename.replace(/\.[^.]+$/, '');
    const meta = { name: base, author: 'вы', desc: '', kind: 'demo', code: null };

    const t = text.trim();
    if (/^[\[{]/.test(t)) {
      try {
        const j = JSON.parse(t);
        if (j && typeof j === 'object') {
          meta.name = j.name || j.title || base;
          meta.author = j.author || meta.author;
          meta.desc = j.desc || j.description || '';
          if (j.code) { meta.code = String(j.code); meta.kind = 'js'; }
        }
      } catch (e) { /* не json — идём дальше */ }
    }

    const lines = text.split(/\r?\n/).slice(0, 40);
    for (const line of lines) {
      const m = line.match(/^\s*\/\/\s*#\s*(name|title|author|desc|description)\s*:\s*(.+)$/i);
      if (m) {
        const k = m[1].toLowerCase();
        const v = m[2].trim();
        if (k === 'name' || k === 'title') meta.name = v;
        else if (k === 'author') meta.author = v;
        else meta.desc = v;
      }
    }

    if (/SwitchGame\s*=/.test(text)) {
      meta.kind = 'js';
      meta.code = text;
    } else if (/^\s*(function|const|let|var|class)\s/m.test(text) && text.length > 40) {
      meta.kind = 'js';
      meta.code = text;
    }

    if (meta.name.length > 40) meta.name = meta.name.slice(0, 40);
    return meta;
  }

  function downloadTemplate() {
    const src = `//#name: Поймай звезду
//#author: MultiTool
//#desc: Пример игры для Switch 2. Управление: стик или стрелки.

var SwitchGame = {
  start: function (api) {
    this.x = api.width / 2;
    this.y = api.height / 2;
    this.t = 0;
  },
  update: function (dt, api) {
    this.t += dt;
    var sp = 460 * dt;
    if (api.held('left'))  this.x -= sp;
    if (api.held('right')) this.x += sp;
    if (api.held('up'))    this.y -= sp;
    if (api.held('down'))  this.y += sp;
    this.x = Math.max(30, Math.min(api.width - 30, this.x));
    this.y = Math.max(30, Math.min(api.height - 30, this.y));
  },
  draw: function (ctx, api) {
    ctx.fillStyle = '#08121a';
    ctx.fillRect(0, 0, api.width, api.height);
    for (var i = 0; i < 60; i++) {
      var sx = (i * 211) % api.width;
      var sy = (i * 137 + this.t * 40) % api.height;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#7fd8ff';
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(this.x - 8, this.y - 10, 4, this.x, this.y, 30);
    g.addColorStop(0, '#bff3ff');
    g.addColorStop(1, '#19c3e8');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#cfe6f2';
    ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Поймай звезду', api.width / 2, 60);
  }
};
`;
    const blob = new Blob([src], { type: 'text/javascript;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-switch-game.js';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    App.toast('Шаблон игры скачан — закиньте его в Game Loader', 'cyan');
  }

  function onCartInsert(payload) {
    const cart = payload && payload.cart ? payload.cart : null;
    const gameId = payload && payload.gameId ? payload.gameId : payload;
    if (cart && (cart.customOs || cart.stockFw)) return handleFirmwareCart(cart);
    let g = Library.get(gameId);
    if (!g && cart && cart.phys) {
      g = Library.add({
        name: cart.name,
        author: cart.author || 'eShop',
        desc: cart.desc || '',
        kind: 'js',
        code: cart.code || null,
        sizeMB: cart.sizeMB || 100,
        img: cart.img || null,
        menuImg: cart.menuImg || null,
        installed: true,
        addedAt: Date.now(),
        pubId: cart.pubId || null,
      });
      persistLibrary();
    }
    if (g) {
      g.installed = true;
      persistLibrary();
      const f = loaderFiles.find((x) => x.id === gameId);
      if (f) { f.installed = true; f.cart = false; }
      if (fwFlag('autoRun')) {
        setTimeout(() => {
          if (layer === 'home' && World.state.powered) startGame(g.id);
        }, 600);
      }
    }
    if (layer === 'loader') renderLoaderList();
    if (layer === 'home') renderHome();
    if (layer === 'library') renderLibrary();
    return false;
  }

  function onCartEject(payload) {
    const gameId = payload && payload.gameId ? payload.gameId : payload;
    const g = Library.get(gameId);
    if (g) {
      g.installed = false;
      persistLibrary();
      const f = loaderFiles.find((x) => x.id === gameId);
      if (f) { f.installed = false; f.cart = true; }
    }
    if (layer === 'library') renderLibrary();
    if (layer === 'home') renderHome();
  }

  function flash(side) {
    const el = root && root.querySelector('[data-flash]');
    if (!el) return;
    el.classList.remove('go');
    el.classList.toggle('red', side === 'R');
    void el.offsetWidth;
    el.classList.add('go');
  }

  /* ------------------------------ аккаунт ------------------------------ */
  function userbar() {
    if (!root) return;
    const acc = Store.current();
    const name = acc ? acc.login : 'Игрок';
    root.querySelectorAll('[data-user]').forEach((el) => { el.textContent = name; });
    root.querySelectorAll('[data-avatar]').forEach((el) => {
      el.classList.remove('hasImg');
      el.innerHTML = '';
      el.style.background = '';
      if (acc && acc.avatar && /^data:image\//.test(acc.avatar)) {
        const img = document.createElement('img');
        img.src = acc.avatar;
        img.alt = '';
        el.appendChild(img);
        el.classList.add('hasImg');
        return;
      }
      const m = acc && /^grad:(\d)$/.exec(acc.avatar || '');
      const gi = m ? (+m[1] - 1) : 0;
      el.style.background = AV_GRADS[gi] || '';
      el.textContent = (name || '?').trim().charAt(0).toUpperCase();
    });
  }

  /* ------------------------------ прошивка ------------------------------ */
  function memInfo() {
    return Store.memory(Firmware.active().source);
  }

  function fwValue(s) {
    const v = Store.fwSetting(s.key);
    if (v !== undefined) return s.type === 'bool' ? !!v : v;
    if (s.value !== undefined) return s.type === 'bool' ? !!s.value : s.value;
    if (s.key === 'autoRun') return Firmware.active().autoRun;
    return false;
  }

  function fwFlag(key) {
    return !!fwValue({ key, type: 'bool' });
  }

  function toggleFwSetting(s) {
    if (s.type === 'bool') {
      Store.fwSetting(s.key, !fwValue(s));
      applyFirmware();
      renderSettings();
      return;
    }
    showModal({
      title: s.label,
      html: '<label class="wFld">Значение<input data-fwval type="text" aria-label="Значение настройки" value="' + escapeAttr(String(fwValue(s) || '')) + '"></label>',
      actions: [
        { label: 'Отмена' },
        { label: 'Сохранить', primary: true, onClick: (m) => {
          Store.fwSetting(s.key, m.querySelector('[data-fwval]').value.slice(0, 60));
          applyFirmware();
          renderSettings();
        } },
      ],
      focus: '[data-fwval]',
    });
  }

  function applyFirmware() {
    if (!root) return;
    const fw = Firmware.active();
    root.style.setProperty('--accent', fw.accent || '#19c3e8');
    const home = root.querySelector('.os-home');
    if (home) {
      home.style.background = fw.wallpaper || '';
      home.classList.toggle('rgb', fwFlag('rgb'));
    }
    const word = root.querySelector('.os-boot .word');
    if (word) word.textContent = fw.isDefault ? 'Nintendo Switch 2' : fw.name;
  }

  /* ------------------------------ модальные окна ------------------------------ */
  function showModal(cfg) {
    const m = root.querySelector('[data-modal]');
    modalOpen = true;
    m.hidden = false;
    if (window.Dev && Dev.on) Dev.log('Окно: «' + (cfg.title || 'без названия') + '»');
    m.innerHTML = '<div class="modalBox">' +
      '<h3>' + escapeHtml(cfg.title || '') + '</h3>' +
      (cfg.text ? '<p class="modalText">' + escapeHtml(cfg.text) + '</p>' : '') +
      '<div class="modalBody">' + (cfg.html || '') + '</div>' +
      '<div class="modalRow">' + (cfg.actions || []).map((a, i) =>
        '<button class="loaderBtn' + (a.primary ? ' primary' : '') + '" data-mact="' + i + '">' + escapeHtml(a.label) + '</button>').join('') + '</div>' +
      '</div>';
    m.querySelectorAll('[data-mact]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = cfg.actions[+btn.dataset.mact];
        if (a && window.Dev && Dev.on) Dev.log('Действие: «' + a.label + '»');
        closeModal();
        if (a && a.onClick) a.onClick(m);
      });
    });
    if (cfg.onOpen) cfg.onOpen(m);
    if (cfg.focus) {
      const el = m.querySelector(cfg.focus);
      if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    }
    Sfx.ok();
  }

  function closeModal() {
    const m = root.querySelector('[data-modal]');
    modalOpen = false;
    if (m) m.hidden = true;
  }

  /* ------------------------------ первый запуск ------------------------------ */
  function showWelcome(mode) {
    welcomeMode = mode || 'register';
    welcomeAvatar = null;
    const loginEl = root.querySelector('[data-wlogin]');
    const passEl = root.querySelector('[data-wpass]');
    if (loginEl) loginEl.value = '';
    if (passEl) passEl.value = '';
    show('welcome');
    renderWelcome();
  }

  function renderWelcome() {
    const isReg = welcomeMode === 'register';
    root.querySelector('[data-wtitle]').textContent = isReg ? 'Создайте аккаунт' : 'Вход в аккаунт';
    root.querySelector('[data-wsub]').textContent = isReg
      ? 'Аккаунт Nintendo нужен для eShop и сохранения прогресса.'
      : 'Введите логин и пароль аккаунта Nintendo.';
    root.querySelector('[data-wsubmit]').textContent = isReg ? 'Создать аккаунт' : 'Войти';
    root.querySelector('[data-wswitch]').textContent = isReg ? 'У меня уже есть аккаунт' : 'Создать новый аккаунт';
    root.querySelector('[data-werr]').textContent = '';
    root.querySelector('[data-wavatars]').hidden = !isReg;
    renderAvatars();
    const loginEl = root.querySelector('[data-wlogin]');
    if (loginEl) { try { loginEl.focus({ preventScroll: true }); } catch (e) { loginEl.focus(); } }
  }

  function renderAvatars() {
    const av = root.querySelector('[data-wavatars]');
    if (!av) return;
    const cur = welcomeAvatar || '';
    const isImg = /^data:image\//.test(cur);
    av.innerHTML = AV_GRADS.map((g, i) =>
      '<button class="wAv' + (cur === 'grad:' + (i + 1) ? ' on' : '') + '" data-grad="' + (i + 1) + '" style="background:' + g + '" type="button" aria-label="Аватар ' + (i + 1) + '"></button>').join('') +
      '<button class="wAv up' + (isImg ? ' on' : '') + '" data-avup type="button" aria-label="Загрузить фото"' +
      (isImg ? ' style="background-image:url(\'' + cur + '\')"' : '') + '>' + (isImg ? '' : '+') + '</button>';
    av.querySelectorAll('[data-grad]').forEach((b) => b.addEventListener('click', () => {
      welcomeAvatar = 'grad:' + b.dataset.grad;
      renderAvatars();
    }));
    av.querySelector('[data-avup]').addEventListener('click', () => {
      const inp = root.querySelector('[data-avfile]');
      if (inp) inp.click();
    });
  }

  function submitWelcome() {
    const login = root.querySelector('[data-wlogin]').value.trim();
    const pass = root.querySelector('[data-wpass]').value;
    const res = welcomeMode === 'register'
      ? Store.register(login, pass, welcomeAvatar)
      : Store.login(login, pass);
    if (!res.ok) {
      root.querySelector('[data-werr]').textContent = res.error;
      Sfx.error();
      return;
    }
    Sfx.ok();
    userbar();
    applyFirmware();
    show('home');
    focus = 0;
    renderHome(true);
    flashText(welcomeMode === 'register' ? 'Аккаунт «' + login + '» создан' : 'С возвращением, ' + login);
  }

  function rebootWelcome() {
    stopGame();
    applyFirmware();
    showWelcome('register');
    userbar();
  }

  function shrinkImage(file, max, done) {
    if (!file || !/^image\//.test(file.type)) { Sfx.error(); flashText('Это не картинка'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cn = document.createElement('canvas');
        cn.width = Math.max(1, Math.round(img.width * k));
        cn.height = Math.max(1, Math.round(img.height * k));
        cn.getContext('2d').drawImage(img, 0, 0, cn.width, cn.height);
        done(cn.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => Sfx.error();
      img.src = String(fr.result || '');
    };
    fr.onerror = () => Sfx.error();
    fr.readAsDataURL(file);
  }

  /* ------------------------------ eShop ------------------------------ */
  function publishedList() { return Store.published(); }

  function shopItems() {
    return publishedList().filter((p) => (p.section || 'games') === shopSection);
  }

  function showShop() {
    shopFocus = 0;
    show('shop');
    renderShop();
  }

  function sectionLabel(id) {
    const s = SHOP_SECTIONS.find((x) => x.id === id);
    return s ? s.label : id;
  }

  function renderShop() {
    const tabs = root.querySelector('[data-tabs]');
    tabs.innerHTML = SHOP_SECTIONS.map((s) =>
      '<button class="shopTab' + (s.id === shopSection ? ' on' : '') + '" data-sec="' + s.id + '">' + s.label + '</button>').join('');
    tabs.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => {
      shopSection = b.dataset.sec;
      shopFocus = 0;
      renderShop();
      Sfx.move();
    }));

    const items = shopItems();
    shopFocus = U.clamp(shopFocus, 0, Math.max(0, items.length - 1));
    const grid = root.querySelector('[data-shopgrid]');
    if (!items.length) {
      grid.innerHTML = '<div class="shopEmpty">В этом разделе пока пусто. Вставьте картридж в консоль и нажмите «Выложить».</div>';
    } else {
      grid.innerHTML = items.map((it, i) => {
        const own = Store.current() && Store.current().login === it.author;
        const cover = it.menuImg
          ? "background-image:url('" + it.menuImg + "');background-size:cover;background-position:center"
          : 'background:radial-gradient(120% 120% at 30% 15%, #1b1030, #0b0e13)';
        const icon = it.menuImg ? '' : (ICONS[it.section === 'firmware' ? 'chip' : 'cart'] || ICONS.box);
        return '<div class="shopCard' + (i === shopFocus ? ' sel' : '') + '" data-i="' + i + '">' +
          '<div class="scCover" style="' + cover + '">' + icon + '</div>' +
          '<div class="scName">' + escapeHtml(it.name) + '</div>' +
          '<div class="scMeta">' + escapeHtml(it.author) + ' · ' + sectionLabel(it.section || 'games') + ' · ' + sizeLabel(it.sizeMB) + '</div>' +
          '<div class="scDesc">' + escapeHtml(it.desc || 'Без описания') + '</div>' +
          '<div class="scRow">' +
          '<button class="loaderBtn" data-get="' + it.id + '">Скачать</button>' +
          (own ? '<button class="loaderBtn ghost" data-del="' + it.id + '">Удалить</button>' : '') +
          '</div></div>';
      }).join('');
      grid.querySelectorAll('[data-get]').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const it = items.find((x) => x.id === b.dataset.get);
        if (it) downloadPublished(it);
      }));
      grid.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const it = items.find((x) => x.id === b.dataset.del);
        if (it) confirmUnpublish(it);
      }));
      grid.querySelectorAll('.shopCard').forEach((el) => el.addEventListener('click', () => {
        shopFocus = +el.dataset.i;
        renderShop();
      }));
    }
    const mem = memInfo();
    const memEl = root.querySelector('[data-shopmem]');
    if (memEl) memEl.textContent = 'Память: свободно ' + sizeLabel(mem.free) + ' из ' + sizeLabel(mem.total);
    const acc = Store.current();
    root.querySelector('[data-shopnote]').textContent = acc ? 'Вы вошли как ' + acc.login : 'Публикации всех аккаунтов сети';
  }

  function downloadPublished(it) {
    if (!World.isOnline()) {
      Sfx.error();
      flashText('Подключите Wi-Fi: Настройки → Wi-Fi');
      return;
    }
    const mem = memInfo();
    if (it.section === 'firmware') {
      const cart = World.addCart(it.name, 'fw-' + it.id, {
        customOs: true, firmwareText: it.firmware || '',
        img: it.img || null, menuImg: it.menuImg || null, sizeMB: it.sizeMB || 100,
      });
      Sfx.cart();
      World.ripple(cart.x, cart.y, '#b06bff');
      flashText('Прошивка «' + it.name + '» скачана — картридж на столе');
      return;
    }
    if (Library.items.some((g) => g.pubId === it.id)) {
      Sfx.error();
      flashText('Эта игра уже установлена');
      return;
    }
    if ((it.sizeMB || 0) > mem.free) {
      Sfx.error();
      flashText('Не хватает памяти: нужно ' + sizeLabel(it.sizeMB) + ', свободно ' + sizeLabel(mem.free));
      return;
    }
    const entry = Library.add({
      name: it.name,
      author: it.author,
      desc: it.desc || '',
      kind: 'js',
      code: it.code || null,
      sizeMB: it.sizeMB || 100,
      img: it.img || null,
      menuImg: it.menuImg || null,
      installed: true,
      addedAt: Date.now(),
      pubId: it.id,
    });
    persistLibrary();
    Sfx.ok();
    flashText('«' + entry.name + '» установлена — ' + sizeLabel(entry.sizeMB));
    if (layer === 'home') renderHome();
  }

  function confirmUnpublish(it) {
    showModal({
      title: 'Удалить публикацию?',
      text: '«' + it.name + '» исчезнет из eShop у всех аккаунтов этой сети.',
      actions: [
        { label: 'Отмена' },
        { label: 'Удалить', primary: true, onClick: () => {
          if (Store.unpublish(it.id)) {
            flashText('Публикация удалена');
            renderShop();
          } else {
            Sfx.error();
            flashText('Удалять может только автор публикации');
          }
        } },
      ],
    });
  }

  function openPublish() {
    if (!World.isOnline()) {
      Sfx.error();
      flashText('Подключите Wi-Fi: Настройки → Wi-Fi');
      return;
    }
    const cart = World.state.con.cartRef;
    if (!cart) { Sfx.error(); flashText('Сначала вставьте картридж в консоль — его и выложим'); return; }
    if (cart.stockFw) { Sfx.error(); flashText('«Обычную прошивку» выкладывать нельзя'); return; }
    const lib = cart.gameId ? Library.get(cart.gameId) : null;
    const isOs = !!cart.customOs;
    if (!isOs && (!lib || !lib.code)) { Sfx.error(); flashText('У этого картриджа нет кода игры'); return; }
    const name = cart.name || (lib && lib.name) || 'Без названия';
    pubImg = cart.img || (lib && lib.img) || null;
    pubMenuImg = cart.menuImg || (lib && lib.menuImg) || null;
    const secOpts = SHOP_SECTIONS.filter((s) => s.id !== 'firmware').map((s) =>
      '<option value="' + s.id + '">' + s.label + '</option>').join('');
    showModal({
      title: 'Выложить в eShop',
      text: 'Картридж «' + name + '» уже в консоли. Название и описание можно изменить.',
      html: '<label class="wFld">Название<input data-pubname type="text" maxlength="40" aria-label="Название публикации" value="' + escapeAttr(name) + '"></label>' +
        '<label class="wFld">Описание<textarea data-pubdesc rows="3" maxlength="160" placeholder="Пара слов об игре"></textarea></label>' +
        (isOs ? '<div class="pubNote">Раздел: Кастомная ОС</div>' : '<label class="wFld">Раздел<select data-pubsec>' + secOpts + '</select></label>') +
        '<div class="pickRow"><button class="loaderBtn" data-pubpich type="button">Картинка</button><span class="pubHint">необязательно</span></div>' +
        '<div class="pubPrev" data-pubprev' + (pubMenuImg ? ' style="background-image:url(\'' + pubMenuImg + '\')"' : '') + '>' + (pubMenuImg ? '' : 'картинка') + '</div>',
      actions: [
        { label: 'Отмена' },
        { label: 'Опубликовать', primary: true, onClick: (m) => {
          const nm = (m.querySelector('[data-pubname]').value || name).trim().slice(0, 40) || name;
          const desc = (m.querySelector('[data-pubdesc]').value || '').trim().slice(0, 160);
          const section = isOs ? 'firmware' : (m.querySelector('[data-pubsec]').value || 'games');
          const res = Store.publish({
            name: nm,
            desc,
            section,
            sizeMB: cart.sizeMB || (lib && lib.sizeMB) || 100,
            lines: Math.max(1, Math.round((cart.sizeMB || 100) / 100)),
            kind: isOs ? 'os' : 'js',
            code: isOs ? null : lib.code,
            firmware: isOs ? cart.firmwareText : null,
            img: pubImg,
            menuImg: pubMenuImg,
          });
          if (!res.ok) { Sfx.error(); flashText(res.error); return; }
          Sfx.ok();
          flashText('«' + nm + '» опубликована в eShop');
          renderShop();
        } },
      ],
      onOpen: (m) => {
        const btn = m.querySelector('[data-pubpich]');
        const prev = m.querySelector('[data-pubprev]');
        btn.addEventListener('click', () => {
          const inp = root.querySelector('[data-pubfile]');
          if (!inp) return;
          inp.onchange = () => {
            const f = inp.files && inp.files[0];
            if (f) shrinkImage(f, 320, (url) => {
              pubMenuImg = url;
              prev.style.backgroundImage = "url('" + url + "')";
              prev.textContent = '';
            });
            inp.value = '';
          };
          inp.click();
        });
      },
    });
  }

  function exportNet() {
    try {
      const blob = new Blob([Store.exportData()], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'switch2-accounts.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      flashText('Файл сети сохранён');
    } catch (e) {
      Sfx.error();
    }
  }

  function importNet(file) {
    const fr = new FileReader();
    fr.onload = () => {
      if (Store.importData(String(fr.result || ''))) {
        Sfx.ok();
        flashText('Файл сети загружен');
        renderShop();
      } else {
        Sfx.error();
        flashText('Не получилось прочитать файл сети');
      }
    };
    fr.onerror = () => Sfx.error();
    fr.readAsText(file);
  }

  /* ------------------------------ настройки: окна ------------------------------ */
  function openMemoryModal() {
    const mem = memInfo();
    const fw = Firmware.active();
    showModal({
      title: 'Память консоли',
      html: '<div class="memList">' +
        '<div><span>Всего</span><b>' + sizeLabel(mem.total) + '</b></div>' +
        '<div><span>Прошивка (' + fw.lines + ' строк)</span><b>' + sizeLabel(mem.osMB) + '</b></div>' +
        '<div><span>Игры и приложения</span><b>' + sizeLabel(mem.games) + '</b></div>' +
        '<div class="memFree"><span>Свободно</span><b>' + sizeLabel(mem.free) + '</b></div>' +
        '</div>',
      actions: [{ label: 'Понятно', primary: true }],
    });
  }

  function openSystemModal() {
    const fw = Firmware.active();
    const acc = Store.current();
    showModal({
      title: 'Система',
      text: fw.name + ' ' + fw.version + (fw.isDefault ? ' · заводская' : ' · кастомная'),
      html: '<div class="memList">' +
        '<div><span>Строк прошивки</span><b>' + fw.lines + '</b></div>' +
        '<div><span>Вес прошивки</span><b>' + sizeLabel(fw.weightMB) + '</b></div>' +
        '<div><span>Загрузчик</span><b>' + (Store.unlocked() ? 'разблокирован' : 'заблокирован') + '</b></div>' +
        '<div><span>Профиль</span><b>' + (acc ? escapeHtml(acc.login) : 'нет') + '</b></div>' +
        '</div>',
      actions: [{ label: 'Закрыть', primary: true }],
    });
  }

  function openUnlockModal() {
    if (!Store.current()) { Sfx.error(); flashText('Сначала войдите в аккаунт'); return; }
    showModal({
      title: 'Разблокировать загрузчик',
      text: 'Введите пароль аккаунта ' + Store.current().login + '. После разблокировки появится установка кастомной ОС.',
      html: '<label class="wFld">Пароль<input data-unlockpass type="password" autocomplete="off" aria-label="Пароль аккаунта"></label>',
      actions: [
        { label: 'Отмена' },
        { label: 'Разблокировать', primary: true, onClick: (m) => {
          if (!Store.verify(m.querySelector('[data-unlockpass]').value)) {
            Sfx.error();
            flashText('Неверный пароль');
            return;
          }
          Store.setUnlocked(true);
          Sfx.ok();
          flashText('Загрузчик разблокирован — пункт «Поставить кастомную ОС» появился в настройках');
          renderSettings();
          setTimeout(() => {
            const hot = root.querySelector('.setRow.hot');
            if (hot) { try { hot.scrollIntoView({ block: 'nearest' }); } catch (e) { /* без прокрутки */ } }
          }, 30);
        } },
      ],
      focus: '[data-unlockpass]',
    });
  }

  function openWifiModal() {
    const info = World.wifiInfo();
    if (!info.mounted) {
      Sfx.error();
      flashText('Сначала купите роутер в телефоне («Магазин») и закрепите его на стене ПКМ');
      return;
    }
    showModal({
      title: 'Wi-Fi',
      text: 'Введите пароль сети. Логин и пароль написаны на наклейке под роутером.',
      html: '<label class="wFld">Сеть<input type="text" readonly aria-label="Сеть" value="' + escapeAttr(info.ssid) + '"></label>' +
        '<label class="wFld">Пароль<input data-wifipass type="password" autocomplete="off" aria-label="Пароль Wi-Fi"></label>',
      actions: [
        { label: 'Отмена' },
        { label: 'Подключиться', primary: true, onClick: (m) => {
          const res = World.connectWifi(m.querySelector('[data-wifipass]').value);
          if (!res.ok) { Sfx.error(); flashText(res.error); return; }
          Sfx.ok();
          renderSettings();
        } },
      ],
      focus: '[data-wifipass]',
    });
  }

  function openStockOsModal() {
    showModal({
      title: 'Вернуть заводскую прошивку?',
      text: 'Кастомная ОС будет удалена, её настройки сброшены.',
      actions: [
        { label: 'Отмена' },
        { label: 'Вернуть', primary: true, onClick: () => {
          Store.setFirmware(null);
          applyFirmware();
          flashText('Установлена заводская прошивка');
          renderSettings();
        } },
      ],
    });
  }

  function openWipeModal() {
    showModal({
      title: 'Стереть прогресс?',
      text: 'Пропадут покупки, картриджи, установленные игры, разблокировка загрузчика и кастомная прошивка. Аккаунты и публикации в eShop останутся.',
      actions: [
        { label: 'Отмена' },
        { label: 'Стереть', primary: true, onClick: () => {
          Store.resetProgress();
          Library.items = [];
          Library.seq = 1;
          loaderFiles = [];
          World.resetProgress();
          applyFirmware();
          userbar();
          stopGame();
          powerOffNow();
          if (window.App) App.toast('Прогресс стёрт — аккаунты и eShop на месте', 'cyan');
        } },
      ],
    });
  }

  function openFactoryModal() {
    showModal({
      title: 'Сбросить до заводских?',
      text: 'Будут удалены профиль, установленные игры и кастомная прошивка. Консоль запустится как в первый раз.',
      actions: [
        { label: 'Отмена' },
        { label: 'Сбросить', primary: true, onClick: () => {
          Store.factoryReset();
          Library.items = [];
          Library.seq = 1;
          World.state.con.battery = 58;
          World.resetJoycons();
          applyFirmware();
          Sfx.ok();
          rebootWelcome();
        } },
      ],
    });
  }

  function openAccountModal() {
    const acc = Store.current();
    const others = Store.accounts().filter((a) => !acc || a.login !== acc.login);
    const html = '<div class="accList">' + (others.length
      ? others.map((a) => '<div class="accRow"><b>' + escapeHtml(a.login) + '</b>' +
        '<button class="loaderBtn" data-login="' + escapeAttr(a.login) + '">Войти</button></div>').join('')
      : '<div class="accEmpty">Других аккаунтов на этой консоли нет.</div>') + '</div>';
    showModal({
      title: acc ? 'Аккаунт: ' + acc.login : 'Аккаунт',
      html,
      actions: [
        { label: 'Новый аккаунт', onClick: () => rebootWelcome() },
        { label: 'Выйти', onClick: () => { Store.logout(); rebootWelcome(); } },
        { label: 'Закрыть', primary: true },
      ],
      onOpen: (m) => {
        m.querySelectorAll('[data-login]').forEach((b) => b.addEventListener('click', () => openLoginModal(b.dataset.login)));
      },
    });
  }

  function openLoginModal(login) {
    showModal({
      title: 'Вход: ' + login,
      html: '<label class="wFld">Пароль<input data-logpass type="password" autocomplete="off" aria-label="Пароль аккаунта"></label>',
      actions: [
        { label: 'Отмена' },
        { label: 'Войти', primary: true, onClick: (m) => {
          const res = Store.login(login, m.querySelector('[data-logpass]').value);
          if (!res.ok) { Sfx.error(); flashText(res.error); return; }
          Sfx.ok();
          userbar();
          applyFirmware();
          goHome();
          flashText('Вы вошли как ' + login);
        } },
      ],
      focus: '[data-logpass]',
    });
  }

  /* ------------------------------ терминал ------------------------------ */
  function powerOffNow() {
    stopGame();
    show('off');
    Sfx.off();
  }

  function openTerminal() {
    if (!Store.unlocked()) {
      Sfx.error();
      flashText('Сначала разблокируйте загрузчик в настройках');
      return;
    }
    show('insertCard');
    installing = false;
    const t = root.querySelector('[data-term]');
    t.innerHTML = '';
    termLine('NINTENDO SERVICE TERMINAL v2.0');
    termLine('bootloader: UNLOCKED');
    termLine('media: none');
    termLine('');
    termLine('INSERT CARD', 'big');
    termLine('вставьте картридж с кастомной ОС');
    termLine('или карту «Обычная прошивка» для сброса');
    const inserted = World.state.con.cartRef;
    if (inserted && (inserted.stockFw || inserted.customOs)) {
      termLine('media: картридж уже в консоли');
      setTimeout(() => handleFirmwareCart(inserted), 350);
    }
  }

  function termLine(text, cls) {
    const t = root.querySelector('[data-term]');
    if (!t) return;
    const el = document.createElement('div');
    el.className = 'tline' + (cls ? ' ' + cls : '');
    el.textContent = text || ' ';
    t.appendChild(el);
    t.scrollTop = t.scrollHeight;
  }

  function handleFirmwareCart(cart) {
    if (layer !== 'insertCard') {
      if (cart.stockFw) flashText('Обычная прошивка: вставьте её в терминале «Поставить кастомную ОС», чтобы сбросить консоль');
      else if (!Store.unlocked()) flashText('Кастомная ОС: сначала разблокируйте загрузчик в настройках');
      else flashText('Кастомная ОС: откройте Настройки → Поставить кастомную ОС');
      return true;
    }
    if (installing) return true;
    if (cart.stockFw) { startStockReset(); return true; }
    if (cart.customOs) { startInstall(cart); return true; }
    termLine('media: unknown card — not bootable');
    Sfx.error();
    return true;
  }

  function startInstall(cart) {
    const fw = Firmware.parse(cart.firmwareText);
    const mem = memInfo();
    if (fw.weightMB > mem.free + mem.osMB) {
      termLine('> not enough space for ' + fw.name);
      Sfx.error();
      return;
    }
    installing = true;
    termLine('media: ' + cart.name);
    setTimeout(() => termLine('> reading card ... OK'), 500);
    setTimeout(() => termLine('> verifying signature ... OK'), 1000);
    setTimeout(() => termLine('> writing ' + fw.lines + ' blocks'), 1600);
    setTimeout(() => termLine('> flashing 100%'), 2300);
    setTimeout(() => {
      Store.setFirmware(cart.firmwareText);
      Store.setUnlocked(true);
      applyFirmware();
      installing = false;
      termLine('> done. rebooting...');
      Sfx.ok();
      setTimeout(() => {
        goHome();
        flashText('Кастомная ОС «' + fw.name + '» установлена');
      }, 900);
    }, 3000);
  }

  function startStockReset() {
    installing = true;
    termLine('media: stock firmware');
    setTimeout(() => termLine('> restoring factory image ...'), 500);
    setTimeout(() => termLine('> wiping user data'), 1100);
    setTimeout(() => {
      Store.factoryReset();
      Library.items = [];
      Library.seq = 1;
      World.state.con.battery = 58;
      installing = false;
      termLine('> factory reset complete. power off');
      Sfx.ok();
      setTimeout(() => {
        World.state.powered = false;
        powerOffNow();
        if (window.App) App.toast('Консоль сброшена до заводских настроек', 'cyan');
      }, 900);
    }, 1800);
  }

  /* ------------------------------ сохранение ------------------------------ */
  function hydrateLibrary() {
    const saved = Store.library();
    if (saved && saved.length) {
      Library.items = saved;
      Library.seq = Store.nextSeq() || 1;
    }
  }

  function persistLibrary() {
    if (window.Store) Store.saveLibrary(Library.items, Library.seq);
  }

  /* ------------------------------ публичное ------------------------------ */
  const api = {
    mount(el) {
      host = el;
      root = document.createElement('div');
      root.id = 'os';
      host.appendChild(root);
      hydrateLibrary();
      build();
      show('off');
      state.hints = true;
      applyFirmware();
      userbar();
    },
    get layer() { return layer; },
    boot(done) {
      busy = true;
      show('boot');
      const boot = root.querySelector('.os-boot');
      boot.classList.remove('play');
      void boot.offsetWidth;
      boot.classList.add('play');
      Sfx.boot();
      setTimeout(() => {
        busy = false;
        applyFirmware();
        userbar();
        if (!Store.current()) {
          showWelcome('register');
        } else {
          show('home');
          focus = 0;
          renderHome(true);
        }
        if (done) done();
      }, 2600);
    },
    powerOff: powerOffNow,
    goHome,
    wipe: openWipeModal,
    press,
    release,
    update(dt) {
      const active = game;
      if (layer === 'game' && active && active.update) {
        active.update(dt, { held, pressed, width: 1280, height: 720 });
        if (game === active && layer === 'game' && active.draw) active.draw();
      }
      pressed.clear();
    },
    openApp(id) { startGame(id); },
    onCartInsert,
    onCartEject,
    openLoader() { focus = 0; show('loader'); renderLoaderList(); },
    previewGame(name, text) { show('loader'); loadGameText(name, text); return pending; },
    refreshHome() { if (layer === 'home') renderHome(); },
    openShop: showShop,
    openTerminal,
    welcome: showWelcome,
    setBattery,
    flash,
    get gameId() { return currentGameId; },
  };

  if (window.Dev && Dev.on) {
    Dev.expose('os', {
      show, showModal, closeModal, settingRows, renderSettings, openUnlockModal, openTerminal, activateSetting, openWipeModal,
    });
  }

  return api;
})();
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}
