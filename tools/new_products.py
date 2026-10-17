# -*- coding: utf-8 -*-
"""39 новых изделий по фотографиям клиента (beige-photos)."""
B = '/home/user/beige-photos/ring-{}-beige.webp'

MAT_Y = 'Золото 585 / 750'
MAT_R = 'Красное золото 585'
ST_PAVE = 'Бриллианты или фианиты, паве'
ST_CENTER = 'Центральный камень и паве'
ST_SOLO = 'Один центральный камень'
ST_LINE = 'Дорожка камней по всей длине'
ST_SAPH = 'Синий сапфир в обрамлении паве'
SZ_RING = 'По размеру клиента, 15–22'
SZ_EAR_S = 'Высота ок. 15 мм'
SZ_EAR_M = 'Длина ок. 25 мм'
SZ_EAR_L = 'Длина ок. 45 мм'

CLOSE = {
 'ring': dict(ru='Кольцо изготавливается по вашему размеру, в желтом, белом или красном золоте; камни — бриллианты или фианиты на выбор.',
   hy='Մատանին պատրաստվում է ըստ Ձեր չափսի՝ դեղին, սպիտակ կամ կարմիր ոսկով, քարերը՝ ադամանդ կամ ցիրկոն՝ ըստ ընտրության։',
   en='The ring is made to your size in yellow, white or red gold; stones are diamonds or cubic zirconia, as you prefer.'),
 'ear': dict(ru='Серьги выполняются в желтом, белом или красном золоте, вес и камни подбираются под ваш бюджет.',
   hy='Ականջօղերը պատրաստվում են դեղին, սպիտակ կամ կարմիր ոսկով, քաշը և քարերը ընտրվում են ըստ Ձեր բյուջեի։',
   en='The earrings are made in yellow, white or red gold; weight and stones are matched to your budget.'),
 'bridal': dict(ru='Модель создается под помолвку: размер, форма и вес центрального камня подбираются индивидуально.',
   hy='Մոդելը ստեղծվում է նշանադրության համար՝ չափսը, կենտրոնական քարի ձևն ու քաշը ընտրվում են անհատապես։',
   en='Made for a proposal: size, shape and weight of the centre stone are chosen individually.'),
}

TAGS = {
 'паве': dict(hy='պավե', en='pavé'), 'кольцо': dict(hy='մատանի', en='ring'),
 'серьги': dict(hy='ականջօղեր', en='earrings'), 'минимализм': dict(hy='մինիմալիզմ', en='minimal'),
 'помолвка': dict(hy='նշանադրություն', en='engagement'), 'подарок': dict(hy='նվեր', en='gift'),
 'геометрия': dict(hy='երկրաչափություն', en='geometry'), 'мужское': dict(hy='տղամարդու', en='for men'),
 'вечернее': dict(hy='երեկոյան', en='evening'), 'на каждый день': dict(hy='ամենօրյա', en='everyday'),
 'солитер': dict(hy='սոլիտեր', en='solitaire'), 'дорожка': dict(hy='շարք', en='line'),
 'эмаль': dict(hy='էմալ', en='enamel'), 'сапфир': dict(hy='շափյուղա', en='sapphire'),
 'длинные': dict(hy='երկար', en='long'), 'конго': dict(hy='կոնգո', en='hoop'),
 'красное золото': dict(hy='կարմիր ոսկի', en='red gold'), 'бесконечность': dict(hy='անվերջություն', en='infinity'),
 'печатка': dict(hy='կնիք', en='signet'), 'объемное': dict(hy='ծավալուն', en='bold'),
}

# (num, id, aud, name_ru, name_hy, name_en, short_ru, short_hy, short_en, tags, kind, size, mat, st)
R = []
def ring(num, pid, aud, nru, nhy, nen, sru, shy, sen, tags, st=ST_PAVE, kind='ring', mat=MAT_Y, size=SZ_RING, col='Signature Gold'):
    R.append(dict(src=B.format(num), id=pid, cat='rings', label='Кольца', col=col, aud=aud, mat=mat, st=st, size=size,
                  name=dict(ru=nru, hy=nhy, en=nen), short=dict(ru=sru, hy=shy, en=sen), tags=tags, kind=kind))
def ear(num, pid, nru, nhy, nen, sru, shy, sen, tags, st=ST_PAVE, size=SZ_EAR_M, mat=MAT_Y, col='Evening Shine', aud='women'):
    R.append(dict(src=B.format(num), id=pid, cat='earrings', label='Серьги', col=col, aud=aud, mat=mat, st=st, size=size,
                  name=dict(ru=nru, hy=nhy, en=nen), short=dict(ru=sru, hy=shy, en=sen), tags=tags, kind='ear'))

