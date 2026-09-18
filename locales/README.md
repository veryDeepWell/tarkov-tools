# Locales

- **English (`en.json`)** is the source of truth. Completion % for other languages is `translated_keys / en_keys`.
- Nested JSON keys become dotted paths: `hub.searchPlaceholder`, `tool.ammo.title`, `cat.flea`.
- Missing keys fall back to English at runtime (`TarkovI18n.t`).
- To add a language: copy `en.json` → `locales/<code>.json`, set `_meta`, translate values, register the code in `TarkovI18n.KNOWN` (`tarkov-i18n.js`).

Partial packs (`uk`, `de`, `zh-CN`) ship on purpose so the settings Language tab can show progress bars.
