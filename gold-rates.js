/* ===========================================================================
   TOVMASYAN Jeweler — live gold & silver rate board.
   World market price -> price per gram for every purity we work with,
   a live intraday chart, and a compact mode that expands on request.
   =========================================================================== */
(function () {
  'use strict';

  /* ---- The only numbers the jeweler ever needs to change --------------- */
  const MARGIN = { buy: -0.030 };   // buy price: 3.0% under the reference price
  const BUY_UPLIFT = 0.05;          // +5% on the buy price
  const GOLD_PREMIUM = -0.10;       // gold reference sits 10% under the world market

  /* Sell price follows the Yerevan retail level: a fixed share of the world
     market price per purity, so it keeps moving with the market on its own. */
  const SELL_RATIO = { pure: 0.9845, alloy: 0.9759, silver: 1.0868 };

  const TROY_OUNCE_G = 31.1034768;
  const REFRESH_MS = 30 * 1000;          // live: re-poll every 30 seconds
  const CACHE_MS = 20 * 1000;
  const BASELINE_MAX_AGE = 40 * 60 * 60 * 1000;
  const SERIES_KEY = 'tovmasyan_rate_series';
  const SERIES_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const SERIES_MAX_POINTS = 1200;

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
  const highlightEl = board.querySelector('[data-rate-highlight]');
  const chartCanvas = board.querySelector('[data-chart-canvas]');
  const chartLegend = board.querySelector('[data-chart-legend]');
  const toggleBtn = board.querySelector('[data-rate-toggle]');
  const toggleLabel = board.querySelector('[data-toggle-label]');
  const currencyButtons = board.querySelectorAll('[data-rate-currency]');
  const rangeButtons = board.querySelectorAll('[data-chart-range]');

  let currency = localStorage.getItem('tovmasyan_rate_currency') || 'USD';
  let chartRange = localStorage.getItem('tovmasyan_rate_range') || '24h';
  let market = null;
  let lastSellValues = {};

  /* ------------------------------ helpers ------------------------------ */
  function fmt(value, cur) {
    if (!isFinite(value)) return '—';
    return cur === 'AMD'
      ? Math.round(value).toLocaleString('ru-RU')
      : value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const symbol = (cur) => (cur === 'AMD' ? '֏' : '$');

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

  function sellRatioFor(row) {
    if (row.metal === 'silver') return SELL_RATIO.silver;
    return row.fineness >= 0.999 ? SELL_RATIO.pure : SELL_RATIO.alloy;
  }

  /* ---------------------- price history for the chart ------------------- */
  function readSeries() {
    try {
      const raw = JSON.parse(localStorage.getItem(SERIES_KEY) || '[]');
      const cutoff = Date.now() - SERIES_MAX_AGE;
      return Array.isArray(raw) ? raw.filter((p) => p && p.t > cutoff && isFinite(p.g)) : [];
    } catch (error) { return []; }
  }

  function pushSeries(point) {
    const series = readSeries();
    const last = series[series.length - 1];
    if (last && point.t - last.t < 15 * 1000 && Math.abs(point.g - last.g) < 0.0001) return series;
    series.push(point);
    const trimmed = series.slice(-SERIES_MAX_POINTS);
    try { localStorage.setItem(SERIES_KEY, JSON.stringify(trimmed)); } catch (error) { /* ignore */ }
    return trimmed;
  }

  /* --------- 24h baseline: shared daily snapshot, local fallback -------- */
  async function loadBaseline(now) {
    try {
      const shared = await getJSON('/data/gold-baseline.json');
      const age = now - new Date(shared.capturedAt).getTime();
      if (age > 0 && age < BASELINE_MAX_AGE && shared.gold > 0) {
        return { gold: shared.gold, silver: shared.silver, t: new Date(shared.capturedAt).getTime() };
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
      amd: fx && fx.rates ? fx.rates.AMD : (market && market.amd) || null,
      updatedAt: gold.updatedAt || new Date(now).toISOString()
    };
    const baseline = await loadBaseline(now);
    data.prevGoldOz = baseline ? baseline.gold : null;
    data.prevSilverOz = baseline ? baseline.silver : null;
    data.baselineAt = baseline ? baseline.t : null;
    rememberBaseline(now, data.goldOz, data.silverOz);

    try { sessionStorage.setItem('tovmasyan_rate_cache', JSON.stringify(data)); } catch (error) { /* ignore */ }
    return data;
  }

  /* ------------------------------- chart -------------------------------- */
  function buildChart() {
    if (!chartCanvas) return;
    const windowMs = chartRange === '7d' ? 7 * 24 * 3600e3 : 24 * 3600e3;
    const cutoff = Date.now() - windowMs;
    let points = readSeries().filter((p) => p.t >= cutoff);

    // seed the left edge with yesterday's official snapshot so the line has context
    if (market && market.prevGoldOz && market.baselineAt && market.baselineAt >= cutoff
      && !points.some((p) => Math.abs(p.t - market.baselineAt) < 60e3)) {
      points = [{ t: market.baselineAt, g: market.prevGoldOz }].concat(points);
    }
    points.sort((a, b) => a.t - b.t);

    if (points.length < 2) {
      chartCanvas.innerHTML = '<p class="rate-chart__empty">Накапливаем историю цен…</p>';
      if (chartLegend) chartLegend.textContent = '';
      return;
    }

    const useAmd = currency === 'AMD' && market && market.amd;
    const factor = useAmd ? market.amd : 1;
    const toSell = (oz) => (oz / TROY_OUNCE_G) * 0.9999 * SELL_RATIO.pure * factor;
    const values = points.map((p) => toSell(p.g));
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max - min) || Math.max(max * 0.001, 0.01);
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const dt = (t1 - t0) || 1;

    const W = 1000, H = 260, PAD = 18;
    const x = (t) => PAD + ((t - t0) / dt) * (W - PAD * 2);
    const y = (v) => H - PAD - ((v - min + span * 0.12) / (span * 1.24)) * (H - PAD * 2);

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(values[i]).toFixed(1)}`).join(' ');
    const area = `${line} L${x(t1).toFixed(1)} ${H - PAD} L${x(t0).toFixed(1)} ${H - PAD} Z`;
    const lastV = values[values.length - 1];
    const rising = lastV >= values[0];
    const stroke = rising ? '#157f3c' : '#b4402c';
    const cur = useAmd ? 'AMD' : 'USD';

    chartCanvas.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
           aria-label="График цены золота 999.9">
        <defs>
          <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${stroke}" stop-opacity="0.22"></stop>
            <stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" class="rate-chart__axis"></line>
        <path d="${area}" fill="url(#rateFill)"></path>
        <path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.5"
              stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
        <circle cx="${x(t1).toFixed(1)}" cy="${y(lastV).toFixed(1)}" r="5" fill="${stroke}"></circle>
      </svg>
      <span class="rate-chart__max">${symbol(cur)} ${fmt(max, cur)}</span>
      <span class="rate-chart__min">${symbol(cur)} ${fmt(min, cur)}</span>`;

    const diff = lastV - values[0];
    const pct = values[0] ? (diff / values[0]) * 100 : 0;
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
    if (chartLegend) {
      chartLegend.innerHTML = `<span class="${rising ? 'is-up' : 'is-down'}">${sign}${fmt(Math.abs(diff), cur)} `
        + `(${sign}${Math.abs(pct).toFixed(2)}%)</span> · <span>точек</span>: ${points.length}`;
    }
  }

  /* ------------------------------ render ------------------------------- */
  function render() {
    if (!market || !tbody) return;
    const useAmd = currency === 'AMD' && market.amd;
    const factor = useAmd ? market.amd : 1;
    const cur = useAmd ? 'AMD' : 'USD';
    const sym = symbol(cur);
    const nextSell = {};

    tbody.innerHTML = ROWS.map((row) => {
      const oz = row.metal === 'gold' ? market.goldOz : market.silverOz;
      const prevOz = row.metal === 'gold' ? market.prevGoldOz : market.prevSilverOz;
      if (!oz) return '';

      const premium = row.metal === 'gold' ? 1 + GOLD_PREMIUM : 1;
      const spotGram = (oz / TROY_OUNCE_G) * row.fineness;
      const perGram = spotGram * premium;
      const ratio = sellRatioFor(row);
      const buy = perGram * (1 + MARGIN.buy) * (1 + BUY_UPLIFT) * factor;
      const sell = spotGram * ratio * factor;
      nextSell[row.purity] = sell;

      const previous = lastSellValues[row.purity];
      const flash = previous === undefined || Math.abs(previous - sell) < 1e-9
        ? '' : (sell > previous ? ' is-flash-up' : ' is-flash-down');

      let changeCell = '<span class="rate-change is-flat">—</span>';
      if (prevOz) {
        const prevGram = (prevOz / TROY_OUNCE_G) * row.fineness * ratio * factor;
        const diff = sell - prevGram;
        const pct = prevGram ? (diff / prevGram) * 100 : 0;
        const dir = diff > 0.0001 ? 'is-up' : diff < -0.0001 ? 'is-down' : 'is-flat';
        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
        changeCell = `<span class="rate-change ${dir}">${sign}${fmt(Math.abs(diff), cur)}`
          + `<small>${sign}${Math.abs(pct).toFixed(2)}%</small></span>`;
      }

      return `
        <tr${row.featured ? ' class="is-featured"' : ''}>
          <th scope="row">
            <span class="rate-purity">${row.purity}</span>
            <span class="rate-metal">${row.metal === 'gold' ? 'Золото' : 'Серебро'}</span>
          </th>
          <td class="rate-karat">${row.karat}</td>
          <td class="rate-buy">${sym}&nbsp;${fmt(buy, cur)}</td>
          <td class="rate-sell${flash}">${sym}&nbsp;${fmt(sell, cur)}</td>
          <td class="rate-delta">${changeCell}</td>
        </tr>`;
    }).join('');

    renderHighlight(cur, factor);
    lastSellValues = nextSell;

    if (stampEl) {
      stampEl.textContent = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Asia/Yerevan'
      }).format(new Date(market.updatedAt));
    }
    if (rateEl) rateEl.textContent = market.amd ? `1 $ = ${market.amd.toFixed(2)} ֏` : '';
    board.classList.add('is-ready');
    board.classList.remove('is-error');
    if (statusEl && !statusEl.dataset.sticky) statusEl.textContent = '';

    currencyButtons.forEach((btn) => {
      const on = btn.dataset.rateCurrency === currency;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    rangeButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.chartRange === chartRange));

    buildChart();
    if (window.TovmasyanI18n && window.TovmasyanI18n.getLang() !== 'ru') window.TovmasyanI18n.apply();
  }

  // Compact strip, always visible — the two purities clients ask about most.
  function renderHighlight(cur, factor) {
    if (!highlightEl) return;
    const sym = symbol(cur);
    const cards = [
      { label: 'Золото 999.9', row: ROWS[0] },
      { label: 'Золото 585', row: ROWS[3] }
    ].map(({ label, row }) => {
      const oz = market.goldOz;
      const spotGram = (oz / TROY_OUNCE_G) * row.fineness;
      const sell = spotGram * sellRatioFor(row) * factor;
      let delta = '';
      if (market.prevGoldOz) {
        const prev = (market.prevGoldOz / TROY_OUNCE_G) * row.fineness * sellRatioFor(row) * factor;
        const diff = sell - prev;
        const pct = prev ? (diff / prev) * 100 : 0;
        const dir = diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : 'is-flat';
        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
        delta = `<span class="rate-highlight__delta ${dir}">${sign}${Math.abs(pct).toFixed(2)}%</span>`;
      }
      return `<div class="rate-highlight__card">
          <span class="rate-highlight__label">${label}</span>
          <span class="rate-highlight__value">${sym}&nbsp;${fmt(sell, cur)}</span>
          ${delta}
        </div>`;
    }).join('');
    highlightEl.innerHTML = cards + '<span class="rate-highlight__live">В реальном времени</span>';
  }

  function showError() {
    board.classList.add('is-error');
    board.classList.remove('is-ready');
    if (statusEl) statusEl.textContent = 'Биржевые данные временно недоступны. Актуальную цену уточните по телефону.';
  }

  async function refresh() {
    try {
      market = await fetchMarket();
      pushSeries({ t: market.at, g: market.goldOz });
      render();
    } catch (error) {
      console.warn('Rate board:', error && error.message);
      if (!market) showError();
    }
  }

  /* ------------------------------ controls ------------------------------ */
  async function ensureFxRate() {
    if (!market || market.amd) return;
    try {
      const fx = await getJSON(SOURCES.amd);
      if (fx && fx.rates && fx.rates.AMD) market.amd = fx.rates.AMD;
    } catch (error) { console.warn('FX rate:', error && error.message); }
  }

  currencyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      currency = btn.dataset.rateCurrency;
      try { localStorage.setItem('tovmasyan_rate_currency', currency); } catch (error) { /* ignore */ }
      if (currency === 'AMD') await ensureFxRate();          // never leave the button silent
      lastSellValues = {};                                   // a unit change is not a price change
      render();
      if (currency === 'AMD' && market && !market.amd && statusEl) {
        statusEl.textContent = 'Курс драма временно недоступен — цены показаны в долларах.';
      }
    });
  });

  rangeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      chartRange = btn.dataset.chartRange;
      try { localStorage.setItem('tovmasyan_rate_range', chartRange); } catch (error) { /* ignore */ }
      rangeButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      buildChart();
    });
  });

  function setExpanded(expanded) {
    board.classList.toggle('is-collapsed', !expanded);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(expanded));
    if (toggleLabel) toggleLabel.textContent = expanded ? 'Свернуть' : 'Показать все пробы и график';
    try { localStorage.setItem('tovmasyan_rate_open', expanded ? '1' : '0'); } catch (error) { /* ignore */ }
    if (expanded) buildChart();
    if (window.TovmasyanI18n && window.TovmasyanI18n.getLang() !== 'ru') window.TovmasyanI18n.apply();
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => setExpanded(board.classList.contains('is-collapsed')));
    setExpanded(localStorage.getItem('tovmasyan_rate_open') === '1');
  }

  tick();
  setInterval(tick, 1000);
  refresh();
  setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
