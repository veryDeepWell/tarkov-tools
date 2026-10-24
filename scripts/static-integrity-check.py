#!/usr/bin/env python3
"""Static integrity checks for local links, JavaScript syntax, and HTML IDs.

Requires Node.js on PATH. Archived historical files under _archive/ are excluded.
"""
from __future__ import annotations

import re
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
        self.id_tags: dict[str, str] = {}
        self.refs: list[str] = []
        self.script_srcs: list[str] = []
        self.inline_scripts: list[tuple[str, str]] = []
        self._script_open = False
        self._script_type = ""
        self._script_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            element_id = str(values["id"])
            self.ids.append(element_id)
            self.id_tags.setdefault(element_id, tag.lower())
        for attr in ("src", "href"):
            value = values.get(attr)
            if value:
                self.refs.append(value)
        if tag.lower() == "script" and values.get("src"):
            self.script_srcs.append(str(values["src"]))
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

        # Runtime contract: every page using the shared table renderer must load it
        # before its tool script, and all selectors captured at initialization must exist.
        script_paths: list[Path] = []
        script_sources: list[tuple[str, Path, str]] = []
        for src in parser.script_srcs:
            if src.startswith(("http:", "https:", "//", "data:", "javascript:")):
                continue
            local_path = src.split("#", 1)[0].split("?", 1)[0]
            if not local_path:
                continue
            resolved = (path.parent / local_path).resolve()
            script_paths.append(resolved)
            if resolved.suffix.lower() == ".js" and resolved.is_file():
                script_sources.append((src, resolved, resolved.read_text(encoding="utf-8", errors="replace")))

        table_engine = next((i for i, candidate in enumerate(script_paths)
                             if candidate.name == "tarkov-table-tool.js"), None)
        for index, (_src, tool_path, tool_source) in enumerate(script_sources):
            if "TarkovTableTool.create" not in tool_source:
                continue
            rel_tool = str(tool_path.relative_to(ROOT)) if tool_path.is_relative_to(ROOT) else str(tool_path)
            custom_load_handler = re.search(
                r"(?:\bloadBtn\s*\.onclick|document\.getElementById\(\s*['\"]loadBtn['\"]\s*\)\s*\.onclick)",
                tool_source,
            )
            if custom_load_handler and not re.search(r"\bautoLoad\s*:\s*false", tool_source):
                errors.append(
                    f"{path.relative_to(ROOT)}: {rel_tool} has a custom loadBtn.onclick but does not disable the table engine auto-loader"
                )
            if table_engine is None:
                errors.append(
                    f"Missing shared table engine in {path.relative_to(ROOT)} (required by {rel_tool})"
                )
            else:
                tool_script_index = next((i for i, candidate in enumerate(script_paths) if candidate == tool_path), None)
                if tool_script_index is not None and table_engine >= tool_script_index:
                    errors.append(
                        f"Table engine must load before {rel_tool} in {path.relative_to(ROOT)}"
                    )
            for option in ("tbody", "thead"):
                # Check every literal selector in the tool source, not only the first
                # occurrence: a script may initialize multiple tables.
                pattern = re.compile(r"\b" + option + r"\s*:\s*['\"]([^'\"]+)['\"]")
                for match in pattern.finditer(tool_source):
                    selector = match.group(1)
                    if not selector.startswith("#"):
                        continue
                    element_id = selector[1:]
                    if element_id not in parser.id_tags:
                        errors.append(
                            f"{path.relative_to(ROOT)}: {rel_tool} captures missing {option} selector {selector}"
                        )
                    elif parser.id_tags[element_id] != option:
                        errors.append(
                            f"{path.relative_to(ROOT)}: {rel_tool} selector {selector} points to "
                            f"<{parser.id_tags[element_id]}>, expected <{option}>"
                        )

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
