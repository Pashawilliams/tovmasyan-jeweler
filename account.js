function toAbs(u){ if(!u) return u; return /^(https?:|data:|\/)/.test(u) ? u : '/' + u.replace(/^\.?\//,''); }
(() => {
  function boot() {
    const products = window.TOVMASYAN_PRODUCTS || [];
    const auth = window.TovmasyanAuth;
    const root = document.querySelector('[data-account-root]');
    if (!root || !auth) return false;

    const productById = new Map(products.map((p) => [p.id, p]));

    function googleBtn() {
      const hy = auth.getLang && auth.getLang() === 'hy';
      const label = hy ? 'Մուտք Google-ով' : 'Войти через Google';
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
          <p class="eyebrow">Личный кабинет</p>
          <h2>Войдите в личный кабинет</h2>
          <p>После входа можно сохранять избранные изделия, видеть заявки и готовить будущие заказы.</p>
          <div class="account-actions account-actions--login">${googleBtn()}</div>
        </section>`;
    }

    function profileView(user, favorites, orders) {
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
            <section class="account-section" id="favorites"><div class="account-section__head"><h3>Избранное</h3><a href="/catalog/">Открыть каталог</a></div>${favoritesView(favorites)}</section>
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
