from pathlib import Path
import json
import html
import math

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'products'
REAL_ASSETS = ROOT / 'assets' / 'real-photos'
THUMBS = ROOT / 'assets' / 'thumbs'
PRODUCTS_DIR = ROOT / 'products'
DATA_DIR = ROOT / 'data'
ASSETS.mkdir(parents=True, exist_ok=True)
REAL_ASSETS.mkdir(parents=True, exist_ok=True)
THUMBS.mkdir(parents=True, exist_ok=True)
PRODUCTS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

products = [
    {
        "id": "aurora-ring",
        "name": "Кольцо Aurora",
        "category": "rings",
        "categoryLabel": "Кольца",
        "collection": "Signature Gold",
        "material": "Золото 585 / 750",
        "stones": "Центральный камень на выбор",
        "weight": "Индивидуально",
        "size": "По размеру клиента",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Элегантное кольцо с сияющим центральным акцентом.",
        "description": "Кольцо Aurora создано для тех, кто любит чистую форму и выразительный блеск. Модель можно адаптировать под ваш размер, оттенок золота и тип камня.",
        "tags": ["под заказ", "золото", "подарок"],
        "style": "ring",
    },
    {
        "id": "diamond-halo-ring",
        "name": "Кольцо Diamond Halo",
        "category": "rings",
        "categoryLabel": "Кольца",
        "collection": "Evening Shine",
        "material": "Золото 585",
        "stones": "Фианиты / бриллианты по запросу",
        "weight": "По расчету",
        "size": "15–22",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Классический halo-дизайн с роскошным сиянием.",
        "description": "Модель с обрамлением вокруг центрального камня визуально усиливает блеск и смотрится особенно празднично. Подходит для помолвки, подарка и вечернего образа.",
        "tags": ["halo", "камни", "премиум"],
        "style": "ring",
    },
    {
        "id": "classic-band-ring",
        "name": "Кольцо Classic Band",
        "category": "rings wedding",
        "categoryLabel": "Кольца",
        "collection": "Classic Line",
        "material": "Желтое / белое / красное золото",
        "stones": "Без вставок или по желанию",
        "weight": "По размеру",
        "size": "По размеру клиента",
        "availability": "Возможно изготовление пары",
        "price": "Цена по запросу",
        "short": "Чистая золотая форма на каждый день.",
        "description": "Универсальное кольцо с мягкой посадкой и спокойным премиальным блеском. Может быть выполнено как самостоятельное изделие или как часть пары обручальных колец.",
        "tags": ["классика", "обручальное", "минимализм"],
        "style": "wedding",
    },
    {
        "id": "royal-line-ring",
        "name": "Кольцо Royal Line",
        "category": "rings",
        "categoryLabel": "Кольца",
        "collection": "Royal Detail",
        "material": "Золото 585 / 750",
        "stones": "Дорожка камней по запросу",
        "weight": "По расчету",
        "size": "По размеру клиента",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Выразительное кольцо с акцентной золотой линией.",
        "description": "Royal Line подходит для тех, кто хочет заметное украшение с характером. Дизайн можно сделать более строгим или более сияющим — в зависимости от вашего стиля.",
        "tags": ["statement", "вечернее", "золото"],
        "style": "ring",
    },
    {
        "id": "stella-earrings",
        "name": "Серьги Stella",
        "category": "earrings",
        "categoryLabel": "Серьги",
        "collection": "Stella",
        "material": "Золото 585",
        "stones": "Камни по запросу",
        "weight": "По расчету",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Сияющие серьги для вечернего и праздничного образа.",
        "description": "Stella — это серьги с мягким блеском и выразительной геометрией. Их можно выполнить в более лаконичном или более торжественном варианте.",
        "tags": ["вечерние", "золото", "женские"],
        "style": "earrings",
    },
    {
        "id": "grace-drop-earrings",
        "name": "Серьги Grace Drop",
        "category": "earrings",
        "categoryLabel": "Серьги",
        "collection": "Grace",
        "material": "Золото 585 / 750",
        "stones": "Фианиты / натуральные камни по запросу",
        "weight": "По расчету",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Подвесные серьги с мягким движением и блеском.",
        "description": "Форма Grace Drop подчеркивает линию лица и добавляет образу утонченность. Можно изменить длину, вставки и оттенок золота.",
        "tags": ["подвесные", "элегантные", "подарок"],
        "style": "earrings",
    },
    {
        "id": "minimal-gold-earrings",
        "name": "Серьги Minimal Gold",
        "category": "earrings",
        "categoryLabel": "Серьги",
        "collection": "Daily Gold",
        "material": "Золото 585",
        "stones": "Без вставок",
        "weight": "По расчету",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Минималистичные серьги для повседневного стиля.",
        "description": "Аккуратная базовая модель, которую легко сочетать с цепочками, кольцами и браслетами. Подходит для ежедневного ношения.",
        "tags": ["минимализм", "на каждый день", "золото"],
        "style": "earrings",
    },
    {
        "id": "evening-spark-earrings",
        "name": "Серьги Evening Spark",
        "category": "earrings",
        "categoryLabel": "Серьги",
        "collection": "Evening Shine",
        "material": "Золото 585 / 750",
        "stones": "Сияющие вставки по запросу",
        "weight": "По расчету",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Акцентные серьги для торжественных выходов.",
        "description": "Evening Spark созданы для заметного образа. Дизайн можно адаптировать под нужный уровень блеска и желаемый бюджет.",
        "tags": ["вечерние", "камни", "премиум"],
        "style": "earrings",
    },
    {
        "id": "monaco-bracelet",
        "name": "Браслет Monaco",
        "category": "bracelets",
        "categoryLabel": "Браслеты",
        "collection": "Monaco",
        "material": "Золото 585",
        "stones": "Без вставок или по желанию",
        "weight": "По длине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Статусный браслет с уверенной золотой линией.",
        "description": "Monaco хорошо смотрится как самостоятельный акцент. Можно подобрать толщину, плетение, замок и оттенок золота.",
        "tags": ["браслет", "мужской", "женский"],
        "style": "bracelet",
    },
    {
        "id": "tennis-glow-bracelet",
        "name": "Браслет Tennis Glow",
        "category": "bracelets",
        "categoryLabel": "Браслеты",
        "collection": "Tennis",
        "material": "Золото 585 / 750",
        "stones": "Дорожка камней по запросу",
        "weight": "По длине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Сияющий браслет с ровной линией камней.",
        "description": "Tennis Glow — классика ювелирного сияния. Визуально легкий, но очень эффектный браслет для особых случаев и повседневной роскоши.",
        "tags": ["tennis", "камни", "люкс"],
        "style": "bracelet",
    },
    {
        "id": "chain-classic-bracelet",
        "name": "Браслет Chain Classic",
        "category": "bracelets chains",
        "categoryLabel": "Браслеты",
        "collection": "Classic Chain",
        "material": "Золото 585",
        "stones": "Без вставок",
        "weight": "По длине и плетению",
        "size": "Индивидуальная длина",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Классический браслет-цепь в золотом исполнении.",
        "description": "Универсальный вариант для тех, кто ценит надежность, блеск и чистый силуэт. Можно выбрать тип плетения и толщину.",
        "tags": ["цепь", "классика", "золото"],
        "style": "bracelet",
    },
    {
        "id": "signature-bracelet",
        "name": "Браслет Signature",
        "category": "bracelets",
        "categoryLabel": "Браслеты",
        "collection": "Signature Gold",
        "material": "Золото 585 / 750",
        "stones": "По желанию клиента",
        "weight": "По расчету",
        "size": "Индивидуальная длина",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Браслет с индивидуальным характером и премиальной деталью.",
        "description": "Signature можно персонализировать: добавить гравировку, символ, вставки или необычный элемент. Хороший выбор для подарка.",
        "tags": ["персонализация", "подарок", "signature"],
        "style": "bracelet",
    },
    {
        "id": "figaro-chain",
        "name": "Цепочка Figaro",
        "category": "chains",
        "categoryLabel": "Цепочки",
        "collection": "Classic Chain",
        "material": "Золото 585",
        "stones": "Без вставок",
        "weight": "По длине и толщине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ / по наличию",
        "price": "Цена по запросу",
        "short": "Классическое плетение Figaro для уверенного образа.",
        "description": "Figaro — узнаваемое плетение с чередованием звеньев. Подходит для самостоятельного ношения и в сочетании с подвеской.",
        "tags": ["figaro", "цепочка", "классика"],
        "style": "chain",
    },
    {
        "id": "anchor-chain",
        "name": "Цепочка Anchor",
        "category": "chains",
        "categoryLabel": "Цепочки",
        "collection": "Daily Gold",
        "material": "Золото 585 / 750",
        "stones": "Без вставок",
        "weight": "По длине и толщине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ / по наличию",
        "price": "Цена по запросу",
        "short": "Аккуратная цепочка с универсальным плетением.",
        "description": "Anchor — спокойная, удобная и универсальная цепочка на каждый день. Хорошо подходит как основа для подвески.",
        "tags": ["цепочка", "универсальная", "ежедневно"],
        "style": "chain",
    },
    {
        "id": "rope-chain",
        "name": "Цепочка Rope",
        "category": "chains",
        "categoryLabel": "Цепочки",
        "collection": "Royal Detail",
        "material": "Золото 585",
        "stones": "Без вставок",
        "weight": "По длине и толщине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ / по наличию",
        "price": "Цена по запросу",
        "short": "Объемное плетение с красивой игрой света.",
        "description": "Rope выглядит богато за счет объемного рельефа и активного отражения света. Можно подобрать толщину под мужской или женский образ.",
        "tags": ["rope", "объем", "золото"],
        "style": "chain",
    },
    {
        "id": "cuban-chain",
        "name": "Цепочка Cuban",
        "category": "chains bracelets",
        "categoryLabel": "Цепочки",
        "collection": "Bold Gold",
        "material": "Золото 585 / 750",
        "stones": "Без вставок / камни по запросу",
        "weight": "По длине и толщине",
        "size": "Индивидуальная длина",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Массивная цепь для яркого и статусного образа.",
        "description": "Cuban — выбор для тех, кто любит выразительные украшения. Плетение можно адаптировать по ширине, длине и весу.",
        "tags": ["cuban", "массивная", "мужская"],
        "style": "chain",
    },
    {
        "id": "diamond-star-pendant",
        "name": "Подвеска Diamond Star",
        "category": "pendants",
        "categoryLabel": "Подвески",
        "collection": "Stella",
        "material": "Золото 585 / 750",
        "stones": "Камень по запросу",
        "weight": "По расчету",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Подвеска-звезда с ювелирным сиянием.",
        "description": "Diamond Star — символ света и уверенности. Можно изменить размер, форму лучей, камень и оттенок золота.",
        "tags": ["звезда", "подвеска", "подарок"],
        "style": "pendant",
    },
    {
        "id": "initial-pendant",
        "name": "Подвеска Initial",
        "category": "pendants custom",
        "categoryLabel": "Подвески",
        "collection": "Personal",
        "material": "Золото 585",
        "stones": "По желанию",
        "weight": "По размеру буквы",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Именная подвеска с буквой или монограммой.",
        "description": "Initial — персональное украшение, которое можно сделать с первой буквой имени, монограммой или символом. Хороший вариант для подарка.",
        "tags": ["буква", "персональная", "именная"],
        "style": "pendant",
    },
    {
        "id": "gold-cross-pendant",
        "name": "Крестик Gold Light",
        "category": "pendants",
        "categoryLabel": "Подвески",
        "collection": "Classic Line",
        "material": "Золото 585 / 750",
        "stones": "Без вставок или по желанию",
        "weight": "По размеру",
        "size": "Индивидуально",
        "availability": "Под заказ / по наличию",
        "price": "Цена по запросу",
        "short": "Золотой крестик в аккуратной премиальной форме.",
        "description": "Gold Light можно выполнить в строгом классическом стиле или добавить камни, гравировку и индивидуальные детали.",
        "tags": ["крестик", "золото", "классика"],
        "style": "pendant",
    },
    {
        "id": "heart-pendant",
        "name": "Подвеска Heart",
        "category": "pendants",
        "categoryLabel": "Подвески",
        "collection": "Gift Line",
        "material": "Золото 585",
        "stones": "Камни по запросу",
        "weight": "По размеру",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Нежная подвеска-сердце для подарка с смыслом.",
        "description": "Heart — романтичная модель, которую можно дополнить камнем, гравировкой или особым контуром по желанию клиента.",
        "tags": ["сердце", "подарок", "романтика"],
        "style": "pendant",
    },
    {
        "id": "eternity-wedding-rings",
        "name": "Обручальные Eternity",
        "category": "wedding rings",
        "categoryLabel": "Обручальные",
        "collection": "Wedding",
        "material": "Золото 585 / 750",
        "stones": "Дорожка камней по запросу",
        "weight": "По размерам пары",
        "size": "Индивидуальные размеры",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Пара колец с утонченной линией сияния.",
        "description": "Eternity — вариант для пары, которая хочет совместить классику и ювелирный блеск. Можно сделать кольца одинаковыми или с разными деталями.",
        "tags": ["свадьба", "пара", "камни"],
        "style": "wedding",
    },
    {
        "id": "classic-pair-wedding-rings",
        "name": "Обручальные Classic Pair",
        "category": "wedding rings",
        "categoryLabel": "Обручальные",
        "collection": "Wedding",
        "material": "Желтое / белое / красное золото",
        "stones": "Без вставок или по желанию",
        "weight": "По размерам пары",
        "size": "Индивидуальные размеры",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Лаконичная пара обручальных колец на долгие годы.",
        "description": "Classic Pair — спокойная, вечная форма, которую можно сделать матовой, глянцевой, комбинированной или с гравировкой.",
        "tags": ["свадьба", "классика", "пара"],
        "style": "wedding",
    },
    {
        "id": "roman-wedding-rings",
        "name": "Обручальные Roman",
        "category": "wedding rings",
        "categoryLabel": "Обручальные",
        "collection": "Wedding",
        "material": "Золото 585 / 750",
        "stones": "По желанию",
        "weight": "По размерам пары",
        "size": "Индивидуальные размеры",
        "availability": "Под заказ",
        "price": "Цена по запросу",
        "short": "Кольца с выразительным рельефом или гравировкой.",
        "description": "Roman можно выполнить с римскими цифрами, датой, персональной гравировкой или фактурой. Модель выглядит современно и символично.",
        "tags": ["гравировка", "свадьба", "индивидуально"],
        "style": "wedding",
    },
    {
        "id": "bespoke-sketch",
        "name": "Индивидуальный эскиз",
        "category": "custom",
        "categoryLabel": "Под заказ",
        "collection": "Bespoke",
        "material": "Золото 585 / 750",
        "stones": "По желанию клиента",
        "weight": "После расчета",
        "size": "Индивидуально",
        "availability": "Под заказ",
        "price": "Расчет после консультации",
        "short": "Изделие по вашей фотографии, идее или эскизу.",
        "description": "Если у вас есть фотография, пример или собственная идея, TOVMASYAN Jeweler поможет превратить ее в украшение. После консультации подбирается материал, размер, детали и стоимость.",
        "tags": ["индивидуально", "эскиз", "на заказ"],
        "style": "custom",
    },
]

