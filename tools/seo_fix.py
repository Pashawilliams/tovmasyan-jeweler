#!/usr/bin/env python3
"""Add canonical + absolute Open Graph URLs to every real page. Idempotent."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://www.tovmasyan.army'

pages = sorted(list(ROOT.glob('*.html')) + list(ROOT.glob('*/index.html')) + list(ROOT.glob('products/*/index.html')))
changed = 0
for p in pages:
    t = p.read_text(encoding='utf-8')
    if 'http-equiv="refresh"' in t:
        continue
    rel = str(p.relative_to(ROOT))
    url = BASE + ('/' if rel == 'index.html' else '/' + rel[:-len('index.html')] if rel.endswith('/index.html') else '/' + rel)
    original = t
    t = re.sub(r'<meta property="og:image" content="(?!https)[^"]*"',
               f'<meta property="og:image" content="{BASE}/assets/brand-logo.webp"', t)
    if 'rel="canonical"' not in t:
        t = t.replace('<link rel="icon"', f'<link rel="canonical" href="{url}">\n  <link rel="icon"', 1)
    if 'property="og:url"' not in t:
        t = t.replace('<meta property="og:type"', f'<meta property="og:url" content="{url}">\n  <meta property="og:type"', 1)
    if t != original:
        p.write_text(t, encoding='utf-8')
        changed += 1
print('seo updated:', changed)
