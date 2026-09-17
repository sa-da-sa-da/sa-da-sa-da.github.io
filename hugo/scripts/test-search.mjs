/**
 * FlexSearch CJK 索引验证脚本（Node 环境）
 * 用法： node scripts/test-search.mjs
 * 会读取 public/search-index.json，用与 static/js/search-worker.js 相同的逻辑建索引并检索。
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 复用 Worker 的编码逻辑
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/g;

function cjkEncodeArray(str) {
  const s = String(str || '').toLowerCase();
  const chars = s.match(CJK_RE) || [];
  const rest = s.replace(CJK_RE, ' ').split(/[^a-z0-9]+/i).filter(Boolean);
  return chars.concat(rest);
}

function cjkEncodeString(str) {
  return cjkEncodeArray(str).join(' ');
}

async function main() {
  const bundle = fs.readFileSync(path.join(ROOT, 'static', 'js', 'flexsearch.bundle.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const FlexSearch = new Function(bundle + '; return FlexSearch;')();

  const docs = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'search-index.json'), 'utf8'));
  console.log('文档数：', docs.length);

  const base = { id: 'id', store: true, index: ['normalizedTitle', 'headers', 'normalizedContent'], cache: 100 };

  const variants = {
    'array+strict': new FlexSearch.Document(Object.assign({}, base, { encode: cjkEncodeArray })),
    'array+full': new FlexSearch.Document(Object.assign({}, base, { encode: cjkEncodeArray, tokenize: 'full' })),
    'string+strict': new FlexSearch.Document(Object.assign({}, base, { encode: cjkEncodeString })),
    'string+full': new FlexSearch.Document(Object.assign({}, base, { encode: cjkEncodeString, tokenize: 'full' })),
  };

  for (const [name, idx] of Object.entries(variants)) {
    for (const d of docs) idx.add(d);
    for (const q of ['开源软件', '信息技术', '考试', 'python']) {
      let hits = 0;
      try {
        const res = idx.search(q, { limit: 10, enrich: true });
        const seen = new Set();
        res.forEach((g) => (g.result || []).forEach((r) => seen.add(r.id)));
        hits = seen.size;
      } catch (e) {
        hits = 'ERR:' + e.message;
      }
      console.log(name.padEnd(14), q.padEnd(8), '->', hits);
    }
  }
}

main();
