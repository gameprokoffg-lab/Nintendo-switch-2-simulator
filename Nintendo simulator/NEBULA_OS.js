//#name: NEBULA OS
//#version: 1.0
//#accent: #b06bff
//
// NEBULA OS — кастомная прошивка для симулятора Nintendo Switch 2.
// Ядро Nebula Runtime добавляет форматы NBS и SEC: на этой прошивке
// запускаются игры «СЕРДЦЕ НЕБУЛЫ» и «КРАСНЫЙ СЕКТОР».
//
// Установка: Game Loader -> загрузите этот файл -> галочка
// «Это кастомная ОС (прошивка)» -> Добавить картридж. Затем
// Настройки -> Разблокировать загрузчик -> Поставить кастомную ОС
// и вставьте фиолетовый картридж в терминал INSERT CARD.
//
// Вес прошивки = число строк × 100 МБ и вычитается из памяти консоли.

var SwitchFirmware = {
  name: "NEBULA OS",
  version: "1.0",
  accent: "#b06bff",
  homeTitle: "NEBULA OS",
  autoRun: false,
  wallpaper: "radial-gradient(120% 110% at 78% -10%, #3a1460 0%, #160a24 42%, #07070f 100%)",

  bootLog: [
    "nebula core: online",
    "runtime NBS v1.0 loaded",
    "runtime SEC v1.0 loaded",
    "welcome, operator"
  ],

  // features открывает игры, которым нужен рантайм Nebula.
  features: ["nebula"],

  settings: [
    { key: "autoRun", label: "Автозапуск картриджа", type: "bool" },
    { key: "scanlines", label: "Сканлайны интерфейса", type: "bool" },
    { key: "owner", label: "Позывной оператора", type: "text", value: "operator" }
  ]
};
