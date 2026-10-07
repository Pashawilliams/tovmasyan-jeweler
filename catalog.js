function toAbs(u){ if(!u) return u; return /^(https?:|data:|\/)/.test(u) ? u : '/' + u.replace(/^\.?\//,''); }
(() => {
  const products = window.TOVMASYAN_PRODUCTS || [];
  const grid = document.querySelector('[data-catalog-products]');
  if (!grid) return;

  const searchInput = document.querySelector('[data-catalog-search]');
  const categorySelect = document.querySelector('[data-catalog-category]');
  const sortSelect = document.querySelector('[data-catalog-sort]');
  const count = document.querySelector('[data-catalog-count]');
  const clear = document.querySelector('[data-clear-filters]');

  const normalize = (value) => String(value || '').toLowerCase().trim();
  const matchesCategory = (product, category) => category === 'all' || product.category.split(' ').includes(category);
  const matchesSearch = (product, query) => {
    if (!query) return true;
    return [product.name, product.categoryLabel, product.collection, product.material, product.stones, product.short, ...(product.tags || [])]
      .some((field) => normalize(field).includes(query));
  };

  const productCard = (product, index) => {
    const tags = (product.tags || []).slice(0, 3).map((tag) => `<span>${tag}</span>`).join('');
    const image = toAbs(product.thumbnail || product.image);
    const message = `Здравствуйте! Пишу с сайта TOVMASYAN Jeweler. Меня интересует изделие: ${product.name}. Подскажите, пожалуйста, детали, наличие и цену.`;
    return `
      <article class="product-card reveal is-visible" data-category="${product.category}">
        <a class="product-card__media" href="/products/${product.id}/" aria-label="Открыть ${product.name}">
          <img src="${image}" alt="${product.name} — TOVMASYAN Jeweler" loading="lazy" decoding="async" width="560" height="360">
        </a>
        <button class="favorite-btn product-card__favorite" type="button" data-favorite-product="${product.id}" aria-label="Добавить ${product.name} в избранное">☆</button>
        <div class="product-card__body">
          <span class="product-card__tag">${product.categoryLabel} · ${product.collection}</span>
          <h3><a href="/products/${product.id}/">${product.name}</a></h3>
          <p>${product.short}</p>
          <div class="product-tags">${tags}</div>
          <dl class="mini-specs"><div><dt>Материал</dt><dd>${product.material}</dd></div><div><dt>Наличие</dt><dd>${product.availability}</dd></div></dl>
          <div class="product-card__bottom"><span>${product.price}</span><a href="${whatsappUrl(message)}" target="_blank" rel="noopener" class="order-link" data-save-order="${product.id}">Заказать</a></div>
        </div>
      </article>`;
  };

  function render() {
    const query = normalize(searchInput?.value);
    const category = categorySelect?.value || 'all';
    const sort = sortSelect?.value || 'default';
    let list = products.filter((product) => matchesCategory(product, category) && matchesSearch(product, query));
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sort === 'category') list = [...list].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, 'ru'));
    grid.innerHTML = list.map(productCard).join('') || `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос или сбросить фильтры.</p></div>`;
    if (count) count.textContent = list.length;
  }

  [searchInput, categorySelect, sortSelect].forEach((el) => el && el.addEventListener('input', render));
  clear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = 'all';
    if (sortSelect) sortSelect.value = 'default';
    render();
  });

  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get('category');
  if (categoryParam && categorySelect) categorySelect.value = categoryParam;
  render();
})();