# Assign optimized images. Prefer lightweight WebP for speed; keep JPEG/SVG fallback files in the project.
for p in products:
    full_webp = REAL_ASSETS / f"{p['id']}.webp"
    real_photo = REAL_ASSETS / f"{p['id']}.jpg"
    thumb_webp = THUMBS / f"{p['id']}.webp"
    if full_webp.exists():
        p["image"] = f"assets/real-photos/{p['id']}.webp"
    elif real_photo.exists():
        p["image"] = f"assets/real-photos/{p['id']}.jpg"
    else:
        p["image"] = f"assets/products/{p['id']}.svg"
    p["thumbnail"] = f"assets/thumbs/{p['id']}.webp" if thumb_webp.exists() else p["image"]


def marble_lines(seed):
    lines = []
    for i in range(5):
        y = 95 + ((seed * 37 + i * 83) % 430)
        x1 = -40
        x2 = 840
        c1x = 160 + ((seed * 19 + i * 29) % 110)
        c1y = y - 80 + ((seed * 17 + i * 31) % 160)
        c2x = 470 + ((seed * 23 + i * 47) % 150)
        c2y = y + 80 - ((seed * 13 + i * 41) % 150)
        width = 1.0 + ((seed + i) % 3) * .7
        opacity = .18 + ((seed + i * 2) % 5) * .06
        lines.append(f'<path d="M{x1} {y} C {c1x} {c1y}, {c2x} {c2y}, {x2} {y + ((i%2)*70 - 35)}" fill="none" stroke="#d69a45" stroke-width="{width:.1f}" opacity="{opacity:.2f}"/>')
        lines.append(f'<path d="M{x1} {y+14} C {c1x+12} {c1y+15}, {c2x-20} {c2y-8}, {x2} {y + ((i%2)*70 - 21)}" fill="none" stroke="#ffe0a3" stroke-width=".8" opacity="{opacity+.12:.2f}"/>')
    return "\n      ".join(lines)


