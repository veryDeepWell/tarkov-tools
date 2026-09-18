  try { TarkovState.addMiniTab({ file: file, title: title }); } catch (e) {}
  ensureFrame(file);
  expandTab(file);
  renderMiniList();
}
function bootMini() {
  if (!window.TarkovState) { setTimeout(bootMini, 40); return; }
  let tabs = [];
  try { tabs = TarkovState.getMiniTabs() || []; } catch (e) {}
  tabs.forEach(function (t) { try { ensureFrame(t.file); } catch (e) {} });
  renderMiniList();
  const m = (location.hash || "").match(/mini=([^&]+)/);
  if (m) {
    const f = decodeURIComponent(m[1]);
    if (tabs.some(function (t) { return t.file === f; })) setTimeout(function () { expandTab(f); }, 80);
  }
}
