/* 临时脚本：找无手动广告的长文 */
const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push({ p, size: st.size });
  }
  return out;
}

const all = walk('D:/00同步文件/00程序/docs-xx/docs', []);
const long = all
  .filter((f) => f.size > 10000)
  .map((f) => {
    const c = fs.readFileSync(f.p, 'utf8');
    const heads = (c.match(/^#{1,3} /gm) || []).length;
    return { ...f, heads, hasAd: /GoogleAd|adsbygoogle/i.test(c) };
  })
  .filter((f) => !f.hasAd && f.heads >= 6)
  .sort((a, b) => b.heads - a.heads)
  .slice(0, 6);
for (const f of long) {
  console.log(`${f.heads} heads, ${f.size}B, ad=${f.hasAd}: ${f.p.replace('D:/00同步文件/00程序/docs-xx/docs/', '')}`);
}
