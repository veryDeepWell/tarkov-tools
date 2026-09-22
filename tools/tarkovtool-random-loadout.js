(function () {
  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=String(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s)) {
      var n=String(it.name||'').trim();
      var sl=String(it.normalizedName||'').trim();
      if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
      else if(sl) s=sl;
    }
    return s||it.id||'';
  }

  var pool = null;
  function esc(s) {
    if (window.TarkovUI && TarkovUI.esc) return TarkovUI.esc(s);
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function label(it) {
    if (!it) return "";
    if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
    return itemName(it) || it.id || "";
  }
  function status(m, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = m;
  }
  function pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function priceOf(it) {
    return it ? (Number(it.avg24hPrice) || Number(it.lastLowPrice) || 0) : 0;
  }
  function props(it) {
    return (it && it.properties) || {};
  }
  /** Arena / special skins — best-effort from API fields + name heuristics */
  function isArenaSkin(it) {
    if (!it) return false;
    if (it.arenaOnly || it.isArena || it.arena) return true;
    var types = (it.types || []).map(function (t) { return String(t).toLowerCase(); });
    if (types.indexOf("arena") >= 0) return true;
    var cats = it.categories || [];
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var n = typeof c === "string" ? c : (c.name || c.slug || "");
      if (/arena/i.test(n)) return true;
    }
    var hay = [it.name, it.shortName, it.normalizedName, it.id].join(" ");
    if (/\barena\b/i.test(hay)) return true;
    return false;
  }
  function isPreset(it) {
    return (it.types || []).indexOf("preset") >= 0;
  }
  function blocksHeadset(it) {
    var p = props(it);
    if (p.blocksHeadset === true || p.blocksEarpiece === true) return true;
    // heavy face shields / "deafening" full helmets often block
    if (p.deafening && String(p.deafening).toLowerCase() === "high") return true;
    return false;
  }
  function isArmoredRig(it) {
    var p = props(it);
    var cls = Number(p.class || p.armorClass || 0);
    if (cls > 0) return true;
    var zones = p.zones || p.armorZones || [];
    if (zones && zones.length) return true;
    return false;
  }
  function isBodyArmor(it) {
    var p = props(it);
    return (it.types || []).indexOf("armor") >= 0 || p.propertiesType === "ItemPropertiesArmor";
  }

  function pdCell(cls, lab, it) {
    if (!it) {
      return '<div class="pd-slot empty ' + cls + '"><div class="lab">' + esc(lab) +
        '</div><div class="meta">—</div></div>';
    }
    var nm = label(it);
    var pr = priceOf(it);
    var icon = it.iconLink || it.gridImageLink || "";
    return '<div class="pd-slot ' + cls + '"><div class="lab">' + esc(lab) + '</div>' +
      (icon ? '<img src="' + esc(icon) + '" alt="">' : "") +
      '<div class="nm">' + esc(nm) + '</div>' +
      '<div class="pr">' + (pr ? pr.toLocaleString("ru-RU") + " ₽" : "") + "</div></div>";
  }
  function renderPaperdoll(slots) {
    var s = slots || {};
    var sum = ["gun", "armor", "helmet", "rig", "backpack", "headset", "glasses", "sec"].reduce(
      function (a, k) { return a + priceOf(s[k]); }, 0
    );
    document.getElementById("paperdoll").innerHTML =
      pdCell("pd-headset", "Наушники", s.headset) +
      pdCell("pd-helmet", "Шлем", s.helmet) +
      pdCell("pd-glasses", "Очки", s.glasses) +
      pdCell("pd-gun", "Оружие", s.gun) +
      pdCell("pd-armor", "Броня", s.armor) +
      pdCell("pd-rig", "Разгрузка", s.rig) +
      pdCell("pd-backpack", "Рюкзак", s.backpack) +
      pdCell("pd-sec", "Вторичка", s.sec) +
      '<div class="pd-total">Итого ~ ' + sum.toLocaleString("ru-RU") + " ₽</div>";
  }

  function filterPool(raw) {
    var excludeArena = !!(document.getElementById("excludeArena") || {}).checked;
    var p = { gun: [], armor: [], helmet: [], rig: [], backpack: [], headset: [], glasses: [] };
    raw.forEach(function (it) {
      if (!it || isPreset(it)) return;
      if (excludeArena && isArenaSkin(it)) return;
      var types = it.types || [];
      var pr = props(it);
      if (types.indexOf("gun") >= 0 && pr.propertiesType === "ItemPropertiesWeapon") {
        p.gun.push(it); return;
      }
      if (types.indexOf("helmet") >= 0 || pr.propertiesType === "ItemPropertiesHelmet") {
        p.helmet.push(it); return;
      }
      if (types.indexOf("armor") >= 0 || pr.propertiesType === "ItemPropertiesArmor") {
        p.armor.push(it); return;
      }
      if (types.indexOf("rig") >= 0 || pr.propertiesType === "ItemPropertiesChestRig") {
        p.rig.push(it); return;
      }
      if (types.indexOf("backpack") >= 0 || pr.propertiesType === "ItemPropertiesBackpack") {
        p.backpack.push(it); return;
      }
      if (types.indexOf("headphones") >= 0 || pr.propertiesType === "ItemPropertiesHeadphone") {
        p.headset.push(it); return;
      }
      if (types.indexOf("glasses") >= 0 || pr.propertiesType === "ItemPropertiesGlasses") {
        p.glasses.push(it); return;
      }
    });
    return p;
  }

  async function ensure() {
    status("Гружу предметы…");
    var mode = document.getElementById("gameMode").value || "pve";
    var arr = await TarkovAPI.items(mode);
    pool = filterPool(arr);
    status(
      "Пул: gun " + pool.gun.length +
      ", armor " + pool.armor.length +
      ", helm " + pool.helmet.length +
      ", rig " + pool.rig.length,
      true
    );
    return pool;
  }

  async function go() {
    var p = await ensure();
    var helmet = pick(p.helmet);
    var headset = null;
    if (helmet && blocksHeadset(helmet)) {
      headset = null; // несовместимо
    } else {
      headset = pick(p.headset);
    }

    // броня XOR бронеразгруз
    var armor = null, rig = null;
    var useArmoredRig = Math.random() < 0.35 && p.rig.some(isArmoredRig);
    if (useArmoredRig) {
      var armored = p.rig.filter(isArmoredRig);
      var soft = p.rig.filter(function (r) { return !isArmoredRig(r); });
      rig = pick(armored) || pick(soft);
      armor = null; // не надеваем броню поверх бронеразгрузки
    } else {
      armor = pick(p.armor);
      var softRigs = p.rig.filter(function (r) { return !isArmoredRig(r); });
      rig = pick(softRigs.length ? softRigs : p.rig);
      // if only armored rigs left and armor present, skip rig armor class conflict
      if (armor && rig && isArmoredRig(rig)) {
        rig = pick(softRigs) || null;
      }
    }

    renderPaperdoll({
      gun: pick(p.gun),
      armor: armor,
      helmet: helmet,
      rig: rig,
      backpack: pick(p.backpack),
      headset: headset,
      glasses: pick(p.glasses),
      sec: null
    });
    var notes = [];
    if (helmet && blocksHeadset(helmet)) notes.push("шлем блокирует наушники");
    if (!armor && rig && isArmoredRig(rig)) notes.push("бронеразгрузка вместо брони");
    status("Готово" + (notes.length ? " · " + notes.join("; ") : ""), true);
  }

  document.getElementById("btnGo").onclick = function () {
    go().catch(function (e) { status(String(e.message || e), false); });
  };
  document.getElementById("gameMode").onchange = function () { pool = null; persist(); };
  var arena = document.getElementById("excludeArena");
  if (arena) arena.onchange = function () { pool = null; persist(); };

  function persist() {
    try {
      TarkovStorage.setJson("tarkovtool-random-loadout-settings", {
        mode: (document.getElementById("gameMode") || {}).value || "pve",
        excludeArena: !!(document.getElementById("excludeArena") || {}).checked
      });
    } catch (e) {}
  }
  try {
    var saved = TarkovStorage.getJson("tarkovtool-random-loadout-settings", {}) || {};
    if (arena && saved.excludeArena != null) arena.checked = !!saved.excludeArena;
  } catch (e) {}
  (function () {
    var KEY = "tarkovPreferredGameMode";
    var def = TarkovStorage.get(KEY, "pve") || "pve";
    document.querySelectorAll("select#gameMode").forEach(function (sel) {
      if ([].some.call(sel.options, function (o) { return o.value === def; })) sel.value = def;
      sel.addEventListener("change", function () { try { TarkovStorage.set(KEY, sel.value); } catch (e) {} });
    });
  })();
})();