def sparkles(seed):
    out = []
    for i in range(7):
        x = 90 + ((seed * 61 + i * 97) % 620)
        y = 70 + ((seed * 43 + i * 71) % 460)
        r = 4 + ((seed+i) % 4)
        out.append(f'<circle cx="{x}" cy="{y}" r="{r/2:.1f}" fill="#ffe4a8" opacity=".75" filter="url(#glow)"/>')
    return "\n      ".join(out)


def shape_svg(style, seed):
    # All shapes fit into 800x620 artwork.
    if style == 'ring':
        return f'''
      <g filter="url(#glow)" transform="translate(0 {seed%8})">
        <ellipse cx="400" cy="386" rx="154" ry="118" fill="none" stroke="url(#gold)" stroke-width="34"/>
        <ellipse cx="400" cy="386" rx="94" ry="66" fill="none" stroke="#fff0bd" stroke-width="3" opacity=".72"/>
        <path d="M302 230 L350 178 H450 L498 230 L400 338 Z" fill="#0d0906" stroke="url(#gold)" stroke-width="9" stroke-linejoin="round"/>
        <path d="M350 178 L376 230 L400 178 L424 230 L450 178 M302 230 H498 M376 230 L400 338 M424 230 L400 338" fill="none" stroke="#fff0bd" stroke-width="4" opacity=".9"/>
        <path d="M530 150 L540 179 L570 189 L540 199 L530 230 L520 199 L490 189 L520 179 Z" fill="url(#gold)"/>
      </g>'''
    if style == 'earrings':
        return f'''
      <g filter="url(#glow)" fill="none" stroke="url(#gold)" stroke-linecap="round" stroke-linejoin="round">
        <path d="M292 132 C250 164 244 222 270 260" stroke-width="15"/>
        <path d="M508 132 C550 164 556 222 530 260" stroke-width="15"/>
        <ellipse cx="292" cy="358" rx="70" ry="120" stroke-width="20"/>
        <ellipse cx="508" cy="358" rx="70" ry="120" stroke-width="20"/>
        <path d="M292 224 L292 258 M508 224 L508 258" stroke-width="11"/>
      </g>
      <g fill="url(#gold)" filter="url(#glow)"><path d="M292 263 L316 309 L292 356 L268 309 Z"/><path d="M508 263 L532 309 L508 356 L484 309 Z"/></g>'''
    if style == 'bracelet':
        beads = []
        for i in range(10):
            ang = math.radians(205 + i*22)
            x = 400 + 210*math.cos(ang)
            y = 340 + 138*math.sin(ang)
            beads.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="url(#gold)"/>')
        return f'''
      <g filter="url(#glow)">
        <ellipse cx="400" cy="350" rx="252" ry="168" transform="rotate(-10 400 350)" fill="none" stroke="url(#gold)" stroke-width="24"/>
        <ellipse cx="400" cy="350" rx="182" ry="104" transform="rotate(-10 400 350)" fill="none" stroke="#fff0bd" stroke-width="4" opacity=".55"/>
        {''.join(beads)}
        <path d="M260 128 L269 156 L300 166 L269 176 L260 208 L251 176 L220 166 L251 156 Z" fill="url(#gold)"/>
      </g>'''
    if style == 'chain':
        links = []
        for i in range(9):
            x = 220 + i*45
            y = 238 + int(24*math.sin(i/1.5))
            rot = -28 + i*8
            links.append(f'<ellipse cx="{x}" cy="{y}" rx="32" ry="19" transform="rotate({rot} {x} {y})" fill="none" stroke="url(#gold)" stroke-width="9"/>')
        return f'''
      <g filter="url(#glow)" fill="none" stroke="url(#gold)" stroke-linecap="round">
        <path d="M150 285 C250 160 442 138 574 230 C670 297 676 426 584 498" stroke-width="18"/>
        <path d="M200 320 C284 218 434 204 532 270 C600 316 604 400 546 452" stroke="#fff0bd" stroke-width="5" opacity=".62"/>
        {''.join(links)}
      </g>'''
    if style == 'pendant':
        return f'''
      <g filter="url(#glow)" fill="none" stroke="url(#gold)" stroke-linejoin="round" stroke-linecap="round">
        <path d="M400 78 C400 142 400 184 400 220" stroke-width="8"/>
        <circle cx="400" cy="225" r="41" stroke-width="14"/>
        <path d="M400 280 L520 384 L400 528 L280 384 Z" stroke-width="16" fill="#0b0806"/>
        <path d="M400 280 L400 528 M280 384 H520 M338 334 L400 528 M462 334 L400 528" stroke="#fff0bd" stroke-width="4" opacity=".82"/>
      </g>'''
    if style == 'wedding':
        return f'''
      <g filter="url(#glow)" fill="none" stroke="url(#gold)" stroke-linecap="round">
        <ellipse cx="342" cy="350" rx="148" ry="116" stroke-width="28" transform="rotate(-13 342 350)"/>
        <ellipse cx="470" cy="344" rx="148" ry="116" stroke-width="28" transform="rotate(15 470 344)" opacity=".94"/>
        <ellipse cx="342" cy="350" rx="90" ry="66" stroke="#fff0bd" stroke-width="4" opacity=".62" transform="rotate(-13 342 350)"/>
        <ellipse cx="470" cy="344" rx="90" ry="66" stroke="#fff0bd" stroke-width="4" opacity=".62" transform="rotate(15 470 344)"/>
      </g>
      <path d="M400 126 L413 165 L452 178 L413 191 L400 232 L387 191 L348 178 L387 165 Z" fill="url(#gold)" filter="url(#glow)"/>'''
    # custom
    return f'''
      <g filter="url(#glow)">
        <rect x="178" y="178" width="444" height="286" rx="28" fill="#0b0806" stroke="url(#gold)" stroke-width="10"/>
        <path d="M236 244 H474 M236 306 H565 M236 368 H420" stroke="url(#gold)" stroke-width="8" stroke-linecap="round" opacity=".78"/>
        <path d="M526 142 L636 252 L456 432 L368 454 L392 366 Z" fill="#100b07" stroke="url(#gold)" stroke-width="10" stroke-linejoin="round"/>
        <path d="M392 366 L456 432 M526 142 L454 222 L564 332 L636 252" fill="none" stroke="#fff0bd" stroke-width="4" opacity=".82"/>
        <path d="M272 110 L282 141 L314 151 L282 161 L272 195 L262 161 L230 151 L262 141 Z" fill="url(#gold)"/>
      </g>'''


