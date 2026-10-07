/* Full-site translation engine for TOVMASYAN Jeweler (ru <-> hy).
   Translates static markup, dynamically rendered catalog cards and the account area. */
(() => {
  const LANG_KEY = 'tovmasyan_lang';
  const DICT_URL = '/i18n/hy.json';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'svg', 'SVG']);
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'content'];

  let dict = null;
  let loading = null;
  const originalText = new WeakMap();   // text node -> original Russian
  const originalAttr = new WeakMap();   // element -> { attr: original }

  // strings produced at runtime by auth.js / account.js
  const RUNTIME = {
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
  };

  const getLang = () => (localStorage.getItem(LANG_KEY) === 'hy' ? 'hy' : 'ru');

  async function loadDict() {
    if (dict) return dict;
    if (loading) return loading;
    loading = fetch(DICT_URL, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => { dict = Object.assign({}, data, RUNTIME); return dict; })
      .catch(() => { dict = Object.assign({}, RUNTIME); return dict; });
    return loading;
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
    if (!trimmed || !dict[trimmed]) return;
    if (!originalText.has(node)) originalText.set(node, raw);
    node.nodeValue = raw.replace(trimmed, dict[trimmed]);
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
      if (!dict[value]) return;
      const store = originalAttr.get(el) || {};
      if (store[attr] === undefined) { store[attr] = el.getAttribute(attr); originalAttr.set(el, store); }
      el.setAttribute(attr, dict[value]);
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
      if (getLang() !== 'hy' || !dict) return;
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
    const hy = getLang() === 'hy';
    document.documentElement.lang = hy ? 'hy' : 'ru';
    if (hy) {
      await loadDict();
      walk(document.body, true);
      startObserver();
    } else {
      if (observer) { observer.disconnect(); observer = null; }
      walk(document.body, false);
    }
    document.documentElement.dataset.langApplied = hy ? 'hy' : 'ru';
  }

  window.TovmasyanI18n = {
    apply,
    getLang,
    translate: (s) => (getLang() === 'hy' && dict && dict[s]) || s,
    get ready() { return Boolean(dict); }
  };

  document.addEventListener('tovmasyan:language-changed', apply);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
