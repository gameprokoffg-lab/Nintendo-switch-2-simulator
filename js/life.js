'use strict';

/* =====================================================================
   Телефон: магазины, покупки и мануал
   ===================================================================== */
window.Life = (() => {
  const btn = document.getElementById('phoneBtn');
  const phone = document.getElementById('phone');
  const homeEl = document.querySelector('[data-ph-home]');
  const appEl = document.querySelector('[data-ph-app]');
  const statusEl = document.querySelector('[data-ph-status]');
  const clockEl = document.querySelector('[data-ph-clock]');

  const manEl = document.getElementById('manual');
  const manPageEl = document.querySelector('[data-man-page]');
  const manNumEl = document.querySelector('[data-man-num]');
  const manPrev = document.querySelector('[data-man-prev]');
  const manNext = document.querySelector('[data-man-next]');

  let toast = (t, k) => { if (window.App) App.toast(t, k); };
  let view = 'home';
  let manIndex = 0;
  let clockTimer = null;

  const ICON_SHOP = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 7h12l1.5 13h-15z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 10v4M6 12h4M16 11h.01M18 13h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const MANUAL = [
    {
      chapter: 'Глава 1 · Начало',
      title: 'Как всё устроено',
      html: '<p>Это симулятор комнаты с рабочим столом. Консоль, роутер, картриджи и мануал заказываются по телефону.</p>' +
        '<p>Телефон — круглая кнопка в правом нижнем углу. В нём два приложения: «Магазин» и «Nintendo Shop».</p>',
      tip: 'Сначала закажите Nintendo Switch 2 и Wi-Fi роутер — без них не будет ни игр, ни сети.',
    },
    {
      chapter: 'Глава 1 · Начало',
      title: 'Коробки и мусорка',
      html: '<ul class="manList">' +
        '<li>Заказ приезжает на стол у окна в картонной коробке.</li>' +
        '<li>Клик по коробке открывает её.</li>' +
        '<li>Пустую коробку перетащите в мусорку в левом нижнем углу — она исчезнет.</li>' +
        '</ul><p>В коробке с консолью лежат сама консоль, док-станция и Joy-Con 2.</p>',
      tip: 'Неоткрытую коробку выбросить нельзя — сначала загляните внутрь.',
    },
    {
      chapter: 'Глава 2 · Wi-Fi',
      title: 'Роутер на стене',
      html: '<p>Купите роутер в «Магазине», откройте коробку и зажмите роутер <b>правой кнопкой мыши</b>.</p>' +
        '<p>Перетащите его на стену и отпустите. Под роутером появится наклейка с логином и паролем.</p>',
      tip: 'Роутер крепится на стену в комнате у окна — там же стоит его коробка.',
    },
    {
      chapter: 'Глава 2 · Wi-Fi',
      title: 'Подключение консоли',
      html: '<p>Включите консоль, откройте <b>Настройки → Wi-Fi</b> и введите пароль с наклейки.</p>' +
        '<p>Сеть нужна для eShop: без Wi-Fi нельзя скачивать игры и публиковать свои картриджи.</p>',
      tip: 'Логин сети — SW2-HOME, пароль написан под роутером.',
    },
    {
      chapter: 'Глава 3 · Консоль',
      title: 'Питание и Joy-Con',
      html: '<ul class="manList">' +
        '<li><b>Кнопка питания</b> — тонкая полоска на верхней грани корпуса.</li>' +
        '<li><b>Joy-Con 2</b> держатся на магнитах: тяните за корпус, чтобы снять, и отпустите рядом, чтобы примагнитить.</li>' +
        '<li>Кнопки работают: стик, крестовина, A/B/X/Y, L/R, ZL/ZR, +/−, Home, C, Capture.</li>' +
        '</ul><p>Управление с клавиатуры можно отключить в подсказках («?» справа сверху).</p>',
      tip: 'Esc отключает приближение, если вы случайно приблизили экран.',
    },
    {
      chapter: 'Глава 3 · Консоль',
      title: 'Столы и приближение',
      html: '<p>Стрелка слева или клавиша <b>T</b> переключает комнаты: стол у окна, ТВ-зона и хранилище картриджей.</p>' +
        '<p>Клик по экрану консоли приближает камеру. <b>Esc</b> или клик мимо экрана возвращают общий вид.</p>' +
        '<p>Картридж, вытащенный за край стола, появляется на соседнем столе.</p>',
      tip: 'В хранилище картриджи раскладываются по свободным слотам.',
    },
    {
      chapter: 'Глава 4 · Док и телевизор',
      title: 'Большой экран',
      html: '<ol class="manList">' +
        '<li>Снимите Joy-Con с консоли.</li>' +
        '<li>Вставьте их в грип в ТВ-зоне.</li>' +
        '<li>Опустите консоль в док-станцию.</li>' +
        '<li>Протяните HDMI от дока к телевизору.</li>' +
        '</ol><p>Картинка уйдёт на телевизор. Питание дока подключается к розетке на стене.</p>',
      tip: 'Клик по экрану телевизора приближает его так же, как экран консоли.',
    },
    {
      chapter: 'Глава 5 · Игры',
      title: 'Game Loader и картриджи',
      html: '<p><b>Game Loader</b> на консоли принимает .js с объектом SwitchGame, .json и .txt с параметрами. После загрузки на столе появляется картридж.</p>' +
        '<p>В <b>Nintendo Shop</b> можно купить физические картриджи игр из eShop. Они приезжают без коробки сразу в хранилище.</p>' +
        '<p>Вставьте картридж в слот консоли — игра появится в библиотеке.</p>',
      tip: 'Картриджи из хранилища можно переносить между столами перетаскиванием.',
    },
    {
      chapter: 'Глава 6 · Аккаунт и eShop',
      title: 'Nintendo eShop',
      html: '<p>При первом включении создайте аккаунт Nintendo: логин, пароль и аватар по желанию.</p>' +
        '<p>В eShop четыре раздела: «Игры», «Приложения», «Софт» и «Кастомная ОС». Кнопка «Выложить» публикует картридж, вставленный в консоль.</p>' +
        '<p>Скачивание и публикация требуют Wi-Fi. Аккаунты и публикации можно сохранить в файл сети внизу eShop.</p>',
      tip: 'Пароль аккаунта нужен для разблокировки загрузчика — не забывайте его.',
    },
    {
      chapter: 'Глава 7 · Кастомные ОС',
      title: 'Загрузчик и терминал',
      html: '<p>Настройки → <b>Разблокировать загрузчик</b> → пароль аккаунта. После этого появляется пункт <b>«Поставить кастомную ОС»</b>.</p>' +
        '<p>Откроется терминал с надписью INSERT CARD. Вставьте картридж прошивки (загружается через Game Loader).</p>' +
        '<p>Карта «Обычная прошивка» из хранилища сбрасывает консоль до заводских настроек.</p>',
      tip: 'Вес прошивки — 100 МБ за строку, всего в консоли 256 ГБ.',
    },
    {
      chapter: 'Глава 8 · Мануал',
      title: 'Ящик стола',
      html: '<p>Этот мануал можно хранить в ящике стола.</p>' +
        '<ol class="manList">' +
        '<li>Нажмите на ручку — ящик откроется.</li>' +
        '<li>Перетащите мануал в открытый ящик и отпустите.</li>' +
        '<li>Нажмите на ручку ещё раз, чтобы закрыть.</li>' +
        '</ol><p>Чтобы достать: нажмите на ручку, затем на мануал в ящике.</p>',
      tip: 'Пока ящик открыт, мануал можно достать в любой момент.',
    },
    {
      chapter: 'Глава 9 · Подсказки',
      title: 'Полезные мелочи',
      html: '<ul class="manList">' +
        '<li><b>Телефон</b> — правый нижний угол.</li>' +
        '<li><b>Мусорка</b> — левый нижний угол.</li>' +
        '<li><b>Подсказки</b> — кнопка «?» справа сверху.</li>' +
        '<li><b>Esc</b> — убрать приближение и закрыть окна.</li>' +
        '<li><b>T</b> — следующая комната.</li>' +
        '</ul><p>Приятной игры!</p>',
      tip: 'Если клавиатура мешает, отключите её в подсказках.',
    },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function updateStatus() {
    if (statusEl) statusEl.textContent = World.isOnline() ? 'Wi-Fi: есть' : 'Wi-Fi: нет';
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
  }

  function renderHome() {
    view = 'home';
    appEl.hidden = true;
    homeEl.hidden = false;
    homeEl.innerHTML =
      '<button class="phApp shop" type="button" data-app="shop"><span class="ic">' + ICON_SHOP + '</span><span>Магазин</span></button>' +
      '<button class="phApp" type="button" data-app="nintendo"><span class="ic">' + ICON_PLAY + '</span><span>Nintendo Shop</span></button>';
    updateStatus();
  }

  function productCard(id, icon, title, desc, status, price) {
    return '<div class="phItem"><div class="cover">' + icon + '</div><div>' +
      '<b>' + esc(title) + '</b><span>' + esc(desc) + '</span>' +
      (status
        ? '<span>' + esc(status) + '</span>'
        : '<button class="buy" type="button" data-buy="' + esc(id) + '">' + esc(price || 'Купить') + '</button>') +
      '</div></div>';
  }

  function renderShop() {
    view = 'shop';
    appEl.hidden = false;
    homeEl.hidden = true;
    const mounted = World.wifiInfo().mounted;
    const pending = World.state.items.some((it) => it.kind === 'box' && it.box === 'router');
    const loose = World.state.items.some((it) => it.kind === 'router');
    const status = mounted ? 'Установлен' : loose ? 'На столе — закрепите на стене ПКМ' : pending ? 'В пути — на столе у окна' : '';
    appEl.innerHTML =
      '<div class="phHead"><button type="button" data-ph-back>‹</button><span class="phTitle">Магазин</span></div>' +
      '<div class="phList">' +
      productCard('router', ICON_SHOP, 'Wi-Fi роутер', 'Закрепите на стене ПКМ — под ним появится логин и пароль.', status, 'Купить · 3 990 ₽') +
      '</div><p class="phEmpty">Оплата в симуляторе не требуется — заказы демонстрационные.</p>';
  }

  function renderNintendo() {
    view = 'nintendo';
    appEl.hidden = false;
    homeEl.hidden = true;
    const owned = World.state.con.owned;
    const pend = World.state.items.some((it) => it.kind === 'box' && it.box === 'console');
    const consoleStatus = owned ? 'Куплено' : pend ? 'В пути — на столе у окна' : '';
    const routerStatus = World.state.drawer.manual || World.state.items.some((it) => it.kind === 'manual') ? 'Куплено' : '';
    const games = Store.published().filter((p) => (p.section || 'games') === 'games');

    let carts = '';
    for (const g of games) {
      const inStorage = World.state.carts.some((c) => c.phys && c.gameId === g.id);
      carts += productCard('cart:' + g.id, ICON_PLAY, g.name,
        'Физический картридж из eShop · ' + g.author,
        inStorage ? 'Уже в хранилище' : '', 'Купить · 1 490 ₽');
    }
    if (!games.length) carts = '<p class="phEmpty">В eShop пока нет игр для физических картриджей.</p>';

    appEl.innerHTML =
      '<div class="phHead"><button type="button" data-ph-back>‹</button><span class="phTitle">Nintendo Shop</span></div>' +
      '<div class="phList">' +
      productCard('console', ICON_PLAY, 'Nintendo Switch 2', 'Консоль, док-станция и Joy-Con 2 в коробке.', consoleStatus, 'Купить · 42 990 ₽') +
      productCard('manual', ICON_SHOP, 'Мануал', 'Полное руководство по всем механикам и ящику стола.', routerStatus, 'Купить · 590 ₽') +
      '<div class="phHead" style="margin-top:6px"><span class="phTitle" style="font-size:12px;color:#8fb4c9">Физические картриджи</span></div>' +
      carts +
      '</div><p class="phEmpty">Оплата в симуляторе не требуется — заказы демонстрационные.</p>';
  }

  function renderApp() {
    if (view === 'shop') renderShop();
    else if (view === 'nintendo') renderNintendo();
    else renderHome();
    updateStatus();
  }

  function buy(id) {
    if (window.Dev && Dev.on) {
      const item = id.indexOf('cart:') === 0 ? 'картридж' : ({ router: 'роутер', console: 'консоль', manual: 'мануал' }[id] || id);
      Dev.log('Покупка: «' + item + '»');
    }
    if (id === 'router' || id === 'console' || id === 'manual') {
      const res = World.deliver(id);
      if (!res.ok) {
        if (res.reason === 'owned') toast('Это уже куплено');
        else if (res.reason === 'pending') toast('Заказ уже в пути — коробка на столе у окна');
        else toast('Не получилось оформить заказ', 'red');
        return;
      }
      const names = { router: 'Роутер', console: 'Nintendo Switch 2', manual: 'Мануал' };
      toast(names[id] + ': доставка на стол у окна', 'cyan');
      renderApp();
      return;
    }
    if (id.indexOf('cart:') === 0) {
      const pubId = id.slice(5);
      const p = Store.published().find((x) => x.id === pubId);
      if (!p) return;
      const res = World.deliver('cart', {
        gameId: p.id, name: p.name, img: p.img || null, menuImg: p.menuImg || null,
        sizeMB: p.sizeMB || 100, code: p.code || null, desc: p.desc || '',
        author: p.author || '', pubId: p.id,
      });
      if (!res.ok) {
        if (res.reason === 'full') toast('В хранилище нет свободного слота', 'red');
        else if (res.reason === 'owned') toast('Этот картридж уже есть в хранилище');
        else toast('Не получилось оформить заказ', 'red');
        renderApp();
        return;
      }
      renderApp();
    }
  }

  function openPhone() {
    if (!phone) return;
    phone.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    renderHome();
    if (!clockTimer) clockTimer = setInterval(updateStatus, 30000);
  }

  function closePhone() {
    if (!phone) return;
    phone.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function togglePhone() {
    if (phone.hidden) openPhone();
    else closePhone();
  }

  function openManual() {
    if (!manEl) return;
    manIndex = 0;
    renderManual();
    manEl.hidden = false;
  }

  function closeManual() {
    if (manEl) manEl.hidden = true;
  }

  function renderManual() {
    const p = MANUAL[manIndex];
    manPageEl.innerHTML = '<div class="ch">' + esc(p.chapter) + '</div><h3>' + esc(p.title) + '</h3>' + p.html +
      (p.tip ? '<div class="manTip">' + esc(p.tip) + '</div>' : '');
    manNumEl.textContent = 'Стр. ' + (manIndex + 1) + ' / ' + MANUAL.length;
    manPrev.disabled = manIndex === 0;
    manNext.disabled = manIndex === MANUAL.length - 1;
  }

  function page(delta) {
    manIndex = Math.max(0, Math.min(MANUAL.length - 1, manIndex + delta));
    renderManual();
  }

  function onKey(e) {
    if (manEl && !manEl.hidden) {
      if (e.code === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); page(-1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); page(1); }
      return;
    }
    if (e.code === 'Escape' && phone && !phone.hidden) {
      closePhone();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function closeTop() {
    if (manEl && !manEl.hidden) { closeManual(); return true; }
    if (phone && !phone.hidden) { closePhone(); return true; }
    return false;
  }

  function init(opts) {
    if (opts && opts.toast) toast = opts.toast;
    if (!btn || !phone) return;
    btn.addEventListener('click', togglePhone);
    document.querySelector('[data-ph-close]').addEventListener('click', closePhone);
    const home = document.querySelector('[data-ph-home]');
    home.addEventListener('click', (e) => {
      const b = e.target.closest('[data-app]');
      if (!b) return;
      if (b.dataset.app === 'shop') renderShop();
      else renderNintendo();
    });
    const app = document.querySelector('[data-ph-app]');
    app.addEventListener('click', (e) => {
      const back = e.target.closest('[data-ph-back]');
      if (back) { renderHome(); return; }
      const buyBtn = e.target.closest('[data-buy]');
      if (buyBtn) buy(buyBtn.dataset.buy);
    });
    manPrev.addEventListener('click', () => page(-1));
    manNext.addEventListener('click', () => page(1));
    document.querySelector('[data-man-close]').addEventListener('click', closeManual);
    window.addEventListener('keydown', onKey, true);
    updateStatus();
  }

  return { init, openManual, closeTop, openPhone, closePhone, isOpen: () => (phone && !phone.hidden) || (manEl && !manEl.hidden) };
})();
