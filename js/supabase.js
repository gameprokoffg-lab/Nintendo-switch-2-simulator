// ============================================================
// Supabase-синк для Nintendo Switch 2 симулятора
// Публичные данные: лидерборд рекордов + eShop-публикации.
// Offline-first: локальная очередь, синк при появлении сети.
// REST (PostgREST) через fetch — без библиотек и CDN.
// ============================================================
(function () {
  var CONFIG = {
    url: 'https://xhbeanrnyeplutsuytph.supabase.co',
    anon: 'sb_publishable_FQPfZbyIz93sOC3X4pS8AA_Fe2yFh3W',
    tableRecords: 'records',
    tablePublications: 'publications',
    // максимально долго ждём сеть, чтобы не тормозить офлайн-запуск
    offlineMs: 2500,
  };

  var enabled = false;   // true после первого успешного соединения (и если есть сеть)
  var queueKey = 'switch2.supabase.queue';  // очередь публикаций, отложенных офлайн
  var pending = {};      // { 'records:tetris': true } защита от дублей в рамках сессии

  function localStorageOk() { return typeof localStorage !== 'undefined'; }
  function readQueue() {
    if (!localStorageOk()) return [];
    try { var r = JSON.parse(localStorage.getItem(queueKey) || '[]'); return Array.isArray(r) ? r : []; }
    catch (e) { return []; }
  }
  function writeQueue(q) { if (localStorageOk()) { try { localStorage.setItem(queueKey, JSON.stringify(q)); } catch (e) {} } }

  // Есть ли вообще сеть судя по браузеру
  function online() { return typeof navigator !== 'undefined' ? navigator.onLine !== false : true; }

  // Дев-лог: пишем и в журнал дев-мода, и в консоль браузера.
  function log(msg) {
    try { if (window.Dev && Dev.log) Dev.log('Supabase: ' + msg); } catch (e) {}
    try { if (window.console && console.log) console.log('[supabase] ' + msg); } catch (e) {}
  }

  // Базовый REST-запрос к PostgREST. Логирует каждый шаг и не висит вечно.
  function request(path, opts) {
    opts = opts || {};
    var method = opts.method || 'GET';
    var headers = {
      apikey: CONFIG.anon,
      Authorization: 'Bearer ' + CONFIG.anon,
      'Content-Type': 'application/json',
    };
    if (opts.headers) for (var k in opts.headers) headers[k] = opts.headers[k];

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CONFIG.requestMs || 9000) : null;
    var started = Date.now();
    log('→ ' + method + ' ' + path);

    return fetch(CONFIG.url + '/rest/v1/' + path, {
      method: method,
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      var ms = Date.now() - started;
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        log('✗ ' + method + ' ' + path + ' → HTTP ' + res.status + ' за ' + ms + ' мс');
        return res.text().then(function (t) {
          log('✗ ответ сервера: ' + String(t).slice(0, 200));
          throw new Error('HTTP ' + res.status + ': ' + t.slice(0, 160));
        });
      }
      if (opts.expectNoBody) {
        log('✓ ' + method + ' ' + path + ' → ' + res.status + ' за ' + ms + ' мс');
        return null;
      }
      var ct = res.headers.get('content-type') || '';
      var parsed = ct.indexOf('json') >= 0 ? res.json() : res.text();
      return parsed.then(function (data) {
        var n = Array.isArray(data) ? data.length + ' строк' : 'ok';
        log('✓ ' + method + ' ' + path + ' → ' + res.status + ', ' + n + ', ' + ms + ' мс');
        return data;
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      var m = String((err && err.message) || err);
      if (err && err.name === 'AbortError') log('✗ таймаут запроса: ' + method + ' ' + path);
      else if (m.indexOf('HTTP ') !== 0) log('✗ сеть: ' + method + ' ' + path + ' — ' + m);
      throw err;
    });
  }

  // Быстрая проверка доступности (один лёгкий GET)
  function check() {
    if (!online()) { enabled = false; log('проверка: браузер считает, что сети нет'); return Promise.resolve(false); }
    return request(CONFIG.tableRecords + '?select=id&limit=1')
      .then(function () { enabled = true; log('проверка: соединение OK'); return true; })
      .catch(function () { enabled = false; log('проверка: соединения нет'); return false; });
  }

  // ---------- Лидерборд ----------
  function topRecords(game, limit) {
    limit = limit || 10;
    return request(CONFIG.tableRecords + '?game=eq.' + game + '&order=score.asc,id.asc&limit=' + limit);
  }

  // Отправить рекорд. score: для конца (тетрис/сердце/штурм) — очки, больше лучше;
  // для гонок (isTime) — миллисекунды, меньше лучше. очередь офлайн-записей.
  function submitRecord(rec) {
    rec = rec || {};
    var name = String(rec.player || 'Игрок').slice(0, 24);
    var game = String(rec.game || 'tetris');
    var isTime = !!rec.time;
    var score = Number(rec.score || 0);
    var entry = {
      game: game,
      player: name,
      score: score,
      is_time: isTime,
      user_id: rec.userId || null,
    };
    return enqueueAndSend('records', entry);
  }

  // ---------- eShop-публикации ----------
  function submitPublication(pub) {
    if (!pub || !pub.id) return Promise.resolve({ ok: false, error: 'Нет id' });
    // Храним ПОЛНЫЙ объект публикации в jsonb-колонке data, чтобы скачивание
    // игры из eShop работало (нужны code, sizeMB, img, menuImg, section и т.д.).
    var entry = {
      id: String(pub.id),
      author: String(pub.author || 'Аноним').slice(0, 40),
      name: String(pub.name || 'Без названия').slice(0, 80),
      section: String(pub.section || 'games').slice(0, 20),
      created_at: Number(pub.createdAt || Date.now()),
      data: pub,
    };
    return enqueueAndSend('publications', entry);
  }

  // Подтянуть все публикации из базы (для отображения в eShop).
  function fetchPublications() {
    if (!online()) { log('публикации: браузер считает, что сети нет — пропуск'); return Promise.resolve([]); }
    log('публикации: загружаю из базы…');
    return request(CONFIG.tablePublications + '?select=*&order=created_at.desc')
      .then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];
        var full = 0;
        for (var i = 0; i < rows.length; i++) {
          var d = rows[i] && rows[i].data;
          if (d && typeof d === 'object' && Object.keys(d).length) full++;
        }
        log('публикации: получено ' + rows.length + ', с полными данными (data): ' + full);
        if (rows.length && full < rows.length) {
          log('публикации: у ' + (rows.length - full) + ' записей нет data — запустите миграцию из supabase.sql (alter table … add column data)');
        }
        return rows.map(function (r) {
          var o = (r.data && typeof r.data === 'object') ? r.data : {};
          return Object.assign({}, o, {
            id: r.id,
            author: r.author,
            name: r.name,
            createdAt: r.created_at,
          });
        });
      })
      .catch(function (e) {
        log('публикации: ОШИБКА — ' + (e && e.message || e));
        return [];
      });
  }

  // Общий pull: загрузить публикации и слить в локальный eShop.
  // reason — откуда вызвано: boot | account | eshop | sync.
  function pullAll(reason) {
    reason = reason || 'manual';
    if (!online()) { log('pull(' + reason + '): сети нет — пропуск'); return Promise.resolve([]); }
    log('pull(' + reason + '): старт');
    return fetchPublications().then(function (list) {
      var merged = false;
      try {
        if (window.Store && Store.mergePublished) merged = Store.mergePublished(list);
      } catch (e) { log('pull(' + reason + '): ошибка слияния — ' + (e && e.message || e)); }
      log('pull(' + reason + '): получено ' + list.length + ', новых в eShop: ' + (merged ? 'да' : 'нет'));
      return list;
    });
  }

  // Общая отправка с локальной очередью
  function enqueueAndSend(table, entry) {
    var key = table + ':' + JSON.stringify(entry);
    if (pending[key]) return Promise.resolve({ ok: true, queued: true });
    pending[key] = true;

    // Если браузер говорит, что сеть есть — пробуем отправить сразу.
    // При любой ошибке (нет доступа, RLS, выключена сеть) — кладём в локальную
    // очередь и вернёмся позже. Это и есть offline-first.
    if (online()) {
      log('отправка в ' + table + ': пробую сейчас…');
      return sendToServer(table, entry)
        .then(function () { enabled = true; log('отправка в ' + table + ': OK'); return { ok: true }; })
        .catch(function (e) {
          pushLocal(table, entry);
          log('отправка в ' + table + ': не вышло (' + (e && e.message || e) + ') — в очередь');
          return { ok: true, queued: true, offline: true };
        });
    }
    // сети нет — откладываем
    pushLocal(table, entry);
    log('отправка в ' + table + ': сети нет — в очередь');
    return Promise.resolve({ ok: true, queued: true, offline: true });
  }

  function sendToServer(table, entry) {
    if (table === 'records') {
      // upsert по (game, score, player) — чтобы не плодить дубли при повторном синке
      return request(CONFIG.tableRecords + '?on_conflict=game,score,player', {
        method: 'POST',
        body: entry,
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        expectNoBody: true,
      });
    }
    // publications: merge-duplicates — повторная публикация обновит data
    return request(CONFIG.tablePublications + '?on_conflict=id', {
      method: 'POST',
      body: entry,
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      expectNoBody: true,
    });
  }

  function pushLocal(table, entry) {
    var q = readQueue();
    q.push({ table: table, entry: entry });
    // ограничим очередь, чтобы не расти без сети
    if (q.length > 500) q = q.slice(q.length - 500);
    writeQueue(q);
    log('очередь: ' + q.length + ' записей');
  }

  function flushQueue() {
    if (!online()) return Promise.resolve();
    var q = readQueue();
    if (!q.length) return Promise.resolve();
    writeQueue([]); // убрали из очереди — если что-то упадёт, не зациклимся

    var seq = Promise.resolve();
    q.forEach(function (item) {
      seq = seq.then(function () { return sendToServer(item.table, item.entry).catch(function () { return null; }); });
    });
    return seq;
  }

  function sync() {
    if (!online()) { log('sync: сети нет — пропуск'); return Promise.resolve(false); }
    log('sync: старт');
    return check().then(function (up) {
      if (!up) return false;
      return flushQueue()
        .then(function () { return pullAll('sync'); })
        .then(function () { log('sync: готово'); return true; });
    });
  }

  // ---------- подключение к событию сети ----------
  function onVisibleOrOnline() {
    if (!online()) return;
    // один раз на старте пробуем, дальше только по событию + при показе
    sync().catch(function () {});
  }

  if (typeof window !== 'undefined') {
    if (window.addEventListener) {
      window.addEventListener('online', onVisibleOrOnline);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') onVisibleOrOnline();
      });
    }
  }

  // Первый холодный синк (не блокирует загрузку игры)
  setTimeout(function () { onVisibleOrOnline(); }, 800);

  window.SupabaseSync = {
    config: CONFIG,
    enabled: function () { return enabled; },
    check: check,
    sync: sync,
    topRecords: topRecords,
    submitRecord: submitRecord,
    submitPublication: submitPublication,
    fetchPublications: fetchPublications,
    pullAll: pullAll,
    flushQueue: flushQueue,
    online: online,
  };
})();