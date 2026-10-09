#!/usr/bin/env python3
"""Build data/gold-history.json — daily world gold price in USD per gram of fine gold.

Source: National Bank of Poland open data (no key, long history):
  * /api/cenyzlota  — PLN per gram of 1000 fineness gold
  * /api/exchangerates/rates/a/usd — PLN per USD
The two series are joined by date, so the result is USD per gram of fine gold.
"""
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DAYS = 93  # NBP caps a single request at 93 entries


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'tovmasyan-site/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))


gold = get(f'https://api.nbp.pl/api/cenyzlota/last/{DAYS}?format=json')
usd = get(f'https://api.nbp.pl/api/exchangerates/rates/a/usd/last/{DAYS}?format=json')

fx = {r['effectiveDate']: r['mid'] for r in usd['rates']}
points = []
for entry in gold:
    day = entry['data']
    rate = fx.get(day)
    if not rate:
        continue
    points.append({'d': day, 'g': round(entry['cena'] / rate, 4)})

points.sort(key=lambda p: p['d'])
assert len(points) > 20, f'too few points: {len(points)}'

out = {
    'unit': 'usd_per_gram_fine_gold',
    'source': 'NBP open data (gold price + USD reference rate)',
    'generatedAt': points[-1]['d'],
    'points': points,
}
path = ROOT / 'data/gold-history.json'
path.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(points)} daily points -> {path.relative_to(ROOT)}')
print('first:', points[0], 'last:', points[-1])
