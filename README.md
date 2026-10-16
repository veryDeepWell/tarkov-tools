# R2.1.1 — CI fix: hub script order

`tool-contract-check.sh` требует:
`tarkov-storage.js` → **сразу** `tarkov-schema.js`

В `tarkovtool-hub.html` между ними стоял `tarkov-profile.js`.

Порядок теперь (догмат R-2):
storage → schema → profile → nav → …

Файл: `tarkovtool-hub.html` (корень репозитория)
