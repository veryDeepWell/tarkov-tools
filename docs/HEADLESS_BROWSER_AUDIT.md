# Headless-аудит Tarkov Tools — R-3a

Проверка выполнена в Playwright 1.62.1 и headless Edge. Браузер запускался отдельным процессом с временными контекстами. Системные мышь, клавиатура, буфер обмена и пользовательские вкладки не использовались. Внешние релизные `.md` не изменены.

## Итог

**89 сценариев успешно прошли при последнем запуске каждого сценария:** 71 страница инструментов, 16 рабочих сценариев и 2 проверки среды/сети. Отдельно проходят 26 автономных регрессий, 23 UX-контракта, проверки изображений, архитектуры, целостности, каталога и оба shell-контракта.

Результат собран из полного прогона и адресных повторов после исправлений; исходные попытки не скрыты: `artifacts/browser-audit/verified-results.json` содержит результаты и историю. В полном прогоне последний неуспешный сценарий был ошибкой теста редактора: он ожидал автоматическое открытие формы после создания метки. Реальный интерфейс открывает форму при клике по созданной метке; исправленный сценарий прошёл.

## Данные и границы проверки

- Использованы реальные ответы 34 endpoint tarkov.dev: PvE/PvP, предметы, квесты, крафты, бартеры, убежище, торговцы, карты и переводы RU/EN. Ответы сохранены в локальный снимок, чтобы повторы не зависели от смены цен. Доступ к живому API дополнительно подтверждён.
- Для массового обхода внешние изображения заменяются нейтральными картинками. Реальная загрузка одного изображения предмета проверена отдельным сценарием; все внешние изображения этим не проверены.
- OCR выполнялся настоящим Tesseract на PNG с читаемым английским названием ключа. Прочитанный текст сопоставлен с русским каталогом. Это проверка интеграции OCR, а не измерение качества распознавания настоящей ключницы/документницы/SICC.
- Анонимный доступ в редактор карт проверен отдельно. Создание, изменение, сохранение и экспорт метки проверены с фикстурой разрешённой сессии; реальный служебный пароль не читался и не использовался.
- Две существующие заглушки (`drip-builder`, `loadout-budget`) проверены как явно обозначенные заглушки, не как работающие конструкторы. Каталог ивентов проверен с пустой редакционной базой.
- Проверялся десктопный viewport 1440×1000. Полная проверка мобильной вёрстки, всех сочетаний параметров и всех возможных цепочек не заявляется.

## Рабочие цепочки

1. Предмет → конкретный квест → другой предмет → тот же квест → исходный предмет. Четыре перехода с сохранением ID.
2. Предмет → квест → другой предмет внутри мини-табов хаба. Проверена идентичность iframe: вкладка квестов не превращается в страницу предмета под старой подписью.
3. Предмет → конкретный крафт, бартер или станция убежища. Проверены ID и открытие требуемой сущности.
4. Профиль: редактирование, навык в другой вкладке, PvE/PvP, экспорт/импорт и восстановление активного профиля.
5. Загруженный каталог ключей обновляется на PvP после изменения профиля в другой вкладке.
6. Алерт из «Моего Таркова» → правило сирены → уведомление → запуск/остановка → удаление из дашборда отражается в сирене.
7. История цен: снимок → поиск предмета → график → перезагрузка с сохранённой историей.
8. Табличная ссылка на предмет доступна с клавиатуры; двойной клик открывает инспектор, Escape закрывает его.
9. HTTP 500: читаемая ошибка, разблокированная кнопка и успешный повтор. Проверены также пустой ответ предметов и повреждённый JSON импорта без изменения профилей.

## Исправления, обнаруженные браузером

