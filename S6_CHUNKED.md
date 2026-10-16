# S6 — chunked client progress (5% steps)

## Контекст
`TarkovAPI.items()` — **один** HTTP. «5%» — про **обработку массива** после ответа, не про chunked network.

`progress.set` уже округляет к шагам 5%.

## API

```js
await TarkovUI.processChunked(items, function (item, i) {
  // sync work
}, {
  progress: TarkovUI.progress, // or __ttProgress
  fromPct: 10,
  toPct: 95,
  chunkSize: 80,  // items per setTimeout slice
  label: optional
});
```

- режет работу на куски → UI не клинит
- зовёт `progress.set` по ходу (5% quantize внутри)

`TarkovUI.__v = 6`

## Мигрированы (тяжёлые loaders)

| Тул | Что chunked |
|-----|-------------|
| mods | weapons + mods build |
| containers | rigs + backpacks |
| ammo | byCaliber rows |
| mags | magazine rows |
| compare | itemsById index |

Остальные могут подключить тот же helper при желании (S6b).

## Файлы
```
core/tarkov-ui.js
js/mods.js
js/containers.js
js/ammo.js
js/mags.js
js/compare.js
```
