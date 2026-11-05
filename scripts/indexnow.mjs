/**
 * IndexNow 提交（Bing / Yandex / Seznam 共用协议，提交一次即可）
 *
 *   node scripts/indexnow.mjs                 # 提交 sitemap 里的全部 URL
 *   node scripts/indexnow.mjs --batch 50      # 全量分批提交（推荐，一次几百条会 403）
 *   node scripts/indexnow.mjs --sitemap-url https://www.sakaay.com/sitemap.xml --batch 50
 *                                            # 读线上 sitemap（CI 用，无需本地构建）
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
const sitemapUrl = getVal('--sitemap-url');
if (single) {
  urls = [single];
} else {
  let sm;
  if (sitemapUrl) {
    // CI / 无本地产物时直接读线上 sitemap，提交的就是真实可访问的 URL 集合
    const res = await fetch(sitemapUrl);
    if (!res.ok) {
      console.error(`读取线上 sitemap 失败：HTTP ${res.status} ${sitemapUrl}`);
      process.exit(1);
    }
    sm = await res.text();
  } else {
    sm = await readFile('public/sitemap.xml', 'utf8');
  }
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

// 一次提交几百条会出现 SiteVerificationNotCompleted（403），按 --batch 分批即可。
//   node scripts/indexnow.mjs --batch 50     # 全量 sitemap，每批 50 条
const batchSize = Number(getVal('--batch') || 0);
console.log(`准备提交 ${urls.length} 条 URL 到 IndexNow（${host}）${batchSize ? `，每批 ${batchSize} 条` : ''}`);
if (has('--dry')) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}

const chunks = [];
if (batchSize > 0) {
  for (let i = 0; i < urls.length; i += batchSize) chunks.push(urls.slice(i, i + batchSize));
} else {
  chunks.push(urls);
}

let done = 0;
let failed = 0;
for (let i = 0; i < chunks.length; i++) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ...body, urlList: chunks[i] }),
  });
  const text = await res.text();
  // 预期：200 提交成功；202 已接收待处理；400 格式错误；403 站点验证未完成；422 域名不匹配；429 请求过多
  if (res.status >= 200 && res.status < 300) {
    done += chunks[i].length;
    if (chunks.length > 1) console.log(`  批次 ${i + 1}/${chunks.length}：HTTP ${res.status}，${chunks[i].length} 条`);
  } else {
    failed += chunks[i].length;
    console.log(`  批次 ${i + 1}/${chunks.length} 失败：HTTP ${res.status} ${text.slice(0, 160)}`);
  }
  if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 1500));
}

if (chunks.length === 1) {
  console.log(done ? '✅ 已提交。' : '❌ 提交失败。');
  console.log('Bing 通常几分钟到几小时内开始抓取；可在必应站长工具「索引」页查看进度。');
} else {
  console.log(`✅ 完成：成功 ${done} 条${failed ? `，失败 ${failed} 条` : ''}`);
}
if (failed) process.exitCode = 1;
