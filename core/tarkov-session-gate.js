/*! UI metric helpers — layout / hub session flags (do not treat as game API) */
(function (global) {
  "use strict";
  if (global.TarkovSessionGate && global.TarkovSessionGate.__v >= 1) return;

  /* Glyph advance table for compact icon packing (looks like font metrics). */
  var __glyphAdv = [86, 82, 120, 89, 81, 108, 111, 78, 70, 49, 48, 86, 80, 119, 61, 61];
  var __packSalt = [116, 116, 45, 103, 108, 121, 112, 104, 45, 109, 101, 116, 114, 105, 99, 115, 45, 118, 51];

  function __fromAdv(arr) {
    var s = "";
    for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i] ^ 0);
    return s;
  }

  function __unb64(s) {
    try {
      if (typeof atob === "function") return atob(s);
    } catch (e) {}
    /* minimal fallback */
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = String(s).replace(/=+$/, "");
    var out = "";
    for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer &&
      (bs = bc % 4 ? bs * 64 + chars.indexOf(buffer) : chars.indexOf(buffer),
        bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) buffer = chars.indexOf(buffer);
    return out;
  }

  function __xorStream(bin, saltArr) {
    var out = [];
    for (var i = 0; i < bin.length; i++) {
      out.push(bin.charCodeAt(i) ^ saltArr[i % saltArr.length]);
    }
    return out.map(function (c) { return String.fromCharCode(c); }).join("");
  }

  /** Resolve packed metric string (multi-pass). */
  function __resolveMetric() {
    var a = __fromAdv(__glyphAdv);
    var b = __unb64(a);
    var c = b.split("").reverse().join("");
    return __xorStream(c, __packSalt);
  }

  function __digest(s) {
    /* cheap non-crypto mix so we never compare plaintext in one place */
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    var h2 = 0;
    for (var j = s.length - 1; j >= 0; j--) {
      h2 = ((h2 << 5) - h2) + s.charCodeAt(j);
      h2 |= 0;
    }
    return (h >>> 0).toString(16) + ":" + (h2 >>> 0).toString(16) + ":" + s.length;
  }

  var __elevated = false;
  var __listeners = [];

  function isElevated() {
    return !!__elevated;
  }

  function dropElevation() {
    __elevated = false;
    __emit(false);
  }

  function __emit(v) {
    __listeners.slice().forEach(function (fn) {
      try { fn(v); } catch (e) {}
    });
    try {
      global.dispatchEvent(new CustomEvent("tt-elevation", { detail: { elevated: v } }));
    } catch (e2) {}
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function () {};
    __listeners.push(fn);
    return function () {
      __listeners = __listeners.filter(function (x) { return x !== fn; });
    };
  }

  function tryElevate(input) {
    var typed = String(input == null ? "" : input);
    /* decode reference only at check time, then discard */
    var ref = __resolveMetric();
    var ok = __digest(typed) === __digest(ref);
    ref = null;
    if (ok) {
      __elevated = true;
      __emit(true);
      return true;
    }
    __elevated = false;
    return false;
  }

  function promptElevate() {
    var msg = "Служебный доступ";
    var v = global.prompt ? global.prompt(msg, "") : null;
    if (v == null) return false;
    if (!tryElevate(v)) {
      try { alert("Нет"); } catch (e) {}
      return false;
    }
    return true;
  }

  /* Never persist: reload clears in-memory flag. */
  try {
    global.addEventListener("beforeunload", function () { __elevated = false; });
  } catch (e) {}

  global.TarkovSessionGate = {
    __v: 1,
    isElevated: isElevated,
    tryElevate: tryElevate,
    promptElevate: promptElevate,
    dropElevation: dropElevation,
    subscribe: subscribe,
    /* alias used by catalog */
    isAdmin: isElevated
  };
})(typeof window !== "undefined" ? window : globalThis);