def make_product_svg(p, idx):
    name = html.escape(p['name'])
    category = html.escape(p['categoryLabel'])
    lines = marble_lines(idx + 1)
    stars = sparkles(idx + 7)
    shape = shape_svg(p['style'], idx)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620" role="img" aria-labelledby="title desc">
  <title id="title">{name}</title>
  <desc id="desc">Premium black and gold jewelry artwork for {name}.</desc>
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#2b1a08"/>
      <stop offset="56%" stop-color="#090706"/>
      <stop offset="100%" stop-color="#020202"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#74410f"/><stop offset=".18" stop-color="#fff0bb"/><stop offset=".42" stop-color="#c98a31"/><stop offset=".66" stop-color="#fff1c2"/><stop offset="1" stop-color="#925617"/>
    </linearGradient>
    <filter id="glow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="5" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 1  0 .7 0 0 .52  0 0 .25 0 .12  0 0 0 .75 0"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="800" height="620" rx="44" fill="url(#bg)"/>
  <g opacity=".82">
      {lines}
  </g>
  <ellipse cx="400" cy="346" rx="300" ry="226" fill="none" stroke="#d69a45" stroke-width="2" opacity=".18"/>
  <ellipse cx="400" cy="346" rx="228" ry="172" fill="none" stroke="#ffe0a3" stroke-width="1" opacity=".18"/>
  {shape}
  <g>{stars}</g>
  <g opacity=".92">
    <text x="46" y="548" fill="#ffe4a8" font-family="Georgia, serif" font-size="24" letter-spacing="3">TOVMASYAN</text>
    <text x="46" y="580" fill="#c98a31" font-family="Arial, sans-serif" font-size="13" letter-spacing="5">{category.upper()}</text>
  </g>
