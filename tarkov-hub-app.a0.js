window.TarkovHubMini = true;

const CATALOG = window.TarkovHubCATALOG || [];
const CHANGELOG = [{"date":"2026-09-17","items":["Мини-табы, уведомления, soft-state","Категории каталога","Понятные описания тулзов","Price Alarm, еда, лоадауты","Иконки: TarkovIcons + assets/icons/","TarkovAPI, TarkovNames"]}];
const ICONS = [[/btc/i,"₿"],[/cultist/i,"⛧"],[/my-tarkov/i,"👤"],[/helmet/i,"🪖"],[/nvg/i,"🌑"],[/price-track/i,"📈"],[/price-alarm/i,"🔔"],[/food/i,"🍖"],[/random-loadout/i,"🎲"],[/loadout-budget/i,"💰"],[/loadout-builder/i,"🧰"],[/drip-builder/i,"🎨"],[/drip-loadout/i,"✨"],[/ammo/i,"🔫"],[/armor/i,"🛡️"],[/barter/i,"🧮"],[/boss/i,"👹"],[/compare/i,"⚖️"],[/container/i,"🎒"],[/craft/i,"🔧"],[/drip/i,"🕶️"],[/gun/i,"🛠️"],[/hideout/i,"🏗️"],[/key/i,"🔑"],[/lang/i,"🌐"],[/loot/i,"📦"],[/item-use/i,"💡"],[/mag/i,"📟"],[/med/i,"💊"],[/mods/i,"🔩"],[/plate/i,"🧱"],[/quest/i,"📜"],[/raid/i,"✅"],[/restock/i,"⏰"],[/scope/i,"🔭"],[/short/i,"🏷️"],[/skill/i,"📈"],[/stim/i,"💉"],[/streamer/i,"📺"],[/trader/i,"🏪"]];

let expanded = null;
const frames = {};
const statusMap = {};

function iconFor(file, title) {
  if (window.TarkovIcons && typeof TarkovIcons.html === "function") {
    return TarkovIcons.html(file, title);
  }
  const hay = file + " " + (title || "");
  for (const [re, emo] of ICONS) if (re.test(hay)) return emo;
  return "📎";
}
function esc(s) {
  return String(s || "").replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;").replace(/"/g, "\u0026quot;");
}
function titleOf(file) {
  const c = CATALOG.find(x => x.file === file);
  if (c) return c.title;
  try {
    const t = TarkovState.getMiniTabs().find(x => x.file === file);
    return (t && t.title) || file;
  } catch (e) { return file; }
}
function unreadCount(file) {
  try { return TarkovState.unreadForTool(file).length; } catch (e) { return 0; }
}
function unreadItems(file) {
  try { return TarkovState.unreadForTool(file).slice(0, 8); } catch (e) { return []; }
}
function poolStyle(ifr) {
  ifr.style.cssText = "border:0;width:1100px;height:800px;background:var(--bg)";
}
function expandStyle(ifr) {
  ifr.style.cssText = "border:0;width:100%;height:100%;flex:1 1 auto;min-height:0;max-height:100%;display:block;background:var(--bg)";
  ifr.setAttribute("scrolling", "yes");
}
function ensureFrame(file) {
  if (frames[file]) return frames[file];
  const pool = document.getElementById("framePool");
  if (!pool) return null;
  const ifr = document.createElement("iframe");
  ifr.src = file;
