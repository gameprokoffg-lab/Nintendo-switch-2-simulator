'use strict';

/* =====================================================================
   Прошивка консоли.
   DEFAULT_TEXT — «заводская» ОС отдельным файлом. Её вес считается
   по строкам (1 строка = 100 МБ) и вычитается из памяти консоли.
   ===================================================================== */
var Firmware = (() => {
  const DEFAULT_TEXT = [
    '//#name: Switch OS 2.0',
    '//#version: 2.0',
    '//#accent: #19c3e8',
    '// SwitchFirmware — блок системы консоли.',
    '// Здесь задаются обои, акцент, заголовок и свои настройки.',
    'var SwitchFirmware = {',
    '  name: "Switch OS 2.0",',
    '  version: "2.0",',
    '  accent: "#19c3e8",',
    '  homeTitle: "Nintendo Switch 2",',
    '  autoRun: false,',
    '  wallpaper: "radial-gradient(120% 100% at 20% 0%, #16202c 0%, #0b0e13 60%)",',
    '  settings: [',
    '    { key: "autoRun", label: "Автозапуск картриджа", type: "bool" },',
    '    { key: "hints", label: "Подсказки на экране", type: "bool" }',
    '  ]',
    '};',
  ].join('\n');

  const cache = new Map();

  function linesOf(text) {
    return Math.max(1, String(text || '').split(/\r?\n/).length);
  }

  function parse(text) {
    const src = String(text || DEFAULT_TEXT);
    if (cache.has(src)) return cache.get(src);
    let obj = null;
    try {
      obj = (new Function(src + '\n;return typeof SwitchFirmware !== "undefined" ? SwitchFirmware : null;'))();
    } catch (e) {
      obj = null;
    }
    const meta = {};
    for (const line of src.split(/\r?\n/).slice(0, 40)) {
      const m = line.match(/^\s*\/\/\s*#\s*(\w+)\s*:\s*(.+)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
    }
    const f = obj || {};
    const settings = (Array.isArray(f.settings) ? f.settings : []).filter((s) => s && s.key).map((s) => ({
      key: String(s.key),
      label: String(s.label || s.key),
      type: s.type === 'text' ? 'text' : 'bool',
      value: s.value,
    }));
    const fw = {
      name: f.name || meta.name || 'Switch OS',
      version: f.version || meta.version || '2.0',
      accent: f.accent || meta.accent || '#19c3e8',
      wallpaper: f.wallpaper || null,
      homeTitle: f.homeTitle || meta.title || 'Nintendo Switch 2',
      bootLog: Array.isArray(f.bootLog) ? f.bootLog.map(String) : [],
      autoRun: !!f.autoRun,
      features: Array.isArray(f.features) ? f.features.map(String) : [],
      settings,
      source: src,
      lines: linesOf(src),
      weightMB: linesOf(src) * 100,
      isDefault: src === DEFAULT_TEXT,
      valid: !!obj,
    };
    cache.set(src, fw);
    return fw;
  }

  function active() {
    const text = window.Store ? Store.firmwareText() : null;
    return parse(text || DEFAULT_TEXT);
  }

  return { DEFAULT_TEXT, parse, active, linesOf, has: (feature) => active().features.indexOf(feature) >= 0 };
})();