- После загрузки патронов таблица оставалась пустой: выбор калибра выполнялся после отрисовки. Исправлен порядок.
- В ключах начальная карта могла не иметь ни одного ключа; добавлен выбор непустой карты и классификация ключей общежитий как Customs.
- Устаревшие адреса переводов квестов возвращали 404. Общий API теперь получает действительные словари и локализует отображаемые поля, сохраняя ID и машинные enum.
- Реальный API использует `stimEffects`; общий адаптер предоставляет единый формат эффектов, стимуляторы и их свойства больше не исчезают из таблиц.
- Граф бартеров не учитывал реальное поле `offeredItem`: добавлена связь награды и отображение ссылок из карточки.
- В квестах не было обратного перехода к предметам. Добавлена раскрываемая информация о целях, нужных предметах, ключах, наградах и предшественниках.
- У ряда таблиц отсутствовали ID в ячейке имени. Восстановлены ID и видимая ссылка ↗ в карточку: переход не требует скрытого жеста или режима инспектора.
- Случайный лоадаут падал с `Maximum call stack size exceeded`: исправлен рекурсивный fallback имени и явные зависимости страницы. Такой же ошибочный fallback исправлен в других инструментах.
- «Лут за слот» не строил результат из-за перезаписи глобальной функции `render`. Разделены функция расчёта и профильный обработчик.
- Крупные снимки предметов/карт превышали квоту localStorage и засоряли консоль. Крупные ответы остаются в памяти; персистентный API-кэш ограничен и не вытесняет профили.
- Английский текст OCR не совпадал со slug при русском отображаемом имени. Нормализация теперь одинаково обрабатывает пробелы и дефисы.
- Устранён лишний 404 при поиске локальной базы оценок ключей.
- Исправлены повреждённые строки рестока, устаревшие счётчики после очистки марафона и отсутствующие общие переводы. Незавершённые страницы честно обозначены во всех пяти локалях.
- В списке доступного контента ID ссылочных сущностей заменены читаемыми именами из общего каталога.

## Покрытие страниц

В таблице «PASS» означает успешное выполнение записанного сценария; это не обещание проверки всех комбинаций на странице.

