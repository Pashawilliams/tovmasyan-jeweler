#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересобирает каталог по реальным фотографиям изделий (tools/catalog_photos.py).

Делает:
  * webp + jpg для страницы изделия и webp-превью 560x360 для карточек;
  * data/products.json и data/products.js;
  * страницы products/<id>/index.html (+ redirect-заглушки products/<id>.html);
  * удаляет страницы и картинки товаров, которых больше нет;
  * обновляет sitemap.xml и словари переводов.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_photos import PRODUCTS, COMMON, U  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REAL = ROOT / 'assets' / 'real-photos'
THUMBS = ROOT / 'assets' / 'thumbs'
PRODUCTS_DIR = ROOT / 'products'
TEMPLATE_SRC = PRODUCTS_DIR / 'diamond-star-pendant' / 'index.html'

AVAIL = 'В наличии и под заказ'
WEIGHT = 'По расчету'
PRICE = 'Цена по запросу'


# ------------------------------------------------------------------ картинки
def build_images():
    for p in PRODUCTS:
        src = Image.open(U.format(p['src'])).convert('RGB')
        big = src.copy()
        if big.width > 1100:
            big = big.resize((1100, round(big.height * 1100 / big.width)), Image.LANCZOS)
        big.save(REAL / f"{p['id']}.webp", 'WEBP', quality=84, method=6)
        big.save(REAL / f"{p['id']}.jpg", 'JPEG', quality=82, optimize=True, progressive=True)

        # превью 560x360: вписываем по ширине и берем центр
        tw, th = 560, 360
        scale = max(tw / src.width, th / src.height)
        im = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
        left = (im.width - tw) // 2
        top = max(0, (im.height - th) // 2)
        im.crop((left, top, left + tw, top + th)).save(THUMBS / f"{p['id']}.webp", 'WEBP', quality=84, method=6)


# -------------------------------------------------------------------- данные
def build_data():
    items = []
    for p in PRODUCTS:
        items.append({
            'id': p['id'],
            'name': p['name']['ru'],
            'category': p['cat'],
            'categoryLabel': p['label'],
            'collection': p['col'],
            'material': p['mat'],
            'stones': p['st'],
            'weight': WEIGHT,
            'size': p['size'],
            'availability': AVAIL,
            'price': PRICE,
            'short': p['short']['ru'],
            'description': p['desc']['ru'],
            'tags': p['tags']['ru'],
            'style': 'pendant' if p['cat'] in ('pendants', 'chains') else p['cat'][:-1],
            'image': f"assets/real-photos/{p['id']}.webp",
            'thumbnail': f"assets/thumbs/{p['id']}.webp",
        })
    (ROOT / 'data' / 'products.json').write_text(
        json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')
    (ROOT / 'data' / 'products.js').write_text(
        'window.TOVMASYAN_PRODUCTS = ' + json.dumps(items, ensure_ascii=False, indent=2) + ';\n',
        encoding='utf-8')
    return items


# ------------------------------------------------------------ страницы товара
def related_html(item, items):
    same = [x for x in items if x['category'] == item['category'] and x['id'] != item['id']][:3]
    if len(same) < 3:
        same += [x for x in items if x['id'] != item['id'] and x not in same][:3 - len(same)]
    out = []
    for r in same:
        out.append(
            '<article class="product-card related-card">'
            f'<a class="product-card__media" href="/products/{r["id"]}/">'
            f'<img src="/assets/thumbs/{r["id"]}.webp" alt="{r["name"]}" loading="lazy" decoding="async" width="560" height="360"></a>'
            '<div class="product-card__body">'
            f'<span class="product-card__tag">{r["categoryLabel"]}</span>'
            f'<h3><a href="/products/{r["id"]}/">{r["name"]}</a></h3>'
            f'<p>{r["short"]}</p>'
            f'<div class="product-card__bottom"><span>{r["price"]}</span>'
            '<a class="order-link" href="/catalog/">Каталог</a></div></div></article>')
    return ''.join(out)


def build_pages(items):
    tpl = TEMPLATE_SRC.read_text(encoding='utf-8')
    # вырезаем изменяемые куски шаблона
    old_related = re.search(r'<div class="products-grid">.*?</div></div>\n    </section>', tpl, re.S).group(0)

    keep = {p['id'] for p in PRODUCTS}
    for d in sorted(PRODUCTS_DIR.glob('*/')):
        if d.is_dir() and d.name not in keep:
            shutil.rmtree(d)
    for f in sorted(PRODUCTS_DIR.glob('*.html')):
        if f.stem not in keep:
            f.unlink()

    for item in items:
        t = tpl
        t = t.replace('Подвеска Diamond Star — TOVMASYAN Jeweler', f'{item["name"]} — TOVMASYAN Jeweler')
        t = re.sub(r'<meta name="description" content="[^"]*">',
                   f'<meta name="description" content="{item["short"]} {item["material"]}. TOVMASYAN Jeweler, Ереван.">', t, count=1)
        t = t.replace('https://www.tovmasyan.army/products/diamond-star-pendant/',
                      f'https://www.tovmasyan.army/products/{item["id"]}/')
        t = t.replace('/assets/real-photos/diamond-star-pendant.webp', f'/assets/real-photos/{item["id"]}.webp')
        t = t.replace('alt="Подвеска Diamond Star — TOVMASYAN Jeweler"', f'alt="{item["name"]} — TOVMASYAN Jeweler"')
        t = t.replace('<p class="eyebrow">Stella</p>', f'<p class="eyebrow">{item["collection"]}</p>')
        t = t.replace('<h1>Подвеска Diamond Star</h1>', f'<h1>{item["name"]}</h1>')
        t = re.sub(r'<p class="product-detail__lead">.*?</p>',
                   f'<p class="product-detail__lead">{item["description"]}</p>', t, count=1, flags=re.S)
        t = re.sub(r'<div class="product-tags product-tags--large">.*?</div>',
                   '<div class="product-tags product-tags--large">'
                   + ''.join(f'<span>{x}</span>' for x in item['tags']) + '</div>', t, count=1, flags=re.S)
        specs = (f'<div><dt>Категория</dt><dd>{item["categoryLabel"]}</dd></div>\n'
                 f'            <div><dt>Материал</dt><dd>{item["material"]}</dd></div>\n'
                 f'            <div><dt>Камни</dt><dd>{item["stones"]}</dd></div>\n'
                 f'            <div><dt>Вес</dt><dd>{item["weight"]}</dd></div>\n'
                 f'            <div><dt>Размер</dt><dd>{item["size"]}</dd></div>\n'
                 f'            <div><dt>Наличие</dt><dd>{item["availability"]}</dd></div>\n'
                 f'            <div><dt>Стоимость</dt><dd>{item["price"]}</dd></div>')
        t = re.sub(r'<div><dt>Категория</dt>.*?<dd>Цена по запросу</dd></div>', specs, t, count=1, flags=re.S)
        t = t.replace('data-favorite-product="diamond-star-pendant"', f'data-favorite-product="{item["id"]}"')
        t = t.replace('data-save-order="diamond-star-pendant"', f'data-save-order="{item["id"]}"')
        t = t.replace('Меня интересует изделие: Подвеска Diamond Star.',
                      f'Меня интересует изделие: {item["name"]}.')
        new_related = ('<div class="products-grid">' + related_html(item, items)
                       + '</div></div>\n    </section>')
        t = t.replace(old_related, new_related)

        (PRODUCTS_DIR / item['id']).mkdir(parents=True, exist_ok=True)
        (PRODUCTS_DIR / item['id'] / 'index.html').write_text(t, encoding='utf-8')
        (PRODUCTS_DIR / f'{item["id"]}.html').write_text(
            '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            f'<meta http-equiv="refresh" content="0; url=/products/{item["id"]}/">'
            f'<link rel="canonical" href="/products/{item["id"]}/">'
            '<title>TOVMASYAN Jeweler</title>'
            f'<script>location.replace("/products/{item["id"]}/"+location.search+location.hash);</script>'
            f'</head><body><a href="/products/{item["id"]}/">TOVMASYAN Jeweler</a></body></html>\n',
            encoding='utf-8')


def clean_assets():
    keep = {p['id'] for p in PRODUCTS}
    for folder in (REAL, THUMBS):
        for f in folder.iterdir():
            if f.is_file() and f.stem not in keep:
                f.unlink()


def build_sitemap():
    base = 'https://www.tovmasyan.army'
    urls = [f'{base}/'] + [f'{base}/{n}/' for n in
                           ['catalog', 'custom', 'care', 'about', 'contacts', 'account']]
    urls += [f'{base}/products/{p["id"]}/' for p in PRODUCTS]
    body = '\n'.join(f'  <url><loc>{u}</loc></url>' for u in urls)
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{body}\n</urlset>\n', encoding='utf-8')


def build_translations():
    for lang in ('hy', 'en'):
        f = ROOT / f'tools/{lang}_translations.json'
        d = json.loads(f.read_text(encoding='utf-8'))
        for ru, tr in COMMON.items():
            d[ru] = tr[lang]
        for p in PRODUCTS:
            d[p['name']['ru']] = p['name'][lang]
            d[p['short']['ru']] = p['short'][lang]
            d[p['desc']['ru']] = p['desc'][lang]
            for a, b in zip(p['tags']['ru'], p['tags'][lang]):
                d[a] = b
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    build_images()
    items = build_data()
    build_pages(items)
    clean_assets()
    build_sitemap()
    build_translations()
    print(f'готово: {len(items)} изделий, {len(set(i["category"] for i in items))} категорий')