ring(1,'arc-ouvert-ring','unisex','Кольцо Arc Ouvert','Մատանի Arc Ouvert','Arc Ouvert Ring',
 'Разомкнутое кольцо с двумя клиновидными окончаниями в паве.',
 'Բաց մատանի՝ երկու սեպաձև ծայրերով՝ պավե շարքերով։',
 'An open ring with two wedge-shaped tips set with pavé.',
 ['кольцо','паве','геометрия'], col='Geometry')
ring(2,'carre-solo-ring','unisex','Кольцо Carré Solo','Մատանի Carré Solo','Carré Solo Ring',
 'Плоская шинка с одним квадратным камнем в глухой закрепке.',
 'Հարթ մատանի՝ մեկ քառակուսի քարով՝ խուլ ամրակապում։',
 'A flat band with a single square stone in a bezel setting.',
 ['кольцо','минимализм','геометрия'], st=ST_SOLO, col='Geometry')
ring(3,'quadra-ring','men','Кольцо Quadra','Մատանի Quadra','Quadra Ring',
 'Массивное квадратное кольцо с квадратным камнем на грани.',
 'Զանգվածեղ քառակուսի մատանի՝ նիստին ամրացված քառակուսի քարով։',
 'A bold square ring with a square stone set into the edge.',
 ['кольцо','мужское','объемное'], st=ST_SOLO, col='Geometry')
ring(4,'ligne-ring','women','Кольцо Ligne','Մատանի Ligne','Ligne Ring',
 'Плоская площадка с дорожкой камней, убывающих к краю.',
 'Հարթ հարթակ՝ դեպի եզր նվազող քարերի շարքով։',
 'A flat top carrying a line of stones that taper towards the edge.',
 ['кольцо','дорожка','на каждый день'], st=ST_LINE, col='Signature Gold')
ring(5,'duo-pave-ring','women','Кольцо Duo Pavé','Մատանի Duo Pavé','Duo Pavé Ring',
 'Разомкнутое кольцо с двумя площадками, полностью усыпанными паве.',
 'Բաց մատանի՝ երկու հարթակներով, ամբողջովին պավեով ծածկված։',
 'An open ring with two panels fully covered in pavé.',
 ['кольцо','паве','вечернее'], col='Evening Shine')
ring(6,'flora-line-ring','women','Кольцо Flora Line','Մատանի Flora Line','Flora Line Ring',
 'Плоская площадка с дорожкой камней и ажурными листиками по бокам.',
 'Հարթ հարթակ՝ քարերի շարքով և կողքերին բացվածքավոր տերևիկներով։',
 'A flat top with a line of stones and openwork leaves on the sides.',
 ['кольцо','дорожка','подарок'], st=ST_LINE, col='Fleur')
ring(7,'signet-pave-ring','men','Кольцо Signet Pavé','Մատանի Signet Pavé','Signet Pavé Ring',
 'Печатка с широким щитком в паве и разомкнутой шинкой.',
 'Կնիք-մատանի՝ պավեով լայն վահանով և բաժանված օղակով։',
 'A signet with a wide pavé face and a split shank.',
 ['кольцо','печатка','мужское'], col='Royal Detail')
ring(8,'bar-double-ring','unisex','Кольцо Bar Double','Մատանի Bar Double','Bar Double Ring',
 'Прямая площадка с двумя рядами мелких камней по нижней грани.',
 'Ուղիղ հարթակ՝ ստորին նիստին մանր քարերի երկու շարքով։',
 'A straight bar top with two rows of small stones along the lower edge.',
 ['кольцо','паве','геометрия'], col='Geometry')
ring(9,'twist-solitaire-ring','bridal','Кольцо Twist Solitaire','Մատանի Twist Solitaire','Twist Solitaire Ring',
 'Закрученная шинка в паве с крупным круглым камнем в центре.',
 'Ոլորված օղակ՝ պավեով և կենտրոնում խոշոր կլոր քարով։',
 'A twisted pavé shank holding a large round centre stone.',
 ['кольцо','солитер','помолвка'], st=ST_CENTER, kind='bridal', col='Bridal')
