(() => {
  const config = window.TOVMASYAN_FIREBASE_CONFIG || {};
  const accountHref = '/account/';
  const assetPrefix = '/';
  const configured = Boolean(config.apiKey && !String(config.apiKey).includes('PASTE') && !String(config.projectId || '').includes('PASTE'));

  let app = null;
  let auth = null;
  let db = null;
  let firebase = {};
  let currentUser = null;
  let firebaseLoaded = false;
  let authResolved = !configured;
  let initError = null;
  const listeners = new Set();

  const LEGACY_KEYS = ['tovmasyan_local_favorites', 'tovmasyan_local_orders'];
  const langKey = 'tovmasyan_lang';
  const langAskedKey = 'tovmasyan_lang_asked';
  const sessionHintKey = 'tovmasyan_session_hint';
  const lastUidKey = 'tovmasyan_last_uid';
  let justLoggedIn = false;

  function scope() {
    return currentUser ? currentUser.uid : 'guest';
  }
  function favKey() { return `tovmasyan_fav_${scope()}`; }
  function ordKey() { return `tovmasyan_ord_${scope()}`; }

  function purgeGuestData() {
    try {
      localStorage.removeItem('tovmasyan_fav_guest');
      localStorage.removeItem('tovmasyan_ord_guest');
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  function purgeAllUserData() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('tovmasyan_fav_') || k.startsWith('tovmasyan_ord_'))
        .forEach((k) => localStorage.removeItem(k));
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- i18n */

  const I18N = {
    ru: {
      'Каталог': 'Каталог',
      'На заказ': 'На заказ',
      'Уход': 'Уход',
      'О бренде': 'О бренде',
      'Контакты': 'Контакты',
      'WhatsApp': 'WhatsApp',
      'Instagram': 'Instagram'
    },
    hy: {
      'Каталог': 'Կատալոգ',
      'На заказ': 'Պատվերով',
      'Уход': 'Խնամք',
      'О бренде': 'Բրենդի մասին',
      'Контакты': 'Կոնտակտներ',
      'WhatsApp': 'WhatsApp',
      'Instagram': 'Instagram'
    }
  };

  const UI = {
    ru: {
      signIn: 'Войти',
      cabinet: 'Личный кабинет',
      favorites: 'Избранное',
      logout: 'Выйти',
      gateTitle: 'Добро пожаловать в TOVMASYAN Jeweler',
      gateText: 'Чтобы открыть каталог золотых украшений, сохранять избранное и отправлять заявки, войдите через аккаунт Google. Это занимает несколько секунд.',
      gateNote: 'Мы используем защищённый вход Google. Пароль не сохраняется на сайте.',
      checking: 'Проверяем вход…',
      langTitle: 'Выберите язык сайта',
      langText: 'Ընտրեք կայքի լեզուն',
      loggedIn: 'Вы вошли через Google',
      loggedOut: 'Вы вышли из аккаунта'
    },
    hy: {
      signIn: 'Մուտք',
      cabinet: 'Անձնական էջ',
      favorites: 'Ընտրանի',
      logout: 'Դուրս գալ',
      gateTitle: 'Բարի գալուստ TOVMASYAN Jeweler',
      gateText: 'Ոսկյա զարդերի կատալոգը բացելու, ընտրանին պահելու և հայտեր ուղարկելու համար մուտք գործեք Google հաշվով։ Դա տևում է մի քանի վայրկյան։',
      gateNote: 'Մենք օգտագործում ենք Google-ի պաշտպանված մուտքը։ Գաղտնաբառը կայքում չի պահվում։',
      checking: 'Ստուգում ենք մուտքը…',
      langTitle: 'Ընտրեք կայքի լեզուն',
      langText: 'Выберите язык сайта',
      loggedIn: 'Դուք մուտք գործեցիք Google-ով',
      loggedOut: 'Դուք դուրս եկաք հաշվից'
    }
  };

  function getLang() {
    const v = localStorage.getItem(langKey);
    return v === 'hy' || v === 'ru' ? v : 'ru';
  }

  function t(key) {
    return (UI[getLang()] || UI.ru)[key] || UI.ru[key] || key;
  }

  function applyLanguage() {
    const lang = getLang();
    const dict = I18N[lang] || I18N.ru;
    document.documentElement.lang = lang === 'hy' ? 'hy' : 'ru';
    document.querySelectorAll('.main-nav a, .site-footer .footer-links a').forEach((el) => {
      if (!el.dataset.i18nBase) el.dataset.i18nBase = el.textContent.trim();
      const base = el.dataset.i18nBase;
      if (dict[base]) el.textContent = dict[base];
    });
    document.querySelectorAll('[data-lang-option]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.langOption === lang);
    });
    updateHeaderState();
  }

  function setLang(lang) {
    localStorage.setItem(langKey, lang === 'hy' ? 'hy' : 'ru');
    localStorage.setItem(langAskedKey, '1');
    applyLanguage();
    if (currentUser && db) {
      firebase.setDoc(firebase.doc(db, 'users', currentUser.uid), { language: getLang() }, { merge: true }).catch(() => {});
    }
    document.dispatchEvent(new CustomEvent('tovmasyan:language-changed', { detail: { lang: getLang() } }));
  }

  /* ------------------------------------------------------------- helpers */

  const GOOGLE_ICON = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>'
    + '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>'
    + '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>'
    + '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>'
    + '<path fill="none" d="M0 0h48v48H0z"></path></svg>';

  function googleButton(label) {
    return '<button class="gsi-material-button" type="button" data-login-google>'
      + '<div class="gsi-material-button-state"></div>'
      + '<div class="gsi-material-button-content-wrapper">'
      + '<div class="gsi-material-button-icon">' + GOOGLE_ICON + '</div>'
      + '<span class="gsi-material-button-contents">' + label + '</span>'
      + '</div></button>';
  }
  window.TOVMASYAN_GOOGLE_BUTTON = googleButton;

  function emit() {
    listeners.forEach((fn) => {
      try { fn(currentUser); } catch (error) { console.warn(error); }
    });
    updateHeaderState();
    updateFavoriteButtons();
    updateGate();
  }

  function onAuthChange(fn) {
    listeners.add(fn);
    fn(currentUser);
    return () => listeners.delete(fn);
  }

  function localGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function localSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(message, tone = 'info') {
    let el = document.querySelector('[data-auth-toast]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'auth-toast';
      el.dataset.authToast = '';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.dataset.tone = tone;
    el.classList.add('is-visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  function setAuthMessage(message, tone = 'info') {
    document.querySelectorAll('[data-auth-message]').forEach((el) => {
      el.textContent = message;
      el.dataset.tone = tone;
    });
  }

  /* -------------------------------------------------------------- header */

  function injectHeaderUI() {
    document.querySelectorAll('.header-actions').forEach((actions) => {
      if (!actions.querySelector('[data-lang-switch]')) {
        const sw = document.createElement('div');
        sw.className = 'lang-switch';
        sw.dataset.langSwitch = '';
        sw.innerHTML = '<button type="button" data-lang-option="ru" aria-label="Русский">РУ</button>'
          + '<button type="button" data-lang-option="hy" aria-label="Հայերեն">ՀԱՅ</button>';
        actions.insertBefore(sw, actions.firstChild);
      }
      if (!actions.querySelector('[data-auth-slot]')) {
        const slot = document.createElement('div');
        slot.className = 'auth-slot';
        slot.dataset.authSlot = '';
        const toggle = actions.querySelector('[data-menu-toggle]');
        actions.insertBefore(slot, toggle || null);
      }
    });
  }

  function updateHeaderState() {
    document.querySelectorAll('[data-auth-slot]').forEach((slot) => {
      if (currentUser) {
        const name = currentUser.displayName || currentUser.email || t('cabinet');
        const first = escapeHtml(name.split(' ')[0]);
        const avatar = currentUser.photoURL
          ? `<img src="${escapeHtml(currentUser.photoURL)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
          : `<span class="user-chip__initial">${escapeHtml((name.trim()[0] || '◆').toUpperCase())}</span>`;
        slot.innerHTML = `
          <div class="user-menu" data-user-menu>
            <button class="user-chip" type="button" data-user-toggle aria-haspopup="true" aria-expanded="false">
              <span class="user-chip__avatar">${avatar}</span>
              <span class="user-chip__name">${first}</span>
              <span class="user-chip__caret" aria-hidden="true"></span>
            </button>
            <div class="user-dropdown" data-user-dropdown>
              <div class="user-dropdown__head">
                <span class="user-chip__avatar user-chip__avatar--lg">${avatar}</span>
                <div>
                  <strong>${escapeHtml(name)}</strong>
                  <small>${escapeHtml(currentUser.email || '')}</small>
                </div>
              </div>
              <a href="${accountHref}">${t('cabinet')}</a>
              <a href="${accountHref}#favorites">${t('favorites')}</a>
              <button type="button" data-auth-logout>${t('logout')}</button>
            </div>
          </div>`;
      } else {
        slot.innerHTML = `<button class="btn btn--small btn--gold auth-signin-btn" type="button" data-auth-open>${t('signIn')}</button>`;
      }
    });
  }

  function closeUserMenu() {
    document.querySelectorAll('[data-user-menu]').forEach((m) => {
      m.classList.remove('is-open');
      m.querySelector('[data-user-toggle]')?.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------------------------------------------------------- auth gate */

  function createGate() {
    if (document.querySelector('[data-auth-gate]')) return;
    const gate = document.createElement('div');
    gate.className = 'auth-gate';
    gate.dataset.authGate = '';
    gate.innerHTML = `
      <div class="auth-gate__bg" aria-hidden="true"></div>
      <div class="auth-gate__panel" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
        <div class="auth-gate__brand">
          <img src="${assetPrefix}assets/brand-logo.webp" alt="TOVMASYAN Jeweler" width="112" height="112">
        </div>
        <p class="auth-gate__eyebrow">TOVMASYAN Jeweler</p>
        <h2 id="auth-gate-title" data-gate-title>${t('gateTitle')}</h2>
        <p class="auth-gate__text" data-gate-text>${t('gateText')}</p>
        <div class="auth-gate__action">${googleButton(t('signIn') === 'Մուտք' ? 'Մուտք Google-ով' : 'Войти через Google')}</div>
        <p class="auth-message" data-auth-message></p>
        <p class="auth-gate__note" data-gate-note>${t('gateNote')}</p>
        <div class="auth-gate__langs">
          <button type="button" data-lang-option="ru">Русский</button>
          <button type="button" data-lang-option="hy">Հայերեն</button>
        </div>
      </div>`;
    document.body.appendChild(gate);
  }

  function updateGate() {
    if (!configured) return;
    createGate();
    const gate = document.querySelector('[data-auth-gate]');
    if (!gate) return;
    const lang = getLang();
    gate.querySelector('[data-gate-title]').textContent = t('gateTitle');
    gate.querySelector('[data-gate-text]').textContent = t('gateText');
    gate.querySelector('[data-gate-note]').textContent = t('gateNote');
    const btnLabel = gate.querySelector('.gsi-material-button-contents');
    if (btnLabel) btnLabel.textContent = lang === 'hy' ? 'Մուտք Google-ով' : 'Войти через Google';
    gate.querySelectorAll('[data-lang-option]').forEach((b) => b.classList.toggle('is-active', b.dataset.langOption === lang));

    const hasSessionHint = localStorage.getItem(sessionHintKey) === '1';
    // While Firebase restores the session we must not flash the gate at a user
    // who is already signed in — only brand-new visitors see it immediately.
    const locked = !currentUser && (authResolved || !hasSessionHint);
    gate.classList.toggle('is-open', locked);
    gate.classList.toggle('is-checking', locked && !authResolved);
    document.body.classList.toggle('auth-locked', locked);
    document.body.classList.toggle('auth-pending', !currentUser && !authResolved && hasSessionHint);
    if (locked && !authResolved) setAuthMessage(t('checking'), 'info');
    else if (locked) setAuthMessage('', 'info');
    else setAuthMessage('', 'info');
  }

  function openModal() {
    updateGate();
    const gate = document.querySelector('[data-auth-gate]');
    if (gate && !currentUser) {
      gate.classList.add('is-open');
      document.body.classList.add('auth-locked');
    }
    if (!configured) {
      setAuthMessage('Firebase ещё не настроен: добавьте firebaseConfig в firebase-config.js.', 'warning');
    }
  }

  function closeModal() {
    const gate = document.querySelector('[data-auth-gate]');
    gate?.classList.remove('is-open');
    document.body.classList.remove('auth-locked');
  }

  /* --------------------------------------------------- language chooser */

  function createLangDialog() {
    if (document.querySelector('[data-lang-dialog]')) return;
    const dlg = document.createElement('div');
    dlg.className = 'lang-dialog';
    dlg.dataset.langDialog = '';
    dlg.innerHTML = `
      <div class="lang-dialog__backdrop"></div>
      <div class="lang-dialog__panel" role="dialog" aria-modal="true" aria-label="Язык / Լեզու">
        <span class="lang-dialog__mark" aria-hidden="true">◆</span>
        <h3>Выберите язык сайта</h3>
        <p>Ընտրեք կայքի լեզուն</p>
        <div class="lang-dialog__options">
          <button type="button" data-lang-pick="hy">
            <strong>Հայերեն</strong>
            <small>Armenian</small>
          </button>
          <button type="button" data-lang-pick="ru">
            <strong>Русский</strong>
            <small>Russian</small>
          </button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
  }

  function maybeAskLanguage() {
    if (!currentUser) return;
    if (localStorage.getItem(langKey) === 'ru' || localStorage.getItem(langKey) === 'hy') return;
    if (localStorage.getItem(langAskedKey) === '1' && !justLoggedIn) return;
    localStorage.setItem(langAskedKey, '1');
    createLangDialog();
    // show only after the gate is fully closed, never before login
    setTimeout(() => {
      if (!currentUser) return;
      document.querySelector('[data-lang-dialog]')?.classList.add('is-open');
    }, 420);
  }

  function closeLangDialog() {
    document.querySelector('[data-lang-dialog]')?.classList.remove('is-open');
  }

  /* ------------------------------------------------------------ firebase */

  async function loadFirebase() {
    if (!configured) return false;
    if (firebaseLoaded) return true;
    try {
      const [appMod, authMod, firestoreMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js')
      ]);
      firebase = { ...appMod, ...authMod, ...firestoreMod };
      app = firebase.initializeApp(config);
      auth = firebase.getAuth(app);
      db = firebase.getFirestore(app);
      firebaseLoaded = true;

      firebase.setPersistence?.(auth, firebase.browserLocalPersistence).catch(() => {});
      firebase.getRedirectResult(auth).catch((error) => console.warn('Redirect auth:', error));
      firebase.onAuthStateChanged(auth, async (user) => {
        const previousUid = localStorage.getItem(lastUidKey);
        currentUser = user;
        authResolved = true;
        if (user) {
          if (previousUid && previousUid !== user.uid) purgeAllUserData();
          purgeGuestData();
          localStorage.setItem(lastUidKey, user.uid);
          localStorage.setItem(sessionHintKey, '1');
          ensureUserDocument(user).catch(() => {});
          closeModal();
          maybeAskLanguage();
          justLoggedIn = false;
        } else {
          localStorage.removeItem(sessionHintKey);
          localStorage.removeItem(lastUidKey);
        }
        emit();
      });
      return true;
    } catch (error) {
      initError = error;
      authResolved = true;
      console.error(error);
      setAuthMessage('Не удалось загрузить систему входа. Проверьте интернет-соединение и обновите страницу.', 'error');
      updateGate();
      return false;
    }
  }

  async function ensureUserDocument(user) {
    if (!db || !user) return;
    try {
      await firebase.setDoc(firebase.doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        provider: user.providerData?.[0]?.providerId || '',
        language: getLang(),
        updatedAt: firebase.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Cannot save user profile:', error);
    }
  }

  async function loginGoogle() {
    if (!configured) { openModal(); return false; }
    const loaded = await loadFirebase();
    if (!loaded) return false;
    try {
      setAuthMessage('', 'info');
      justLoggedIn = true;
      const provider = new firebase.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await firebase.signInWithPopup(auth, provider);
      closeModal();
      toast(t('loggedIn'), 'success');
      return true;
    } catch (error) {
      const code = String(error?.code || '');
      if (code.includes('popup-blocked') || code.includes('popup-closed') || code.includes('cancelled-popup')) {
        if (code.includes('popup-blocked')) {
          const provider = new firebase.GoogleAuthProvider();
          await firebase.signInWithRedirect(auth, provider);
          return true;
        }
        setAuthMessage('Окно входа было закрыто. Попробуйте ещё раз.', 'warning');
        return false;
      }
      console.error(error);
      setAuthMessage(error.message || 'Ошибка входа через Google.', 'error');
      return false;
    }
  }

  async function logout() {
    try {
      if (auth && firebaseLoaded) await firebase.signOut(auth);
    } catch (error) {
      console.warn('Sign out:', error);
    }
    currentUser = null;
    authResolved = true;
    justLoggedIn = false;
    purgeAllUserData();
    try {
      localStorage.removeItem(sessionHintKey);
      localStorage.removeItem(lastUidKey);
    } catch (e) { /* ignore */ }
    closeUserMenu();
    closeLangDialog();
    emit();
    toast(t('loggedOut'), 'info');
  }

  /* ------------------------------------------------- favorites / orders */

  function productSnapshot(product) {
    return {
      productId: product.id || product.productId || product.name || 'custom',
      name: product.name || product.interest || 'Индивидуальный заказ',
      image: product.thumbnail || product.image || '',
      price: product.price || 'Цена по запросу',
      categoryLabel: product.categoryLabel || product.category || 'Украшение',
      url: product.url || window.location.href
    };
  }

  async function addFavorite(product) {
    const item = productSnapshot(product);
    if (currentUser && db) {
      await firebase.setDoc(firebase.doc(db, 'users', currentUser.uid, 'favorites', item.productId), {
        ...item, savedAt: firebase.serverTimestamp()
      }, { merge: true });
    } else {
      const list = localGet(favKey(), []).filter((x) => x.productId !== item.productId);
      list.unshift({ ...item, savedAt: Date.now() });
      localSet(favKey(), list);
    }
    updateFavoriteButtons();
    toast('Добавлено в избранное', 'success');
  }

  async function removeFavorite(productId) {
    if (currentUser && db) {
      await firebase.deleteDoc(firebase.doc(db, 'users', currentUser.uid, 'favorites', productId));
    } else {
      localSet(favKey(), localGet(favKey(), []).filter((x) => x.productId !== productId));
    }
    updateFavoriteButtons();
    toast('Удалено из избранного', 'info');
  }

  async function listFavorites() {
    if (currentUser && db) {
      const snap = await firebase.getDocs(firebase.collection(db, 'users', currentUser.uid, 'favorites'));
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return localGet(favKey(), []);
  }

  async function isFavorite(productId) {
    const list = await listFavorites();
    return list.some((item) => item.productId === productId || item.id === productId);
  }

  async function toggleFavorite(product) {
    const id = product.id || product.productId;
    if (!id) return;
    if (configured && !currentUser) { openModal(); return; }
    const exists = await isFavorite(id);
    if (exists) await removeFavorite(id); else await addFavorite(product);
  }

  async function saveOrder(order) {
    const item = { ...order, status: 'new', createdAtLocal: Date.now(), page: window.location.href };
    if (currentUser && db) {
      await firebase.addDoc(firebase.collection(db, 'users', currentUser.uid, 'orders'), {
        ...item, createdAt: firebase.serverTimestamp()
      });
    } else {
      const list = localGet(ordKey(), []);
      list.unshift(item);
      localSet(ordKey(), list.slice(0, 50));
    }
  }

  async function listOrders() {
    if (currentUser && db) {
      const snap = await firebase.getDocs(firebase.collection(db, 'users', currentUser.uid, 'orders'));
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0));
    }
    return localGet(ordKey(), []);
  }

  function findProduct(productId) {
    const products = window.TOVMASYAN_PRODUCTS || [];
    return products.find((p) => p.id === productId) || { id: productId, name: productId };
  }

  async function updateFavoriteButtons() {
    const buttons = document.querySelectorAll('[data-favorite-product]');
    if (!buttons.length) return;
    const favorites = await listFavorites().catch(() => []);
    const ids = new Set(favorites.map((item) => item.productId || item.id));
    buttons.forEach((btn) => {
      const active = ids.has(btn.dataset.favoriteProduct);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.innerHTML = active ? '★' : '☆';
      btn.title = active ? 'Удалить из избранного' : 'Добавить в избранное';
    });
  }

  /* -------------------------------------------------------------- events */

  document.addEventListener('click', async (event) => {
    const langPick = event.target.closest('[data-lang-pick]');
    if (langPick) {
      setLang(langPick.dataset.langPick);
      closeLangDialog();
      return;
    }
    const langOpt = event.target.closest('[data-lang-option]');
    if (langOpt) {
      event.preventDefault();
      setLang(langOpt.dataset.langOption);
      updateGate();
      return;
    }
    const userToggle = event.target.closest('[data-user-toggle]');
    if (userToggle) {
      event.preventDefault();
      const menu = userToggle.closest('[data-user-menu]');
      const open = menu.classList.toggle('is-open');
      userToggle.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!event.target.closest('[data-user-menu]')) closeUserMenu();

    const loginGoogleBtn = event.target.closest('[data-login-google]');
    if (loginGoogleBtn) {
      event.preventDefault();
      loginGoogleBtn.disabled = true;
      await loginGoogle();
      loginGoogleBtn.disabled = false;
      return;
    }
    const logoutBtn = event.target.closest('[data-auth-logout]');
    if (logoutBtn) { event.preventDefault(); await logout(); return; }

    const openBtn = event.target.closest('[data-auth-open]');
    if (openBtn) { event.preventDefault(); openModal(); return; }

    const favBtn = event.target.closest('[data-favorite-product]');
    if (favBtn) {
      event.preventDefault();
      await toggleFavorite(findProduct(favBtn.dataset.favoriteProduct));
      document.dispatchEvent(new CustomEvent('tovmasyan:favorites-changed'));
      return;
    }
    const orderLink = event.target.closest('[data-save-order]');
    if (orderLink) {
      const product = findProduct(orderLink.dataset.saveOrder);
      saveOrder({ type: 'product', productId: product.id, name: product.name, price: product.price, source: 'whatsapp-click' }).catch(console.warn);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeUserMenu();
  });

  document.addEventListener('tovmasyan:order-request', (event) => {
    saveOrder({
      type: 'form',
      name: event.detail?.interest || 'Заявка с сайта',
      customerName: event.detail?.name || '',
      message: event.detail?.message || '',
      source: 'form'
    }).catch(console.warn);
  });

  window.TovmasyanAuth = {
    configured,
    loadFirebase,
    onAuthChange,
    getUser: () => currentUser,
    isReady: () => authResolved,
    loginGoogle,
    logout,
    openModal,
    closeModal,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    listFavorites,
    listOrders,
    saveOrder,
    updateFavoriteButtons,
    getLang,
    setLang,
    googleButton,
    get initError() { return initError; }
  };

  function boot() {
    injectHeaderUI();
    updateHeaderState();
    applyLanguage();
    if (configured) {
      createGate();
      updateGate();
      loadFirebase();
    }
    document.dispatchEvent(new Event('tovmasyan:auth-ready'));
    setTimeout(updateFavoriteButtons, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
