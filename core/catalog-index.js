/* catalog-index.js — каталог всех инструментов Tarkov Tools */

(function () {
  "use strict";

  // Чтение файла catalog-data.js и генерация HTML-списка инструментов
  function loadCatalog() {
    var toolData;
    try {
      toolData = window.TarkovTools || JSON.parse(document.getElementById("tt-tools").textContent);
    } catch (e) {
      console.warn("Failed to load catalog from TarkovTools:", e.message);
      return [];
    }

    // Сортировка инструментов по имени файла (.html)
    var tools = toolData.tools || [];
    var sorted = tools.map(function (t) {
      var match = t.file.match(/^\.([^.]+)\.html$/);
      var name = match ? match[1] : t.file;
      return { file: t.file, title: t.title || name, description: t.description, kind: t.kind };
    }).sort(function (a, b) {
      var aNum = parseInt(a.file.slice(1, -5), 10) || 0;
      var bNum = parseInt(b.file.slice(1, -5), 10) || 0;
      return aNum - bNum;
    });

    return sorted;
  }

  function renderCatalog() {
    var tools = loadCatalog();
    if (!tools.length) return;

    // HTML для карточки каждого инструмента
    var html = tools.map(function (t) {
      return '<div class="tool-item" data-tool="' + encodeURIComponent(t.file) + '">' +
        '  <a href="' + t.file + '" class="tool-link">' +
        '    <span class="tool-title">' + escapeHtml(t.title) + '</span>' +
        '    <small class="tool-desc">' + escapeHtml(t.description || '') + '</small>' +
        '  </a>' +
        '</div>';
    }).join('\n');

    // Вставка в контейнер #tools-list или создание нового
    var container = document.getElementById("tools-list");
    if (container) {
      container.innerHTML = html;
    } else {
      // Если нет контейнера, создаём его после навигации
      console.log('Catalog rendered:', tools.length, 'items');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Запуск после загрузки DOM (или сразу если скрипт в <head>)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCatalog);
    // Отложенный запуск: каталог должен быть доступен при перенаправлении с hub/tools/
    setTimeout(renderCatalog, 500);
  } else {
    // Для страниц в /hub/tools/* — ждать загрузки tool-скрипта
    if (window.addEventListener) {
      window.addEventListener("load", renderCatalog);
    }
    // Проверка через Interval на случай lazy-loading
    var check = setInterval(function () {
      if (document.getElementById("tt-tools") || window.TarkovTools) {
        clearInterval(check);
        renderCatalog();
      } else if (window.location.pathname.indexOf("/tools/") >= 0) {
        // Для страниц инструментов: отложить до завершения tool-скрипта
        return;
      }
    }, 50);

    // Для hub/tools/*: ждать, пока tool-shell.js загрузится и выполнится boot()
    if (window.location.pathname.indexOf("/tools/") >= 0) {
      var wait = setInterval(function () {
        if (document.getElementById("tt-tools") || window.TarkovTools) {
          clearInterval(wait);
          renderCatalog();
        }
      }, 200);

      // При переходе: запуск после навигации
      history.replaceState && history.replaceState(null, null, "") && setTimeout(renderCatalog, 300);
    }
  }
})();