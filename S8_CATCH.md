# S8 — no empty catch

## Правило
`catch (e) {}` запрещён. Минимум — `console.debug` (не шумит в обычной консоли).

```js
catch (e) {
  try { console.debug && console.debug("[tt:tool]", e); } catch (_tt) { /* ignore */ }
}
```

## `TarkovUI.softCatch(err, tag)`
Опциональный хелпер; в массовой замене использован прямой `console.debug`.

## Объём
~74 файла, ~362 catch в `js/` + `core/`.

## Файлы
Весь `js/*.js` и `core/*.js` с бывшими пустыми catch + `tarkov-ui.js`.

> Патч от baseline zip; накладывать поверх S1–S7 или мержить вручную, если уже правили те же файлы.
