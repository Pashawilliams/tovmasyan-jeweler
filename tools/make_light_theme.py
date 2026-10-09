#!/usr/bin/env python3
"""Convert the stylesheet from black marble to white marble.

Deterministic, re-runnable colour transform. The dark sheet stays in git
history, so `git checkout -- styles.css` always brings it back.

Rules, in order:
  1. :root palette is replaced wholesale with the light palette.
  2. Colours that were *light ink on dark* become *dark ink on light*.
  3. Colours that were *dark surfaces* become *white surfaces*.
  4. Gold stays gold, but darkens enough to stay readable on white.
  5. Black shadows soften (a black glow that works on black is a smudge on white).
Ink colours that sit on top of the gold gradient (buttons) are left alone.
"""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'styles.css'

LIGHT_ROOT = ''':root {
  --bg: #f6f4f0;
  --bg-2: #ffffff;
  --panel: rgba(255, 255, 255, 0.86);
  --panel-strong: #ffffff;
  --line: rgba(23, 19, 16, 0.12);
  --line-strong: rgba(166, 124, 45, 0.45);
  --gold: #a87c2d;
  --gold-2: #8a6420;
  --gold-3: #6f4d15;
  --text: #171310;
  --muted: rgba(23, 19, 16, 0.72);
  --muted-2: rgba(23, 19, 16, 0.52);
  --black: #171310;
  --radius-lg: 34px;
  --radius-md: 24px;
  --radius-sm: 16px;
  --max: 1180px;
  --shadow: 0 20px 50px rgba(23, 19, 16, 0.10);
  --gold-gradient: linear-gradient(135deg, #8a551a 0%, #ffefbd 16%, #c98d31 36%, #fff2c6 52%, #a8631d 72%, #f5bd65 100%);
  --glass-gradient: linear-gradient(135deg, rgba(23, 19, 16, 0.05), rgba(23, 19, 16, 0.015));
  color-scheme: light;
}'''

INK = (23, 19, 16)
GOLD_INK = (166, 124, 45)

# rgb triples that used to mean "light ink / highlight on a dark surface"
LIGHT_INK = {(255, 255, 255), (251, 242, 227), (245, 240, 230), (255, 247, 233), (255, 248, 234)}
# rgb triples that used to mean "gold accent"
GOLD_TINTS = {(255, 225, 165), (214, 178, 94), (244, 197, 111), (255, 216, 145), (255, 229, 166),
              (255, 203, 108), (255, 211, 137), (255, 241, 193), (186, 111, 35), (174, 97, 27)}
# rgb triples that used to mean "dark surface"
DARK_SURFACE = {(5, 4, 3), (10, 8, 6), (18, 14, 10), (24, 18, 12), (2, 2, 2), (11, 8, 6)}

# hex colours: light text that must become ink, dark surfaces that must become white
GRADIENT_TEXT_FIX = [
    ('linear-gradient(110deg, #ffffff 0%, #f7dca4 30%, #c48830 55%, #fff1c5 72%, #9d641f 100%)',
     'linear-gradient(110deg, #2e2008 0%, #8a6420 38%, #c08f38 62%, #6f4d15 100%)'),
    ('linear-gradient(110deg, #ffffff, #8a6420 46%, #8a5a18 85%)',
     'linear-gradient(110deg, #2e2008 0%, #8a6420 38%, #c08f38 62%, #6f4d15 100%)'),
]

HEX_MAP = {
    '#050403': '#f6f4f0', '#0b0806': '#ffffff', '#020202': '#ffffff',
    '#f5f0e6': '#171310', '#fff7e9': '#171310', '#fff8ea': '#171310', '#fff8e8': '#171310',
    '#f7f3ea': '#ffffff', '#f7f3ec': '#ffffff',
    '#f0dca4': '#8a6420', '#f2cd87': '#8a6420', '#d6b25e': '#a87c2d', '#a96820': '#8a5a18',
    '#1f1f1f': '#ffffff', '#303030': '#f0ece5',
    '#f0968c': '#b4402c', '#6bd47f': '#157f3c', '#efc08a': '#8a5a18',
}
# ink that sits on gold buttons — must stay dark
HEX_KEEP = {'#160d05', '#1b1108', '#1a1208', '#170e05', '#171310', '#ffffff', '#b4402c'}


