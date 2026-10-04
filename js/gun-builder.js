(function () {
"use strict";

function t(key, params) {
return window.TarkovI18n && TarkovI18n.t
? TarkovI18n.t("tool.gun-builder.ui." + key, params)
: key;
}

var byId = {};
var weapons = [];
var mods = [];
var baseWeapon = null;
var installed = {};
var abGoal = "balanced";
var abBuilds = [];
var activeBuildIndex = -1;
var abStatusState = null;
var schemaZoom = 1;
var dragState = null;
var activeSlot = null;

function setAbStatus(key, params) {
abStatusState = { key: key, params: params };
renderAbStatus();
}

function renderAbStatus() {
if (!abStatusState) return;
document.getElementById("abStatus").textContent = t(abStatusState.key, abStatusState.params);
}

var REGION_ORDER = ["FRONT", "FRONT_BOTTOM", "RECEIVER", "TOP", "BOTTOM", "REAR", "OTHER"];

var FILL_ORDER = [
"mod_barrel", "mod_reciever", "mod_receiver", "mod_gas_block", "mod_handguard",
"mod_pistol_grip", "mod_pistolgrip", "mod_stock", "mod_muzzle", "mod_foregrip",
"mod_mount", "mod_scope", "mod_sight_rear", "mod_sight_front", "mod_tactical",
"mod_magazine", "mod_charge", "mod_bipod", "mod_launcher"
];

function esc(s) {
try {
if (window.TarkovDicts && TarkovDicts.esc) return TarkovDicts.esc(s);
} catch (e) {}
return String(s == null ? "" : s)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">");
}

function fmt(n) {
return Math.round(Number(n) || 0).toLocaleString("ru-RU");
}

function itemName(it) {
if (!it) return "?";
try {
if (window.TarkovNames && TarkovNames.display) return TarkovNames.display(it);
} catch (e) {}
return it.shortName || it.name || it.normalizedName || it.id || "?";
}

function humanize(slug) {
try {
if (window.TarkovDicts && TarkovDicts.humanize) return TarkovDicts.humanize(slug);
} catch (e) {}
return String(slug || "")
.replace(/[-_]/g, " ")
.replace(/\b\w/g, function (c) {
return c.toUpperCase();
});
}

function asArray(x) {
if (!x) return [];
if (Array.isArray(x)) return x;
if (typeof x === "object") return Object.values(x);
return [];
}

function isWeapon(it) {
if (!it || !it.properties) return false;
var t = it.properties.propertiesType || "";
if (t === "ItemPropertiesWeapon") return true;
return asArray(it.categories).some(function (c) {
return /weapon|assault|smg|shotgun|sniper|pistol|marksman|machinegun/.test(
(c.normalizedName || c.name || "").toLowerCase()
);
});
}

function isMod(it) {
if (!it || !it.properties) return false;
var t = it.properties.propertiesType || "";
if (/WeaponMod|Magazine|Barrel|Stock|Scope|Muzzle|Mount|Grip|Handguard|Flashlight|Tactical/.test(t))
return true;
if (t === "ItemPropertiesWeapon") return false;
return !!(it.properties.slots || it.properties.ergonomics != null || it.properties.recoil != null);
}

function itemPrice(it) {
if (!it) return 0;
var avg = Number(it.avg24hPrice) || 0;
if (avg > 0) return avg;
var low = Number(it.lastLowPrice) || 0;
if (low > 0) return low;
var min = Infinity;
asArray(it.buyFor || it.buyFromTrader).forEach(function (b) {
var p = Number(b.priceRUB != null ? b.priceRUB : b.price) || 0;
if (p > 0 && p < min) min = p;
});
return min === Infinity ? 0 : min;
}

function isBuyable(it) {
if (!it) return false;
if (Number(it.avg24hPrice) > 0 || Number(it.lastLowPrice) > 0) return true;
return asArray(it.buyFor || it.buyFromTrader).some(function (b) {
return (Number(b.priceRUB != null ? b.priceRUB : b.price) || 0) > 0;
});
}

function slotBase(nameId) {
var s = String(nameId || "").toLowerCase().replace(/_\d+$/, "");
if (s === "mod_pistolgrip") s = "mod_pistol_grip";
if (s.indexOf("mod_tactical") === 0) s = "mod_tactical";
if (s.indexOf("mod_mount") === 0) s = "mod_mount";
if (s === "mod_receiver") s = "mod_reciever";
return s;
}

function slotLabel(nameId) {
var b = slotBase(nameId);
var label = t("slot." + b);
return label === "slot." + b || label === "tool.gun-builder.ui.slot." + b
? humanize(nameId)
: label;
}

function fillPriority(nameId) {
var i = FILL_ORDER.indexOf(slotBase(nameId));
return i < 0 ? 100 : i;
}

function getRegion(nameId) {
var s = String(nameId || "").toLowerCase();
if (/muzzle|flash.?hider|suppressor|silencer/.test(s)) return "FRONT";
if (/barrel/.test(s)) return "FRONT";
if (/gas.?block|gas.?tube/.test(s)) return "FRONT";
if (/handguard|hand_guard/.test(s)) return "FRONT_BOTTOM";
if (/foregrip|fore_grip|bipod|launcher|ubgl/.test(s)) return "FRONT_BOTTOM";
if (/tactical|flashlight|laser|peq/.test(s)) return "FRONT_BOTTOM";
if (/scope|optic|collimator|reflex|holograph|magnif/.test(s)) return "TOP";
if (/sight_rear|rear.?sight|sight_front|front.?sight|cover|dust/.test(s)) return "TOP";
if (/\bsight\b/.test(s) && !/laser/.test(s)) return "TOP";
if (/mount/.test(s)) return "TOP";
if (/stock|buffer|butt/.test(s)) return "REAR";
if (/charge|charging|cock/.test(s)) return "REAR";
if (/reciever|receiver|frame|upper|lower/.test(s)) return "RECEIVER";
if (/magazine|mag_/.test(s) || s === "mod_magazine") return "BOTTOM";
if (/pistol_grip|pistolgrip/.test(s)) return "BOTTOM";
if (/grip/.test(s)) return "BOTTOM";
return "OTHER";
}

function isOpticSlot(nameId) {
var s = String(nameId || "").toLowerCase();
return /scope|optic|collimator|reflex|holograph|magnif|sight/.test(s) && !/laser/.test(s);
}

function isOpticItem(it) {
if (!it) return false;
var n = (itemName(it) + " " + (it.normalizedName || "") + " " + ((it.properties || {}).propertiesType || "")).toLowerCase();
return /scope|optic|collimator|reflex|holograph|magnif|sight|рефлекс|коллиматор|оптик|прицел/.test(n);
}

function allowedForSlot(filters) {
if (!filters) return [];
var allowed = new Set(asArray(filters.allowedItems).map(String));
var cats = new Set(asArray(filters.allowedCategories).map(String));
var excluded = new Set(asArray(filters.excludedItems).map(String));
var list = [];
mods.forEach(function (m) {
if (excluded.has(m.id)) return;
if (allowed.has(m.id)) {
list.push(m);
return;
}
if (cats.size) {
var mc = asArray(m.categories).map(function (c) {
return String(c.id || c);
});
if (mc.some(function (id) {
return cats.has(id);
}))
list.push(m);
}
});
if (!list.length && allowed.size) {
allowed.forEach(function (id) {
if (byId[id]) list.push(byId[id]);
});
}
return list;
}

function collectSlots(map) {
map = map || installed;
var result = [];
if (!baseWeapon) return result;
var queue = [baseWeapon];
var seen = new Set();
while (queue.length) {
var parent = queue.shift();
if (!parent || seen.has(parent.id)) continue;
seen.add(parent.id);
asArray(parent.properties && parent.properties.slots).forEach(function (s) {
var nameId = s.nameId || s.name || s.id;
var key = parent.id + "::" + nameId;
result.push({
parentId: parent.id,
nameId: nameId,
key: key,
required: !!s.required,
filters: s.filters || {},
region: getRegion(nameId),
isOptic: isOpticSlot(nameId)
});
var childId = map[key];
if (childId && byId[childId]) queue.push(byId[childId]);
});
}
return result;
}

function conflictSet(map) {
map = map || installed;
var set = new Set();
Object.keys(map).forEach(function (k) {
var it = byId[map[k]];
if (!it) return;
asArray(it.conflictingItems).forEach(function (c) {
set.add(typeof c === "string" ? c : c.id);
});
asArray((it.properties || {}).conflictingItems).forEach(function (c) {
set.add(typeof c === "string" ? c : c.id);
});
});
return set;
}

function hasConflict(map, itemId) {
if (!itemId) return false;
if (conflictSet(map).has(itemId)) return true;
var it = byId[itemId];
if (!it) return false;
var mine = new Set();
asArray(it.conflictingItems).forEach(function (c) {
mine.add(typeof c === "string" ? c : c.id);
});
asArray((it.properties || {}).conflictingItems).forEach(function (c) {
mine.add(typeof c === "string" ? c : c.id);
});
return Object.keys(map).some(function (k) {
return mine.has(map[k]);
});
}

function computeStats(map) {
map = map || installed;
if (!baseWeapon) return null;
var p = baseWeapon.properties || {};
var ergo = Number(p.ergonomics) || Number(p.defaultErgonomics) || 0;
var recV = Number(p.recoilVertical) || Number(p.defaultRecoilVertical) || 0;
var recH = Number(p.recoilHorizontal) || Number(p.defaultRecoilHorizontal) || 0;
var weight = Number(baseWeapon.weight) || Number(p.weight) || 0;
var cost = itemPrice(baseWeapon);
var parts = [{ it: baseWeapon, slot: "base" }];
var sight = Number(p.sightingRange) || Number(p.effectiveDistance) || 0;
var hasOptic = false;

Object.keys(map).forEach(function (key) {
var it = byId[map[key]];
if (!it) return;
parts.push({ it: it, slot: key.split("::")[1] });
if (isOpticItem(it) || isOpticSlot(key.split("::")[1])) hasOptic = true;
var mp = it.properties || {};
if (mp.ergonomics != null) ergo += Number(mp.ergonomics) || 0;
else if (mp.ergonomicsModifier != null) ergo += Number(mp.ergonomicsModifier) || 0;
var r = mp.recoil != null ? Number(mp.recoil) : mp.recoilModifier != null ? Number(mp.recoilModifier) : null;
if (r != null && !isNaN(r)) {
recV *= 1 + r / 100;
recH *= 1 + r / 100;
}
weight += Number(it.weight) || Number(mp.weight) || 0;
cost += itemPrice(it);
var sr = Number(mp.sightingRange) || Number(mp.zoom) || 0;
if (sr > sight) sight = sr;
});

return {
ergo: Math.round(ergo * 10) / 10,
recV: Math.round(recV * 10) / 10,
recH: Math.round(recH * 10) / 10,
weight: Math.round(weight * 100) / 100,
cost: Math.round(cost),
sight: Math.round(sight),
hasOptic: hasOptic,
parts: parts
};
}

function removeSlotCascade(key, map) {
map = map || installed;
var id = map[key];
delete map[key];
if (!id || !byId[id]) return;
(function walk(item) {
asArray(item.properties && item.properties.slots).forEach(function (s) {
var k = item.id + "::" + (s.nameId || s.name || s.id);
var child = map[k];
if (child) {
delete map[k];
if (byId[child]) walk(byId[child]);
}
});
})(byId[id]);
}

var statusState = null;
function setStatus(key, params, ok) {
statusState = { key: key, params: params, ok: ok };
renderStatus();
}

function renderStatus() {
if (!statusState) return;
var el = document.getElementById("status");
el.className = "status" + (statusState.ok === true ? " ok" : statusState.ok === false ? " err" : "");
el.textContent = t(statusState.key, statusState.params);
}

function applyZoom() {
var inner = document.getElementById("schemaInner");
var label = document.getElementById("zoomVal");
if (inner) inner.style.transform = "scale(" + schemaZoom + ")";
if (label) label.textContent = Math.round(schemaZoom * 100) + "%";
}

function setZoom(z) {
schemaZoom = Math.max(0.45, Math.min(2.2, z));
applyZoom();
}

function placeSlotBox(s, conf) {
var child = installed[s.key] ? byId[installed[s.key]] : null;
var bad = child && conf.has(child.id);
var box = document.createElement("div");
box.className =
"slot-box" +
(child ? " has" : " empty") +
(s.required ? " req" : "") +
(bad ? " conflict" : "") +
(s.isOptic && !child ? " optic-forced" : "");
var label = slotLabel(s.nameId);
if (child) {
box.innerHTML =
'<div class="slot-label">' +
esc(label) +
"</div>" +
(child.iconLink || child.gridImageLink
? '<img src="' + esc(child.iconLink || child.gridImageLink) + '" alt="">'
: "") +
'<div class="mod-name">' +
esc(itemName(child)) +
"</div>";
} else {
box.innerHTML =
'<div class="slot-label">' +
esc(label) +
(s.required ? " *" : "") +
(s.isOptic ? " ◎" : "") +
'</div><div class="meta">' + esc(t("empty")) + '</div>';
}
box.onclick = function () {
openSlot(s);
};
return box;
}

var REGION_TITLE = {
FRONT: "front",
FRONT_BOTTOM: "frontBottom",
RECEIVER: "receiver",
TOP: "top",
BOTTOM: "bottom",
REAR: "rear",
OTHER: "other"
};

function renderSchematic() {
var root = document.getElementById("schematic");
if (!root) return;
root.innerHTML = "";
if (!baseWeapon) return;

var slots = collectSlots();
var conf = conflictSet();
var byRegion = {
FRONT: [],
FRONT_BOTTOM: [],
RECEIVER: [],
TOP: [],
BOTTOM: [],
REAR: [],
OTHER: []
};
slots.forEach(function (s) {
var r = s.region || "OTHER";
if (!byRegion[r]) byRegion[r] = [];
byRegion[r].push(s);
});
Object.keys(byRegion).forEach(function (r) {
byRegion[r].sort(function (a, b) {
return fillPriority(a.nameId) - fillPriority(b.nameId);
});
});

function makeRegion(key, slotsArr, areaClass, bodyCol) {
if (!slotsArr || !slotsArr.length) return null;
var reg = document.createElement("div");
reg.className = "region " + (areaClass || "");
reg.innerHTML = '<div class="region-label">' + esc(t("region." + (REGION_TITLE[key] || key))) + "</div>";
var body = document.createElement("div");
body.className = "region-body" + (bodyCol ? " col" : "");
slotsArr.forEach(function (s) {
body.appendChild(placeSlotBox(s, conf));
});
reg.appendChild(body);
return reg;
}

var top = makeRegion("TOP", byRegion.TOP, "area-top", false);
if (top) root.appendChild(top);

var front = makeRegion("FRONT", byRegion.FRONT, "area-front", false);
if (front) root.appendChild(front);

var fb = makeRegion("FRONT_BOTTOM", byRegion.FRONT_BOTTOM, "area-fb", false);
if (fb) root.appendChild(fb);

var mid = document.createElement("div");
mid.className = "region area-mid";
mid.innerHTML = '<div class="region-label">' + esc(t("weapon")) + '</div>';
var midBody = document.createElement("div");
midBody.className = "region-body col";
var core = document.createElement("div");
core.className = "slot-box core has";
core.innerHTML =
'<div class="slot-label">' + esc(t("base")) + '</div>' +
(baseWeapon.iconLink || baseWeapon.gridImageLink
? '<img src="' + esc(baseWeapon.iconLink || baseWeapon.gridImageLink) + '" alt="">'
: "") +
'<div class="mod-name">' +
esc(itemName(baseWeapon)) +
"</div>";
midBody.appendChild(core);
byRegion.RECEIVER.forEach(function (s) {
midBody.appendChild(placeSlotBox(s, conf));
});
mid.appendChild(midBody);
root.appendChild(mid);

var bottom = makeRegion("BOTTOM", byRegion.BOTTOM, "area-bottom", false);
if (bottom) root.appendChild(bottom);

var rear = makeRegion("REAR", byRegion.REAR, "area-rear", false);
if (rear) root.appendChild(rear);

var other = makeRegion("OTHER", byRegion.OTHER, "area-other", false);
if (other) root.appendChild(other);
}

function renderStats() {
var st = computeStats();
var el = document.getElementById("stats");
if (!st) {
el.innerHTML = "";
return;
}
el.innerHTML =
'<div class="stat"><div class="v">' +
st.ergo +
'</div><div class="l">' + esc(t("ergonomics")) + '</div></div>' +
'<div class="stat"><div class="v">' +
st.recV +
'</div><div class="l">' + esc(t("verticalRecoil")) + '</div></div>' +
'<div class="stat"><div class="v">' +
st.recH +
'</div><div class="l">' + esc(t("horizontalRecoil")) + '</div></div>' +
'<div class="stat"><div class="v">' +
st.weight +
' ' + esc(t("weightUnit")) + '</div><div class="l">' + esc(t("weight")) + '</div></div>' +
'<div class="stat"><div class="v">' +
fmt(st.cost) +
' ₽</div><div class="l">' + esc(t("price")) + '</div></div>' +
'<div class="stat"><div class="v">' +
(st.sight || "—") +
'</div><div class="l">' + esc(t("range")) + '</div></div>' +
'<div class="stat"><div class="v">' +
(st.hasOptic ? t("yes") : t("no")) +
'</div><div class="l">' + esc(t("optic")) + '</div></div>';
}

function renderSlots() {
var box = document.getElementById("slotList");
var slots = collectSlots();
var conf = conflictSet();
if (!slots.length) {
box.innerHTML = '<p class="muted">' + esc(t("noSlots")) + '</p>';
return;
}
slots.sort(function (a, b) {
var ra = REGION_ORDER.indexOf(a.region);
var rb = REGION_ORDER.indexOf(b.region);
if (ra !== rb) return ra - rb;
return fillPriority(a.nameId) - fillPriority(b.nameId);
});
box.innerHTML = slots
.map(function (s) {
var mod = s.key in installed ? byId[installed[s.key]] : null;
var bad = mod && conf.has(mod.id);
return (
'<div class="slot' +
(s.required ? " req" : "") +
(bad ? " conflict" : "") +
'" data-key="' +
esc(s.key) +
'"><div><div class="slot-name">' +
esc(slotLabel(s.nameId)) +
(s.isOptic ? " ◎" : "") +
'</div><div class="slot-meta">' +
esc(t("region." + (REGION_TITLE[s.region] || s.region))) +
" · " +
(mod ? esc(itemName(mod)) + " · " + fmt(itemPrice(mod)) + " ₽" : t("empty")) +
(bad ? " · " + t("conflict") : "") +
'</div></div><div class="slot-actions">' +
'<button type="button" class="btn-sm accent" data-a="pick">' + esc(t("choose")) + '</button>' +
(mod ? '<button type="button" class="btn-sm" data-a="clr">' + esc(t("remove")) + '</button>' : "") +
"</div></div>"
);
})
.join("");

box.querySelectorAll(".slot").forEach(function (row) {
var key = row.getAttribute("data-key");
var slot = slots.find(function (x) {
return x.key === key;
});
row.querySelectorAll("button").forEach(function (b) {
b.onclick = function () {
if (b.getAttribute("data-a") === "clr") {
removeSlotCascade(key);
paint();
}
if (b.getAttribute("data-a") === "pick" && slot) openSlot(slot);
};
});
});
}

function openSlot(s, preserveFilter) {
activeSlot = s;
document.getElementById("modalTitle").textContent =
slotLabel(s.nameId) + (s.required ? " (" + t("required") + ")" : "") + (s.isOptic ? " · " + t("optic") : "");
document.getElementById("modal").classList.add("show");
var filterInp = document.getElementById("modalFilter");
if (!preserveFilter) filterInp.value = "";
function draw() {
var q = (filterInp.value || "").toLowerCase().trim();
var list = allowedForSlot(s.filters).slice();
var conf = conflictSet();
list.sort(function (a, b) {
var oa = isOpticItem(a) ? 1 : 0;
var ob = isOpticItem(b) ? 1 : 0;
if (s.isOptic && oa !== ob) return ob - oa;
return (Number((b.properties || {}).ergonomics) || 0) - (Number((a.properties || {}).ergonomics) || 0);
});
if (q) {
list = list.filter(function (m) {
return (
(itemName(m) + " " + (m.shortName || "") + " " + (m.normalizedName || ""))
.toLowerCase()
.indexOf(q) >= 0
);
});
}
var box = document.getElementById("modalList");
if (!list.length) {
box.innerHTML = '<p class="muted">' + esc(t("noCompatibleMods")) + '</p>';
return;
}
box.innerHTML = list
.slice(0, 80)
.map(function (m) {
var mp = m.properties || {};
var ergo = mp.ergonomics != null ? Number(mp.ergonomics) : null;
var rec = mp.recoil != null ? Number(mp.recoil) : null;
var bad = conf.has(m.id) || hasConflict(installed, m.id);
return (
'<div class="mod-pick" data-id="' +
esc(m.id) +
'">' +
(m.iconLink
? '<img class="ico" src="' + esc(m.iconLink) + '" alt="">'
: '<div class="ico"></div>') +
"<div><div><b>" +
esc(itemName(m)) +
"</b>" +
(bad ? ' <span class="muted">' + esc(t("conflict")) + '</span>' : "") +
'</div><div class="muted">' +
fmt(itemPrice(m)) +
" ₽" +
(ergo != null ? " · ergo " + ergo : "") +
(rec != null ? " · rec " + rec + "%" : "") +
"</div></div></div>"
);
})
.join("");
box.querySelectorAll(".mod-pick").forEach(function (row) {
row.onclick = function () {
var id = row.getAttribute("data-id");
if (installed[s.key]) removeSlotCascade(s.key);
installed[s.key] = id;
document.getElementById("modal").classList.remove("show");
paint();
};
});
}
filterInp.oninput = draw;
draw();
}

function paint() {
renderSchematic();
renderStats();
renderSlots();
}

function candidateRank(m, goal, preferOptic) {
var mp = m.properties || {};
var ergo = Number(mp.ergonomics) || 0;
var rec = Number(mp.recoil != null ? mp.recoil : mp.recoilModifier) || 0;
var bonus = preferOptic && isOpticItem(m) ? 50 : 0;
if (goal === "maxErgo") return ergo * 3 + bonus;
if (goal === "minRecoil") return -rec * 3 + ergo * 0.3 + bonus;
if (goal === "budget") return ergo - rec * 0.5 - itemPrice(m) / 20000 + bonus;
return ergo * 1.5 - rec * 1.2 + bonus;
}

function greedyFill(goal, budget, onlyBuyable, forceOptic) {
var map = {};
var guard = 0;
while (guard++ < 28) {
var empty = collectSlots(map).filter(function (s) {
return !map[s.key];
});
if (!empty.length) break;
empty.sort(function (a, b) {
if (forceOptic) {
if (a.isOptic !== b.isOptic) return a.isOptic ? -1 : 1;
}
return fillPriority(a.nameId) - fillPriority(b.nameId);
});
var s = empty[0];
var cands = allowedForSlot(s.filters).filter(function (m) {
if (onlyBuyable && !isBuyable(m)) return false;
if (hasConflict(map, m.id)) return false;
if (budget > 0) {
var trial = Object.assign({}, map);
trial[s.key] = m.id;
if (computeStats(trial).cost > budget) return false;
}
return true;
});
if (forceOptic && s.isOptic) {
var optics = cands.filter(isOpticItem);
if (optics.length) cands = optics;
}
if (!cands.length) {
if (!s.required) {
empty.shift();
if (!empty.length) break;
continue;
}
break;
}
cands.sort(function (a, b) {
return candidateRank(b, goal, forceOptic && s.isOptic) - candidateRank(a, goal, forceOptic && s.isOptic);
});
map[s.key] = cands[0].id;
}
return map;
}

function scanBuilds(goal, budget, onlyBuyable, forceOptic) {
var results = [];
var seen = new Set();
function keyOf(map) {
return Object.keys(map)
.sort()
.map(function (k) {
return k + "=" + map[k];
})
.join("|");
}
function pushMap(map) {
var k = keyOf(map);
if (seen.has(k)) return;
seen.add(k);
var st = computeStats(map);
var sc = TarkovWeaponDomain.scoreBuild(st, goal, budget, forceOptic);
if (sc === -Infinity) return;
results.push({ map: map, stats: st, score: sc });
}
pushMap(greedyFill(goal, budget, onlyBuyable, forceOptic));
var base = greedyFill(goal, budget, onlyBuyable, forceOptic);
var slots = collectSlots(base).filter(function (s) {
return base[s.key];
});
slots.sort(function (a, b) {
return fillPriority(a.nameId) - fillPriority(b.nameId);
});
slots.slice(0, 8).forEach(function (s) {
var cands = allowedForSlot(s.filters).filter(function (m) {
return !(onlyBuyable && !isBuyable(m));
});
if (forceOptic && s.isOptic) {
var optics = cands.filter(isOpticItem);
if (optics.length) cands = optics;
}
cands.sort(function (a, b) {
return candidateRank(b, goal, forceOptic && s.isOptic) - candidateRank(a, goal, forceOptic && s.isOptic);
});
cands.slice(0, 4).forEach(function (m) {
var map = {};
map[s.key] = m.id;
Object.keys(base).forEach(function (k) {
if (k !== s.key && !hasConflict(map, base[k])) map[k] = base[k];
});
var guard = 0;
while (guard++ < 20) {
var empty = collectSlots(map).filter(function (x) {
return !map[x.key];
});
if (!empty.length) break;
empty.sort(function (a, b) {
if (forceOptic && a.isOptic !== b.isOptic) return a.isOptic ? -1 : 1;
return fillPriority(a.nameId) - fillPriority(b.nameId);
});
var slot = empty[0];
var opts = allowedForSlot(slot.filters).filter(function (mm) {
if (onlyBuyable && !isBuyable(mm)) return false;
if (hasConflict(map, mm.id)) return false;
if (budget > 0) {
var t = Object.assign({}, map);
t[slot.key] = mm.id;
if (computeStats(t).cost > budget) return false;
}
return true;
});
if (forceOptic && slot.isOptic) {
var o2 = opts.filter(isOpticItem);
if (o2.length) opts = o2;
}
if (!opts.length) break;
opts.sort(function (a, b) {
return (
candidateRank(b, goal, forceOptic && slot.isOptic) -
candidateRank(a, goal, forceOptic && slot.isOptic)
);
});
map[slot.key] = opts[0].id;
}
pushMap(map);
});
});
results.sort(function (a, b) {
return b.score - a.score;
});
return results.slice(0, 24);
}

function niceTicks(min, max, count) {
if (max === min) {
max = min + 1;
}
var span = max - min;
var step = Math.pow(10, Math.floor(Math.log10(span / count)));
var err = (span / count) / step;
if (err >= 7.5) step *= 10;
else if (err >= 3) step *= 5;
else if (err >= 1.5) step *= 2;
var start = Math.ceil(min / step) * step;
var ticks = [];
for (var v = start; v <= max + step * 0.01; v += step) ticks.push(Math.round(v * 1000) / 1000);
if (!ticks.length) ticks = [min, max];
return ticks;
}

function paretoFront(builds) {
var pts = builds
.map(function (b, i) {
return { i: i, ergo: b.stats.ergo, rec: b.stats.recV };
})
.sort(function (a, b) {
return a.ergo - b.ergo || a.rec - b.rec;
});
var front = [];
var bestRec = Infinity;
pts.forEach(function (p) {
if (p.rec < bestRec) {
bestRec = p.rec;
front.push(p);
}
});
return front;
}

function renderChart(builds) {
var svg = document.getElementById("abChart");
var tip = document.getElementById("abChartTip");
if (!svg) return;
if (tip) tip.classList.remove("show");

if (!builds.length) {
svg.innerHTML = "";
svg.setAttribute("viewBox", "0 0 560 250");
return;
}

var W = 560,
H = 250,
left = 50,
top = 16,
plotW = 480,
plotH = 190;
var xs = builds.map(function (b) {
return b.stats.ergo;
});
var ys = builds.map(function (b) {
return b.stats.recV;
});
var minX = Math.min.apply(null, xs),
maxX = Math.max.apply(null, xs),
minY = Math.min.apply(null, ys),
maxY = Math.max.apply(null, ys);
var padX = (maxX - minX) * 0.08 || 2;
var padY = (maxY - minY) * 0.1 || 2;
minX -= padX;
maxX += padX;
minY = Math.max(0, minY - padY);
maxY += padY;

function xScale(v) {
return left + ((v - minX) / (maxX - minX)) * plotW;
}
function yScale(v) {
return top + ((v - minY) / (maxY - minY)) * plotH;
}

var xTicks = niceTicks(minX, maxX, 6);
var yTicks = niceTicks(minY, maxY, 5);
var accent = "var(--accent, #c9a227)";
var muted = "#8b919a";
var grid = "rgba(201,162,39,0.08)";

var parts = [];
yTicks.forEach(function (t) {
var y = yScale(t);
parts.push(
'<line x1="' +
left +
'" x2="' +
(left + plotW) +
'" y1="' +
y +
'" y2="' +
y +
'" stroke="' +
grid +
'" stroke-width="1"/>'
);
parts.push(
'<text x="' +
(left - 8) +
'" y="' +
(y + 3.5) +
'" text-anchor="end" font-size="10" fill="' +
muted +
'">' +
Math.round(t) +
"</text>"
);
});
xTicks.forEach(function (t) {
var x = xScale(t);
parts.push(
'<line x1="' +
x +
'" x2="' +
x +
'" y1="' +
top +
'" y2="' +
(top + plotH) +
'" stroke="' +
grid +
'" stroke-width="1"/>'
);
parts.push(
'<text x="' +
x +
'" y="' +
(top + plotH + 15) +
'" text-anchor="middle" font-size="10" fill="' +
muted +
'">' +
Math.round(t) +
"</text>"
);
});

parts.push(
'<text x="' +
(left + plotW / 2) +
'" y="244" text-anchor="middle" font-size="10.5" fill="' +
muted +
'">' + t("ergonomics") + ' →</text>'
);
parts.push(
'<text x="12" y="' +
(top + plotH / 2) +
'" text-anchor="middle" font-size="10.5" fill="' +
muted +
'" transform="rotate(-90 12 ' +
(top + plotH / 2) +
')">' + t("verticalRecoil") + ' →</text>'
);

var front = paretoFront(builds);
if (front.length > 1) {
var poly = front
.map(function (p) {
return xScale(p.ergo).toFixed(1) + "," + yScale(p.rec).toFixed(1);
})
.join(" ");
parts.push(
'<polyline points="' +
poly +
'" fill="none" stroke="' +
accent +
'" stroke-width="2" stroke-opacity="0.45" stroke-linejoin="round" stroke-linecap="round"/>'
);
}

builds.forEach(function (b, i) {
var cx = xScale(b.stats.ergo);
var cy = yScale(b.stats.recV);
var best = i === 0;
parts.push(
'<g class="ab-pt" data-i="' +
i +
'" style="cursor:pointer">' +
(best
? '<circle cx="' +
cx +
'" cy="' +
cy +
'" r="10" fill="' +
accent +
'" fill-opacity="0.15"/>'
: "") +
'<circle cx="' +
cx +
'" cy="' +
cy +
'" r="' +
(best ? 6.5 : 5) +
'" fill="' +
(best ? "#6dd49d" : accent) +
'" stroke="' +
(best ? accent : "#6dd49d") +
'" stroke-width="2"/>' +
'<circle cx="' +
cx +
'" cy="' +
cy +
'" r="14" fill="transparent"/>' +
"</g>"
);
});

svg.setAttribute("viewBox", "0 0 " + W + " " + H);
svg.innerHTML = parts.join("");

svg.querySelectorAll(".ab-pt").forEach(function (g) {
var i = Number(g.getAttribute("data-i"));
g.onmouseenter = function () {
var b = builds[i];
if (!b || !tip) return;
var cx = xScale(b.stats.ergo);
var cy = yScale(b.stats.recV);
tip.innerHTML =
"<b>#" +
(i + 1) +
"</b> · " + t("ergonomics") + " <b>" +
b.stats.ergo +
"</b> · " + t("verticalRecoil") + " <b>" +
b.stats.recV +
"</b> · " +
fmt(b.stats.cost) +
" ₽";
tip.style.left = (cx / W) * 100 + "%";
tip.style.top = (cy / H) * 100 + "%";
tip.classList.add("show");
};
g.onmouseleave = function () {
if (tip) tip.classList.remove("show");
};
g.onclick = function () {
var card = document.querySelector('.ab-card[data-i="' + i + '"]');
if (card) card.click();
};
});
}

function renderAbResults(builds) {
abBuilds = builds;
if (!builds.length) activeBuildIndex = -1;
else if (activeBuildIndex < 0 || activeBuildIndex >= builds.length) activeBuildIndex = 0;
var box = document.getElementById("abResults");
if (!builds.length) {
box.innerHTML = '<p class="muted">' + esc(t("noneBuilds")) + '</p>';
renderChart([]);
return;
}
box.innerHTML = builds
.map(function (b, i) {
return (
'<div class="ab-card' +
(i === activeBuildIndex ? " on" : "") +
'" data-i="' +
i +
'"><div class="t">#' +
(i + 1) +
" · " + t("ergonomics") + " " +
b.stats.ergo +
" · " + t("verticalRecoil") + " " +
b.stats.recV +
" · " +
fmt(b.stats.cost) +
' ₽</div><div class="m">' +
t("modsCount", { count: Object.keys(b.map).length }) + " · " + t("weight") + " " +
b.stats.weight +
" " + t("weightUnit") + " · " + t("opticSummary", { value: b.stats.hasOptic ? t("yes") : t("no") }) +
"</div></div>"
);
})
.join("");
box.querySelectorAll(".ab-card").forEach(function (card) {
card.onclick = function () {
var i = Number(card.getAttribute("data-i"));
var b = abBuilds[i];
if (!b) return;
activeBuildIndex = i;
installed = Object.assign({}, b.map);
paint();
box.querySelectorAll(".ab-card").forEach(function (c) {
c.classList.toggle("on", c === card);
});
setAbStatus("appliedBuild", { index: i + 1 });
};
});
renderChart(builds);
}

function runAutoBuild() {
if (!baseWeapon) return;
var budget = Math.max(0, Number(document.getElementById("abBudget").value) || 0);
var onlyBuyable = document.getElementById("abBuyable").value === "1";
var forceOptic = document.getElementById("abForceOptic").checked;
setAbStatus("scanning");
setTimeout(function () {
try {
var builds = scanBuilds(abGoal, budget, onlyBuyable, forceOptic);
renderAbResults(builds);
setAbStatus(builds.length ? "buildsFound" : "buildsEmpty", builds.length ? { count: builds.length } : null);
} catch (e) {
setAbStatus("buildError", { message: e.message || String(e) });
}
}, 30);
}

function bindZoom() {
document.getElementById("zoomIn").onclick = function () {
setZoom(schemaZoom + 0.15);
};
document.getElementById("zoomOut").onclick = function () {
setZoom(schemaZoom - 0.15);
};
document.getElementById("zoomReset").onclick = function () {
setZoom(1);
var vp = document.getElementById("schemaViewport");
if (vp) {
vp.scrollLeft = 0;
vp.scrollTop = 0;
}
};
var vp = document.getElementById("schemaViewport");
if (!vp) return;
vp.addEventListener(
"wheel",
function (e) {
if (!baseWeapon) return;
e.preventDefault();
var delta = e.deltaY > 0 ? -0.08 : 0.08;
setZoom(schemaZoom + delta);
},
{ passive: false }
);
vp.addEventListener("mousedown", function (e) {
if (e.button !== 0) return;
dragState = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
vp.classList.add("dragging");
});
window.addEventListener("mousemove", function (e) {
if (!dragState) return;
vp.scrollLeft = dragState.sl - (e.clientX - dragState.x);
vp.scrollTop = dragState.st - (e.clientY - dragState.y);
});
window.addEventListener("mouseup", function () {
dragState = null;
vp.classList.remove("dragging");
});
}

document.getElementById("loadBtn").onclick = async function () {
var btn = document.getElementById("loadBtn");
btn.disabled = true;
setStatus("loading");
var P = window.TarkovUI && TarkovUI.progress;
try {
if (P) P.start({ label: t("loadingItems") });
var mode = document.getElementById("gameMode").value || "pve";
var items = asArray(await TarkovAPI.items(mode));
byId = {};
weapons = [];
mods = [];
items.forEach(function (it) {
if (!it || !it.id) return;
byId[it.id] = it;
if (isWeapon(it)) weapons.push(it);
if (isMod(it)) mods.push(it);
});
setStatus("loaded", { weapons: weapons.length, mods: mods.length }, true);
document.getElementById("pickCard").style.display = "block";
if (P) P.done();
} catch (e) {
setStatus("loadError", { message: e.message || String(e) }, false);
if (P) P.fail(e.message);
} finally {
btn.disabled = false;
}
};

document.getElementById("weaponQ").addEventListener("input", function () {
var q = this.value.toLowerCase().trim();
var box = document.getElementById("weaponSuggest");
if (!q || q.length < 2) {
box.style.display = "none";
box.innerHTML = "";
return;
}
var hits = weapons
.filter(function (w) {
return (
(itemName(w) + " " + (w.shortName || "") + " " + (w.normalizedName || ""))
.toLowerCase()
.indexOf(q) >= 0
);
})
.slice(0, 15);
if (!hits.length) {
box.style.display = "none";
return;
}
box.innerHTML = hits
.map(function (w) {
return (
'<button type="button" data-id="' +
esc(w.id) +
'"><b>' +
esc(itemName(w)) +
'</b> <span class="muted">' +
esc(w.shortName || "") +
"</span></button>"
);
})
.join("");
box.style.display = "block";
box.querySelectorAll("button").forEach(function (btn) {
btn.onclick = function () {
baseWeapon = byId[btn.getAttribute("data-id")];
installed = {};
document.getElementById("weaponQ").value = itemName(baseWeapon);
box.style.display = "none";
document.getElementById("buildCard").style.display = "block";
document.getElementById("mainLayout").style.display = "grid";
setZoom(1);
paint();
document.getElementById("abResults").innerHTML = "";
document.getElementById("abChart").innerHTML = "";
};
});
});

document.getElementById("clearBuild").onclick = function () {
installed = {};
paint();
};
document.getElementById("copyBuild").onclick = function () {
var st = computeStats();
if (!st) return;
var lines = st.parts.map(function (p) {
return (p.slot === "base" ? t("weapon") : slotLabel(p.slot)) + ": " + itemName(p.it);
});
lines.push(
"— " + t("ergonomics") + " " + st.ergo + " | " + t("verticalRecoil") + " " + st.recV + " | " + t("horizontalRecoil") + " " + st.recH + " | " + t("price") + " " + fmt(st.cost) + " ₽ | " + t("optic") + " " + (st.hasOptic ? t("yes") : t("no"))
);
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(lines.join("\n"));
setStatus("copied", null, true);
}
};
document.getElementById("abGoal").onclick = function (ev) {
var t = ev.target;
if (!t.getAttribute || !t.getAttribute("data-g")) return;
abGoal = t.getAttribute("data-g");
document.querySelectorAll("#abGoal .chip").forEach(function (c) {
c.classList.toggle("on", c.getAttribute("data-g") === abGoal);
});
};
document.getElementById("abScan").onclick = runAutoBuild;
document.getElementById("modalClose").onclick = function () {
document.getElementById("modal").classList.remove("show");
activeSlot = null;
};
document.getElementById("modal").onclick = function (e) {
if (e.target.id === "modal") {
e.target.classList.remove("show");
activeSlot = null;
}
};

window.addEventListener("tt-lang-changed", function () {
renderStatus();
renderAbStatus();
if (baseWeapon) document.getElementById("weaponQ").value = itemName(baseWeapon);
paint();
renderAbResults(abBuilds);
var modal = document.getElementById("modal");
if (activeSlot && modal.classList.contains("show")) openSlot(activeSlot, true);
document.getElementById("abChart").setAttribute("aria-label", t("autoBuild"));
});

bindZoom();
})();
