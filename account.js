function toAbs(u){ if(!u) return u; return /^(https?:|data:|\/)/.test(u) ? u : '/' + u.replace(/^\.?\//,''); }
(() => {
  function boot() {
    const products = window.TOVMASYAN_PRODUCTS || [];
    const auth = window.TovmasyanAuth;
    const root = document.querySelector('[data-account-root]');
    if (!root || !auth) return false;

    const productById = new Map(products.map((p) => [p.id, p]));

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
      if (!auth.configured) {
        return `
          <section class="account-panel account-panel--setup">
            <p class="eyebrow">Firebase setup</p>
            <h2>Система регистрации установлена, осталось активировать Firebase</h2>
            <p>Код входа через Google, личный кабинет, избранное и заявки уже добавлены на сайт. Для реальной авторизации нужно вставить <code>firebaseConfig</code> в файл <code>firebase-config.js</code> и добавить домен <code>www.tovmasyan.army</code> в Firebase Authorized domains.</p>
            <div class="account-actions"><button class="btn btn--gold" data-auth-open>Проверить вход</button><a class="btn btn--glass" href="/contacts/">Связаться</a></div>
          </section>`;
      }
      return `
        <section class="account-panel account-panel--login">
          <p class="eyebrow">Account</p>
          <h2>Войдите в личный кабинет</h2>
          <p>После входа можно сохранять избранные изделия, видеть заявки и готовить будущие заказы.</p>
          <div class="account-actions"><button class="gsi-material-button" type="button" data-login-google><div class="gsi-material-button-state"></div><div class="gsi-material-button-content-wrapper"><div class="gsi-material-button-icon"><svg class="gsi-material-button__icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg></div><span class="gsi-material-button-contents">Войти через Google</span><span style="display:none">Войти через Google</span></div></button><button class="btn btn--glass" data-login-apple>Apple ID</button></div>
        </section>`;
    }

    function profileView(user, favorites, orders) {
      const name = user.displayName || user.email || 'Клиент TOVMASYAN';
      const photo = user.photoURL || 'assets/brand-logo-small.webp';
      return `
        <section class="account-dashboard">
          <div class="account-profile">
            <img src="${photo}" alt="" referrerpolicy="no-referrer">
            <div><p class="eyebrow">Personal cabinet</p><h2>${name}</h2><p>${user.email || ''}</p></div>
            <button class="btn btn--glass" data-auth-logout>Выйти</button>
          </div>
          <div class="account-stats">
            <div><strong>${favorites.length}</strong><span>избранных изделий</span></div>
            <div><strong>${orders.length}</strong><span>заявок и заказов</span></div>
            <div><strong>Google</strong><span>реальная авторизация</span></div>
          </div>
          <div class="account-columns">
            <section class="account-section"><div class="account-section__head"><h3>Избранное</h3><a href="/catalog/">Открыть каталог</a></div>${favoritesView(favorites)}</section>
            <section class="account-section"><div class="account-section__head"><h3>Заявки</h3><a href="/contacts/">Новая заявка</a></div>${ordersView(orders)}</section>
          </div>
        </section>`;
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

    async function render() {
      const user = auth.getUser();
      if (!user) {
        root.innerHTML = loginView();
        return;
      }
      const [favorites, orders] = await Promise.all([
        auth.listFavorites().catch(() => []),
        auth.listOrders().catch(() => [])
      ]);
      root.innerHTML = profileView(user, favorites, orders);
    }

    auth.onAuthChange(render);
    document.addEventListener('tovmasyan:favorites-changed', render);
    render();
    return true;
  }

  if (!boot()) {
    document.addEventListener('tovmasyan:auth-ready', boot, { once: true });
    setTimeout(boot, 500);
  }
})();
