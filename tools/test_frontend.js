/* Frontend regression tests for TOVMASYAN Jeweler.
   Usage:  cd /tmp && npm i jsdom && node /home/user/tovmasyan-jeweler-site/tools/test_frontend.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const ROOT = '/home/user/tovmasyan-jeweler-site';
const errors = [];
let passed = 0;

function makeDom(pageRel, url) {
  const html = fs.readFileSync(path.join(ROOT, pageRel), 'utf8');
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.console.error = (...a) => errors.push('console.error ' + a.join(' '));
  if (!dom.window.CSS) dom.window.CSS = {};
  if (!dom.window.CSS.escape) dom.window.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  return dom;
}
function runScript(dom, rel) {
  try { dom.window.eval(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch (e) { errors.push(`${rel}: ${e.message}`); }
}
function ready(dom) {
  const w = dom.window;
  if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
}
function check(name, cond) {
  if (cond) passed++; else errors.push('FAILED: ' + name);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}
function tap(dom, el) {
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

(async () => {
  /* 1. brand new visitor */
  let dom = makeDom('index.html', 'https://www.tovmasyan.army/');
  ['firebase-config.js', 'script.js', 'auth.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  let d = dom.window.document;
  check('gate created', !!d.querySelector('[data-auth-gate]'));
  check('new visitor: gate open immediately', d.querySelector('[data-auth-gate]').classList.contains('is-open'));
  check('new visitor: body locked', d.body.classList.contains('auth-locked'));
  check('no language dialog before login', !d.querySelector('[data-lang-dialog]'));
  check('no Apple button', !d.querySelector('[data-login-apple]'));
  check('gate logo uses brand logo', /brand-logo\.webp/.test(d.querySelector('.auth-gate__brand img').getAttribute('src')));

  /* 2. returning visitor: no flash */
  dom = makeDom('index.html', 'https://www.tovmasyan.army/');
  dom.window.localStorage.setItem('tovmasyan_session_hint', '1');
  dom.window.localStorage.setItem('tovmasyan_lang', 'ru');
  ['firebase-config.js', 'script.js', 'auth.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  d = dom.window.document;
  check('returning visitor: no gate flash', !d.querySelector('[data-auth-gate]').classList.contains('is-open'));
  check('returning visitor: not locked', !d.body.classList.contains('auth-locked'));

  /* 3. account page during session restore */
  dom = makeDom('account/index.html', 'https://www.tovmasyan.army/account/');
  dom.window.localStorage.setItem('tovmasyan_session_hint', '1');
  ['firebase-config.js', 'data/products.js', 'script.js', 'auth.js', 'account.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  let html = dom.window.document.querySelector('[data-account-root]').innerHTML;
  check('restoring: loader, not login form', html.includes('Проверяем вход') && !html.includes('Войдите в личный кабинет'));

  /* 4. favorites: star + toast when Firestore is unavailable (guest/offline path) */
  dom = makeDom('catalog/index.html', 'https://www.tovmasyan.army/catalog/');
  runScript(dom, 'firebase-config.js');
  dom.window.TOVMASYAN_FIREBASE_CONFIG = { apiKey: 'PASTE', projectId: 'PASTE' }; // force offline branch
  ['data/products.js', 'script.js', 'auth.js', 'catalog.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  d = dom.window.document;
  const A = dom.window.TovmasyanAuth;
  check('catalog renders 24 cards', d.querySelectorAll('[data-catalog-products] .product-card').length === 24);
  check('catalog images absolute', [...d.querySelectorAll('[data-catalog-products] img')].every((i) => i.getAttribute('src').startsWith('/assets/')));
  const star = d.querySelector('[data-favorite-product]');
  check('star button exists on card', !!star);
  await A.toggleFavorite({ id: star.dataset.favoriteProduct, name: 'Test' });
  check('star turns active (visual state)', star.classList.contains('is-active'));
  check('star glyph becomes ★', star.innerHTML.includes('★'));
  const toast = d.querySelector('[data-auth-toast]');
  check('toast appears', !!toast && toast.classList.contains('is-visible'));
  check('toast text correct', !!toast && toast.textContent.includes('Добавлено в избранное'));
  check('favorite persisted', (await A.listFavorites()).length === 1);
  await A.toggleFavorite({ id: star.dataset.favoriteProduct, name: 'Test' });
  check('second tap removes favorite', !star.classList.contains('is-active') && (await A.listFavorites()).length === 0);

  /* 5. product page: link targets and favorite button */
  dom = makeDom('products/aurora-ring/index.html', 'https://www.tovmasyan.army/products/aurora-ring/');
  ['firebase-config.js', 'data/products.js', 'script.js', 'auth.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  d = dom.window.document;
  check('product page has favorite button', !!d.querySelector('[data-favorite-product="aurora-ring"]'));
  check('product page has detail text', d.body.textContent.length > 800);
  check('product image absolute path', d.querySelector('.product-detail__media img').getAttribute('src').startsWith('/assets/'));

  /* 6. catalog card links are real navigable urls */
  dom = makeDom('catalog/index.html', 'https://www.tovmasyan.army/catalog/');
  ['firebase-config.js', 'data/products.js', 'script.js', 'auth.js', 'catalog.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  d = dom.window.document;
  const mediaLinks = [...d.querySelectorAll('.product-card__media')];
  check('every card media is a link', mediaLinks.length === 24 && mediaLinks.every((a) => a.tagName === 'A' && /^\/products\/.+\/$/.test(a.getAttribute('href'))));
  let defaultPrevented = false;
  const link = mediaLinks[0];
  link.addEventListener('click', (e) => { defaultPrevented = e.defaultPrevented; });
  tap(dom, link);
  check('tapping card is NOT blocked by JS', defaultPrevented === false);

  /* 7. storage isolation */
  dom = makeDom('index.html', 'https://www.tovmasyan.army/');
  ['firebase-config.js', 'script.js', 'auth.js'].forEach((f) => runScript(dom, f));
  ready(dom);
  const B = dom.window.TovmasyanAuth;
  await B.addFavorite({ id: 'x1', name: 'X' });
  check('guest key namespaced', Object.keys(dom.window.localStorage).includes('tovmasyan_fav_guest'));
  await B.logout();
  check('logout wipes local data', (await B.listFavorites()).length === 0);

  console.log(`\n${passed} passed, ${errors.filter((e) => e.startsWith('FAILED')).length} failed`);
  console.log('--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'none');
})();
