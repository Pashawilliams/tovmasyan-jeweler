/* ===========================================================================
   TOVMASYAN Jeweler — live gold & silver rate board.
   Live world market price -> price per gram for every purity we work with.
   =========================================================================== */
(function () {
  'use strict';

  /* ---- The only numbers the jeweler ever needs to change --------------- */
  const MARGIN = {
    buy: -0.030,   // we buy metal 3.0% below the world market price
    sell: 0.020    // we sell 2.0% above the world market price
  };

  // Our own correction on gold against the world market price.
  const GOLD_PREMIUM = -0.10;  // −10%

  const TROY_OUNCE_G = 31.1034768;
  const REFRESH_MS = 5 * 60 * 1000;      // re-poll the market every 5 minutes
  const CACHE_MS = 2 * 60 * 1000;        // do not hammer the API on every page view
  const BASELINE_MAX_AGE = 40 * 60 * 60 * 1000;

  const ROWS = [
    { metal: 'gold', purity: '999.9', karat: '24K', fineness: 0.9999, featured: true },
    { metal: 'gold', purity: '958', karat: '23K', fineness: 0.958 },
    { metal: 'gold', purity: '750', karat: '18K', fineness: 0.750 },
    { metal: 'gold', purity: '585', karat: '14K', fineness: 0.585, featured: true },
    { metal: 'gold', purity: '375', karat: '9K', fineness: 0.375 },
    { metal: 'silver', purity: '925', karat: '—', fineness: 0.925 }
  ];

  const SOURCES = {
    gold: 'https://api.gold-api.com/price/XAU',
    silver: 'https://api.gold-api.com/price/XAG',
    amd: 'https://open.er-api.com/v6/latest/USD'
  };

  const board = document.querySelector('[data-gold-board]');
  if (!board) return;

  const tbody = board.querySelector('[data-rate-rows]');
  const clockEl = board.querySelector('[data-rate-clock]');
  const stampEl = board.querySelector('[data-rate-updated]');
  const rateEl = board.querySelector('[data-rate-usdamd]');
  const statusEl = board.querySelector('[data-rate-status]');
  const currencyButtons = board.querySelectorAll('[data-rate-currency]');

  let currency = localStorage.getItem('tovmasyan_rate_currency') || 'USD';
  let market = null;

  /* ------------------------------ helpers ------------------------------ */
  function fmt(value, cur) {
    if (!isFinite(value)) return '—';
    return cur === 'AMD'
      ? Math.round(value).toLocaleString('ru-RU')
      : value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function symbol(cur) { return cur === 'AMD' ? '֏' : '$'; }

  function tick() {
    if (!clockEl) return;
    clockEl.textContent = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Yerevan'
    }).format(new Date());
  }

  async function getJSON(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  /* --------- 24h baseline: shared daily snapshot, local fallback -------- */
  async function loadBaseline(now) {
    try {
      const shared = await getJSON('/data/gold-baseline.json');
      const age = now - new Date(shared.capturedAt).getTime();
      if (age > 0 && age < BASELINE_MAX_AGE && shared.gold > 0) {
        return { gold: shared.gold, silver: shared.silver, shared: true };
      }
    } catch (error) { /* file absent or stale — fall back to this browser */ }
    try {
      const own = JSON.parse(localStorage.getItem('tovmasyan_rate_baseline') || 'null');
      if (own && now - own.t > 60 * 60 * 1000 && now - own.t < BASELINE_MAX_AGE) return own;
    } catch (error) { /* ignore */ }
    return null;
  }

  function rememberBaseline(now, gold, silver) {
    try {
      const own = JSON.parse(localStorage.getItem('tovmasyan_rate_baseline') || 'null');
      if (!own || now - own.t > 24 * 60 * 60 * 1000) {
        localStorage.setItem('tovmasyan_rate_baseline', JSON.stringify({ t: now, gold, silver }));
      }
    } catch (error) { /* storage blocked — the board still works */ }
  }

  /* ------------------------------ market ------------------------------- */
  async function fetchMarket() {
    const cached = (() => {
      try {
        const raw = JSON.parse(sessionStorage.getItem('tovmasyan_rate_cache') || 'null');
        return raw && Date.now() - raw.at < CACHE_MS ? raw : null;
      } catch (error) { return null; }
    })();
    if (cached) return cached;

    const [gold, silver, fx] = await Promise.all([
      getJSON(SOURCES.gold),
      getJSON(SOURCES.silver).catch(() => null),
      getJSON(SOURCES.amd).catch(() => null)
    ]);

    const now = Date.now();
    const data = {
      at: now,
      goldOz: gold.price,
      silverOz: silver ? silver.price : null,
      amd: fx && fx.rates ? fx.rates.AMD : null,
      updatedAt: gold.updatedAt || new Date(now).toISOString()
    };
    const baseline = await loadBaseline(now);
    data.prevGoldOz = baseline ? baseline.gold : null;
    data.prevSilverOz = baseline ? baseline.silver : null;
    rememberBaseline(now, data.goldOz, data.silverOz);

    try { sessionStorage.setItem('tovmasyan_rate_cache', JSON.stringify(data)); } catch (error) { /* ignore */ }
    return data;
  }

  /* ------------------------------ render ------------------------------- */
  function render() {
    if (!market || !tbody) return;
    const usdToAmd = market.amd;
    const useAmd = currency === 'AMD' && usdToAmd;
    const factor = useAmd ? usdToAmd : 1;
    const sym = symbol(useAmd ? 'AMD' : 'USD');

    tbody.innerHTML = ROWS.map((row) => {
      const oz = row.metal === 'gold' ? market.goldOz : market.silverOz;
      const prevOz = row.metal === 'gold' ? market.prevGoldOz : market.prevSilverOz;
      if (!oz) return '';

      const premium = row.metal === 'gold' ? 1 + GOLD_PREMIUM : 1;
      const perGram = (oz / TROY_OUNCE_G) * row.fineness * premium;
      const buy = perGram * (1 + MARGIN.buy) * factor;
      const sell = perGram * (1 + MARGIN.sell) * factor;

      let changeCell = '<span class="rate-change is-flat">—</span>';
      if (prevOz) {
        const prevGram = (prevOz / TROY_OUNCE_G) * row.fineness * premium * (1 + MARGIN.sell) * factor;
        const diff = sell - prevGram;
        const pct = prevGram ? (diff / prevGram) * 100 : 0;
        const dir = diff > 0.0001 ? 'is-up' : diff < -0.0001 ? 'is-down' : 'is-flat';
        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
        changeCell = `<span class="rate-change ${dir}">${sign}${fmt(Math.abs(diff), useAmd ? 'AMD' : 'USD')}
          <small>${sign}${Math.abs(pct).toFixed(2)}%</small></span>`;
      }

      return `
        <tr${row.featured ? ' class="is-featured"' : ''}>
          <th scope="row">
            <span class="rate-purity">${row.purity}</span>
            <span class="rate-metal">${row.metal === 'gold' ? 'Золото' : 'Серебро'}</span>
          </th>
          <td class="rate-karat">${row.karat}</td>
          <td class="rate-buy">${sym}&nbsp;${fmt(buy, useAmd ? 'AMD' : 'USD')}</td>
          <td class="rate-sell">${sym}&nbsp;${fmt(sell, useAmd ? 'AMD' : 'USD')}</td>
          <td class="rate-delta">${changeCell}</td>
        </tr>`;
    }).join('');

    if (stampEl) {
      stampEl.textContent = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Asia/Yerevan'
      }).format(new Date(market.updatedAt));
    }
    if (rateEl) rateEl.textContent = usdToAmd ? `1 $ = ${usdToAmd.toFixed(2)} ֏` : '';
    board.classList.add('is-ready');
    board.classList.remove('is-error');
    if (statusEl) statusEl.textContent = '';

    currencyButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.rateCurrency === currency);
      btn.setAttribute('aria-pressed', String(btn.dataset.rateCurrency === currency));
    });
    if (window.TovmasyanI18n && window.TovmasyanI18n.getLang() !== 'ru') window.TovmasyanI18n.apply();
  }

  function showError() {
    board.classList.add('is-error');
    board.classList.remove('is-ready');
    if (statusEl) statusEl.textContent = 'Биржевые данные временно недоступны. Актуальную цену уточните по телефону.';
  }

  async function refresh() {
    try {
      market = await fetchMarket();
      render();
    } catch (error) {
      console.warn('Rate board:', error && error.message);
      if (!market) showError();
    }
  }

  async function ensureFxRate() {
    if (!market || market.amd) return;
    try {
      const fx = await getJSON(SOURCES.amd);
      if (fx && fx.rates && fx.rates.AMD) {
        market.amd = fx.rates.AMD;
        try { sessionStorage.setItem('tovmasyan_rate_cache', JSON.stringify(market)); } catch (error) { /* ignore */ }
      }
    } catch (error) { console.warn('FX rate:', error && error.message); }
  }

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      currency = btn.dataset.rateCurrency;
      try { localStorage.setItem('tovmasyan_rate_currency', currency); } catch (error) { /* ignore */ }
      if (currency === 'AMD') await ensureFxRate();          // never leave the button silent
      render();
      if (currency === 'AMD' && market && !market.amd && statusEl) {
        statusEl.textContent = 'Курс драма временно недоступен — цены показаны в долларах.';
      }
    });
  });

  tick();
  setInterval(tick, 1000);
  refresh();
  setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
