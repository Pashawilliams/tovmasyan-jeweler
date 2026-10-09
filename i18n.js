/* Full-site translation engine for TOVMASYAN Jeweler (ru <-> hy <-> en).
   Translates static markup, dynamically rendered catalog cards and the account area. */
(() => {
  const LANG_KEY = 'tovmasyan_lang';
  const LANGS = ['hy', 'en'];
  const DICT_URL = (lang) => `/i18n/${lang}.json`;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'svg', 'SVG']);
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'content'];

  let dict = null;
  let dictLang = null;
  let loading = null;
  let loadingLang = null;
  const originalText = new WeakMap();   // text node -> original Russian
  const originalAttr = new WeakMap();   // element -> { attr: original }

  // strings produced at runtime by auth.js / account.js
  const RUNTIME = {
    hy: {
    'Добавлено в избранное': 'Ավելացվեց ընտրանի',
    'Удалено из избранного': 'Հեռացվեց ընտրանուց',
    'Вы вошли через Google': 'Դուք մուտք գործեցիք Google-ով',
    'Вы вышли из аккаунта': 'Դուք դուրս եկաք հաշվից',
    'Проверяем вход…': 'Ստուգում ենք մուտքը…',
    'Избранное': 'Ընտրանի',
    'Заявки': 'Հայտեր',
    'Открыть каталог': 'Բացել կատալոգը',
    'Новая заявка': 'Նոր հայտ',
    'Выйти': 'Դուրս գալ',
    'Смотреть': 'Դիտել',
    'избранных изделий': 'ընտրված իր',
    'заявок и заказов': 'հայտ և պատվեր',
    'защищённый вход': 'պաշտպանված մուտք',
    'Войдите в личный кабинет': 'Մուտք գործեք անձնական էջ',
    'После входа можно сохранять избранные изделия, видеть заявки и готовить будущие заказы.':
      'Մուտքից հետո կարող եք պահել ընտրված իրերը, տեսնել հայտերը և պատրաստել ապագա պատվերները։',
    'Личный кабинет': 'Անձնական էջ',
    'Пока нет избранных изделий. Откройте каталог и нажмите звёздочку на понравившемся украшении.':
      'Առայժմ ընտրված իրեր չկան։ Բացեք կատալոգը և սեղմեք աստղիկը ձեզ դուր եկած զարդի վրա։',
    'Заявки появятся здесь после отправки формы или нажатия кнопки заказа в WhatsApp.':
      'Հայտերը կհայտնվեն այստեղ ձևաթուղթն ուղարկելուց կամ WhatsApp-ում պատվերի կոճակը սեղմելուց հետո։',
    'Добавить в избранное': 'Ավելացնել ընտրանի',
    'Удалить из избранного': 'Հեռացնել ընտրանուց',
    'Изделие': 'Իր',
    'Заявка': 'Հայտ',
    'Цена по запросу': 'Գինը՝ հարցմամբ'
  },
    en: {
    'Добавлено в избранное': 'Added to favourites',
    'Удалено из избранного': 'Removed from favourites',
    'Вы вошли через Google': 'You are signed in with Google',
    'Вы вышли из аккаунта': 'You have signed out',
    'Проверяем вход…': 'Checking your sign-in…',
    'Избранное': 'Favourites',
    'Заявки': 'Requests',
    'Открыть каталог': 'Open the catalogue',
    'Новая заявка': 'New request',
    'Выйти': 'Sign out',
    'Смотреть': 'View',
    'избранных изделий': 'saved pieces',
    'заявок и заказов': 'requests and orders',
    'защищённый вход': 'secure sign-in',
    'Войдите в личный кабинет': 'Sign in to your account',
    'После входа можно сохранять избранные изделия, видеть заявки и готовить будущие заказы.':
      'Once signed in you can save favourite pieces, see your requests and plan future orders.',
    'Личный кабинет': 'My account',
    'Пока нет избранных изделий. Откройте каталог и нажмите звёздочку на понравившемся украшении.':
      'No favourites yet. Open the catalogue and tap the star on a piece you like.',
    'Заявки появятся здесь после отправки формы или нажатия кнопки заказа в WhatsApp.':
      'Requests will appear here after you send the form or tap the WhatsApp order button.',
    'Добавить в избранное': 'Add to favourites',
    'Удалить из избранного': 'Remove from favourites',
    'Изделие': 'Piece',
    'Заявка': 'Request',
    'Цена по запросу': 'Price on request'
  }
  };

  const getLang = () => {
    const stored = localStorage.getItem(LANG_KEY);
    return LANGS.includes(stored) ? stored : 'ru';
  };

  async function loadDict(lang) {
    if (dict && dictLang === lang) return dict;
    if (loading && loadingLang === lang) return loading;
    loadingLang = lang;
    loading = fetch(DICT_URL(lang), { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { dict = Object.assign({}, data, RUNTIME[lang]); dictLang = lang; return dict; })
      .catch(() => { dict = Object.assign({}, RUNTIME[lang]); dictLang = lang; return dict; });
    return loading;
  }

  // translates a whole string, or each part of a "A · B" / "A / B" composite
  function translateString(value) {
    if (!dict) return value;
    if (dict[value]) return dict[value];
    const sep = value.includes(' · ') ? ' · ' : (value.includes(' / ') ? ' / ' : null);
    if (!sep) return value;
    const parts = value.split(sep);
    if (parts.length < 2 || !parts.some((x) => dict[x.trim()])) return value;
    return parts.map((x) => dict[x.trim()] || x.trim()).join(sep);
  }

  function translateTextNode(node, toHy) {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) return;
    if (!toHy) {
      if (originalText.has(node)) node.nodeValue = originalText.get(node);
      return;
    }
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const translated = translateString(trimmed);
    if (translated === trimmed) return;
    if (!originalText.has(node)) originalText.set(node, raw);
    node.nodeValue = raw.replace(trimmed, translated);
  }

  function translateAttrs(el, toHy) {
    ATTRS.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      if (attr === 'content' && !el.matches('meta[property^="og:"], meta[name="description"]')) return;
      if (!toHy) {
        const saved = originalAttr.get(el);
        if (saved && saved[attr] !== undefined) el.setAttribute(attr, saved[attr]);
        return;
      }
      const value = el.getAttribute(attr).trim();
      const translatedAttr = translateString(value);
      if (translatedAttr === value) return;
      const store = originalAttr.get(el) || {};
      if (store[attr] === undefined) { store[attr] = el.getAttribute(attr); originalAttr.set(el, store); }
      el.setAttribute(attr, translatedAttr);
    });
  }

  function walk(root, toHy) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root, toHy); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP_TAGS.has(root.tagName)) return;
    translateAttrs(root, toHy);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        const tag = n.nodeType === Node.ELEMENT_NODE ? n.tagName : n.parentElement?.tagName;
        return tag && SKIP_TAGS.has(tag) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) translateTextNode(n, toHy);
      else translateAttrs(n, toHy);
    }
  }

  let observer = null;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (getLang() === 'ru' || !dict || dictLang !== getLang()) return;
      observer.disconnect();
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => walk(node, true));
        if (m.type === 'characterData') translateTextNode(m.target, true);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function apply() {
    const lang = getLang();
    document.documentElement.lang = lang;
    if (observer) { observer.disconnect(); observer = null; }
    // always restore the Russian source first, so hy -> en switches cleanly
    walk(document.body, false);
    if (lang !== 'ru') {
      await loadDict(lang);
      if (getLang() !== lang) return;
      walk(document.body, true);
      startObserver();
    }
    document.documentElement.dataset.langApplied = lang;
  }

  window.TovmasyanI18n = {
    apply,
    getLang,
    translate: (s) => (getLang() !== 'ru' && dict && dictLang === getLang() && dict[s]) || s,
    get ready() { return Boolean(dict); }
  };

  document.addEventListener('tovmasyan:language-changed', apply);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
