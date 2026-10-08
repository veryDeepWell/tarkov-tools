# Changelog

Формат близок к [Keep a Changelog](https://keepachangelog.com/). Версии проекта — по смыслу релизов Tarkov Tools (см. roadmap), не обязательно strict semver npm.

## [1.0] — 2026-10-08 — «Я здесь»

### Документация

- README, USER_GUIDE, TROUBLESHOOTING, DESCRIPTION, API, ARCHITECTURE в актуальном виде под текущий контракт
- Акцент на хаб, core, storage `tt:`, без выдуманных инструментов

### Платформа (накопленное к 1.0)

- Хаб: каталог, категории, закрепы, настройки, уведомления, мини-табы
- Core: TarkovAPI, TarkovStorage, TarkovI18n, TarkovNames, TarkovPoll, domain-модули
- Live: price-track, price-alarm, restock (и другие live по каталогу)
- Набор статических справочников и калькуляторов в `tools/`
- CI: architecture lint, catalog check, domain/tool contract scripts

### Карта

- Инструмент карты: локальные assets, маркеры из API, несколько локаций, фильтры и этажи
- Не iframe целого tarkov.dev

## [Unreleased]

- Уточнения roadmap 1.1+ (профиль ЧВК и далее) — вне кода, в docs roadmap

## [0.3.x] — 2026-09

- Унификация core (API, state, i18n)
- Контракты platform / tool checklist
- Правки price-track (persist снимков, countdown, график)

## [0.2.0] — 2026-09-17

- Мини-табы, Notify/reportStatus, категории каталога
- Настройки звука и внешнего вида, скрытие инструментов
- tarkov-api, tarkov-names, иконки
- Ряд loadout/barter/price инструментов

## [0.1.x] — 2026-09

- Первый хаб на GitHub Pages, тема, ранние инструменты
