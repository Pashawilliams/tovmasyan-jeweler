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
  const PREMIUM = 1.10;   // our gold uplift
  const spotGram = (GOLD_OZ / OZ_G) * 0.9999 * PREMIUM;
  check('999.9 buy price = spot +10% −3%', Math.abs(buy - spotGram * 0.97) < 0.02, `${buy} vs ${(spotGram * 0.97).toFixed(2)}`);
  check('999.9 sell price = spot +10% +2%', Math.abs(sell - spotGram * 1.02) < 0.02, `${sell} vs ${(spotGram * 1.02).toFixed(2)}`);
  check('sell is above buy', sell > buy);

  const r585 = [...rows].find((r) => r.textContent.includes('585'));
  const sell585 = num(r585.querySelector('.rate-sell').textContent);
  check('585 is 58.5% of pure gold', Math.abs(sell585 / sell - 0.585 / 0.9999) < 0.001);

  const silverRow = [...rows].find((r) => r.textContent.includes('925'));
  const silverSell = num(silverRow.querySelector('.rate-sell').textContent);
  check('silver row present and cheaper than gold', silverRow && silverSell < sell);
  check('silver carries no gold uplift', Math.abs(silverSell - (SILVER_OZ / OZ_G) * 0.925 * 1.02) < 0.02, `${silverSell}`);

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

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log(failures.join('\n'));
  process.exit(failures.length ? 1 : 0);   // timers keep the event loop alive
})();
