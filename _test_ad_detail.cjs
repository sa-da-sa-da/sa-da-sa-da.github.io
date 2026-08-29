const path = require('path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright-core'));

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8899/01.%E5%AD%A6%E4%B9%A0/03.%E6%8A%80%E6%9C%AF%E8%BF%90%E7%94%A8%E4%BA%8E%E6%95%99%E8%82%B2.html', { waitUntil: 'load' });
  await pg.waitForTimeout(1500);
  const info = await pg.evaluate(() => {
    const result = [];
    document.querySelectorAll('ins.adsbygoogle').forEach(i => {
      let p = i;
      const chain = [];
      for (let k = 0; k < 4 && p; k++) {
        chain.push((p.tagName || '').toLowerCase() + (p.className ? '.' + String(p.className).split(' ').join('.') : '') + (p.id ? '#' + p.id : ''));
        p = p.parentElement;
      }
      result.push({ slot: i.getAttribute('data-ad-slot'), chain });
    });
    return result;
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
