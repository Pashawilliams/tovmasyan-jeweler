#!/usr/bin/env python3
"""Convert .html files into clean directory URLs (/catalog/ instead of /catalog.html).

Run after tools/generate_catalog.py.
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROOT_PAGES = ['catalog', 'custom', 'care', 'about', 'contacts', 'account']
KEEP_AT_ROOT = ['index.html', '404.html']

ASSET_PREFIXES = ('assets/', 'data/', 'styles.css', 'script.js', 'auth.js',
                  'account.js', 'catalog.js', 'firebase-config.js')


def rewrite(content: str) -> str:
    # collapse relative parents to absolute root paths
    content = re.sub(r'(href|src)="(?:\.\./)+', r'\1="/', content)

    def fix(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith(('http', '//', '#', 'mailto:', 'tel:', 'data:')):
            return m.group(0)
        if url.startswith('/'):
            if url.endswith('.html'):
                url = url[1:]
            else:
                return m.group(0)
        if url.startswith(ASSET_PREFIXES):
            return f'{attr}="/{url}"'
        pm = re.fullmatch(r'products/([a-z0-9\-]+)\.html', url)
        if pm:
            return f'{attr}="/products/{pm.group(1)}/"'
        sm = re.fullmatch(r'([a-z0-9\-]+)\.html', url)
        if sm:
            name = sm.group(1)
            if name == 'index':
                return f'{attr}="/"'
            if name in ROOT_PAGES:
                return f'{attr}="/{name}/"'
            # sibling product page link
            return f'{attr}="/products/{name}/"'
        return m.group(0)

    return re.sub(r'(href|src)="([^"]+)"', fix, content)


def redirect_stub(target: str) -> str:
    return (
        '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        f'<meta http-equiv="refresh" content="0; url={target}">'
        f'<link rel="canonical" href="{target}">'
        '<title>TOVMASYAN Jeweler</title>'
        f'<script>location.replace("{target}"+location.search+location.hash);</script>'
        f'</head><body><a href="{target}">TOVMASYAN Jeweler</a></body></html>\n'
    )


def main():
    # clean previously generated directories
    for name in ROOT_PAGES:
        d = ROOT / name
        if d.is_dir():
            shutil.rmtree(d)
    pdir = ROOT / 'products'
    for d in sorted(pdir.glob('*/')):
        if d.is_dir():
            shutil.rmtree(d)

    # root pages
    for f in sorted(ROOT.glob('*.html')):
        content = rewrite(f.read_text(encoding='utf-8'))
        if f.name in KEEP_AT_ROOT:
            f.write_text(content, encoding='utf-8')
            continue
        name = f.stem
        target = ROOT / name / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
        f.write_text(redirect_stub(f'/{name}/'), encoding='utf-8')

    # product pages
    for f in sorted(pdir.glob('*.html')):
        content = rewrite(f.read_text(encoding='utf-8'))
        slug = f.stem
        target = pdir / slug / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
        f.write_text(redirect_stub(f'/products/{slug}/'), encoding='utf-8')

    # sitemap with clean urls
    base = 'https://www.tovmasyan.army'
    urls = [f'{base}/'] + [f'{base}/{n}/' for n in ROOT_PAGES]
    urls += [f'{base}/products/{f.stem}/' for f in sorted(pdir.glob('*.html'))]
    body = '\n'.join(f'  <url><loc>{u}</loc></url>' for u in urls)
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{body}\n</urlset>\n', encoding='utf-8')
    print(f'clean urls ready: {len(urls)} pages')


if __name__ == '__main__':
    main()
