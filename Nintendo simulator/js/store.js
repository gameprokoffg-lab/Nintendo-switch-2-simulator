'use strict';

/* =====================================================================
   Хранилище данных симулятора.
   Аккаунты Nintendo и опубликованные игры лежат в отдельном файле
   (localStorage + экспорт/импорт JSON), игры и прошивка — на консоли.
   ===================================================================== */
var Store = (() => {
  const KEY = 'switch2.store.v2';
  const TOTAL_MB = 256 * 1024;   // 256 ГБ встроенной памяти

  const DEFAULT = {
    net: { accounts: [], published: [] },
    console: { user: null, unlocked: false, firmware: null, fwSettings: {}, battery: 58 },
    library: [],
    seq: 1,
  };

  let data = null;
  const subs = [];

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function hash(s) {
    let h = 5381;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36);
  }

  function checkPass(pass, stored) {
    if (!stored) return false;
    return String(stored).charAt(0) === 'h' ? hash(pass) === stored : String(pass) === String(stored);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) {
      data = null;
    }
    if (!data || typeof data !== 'object') data = clone(DEFAULT);
    data.net = data.net || { accounts: [], published: [] };
    data.net.accounts = data.net.accounts || [];
    data.net.published = data.net.published || [];
    data.console = data.console || clone(DEFAULT.console);
    data.console.fwSettings = data.console.fwSettings || {};
    data.library = data.library || [];
    data.seq = data.seq || 1;
    // первый запуск: подмешиваем демо-аккаунты из отдельного файла
    if (!data.net.accounts.length && window.STORE_SEED) {
      data.net = clone(window.STORE_SEED.net);
      data.net.accounts = data.net.accounts || [];
      data.net.published = data.net.published || [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* переполнение — молча */ }
    subs.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
  }

  function on(fn) {
    subs.push(fn);
    return () => {
      const i = subs.indexOf(fn);
      if (i >= 0) subs.splice(i, 1);
    };
  }

  /* ------------------------------ аккаунты ------------------------------ */
  function account(login) {
    const q = String(login || '').toLowerCase();
    return data.net.accounts.find((a) => a.login.toLowerCase() === q) || null;
  }

  function current() {
    return data.console.user ? account(data.console.user) : null;
  }

  function register(login, pass, avatar) {
    const name = String(login || '').trim();
    if (name.length < 2) return { ok: false, error: 'Логин — минимум 2 символа' };
    if (name.length > 20) return { ok: false, error: 'Логин — максимум 20 символов' };
    if (String(pass || '').length < 4) return { ok: false, error: 'Пароль — минимум 4 символа' };
    if (account(name)) return { ok: false, error: 'Такой аккаунт уже существует' };
    const acc = { login: name, pass: hash(pass), avatar: avatar || null, createdAt: Date.now() };
    data.net.accounts.push(acc);
    data.console.user = name;
    save();
    return { ok: true, account: acc };
  }

  function login(login, pass) {
    const acc = account(login);
    if (!acc || !checkPass(pass, acc.pass)) return { ok: false, error: 'Неверный логин или пароль' };
    data.console.user = acc.login;
    save();
    return { ok: true, account: acc };
  }

  function logout() {
    data.console.user = null;
    save();
  }

  function verify(pass) {
    const acc = current();
    const ok = !!acc && checkPass(pass, acc.pass);
    if (window.Dev && Dev.on) Dev.check('пароль аккаунта', ok);
    return ok;
  }

  /* ------------------------------ консоль ------------------------------ */
  function unlocked() { return !!data.console.unlocked; }
  function setUnlocked(v) {
    data.console.unlocked = !!v;
    if (window.Dev && Dev.on) Dev.variable('загрузчик разблокирован', v ? 'да' : 'нет');
    save();
  }

  function firmwareText() { return data.console.firmware; }
  function setFirmware(text) { data.console.firmware = text || null; save(); }

  function fwSetting(key, val) {
    if (val === undefined) return data.console.fwSettings[key];
    data.console.fwSettings[key] = val;
    save();
    return val;
  }
  function fwSettings() { return clone(data.console.fwSettings); }

  function battery() {
    return data.console.battery != null ? data.console.battery : 58;
  }
  function setBattery(v) { data.console.battery = Math.round(v); }

  /* ------------------------------ память ------------------------------ */
  function memory(osText) {
    const lines = Math.max(1, String(osText || '').split(/\r?\n/).length);
    const osMB = lines * 100;
    const games = data.library.filter((g) => g.installed && !g.sys).reduce((s, g) => s + (g.sizeMB || 0), 0);
    const used = osMB + games;
    return { total: TOTAL_MB, osMB, games, used, free: Math.max(0, TOTAL_MB - used) };
  }

  /* ------------------------------ библиотека ------------------------------ */
  function saveLibrary(items, seq) {
    data.library = items.map((i) => Object.assign({}, i));
    if (seq) data.seq = seq;
    save();
  }
  function library() { return clone(data.library); }
  function nextSeq() { return data.seq || 1; }

  /* ------------------------------ eShop ------------------------------ */
  function publish(item) {
    const acc = current();
    if (!acc) return { ok: false, error: 'Сначала войдите в аккаунт' };
    const pub = Object.assign({
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author: acc.login,
      createdAt: Date.now(),
    }, item);
    data.net.published.unshift(pub);
    save();
    return { ok: true, item: pub };
  }

  function unpublish(id) {
    const i = data.net.published.findIndex((p) => p.id === id);
    if (i < 0) return false;
    const acc = current();
    if (!acc || data.net.published[i].author !== acc.login) return false;
    data.net.published.splice(i, 1);
    save();
    return true;
  }

  function published() { return clone(data.net.published); }

  function accounts() { return clone(data.net.accounts); }

  /* ------------------------------ файл ------------------------------ */
  function exportData() {
    return JSON.stringify({
      app: 'switch2-simulator',
      version: 2,
      exportedAt: new Date().toISOString(),
      net: data.net,
    }, null, 2);
  }

  function importData(obj) {
    try {
      const j = typeof obj === 'string' ? JSON.parse(obj) : obj;
      if (!j || !j.net || !Array.isArray(j.net.accounts)) return false;
      const known = new Set(data.net.accounts.map((a) => a.login.toLowerCase()));
      for (const a of j.net.accounts) {
        if (a && a.login && !known.has(String(a.login).toLowerCase())) data.net.accounts.push(a);
      }
      const ids = new Set(data.net.published.map((p) => p.id));
      for (const p of (j.net.published || [])) {
        if (p && p.id && !ids.has(p.id)) data.net.published.push(p);
      }
      save();
      return true;
    } catch (e) {
      return false;
    }
  }

  function factoryReset() {
    data.console = clone(DEFAULT.console);
    data.library = [];
    data.seq = 1;
    save();
  }

  function resetProgress() {
    data.console.unlocked = false;
    data.console.firmware = null;
    data.console.fwSettings = {};
    data.console.battery = 58;
    data.library = [];
    data.seq = 1;
    save();
  }

  load();

  return {
    TOTAL_MB, hash,
    account, current, register, login, logout, verify,
    unlocked, setUnlocked, firmwareText, setFirmware, fwSetting, fwSettings,
    battery, setBattery, memory,
    saveLibrary, library, nextSeq,
    publish, unpublish, published, accounts,
    exportData, importData, factoryReset, resetProgress,
    on,
  };
})();
