#!/usr/bin/env python3
"""Validate the repository's current flat tool-page architecture and hub contract."""
from __future__ import annotations

import re
import sys
import importlib.util
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = ROOT / "scripts" / "build-catalog.py"
GENERATOR_SPEC = importlib.util.spec_from_file_location("build_catalog", GENERATOR_PATH)
if GENERATOR_SPEC is None or GENERATOR_SPEC.loader is None:
    raise RuntimeError(f"Unable to load catalog generator at {GENERATOR_PATH}")
build_catalog = importlib.util.module_from_spec(GENERATOR_SPEC)
GENERATOR_SPEC.loader.exec_module(build_catalog)
OUT_HUB = build_catalog.OUT_HUB
collect = build_catalog.collect
emit_js = build_catalog.emit_js
parse_meta = build_catalog.parse_meta

TOOLS = ROOT / "tools"
CATALOG_HTML = re.compile(r"<script\b[^>]*\bid=[\"']tarkovtool-meta[\"'][^>]*>(.*?)</script>", re.I | re.S)
SCRIPT_SRC = re.compile(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.I)
DIRECT_API = re.compile(r"fetch\s*\(\s*[\"']https?://json\.tarkov\.dev", re.I)
VALID_CATEGORIES = {"flea", "loadout", "hideout", "quests", "med", "util", "other"}
LIVE_FILES = {
    "tools/tarkovtool-price-track.html",
    "tools/tarkovtool-price-alarm.html",
    "tools/tarkovtool-restock.html",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def local_script_path(page: Path, src: str) -> Path | None:
    parsed = urlsplit(src)
    if parsed.scheme or parsed.netloc:
        return None
    relative = Path(parsed.path)
    if parsed.path.startswith("/"):
        return ROOT / parsed.path.lstrip("/")
    return (page.parent / relative).resolve()


def ordered(scripts: list[str], first: str, second: str) -> bool:
    try:
        return scripts.index(first) < scripts.index(second)
    except ValueError:
        return True


def main() -> int:
    errors: list[str] = []
    pages = sorted(TOOLS.glob("tarkovtool-*.html"))
    if not pages:
        fail(errors, "tools/tarkovtool-*.html pages were not found")

    entries, warnings = collect()
    expected_catalog = emit_js(entries)
    if not OUT_HUB.is_file() or OUT_HUB.read_text(encoding="utf-8") != expected_catalog:
        fail(errors, "hub/catalog.js is stale; run scripts/build-catalog.py")
    for warning in warnings:
        fail(errors, warning)

    page_names = {f"tools/{page.name}" for page in pages}
    entry_names = {entry["file"] for entry in entries}
    if page_names != entry_names:
        fail(errors, f"catalog/page mismatch: {len(page_names - entry_names)} pages missing, {len(entry_names - page_names)} stale entries")

    for page in pages:
        html = page.read_text(encoding="utf-8")
        matches = CATALOG_HTML.findall(html)
        if len(matches) != 1:
            fail(errors, f"{page.relative_to(ROOT)} must have exactly one tarkovtool-meta JSON block")
        else:
            meta = parse_meta(html)
            if not meta or not str(meta.get("title", "")).strip() or not str(meta.get("description", "")).strip():
                fail(errors, f"{page.relative_to(ROOT)} needs valid title and description metadata")
            if meta and meta.get("kind") not in (None, "static", "live"):
                fail(errors, f"{page.relative_to(ROOT)} has unsupported kind={meta.get('kind')!r}")

        scripts: list[str] = []
        tool_scripts: list[tuple[str, Path]] = []
        for match in SCRIPT_SRC.finditer(html):
            src = match.group(1)
            path = local_script_path(page, src)
            if path is None:
                continue
            if not path.is_file():
                fail(errors, f"{page.relative_to(ROOT)} references missing script {src}")
                continue
            name = path.name
            scripts.append(name)
            if path.parent == ROOT / "js" or path.is_relative_to(TOOLS):
                tool_scripts.append((name, path))

        rel_page = f"tools/{page.name}"
        if rel_page in LIVE_FILES and "tarkov-poll.js" not in scripts:
            fail(errors, f"{rel_page} is live but does not load tarkov-poll.js")
        if tool_scripts and "tarkov-tool-shell.js" in scripts:
            shell_at = scripts.index("tarkov-tool-shell.js")
            for name, _ in tool_scripts:
                if scripts.index(name) > shell_at:
                    fail(errors, f"{rel_page} must load tool script {name} before tarkov-tool-shell.js")
        if not ordered(scripts, "tarkov-storage.js", "tarkov-api.js"):
            fail(errors, f"{rel_page} must load storage before API")
        if not ordered(scripts, "tarkov-api.js", "tarkov-item-domain.js") or not ordered(scripts, "tarkov-api.js", "tarkov-weapon-domain.js"):
            fail(errors, f"{rel_page} must load API before domain modules")

        source = "\n".join(path.read_text(encoding="utf-8", errors="replace") for _, path in tool_scripts)
        if "TarkovSchema." in source and not ordered(scripts, "tarkov-schema.js", tool_scripts[0][0] if tool_scripts else ""):
            fail(errors, f"{rel_page} must load schema before tool logic")
        if "TarkovPoll." in source and not ordered(scripts, "tarkov-poll.js", tool_scripts[0][0] if tool_scripts else ""):
            fail(errors, f"{rel_page} must load poll before tool logic")

        for source_file in [page, *(path for _, path in tool_scripts)]:
            if DIRECT_API.search(source_file.read_text(encoding="utf-8", errors="replace")):
                fail(errors, f"{source_file.relative_to(ROOT)} fetches json.tarkov.dev directly")

    for source_file in TOOLS.rglob("*"):
        if source_file.is_file() and source_file.suffix.lower() in {".html", ".js"}:
            if DIRECT_API.search(source_file.read_text(encoding="utf-8", errors="replace")):
                fail(errors, f"{source_file.relative_to(ROOT)} fetches json.tarkov.dev directly")

    for entry in entries:
        if entry.get("kind") not in ("static", "live"):
            fail(errors, f"{entry.get('file')} has invalid catalog kind")
        if entry.get("cat") not in VALID_CATEGORIES:
            fail(errors, f"{entry.get('file')} has invalid catalog category")
        icon = entry.get("icon", "")
        if not re.fullmatch(r"[a-z0-9-]+", icon) or not (ROOT / "assets" / "icons" / f"{icon}.svg").is_file():
            fail(errors, f"{entry.get('file')} icon must resolve to a local assets/icons/*.svg")

    hub_html = (ROOT / "tarkovtool-hub.html").read_text(encoding="utf-8")
    for marker in ('src="hub/catalog.js"', 'src="hub/tarkov-hub-mini.js', 'src="hub/tarkov-hub-app.js', 'id="catFilter"', 'id="kindFilter"'):
        if marker not in hub_html:
            fail(errors, f"tarkovtool-hub.html is missing {marker}")
    if len(re.findall(r'src="hub/catalog\.js"', hub_html)) != 1:
        fail(errors, "tarkovtool-hub.html must load the generated catalog exactly once")
    mini_at = hub_html.find('src="hub/tarkov-hub-mini.js')
    app_at = hub_html.find('src="hub/tarkov-hub-app.js')
    if mini_at >= app_at:
        fail(errors, "tarkovtool-hub.html must load the mini-tabs module before the hub app")

    backup_files = [
        path for path in ROOT.rglob("*")
        if path.is_file() and ".git" not in path.parts and (path.name.endswith(".bak") or path.name.endswith(".new.bak"))
    ]
    if backup_files:
        fail(errors, "backup artifacts remain: " + ", ".join(str(path.relative_to(ROOT)) for path in backup_files))

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print(f"Architecture lint: PASS ({len(pages)} tool pages, {len(entries)} catalog entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
