# API Reference — Tarkov Tools

Документация по основным API для интеграции внешних систем и расширений.

---

## TarkovAPI

**Файл:** `core/tarkov-api.js`  
**Роль:** Единый boundary для доступа к tarkov.dev

### getJson(path, opts?)

> **Описание:** Выполняет GET-запрос через API с кэшированием  
> **Параметры:**
> - `path` (string): URL путь относительно `https://json.tarkov.dev/`
> - `opts.cache` (number): Время кэша в минутах (опционально, дефолт: 10)

**Примеры:**

```javascript
// Получить предметы
const items = await TarkovAPI.getJson('items', { cache: 30 });

// Получить бартеры у торговца
const barterData = await TarkovAPI.getJson('traders/merchant/barter', { mode: 'pve' });
```

### request(path, opts?)

> **Описание:** Legacy-метод для response-based consumers  
> **Возвращает:** raw ответ сервера (object)

```javascript
const barters = await TarkovAPI.request('traders/merchant/barter');
```

### items(mode?)

> **Описание:** Получение нормализованного списка предметов  
> **Параметры:**
> - `mode` ('pve' | 'pvz'): Режим игры (опционально)

**Возвращает:** `{ all, byId, byType }`

### barters(mode?)

> Возвращает данные бартеров у всех торговцов.

### traders(mode?)

> Возвращает информацию о торговых точках.

### clearCache()

> Очищает кэш (память + localStorage).

---

## TarkovState

**Файл:** `core/tarkov-state.js`  
**Роль:** Общие уведомления и мини-табы

### notify(payload)

> Создает уведомление.  
> **Параметры:**
> - `payload.title` (string): Заголовок (i18n key или текст)
> - `payload.body` (string): Тело сообщения
> - `payload.tool` (string): HTML файл инструмента (для группировки)
> - `payload.kind` ('success' | 'error' | 'warning' | 'info'): Цвет/тип

**Пример:**

```javascript
Notify({
  title: "Товар в наличии",
  body: "+5 шт. у торговца",
  tool: 'tarkovtool-restock.html',
  kind: 'success'
});
```

### notifications()

> Возвращает список уведомлений (массив объектов).

### markRead() / markToolRead(file)

> Помечает уведомления как прочитанные.

---

## TarkovI18n

**Файл:** `core/tarkov-i18n.js`  
**Роль:** Локализация

### t(key, params?)

> Ищет перевод по key с fallback на EN → key.  
> **Параметры:**
> - `key` (string): Ключ перевода (`locales/ru.json`)
> - `params` (object): Значения для форматирования

**Примеры:**

```javascript
// Простой ключ
const msg = TarkovI18n.t('prices.dropped'); // "Цена упала"

// С параметрами
const title = TarkovI18n.t('price.alert', { percent: -5 }); // "-5%"
```

### setLang(code) / current

> Устанавливает язык.  
> **Параметры:** `code` ('ru' | 'en')

```javascript
TarkovI18n.setLang('ru'); // Применяет RU к DOM
```

### applyDom(root?)

> Применяет локализацию к DOM с `[data-i18n]`.  
> **Параметры:** `root` (selector, опционально)

```javascript
TarkovI18n.applyDom('#app'); // Apply to #app
```

### toolTitle / toolDescription / catTitle

> Локализация заголовков каталога.

### ready

> Promise: когда все пакеты загружены.

---

## TarkovStorage

**Роль:** Abstraction over localStorage / IndexedDB

### get(key) / getJson(key)

> Получает данные из хранилища.  
> **Возвращает:** `null` если нет.

### set(key, value) / setJson(key, obj)

> Записывает в хранилище.

### remove(key)

> Удаляет ключ.

---

## TarkovNames

**Файл:** `core/tarkov-names.js`  
**Роль:** Локализация названий предметов

### display(id)

> Получает отображаемое название предмета.  
> **Логика:** shortName игры → API name → custom

```javascript
const name = TarkovNames.display('20587'); // "Броня (Kevlar 4)"
```

### search(pattern)

> Поиск предметов по части названия.

---

## TarkovItems (planned / Stage 2)

**Файл:** `core/tarkov-items.js`  
**Роль:** Нормализованные предметы, индекс

### load(mode?)

> Загружает и кэширует данные предметов в память.  
> **Возвращает:** `{ all, byId, byType }`

### byId(id, mode?)

> Получает предмет по ID.

### byType(type, mode?)

> Получает предметы по типу.

### clear()

> Очищает кэш из памяти.

---

## Summary

| API | Файл | Роль |
|-----|------|------|
| **TarkovAPI** | `tarkov-api.js` | Network boundary, кэширование |
| **TarkovState** | `tarkov-state.js` | Notifications, mini-tabs |
| **TarkovI18n** | `tarkov-i18n.js` | Локализация (t(), tt()) |
| **TarkovNames** | `tarkov-names.js` | Названия предметов |
| **TarkovCommon** | `tarkov-common.js` | Notify, beep(), fmtRub() |

---

## Storage Scheme

Все данные приложения в `localStorage` используют канонический префикс `tt:`
и namespace:

```javascript
// - tt:settings:*             (общие настройки)
// - tt:notif:v1                (уведомления)
// - tt:mini:v1                  (активные mini-tabs)
// - tt:state:v1                 (общий state)
// - tt:tool:<id>:meta           (live schedule / metadata)
// - tt:tool:<id>:data:*         (tool data)
// - tt:api:<hash>               (API cache)

// Пример: записать meta price-track
TarkovStorage.setJson('tt:tool:price-track:meta', {
  on: true,
  mins: 5,
  nextAt: Date.now() + 30000
});
```

Старые logical keys (`tarkov*`, `ttApi:*`) продолжают приниматься адаптером;
`TarkovStorage.migrateLegacyKeys()` переносит их централизованно. Новые
инструменты должны использовать `TarkovStorage`, не обращаться к
`localStorage` напрямую.
