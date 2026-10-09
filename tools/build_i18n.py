#!/usr/bin/env python3
"""Build i18n/hy.json: Russian -> Armenian dictionary for every visible string."""
import re, json, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def collect():
    pages = sorted(list(ROOT.glob('*.html')) + list(ROOT.glob('*/index.html')))
    seen, out = set(), []
    def add(s):
        s = s.strip()
        if len(s) > 1 and re.search(r'[А-Яа-яЁё]', s) and s not in seen:
            seen.add(s); out.append(s)
    for p in pages:
        t = p.read_text(encoding='utf-8')
        if 'http-equiv="refresh"' in t: continue
        body = t[t.find('<body'):]
        body = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', body, flags=re.S)
        for c in re.findall(r'>([^<>]+)<', body): add(html.unescape(c))
        for a in re.findall(r'(?:placeholder|aria-label|title|alt)="([^"]+)"', body): add(html.unescape(a))
    prod = json.loads((ROOT / 'data/products.json').read_text(encoding='utf-8'))
    for p in prod:
        for f in ['name','categoryLabel','collection','material','stones','weight','size','availability','price','short','description']:
            add(str(p.get(f, '')))
        for tg in p.get('tags', []): add(tg)
    return out

ru = collect()
EXTRA = [  # strings the scripts build at runtime, not present in the HTML source
    'Золото', 'Серебро',
    'Биржевые данные временно недоступны. Актуальную цену уточните по телефону.',
]
for e in EXTRA:
    if e not in ru: ru.append(e)

hy = json.loads((ROOT / 'tools/hy_translations.json').read_text(encoding='utf-8'))
assert isinstance(hy, dict), 'hy_translations.json must be a {russian: armenian} object'
missing = [s for s in ru if not hy.get(s)]
assert not missing, 'MISSING ARMENIAN: ' + json.dumps(missing, ensure_ascii=False, indent=1)

mapping = {r: hy[r] for r in ru if hy[r] != r}
(ROOT / 'i18n').mkdir(exist_ok=True)
(ROOT / 'i18n/hy.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=0), encoding='utf-8')
print(f'strings: {len(ru)}, translated: {len(mapping)}')
for probe in ['Каталог', 'Личный кабинет', 'Курс золота и серебра', 'Проба', 'Покупка', 'За 24 часа']:
    print(f'  {probe!r} -> {mapping.get(probe)!r}')