</svg>'''

for idx, p in enumerate(products):
    (ASSETS / f"{p['id']}.svg").write_text(make_product_svg(p, idx), encoding='utf-8')

# data JS
(DATA_DIR / 'products.js').write_text('window.TOVMASYAN_PRODUCTS = ' + json.dumps(products, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
(DATA_DIR / 'products.json').write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding='utf-8')


def root_header(active=''):
    def act(name): return ' aria-current="page"' if active == name else ''
    return f'''<header class="site-header" data-header>
    <a class="brand" href="index.html" aria-label="TOVMASYAN Jeweler — главная">
      <img class="brand__logo" src="assets/brand-logo.webp" alt="TOVMASYAN Jeweler logo">
      <span class="brand__text"><span>TOVMASYAN</span><small>Jeweler</small></span>
    </a>
    <nav class="main-nav" data-nav aria-label="Главное меню">
      <a href="catalog.html"{act('catalog')}>Каталог</a>
      <a href="custom.html"{act('custom')}>На заказ</a>
      <a href="care.html"{act('care')}>Уход</a>
      <a href="about.html"{act('about')}>О бренде</a>
      <a href="contacts.html"{act('contacts')}>Контакты</a>
    </nav>
    <div class="header-actions">
      <a class="icon-link" href="https://www.instagram.com/tovmasyan_jeweler/" target="_blank" rel="noopener">Instagram</a>
      <a class="btn btn--small btn--gold" href="#" data-whatsapp="Здравствуйте! Хочу получить консультацию TOVMASYAN Jeweler.">WhatsApp</a>
      <button class="menu-toggle" type="button" data-menu-toggle aria-label="Открыть меню" aria-expanded="false"><span></span><span></span></button>
    </div>
  </header>'''


def product_header():
    return '''<header class="site-header" data-header>
    <a class="brand" href="../index.html" aria-label="TOVMASYAN Jeweler — главная">
      <img class="brand__logo" src="../assets/brand-logo.webp" alt="TOVMASYAN Jeweler logo">
      <span class="brand__text"><span>TOVMASYAN</span><small>Jeweler</small></span>
    </a>
    <nav class="main-nav" data-nav aria-label="Главное меню">
      <a href="../catalog.html" aria-current="page">Каталог</a>
      <a href="../custom.html">На заказ</a>
      <a href="../care.html">Уход</a>
      <a href="../about.html">О бренде</a>
      <a href="../contacts.html">Контакты</a>
    </nav>
    <div class="header-actions">
      <a class="icon-link" href="https://www.instagram.com/tovmasyan_jeweler/" target="_blank" rel="noopener">Instagram</a>
      <a class="btn btn--small btn--gold" href="#" data-whatsapp="Здравствуйте! Хочу получить консультацию TOVMASYAN Jeweler.">WhatsApp</a>
      <button class="menu-toggle" type="button" data-menu-toggle aria-label="Открыть меню" aria-expanded="false"><span></span><span></span></button>
    </div>
  </header>'''


def root_footer():
    return '''<footer class="site-footer">
    <div class="container footer-grid">
      <a class="footer-brand" href="index.html"><img src="assets/brand-logo.webp" alt="TOVMASYAN Jeweler logo"><span>TOVMASYAN Jeweler</span></a>
      <p>Продажа и изготовление изделий из золота. Украшения под заказ в Ереване.</p>
      <div class="footer-links"><a href="tel:+37477105163">+374 77 105 163</a><a href="https://www.instagram.com/tovmasyan_jeweler/" target="_blank" rel="noopener">Instagram</a><a href="contacts.html">Контакты</a></div>
    </div>
    <div class="container footer-bottom"><span>© <span data-year></span> TOVMASYAN Jeweler</span><span>Ереван, Армения</span></div>
  </footer>
  <a class="floating-whatsapp" href="#" data-whatsapp="Здравствуйте! Хочу задать вопрос TOVMASYAN Jeweler." aria-label="Написать в WhatsApp"><span>WhatsApp</span></a>'''


def product_footer():
    return '''<footer class="site-footer">
    <div class="container footer-grid">
      <a class="footer-brand" href="../index.html"><img src="../assets/brand-logo.webp" alt="TOVMASYAN Jeweler logo"><span>TOVMASYAN Jeweler</span></a>
      <p>Продажа и изготовление изделий из золота. Украшения под заказ в Ереване.</p>
      <div class="footer-links"><a href="tel:+37477105163">+374 77 105 163</a><a href="https://www.instagram.com/tovmasyan_jeweler/" target="_blank" rel="noopener">Instagram</a><a href="../contacts.html">Контакты</a></div>
    </div>
    <div class="container footer-bottom"><span>© <span data-year></span> TOVMASYAN Jeweler</span><span>Ереван, Армения</span></div>
  </footer>
  <a class="floating-whatsapp" href="#" data-whatsapp="Здравствуйте! Хочу задать вопрос TOVMASYAN Jeweler." aria-label="Написать в WhatsApp"><span>WhatsApp</span></a>'''

catalog_html = f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Каталог изделий — TOVMASYAN Jeweler</title>
  <meta name="description" content="Каталог TOVMASYAN Jeweler: кольца, серьги, браслеты, цепочки, подвески, обручальные кольца и украшения под заказ в Ереване.">
  <meta name="theme-color" content="#050505">
  <link rel="icon" href="assets/favicon.png" type="image/svg+xml">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="page-glow" aria-hidden="true"></div><div class="cursor-glow" aria-hidden="true"></div>
  {root_header('catalog')}
  <main>
    <section class="page-hero catalog-hero">
      <div class="container page-hero__grid">
        <div class="reveal">
          <p class="eyebrow">Catalog</p>
          <h1>Каталог ювелирных изделий</h1>
          <p>Кольца, серьги, браслеты, цепочки, подвески и обручальные пары из золота. Поиск, фильтры и быстрый заказ через WhatsApp.</p>
          <div class="hero__actions"><a class="btn btn--gold" href="#catalog-grid">Смотреть изделия</a><a class="btn btn--glass" href="custom.html">Индивидуальный заказ</a></div>
        </div>
        <div class="page-hero__stat reveal reveal--delay-sm">
          <strong>{len(products)}</strong><span>изделия в каталоге</span>
          <strong>7</strong><span>категорий украшений</span>
        </div>
      </div>
    </section>
    <section class="section catalog-section" id="catalog-grid">
      <div class="container">
        <div class="catalog-toolbar reveal">
          <label class="search-field">Поиск изделия<input type="search" data-catalog-search placeholder="Например: кольцо, браслет, wedding"></label>
          <label class="select-field">Категория<select data-catalog-category><option value="all">Все категории</option><option value="rings">Кольца</option><option value="earrings">Серьги</option><option value="bracelets">Браслеты</option><option value="chains">Цепочки</option><option value="pendants">Подвески</option><option value="wedding">Обручальные</option><option value="custom">Под заказ</option></select></label>
          <label class="select-field">Сортировка<select data-catalog-sort><option value="default">По умолчанию</option><option value="name">По названию</option><option value="category">По категории</option></select></label>
        </div>
        <div class="catalog-summary reveal"><span data-catalog-count>{len(products)}</span> изделий найдено <button type="button" class="text-button" data-clear-filters>Сбросить фильтры</button></div>
        <div class="products-grid products-grid--large" data-catalog-products></div>
      </div>
    </section>
    <section class="section quote-section">
      <div class="container atelier-card reveal">
        <div class="atelier-card__content"><p class="eyebrow">How to order</p><h2>Выберите изделие — мы уточним детали и стоимость</h2><p>Стоимость золотого изделия зависит от веса, пробы, камней и сложности работы. Напишите нам — рассчитаем цену точно по вашему запросу.</p><a class="btn btn--gold" href="#" data-whatsapp="Здравствуйте! Хочу подобрать украшение из каталога TOVMASYAN Jeweler.">Получить консультацию</a></div>
        <div class="process-list"><div class="process-item"><span>01</span><div><h3>Выбор</h3><p>Клиент выбирает изделие или похожий стиль.</p></div></div><div class="process-item"><span>02</span><div><h3>Уточнение</h3><p>Обсуждаются размер, материал, камни и бюджет.</p></div></div><div class="process-item"><span>03</span><div><h3>Расчет</h3><p>Формируется стоимость и сроки изготовления.</p></div></div><div class="process-item"><span>04</span><div><h3>Заказ</h3><p>Украшение изготавливается или подбирается по наличию.</p></div></div></div>
      </div>
    </section>
  </main>
  {root_footer()}
  <script src="data/products.js"></script>
  <script src="script.js"></script>
  <script src="catalog.js"></script>
</body>
</html>
'''
(ROOT / 'catalog.html').write_text(catalog_html, encoding='utf-8')

