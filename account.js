function toAbs(u){ if(!u) return u; return /^(https?:|data:|\/)/.test(u) ? u : '/' + u.replace(/^\.?\//,''); }
(() => {
  function boot() {
    const products = window.TOVMASYAN_PRODUCTS || [];
    const auth = window.TovmasyanAuth;
    const root = document.querySelector('[data-account-root]');
    if (!root || !auth) return false;

    const productById = new Map(products.map((p) => [p.id, p]));

    function googleBtn() {
      const lang = (auth.getLang && auth.getLang()) || 'ru';
      const labels = { hy: 'Մուտք Google-ով', en: 'Sign in with Google', ru: 'Войти через Google' };
      const label = labels[lang] || labels.ru;
      return window.TOVMASYAN_GOOGLE_BUTTON ? window.TOVMASYAN_GOOGLE_BUTTON(label)
        : `<button class="btn btn--gold" type="button" data-login-google>${label}</button>`;
    }

    function productUrl(item) {
      const id = item.productId || item.id;
      return id && productById.has(id) ? `/products/${id}/` : '/catalog/';
    }

    function imageUrl(item) {
      const id = item.productId || item.id;
      const product = productById.get(id);
      return toAbs(item.image || product?.thumbnail || product?.image || 'assets/brand-logo-small.webp');
    }

    function loginView() {
      return `
        <section class="account-panel account-panel--login">
          <p class="eyebrow">Личный кабинет</p>
          <h2>Войдите в личный кабинет</h2>
          <p>После входа можно сохранять избранные изделия, видеть заявки и готовить будущие заказы.</p>
          <div class="account-actions account-actions--login">${googleBtn()}</div>
        </section>`;
    }

    function profileView(user, favorites, orders, pending = false) {
      const name = user.displayName || user.email || 'Клиент TOVMASYAN';
      const photo = user.photoURL || '/assets/brand-logo-small.webp';
      return `
        <section class="account-dashboard">
          <div class="account-profile">
            <img class="account-avatar" src="${photo}" alt="" referrerpolicy="no-referrer">
            <div><p class="eyebrow">Личный кабинет</p><h2>${name}</h2><p>${user.email || ''}</p></div>
            <button class="btn btn--glass" data-auth-logout>Выйти</button>
          </div>
          <div class="account-stats">
            <div><strong>${favorites.length}</strong><span>избранных изделий</span></div>
            <div><strong>${orders.length}</strong><span>заявок и заказов</span></div>
            <div><strong>Google</strong><span>защищённый вход</span></div>
          </div>
          <div class="account-columns">
            <section class="account-section" id="favorites"><div class="account-section__head"><h3>Избранное</h3><a href="/catalog/">Открыть каталог</a></div>${pending ? pendingList() : favoritesView(favorites)}</section>
            <section class="account-section"><div class="account-section__head"><h3>Заявки</h3><a href="/contacts/">Новая заявка</a></div>${pending ? pendingList() : ordersView(orders)}</section>
          </div>
        </section>`;
    }

    function pendingList() {
      return '<div class="account-items account-items--pending"><span class="sk sk--row"></span><span class="sk sk--row"></span></div>';
    }

    function favoritesView(items) {
      if (!items.length) return '<div class="empty-account-state"><p>Пока нет избранных изделий. Откройте каталог и нажмите звёздочку на понравившемся украшении.</p></div>';
      return `<div class="account-items">${items.map((item) => `
        <article class="account-item">
          <img src="${imageUrl(item)}" alt="${item.name || 'Изделие'}" loading="lazy" decoding="async">
          <div><h4>${item.name || 'Изделие'}</h4><p>${item.categoryLabel || item.price || 'Цена по запросу'}</p><a href="${productUrl(item)}">Смотреть</a></div>
          <button class="favorite-btn is-active" data-favorite-product="${item.productId || item.id}" aria-label="Удалить из избранного">★</button>
        </article>`).join('')}</div>`;
    }

    function ordersView(items) {
      if (!items.length) return '<div class="empty-account-state"><p>Заявки появятся здесь после отправки формы или нажатия кнопки заказа в WhatsApp.</p></div>';
      return `<div class="account-items">${items.map((item) => `
        <article class="account-item account-item--order">
          <div><h4>${item.name || item.interest || 'Заявка'}</h4><p>${item.message || item.price || 'Статус: новая заявка'}</p><small>${item.source || 'site'}</small></div>
          <span class="order-status">${item.status || 'new'}</span>
        </article>`).join('')}</div>`;
    }

    let renderToken = 0;

    function loadingView() {
      return `
        <section class="account-panel account-panel--loading" aria-busy="true">
          <div class="account-skeleton">
            <span class="sk sk--avatar"></span>
            <span class="sk sk--line sk--wide"></span>
            <span class="sk sk--line"></span>
          </div>
          <p class="account-loading-text">Проверяем вход…</p>
        </section>`;
    }

    async function render() {
      const token = ++renderToken;
      const ready = typeof auth.isReady === 'function' ? auth.isReady() : true;
      const user = auth.getUser();

      if (!user) {
        root.innerHTML = ready ? loginView() : loadingView();
        return;
      }

      // show the profile frame immediately, fill lists when they arrive
      root.innerHTML = profileView(user, [], [], true);

      const [favorites, orders] = await Promise.all([
        auth.listFavorites().catch(() => []),
        auth.listOrders().catch(() => [])
      ]);
      if (token !== renderToken) return;            // a newer render won
      if (auth.getUser()?.uid !== user.uid) return; // account switched mid-flight
      root.innerHTML = profileView(user, favorites, orders);
      if (typeof auth.updateFavoriteButtons === 'function') auth.updateFavoriteButtons();
    }

    auth.onAuthChange(render);
    document.addEventListener('tovmasyan:language-changed', render);
    document.addEventListener('tovmasyan:favorites-changed', render);
    render();
    return true;
  }

  if (!boot()) {
    document.addEventListener('tovmasyan:auth-ready', boot, { once: true });
    setTimeout(boot, 500);
  }
})();
