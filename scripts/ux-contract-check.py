#!/usr/bin/env python3
"""Focused regression checks for R3.21 user-facing integration points."""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
checks = 0

def read(rel: str) -> str:
    path = ROOT / rel
    if not path.is_file():
        errors.append(f"Missing required file: {rel}")
        return ""
    return path.read_text(encoding="utf-8", errors="replace")

def require(rel: str, pattern: str, why: str, flags: int = re.I | re.S) -> None:
    global checks
    checks += 1
    source = read(rel)
    if not re.search(pattern, source, flags):
        errors.append(f"{rel}: {why}")

# Shared item identity/media and inspector availability.
require("core/tarkov-api.js", r"TarkovItemCatalog\[m\]\s*=\s*byId", "API items must populate the per-mode lookup index")
require("core/tarkov-table-tool.js", r"TarkovItemCatalog", "table name cells must resolve media through the shared item catalogue")
require("core/tarkov-table-tool.js", r"data-item-id", "table name cells must expose item IDs for inspection")
require("core/tarkov-item-media.js", r"defaultPreset[\s\S]{0,300}image512pxLink", "weapon media must prefer the standard/default preset")
require("core/tarkov-tool-shell.js", r"ensureItemInspectorJs\(\)", "shared shell must load the item inspector")
require("core/tarkov-item-inspector.js", r"Alt\+I", "inspector must expose the keyboard toggle")
require("core/tarkov-item-inspector.js", r"addEventListener\(\s*['\"]dblclick['\"]", "double-click must open item details")
require("core/tarkov-item-inspector.js", r"function fullCardUrl[\s\S]{0,500}tarkovtool-item-card\.html", "inspector must resolve the full item-card URL")

# Known regressions from the reported UI.
require("js/nvg.js", r"id\s*=\s*['\"]tableCard['\"]|getElementById\(['\"]tableCard['\"]\)[\s\S]{0,240}display\s*=\s*['\"]block", "NVG results table must be revealed after loading")
require("js/nvg.js", r"ItemPropertiesNightVision", "NVG tool must recognize the API night-vision property type")
for rel in ("js/armor.js", "js/plates.js"):
    require(rel, r"showModal\(\)", "compatibility modal must be opened as a native dialog")
require("js/prestige.js", r"window\.render\s*=\s*refresh", "Prestigeinator must publish its refresh callback inside its initialized scope")
require("js/prestige.js", r"Start with real data and an empty, honest state", "Prestigeinator must not show demo items by default")
require("js/stash-packer.js", r"stash-board|gridTemplateColumns|gridColumn", "stash packing must render a visual grid")
require("tools/tarkovtool-stash-packer.html", r"id=['\"]pickList['\"]", "stash picker must provide the multi-select list")
require("tools/tarkovtool-stash-packer.html", r"Контейнеры \(можно выбрать несколько\)", "stash picker label must explain multi-selection without obsolete modifier-key instructions")
require("js/item-card.js", r"var questsHref\s*=", "item-card must define a quest destination")
require("js/item-card.js", r"var craftsHref\s*=", "item-card must define a craft destination")
require("js/item-card.js", r"var barterHref\s*=", "item-card must define a barter destination")
require("js/item-card.js", r"var hideoutHref\s*=", "item-card must define a hideout destination")
require("js/item-card.js", r"function itemLabel\(iid\)", "item-card related item labels must use a local helper")
require("js/item-card.js", r"requestedMode === \"pvp-season\"", "full item card must preserve PvP seasonal mode from the inspector link")

if errors:
    for error in errors:
        print(f"FAIL: {error}", file=sys.stderr)
    print(f"R3.21 UX contract: FAIL ({len(errors)} issue(s), {checks} checks)", file=sys.stderr)
    sys.exit(1)
print(f"R3.21 UX contract: PASS ({checks} regression checks)")