ring(10,'wave-solitaire-ring','bridal','Кольцо Wave Solitaire','Մատանի Wave Solitaire','Wave Solitaire Ring',
 'Волна из двух линий паве огибает круглый солитер.',
 'Պավեի երկու գծերից ալիքը շրջանցում է կլոր սոլիտերը։',
 'Two pavé lines sweep around a round solitaire like a wave.',
 ['кольцо','солитер','помолвка'], st=ST_CENTER, kind='bridal', col='Bridal')
ring(11,'croise-ring','bridal','Кольцо Croisé','Մատանի Croisé','Croisé Ring',
 'Две перекрещенные шинки — гладкая и в паве — с камнем в центре.',
 'Երկու խաչվող օղակ՝ հարթ և պավե, կենտրոնում՝ քար։',
 'Two crossing bands — one polished, one pavé — meeting at a centre stone.',
 ['кольцо','солитер','помолвка'], st=ST_CENTER, kind='bridal', col='Bridal')
ring(12,'chevron-ring','women','Кольцо Chevron','Մատանի Chevron','Chevron Ring',
 'Двойная шинка-шеврон с четырьмя камнями по диагонали.',
 'Կրկնակի շևրոն-օղակ՝ անկյունագծով չորս քարով։',
 'A double chevron band with four stones set on the diagonal.',
 ['кольцо','минимализм','на каждый день'], st=ST_LINE, col='Geometry')
ring(13,'duetto-ring','women','Кольцо Duetto','Մատանի Duetto','Duetto Ring',
 'Две шинки: верхняя с дорожкой паве, нижняя с парой камней в лапках.',
 'Երկու օղակ՝ վերինը պավե շարքով, ստորինը՝ երկու քարով՝ ճանկերի մեջ։',
 'Two bands: a pavé line above, a pair of claw-set stones below.',
 ['кольцо','дорожка','подарок'], col='Signature Gold')
ring(14,'arrow-wrap-ring','women','Кольцо Arrow Wrap','Մատանի Arrow Wrap','Arrow Wrap Ring',
 'Кольцо-обхват с двумя стреловидными концами в камнях.',
 'Փաթաթվող մատանի՝ երկու նետաձև ծայրերով՝ քարերով։',
 'A wrap ring with two arrow-shaped, stone-set tips.',
 ['кольцо','геометрия','вечернее'], col='Geometry')
ring(15,'square-line-ring','unisex','Кольцо Square Line','Մատանի Square Line','Square Line Ring',
 'Квадратный силуэт из двух параллельных линий с паве.',
 'Քառակուսի ուրվագիծ՝ երկու զուգահեռ գծերից՝ պավեով։',
 'A square silhouette built from two parallel pavé lines.',
 ['кольцо','минимализм','геометрия'], col='Geometry')
ring(16,'sphere-ring','women','Кольцо Sphère','Մատանի Sphère','Sphère Ring',
 'Тонкая шинка с шариком в паве между двумя гладкими шариками.',
 'Բարակ օղակ՝ պավե գնդիկով՝ երկու հարթ գնդիկների միջև։',
 'A fine band with a pavé sphere between two polished beads.',
 ['кольцо','минимализм','подарок'], col='Little Gold')
ring(17,'triple-band-ring','men','Кольцо Triple Band','Մատանի Triple Band','Triple Band Ring',
 'Широкое кольцо из трех линий, центральная — в три ряда паве.',
 'Լայն մատանի՝ երեք գծից, կենտրոնականը՝ պավեի երեք շարքով։',
 'A wide three-line ring; the central line carries three rows of pavé.',
 ['кольцо','мужское','объемное'], col='Royal Detail')
ring(18,'orbit-ring','women','Кольцо Orbit','Մատանի Orbit','Orbit Ring',
 'Двойная шинка в паве с открытой окружностью в центре.',
 'Կրկնակի պավե օղակ՝ կենտրոնում բաց շրջանով։',
 'A double pavé band framing an open circle at the centre.',
 ['кольцо','паве','вечернее'], col='Evening Shine')
ring(19,'halo-royal-ring','bridal','Кольцо Halo Royal','Մատանի Halo Royal','Halo Royal Ring',
 'Солитер в ореоле паве с раздвоенной шинкой в камнях.',
 'Սոլիտեր՝ պավե լուսապսակում, օղակը՝ երկատված և քարերով։',
 'A haloed solitaire on a split shank fully set with stones.',
 ['кольцо','солитер','помолвка'], st=ST_CENTER, kind='bridal', col='Bridal')
