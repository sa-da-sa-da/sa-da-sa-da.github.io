/**
 * 教育教学资源链接巡检
 *
 *   node scripts/check-edu-links.mjs        # 跑一遍，写 data/edu_link_status.json
 *   pnpm edu:check                         # 同上
 *
 * 对 data/edu_resources.json 里每条 URL 做一次真实访问：
 *   - 站内 / 开头的链接 → 检查 static/ 源文件是否存在（无需先构建，CI 里可直接跑）
 *   - 外链 → GET 请求，记录 HTTP 状态码
 * 结果写进 data/edu_link_status.json，资源页会读它显示「链接状态」小徽标。
 *
 * 分级：2xx/3xx = ok；403/超时但资源标注「需浏览器」= warn；其它 4xx/5xx = fail。
 * 网络本身不通（code 0）一律算 warn，不误判成死链。
 *
 * 不串进 build：要发 20+ 个网络请求，构建不该依赖外网。建议每月或发版前手动跑一次，
 * 也可以交给 WorkBuddy 定时任务。
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const data = JSON.parse(await readFile(join(ROOT, 'data', 'edu_resources.json'), 'utf8'));

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf,*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

const items = {};
let ok = 0, warn = 0, fail = 0;
const failures = [];

for (const g of data.groups) {
  for (const it of g.items) {
    const url = it.url;
    let code;
    if (url.startsWith('/')) {
      try {
        await stat(join(ROOT, 'static', url.replace(/^\//, '')));
        code = 200;
      } catch {
        code = 404;
      }
    } else {
      code = await probe(url);
    }

    const needsBrowser = (it.tags || []).includes('需浏览器');
    let status;
    if (code >= 200 && code < 400) status = 'ok';
    else if ((code === 403 || code === 0) && needsBrowser) status = 'warn';
    else if (code === 0) status = 'warn';
    else status = 'fail';

    items[url] = { name: it.name, group: g.title, code, status };
    if (status === 'ok') ok++;
    else if (status === 'warn') warn++;
    else { fail++; failures.push(`${it.name} → HTTP ${code} ${url}`); }
  }
}

const checked = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const out = { checked, total: ok + warn + fail, ok, warn, fail, items };
await writeFile(join(ROOT, 'data', 'edu_link_status.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`[edu:check] ${checked} · 共 ${out.total} 条：正常 ${ok} / 需留意 ${warn} / 失效 ${fail}`);
if (failures.length) {
  console.log('失效链接（建议替换或移除）：');
  for (const f of failures) console.log('  - ' + f);
}
if (warn) console.log('标为「需留意」的多半是对无头访问有限制或本机网络问题，浏览器打开通常正常。');