catalog_js = r'''(() => {
  const products = window.TOVMASYAN_PRODUCTS || [];
  const grid = document.querySelector('[data-catalog-products]');
  if (!grid) return;

  const searchInput = document.querySelector('[data-catalog-search]');
  const categorySelect = document.querySelector('[data-catalog-category]');
  const sortSelect = document.querySelector('[data-catalog-sort]');
  const count = document.querySelector('[data-catalog-count]');
  const clear = document.querySelector('[data-clear-filters]');

  const normalize = (value) => String(value || '').toLowerCase().trim();
  const matchesCategory = (product, category) => category === 'all' || product.category.split(' ').includes(category);
  const matchesSearch = (product, query) => {
    if (!query) return true;
    return [product.name, product.categoryLabel, product.collection, product.material, product.stones, product.short, ...(product.tags || [])]
      .some((field) => normalize(field).includes(query));
  };

  const productCard = (product, index) => {
    const tags = (product.tags || []).slice(0, 3).map((tag) => `<span>${tag}</span>`).join('');
    const image = toAbs(product.thumbnail || product.image);
    const message = `Здравствуйте! Меня интересует изделие: ${product.name}. Подскажите, пожалуйста, детали, наличие и цену.`;
    return `
      <article class="product-card reveal is-visible" data-category="${product.category}">
        <a class="product-card__media" href="/products/${product.id}/" aria-label="Открыть ${product.name}">
          <img src="${image}" alt="${product.name} — TOVMASYAN Jeweler" loading="lazy" decoding="async" width="560" height="360">
        </a>
        <div class="product-card__body">
          <span class="product-card__tag">${product.categoryLabel} · ${product.collection}</span>
          <h3><a href="/products/${product.id}/">${product.name}</a></h3>
          <p>${product.short}</p>
          <div class="product-tags">${tags}</div>
          <dl class="mini-specs"><div><dt>Материал</dt><dd>${product.material}</dd></div><div><dt>Наличие</dt><dd>${product.availability}</dd></div></dl>
          <div class="product-card__bottom"><span>${product.price}</span><a href="${whatsappUrl(message)}" target="_blank" rel="noopener" class="order-link">Заказать</a></div>
        </div>
      </article>`;
  };

  function render() {
    const query = normalize(searchInput?.value);
    const category = categorySelect?.value || 'all';
    const sort = sortSelect?.value || 'default';
    let list = products.filter((product) => matchesCategory(product, category) && matchesSearch(product, query));
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sort === 'category') list = [...list].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, 'ru'));
    grid.innerHTML = list.map(productCard).join('') || `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос или сбросить фильтры.</p></div>`;
    if (count) count.textContent = list.length;
  }

  [searchInput, categorySelect, sortSelect].forEach((el) => el && el.addEventListener('input', render));
  clear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = 'all';
    if (sortSelect) sortSelect.value = 'default';
    render();
  });

  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get('category');
  if (categoryParam && categorySelect) categorySelect.value = categoryParam;
  render();
})();
'''
(ROOT / 'catalog.js').write_text(catalog_js, encoding='utf-8')

# product detail pages
related_by_category = {}
for p in products:
    for cat in p['category'].split():
        related_by_category.setdefault(cat, []).append(p)

