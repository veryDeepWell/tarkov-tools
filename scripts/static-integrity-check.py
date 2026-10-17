#!/usr/bin/env python3
"""Static integrity checks for local links, JavaScript syntax, and HTML IDs.

Requires Node.js on PATH. Archived historical files under _archive/ are excluded.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")


class HtmlAuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.ids: list[str] = []
        self.refs: list[str] = []
        self.inline_scripts: list[tuple[str, str]] = []
        self._script_open = False
        self._script_type = ""
        self._script_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(str(values["id"]))
        for attr in ("src", "href"):
            value = values.get(attr)
            if value:
                self.refs.append(value)
        if tag.lower() == "script" and not values.get("src"):
            self._script_open = True
            self._script_type = (values.get("type") or "").lower()
            self._script_parts = []

    def handle_data(self, data: str) -> None:
        if self._script_open:
            self._script_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._script_open:
            if self._script_type not in ("application/json", "application/ld+json"):
                self.inline_scripts.append(("".join(self._script_parts), self._script_type))
            self._script_open = False
            self._script_type = ""
            self._script_parts = []


def project_files() -> list[Path]:
    return sorted(
        p for p in ROOT.rglob("*")
        if p.is_file() and ".git" not in p.parts and "_archive" not in p.parts
    )


def check_js(path: Path, node: str) -> str | None:
    result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
    return result.stderr.strip() if result.returncode else None


def main() -> int:
    if not NODE:
        print("ERROR: Node.js is required for JavaScript syntax checks", file=sys.stderr)
        return 2

    files = project_files()
    errors: list[str] = []
    js_files = [p for p in files if p.suffix.lower() == ".js"]
    for path in js_files:
        problem = check_js(path, NODE)
        if problem:
            errors.append(f"JavaScript syntax error: {path.relative_to(ROOT)}\n{problem}")

    html_files = [p for p in files if p.suffix.lower() == ".html"]
    inline_count = 0
    for path in html_files:
        parser = HtmlAuditParser()
        try:
            parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        except OSError as exc:
            errors.append(f"Cannot read {path.relative_to(ROOT)}: {exc}")
            continue

        duplicate_ids = sorted(k for k, count in Counter(parser.ids).items() if count > 1)
        if duplicate_ids:
            errors.append(f"Duplicate HTML id(s) in {path.relative_to(ROOT)}: {', '.join(duplicate_ids)}")

        for ref in parser.refs:
            if ref.startswith(("http:", "https:", "//", "#", "data:", "mailto:", "javascript:")):
                continue
            local_path = ref.split("#", 1)[0].split("?", 1)[0]
            if local_path and not (path.parent / local_path).resolve().exists():
                errors.append(f"Missing local href/src in {path.relative_to(ROOT)}: {ref}")

        for index, (source, _script_type) in enumerate(parser.inline_scripts, start=1):
            if not source.strip():
                continue
            inline_count += 1
            with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as temp:
                temp.write(source)
                temp_path = Path(temp.name)
            try:
                problem = check_js(temp_path, NODE)
                if problem:
                    errors.append(
                        f"Inline JavaScript syntax error in {path.relative_to(ROOT)} (script {index}):\n{problem}"
                    )
            finally:
                temp_path.unlink(missing_ok=True)

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        print(f"Static integrity: FAIL ({len(errors)} issue(s))", file=sys.stderr)
        return 1

    print(
        f"Static integrity: PASS ({len(js_files)} JS files, {inline_count} inline scripts, "
        f"{len(html_files)} HTML pages; local refs and IDs valid)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
