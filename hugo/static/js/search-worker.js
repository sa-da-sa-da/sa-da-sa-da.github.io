/* FlexSearch 搜索 Worker
 * - 英文/拼音：tokenize: 'full'
 * - 中文：自定义 encode，把汉字切成单字，保证 CJK 可检索
 */
// 本地内置（构建期随 static/js 一并发布，避免 CDN 不可用导致搜索失效）
const FLEXSEARCH_CDN = '/js/flexsearch.bundle.js';

let latinIndex = null;
let cjkIndex = null;
let store = {};

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/g;

function cjkEncode(str) {
  const s = String(str || '').toLowerCase();
  const chars = s.match(CJK_RE) || [];
  const rest = s.replace(CJK_RE, ' ').split(/[^a-z0-9]+/i).filter(Boolean);
  // FlexSearch 0.7 的自定义 encode 需返回字符串
  return chars.concat(rest).join(' ');
}

function createIndexes(FlexSearch) {
  const base = {
    id: 'id',
    store: true,
    index: ['normalizedTitle', 'headers', 'normalizedContent'],
    cache: 100,
  };
  latinIndex = new FlexSearch.Document(Object.assign({}, base, { tokenize: 'full' }));
  cjkIndex = new FlexSearch.Document(Object.assign({}, base, { encode: cjkEncode }));
}

function build(data) {
  (data || []).forEach(function (doc) {
    store[doc.id] = doc;
    latinIndex.add(doc);
    cjkIndex.add(doc);
  });
}

function search(keyword, limit) {
  const opts = { limit: limit || 12, enrich: true };
  const out = [];
  const seen = Object.create(null);

  function collect(res) {
    (res || []).forEach(function (group) {
      (group.result || []).forEach(function (item) {
        const doc = item.doc || store[item.id];
        if (!doc || seen[doc.id]) return;
        seen[doc.id] = 1;
        out.push(doc);
      });
    });
  }

  try {
    collect(latinIndex.search(keyword, opts));
  } catch (e) { /* ignore */ }
  try {
    collect(cjkIndex.search(keyword, opts));
  } catch (e) { /* ignore */ }

  return out.slice(0, limit || 12);
}

self.onmessage = function (e) {
  const msg = e.data || {};
  if (msg.type === 'BUILD_INDEX') {
    const data = (msg.payload && msg.payload.data) || [];
    try {
      if (typeof FlexSearch === 'undefined') {
        importScripts(FLEXSEARCH_CDN);
      }
      createIndexes(FlexSearch);
      build(data);
      self.postMessage({ type: 'INDEX_READY', count: data.length });
    } catch (err) {
      self.postMessage({ type: 'INDEX_ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (msg.type === 'SEARCH') {
    if (!latinIndex) {
      self.postMessage({ type: 'RESULT', query: msg.query, results: [] });
      return;
    }
    self.postMessage({ type: 'RESULT', query: msg.query, results: search(msg.query, msg.limit) });
  }
};