for p in products:
    img_path = '../' + p['image']
    message = f"Здравствуйте! Меня интересует изделие: {p['name']}. Подскажите, пожалуйста, детали, наличие и цену."
    cats = p['category'].split()
    rel = []
    for cat in cats:
        for q in related_by_category.get(cat, []):
            if q['id'] != p['id'] and q not in rel:
                rel.append(q)
            if len(rel) >= 3: break
        if len(rel) >= 3: break
    rel_cards = ''.join([f'''<article class="product-card related-card"><a class="product-card__media" href="{q['id']}.html"><img src="../{q.get('thumbnail', q['image'])}" alt="{html.escape(q['name'])}" loading="lazy" decoding="async" width="560" height="360"></a><div class="product-card__body"><span class="product-card__tag">{html.escape(q['categoryLabel'])}</span><h3><a href="{q['id']}.html">{html.escape(q['name'])}</a></h3><p>{html.escape(q['short'])}</p><div class="product-card__bottom"><span>{html.escape(q['price'])}</span><a class="order-link" href="../catalog.html">Каталог</a></div></div></article>''' for q in rel])
    tags = ''.join(f'<span>{html.escape(t)}</span>' for t in p['tags'])
    product_html = f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(p['name'])} — TOVMASYAN Jeweler</title>
  <meta name="description" content="{html.escape(p['short'])} {html.escape(p['material'])}. Заказать консультацию TOVMASYAN Jeweler в Ереване.">
  <meta name="theme-color" content="#050505">
  <link rel="icon" href="../assets/favicon.png" type="image/svg+xml">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="page-glow" aria-hidden="true"></div><div class="cursor-glow" aria-hidden="true"></div>
  {product_header()}
  <main>
    <section class="product-detail section">
      <div class="container product-detail__grid">
        <div class="product-detail__media reveal"><img src="{img_path}" alt="{html.escape(p['name'])} — TOVMASYAN Jeweler" decoding="async" fetchpriority="high"></div>
        <div class="product-detail__content reveal reveal--delay-sm">
          <p class="eyebrow">{html.escape(p['collection'])}</p>
          <h1>{html.escape(p['name'])}</h1>
          <p class="product-detail__lead">{html.escape(p['description'])}</p>
          <div class="product-tags product-tags--large">{tags}</div>
          <dl class="spec-table">
            <div><dt>Категория</dt><dd>{html.escape(p['categoryLabel'])}</dd></div>
            <div><dt>Материал</dt><dd>{html.escape(p['material'])}</dd></div>
            <div><dt>Камни</dt><dd>{html.escape(p['stones'])}</dd></div>
            <div><dt>Вес</dt><dd>{html.escape(p['weight'])}</dd></div>
            <div><dt>Размер</dt><dd>{html.escape(p['size'])}</dd></div>
            <div><dt>Наличие</dt><dd>{html.escape(p['availability'])}</dd></div>
            <div><dt>Стоимость</dt><dd>{html.escape(p['price'])}</dd></div>
          </dl>
          <div class="hero__actions"><a class="btn btn--gold" href="#" data-whatsapp="{html.escape(message)}">Заказать в WhatsApp</a><a class="btn btn--glass" href="../catalog.html">Вернуться в каталог</a></div>
        </div>
      </div>
    </section>
    <section class="section related-section">
      <div class="container"><div class="section-head section-head--center reveal"><p class="eyebrow">Similar</p><h2>Похожие изделия</h2><p>Посмотрите другие украшения этой категории или напишите нам для индивидуального подбора.</p></div><div class="products-grid">{rel_cards}</div></div>
    </section>
  </main>
  {product_footer()}
  <script src="../script.js"></script>
</body>
</html>
'''
    (PRODUCTS_DIR / f"{p['id']}.html").write_text(product_html, encoding='utf-8')

# extra static pages
def page(title, active, eyebrow, h1, lead, body_html):
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} — TOVMASYAN Jeweler</title><meta name="description" content="{lead}"><meta name="theme-color" content="#050505"><link rel="icon" href="assets/favicon.png" type="image/svg+xml"><link rel="stylesheet" href="styles.css"></head><body><div class="page-glow" aria-hidden="true"></div><div class="cursor-glow" aria-hidden="true"></div>{root_header(active)}<main><section class="page-hero"><div class="container page-hero__grid"><div class="reveal"><p class="eyebrow">{eyebrow}</p><h1>{h1}</h1><p>{lead}</p></div><div class="page-hero__logo reveal reveal--delay-sm"><img src="assets/brand-logo.webp" alt="TOVMASYAN Jeweler"></div></div></section>{body_html}</main>{root_footer()}<script src="script.js"></script></body></html>'''

custom_body = '''<section class="section"><div class="container atelier-card reveal"><div class="atelier-card__content"><p class="eyebrow">Bespoke</p><h2>Индивидуальное украшение по вашей идее</h2><p>Отправьте фотографию, эскиз или просто описание. Мы поможем подобрать материал, форму, размер и рассчитать стоимость.</p><a class="btn btn--gold" href="#" data-whatsapp="Здравствуйте! Хочу заказать индивидуальное украшение в TOVMASYAN Jeweler.">Начать консультацию</a></div><div class="process-list"><div class="process-item"><span>01</span><div><h3>Идея</h3><p>Фото, пример, эскиз или описание будущего украшения.</p></div></div><div class="process-item"><span>02</span><div><h3>Материал</h3><p>Выбор пробы, оттенка золота, камней и размера.</p></div></div><div class="process-item"><span>03</span><div><h3>Расчет</h3><p>Согласование стоимости, сроков и деталей изготовления.</p></div></div><div class="process-item"><span>04</span><div><h3>Результат</h3><p>Готовое изделие, созданное под вашу историю.</p></div></div></div></div></section><section class="section"><div class="container split-info"><div class="info-panel reveal"><h2>Что можно заказать</h2><ul><li>Кольца, серьги, браслеты, цепочки и подвески</li><li>Обручальные кольца и парные изделия</li><li>Именные подвески, буквы, символы, крестики</li><li>Украшения по фото или индивидуальному эскизу</li><li>Гравировку и персональные детали</li></ul></div><form class="order-form reveal reveal--delay-sm" data-order-form><h3>Заявка на изделие</h3><p>Сообщение откроется в WhatsApp.</p><label>Ваше имя<input name="name" placeholder="Ваше имя"></label><label>Что вас интересует?<select name="interest"><option>Индивидуальный заказ</option><option>Кольцо</option><option>Серьги</option><option>Браслет</option><option>Подвеска</option><option>Обручальные кольца</option></select></label><label>Комментарий<textarea name="message" placeholder="Опишите идею, размер, материал, пожелания"></textarea></label><button class="btn btn--gold" type="submit">Отправить в WhatsApp</button></form></div></section>'''
(ROOT / 'custom.html').write_text(page('Индивидуальный заказ', 'custom', 'Custom Order', 'Украшения под заказ', 'Создаем золотые изделия по фотографии, эскизу или вашей идее. Индивидуальная консультация TOVMASYAN Jeweler в Ереване.', custom_body), encoding='utf-8')

