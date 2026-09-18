# P0 — Стабильность (ЗАПУШИТЬ ПЕРВЫМ)

## Файлы → корень репо `main` (replace)

| Файл | Размер |
|------|--------|
| `tarkov-common.css` | полный CSS (без PLACEHOLDER / без @import-костылей) |
| `tarkov-hub-app.js` | полный hub (без a0…b loader) |
| `tarkov-common.js` | полный common (без a1…b loader) |
| `tarkovtool-hub.html` | catalog + hub-top-row + favicon + css?v=7 |

## После пуша — удалить с main

```
tarkov-hub-app.a0.js  tarkov-hub-app.a1.js  tarkov-hub-app.a2.js
tarkov-hub-app.a3.js  tarkov-hub-app.b.js
tarkov-common.a1.js  tarkov-common.a2a.js  tarkov-common.a2b.js  tarkov-common.b.js
tarkov-common.p0.css  tarkov-common.p1.css  tarkov-common.p2.css   # если есть
```

## Проверка

1. Ctrl+F5 → hub: 45/45, стили на месте
2. Network: нет 404 на `.a*.js` / `.p*.css`
3. Консоль чистая
