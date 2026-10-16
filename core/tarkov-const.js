/*! TarkovConst — named constants (S7: no magic numbers for TTLs, budgets, flea) */
(function (global) {
  "use strict";
  if (global.TarkovConst && global.TarkovConst.__v >= 1) return;

  var SEC_HOUR = 3600;
  var SEC_DAY = 86400;
  var MS_SECOND = 1000;
  var MS_MINUTE = 60 * MS_SECOND;
  var MS_HOUR = 60 * MS_MINUTE;
  var MS_DAY = 24 * MS_HOUR;

  var CONST = {
    __v: 1,
    /** Time */
    SEC_PER_HOUR: SEC_HOUR,
    SEC_PER_DAY: SEC_DAY,
    MS_PER_SECOND: MS_SECOND,
    MS_PER_MINUTE: MS_MINUTE,
    MS_PER_HOUR: MS_HOUR,
    MS_PER_DAY: MS_DAY,
    /** API cache */
    API_MEMORY_TTL_MS: 90 * MS_SECOND,
    API_LS_TTL_MS: 5 * MS_MINUTE,
    LOCALE_TTL_MS: MS_DAY,
    /** Restock / timers */
    RESTOCK_DEFAULT_CYCLE_MS: 3 * MS_HOUR,
    RESTOCK_CYCLE_MIN_MS: 30 * MS_MINUTE,
    RESTOCK_CYCLE_MAX_MS: 12 * MS_HOUR,
    RAID_DEFAULT_DURATION_MS: 20 * MS_MINUTE,
    /** Economy / UI defaults */
    DEFAULT_GUN_BUDGET: 500000,
    FLEA_TAX_VOUCHER: 0.05,
    FLEA_OUTLIER_RATIO: 0.05,
    FLEA_OUTLIER_REPLACE: 0.35
  };

  global.TarkovConst = CONST;
  if (global.TarkovTools) global.TarkovTools.Const = CONST;
})(typeof window !== "undefined" ? window : globalThis);
