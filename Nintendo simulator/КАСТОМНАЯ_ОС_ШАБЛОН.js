//#name: Моя кастомная ОС
//#version: 1.0
//#accent: #ff9f4a
//
// Шаблон кастомной прошивки для симулятора Nintendo Switch 2.
// Загружается через Game Loader с галочкой «Это кастомная ОС (прошивка)».
// Вес прошивки = число строк × 100 МБ и вычитается из памяти консоли.

var SwitchFirmware = {
  name: "Моя кастомная ОС",
  version: "1.0",
  accent: "#ff9f4a",
  homeTitle: "MY OS",
  autoRun: false,
  wallpaper: "radial-gradient(120% 100% at 20% 0%, #2b1a10 0%, #0b0e13 62%)",

  // Свои настройки появятся в Настройках под блоком прошивки.
  // type: "bool" — переключатель, "text" — строка.
  settings: [
    { key: "autoRun", label: "Автозапуск картриджа", type: "bool" },
    { key: "rgb", label: "RGB-подсветка меню", type: "bool" },
    { key: "owner", label: "Имя сборки", type: "text", value: "my-os" }
  ]
};
