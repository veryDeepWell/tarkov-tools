/*! Hub mini-tabs: persistent iframe pool, mini bar, and expanded tool view */
(function () {
  function create(deps) {
    var tt = deps.tt;
    var toolKey = deps.toolKey;
    var metaFor = deps.metaFor;
    var isLiveTool = deps.isLiveTool;
    var iconFor = deps.iconFor;
    var esc = deps.esc;
    var frames = Object.create(null);
    var expanded = null;
    var statusMap = Object.create(null);
    var bootWired = false;

    window.__ttHubFrames = frames;

    function getMiniTabs() {
      var tabs = [];
      try {
        if (window.TarkovState) {
          if (TarkovState.getMiniTabs) tabs = TarkovState.getMiniTabs() || [];
          else if (TarkovState.getMini) tabs = TarkovState.getMini() || [];
        }
      } catch (e) {}
      if (tabs && tabs.length) return tabs;
      tabs = window.TarkovStorage ? TarkovStorage.getJson("tarkovMiniTabs.v1", []) || [] : [];
      return Array.isArray(tabs) ? tabs : [];
    }

    function pushMiniTab(file) {
      var meta = metaFor(file);
      var tab = { file: file, title: meta.title || toolKey(file) };
      try {
        if (window.TarkovState) {
          if (TarkovState.addMiniTab) { TarkovState.addMiniTab(tab); return; }
          if (TarkovState.setMiniTabs) {
            var list = (TarkovState.getMiniTabs() || []).filter(function (t) { return t.file !== file; });
            list.push(tab);
            TarkovState.setMiniTabs(list);
            return;
          }
        }
      } catch (e) {}
      var cur = getMiniTabs().filter(function (t) { return (t.file || t) !== file; });
      cur.push(tab);
      if (window.TarkovStorage) TarkovStorage.setJson("tarkovMiniTabs.v1", cur);
    }

    function dropMiniTab(file) {
      try {
        if (window.TarkovState) {
          if (TarkovState.removeMiniTab) { TarkovState.removeMiniTab(file); return; }
          if (TarkovState.setMiniTabs) {
            TarkovState.setMiniTabs((TarkovState.getMiniTabs() || []).filter(function (t) { return t.file !== file; }));
            return;
          }
        }
      } catch (e) {}
      var cur = getMiniTabs().filter(function (t) { return (t.file || t) !== file; });
      if (window.TarkovStorage) TarkovStorage.setJson("tarkovMiniTabs.v1", cur);
    }

    function ensureFrame(file) {
      if (frames[file]) return frames[file];
      var pool = document.getElementById("framePool");
      if (!pool) return null;
      var ifr = document.createElement("iframe");
      ifr.setAttribute("loading", "eager");
      ifr.title = metaFor(file).title || file;
      ifr.dataset.tool = file;
      ifr.style.cssText = "width:1100px;height:800px;border:0;background:#0f1115;opacity:0;pointer-events:none;";
      var key = toolKey(file);
      if (!statusMap[key]) statusMap[key] = { ready: false, running: false, label: "", ts: Date.now() };
      ifr.addEventListener("load", function () {
        var live = isLiveTool(file);
        var prev = statusMap[key] || {};
        statusMap[key] = {
          ready: true,
          running: live ? !!prev.running : false,
          label: prev.label || "",
          ts: Date.now()
        };
        try { renderMiniList(); } catch (e) {}
        try {
          var doc = ifr.contentDocument;
          if (doc && !doc.getElementById("tt-tool-shell")) {
            var script = doc.createElement("script");
            script.id = "tt-tool-shell";
            var base = location.pathname.replace(/\/[^/]*$/, "/");
            script.src = base + "core/tarkov-tool-shell.js";
            (doc.head || doc.documentElement).appendChild(script);
          }
        } catch (e) {}
      });
      pool.appendChild(ifr);
      ifr.src = file;
      frames[file] = ifr;
      return ifr;
    }

    function layoutFramePool() {
      var pool = document.getElementById("framePool");
      var host = document.getElementById("expandHost");
      if (!pool) return;
      if (expanded && host) {
        var rect = host.getBoundingClientRect();
        pool.style.cssText =
          "position:fixed;left:" + Math.max(0, Math.floor(rect.left)) +
          "px;top:" + Math.max(0, Math.floor(rect.top)) +
          "px;width:" + Math.max(1, Math.floor(rect.width)) +
          "px;height:" + Math.max(1, Math.floor(rect.height)) +
          "px;z-index:45;overflow:hidden;margin:0;padding:0;border:0;background:var(--bg,#0f1115);";
        Object.keys(frames).forEach(function (file) {
          var ifr = frames[file];
          if (!ifr) return;
          ifr.style.cssText = file === expanded
            ? "position:absolute;left:0;top:0;width:100%;height:100%;border:0;display:block;opacity:1;visibility:visible;pointer-events:auto;z-index:2;background:#0f1115;"
            : "position:absolute;left:0;top:0;width:100%;height:100%;border:0;display:block;opacity:0;visibility:hidden;pointer-events:none;z-index:1;background:#0f1115;";
        });
      } else {
        pool.style.cssText = "position:fixed;left:-4000px;top:0;width:1100px;height:800px;overflow:hidden;z-index:0;margin:0;padding:0;border:0;";
        Object.keys(frames).forEach(function (file) {
          var ifr = frames[file];
          if (!ifr) return;
          ifr.style.cssText = "position:absolute;left:0;top:0;width:1100px;height:800px;border:0;opacity:0;visibility:hidden;pointer-events:none;display:block;background:#0f1115;";
        });
      }
    }

    function expandTab(file) {
      expanded = file;
      var host = document.getElementById("expandHost");
      var exp = document.getElementById("hubExpand");
      var main = document.getElementById("hubMain");
      if (!host || !exp) return;
      ensureFrame(file);
      exp.classList.add("open");
      document.body.classList.add("tt-expand-open");
      if (main) main.style.display = "none";
      var title = document.getElementById("expandTitle");
      if (title) title.textContent = metaFor(file).title || file;
      layoutFramePool();
      renderMiniList();
      try {
        requestAnimationFrame(layoutFramePool);
        setTimeout(layoutFramePool, 50);
      } catch (e) {}
    }
    window.expandTab = expandTab;

    function openToolAsMini(file) {
      if (!file) return;
      ensureFrame(file);
      pushMiniTab(file);
      renderMiniList();
      expandTab(file);
    }

    function collapseExpand() {
      expanded = null;
      var exp = document.getElementById("hubExpand");
      var main = document.getElementById("hubMain");
      if (exp) exp.classList.remove("open");
      document.body.classList.remove("tt-expand-open");
      if (main) main.style.display = "";
      layoutFramePool();
      renderMiniList();
    }

    function closeTab(file) {
      if (expanded === file) collapseExpand();
      var ifr = frames[file];
      try {
        var liveEntry = window.TarkovToolKind && TarkovToolKind.entry(file);
        var toolPoll = ifr && ifr.contentWindow && ifr.contentWindow.TarkovPoll;
        if (liveEntry && liveEntry.pollId && toolPoll && typeof toolPoll.stop === "function") {
          toolPoll.stop(liveEntry.pollId);
        }
      } catch (e) {
        console.error("Unable to stop live tool before closing its mini-tab", file, e);
      }
      if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr);
      delete frames[file];
      delete statusMap[toolKey(file)];
      dropMiniTab(file);
      renderMiniList();
    }

    function unreadCount(file) {
      try {
        if (window.TarkovState && TarkovState.unreadForTool) return TarkovState.unreadForTool(toolKey(file)) || 0;
      } catch (e) {}
      return 0;
    }
    function unreadItems(file) {
      try {
        if (!window.TarkovState || !TarkovState.notifications) return [];
        var key = toolKey(file);
        return (TarkovState.notifications() || []).filter(function (n) {
          return !n.read && toolKey(n.tool || "") === key;
        }).slice(0, 5);
      } catch (e) { return []; }
    }
    function frameStatus(file) {
      return statusMap[toolKey(file)] || { ready: false, running: false, label: "", ts: 0 };
    }

    function renderMiniList() {
      var list = document.getElementById("miniList");
      var bar = document.getElementById("miniBar");
      if (!list || !bar) return;
      var labelEl = bar.querySelector(".mini-label");
      if (labelEl) labelEl.textContent = tt("hub.mini", "MINI");
      var tabs = getMiniTabs();
      if (!tabs.length) { bar.hidden = true; list.innerHTML = ""; return; }
      bar.hidden = false;
      list.innerHTML = tabs.map(function (tab) {
        var file = (tab && tab.file) || tab;
        var unread = unreadCount(file);
        var status = frameStatus(file);
        var active = expanded === file ? " active" : "";
        var running = isLiveTool(file) && status.running ? " running" : "";
        var title = (tab && tab.title) || metaFor(file).title || toolKey(file);
        return '<button type="button" class="mini-chip' + active + running + '" data-file="' + esc(file) + '" aria-label="' + esc(title) + '">' +
          '<span class="mini-ico" aria-hidden="true">' + iconFor(file, title) + '</span>' +
          (unread ? '<span class="badge">' + unread + '</span>' : '') +
          (isLiveTool(file) && status.running ? '<span class="dot-run"></span>' : '') +
          '</button>';
      }).join("");
      list.querySelectorAll(".mini-chip").forEach(function (btn) {
        var file = btn.getAttribute("data-file");
        btn.onclick = function () { expandTab(file); };
        btn.onmouseenter = function (event) { showChipTip(event, file); };
        btn.onmouseleave = hideTip;
        btn.oncontextmenu = function (event) {
          event.preventDefault();
          closeTab(file);
          hideTip();
        };
      });
    }

    function showChipTip(event, file) {
      var tip = document.getElementById("miniTip");
      if (!tip) return;
      var status = frameStatus(file);
      var items = unreadItems(file);
      var title = metaFor(file).title || toolKey(file);
      var live = isLiveTool(file);
      var statusLine;
      if (!frames[file]) statusLine = tt("common.notLoaded", "Not loaded");
      else if (!status.ready && !status.running) statusLine = tt("common.loading", "Loading…");
      else if (live && status.running) statusLine = "● " + tt("hub.statusRunning", "Running") + (status.label ? " · " + status.label : "");
      else if (live) statusLine = tt("common.loadedBg", "Background") + (status.label ? " · " + status.label : "");
      else statusLine = tt("hub.statusLoaded", "Open");
      var html = '<div class="tip-title">' + esc(title) + '</div>';
      html += '<div class="tip-status' + (live && status.running ? " on" : "") + '">' + esc(statusLine) + '</div>';
      if (items.length) {
        html += items.map(function (item) {
          return '<div class="row-n"><div class="t">' + esc(item.title) + '</div><div class="b">' + esc(item.body || "") + '</div></div>';
        }).join("");
      } else {
        html += '<div class="b" style="color:var(--muted)">' + esc(tt("common.unreadNone", "No notifications")) + '</div>';
      }
      html += '<div class="b" style="margin-top:6px;color:var(--muted)">' + esc(tt("common.closeTabHint", "Right-click to close")) + '</div>';
      tip.innerHTML = html;
      tip.style.display = "block";
      tip.style.left = Math.min(event.clientX + 12, window.innerWidth - 320) + "px";
      tip.style.top = Math.min(event.clientY + 14, window.innerHeight - 160) + "px";
    }
    function hideTip() {
      var tip = document.getElementById("miniTip");
      if (tip) tip.style.display = "none";
    }

    function bootMini(attempt) {
      attempt = attempt || 0;
      var pool = document.getElementById("framePool");
      if ((!window.TarkovState || !pool) && attempt < 80) {
        setTimeout(function () { bootMini(attempt + 1); }, 40);
        return;
      }
      var tabs = getMiniTabs();
      try {
        if (window.TarkovState && TarkovState.setMiniTabs && tabs.length) TarkovState.setMiniTabs(tabs);
      } catch (e) {}
      for (var i = 0; i < tabs.length; i++) {
        var file = (tabs[i] && tabs[i].file) || tabs[i];
        if (!file) continue;
        try {
          ensureFrame(file);
          var key = toolKey(file);
          if (!statusMap[key]) {
            var live = isLiveTool(file);
            statusMap[key] = {
              ready: false,
              running: false,
              label: live ? tt("common.restoring", "Restoring…") : "",
              ts: Date.now()
            };
          }
        } catch (e) {}
      }
      renderMiniList();
      if (!bootWired) {
        bootWired = true;
        try {
          if (window.TarkovState && TarkovState.on) {
            TarkovState.on("mini", renderMiniList);
            TarkovState.on("notification", renderMiniList);
          }
        } catch (e) {}
        window.addEventListener("message", function (event) {
          if (event.origin !== location.origin) return;
          var data = event.data;
          if (!data || typeof data !== "object") return;
          if (data.type === "tt-status" || data.type === "tt-tool-status") {
            var key = toolKey(data.tool || data.file || "");
            if (!key) return;
            statusMap[key] = {
              ready: data.ready !== false,
              running: !!data.running,
              label: data.label || "",
              ts: Date.now()
            };
            renderMiniList();
          }
          if (data.type === "tt-notify") {
            if (typeof window.updateNotifBell === "function") window.updateNotifBell();
            renderMiniList();
          }
        });
      }
      if (attempt < 5) {
        setTimeout(function () {
          var later = getMiniTabs();
          var changed = false;
          for (var j = 0; j < later.length; j++) {
            var file = (later[j] && later[j].file) || later[j];
            if (file && !frames[file]) {
              try { ensureFrame(file); changed = true; } catch (e) {}
            }
          }
          if (changed || later.length) renderMiniList();
        }, 300 + attempt * 200);
      }
    }

    return {
      open: openToolAsMini,
      render: renderMiniList,
      boot: bootMini,
      collapse: collapseExpand,
      layout: layoutFramePool,
      isExpanded: function () { return !!expanded; },
      closeExpanded: function () { if (expanded) closeTab(expanded); }
    };
  }

  window.TarkovHubMiniTabs = { create: create };
})();
