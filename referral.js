/* Реферальная программа TOVMASYAN Jeweler: персональный код, скидка 4%. */
(() => {
  const DISCOUNT = 4;          // по приглашению друга
  const MEMBER_DISCOUNT = 3;   // просто за регистрацию
  const REF_KEY = 'tovmasyan_ref';
  const REF_TTL = 180 * 24 * 60 * 60 * 1000;   // приглашение действует полгода
  const PREFIX = 'TOV';

  function readRef() {
    try {
      const raw = localStorage.getItem(REF_KEY);
      if (!raw) return '';
      const data = JSON.parse(raw);
      if (!data || !data.code) return '';
      if (data.at && Date.now() - data.at > REF_TTL) { localStorage.removeItem(REF_KEY); return ''; }
      return data.code;
    } catch (error) { return ''; }
  }

  function writeRef(code) {
    try { localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() })); } catch (error) { /* ignore */ }
  }

  const normalize = (v) => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const valid = (v) => /^TOV[A-Z0-9]{5}$/.test(normalize(v));

  // детерминированный код из uid: один и тот же аккаунт — один и тот же код на любом устройстве
  function codeForUid(uid) {
    if (!uid) return '';
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < uid.length; i += 1) {
      h1 = (h1 ^ uid.charCodeAt(i)) >>> 0;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = (h2 + Math.imul(uid.charCodeAt(i) + i, 0x9e3779b1)) >>> 0;
    }
    const raw = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return PREFIX + (raw + '00000').slice(0, 5);
  }

  function myCode() {
    const user = window.TovmasyanAuth && window.TovmasyanAuth.getUser && window.TovmasyanAuth.getUser();
    return user ? codeForUid(user.uid) : '';
  }

  function inviteLink(code) {
    return `${location.origin}/?ref=${code}`;
  }

  function signedIn() {
    const a = window.TovmasyanAuth;
    return Boolean(a && a.getUser && a.getUser());
  }

  // какая скидка сейчас действует: приглашение (4%) важнее регистрации (3%)
  function activeDiscount() {
    if (readRef()) return { percent: DISCOUNT, kind: 'invite', code: readRef() };
    if (signedIn()) return { percent: MEMBER_DISCOUNT, kind: 'member', code: myCode() };
    return { percent: 0, kind: 'none', code: '' };
  }

  function promoNote(code, percent, kind) {
    const value = percent || DISCOUNT;
    const reason = kind === 'member' ? 'зарегистрированный клиент' : 'приглашение';
    return `\n\nПромокод: ${code} (скидка ${value}% — ${reason})`;
  }

  /* ---------- приглашение из ссылки ---------- */
  function captureFromUrl() {
    const url = new URL(location.href);
    const raw = url.searchParams.get('ref') || '';
    if (!raw) return;
    const code = normalize(raw);
    url.searchParams.delete('ref');
    history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
    if (!valid(code) || code === myCode()) return;
    const had = readRef();
    writeRef(code);
    if (had !== code) showToast(`Скидка ${DISCOUNT}% по приглашению активирована`);
  }

  function showToast(text) {
    const el = document.createElement('div');
    el.className = 'referral-toast';
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => { el.classList.remove('is-visible'); setTimeout(() => el.remove(), 400); }, 5000);
  }

  /* ---------- промокод в сообщениях WhatsApp ---------- */
  function decorateWhatsApp() {
    const info = activeDiscount();
    const code = info.code;
    if (!code || !info.percent) return;
    const note = promoNote(code, info.percent, info.kind);
    document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
      if (a.dataset.refDone === code) return;
      try {
        const url = new URL(a.href);
        const text = url.searchParams.get('text');
        if (!text) { a.dataset.refDone = code; return; }
        const clean = text.replace(/\n\nПромокод: TOV[A-Z0-9]{5} \(скидка \d+%[^)]*\)/g, '');
        url.searchParams.set('text', clean + note);
        a.href = url.toString();
        a.dataset.refDone = code;
      } catch (error) { /* ignore */ }
    });
  }

  /* ---------- привязка приглашения к аккаунту ---------- */
  let linked = false;
  async function linkInvite() {
    const auth = window.TovmasyanAuth;
    if (linked || !auth || !auth.getUser || !auth.getUser()) return;
    const code = readRef();
    if (!code || code === myCode()) return;
    linked = true;
    if (typeof auth.saveProfile === 'function') {
      try { await auth.saveProfile({ referredBy: code, referredAt: Date.now() }); } catch (error) { /* ignore */ }
    }
  }

  function start() {
    captureFromUrl();
    decorateWhatsApp();
    const observer = new MutationObserver(() => decorateWhatsApp());
    observer.observe(document.body, { childList: true, subtree: true });
    if (window.TovmasyanAuth && window.TovmasyanAuth.onAuthChange) {
      window.TovmasyanAuth.onAuthChange(() => { decorateWhatsApp(); linkInvite(); });
    }
    document.addEventListener('tovmasyan:auth-ready', () => { decorateWhatsApp(); linkInvite(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.TovmasyanReferral = {
    DISCOUNT,
    MEMBER_DISCOUNT,
    activeDiscount,
    codeForUid,
    myCode,
    inviteLink,
    invitedBy: readRef,
    isValid: valid,
    promoNote,
    toast: showToast
  };
})();