care_body = '''<section class="section"><div class="container care-grid"><article class="trust-card reveal"><span>01</span><h3>Хранение</h3><p>Храните украшения отдельно, чтобы золото и камни не царапались друг о друга. Лучше использовать мягкий футляр или отдельные мешочки.</p></article><article class="trust-card reveal reveal--delay-sm"><span>02</span><h3>Ношение</h3><p>Снимайте украшения перед спортом, бассейном, уборкой и контактом с агрессивной химией.</p></article><article class="trust-card reveal reveal--delay-md"><span>03</span><h3>Чистка</h3><p>Протирайте изделие мягкой тканью. Для сложных украшений и камней лучше обращаться к ювелиру.</p></article></div></section><section class="section"><div class="container faq-grid"><div class="faq-intro reveal"><p class="eyebrow">Guide</p><h2>Размеры и подбор</h2><p>Для точного размера кольца лучше провести примерку или уточнить размер по существующему кольцу.</p></div><div class="faq-list reveal reveal--delay-sm"><details open><summary>Как узнать размер кольца?</summary><p>Самый надежный способ — примерка у ювелира. Можно также измерить внутренний диаметр кольца, которое уже хорошо сидит.</p></details><details><summary>Как выбрать цепочку?</summary><p>Важны длина, толщина, плетение и то, будет ли цепочка носиться отдельно или с подвеской.</p></details><details><summary>Можно ли изменить оттенок золота?</summary><p>Да, для многих изделий можно обсудить желтое, белое или красное золото.</p></details></div></div></section>'''
(ROOT / 'care.html').write_text(page('Уход за украшениями', 'care', 'Care Guide', 'Уход, размеры и рекомендации', 'Полезные рекомендации по уходу за золотыми украшениями, подбору размера и сохранению блеска изделий.', care_body), encoding='utf-8')

about_body = '''<section class="section about-section"><div class="container about-grid"><div class="about-visual reveal"><div class="about-visual__frame"><img src="assets/brand-logo.webp" alt="TOVMASYAN Jeweler"></div><div class="about-note"><strong>Mir Zolota Gold Market</strong><span>24 Movses Khorenatsi Street, Kentron, Yerevan</span></div></div><div class="about-content reveal reveal--delay-sm"><p class="eyebrow">About</p><h2>Ювелирный бренд с премиальной эстетикой</h2><p>TOVMASYAN Jeweler — продажа изделий из золота и индивидуальное изготовление украшений. Мы соединяем классическое ювелирное мастерство с современной эстетикой.</p><div class="values-grid"><div><span>01</span><h3>Золото</h3><p>Изделия из золота и персональный подбор.</p></div><div><span>02</span><h3>На заказ</h3><p>Украшения по фото, эскизу или идее.</p></div><div><span>03</span><h3>Ереван</h3><p>Удобная точка контакта в центре города.</p></div><div><span>04</span><h3>Детали</h3><p>Внимание к форме, посадке и символике.</p></div></div></div></div></section>'''
(ROOT / 'about.html').write_text(page('О бренде', 'about', 'Brand Story', 'TOVMASYAN Jeweler', 'TOVMASYAN Jeweler — продажа и изготовление ювелирных изделий из золота, украшения под заказ в Ереване.', about_body), encoding='utf-8')

contacts_body = '''<section class="section contacts-section"><div class="container contact-card reveal"><div class="contact-info"><p class="eyebrow">Contact</p><h2>Контакты и консультация</h2><p>Свяжитесь с нами, чтобы уточнить наличие изделия, обсудить индивидуальный заказ или получить расчет стоимости.</p><div class="contact-methods"><a href="tel:+37477105163"><span>Телефон</span><strong>+374 77 105 163</strong></a><a href="#" data-whatsapp="Здравствуйте! Хочу получить консультацию."><span>WhatsApp</span><strong>Написать сейчас</strong></a><a href="https://www.instagram.com/tovmasyan_jeweler/" target="_blank" rel="noopener"><span>Instagram</span><strong>@tovmasyan_jeweler</strong></a><a href="https://www.google.com/maps/search/?api=1&query=Mir%20Zolota%20Gold%20Market%2024%20Movses%20Khorenatsi%20Street%20Yerevan" target="_blank" rel="noopener"><span>Адрес</span><strong>Mir Zolota Gold Market, Yerevan</strong></a></div></div><form class="order-form" data-order-form><h3>Быстрая заявка</h3><p>Сообщение откроется в WhatsApp.</p><label>Ваше имя<input name="name" placeholder="Ваше имя"></label><label>Интерес<select name="interest"><option>Консультация</option><option>Готовое изделие</option><option>Индивидуальный заказ</option><option>Обручальные кольца</option></select></label><label>Комментарий<textarea name="message" placeholder="Что вы хотите уточнить?"></textarea></label><button class="btn btn--gold" type="submit">Отправить в WhatsApp</button></form></div></section>'''
(ROOT / 'contacts.html').write_text(page('Контакты', 'contacts', 'Contact', 'Связаться с TOVMASYAN Jeweler', 'Телефон, WhatsApp, Instagram и адрес TOVMASYAN Jeweler в Ереване.', contacts_body), encoding='utf-8')

# 404 and robots/sitemap
(ROOT / '404.html').write_text(page('Страница не найдена', '', '404', 'Страница не найдена', 'Вернитесь на главную страницу или откройте каталог TOVMASYAN Jeweler.', '<section class="section"><div class="container section-head section-head--center reveal"><h2>Похоже, такой страницы нет</h2><p>Откройте каталог или напишите нам в WhatsApp.</p><div class="hero__actions"><a class="btn btn--gold" href="catalog.html">Каталог</a><a class="btn btn--glass" href="contacts.html">Контакты</a></div></div></section>'), encoding='utf-8')
(ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: sitemap.xml\n', encoding='utf-8')
urls = ['index.html','catalog.html','custom.html','care.html','about.html','contacts.html'] + [f"products/{p['id']}.html" for p in products]
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://example.com/{u}</loc></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')

print(f"Generated {len(products)} products and {len(urls)} pages.")