ring(20,'vertige-ring','women','Кольцо Vertige','Մատանի Vertige','Vertige Ring',
 'Удлиненное кольцо-шеврон из трех линий паве.',
 'Երկարաձգված շևրոն-մատանի՝ պավեի երեք գծից։',
 'An elongated chevron ring drawn with three pavé lines.',
 ['кольцо','вечернее','паве'], col='Evening Shine')
ring(21,'eternite-ring','women','Кольцо Éternité','Մատանի Éternité','Éternité Ring',
 'Широкое кольцо с двумя рядами камней по всей окружности.',
 'Լայն մատանի՝ ամբողջ շրջագծով քարերի երկու շարքով։',
 'A wide band with two rows of stones running all the way round.',
 ['кольцо','дорожка','вечернее'], st=ST_LINE, col='Tennis')

ear(22,'flamme-earrings','Серьги Flamme','Ականջօղեր Flamme','Flamme Earrings',
 'Подвески-язычки пламени с овальным камнем и английским замком.',
 'Բոցաձև կախազարդեր՝ օվալ քարով և անգլիական կողպեքով։',
 'Flame-shaped drops with an oval stone and a lever clasp.',
 ['серьги','вечернее','подарок'], st=ST_CENTER)
ear(23,'feuille-earrings','Серьги Feuille','Ականջօղեր Feuille','Feuille Earrings',
 'Рифленые листья из красного золота с дорожкой камней и багетом.',
 'Ակոսավոր տերևներ՝ կարմիր ոսկուց՝ քարերի շարքով և բագետով։',
 'Ribbed red-gold leaves with a line of stones and a baguette.',
 ['серьги','красное золото','вечернее'], mat=MAT_R, col='Fleur', size=SZ_EAR_L)
ear(24,'cage-earrings','Серьги Cage','Ականջօղեր Cage','Cage Earrings',
 'Прямоугольные подвески с вертикальными дорожками камней.',
 'Ուղղանկյուն կախազարդեր՝ ուղղահայաց քարերի շարքերով։',
 'Rectangular drops filled with vertical lines of stones.',
 ['серьги','паве','вечернее'], st=ST_LINE)
ear(25,'maillon-earrings','Серьги Maillon','Ականջօղեր Maillon','Maillon Earrings',
 'Овальное звено с двумя камнями-маркизами на замке-петле.',
 'Օվալ օղակ՝ երկու մարկիզ քարով՝ հանգույց-կողպեքի վրա։',
 'An oval link with two marquise stones on a lever back.',
 ['серьги','минимализм','на каждый день'], size=SZ_EAR_S)
ear(26,'trait-earrings','Серьги Trait','Ականջօղեր Trait','Trait Earrings',
 'Длинные узкие подвески-треугольники, обведенные паве.',
 'Երկար նեղ եռանկյուն կախազարդեր՝ պավեով եզրագծված։',
 'Long slim triangular drops outlined in pavé.',
 ['серьги','длинные','вечернее'], size=SZ_EAR_L)
ear(27,'eventail-earrings','Серьги Éventail','Ականջօղեր Éventail','Éventail Earrings',
 'Широкие серьги-веер с гладким центром в рамке из камней.',
 'Լայն հովհարաձև ականջօղեր՝ հարթ կենտրոնով՝ քարերի շրջանակում։',
 'Wide fan-shaped earrings with a polished centre framed by stones.',
 ['серьги','объемное','подарок'], size=SZ_EAR_S)
ear(28,'trefle-earrings','Серьги Trèfle','Ականջօղեր Trèfle','Trèfle Earrings',
 'Клевер из четырех гладких петель с треугольным камнем.',
 'Երեքնուկ՝ չորս հարթ օղակից՝ եռանկյուն քարով։',
 'A clover of four polished loops holding a trillion-cut stone.',
 ['серьги','подарок','на каждый день'], st=ST_SOLO, col='Fleur')
ear(29,'comete-earrings','Серьги Comète','Ականջօղեր Comète','Comète Earrings',
 'Серьги-климберы с дорожкой камней и овальным камнем внизу.',
 'Climber ականջօղեր՝ քարերի շարքով և ներքևում օվալ քարով։',
 'Climber studs with a line of stones and an oval stone below.',
 ['серьги','минимализм','вечернее'], st=ST_CENTER, size=SZ_EAR_S)
ear(30,'arc-long-earrings','Серьги Arc Long','Ականջօղեր Arc Long','Arc Long Earrings',
 'Длинные гладкие стержни с дугой из круглых камней внизу.',
 'Երկար հարթ ձողիկներ՝ ներքևում կլոր քարերի աղեղով։',
 'Long polished bars finished with an arc of round stones.',
 ['серьги','длинные','вечернее'], size=SZ_EAR_L)
