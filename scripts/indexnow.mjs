/**
 * IndexNow 提交（Bing / Yandex / Seznam 共用协议，提交一次即可）
 *
 *   node scripts/indexnow.mjs                 # 提交 sitemap 里的全部 URL
 *   node scripts/indexnow.mjs --limit 20      # 只提交前 20 条（日常更新用）
 *   node scripts/indexnow.mjs --dry           # 只打印，不发请求
 *   node scripts/indexnow.mjs --url https://www.sakaay.com/xxx/   # 提交单条
 *
 * 前置条件：
 *   1) data/indexnow.json 里的 key
 *   2) static/<key>.txt 已随站点发布（https://<host>/<key>.txt 可访问）
 *   3) 先部署，再提交（否则 Bing 抓取到的是旧内容）
 */
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const getVal = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

const cfg = JSON.parse(await readFile('data/indexnow.json', 'utf8'));
const host = cfg.host;
const key = cfg.key;
const keyLocation = `https://${host}/${key}.txt`;

let urls;
const single = getVal('--url');
if (single) {
  urls = [single];
} else {
  const sm = await readFile('public/sitemap.xml', 'utf8');
  urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const limit = Number(getVal('--limit') || 0);
  if (limit > 0) urls = urls.slice(0, limit);
}

if (!urls.length) {
  console.error('没有可提交的 URL');
  process.exit(1);
}

const body = {
  host,
  key,
  keyLocation,
  urlList: urls,
};

console.log(`准备提交 ${urls.length} 条 URL 到 IndexNow（${host}）`);
if (has('--dry')) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// 预期：200 提交成功；202 已接收待处理；400 格式错误；403 key 校验失败；422 URL 与 host 不匹配；429 请求过多
console.log('HTTP', res.status, res.statusText);
const text = await res.text();
if (text) console.log(text.slice(0, 300));
if (res.status >= 200 && res.status < 300) {
  console.log('✅ 已提交。Bing 通常几分钟到几小时内开始抓取；可在必应站长工具「索引」页查看进度。');
} else {
  console.log('❌ 提交失败，请对照上面的状态码排查（403 多为 key 文件无法访问，422 多为域名不匹配）。');
  process.exitCode = 1;
}
