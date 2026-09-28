/*! Tarkov — Marathon transit planner */
(function () {
  "use strict";

  var MAP_LABEL = {
    factory: "Factory",
    "night-factory": "Factory (night)",
    customs: "Customs",
    woods: "Woods",
    shoreline: "Shoreline",
    interchange: "Interchange",
    reserve: "Reserve",
    lighthouse: "Lighthouse",
    "streets-of-tarkov": "Streets of Tarkov",
    "the-lab": "The Lab",
    "the-lab-dark": "The Lab (dark)",
    "ground-zero": "Ground Zero",
    "ground-zero-21": "Ground Zero 21+",
    "ground-zero-tutorial": "Ground Zero (tutorial)",
    terminal: "Terminal",
    "the-labyrinth": "Labyrinth",
    icebreaker: "Icebreaker"
  };

  var RESTOCK = {
    factory: {
      meds: ["Офис / медкомната у Gate 3", "Ящики у насосной"],
      ammo: ["Стеллажи на складе", "Тела PMC у выходов"],
      armor: ["Редко — трупы; не рассчитывать"],
      food: ["Кулер / стол в офисе"],
      special: ["Короткий рейд — лучше прийти с запасом"]
    },
    "night-factory": {
      meds: ["Те же точки, что днём — офис, насосная"],
      ammo: ["Склад, трупы"],
      armor: ["Трупы"],
      food: ["Офис"],
      special: ["Темнее и опаснее — не задерживаться без нужды"]
    },
    customs: {
      meds: ["Медпункт у КПП / Big Red", "Общаги (301/218 зоны)"],
      ammo: ["Склады у КПП", "USEC storage", "Скавские тайники"],
      armor: ["Общаги marked-ish зоны, трупы у Stronghold"],
      food: ["Столовая общаг", "магазины у заправки"],
      special: ["Boat / V-Ex на краю — запасной выход", "Gas station / RUAF для быстрых аптек"]
    },
    woods: {
      meds: ["USEC camp", "Sawmill мед", "Скавские кэмпы"],
      ammo: ["USEC / Scav bunkers", "Ящики у лесопилки"],
      armor: ["Редко; трупы у sawmill"],
      food: ["Кэмпы, рюкзаки скавов"],
      special: ["Длинные перебежки — бери воду", "South V-Ex / Boat как запасной выход"]
    },
    shoreline: {
      meds: ["Курорт (east/west wing med)", "Здание администрации"],
      ammo: ["Курорт weapon crates", "Weather station"],
      armor: ["Курорт — плиты/разгрузки на трупах и в комнатах"],
      food: ["Курорт kitchen / stores"],
      special: ["Pier Boat / V-Ex", "Ключи курорта сильно ускоряют лут"]
    },
    interchange: {
      meds: ["Аптека Ultra", "IDEA / OLI медполки", "Goshan"],
      ammo: ["Kiba (оружие/патроны)", "OLI tool/weapon zones", "Techlight"],
      armor: ["Kiba / Techlight / трупы у Killa-роутов"],
      food: ["Goshan food", "кафе в центре"],
      special: ["Kiba — приоритет на патроны и целые плиты", "Длинный лут — следи за таймером"]
    },
    reserve: {
      meds: ["White knight / Black pawn мед", "Barracks"],
      ammo: ["Оружейные в bunkers", "K / D marked-ish"],
      armor: ["Barracks, трупы Raiders"],
      food: ["Столовые bunkers"],
      special: ["Train extract (shared)", "D-2 / bunker keys ускоряют"]
    },
    lighthouse: {
      meds: ["Water treatment med", "Chalet", "Rogues camp (опасно)"],
      ammo: ["Rogues / water treatment crates", "Northern checkpoint"],
      armor: ["Rogues bodies", "Chalet"],
      food: ["Chalet kitchen", "кэмпы"],
      special: ["Train extract", "Переход на Icebreaker — тупик маршрута"]
    },
    "streets-of-tarkov": {
      meds: ["Клиники / аптеки в жилых кварталах", "Concordia med"],
      ammo: ["Оружейные магазины", "LexOs / cinema zones"],
      armor: ["Трупы PMC, магазины снаряги"],
      food: ["Магазины, кафе"],
      special: ["E7_car — vehicle exit", "Связка с Lab / GZ"]
    },
    "the-lab": {
      meds: ["Медблоки лаборатории", "orange/black rooms"],
      ammo: ["Weapon crates в lab", "трупы Raiders"],
      armor: ["Raiders — лучший источник плит"],
      food: ["Почти нет — нести с собой"],
      special: ["Нужна карта доступа", "Transit только на Streets", "Cargo elevator extract"]
    },
    "the-lab-dark": {
      meds: ["Те же lab-блоки"],
      ammo: ["Raiders / crates"],
      armor: ["Raiders"],
      food: ["Нести с собой"],
      special: ["Темнее lab — фонарь/NVG", "Часто тупиковая ветка маршрута"]
    },
    "ground-zero": {
      meds: ["Офисы / med tents", "USEC/BEAR зоны"],
      ammo: ["Офисные оружейки", "трупы"],
      armor: ["Слабо — не рассчитывать на класс 5+"],
      food: ["Офисные кухни"],
      special: ["V-Exit", "Transit на Streets"]
    },
    "ground-zero-21": {
      meds: ["Как GZ, плюс более жирные контейнеры"],
      ammo: ["Офисы, трупы"],
      armor: ["Чуть лучше GZ"],
      food: ["Офисы"],
      special: ["V-Exit", "Уровень 21+"]
    },
    terminal: {
      meds: ["Ограниченно — складские аптечки"],
      ammo: ["Складские ящики"],
      armor: ["Мало"],
      food: ["Мало"],
      special: ["Тупик: transits = 0", "Долгий рейд — приходи с полным стаком"]
    },
    "the-labyrinth": {
      meds: ["Внутренние точки лабиринта (мало)"],
      ammo: ["Внутренний лут / трупы"],
      armor: ["Редко"],
      food: ["Нести"],
      special: ["Тупик маршрута", "Заходи только если готов закончить марафон здесь"]
    },
    icebreaker: {
      meds: ["Ограниченный мед на локации"],
      ammo: ["Ящики / трупы"],
      armor: ["Мало"],
      food: ["Нести"],
      special: ["Тупик", "Доступ с Lighthouse / Shoreline"]
    }
  };

  var mapsById = {};
  var route = [];
  var graph = {};

  function esc(s) {
    try {
      if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
    } catch (e) {}
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
  }

  function label(m) {
    if (!m) return "?";
    var slug = m.normalizedName || m.slug || m._slug || "";
    if (MAP_LABEL[slug]) return MAP_LABEL[slug];
    try {
      if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(slug);
    } catch (e) {}
    return slug || m.id || "?";
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("status");
    el.className = "status" + (ok === true ? " ok" : ok === false ? " err" : "");
    el.textContent = msg || "";
  }

  function asArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "object") return Object.values(x);
    return [];
  }

  function buildGraph(maps) {
    mapsById = {};
    graph = {};
    maps.forEach(function (m) {
      if (!m || !m.id) return;
      mapsById[m.id] = m;
      var slug = m.normalizedName || m.nameId || m.id;
      m._slug = slug;
      graph[m.id] = [];
      asArray(m.transits).forEach(function (t) {
        var tid = t.map || t.mapId;
        if (typeof tid === "object") tid = tid.id;
        if (tid && graph[m.id].indexOf(tid) < 0) graph[m.id].push(tid);
      });
    });
    Object.keys(graph).forEach(function (id) {
      graph[id] = graph[id].filter(function (tid) {
        return !!mapsById[tid];
      });
    });
  }

  function neighbors(id) {
    return (graph[id] || []).slice();
  }

  function isTerminal(id) {
    return neighbors(id).length === 0;
  }

  function specialExtracts(m) {
    var out = [];
    asArray(m.extracts).forEach(function (e) {
      var n = String(e.name || "");
      var low = n.toLowerCase();
      var kind = null;
      if (/flare|signal/i.test(low)) kind = "flare";
      else if (/taxi|v-ex|vex|v_exit|vexit|car|vehicle/i.test(low)) kind = "vehicle";
      else if (/boat|pier/i.test(low)) kind = "boat";
      else if (/train/i.test(low)) kind = "train";
      else if (/btr/i.test(low)) kind = "btr";
      if (kind) out.push({ name: n, kind: kind, faction: e.faction || "" });
    });
    return out;
  }

  function paintRoute() {
    var list = document.getElementById("routeList");
    if (!route.length) {
      list.innerHTML = '<p class="muted">Маршрут пуст.</p>';
    } else {
      list.innerHTML = route
        .map(function (id, i) {
          var m = mapsById[id];
          var dur = Number(m && m.raidDuration) || 0;
          var term = isTerminal(id);
          var ex = specialExtracts(m || {});
          var badges = "";
          if (term) badges += '<span class="badge dead">тупик</span>';
          ex.forEach(function (e) {
            badges += '<span class="badge exit">' + esc(e.kind) + "</span>";
          });
          return (
            '<div class="hop"><div class="n">' +
            (i + 1) +
            '</div><div><div class="name">' +
            esc(label(m)) +
            '</div><div class="meta">' +
            esc((m && m._slug) || "") +
            (dur ? " · ~" + dur + " мин" : "") +
            "</div></div><div>" +
            badges +
            (i === route.length - 1
              ? '<button type="button" class="btn-ghost" data-pop="1" style="margin-left:6px">✕</button>'
              : "") +
            "</div></div>"
          );
        })
        .join("");
      list.querySelectorAll("[data-pop]").forEach(function (btn) {
        btn.onclick = function () {
          route.pop();
          refresh();
        };
      });
    }

    var chips = document.getElementById("nextChips");
    var hint = document.getElementById("nextHint");
    var options = [];
    if (!route.length) {
      hint.textContent = "Стартовая карта — любая (кроме tutorial, если не нужен).";
      options = Object.keys(mapsById).filter(function (id) {
        var s = mapsById[id]._slug || "";
        return s.indexOf("tutorial") < 0;
      });
    } else {
      var last = route[route.length - 1];
      options = neighbors(last);
      if (!options.length) {
        hint.textContent =
          "С этой карты переходов нет (Labyrinth / Icebreaker / Terminal / Lab dark и т.п.). Можно закончить здесь.";
      } else {
        hint.textContent = "Добавить следующую (только transits с «" + label(mapsById[last]) + "»):";
      }
    }
    options = options.slice().sort(function (a, b) {
      return label(mapsById[a]).localeCompare(label(mapsById[b]), "ru");
    });
    chips.innerHTML = options
      .map(function (id) {
        var m = mapsById[id];
        var dead = isTerminal(id) ? " · тупик" : "";
        return (
          '<button type="button" class="chip" data-add="' +
          esc(id) +
          '">' +
          esc(label(m)) +
          esc(dead) +
          "</button>"
        );
      })
      .join("");
    chips.querySelectorAll("[data-add]").forEach(function (btn) {
      btn.onclick = function () {
        route.push(btn.getAttribute("data-add"));
        refresh();
      };
    });
  }

  function hopsCount() {
    return Math.max(0, route.length - 1);
  }

  function xpHint() {
    var hops = hopsCount();
    if (hops <= 0) return "×1.0 (нет переходов)";
    var base = 1 + Math.min(hops, 8) * 0.15;
    var top = 1 + Math.min(hops, 8) * 0.22;
    return "~×" + base.toFixed(2) + "–×" + top.toFixed(2) + " (ориентир, " + hops + " переходов)";
  }

  function estimates() {
    var hops = hopsCount();
    var maps = Math.max(1, route.length);
    return [
      { name: "Еда / вода", bring: Math.max(1, Math.ceil(maps * 0.6)) + " стека", raid: "лут на почти каждой карте" },
      { name: "Аптечки", bring: Math.max(1, Math.ceil(maps * 0.7)) + " (IFAK/Salewa)", raid: "аптеки / med rooms" },
      { name: "Хирургия / шины", bring: "1–2 CMS + splint", raid: "редко — лучше нести" },
      { name: "Патроны", bring: Math.max(60, 40 + hops * 30) + "+ в магазинах", raid: "Kiba / bunkers / lab raiders" },
      { name: "Гранаты", bring: Math.min(4, 1 + Math.floor(hops / 2)) + " шт", raid: "по возможности" },
      { name: "Броня / плиты", bring: "1 комплект в ремонт", raid: "Interchange Kiba, Lab raiders, Reserve" },
      {
        name: "Карта Lab",
        bring: route.some(function (id) {
          return (mapsById[id]._slug || "").indexOf("lab") >= 0;
        })
          ? "да, с собой"
          : "—",
        raid: "—"
      },
      { name: "Деньги (BTR / taxi / vehicle)", bring: hops >= 2 ? "~50–150k на непредвиденное" : "по желанию", raid: "—" }
    ];
  }

  function paintSummary() {
    var card = document.getElementById("summaryCard");
    var tips = document.getElementById("tipsCard");
    if (!route.length) {
      card.hidden = true;
      tips.hidden = true;
      return;
    }
    card.hidden = false;
    tips.hidden = false;
    document.getElementById("sHops").textContent = String(hopsCount());
    document.getElementById("sMaps").textContent = String(route.length);
    var mins = route.reduce(function (s, id) {
      return s + (Number(mapsById[id].raidDuration) || 30);
    }, 0);
    document.getElementById("sTime").textContent = "~" + mins + " мин суммарно (потолки рейдов)";
    document.getElementById("sXp").textContent = xpHint();

    var last = mapsById[route[route.length - 1]];
    var ex = specialExtracts(last);
    var exitEl = document.getElementById("sExit");
    if (ex.length) {
      exitEl.innerHTML =
        "На последней карте выходы: " +
        ex
          .map(function (e) {
            return '<span class="badge exit">' + esc(e.kind) + "</span> " + esc(e.name);
          })
          .join(" · ");
    } else if (isTerminal(last.id)) {
      exitEl.innerHTML =
        '<span class="badge dead">тупик</span> обычные extracts — спланируй выход заранее';
    } else {
      exitEl.textContent = "На конце нет vehicle/flare в данных API — смотри обычные extracts.";
    }

    document.getElementById("estBody").innerHTML = estimates()
      .map(function (r) {
        return (
          "<tr><td>" +
          esc(r.name) +
          "</td><td>" +
          esc(r.bring) +
          "</td><td>" +
          esc(r.raid) +
          "</td></tr>"
        );
      })
      .join("");

    var seen = {};
    var html = "";
    route.forEach(function (id, idx) {
      var m = mapsById[id];
      var slug = m._slug || "";
      if (seen[slug]) return;
      seen[slug] = true;
      var tip = RESTOCK[slug] || {
        meds: ["Смотри медкомнаты и аптеки"],
        ammo: ["Оружейные ящики, трупы"],
        armor: ["Трупы PMC/Raiders"],
        food: ["Кухни / магазины"],
        special: []
      };
      html +=
        '<div style="margin-bottom:14px"><div class="name" style="font-weight:700">' +
        (idx + 1) +
        ". " +
        esc(label(m)) +
        '</div><ul class="tips">' +
        "<li><b>Мед:</b> " +
        esc((tip.meds || []).join("; ")) +
        "</li>" +
        "<li><b>Патроны:</b> " +
        esc((tip.ammo || []).join("; ")) +
        "</li>" +
        "<li><b>Броня/плиты:</b> " +
        esc((tip.armor || []).join("; ")) +
        "</li>" +
        "<li><b>Еда:</b> " +
        esc((tip.food || []).join("; ")) +
        "</li>" +
        (tip.special && tip.special.length
          ? "<li><b>Ещё:</b> " + esc(tip.special.join("; ")) + "</li>"
          : "") +
        "</ul></div>";
    });
    document.getElementById("tipsBody").innerHTML = html;
  }

  function refresh() {
    paintRoute();
    paintSummary();
    document.getElementById("clearBtn").disabled = !route.length;
  }

  function superRoute() {
    var best = [];
    var nodes = Object.keys(mapsById).filter(function (id) {
      return (mapsById[id]._slug || "").indexOf("tutorial") < 0;
    });
    nodes.forEach(function (start) {
      var path = [start];
      var usedEdge = {};
      var guard = 0;
      while (guard++ < 40) {
        var cur = path[path.length - 1];
        var opts = neighbors(cur).filter(function (to) {
          return !usedEdge[cur + ">" + to];
        });
        if (!opts.length) break;
        opts.sort(function (a, b) {
          var ua = path.indexOf(a) < 0 ? 0 : 1;
          var ub = path.indexOf(b) < 0 ? 0 : 1;
          if (ua !== ub) return ua - ub;
          return neighbors(b).length - neighbors(a).length;
        });
        var next = opts[0];
        usedEdge[cur + ">" + next] = 1;
        path.push(next);
      }
      if (path.length > best.length) best = path;
    });
    if (best.length) {
      route = best;
      refresh();
      setStatus(
        "Супер-маршрут: " + best.length + " карт, " + (best.length - 1) + " переходов (жадный, без повтора рёбер).",
        true
      );
    }
  }

  async function load() {
    var btn = document.getElementById("loadBtn");
    btn.disabled = true;
    setStatus("Loading maps…");
    var P = window.TarkovUI && TarkovUI.progress;
    try {
      if (P) P.start({ label: "Maps…" });
      var mode = document.getElementById("gameMode").value || "pve";
      var raw = await (TarkovAPI.maps ? TarkovAPI.maps(mode) : TarkovAPI.getJson("/" + mode + "/maps"));
      if (P) P.set(50);
      var maps = asArray(raw);
      if (raw && raw.maps) maps = asArray(raw.maps);
      if (raw && raw.data && raw.data.maps) maps = asArray(raw.data.maps);
      buildGraph(maps);
      var edgeCount = Object.keys(graph).reduce(function (s, id) {
        return s + graph[id].length;
      }, 0);
      document.getElementById("buildCard").hidden = false;
      document.getElementById("superBtn").disabled = false;
      document.getElementById("clearBtn").disabled = false;
      route = [];
      refresh();
      setStatus("Карт: " + Object.keys(mapsById).length + " · переходов в графе: " + edgeCount, true);
      if (P) P.done();
      try {
        if (window.TarkovTools && TarkovTools.beep) TarkovTools.beep("ok");
      } catch (eB) {}
    } catch (e) {
      setStatus(e.message || String(e), false);
      if (P) P.fail(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById("loadBtn").onclick = load;
  document.getElementById("clearBtn").onclick = function () {
    route = [];
    refresh();
  };
  document.getElementById("superBtn").onclick = superRoute;
})();
