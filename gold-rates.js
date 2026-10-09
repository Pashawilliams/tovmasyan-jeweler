/* ===========================================================================
   TOVMASYAN Jeweler — live gold & silver rate board.
   World market price -> price per gram for every purity we work with,
   plus a candlestick chart that opens on request.
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
  const boardPanel = board.querySelector('[data-board-panel]');
  const boardToggle = board.querySelector('[data-board-toggle]');
  const boardToggleLabel = board.querySelector('[data-board-toggle-label]');
  const currencyButtons = board.querySelectorAll('[data-rate-currency]');
  const rangeButtons = board.querySelectorAll('[data-chart-range]');

  let currency = localStorage.getItem('tovmasyan_rate_currency') || 'USD';
  let chartRange = localStorage.getItem('tovmasyan_rate_range') || '7d';
  if (!['7d', '30d', '90d'].includes(chartRange)) chartRange = '7d';
  let history = [];                     // daily world price, USD per gram of fine gold
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

  /* ------- daily price history (real market data, same origin) --------- */
  async function loadHistory() {
    try {
      const data = await getJSON('/data/gold-history.json');
      const points = Array.isArray(data.points) ? data.points : [];
      history = points
        .map((p) => ({ t: Date.parse(p.d + 'T12:00:00Z'), g: Number(p.g) }))
        .filter((p) => isFinite(p.t) && isFinite(p.g))
        .sort((a, b) => a.t - b.t);
    } catch (error) { history = []; }
    return history;
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

  /* ------------------------------- chart --------------------------------
     Japanese candlesticks: every bucket of collected ticks becomes one candle
     (open, high, low, close), drawn in the sell price of gold 999.9.        */
  function buildCandles() {
    const days = chartRange === '90d' ? 93 : chartRange === '30d' ? 30 : 7;
    const cutoff = Date.now() - days * 24 * 3600e3;

    const useAmd = currency === 'AMD' && market && market.amd;
    const factor = useAmd ? market.amd : 1;
    // the chart shows the same Yerevan sell price as the 999.9 row of the table
    const toSell = (perGram) => perGram * 0.9999 * SELL_RATIO.pure * factor;

    const dayKey = (ts) => { const d = new Date(ts); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };

    // 1. one candle per trading day, from the published daily history
    const daily = history.filter((p) => p.t >= cutoff);
    const candles = [];
    let previous = null;
    const before = history.filter((p) => p.t < cutoff);
    if (before.length) previous = before[before.length - 1].g;
    daily.forEach((p) => {
      const open = toSell(previous === null ? p.g : previous);
      const close = toSell(p.g);
      candles.push({ t: dayKey(p.t), o: open, c: close, h: Math.max(open, close), l: Math.min(open, close) });
      previous = p.g;
    });

    // 2. today's candle is refined with our own live ticks (real high / low / close)
    const ticks = readSeries().filter((p) => p.t >= cutoff);
    if (ticks.length) {
      const grouped = new Map();
      ticks.forEach((p) => {
        const key = dayKey(p.t);
        const v = toSell(p.g / TROY_OUNCE_G);
        const c = grouped.get(key);
        if (!c) grouped.set(key, { t: key, o: v, h: v, l: v, c: v });
        else { c.h = Math.max(c.h, v); c.l = Math.min(c.l, v); c.c = v; }
      });
      grouped.forEach((live, key) => {
        const existing = candles.find((c) => c.t === key);
        if (existing) {
          existing.h = Math.max(existing.h, live.h);
          existing.l = Math.min(existing.l, live.l);
          existing.c = live.c;
        } else {
          const open = candles.length ? candles[candles.length - 1].c : live.o;
          candles.push({ t: key, o: open, c: live.c, h: Math.max(open, live.h), l: Math.min(open, live.l) });
        }
      });
    }

    return candles.sort((a, b) => a.t - b.t);
  }

  function buildChart() {
    if (!chartCanvas) return;
    const candles = buildCandles();

    if (candles.length < 2) {
      chartCanvas.innerHTML = '<p class="rate-chart__empty">Накапливаем историю цен…</p>';
      if (chartLegend) chartLegend.textContent = '';
      return;
    }

    const useAmd = currency === 'AMD' && market && market.amd;
    const cur = useAmd ? 'AMD' : 'USD';
    const max = Math.max(...candles.map((c) => c.h));
    const min = Math.min(...candles.map((c) => c.l));
    const span = (max - min) || Math.max(max * 0.001, 0.01);

    const W = 1000, H = 220, PAD_X = 16, PAD_Y = 18;
    const step = (W - PAD_X * 2) / candles.length;
    const bodyW = Math.max(2.5, Math.min(22, step * 0.56));
    const y = (v) => PAD_Y + (1 - (v - min + span * 0.1) / (span * 1.2)) * (H - PAD_Y * 2);

    const bodies = candles.map((c, i) => {
      const cx = PAD_X + step * (i + 0.5);
      const cls = c.c >= c.o ? 'is-up' : 'is-down';
      const top = y(Math.max(c.o, c.c));
      const height = Math.max(1.5, y(Math.min(c.o, c.c)) - top);
      return `<g class="rate-candle ${cls}">`
        + `<line x1="${cx.toFixed(1)}" y1="${y(c.h).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(c.l).toFixed(1)}"></line>`
        + `<rect x="${(cx - bodyW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bodyW.toFixed(1)}"`
        + ` height="${height.toFixed(1)}" rx="1"></rect></g>`;
    }).join('');

    const grid = [0.15, 0.5, 0.85].map((f) => {
      const yy = y(min + span * (1 - f)).toFixed(1);
      return `<line class="rate-chart__grid" x1="${PAD_X}" x2="${W - PAD_X}" y1="${yy}" y2="${yy}"></line>`;
    }).join('');

    chartCanvas.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
           aria-label="Свечной график цены золота 999.9">${grid}${bodies}</svg>
      <span class="rate-chart__max">${symbol(cur)} ${fmt(max, cur)}</span>
      <span class="rate-chart__min">${symbol(cur)} ${fmt(min, cur)}</span>`;

    const first = candles[0];
    const last = candles[candles.length - 1];
    const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
    chartCanvas.insertAdjacentHTML('beforeend',
      `<span class="rate-chart__from">${dateFmt.format(new Date(first.t))}</span>`
      + `<span class="rate-chart__to">${dateFmt.format(new Date(last.t))}</span>`);

    const diff = candles[candles.length - 1].c - candles[0].o;
    const pct = candles[0].o ? (diff / candles[0].o) * 100 : 0;
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
    if (chartLegend) {
      chartLegend.innerHTML = `<span class="${diff >= 0 ? 'is-up' : 'is-down'}">${sign}${fmt(Math.abs(diff), cur)} `
        + `(${sign}${Math.abs(pct).toFixed(2)}%)</span> · <span>свечей</span>: ${candles.length}`;
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

    if (board.classList.contains('is-open')) buildChart();
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

  function setBoardOpen(open, animate) {
    if (!boardPanel) return;
    board.classList.toggle('is-open', open);
    boardPanel.setAttribute('aria-hidden', String(!open));
    if (boardToggle) {
      boardToggle.setAttribute('aria-expanded', String(open));
      boardToggle.classList.toggle('is-active', open);
      boardToggle.setAttribute('aria-label', open ? 'Свернуть курс и график' : 'Развернуть курс и график');
    }
    if (boardToggleLabel) boardToggleLabel.textContent = open ? 'Свернуть' : 'Подробнее и график';
    try { localStorage.setItem('tovmasyan_board_open', open ? '1' : '0'); } catch (error) { /* ignore */ }
    if (!animate) {
      boardPanel.style.transition = 'none';
      requestAnimationFrame(() => { boardPanel.style.transition = ''; });
    }
    if (open) buildChart();
    if (window.TovmasyanI18n && window.TovmasyanI18n.getLang() !== 'ru') window.TovmasyanI18n.apply();
  }

  if (boardToggle) {
    boardToggle.addEventListener('click', () => setBoardOpen(!board.classList.contains('is-open'), true));
  }
  setBoardOpen(localStorage.getItem('tovmasyan_board_open') === '1', false);

  tick();
  setInterval(tick, 1000);
  loadHistory().then(() => { if (board.classList.contains('is-open')) buildChart(); });
  refresh();
  setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
