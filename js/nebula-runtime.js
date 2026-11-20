'use strict';

/* =====================================================================
   Nebula Runtime — системные вызовы кастомной прошивки NEBULA OS.
   Игры «СЕРДЦЕ НЕБУЛЫ» (NBS) и «КРАСНЫЙ СЕКТОР» (SEC) собраны под
   этот рантайм и вызывают его функции на старте и во время игры.
   В заводской Switch OS 2.0 этих вызовов нет: попытка обращений
   возвращает ошибку ENOSYS, поэтому игры физически не запускаются
   без установленной NEBULA OS.
   ===================================================================== */
var Nebula = (function () {
  const ABI = 'NEBULA-ABI-1.0';
  const SYSCALLS = ['nb_save', 'nb_load', 'nb_haptic', 'nb_audio', 'nb_skin'];

  function firmware() {
    return window.Firmware ? Firmware.active() : null;
  }

  function ready() {
    const fw = firmware();
    return !!(fw && Array.isArray(fw.features) && fw.features.indexOf('nebula') >= 0);
  }

  function probe() {
    const fw = firmware();
    const ok = ready();
    return {
      abi: ABI,
      ready: ok,
      firmware: fw ? fw.name + ' ' + fw.version : 'прошивка не найдена',
      syscalls: SYSCALLS.slice(),
      missing: ok ? [] : SYSCALLS.slice(),
    };
  }

  function requireRt(call) {
    if (!ready()) {
      const err = new Error('ENOSYS: ' + call + ' — системный вызов недоступен (Nebula Runtime не установлен)');
      err.code = 'ENOSYS';
      err.call = call;
      throw err;
    }
  }

  function keyOf(k) {
    return 'switch2.nebula.' + k;
  }

  function save(key, value) {
    requireRt('nb_save');
    try { localStorage.setItem(keyOf(key), JSON.stringify(value)); } catch (e) { /* приватный режим */ }
  }

  function load(key, fallback) {
    requireRt('nb_load');
    try {
      const raw = localStorage.getItem(keyOf(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function remove(key) {
    requireRt('nb_save');
    try { localStorage.removeItem(keyOf(key)); } catch (e) { /* приватный режим */ }
  }

  function haptic(strength) {
    requireRt('nb_haptic');
    return Math.max(0, Math.min(1, strength == null ? 0.5 : strength));
  }

  function audio(kind) {
    requireRt('nb_audio');
    return String(kind || 'ui');
  }

  function skin(id) {
    requireRt('nb_skin');
    try { return localStorage.getItem('switch2.skin.' + id) || null; } catch (e) { return null; }
  }

  return { ABI: ABI, SYSCALLS: SYSCALLS, ready: ready, probe: probe, save: save, load: load, remove: remove, haptic: haptic, audio: audio, skin: skin };
})();
