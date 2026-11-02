"""Keep the application data/name contract synchronous and explicit on every page."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
for page in [*sorted(ROOT.glob("*.html")), *sorted((ROOT / "tools").glob("*.html"))]:
    text = page.read_text(encoding="utf-8")
    if not re.search(r'<script\b[^>]*src=["\'][^"\']*core/', text):
        continue
    text = re.sub(r'[ \t]*<script\b[^>]*src=["\'][^"\']*/tarkov-(?:data|names|item-media)\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\r?\n?', '', text)
    prefix = "core/" if page.parent == ROOT else "../core/"
    tags = ''.join(f'<script src="{prefix}tarkov-{name}.js"></script>\n' for name in ('data', 'names', 'item-media'))
    text = re.sub(r'(?=<script\b[^>]*src=["\'][^"\']*core/)', lambda _: tags, text, count=1)
    if text != page.read_text(encoding="utf-8"):
        page.write_text(text, encoding="utf-8")
