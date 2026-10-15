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
      return toAbs(item.image || product?.thumbnail || product?.image || 'assets/brand-logo-small.webp?v=88dd0bdf');
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

    function profileView(user, favorites, orders, pending = false, profile = {}) {
      const name = user.displayName || user.email || 'Клиент TOVMASYAN';
      const photo = user.photoURL || '/assets/brand-logo-small.webp?v=88dd0bdf';
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
          ${referralView(user, profile)}
        </section>`;
    }


    function referralView(user, profile) {
      const ref = window.TovmasyanReferral;
      if (!ref) return '';
      const code = ref.codeForUid(user.uid);
      const link = ref.inviteLink(code);
      const invitedBy = profile.referredBy || ref.invitedBy();
      const wa = 'https://wa.me/?text=' + encodeURIComponent(
        `Рекомендую TOVMASYAN Jeweler — золотые украшения в Ереване. По моему приглашению скидка ${ref.DISCOUNT}%: ${link}`
      );
      const mine = invitedBy && invitedBy === code;
      return `
        <section class="account-section referral-card">
          <div class="account-section__head">
            <h3>Приглашайте друзей</h3>
            <span class="referral-badge">−${ref.DISCOUNT}%</span>
          </div>
          <p class="referral-text">Друг получает скидку ${ref.DISCOUNT}% на первый заказ, а вы — скидку ${ref.DISCOUNT}% на следующий. Код добавляется в сообщение автоматически.</p>
          <div class="referral-code">
            <span class="referral-code__label">Ваш код</span>
            <strong data-referral-code>${code}</strong>
            <button class="btn btn--glass btn--small" type="button" data-copy="${code}">Скопировать</button>
          </div>
          <div class="referral-link">
            <input type="text" readonly value="${link}" data-referral-link aria-label="Ссылка-приглашение">
            <button class="btn btn--glass btn--small" type="button" data-copy="${link}">Копировать ссылку</button>
          </div>
          <div class="account-actions">
            <a class="btn btn--wa" href="${wa}" target="_blank" rel="noopener"><svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>Пригласить в WhatsApp</a>
          </div>
          ${invitedBy && !mine
            ? `<p class="referral-status is-on">Ваша скидка ${ref.DISCOUNT}% активна по приглашению ${invitedBy}. Назовите её при заказе.</p>`
            : '<p class="referral-status">Скидка появится здесь, как только вы придёте по приглашению друга.</p>'}
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

      const [favorites, orders, profile] = await Promise.all([
        auth.listFavorites().catch(() => []),
        auth.listOrders().catch(() => []),
        typeof auth.loadProfile === 'function' ? auth.loadProfile().catch(() => ({})) : Promise.resolve({})
      ]);
      if (token !== renderToken) return;            // a newer render won
      if (auth.getUser()?.uid !== user.uid) return; // account switched mid-flight
      root.innerHTML = profileView(user, favorites, orders, false, profile || {});
      if (typeof auth.updateFavoriteButtons === 'function') auth.updateFavoriteButtons();
    }

    root.addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-copy]');
      if (!btn) return;
      const value = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(value);
      } catch (error) {
        const tmp = document.createElement('textarea');
        tmp.value = value; document.body.appendChild(tmp); tmp.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        tmp.remove();
      }
      const old = btn.textContent;
      btn.textContent = 'Скопировано';
      btn.classList.add('is-copied');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('is-copied'); }, 1800);
    });

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
