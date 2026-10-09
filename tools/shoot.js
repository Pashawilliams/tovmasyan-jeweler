/* Screenshot helper — renders real pages in Chrome so the design can be reviewed.
   Usage: node tools/shoot.js <name> <path> [--expand] [--full] */
const puppeteer = require('/tmp/node_modules/puppeteer');

const [, , name, pagePath = '/', ...flags] = process.argv;
const BASE = 'http://127.0.0.1:8099';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const mobile = flags.includes('--mobile');
  await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }
                                : { width: 1366, height: 900, deviceScaleFactor: 1 });

  // Freeze the market so screenshots are comparable between runs.
  await page.evaluateOnNewDocument(() => {
    const S = { gold: 4189.6, silver: 61.01, amd: 361.63 };
    const real = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      const u = String(url);
      const reply = (d) => Promise.resolve(new Response(JSON.stringify(d), { status: 200 }));
      if (u.includes('price/XAU')) return reply({ price: S.gold, updatedAt: new Date().toISOString() });
      if (u.includes('price/XAG')) return reply({ price: S.silver, updatedAt: new Date().toISOString() });
      if (u.includes('er-api')) return reply({ rates: { AMD: S.amd } });
      return real(url, opts);
    };
    // a believable 24h of history so the chart has something to draw
    const now = Date.now();
    const pts = [];
    for (let i = 48; i >= 0; i--) {
      pts.push({ t: now - i * 30 * 60e3, g: 4100 + Math.sin(i / 6) * 22 + (48 - i) * 1.9 });
    }
    localStorage.setItem('tovmasyan_rate_series', JSON.stringify(pts));
    if (location.search.includes('hy')) localStorage.setItem('tovmasyan_lang', 'hy');
    // neutralise the sign-in gate for screenshots only
    window.TOVMASYAN_FIREBASE_CONFIG = { apiKey: 'PASTE', projectId: 'PASTE' };
  });

  await page.goto(BASE + pagePath, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1800));

  // the sign-in gate is a separate feature; unlock it so the page itself is visible
  await page.evaluate(() => {
    document.body.classList.remove('auth-locked', 'auth-pending');
    document.querySelectorAll('[data-auth-gate], .auth-modal').forEach((n) => n.remove());
  });
  await page.addStyleTag({ content: '.reveal,[class*="reveal"]{opacity:1!important;transform:none!important;}' });
  // walk the page so lazy images and observers fire
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 900));

  if (flags.includes('--expand')) {
    await page.click('[data-rate-toggle]').catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
  }

  await page.screenshot({
    path: `/tmp/shots/${name}.png`,
    fullPage: flags.includes('--full')
  });

  // report anything that is unreadable: text colour too close to its background
  const contrast = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg;
        n = n.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const bad = [];
    document.querySelectorAll('h1,h2,h3,h4,p,a,span,td,th,li,button,label').forEach((el) => {
      if (!el.textContent.trim() || el.offsetParent === null) return;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.opacity) < 0.15) return;
      try {
        const l1 = lum(cs.color), l2 = lum(bgOf(el));
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 2.2) bad.push({ t: el.textContent.trim().slice(0, 42), ratio: +ratio.toFixed(2), color: cs.color, tag: el.tagName });
      } catch (e) { /* unparsable colour */ }
    });
    const seen = new Set();
    return bad.filter((b) => { const k = b.t + b.color; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
  });

  console.log(`${name}: ${contrast.length} low-contrast items`);
  contrast.forEach((c) => console.log(`   [${c.ratio}] <${c.tag}> ${c.color}  "${c.t}"`));
  await browser.close();
})();
