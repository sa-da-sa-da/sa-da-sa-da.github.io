const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright-core'));

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();

  const tries = [
    'http://127.0.0.1:8899/about/websites',
    'http://127.0.0.1:8899/about/websites.html',
    'http://127.0.0.1:8899/60.%E5%85%B3%E4%BA%8E/30.%E7%BD%91%E7%AB%99%E5%AF%BC%E8%88%AA.html',
    'http://127.0.0.1:8899/60.%E5%85%B3%E4%BA%8E/30.%E7%BD%91%E7%AB%99%E5%AF%BC%E8%88%AA'
  ];
  for (const u of tries) {
    const r = await pg.goto(u, { waitUntil: 'load', timeout: 60000 });
    await pg.waitForTimeout(1500);
    const t = await pg.title();
    const n = await pg.evaluate(() => {
      const ads = [...document.querySelectorAll('ins.adsbygoogle')].filter((i) => i.closest('.vp-doc'));
      return { n: ads.length, h: document.querySelectorAll('.vp-doc h2').length };
    });
    console.log(u.split('/').pop(), '->', r.status(), t.includes('404') ? '404' : 'OK', JSON.stringify(n));
  }
  await b.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
