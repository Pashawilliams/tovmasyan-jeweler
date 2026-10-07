/* Multi-device sync tests: one shared fake cloud, two independent browsers.
   Usage: cd /tmp && npm i jsdom && node /home/user/tovmasyan-jeweler-site/tools/test_sync.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const ROOT = '/home/user/tovmasyan-jeweler-site';
const errors = [];
let passed = 0;

function check(name, cond) {
  if (cond) passed++; else errors.push('FAILED: ' + name);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

/* ---------- shared fake cloud (acts like Firestore for one account) ---------- */
function makeCloudBackend() {
  const favorites = new Map();
  const orders = [];
  const listeners = new Set();
  let online = true;
  const emit = () => listeners.forEach((fn) => fn([...favorites.values()]));
  return {
    state: { favorites, orders },
    setOnline(v) { online = v; },
    isOnline: () => online,
    listeners,
    emit,
    adapterFor() {
      return {
        available: () => online,
        async listFavorites() { if (!online) throw new Error('offline'); return [...favorites.values()]; },
        async setFavorite(item) { if (!online) throw new Error('offline'); favorites.set(item.productId, { ...item }); emit(); },
        async deleteFavorite(id) { if (!online) throw new Error('offline'); favorites.delete(id); emit(); },
        async addOrder(item) { if (!online) throw new Error('offline'); orders.push({ ...item }); },
        async listOrders() { if (!online) throw new Error('offline'); return [...orders]; },
        subscribe(onChange) { listeners.add(onChange); onChange([...favorites.values()]); return () => listeners.delete(onChange); }
      };
    }
  };
}

/* ---------- one "device" = its own DOM + its own localStorage ---------- */
function makeDevice(backend, label) {
  const html = fs.readFileSync(path.join(ROOT, 'catalog/index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://www.tovmasyan.army/catalog/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.console.error = (...a) => errors.push(`[${label}] ${a.join(' ')}`);
  if (!w.CSS) w.CSS = {};
  if (!w.CSS.escape) w.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  w.__TOVMASYAN_TEST_CLOUD__ = backend.adapterFor();
  // placeholder config -> auth.js will not try to load the real Firebase SDK
  w.eval(fs.readFileSync(path.join(ROOT, 'firebase-config.js'), 'utf8'));
  w.TOVMASYAN_FIREBASE_CONFIG = { apiKey: 'PASTE', projectId: 'PASTE' };
  ['data/products.js', 'script.js', 'auth.js', 'catalog.js'].forEach((f) => {
    try { w.eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
    catch (e) { errors.push(`[${label}] ${f}: ${e.message}`); }
  });
  if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return { dom, w, auth: w.TovmasyanAuth, label };
}

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const backend = makeCloudBackend();

  /* --- device A: add two favourites --- */
  const A = makeDevice(backend, 'PC');
  await A.auth.addFavorite({ id: 'aurora-ring', name: 'Aurora' });
  await A.auth.addFavorite({ id: 'monaco-bracelet', name: 'Monaco' });
  await wait();
  check('PC: two favourites saved', (await A.auth.listFavorites()).length === 2);
  check('cloud received both', backend.state.favorites.size === 2);

  /* --- device B signs in and sees them --- */
  const B = makeDevice(backend, 'Phone');
  const bList = await B.auth.listFavorites();
  check('Phone: sees favourites from cloud', bList.length === 2);

  /* --- THE BUG: delete on phone, must stay deleted everywhere --- */
  await B.auth.removeFavorite('aurora-ring');
  await wait();
  check('Phone: item removed locally', (await B.auth.listFavorites()).length === 1);
  check('cloud: item really deleted', !backend.state.favorites.has('aurora-ring'));

  const bAfterReload = makeDevice(backend, 'Phone-reload');
  check('Phone after page reload: stays deleted', (await bAfterReload.auth.listFavorites()).length === 1);

  const aAfterReload = makeDevice(backend, 'PC-reload');
  check('PC after reload: deletion propagated', (await aAfterReload.auth.listFavorites()).length === 1);
  check('PC: deleted item does NOT resurrect', !(await aAfterReload.auth.listFavorites()).some((i) => i.productId === 'aurora-ring'));

  /* --- live push: delete on one device updates the other without reload --- */
  const liveA = makeDevice(backend, 'Live-A');
  const liveB = makeDevice(backend, 'Live-B');
  await liveA.auth.addFavorite({ id: 'stella-earrings', name: 'Stella' });
  await wait();
  check('live: second device got the addition instantly', (await liveB.auth.listFavorites()).some((i) => i.productId === 'stella-earrings'));
  await liveA.auth.removeFavorite('stella-earrings');
  await wait();
  check('live: second device got the deletion instantly', !(await liveB.auth.listFavorites()).some((i) => i.productId === 'stella-earrings'));

  /* --- offline deletion must survive and reach the cloud later --- */
  backend.setOnline(false);
  const off = makeDevice(backend, 'Offline');
  await off.auth.removeFavorite('monaco-bracelet');
  check('offline: removed from the screen immediately', !(await off.auth.listFavorites()).some((i) => i.productId === 'monaco-bracelet'));
  check('offline: cloud still untouched', backend.state.favorites.has('monaco-bracelet'));
  backend.setOnline(true);
  await off.auth.flushPending();
  await wait();
  check('back online: queued deletion reached the cloud', !backend.state.favorites.has('monaco-bracelet'));

  const afterOffline = makeDevice(backend, 'After-offline');
  check('deleted-while-offline item does not come back', !(await afterOffline.auth.listFavorites()).some((i) => i.productId === 'monaco-bracelet'));

  /* --- orders are not duplicated on every login --- */
  const O = makeDevice(backend, 'Orders');
  await O.auth.saveOrder({ type: 'form', name: 'Заявка 1' });
  await wait();
  const before = backend.state.orders.length;
  makeDevice(backend, 'Orders-reload-1');
  makeDevice(backend, 'Orders-reload-2');
  await wait();
  check('orders are not duplicated after reloads', backend.state.orders.length === before);
  check('order reached the cloud once', before === 1);

  console.log(`\n${passed} passed, ${errors.filter((e) => e.startsWith('FAILED')).length} failed`);
  console.log('--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'none');
})();
