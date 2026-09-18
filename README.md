# FIX_BUNDLE — price-track only

Скопировать в репо:

```
tools/tarkovtool-price-track.js
tools/tarkovtool-price-track.html
tools/tarkov-price-track-boot.js
```

## Фиксы
1. **lastSnap / nextSnapAt** пишутся в localStorage при каждом снимке (и в фоне, и вручную)
2. **Обратный отсчёт** на странице + в мини-табе («через Xm Yс · был ДД.ММ ЧЧ:ММ»)
3. **График** — тёмный фон canvas, яркие линии, Resize, 1 точка рисуется
4. Resume фона учитывает `nextSnapAt` (не сбрасывает таймер при открытии)

После пуша: Ctrl+F5 → «Снять сейчас» → клик по предмету в списке.