def convert_rgba(match):
    r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
    alpha = match.group(4)
    a = float(alpha) if alpha is not None else 1.0
    trip = (r, g, b)

    if trip in LIGHT_INK:
        # a white highlight on black is a dark highlight on white
        new = INK
        na = a if a >= 0.5 else round(min(a * 1.1, 0.14), 3)
    elif trip in GOLD_TINTS:
        new = GOLD_INK
        na = a if a < 0.4 else round(min(a, 0.9), 3)
    elif trip in DARK_SURFACE:
        new = (255, 255, 255)
        na = a
    elif trip == (0, 0, 0):
        new = INK
        na = round(a * 0.42, 3)          # shadows must not smear the white page
    else:
        return match.group(0)

    if alpha is None:
        return f'rgb({new[0]}, {new[1]}, {new[2]})'
    return f'rgba({new[0]}, {new[1]}, {new[2]}, {na})'


DARK_BG_REPLACEMENT = '#ffffff'


def lighten_backgrounds(css):
    """Second pass: any *background* that is still near-black becomes a light
    surface. Text and borders keep their dark ink — only surfaces flip."""
    def mean_of(col):
        if col.startswith('#'):
            return sum(int(col[i:i + 2], 16) for i in (1, 3, 5)) / 3
        nums = re.findall(r'\d+', col)[:3]
        return sum(int(n) for n in nums) / 3 if len(nums) == 3 else 255

    def fix_declaration(match):
        prop, value = match.group(1), match.group(2)
        if not re.match(r'^(background|background-color|background-image)$', prop.strip()):
            return match.group(0)

        def swap(colour_match):
            col = colour_match.group(0)
            if mean_of(col) >= 60:
                return col
            if col.startswith('#'):
                return DARK_BG_REPLACEMENT
            alpha = re.findall(r'[\d.]+', col)
            if col.startswith('rgba') and len(alpha) == 4:
                return f'rgba(255, 255, 255, {alpha[3]})'
            return 'rgb(255, 255, 255)'

        value = re.sub(r'#[0-9a-fA-F]{6}|rgba?\([^)]*\)', swap, value)
        return f'{prop}:{value}'

    return re.sub(r'([a-z-]+)\s*:([^;{}]+)', fix_declaration, css)


def main():
    css = CSS.read_text(encoding='utf-8')
    if '--bg: #f6f4f0' in css:
        print('styles.css is already light; nothing to do')
        return 0

    # Split off the two regions the literal pass must never touch:
    #   - the :root palette (replaced wholesale below)
    #   - the rate board (authored light by hand)
    root_end = css.index('\n}', css.index(':root {')) + 2
    board_start = css.index('/* ======================= LIVE GOLD & SILVER RATES')
    body, board = css[root_end:board_start], css[board_start:]

    body = re.sub(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)', convert_rgba, body)
    for old, new in HEX_MAP.items():
        body = re.sub(old, new, body, flags=re.I)

    for old, new in GRADIENT_TEXT_FIX:   # foil headings must not be white-on-white
        body = body.replace(old, new)
    body = lighten_backgrounds(body)
    css = LIGHT_ROOT + body + board
    head = body
    CSS.write_text(css, encoding='utf-8')

    leftovers = sorted(set(re.findall(r'#(?:050403|0b0806|020202|f5f0e6|fff7e9)', head, flags=re.I)))
    print('light theme written')
    print('  remaining dark literals:', leftovers or 'none')
    print('  braces balanced:', css.count('{') == css.count('}'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
