/* Rate board tests: math, currency switch, 24h change, Armenian, failure mode.
   Usage: cd /tmp && node /home/user/tovmasyan-jeweler-site/tools/test_rates.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const ROOT = '/home/user/tovmasyan-jeweler-site';
const DICT = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/hy.json'), 'utf8'));
let passed = 0; const failures = [];

function check(name, cond, extra) {
  if (cond) passed++; else failures.push(name + (extra ? ` (${extra})` : ''));
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : ' -> ' + extra}`);
}

const GOLD_OZ = 4189.2, SILVER_OZ = 61.01, AMD = 361.63, OZ_G = 31.1034768;
const BASE_GOLD = 4100;

function makeDom({ failMarket = false, withBaseline = true } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://www.tovmasyan.army/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.fetch = async (url) => {
    const u = String(url);
    const json = (data) => ({ ok: true, status: 200, json: async () => data });
    if (failMarket && u.includes('gold-api')) throw new Error('network down');
    if (u.includes('price/XAU')) return json({ price: GOLD_OZ, updatedAt: new Date().toISOString() });
    if (u.includes('price/XAG')) return json({ price: SILVER_OZ, updatedAt: new Date().toISOString() });
    if (u.includes('er-api')) return json({ rates: { AMD } });
    if (u.includes('gold-baseline')) {
      if (!withBaseline) return { ok: false, status: 404, json: async () => ({}) };
      return json({ capturedAt: new Date(Date.now() - 20 * 3600e3).toISOString(), gold: BASE_GOLD, silver: 60 });
    }
    if (u.includes('hy.json')) return json(DICT);
    return { ok: false, status: 404, json: async () => ({}) };
  };
  ['script.js', 'gold-rates.js', 'i18n.js'].forEach((f) => {
    try { w.eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
    catch (e) { failures.push(`${f}: ${e.message}`); }
  });
  return w;
}

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const num = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.'));

(async () => {
  /* ---------------- normal operation ---------------- */
  const w = makeDom();
  await wait(250);
  const rows = w.document.querySelectorAll('[data-rate-rows] tr');
  check('board rendered all six purities', rows.length === 6, `got ${rows.length}`);

  const first = rows[0];
  const buy = num(first.querySelector('.rate-buy').textContent);
  const sell = num(first.querySelector('.rate-sell').textContent);
  const PREMIUM = 0.90;      // buy reference: 10% below the world market
  const BUY_UP = 1.05;       // +5% on the buy price
  const R_PURE = 0.9845, R_ALLOY = 0.9759, R_SILVER = 1.0868;   // Yerevan retail sell level
  const pureGram = (GOLD_OZ / OZ_G) * 0.9999;
  const spotGram = pureGram * PREMIUM;
  check('999.9 buy price = reference −3% +5%', Math.abs(buy - spotGram * 0.97 * BUY_UP) < 0.02, `${buy} vs ${(spotGram * 0.97 * BUY_UP).toFixed(2)}`);
  check('999.9 sell price matches the Yerevan retail level', Math.abs(sell - pureGram * R_PURE) < 0.02, `${sell} vs ${(pureGram * R_PURE).toFixed(2)}`);
  check('sell is above buy', sell > buy);
  check('buy carries the +5% uplift', Math.abs(buy / (spotGram * 0.97) - 1.05) < 0.001, `${(buy / (spotGram * 0.97)).toFixed(4)}`);

  const r585 = [...rows].find((r) => r.textContent.includes('585'));
  const sell585 = num(r585.querySelector('.rate-sell').textContent);
  check('585 sell matches the Yerevan alloy level', Math.abs(sell585 - (GOLD_OZ / OZ_G) * 0.585 * R_ALLOY) < 0.02, `${sell585}`);
  const buy585 = num(r585.querySelector('.rate-buy').textContent);
  check('585 buy scales with purity', Math.abs(buy585 / buy - 0.585 / 0.9999) < 0.001);
  check('585 sell stays above 585 buy', sell585 > buy585);

  const silverRow = [...rows].find((r) => r.textContent.includes('925'));
  const silverSell = num(silverRow.querySelector('.rate-sell').textContent);
  check('silver row present and cheaper than gold', silverRow && silverSell < sell);
  check('silver follows its own retail level', Math.abs(silverSell - (SILVER_OZ / OZ_G) * 0.925 * R_SILVER) < 0.01, `${silverSell}`);

  /* ---------------- 24h change ---------------- */
  const delta = first.querySelector('.rate-change');
  check('24h change shown as growth (4100 -> 4189)', delta.classList.contains('is-up'), delta.textContent.trim());
  const pct = parseFloat(delta.querySelector('small').textContent.replace(/[^\d.]/g, ''));
  check('24h percent is correct', Math.abs(pct - ((GOLD_OZ - BASE_GOLD) / BASE_GOLD) * 100) < 0.05, `${pct}%`);

  /* ---------------- currency switch ---------------- */
  const amdBtn = w.document.querySelector('[data-rate-currency="AMD"]');
  amdBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(60);
  const amdSell = num(w.document.querySelector('[data-rate-rows] .rate-sell').textContent);
  check('AMD switch converts by the live FX rate', Math.abs(amdSell - sell * AMD) / (sell * AMD) < 0.01, `${amdSell}`);
  check('AMD shown with the dram sign', w.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('֏'));
  w.document.querySelector('[data-rate-currency="USD"]').dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(60);
  check('switching back restores dollars', w.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('$'));

  /* ---------------- clock & meta ---------------- */
  check('Yerevan clock is ticking', /^\d{2}:\d{2}:\d{2}$/.test(w.document.querySelector('[data-rate-clock]').textContent.trim()));
  check('USD/AMD rate displayed', w.document.querySelector('[data-rate-usdamd]').textContent.includes('֏'));
  check('update stamp filled', w.document.querySelector('[data-rate-updated]').textContent.trim() !== '—');

  /* ---------------- Armenian ---------------- */
  if (w.TovmasyanI18n) {
    w.localStorage.setItem('tovmasyan_lang', 'hy');
    await w.TovmasyanI18n.apply();
    await wait(250);
    const head = w.document.querySelector('#gold-rates-title').textContent;
    check('board title translated to Armenian', head.includes('Ոսկու'), head);
    const ths = [...w.document.querySelectorAll('.rate-table thead th')].map((t) => t.textContent.trim());
    check('table headers translated', ths.includes('Հարգ') && ths.includes('Առք') && ths.includes('Վաճառք'), ths.join('|'));
    check('numbers untouched by translation', w.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('$'));
  } else {
    failures.push('i18n engine missing');
  }

  /* ---------------- market unreachable ---------------- */
  const broken = makeDom({ failMarket: true });
  await wait(250);
  const board = broken.document.querySelector('[data-gold-board]');
  check('failure shows a polite notice, never a blank box', board.classList.contains('is-error')
    && broken.document.querySelector('[data-rate-status]').textContent.includes('уточните'));

  /* ---------------- no baseline file ---------------- */
  const noBase = makeDom({ withBaseline: false });
  await wait(250);
  const dash = noBase.document.querySelector('[data-rate-rows] .rate-change');
  check('without a baseline the 24h cell degrades to a dash', dash.textContent.trim() === '—', dash.textContent.trim());
  check('prices still render without a baseline', num(noBase.document.querySelector('[data-rate-rows] .rate-sell').textContent) > 0);

  /* ---------------- always-open board, chart on demand ---------------- */
  const board2 = w.document.querySelector('[data-gold-board]');
  const chartPanel = w.document.querySelector('[data-rate-chart]');
  check('board is open from the start', !board2.classList.contains('is-collapsed'));
  check('full purity table is visible without any click', w.document.querySelectorAll('[data-rate-rows] tr').length === 6);
  check('chart starts hidden', chartPanel.classList.contains('is-hidden'));

  const highlight = w.document.querySelector('[data-rate-highlight]');
  check('price strip shows 999.9 and 585', /999\.9/.test(highlight.textContent) && /585/.test(highlight.textContent));

  const chartBtn = w.document.querySelector('[data-chart-toggle]');
  chartBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(150);
  check('button opens the chart', !chartPanel.classList.contains('is-hidden'));
  check('open state is announced to screen readers', chartBtn.getAttribute('aria-expanded') === 'true');

  const svg = w.document.querySelector('[data-chart-canvas] svg');
  check('chart is drawn as an svg', Boolean(svg));
  const candles = svg ? svg.querySelectorAll('g.rate-candle') : [];
  check('candlesticks are rendered', candles.length >= 2, `${candles.length} candles`);
  check('each candle has a wick and a body', Boolean(candles[0] && candles[0].querySelector('line') && candles[0].querySelector('rect')));
  const upCount = svg ? svg.querySelectorAll('g.rate-candle.is-up').length : 0;
  const downCount = svg ? svg.querySelectorAll('g.rate-candle.is-down').length : 0;
  check('candles are coloured by direction', upCount + downCount === candles.length && upCount > 0, `up ${upCount} / down ${downCount}`);
  const firstBody = candles[0] && candles[0].querySelector('rect');
  check('candle body has a real height', firstBody && parseFloat(firstBody.getAttribute('height')) > 0);
  check('legend counts the candles', /свеч|մոմ/.test(w.document.querySelector('[data-chart-legend]').textContent));

  const sevenBtn = w.document.querySelector('[data-chart-range="7d"]');
  sevenBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(150);
  check('7-day range switches', sevenBtn.classList.contains('is-active'));
  check('7-day range draws fewer, wider candles',
    w.document.querySelectorAll('[data-chart-canvas] g.rate-candle').length <= candles.length,
    `${w.document.querySelectorAll('[data-chart-canvas] g.rate-candle').length} vs ${candles.length}`);

  chartBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(120);
  check('button hides the chart again', chartPanel.classList.contains('is-hidden'));
  check('table stays visible when the chart is hidden', w.document.querySelectorAll('[data-rate-rows] tr').length === 6);
  chartBtn.dispatchEvent(new w.Event('click', { bubbles: true }));
  await wait(120);

  /* a price move must be visibly flagged */
  const before = w.document.querySelector('[data-rate-rows] .rate-sell').textContent;
  w.fetch = async (url) => {
    const u = String(url);
    const json = (dd) => ({ ok: true, status: 200, json: async () => dd });
    if (u.includes('price/XAU')) return json({ price: GOLD_OZ + 40, updatedAt: new Date().toISOString() });
    if (u.includes('price/XAG')) return json({ price: SILVER_OZ, updatedAt: new Date().toISOString() });
    if (u.includes('er-api')) return json({ rates: { AMD } });
    if (u.includes('gold-baseline')) return json({ capturedAt: new Date(Date.now() - 20 * 3600e3).toISOString(), gold: BASE_GOLD, silver: 60 });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  w.sessionStorage.removeItem('tovmasyan_rate_cache');
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  await wait(400);
  const after = w.document.querySelector('[data-rate-rows] .rate-sell');
  check('price updates live without a reload', after.textContent !== before, `${before.trim()} -> ${after.textContent.trim()}`);
  check('a rise is highlighted in the table', after.classList.contains('is-flash-up'), after.className);

  /* ---------------- FX missing, then recovered ---------------- */
  const flaky = (() => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://www.tovmasyan.army/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    let fxCalls = 0;
    w.fetch = async (url) => {
      const u = String(url);
      const json = (d) => ({ ok: true, status: 200, json: async () => d });
      if (u.includes('price/XAU')) return json({ price: GOLD_OZ, updatedAt: new Date().toISOString() });
      if (u.includes('price/XAG')) return json({ price: SILVER_OZ, updatedAt: new Date().toISOString() });
      if (u.includes('er-api')) { fxCalls += 1; if (fxCalls === 1) throw new Error('fx down'); return json({ rates: { AMD } }); }
      if (u.includes('gold-baseline')) return json({ capturedAt: new Date(Date.now() - 20 * 3600e3).toISOString(), gold: BASE_GOLD, silver: 60 });
      return { ok: false, status: 404, json: async () => ({}) };
    };
    ['script.js', 'gold-rates.js'].forEach((f) => w.eval(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    return w;
  })();
  await wait(250);
  flaky.document.querySelector('[data-rate-currency="AMD"]').dispatchEvent(new flaky.Event('click', { bubbles: true }));
  await wait(200);
  check('AMD button re-fetches the rate after an earlier failure',
    flaky.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('֏'),
    flaky.document.querySelector('[data-rate-rows] .rate-sell').textContent.trim());

  /* ---------------- the preview file must be clickable ---------------- */
  const prevDom = new JSDOM(fs.readFileSync(path.join(ROOT, 'tools/preview-rate-board.html'), 'utf8'),
    { url: 'https://www.tovmasyan.army/', runScripts: 'dangerously', pretendToBeVisual: true });
  await wait(400);
  const pw = prevDom.window;
  const beforeTxt = pw.document.querySelector('[data-rate-rows] .rate-sell');
  check('preview renders prices by itself', beforeTxt && beforeTxt.textContent.includes('$'), beforeTxt && beforeTxt.textContent.trim());
  pw.document.querySelector('[data-rate-currency="AMD"]').dispatchEvent(new pw.Event('click', { bubbles: true }));
  await wait(200);
  check('preview currency switch actually switches',
    pw.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('֏'),
    pw.document.querySelector('[data-rate-rows] .rate-sell').textContent.trim());
  pw.document.querySelector('[data-rate-currency="USD"]').dispatchEvent(new pw.Event('click', { bubbles: true }));
  await wait(200);
  check('preview switches back to dollars',
    pw.document.querySelector('[data-rate-rows] .rate-sell').textContent.includes('$'));

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log(failures.join('\n'));
  process.exit(failures.length ? 1 : 0);   // timers keep the event loop alive
})();