ear(31,'saphir-earrings','Серьги Saphir','Ականջօղեր Saphir','Saphir Earrings',
 'Синий сапфир в ореоле паве на узле из золота.',
 'Կապույտ շափյուղա՝ պավե լուսապսակում՝ ոսկե հանգույցի վրա։',
 'A blue sapphire in a pavé halo suspended from a golden knot.',
 ['серьги','сапфир','вечернее'], st=ST_SAPH, col='Royal Detail')
ear(32,'baguette-earrings','Серьги Baguette','Ականջօղեր Baguette','Baguette Earrings',
 'Миниатюрная подвеска с камнем огранки багет в рамке.',
 'Մանրաչափ կախազարդ՝ բագետ հղկման քարով՝ շրջանակում։',
 'A petite drop with a baguette-cut stone in a frame.',
 ['серьги','минимализм','на каждый день'], st=ST_SOLO, size=SZ_EAR_S)
ear(33,'onyx-loop-earrings','Серьги Onyx Loop','Ականջօղեր Onyx Loop','Onyx Loop Earrings',
 'Две петли — в паве и в черной эмали — сцеплены между собой.',
 'Երկու օղակ՝ պավեով և սև էմալով՝ միմյանց կցված։',
 'Two interlocking loops — one pavé, one black enamel.',
 ['серьги','эмаль','вечернее'])
ear(34,'infinity-hoop-earrings','Серьги Infinity Hoop','Ականջօղեր Infinity Hoop','Infinity Hoop Earrings',
 'Конго в камнях с подвеской-бесконечностью.',
 'Կոնգո՝ քարերով և անվերջության կախազարդով։',
 'A stone-set hoop with an infinity drop.',
 ['серьги','конго','бесконечность'])
ear(35,'halo-drop-earrings','Серьги Halo Drop','Ականջօղեր Halo Drop','Halo Drop Earrings',
 'Круглый камень в ореоле паве на петле-восьмерке.',
 'Կլոր քար՝ պավե լուսապսակում՝ ութաձև հանգույցի վրա։',
 'A round stone in a pavé halo hanging from a figure-eight link.',
 ['серьги','подарок','вечернее'], st=ST_CENTER)
ear(36,'goutte-earrings','Серьги Goutte','Ականջօղեր Goutte','Goutte Earrings',
 'Капля из паве с двумя камнями в глухих закрепках.',
 'Կաթիլ՝ պավեից՝ երկու քարով՝ խուլ ամրակապերում։',
 'A pavé teardrop with two bezel-set stones.',
 ['серьги','паве','подарок'])
ear(37,'chaine-earrings','Серьги Chaîne','Ականջօղեր Chaîne','Chaîne Earrings',
 'Длинная цепочка с колечком из черной и белой керамики.',
 'Երկար շղթա՝ սև և սպիտակ կերամիկայից օղակով։',
 'A long chain finished with a black-and-white ceramic ring.',
 ['серьги','длинные','эмаль'], size=SZ_EAR_L)
ear(38,'infinity-earrings','Серьги Infinity','Ականջօղեր Infinity','Infinity Earrings',
 'Подвеска-бесконечность, наполовину гладкая, наполовину в паве.',
 'Անվերջության կախազարդ՝ կիսով չափ հարթ, կիսով չափ՝ պավե։',
 'An infinity drop, half polished and half set with pavé.',
 ['серьги','бесконечность','на каждый день'], size=SZ_EAR_S)
ear(39,'pave-hoop-earrings','Серьги Pavé Hoop','Ականջօղեր Pavé Hoop','Pavé Hoop Earrings',
 'Плотное конго, полностью покрытое камнями в зерновой закрепке.',
 'Խիտ կոնգո՝ ամբողջովին ծածկված քարերով՝ հատիկավոր ամրակապմամբ։',
 'A chunky hoop completely covered with bead-set stones.',
 ['серьги','конго','вечернее'], size=SZ_EAR_S)

NEW = []
for it in R:
    k = it.pop('kind')
    cl = CLOSE['bridal'] if k == 'bridal' else CLOSE['ring' if it['cat'] == 'rings' else 'ear']
    it['desc'] = {l: it['short'][l] + ' ' + cl[l] for l in ('ru', 'hy', 'en')}
    it['tags'] = dict(ru=it['tags'], hy=[TAGS[t]['hy'] for t in it['tags']], en=[TAGS[t]['en'] for t in it['tags']])
    NEW.append(it)
