# FIX_BUNDLE — только файлы для ручного пуша

Скопировать **с сохранением путей** в корень репо:

```
core/tarkov-names.js
tools/tarkovtool-price-track.js
tools/tarkovtool-price-track.html
tools/tarkov-price-track-boot.js
```

## Что чинит

1. **Имена-хеши** — API отдаёт `name`/`shortName` как `"<id> Name"`. Теперь берём humanized `normalizedName` (везде через TarkovNames).
2. **График** — ширина canvas (не 0 в layout), 1 точка тоже рисуется.
3. **Мини-таб трекера** — «каждые N мин · снимок ДД.ММ ЧЧ:ММ» из interval + lastSnap.

После пуша: Ctrl+F5, новый снимок в price-track (старые записи в IndexedDB могут ещё с хешами — «Снять сейчас» обновит).
