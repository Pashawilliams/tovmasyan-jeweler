(() => {
  const config = window.TOVMASYAN_FIREBASE_CONFIG || {};
  const providers = window.TOVMASYAN_AUTH_PROVIDERS || { google: true, apple: false };
  const isProductPage = /\/products\//.test(window.location.pathname);
  const accountHref = '/account/';
  const catalogHref = '/catalog/';
  const productPrefix = '/';
  const configured = Boolean(config.apiKey && !String(config.apiKey).includes('PASTE') && !String(config.projectId || '').includes('PASTE'));

  let app = null;
  let auth = null;
  let db = null;
  let firebase = {};
  let currentUser = null;
  let firebaseLoaded = false;
  let initError = null;
  const listeners = new Set();

  const localFavoritesKey = 'tovmasyan_local_favorites';
  const localOrdersKey = 'tovmasyan_local_orders';

  function emit() {
    listeners.forEach((fn) => {
      try { fn(currentUser); } catch (error) { console.warn(error); }
    });
    updateHeaderState();
    updateFavoriteButtons();
  }

  function onAuthChange(fn) {
    listeners.add(fn);
    fn(currentUser);
    return () => listeners.delete(fn);
  }

  function normalizePhoto(url) {
    return url || `${productPrefix}assets/brand-logo-small.webp`;
  }

  function localGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function localSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  function injectHeaderLink() {
    document.querySelectorAll('.header-actions').forEach((actions) => {
      if (actions.querySelector('[data-auth-link]')) return;
      const link = document.createElement('a');
      link.className = 'auth-header-link';
      link.href = accountHref;
      link.dataset.authLink = '';
      link.innerHTML = '<span class="auth-header-link__avatar">◆</span><span data-auth-link-text>Войти</span>';
      const whatsapp = actions.querySelector('[data-whatsapp]');
      actions.insertBefore(link, whatsapp || actions.firstChild);
    });
  }

  function updateHeaderState() {
    document.querySelectorAll('[data-auth-link]').forEach((link) => {
      const text = link.querySelector('[data-auth-link-text]');
      const avatar = link.querySelector('.auth-header-link__avatar');
      if (currentUser) {
        const name = currentUser.displayName || currentUser.email || 'Аккаунт';
        text.textContent = name.split(' ')[0];
        if (currentUser.photoURL) {
          avatar.innerHTML = `<img src="${currentUser.photoURL}" alt="" referrerpolicy="no-referrer">`;
        } else {
          avatar.textContent = name.trim()[0]?.toUpperCase() || '◆';
        }
      } else {
        text.textContent = configured ? 'Войти' : 'Аккаунт';
        avatar.textContent = '◆';
      }
    });
  }

  function createModal() {
    if (document.querySelector('[data-auth-modal]')) return;
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.dataset.authModal = '';
    modal.innerHTML = `
      <div class="auth-modal__backdrop" data-auth-close></div>
      <div class="auth-modal__panel" role="dialog" aria-modal="true" aria-label="Вход TOVMASYAN Jeweler">
        <button class="auth-modal__close" type="button" data-auth-close aria-label="Закрыть">×</button>
        <div class="auth-modal__brand">
          <img src="${productPrefix}assets/brand-logo-small.webp" alt="TOVMASYAN Jeweler">
          <div><span>TOVMASYAN</span><small>Jeweler account</small></div>
        </div>
        <h2>Войти в личный кабинет</h2>
        <p>Сохраняйте избранные изделия, отправляйте заявки и возвращайтесь к своим заказам.</p>
        <div class="auth-modal__buttons">
          <button class="gsi-material-button" type="button" data-login-google><div class="gsi-material-button-state"></div><div class="gsi-material-button-content-wrapper"><div class="gsi-material-button-icon"><svg class="gsi-material-button__icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg></div><span class="gsi-material-button-contents">Войти через Google</span><span style="display:none">Войти через Google</span></div></button>
          <button class="auth-provider-btn" type="button" data-login-apple><span></span> Продолжить через Apple ID</button>
        </div>
        <p class="auth-message" data-auth-message></p>
        <a class="auth-modal__account" href="${accountHref}">Открыть личный кабинет</a>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target.matches('[data-auth-close]')) closeModal();
    });
  }

  function openModal() {
    createModal();
    document.querySelector('[data-auth-modal]')?.classList.add('is-open');
    if (!configured) {
      setAuthMessage('Firebase ещё не настроен. Техническая часть на сайте готова — нужно добавить firebaseConfig из Firebase Console.', 'warning');
    } else if (!firebaseLoaded) {
      setAuthMessage('Загружаем защищённую систему входа...', 'info');
    } else {
      setAuthMessage('Выберите удобный способ входа.', 'info');
    }
  }

  function closeModal() {
    document.querySelector('[data-auth-modal]')?.classList.remove('is-open');
  }

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

      firebase.getRedirectResult(auth).catch((error) => console.warn('Redirect auth:', error));
      firebase.onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) await ensureUserDocument(user);
        emit();
      });
      return true;
    } catch (error) {
      initError = error;
      console.error(error);
      setAuthMessage('Не удалось загрузить Firebase. Проверьте интернет, домен и настройки Firebase.', 'error');
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
        updatedAt: firebase.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Cannot save user profile:', error);
    }
  }

  async function loginGoogle() {
    if (!configured) {
      openModal();
      return false;
    }
    const loaded = await loadFirebase();
    if (!loaded) return false;
    try {
      const provider = new firebase.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await firebase.signInWithPopup(auth, provider);
      closeModal();
      toast('Вы вошли через Google', 'success');
      return true;
    } catch (error) {
      if (String(error?.code || '').includes('popup') || String(error?.message || '').includes('popup')) {
        const provider = new firebase.GoogleAuthProvider();
        await firebase.signInWithRedirect(auth, provider);
        return true;
      }
      console.error(error);
      setAuthMessage(error.message || 'Ошибка входа через Google.', 'error');
      return false;
    }
  }

  async function loginApple() {
    if (!providers.apple) {
      setAuthMessage('Apple ID подготовлен в интерфейсе, но для реального входа нужен Apple Developer аккаунт и настройка Apple provider в Firebase.', 'warning');
      return false;
    }
    const loaded = await loadFirebase();
    if (!loaded) return false;
    try {
      const provider = new firebase.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await firebase.signInWithPopup(auth, provider);
      closeModal();
      toast('Вы вошли через Apple ID', 'success');
      return true;
    } catch (error) {
      console.error(error);
      setAuthMessage(error.message || 'Ошибка входа через Apple ID.', 'error');
      return false;
    }
  }

  async function logout() {
    if (auth && firebaseLoaded) await firebase.signOut(auth);
    currentUser = null;
    emit();
    toast('Вы вышли из аккаунта', 'info');
  }

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
        ...item,
        savedAt: firebase.serverTimestamp()
      }, { merge: true });
    } else {
      const list = localGet(localFavoritesKey, []);
      const filtered = list.filter((x) => x.productId !== item.productId);
      filtered.unshift({ ...item, savedAt: Date.now() });
      localSet(localFavoritesKey, filtered);
    }
    updateFavoriteButtons();
    toast('Добавлено в избранное', 'success');
  }

  async function removeFavorite(productId) {
    if (currentUser && db) {
      await firebase.deleteDoc(firebase.doc(db, 'users', currentUser.uid, 'favorites', productId));
    } else {
      const list = localGet(localFavoritesKey, []).filter((x) => x.productId !== productId);
      localSet(localFavoritesKey, list);
    }
    updateFavoriteButtons();
    toast('Удалено из избранного', 'info');
  }

  async function listFavorites() {
    if (currentUser && db) {
      const snap = await firebase.getDocs(firebase.collection(db, 'users', currentUser.uid, 'favorites'));
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return localGet(localFavoritesKey, []);
  }

  async function isFavorite(productId) {
    const list = await listFavorites();
    return list.some((item) => item.productId === productId || item.id === productId);
  }

  async function toggleFavorite(product) {
    const id = product.id || product.productId;
    if (!id) return;
    if (configured && !currentUser) {
      openModal();
      setAuthMessage('Войдите, чтобы сохранить изделие в избранное на всех устройствах.', 'info');
      return;
    }
    const exists = await isFavorite(id);
    if (exists) await removeFavorite(id); else await addFavorite(product);
  }

  async function saveOrder(order) {
    const item = {
      ...order,
      status: 'new',
      createdAtLocal: Date.now(),
      page: window.location.href
    };
    if (currentUser && db) {
      await firebase.addDoc(firebase.collection(db, 'users', currentUser.uid, 'orders'), {
        ...item,
        createdAt: firebase.serverTimestamp()
      });
    } else {
      const list = localGet(localOrdersKey, []);
      list.unshift(item);
      localSet(localOrdersKey, list.slice(0, 50));
    }
  }

  async function listOrders() {
    if (currentUser && db) {
      const col = firebase.collection(db, 'users', currentUser.uid, 'orders');
      const snap = await firebase.getDocs(col);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0));
    }
    return localGet(localOrdersKey, []);
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
      const id = btn.dataset.favoriteProduct;
      const active = ids.has(id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.innerHTML = active ? '★' : '☆';
      btn.title = active ? 'Удалить из избранного' : 'Добавить в избранное';
    });
  }

  document.addEventListener('click', async (event) => {
    const loginGoogleBtn = event.target.closest('[data-login-google]');
    if (loginGoogleBtn) {
      event.preventDefault();
      await loginGoogle();
      return;
    }
    const loginAppleBtn = event.target.closest('[data-login-apple]');
    if (loginAppleBtn) {
      event.preventDefault();
      await loginApple();
      return;
    }
    const logoutBtn = event.target.closest('[data-auth-logout]');
    if (logoutBtn) {
      event.preventDefault();
      await logout();
      return;
    }
    const openBtn = event.target.closest('[data-auth-open]');
    if (openBtn) {
      event.preventDefault();
      openModal();
      return;
    }
    const favBtn = event.target.closest('[data-favorite-product]');
    if (favBtn) {
      event.preventDefault();
      const product = findProduct(favBtn.dataset.favoriteProduct);
      await toggleFavorite(product);
      document.dispatchEvent(new CustomEvent('tovmasyan:favorites-changed'));
      return;
    }
    const orderLink = event.target.closest('[data-save-order]');
    if (orderLink) {
      const product = findProduct(orderLink.dataset.saveOrder);
      saveOrder({
        type: 'product',
        productId: product.id,
        name: product.name,
        price: product.price,
        source: 'whatsapp-click'
      }).catch(console.warn);
    }
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
    loginGoogle,
    loginApple,
    logout,
    openModal,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    listFavorites,
    listOrders,
    saveOrder,
    updateFavoriteButtons,
    get initError() { return initError; }
  };

  injectHeaderLink();
  createModal();
  updateHeaderState();
  document.dispatchEvent(new Event('tovmasyan:auth-ready'));
  if (configured) loadFirebase();
  setTimeout(updateFavoriteButtons, 250);
})();
