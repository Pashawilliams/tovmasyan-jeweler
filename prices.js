/* Цены изделий: базовая цена в драмах + пересчет в другие валюты по текущему курсу. */
(() => {
  const KEY = 'tovmasyan_price_currency';
  const CACHE_KEY = 'tovmasyan_fx_cache';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const SOURCE = 'https://open.er-api.com/v6/latest/USD';

  const CURRENCIES = [
    { code: 'AMD', symbol: '֏', step: 1 },
    { code: 'USD', symbol: '$', step: 1 },
    { code: 'EUR', symbol: '€', step: 1 },
    { code: 'RUB', symbol: '₽', step: 10 },
  ];

  // запасные курсы (единиц валюты за 1 драм), если сеть недоступна
  const FALLBACK_USD = { AMD: 362.56, EUR: 0.8926, RUB: 85.03, USD: 1 };
  let perAmd = ratesFromUsd(FALLBACK_USD);

  function ratesFromUsd(usd) {
    const out = {};
    CURRENCIES.forEach(({ code }) => {
      out[code] = usd[code] && usd.AMD ? usd[code] / usd.AMD : (code === 'AMD' ? 1 : 0);
    });
    out.AMD = 1;
    return out;
  }

  let currency = 'AMD';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && CURRENCIES.some((c) => c.code === saved)) currency = saved;
  } catch (error) { /* приватный режим */ }

  const nbsp = '\u00A0';
  const group = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, nbsp);

  function format(amd) {
    const cfg = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
    const value = amd * (perAmd[cfg.code] || 0);
    if (!value) return `${group(amd)}${nbsp}֏`;
    const rounded = cfg.step > 1 ? Math.round(value / cfg.step) * cfg.step : value;
    const text = `${group(rounded)}${nbsp}${cfg.symbol}`;
    return cfg.code === 'AMD' ? text : `≈${nbsp}${text}`;
  }

  function paint() {
    document.querySelectorAll('[data-price-amd]').forEach((el) => {
      const amd = Number(el.getAttribute('data-price-amd'));
      if (!amd) return;
      const next = format(amd);
      if (el.textContent !== next) el.textContent = next;
    });
    document.querySelectorAll('[data-price-switch] button').forEach((btn) => {
      const on = btn.dataset.priceCurrency === currency;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function buildSwitchers() {
    document.querySelectorAll('[data-price-switch]').forEach((box) => {
      if (box.dataset.ready === '1') return;
      box.dataset.ready = '1';
      box.classList.add('price-switch');
      CURRENCIES.forEach(({ code }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.priceCurrency = code;
        btn.textContent = code;
        btn.addEventListener('click', () => {
          currency = code;
          try { localStorage.setItem(KEY, code); } catch (error) { /* ignore */ }
          paint();
        });
        box.appendChild(btn);
      });
    });
  }

  async function loadRates() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.at && Date.now() - cached.at < CACHE_TTL && cached.usd) {
          perAmd = ratesFromUsd(cached.usd);
          paint();
          return;
        }
      }
    } catch (error) { /* ignore */ }

    try {
      const res = await fetch(SOURCE, { cache: 'no-store' });
      const data = await res.json();
      if (data && data.rates && data.rates.AMD) {
        const usd = { AMD: data.rates.AMD, EUR: data.rates.EUR, RUB: data.rates.RUB, USD: 1 };
        perAmd = ratesFromUsd(usd);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), usd })); } catch (error) { /* ignore */ }
        paint();
      }
    } catch (error) { /* остаемся на запасных курсах */ }
  }

  function start() {
    buildSwitchers();
    paint();
    loadRates();
    const observer = new MutationObserver(() => {
      buildSwitchers();
      paint();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue && CURRENCIES.some((c) => c.code === e.newValue)) {
        currency = e.newValue;
        paint();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.TovmasyanPrices = { refresh: paint, format, get currency() { return currency; } };
})();
