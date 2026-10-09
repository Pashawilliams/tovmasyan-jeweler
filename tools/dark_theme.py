#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Переводит оформление сайта в черно-коричневую (темную) гамму.

Работает по правилам: светлые нейтральные поверхности становятся темными,
темный текст становится кремовым, золото/зелень WhatsApp/цвета графика не трогаем.
Запускается один раз над styles.css; исходник сохраняется в styles.light.css.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / 'styles.css'
BACKUP = ROOT / 'tools' / 'styles.light.css'

SURFACE_PROPS = ('background', 'background-color', 'background-image', 'border',
                 'border-color', 'border-top', 'border-right', 'border-bottom',
                 'border-left', 'border-top-color', 'border-bottom-color',
                 'border-left-color', 'border-right-color', 'outline',
                 'outline-color', 'fill', 'stroke', 'box-shadow', 'text-shadow',
                 'scrollbar-color', 'accent-color', 'caret-color')
TEXT_PROPS = ('color', '-webkit-text-fill-color')

DARK_INK = (23, 19, 16)
CREAM = (244, 236, 224)

ROOT_BLOCK = """:root {
  --bg: #0a0706;
  --bg-2: #130e0b;
  --panel: rgba(26, 19, 15, 0.86);
  --panel-strong: #16100d;
  --line: rgba(238, 224, 203, 0.14);
  --line-strong: rgba(200, 150, 62, 0.52);
  --gold: #d8a94a;
  --gold-2: #c08a2e;
  --gold-3: #8c5f1b;
  --text: #f5ece0;
  --muted: rgba(245, 236, 224, 0.74);
  --muted-2: rgba(245, 236, 224, 0.54);
  --black: #0a0706;
  --radius-lg: 34px;
  --radius-md: 24px;
  --radius-sm: 16px;
  --max: 1180px;
  --shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  --gold-gradient: linear-gradient(135deg, #8a551a 0%, #ffefbd 16%, #c98d31 36%, #fff2c6 52%, #a8631d 72%, #f5bd65 100%);
  --blue-gradient: linear-gradient(135deg, #f3e7d2 0%, #e7d6b8 45%, #dcc8a4 100%);
  --blue-line: rgba(200, 150, 62, 0.5);
  --beige-ink: #2a1d10;
  --ink-gradient: linear-gradient(135deg, #f3e7d2 0%, #e7d6b8 45%, #dcc8a4 100%);
  --wa-gradient: linear-gradient(135deg, #25d366 0%, #1ebe5b 55%, #128c7e 100%);
  --glass-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025));
  color-scheme: dark;
}"""


def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def saturation(rgb):
    mx, mn = max(rgb), min(rgb)
    return 0 if mx == 0 else (mx - mn) / mx


def luminance(rgb):
    r, g, b = rgb
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


def darken_hex(rgb):
    """Светлая нейтральная поверхность -> темно-коричневая."""
    lum = luminance(rgb)
    base = 0.026 + 0.085 * (1 - lum)          # 2.6%..11%
    r = base * 1.00
    g = base * 0.78
    b = base * 0.62
    return '#%02x%02x%02x' % tuple(min(255, round(x * 255)) for x in (r, g, b))


def conv_token(tok, prop, in_shadow):
    m = re.fullmatch(r'#[0-9a-fA-F]{3,8}', tok)
    if m:
        if len(tok) in (5, 9):
            return tok
        rgb = hex_to_rgb(tok)
        sat = saturation(rgb)
        lum = luminance(rgb)
        if prop in TEXT_PROPS:
            if lum < 0.26:
                return '#f5ece0'
            return tok
        if sat < 0.12 and lum > 0.55:
            return tok if in_shadow else darken_hex(rgb)
        return tok

    m = re.fullmatch(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)', tok)
    if not m:
        return tok
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = float(m.group(4)) if m.group(4) else 1.0
    rgb = (r, g, b)
    sat, lum = saturation(rgb), luminance(rgb)

    if prop in TEXT_PROPS:
        if lum < 0.26:
            return f'rgba({CREAM[0]}, {CREAM[1]}, {CREAM[2]}, {a:g})'
        return tok

    if in_shadow:
        # тени на темном фоне — просто делаем их черными
        if sat < 0.2 and lum < 0.4:
            return f'rgba(0, 0, 0, {min(1, a * 1.6):g})'
        if sat < 0.12 and lum > 0.55:
            return f'rgba(255, 255, 255, {min(1, a * 0.5):g})'
        return tok

    if sat < 0.12 and lum > 0.55:          # белые поверхности
        if a >= 0.2:
            return f'rgba(22, 16, 13, {a:g})'
        return tok                          # легкий блик оставляем
    if lum < 0.26 and 'border' in prop or lum < 0.26 and 'outline' in prop:
        return f'rgba(238, 224, 203, {min(1, a * 1.15):g})'
    return tok


COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)')
DECL_RE = re.compile(r'(^|[;{]|\n)(\s*)(--[-a-zA-Z0-9]+|[-a-zA-Z]+)(\s*:\s*)([^;{}]+)', re.M)


def convert(css: str) -> str:
    def repl(m):
        head, ind, prop, sep, value = m.groups()
        p = prop.lower()
        if p.startswith('--'):
            p = 'background'  # переменные почти всегда задают поверхность
        if p not in SURFACE_PROPS and p not in TEXT_PROPS:
            return m.group(0)
        in_shadow = 'shadow' in p
        new = COLOR_RE.sub(lambda t: conv_token(t.group(0), p, in_shadow), value)
        return f'{head}{ind}{prop}{sep}{new}'

    return DECL_RE.sub(repl, css)


def main():
    css = CSS.read_text(encoding='utf-8')
    if not BACKUP.exists():
        BACKUP.write_text(css, encoding='utf-8')
    start = css.index(':root {')
    end = css.index('}', start) + 1
    head, root_block, tail = css[:start], css[start:end], css[end:]
    css = head + '__ROOT__' + convert(tail)
    css = css.replace('__ROOT__', ROOT_BLOCK)
    CSS.write_text(css, encoding='utf-8')
    print('dark theme applied')


if __name__ == '__main__':
    main()
