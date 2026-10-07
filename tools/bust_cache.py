#!/usr/bin/env python3
"""Add content-hash versions to local css/js links so browsers never serve stale files.

Run after tools/prettify_urls.py. Idempotent.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = ['styles.css', 'script.js', 'auth.js', 'account.js', 'catalog.js', 'i18n.js',
           'firebase-config.js', 'data/products.js']


def digest(rel: str) -> str:
    f = ROOT / rel
    if not f.exists():
        return ''
    return hashlib.sha1(f.read_bytes()).hexdigest()[:8]


def main():
    versions = {rel: digest(rel) for rel in TARGETS}
    html_files = list(ROOT.glob('*.html')) + list(ROOT.glob('*/index.html')) + \
        list(ROOT.glob('products/*/index.html'))
    changed = 0
    for f in html_files:
        text = f.read_text(encoding='utf-8')
        original = text
        for rel, ver in versions.items():
            if not ver:
                continue
            pattern = re.compile(r'(["\'])/' + re.escape(rel) + r'(?:\?v=[0-9a-f]+)?\1')
            text = pattern.sub(lambda m: f'{m.group(1)}/{rel}?v={ver}{m.group(1)}', text)
        if text != original:
            f.write_text(text, encoding='utf-8')
            changed += 1
    print(f'cache-busted {changed} files; versions: {versions}')


if __name__ == '__main__':
    main()