| Страница | Название | Результат | Сценарий |
|---|---|---|---|
| `tarkovtool-ammo.html` | Патроны | PASS | Загрузка API; nonempty results: 6; sort both directions |
| `tarkovtool-armor.html` | Броня | PASS | Загрузка API; nonempty results: 396; search and reset; sort both directions |
| `tarkovtool-barter-calc.html` | Бартер (ручной) | PASS | click #addItemBtn; click .remove-btn:last-child |
| `tarkovtool-barter-live.html` | Бартер (live) | PASS | click #fetchPricesBtn; click #addItemBtn |
| `tarkovtool-barter-opt.html` | Оптимизатор бартера | PASS | Загрузка API; nonempty results: 884; search and reset; sort both directions |
| `tarkovtool-battle-pass.html` | Боевой пропуск | PASS | progress persists |
| `tarkovtool-bosses.html` | Боссы | PASS | Загрузка API; click #refreshGoons |
| `tarkovtool-btc-farm.html` | BTC Farm | PASS | click #recalcBtn; click #priceBtn |
| `tarkovtool-cases.html` | Ящики | PASS | Загрузка API; click .case-card; click #modalClose |
| `tarkovtool-challenge.html` | Челлендж | PASS | click #rollBtn; click #doneBtn |
| `tarkovtool-compare.html` | Сравнение | PASS | Загрузка API; click #clearSel |
| `tarkovtool-containers.html` | Контейнеры | PASS | Загрузка API; nonempty results: 105; search and reset; sort both directions |
| `tarkovtool-crafts.html` | Крафты | PASS | Загрузка API; nonempty results: 54; search and reset; sort both directions |
| `tarkovtool-cultist.html` | Круг культистов | PASS | Загрузка API; click #fill350; click #fill400; click #clearBtn |
| `tarkovtool-desk.html` | Desk | PASS | click #addBtn; click #plist [data-file], #plist a |
| `tarkovtool-drip-builder.html` | Дрип-билдер | PASS | Явная заглушка; реализация отсутствует |
| `tarkovtool-drip-loadout.html` | Дрип-лоадаут | PASS | click #btnGo; generated loadout |
| `tarkovtool-drip.html` | Дрип | PASS | Загрузка API; nonempty results: 300; search and reset; sort both directions |
| `tarkovtool-effects.html` | Эффекты | PASS | Загрузка API; nonempty results: 301; search and reset |
| `tarkovtool-events.html` | Ивенты | PASS | Фильтры и явное пустое состояние редакционной базы |
| `tarkovtool-food.html` | Еда и вода | PASS | Загрузка API; nonempty results: 45; search and reset; sort both directions |
| `tarkovtool-gun-budget.html` | Оружие за N ₽ | PASS | Загрузка API; click #gunList > *; click #buildBtn |
| `tarkovtool-gun-builder.html` | Сборка оружия | PASS | Загрузка API; click #weaponSuggest > *; click #zoomIn; click #zoomReset; click #abScan |
| `tarkovtool-gun-rating.html` | Рейтинг оружия | PASS | Загрузка API; nonempty results: 150; search and reset; sort both directions |
| `tarkovtool-headphones.html` | Наушники | PASS | Загрузка API; nonempty results: 12; search and reset; sort both directions |
| `tarkovtool-helmets.html` | Шлемы | PASS | Загрузка API; nonempty results: 112; search and reset; sort both directions |
| `tarkovtool-hideout-mgmt.html` | Управление убежищем | PASS | Загрузка API; nonempty results: 214; sort both directions |
| `tarkovtool-hideout.html` | Убежище | PASS | Загрузка API; click #loadBtn; station persists |
| `tarkovtool-hitboxes.html` | Хитбоксы и урон | PASS | click #bodySvg [data-zone], #bodySvg [data-part]; click #btnHeal; click #btnReset |
| `tarkovtool-item-card.html` | Карточка предмета | PASS | Загрузка API; click #openBtn; open exact item |
| `tarkovtool-item-use.html` | Применение | PASS | Перенаправление в общую карточку и открытие ID |
| `tarkovtool-key-analyzer.html` | Оценщик ключей | PASS | Загрузка API; click #matchBtn |
| `tarkovtool-keys.html` | Ключи | PASS | Загрузка API; nonempty results: 23; search and reset; sort both directions |
| `tarkovtool-lang-search.html` | Поиск по языкам | PASS | Загрузка API; multilingual lookup |
| `tarkovtool-loadout-budget.html` | Лоадаут за N ₽ | PASS | Явная заглушка; реализация отсутствует |
| `tarkovtool-loadout-builder.html` | Лоадаут-билдер | PASS | click #btnSave |
| `tarkovtool-loot-slot.html` | Лут-слоты | PASS | Загрузка API; click #suggest > div |
| `tarkovtool-mags.html` | Магазины | PASS | Загрузка API; nonempty results: 224; search and reset; sort both directions |
| `tarkovtool-map-admin.html` | Карта · админ | PASS | Анонимный gate; редактирование/экспорт — отдельный сценарий |
| `tarkovtool-map.html` | Карта | PASS | click #btnFilters; click #btnNone; click #btnAll; click #btnFit |
| `tarkovtool-marathon.html` | Марафон | PASS | Загрузка API; click #superBtn; click #clearBtn |
| `tarkovtool-medkits.html` | Аптечки | PASS | Загрузка API; nonempty results: 20; sort both directions |
| `tarkovtool-mods.html` | Моды | PASS | Загрузка API; nonempty results: 22; sort both directions |
| `tarkovtool-my-tarkov.html` | My Tarkov | PASS | click #loadContent; available content |
| `tarkovtool-names.html` | Имена | PASS | click #btnGen; click #btnCopy |
| `tarkovtool-nvg.html` | ПНВ | PASS | Загрузка API; nonempty results: 21; search and reset; sort both directions |
| `tarkovtool-plates.html` | Плиты | PASS | Загрузка API; nonempty results: 117; sort both directions |
| `tarkovtool-prestige.html` | Престижинатор | PASS | click #btnDemo; click #btnAssemble; click #optRun; click #btnClear |
| `tarkovtool-price-alarm.html` | Price Alarm | PASS | click #addRule; click [data-del] |
| `tarkovtool-price-track.html` | Динамика цен | PASS | snapshot controls ready; full history scenario in flows |
| `tarkovtool-quest-cheese.html` | Квест-чиз | PASS | Загрузка API; click #suggest > * |
| `tarkovtool-quest-items.html` | Квест-предметы | PASS | Загрузка API; nonempty results: 264; sort both directions |
| `tarkovtool-quests.html` | Квесты | PASS | Загрузка API; nonempty results: 499; search and reset; sort both directions |
| `tarkovtool-raid-checklist.html` | Чек-лист рейда | PASS | click #addBtn; click #checkAll; click #uncheckAll |
| `tarkovtool-random-fact.html` | Случайный факт | PASS | click #nextBtn; click #refreshDyn |
| `tarkovtool-random-loadout.html` | Рандомный лоадаут | PASS | click #btnGo; generated loadout |
| `tarkovtool-repair.html` | Починка | PASS | Загрузка API; Открытие и проверка результата/пустого состояния |
| `tarkovtool-restock.html` | Таймер рестока | PASS | Загрузка API; click #refreshBtn; refresh traders |
| `tarkovtool-scopes.html` | Прицелы | PASS | Загрузка API; nonempty results: 231; search and reset; sort both directions |
| `tarkovtool-seasons.html` | Сезоны | PASS | Открытие и проверка результата/пустого состояния |
| `tarkovtool-shopping-list.html` | Список покупок | PASS | Загрузка API; click #suggest button; click #addBtn; list persists |
| `tarkovtool-shortname.html` | Короткие имена | PASS | Загрузка API; Открытие и проверка результата/пустого состояния |
| `tarkovtool-skills.html` | Скиллы | PASS | click #saveSkills |
| `tarkovtool-sources.html` | Источники | PASS | reference links |
| `tarkovtool-stash-packer.html` | Уклад схрона | PASS | Загрузка API; click #packBtn |
| `tarkovtool-stim-combos.html` | Комбо стимов | PASS | Загрузка API; Открытие и проверка результата/пустого состояния |
| `tarkovtool-stims.html` | Стимуляторы | PASS | Загрузка API; nonempty results: 40; sort both directions |
| `tarkovtool-streamer-flip.html` | Стример-флип | PASS | Загрузка API; nonempty results: 21; search and reset; sort both directions |
| `tarkovtool-strength-calc.html` | Калькулятор силы | PASS | click #preset21 |
| `tarkovtool-trader-flip.html` | Трейдер-флип | PASS | Загрузка API; nonempty results: 717; search and reset; sort both directions |
| `tarkovtool-xp.html` | Опыт | PASS | Открытие и проверка результата/пустого состояния |

## Повторный запуск

См. раздел headless-проверки в README. Основная команда: `node scripts/browser-audit.cjs all`. Отдельные этапы: `exercise`, `flows`; `AUDIT_TOOLS` ограничивает страницы, `AUDIT_CASES` — имена сценариев регулярным выражением.

Артефакты находятся в `artifacts/browser-audit/` (исключены из Git):

- `verified-results.json` — итог по последней попытке и история запусков;
- `results-all.json` — исходный полный прогон;
- `results-flows.json`, `results-exercise.json` — адресные повторы;
- `chain-complete.png`, `item-real-image.png` — снимки проверенных страниц;
- `snapshots/` — реальные ответы API с URL и временем получения.

Во время тестов сервер и браузер останавливаются в `finally`; фоновые страницы не остаются запущенными после завершения процесса.
