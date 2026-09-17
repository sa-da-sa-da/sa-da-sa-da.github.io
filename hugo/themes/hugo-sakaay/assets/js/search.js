/* 搜索弹窗：默认 FlexSearch（Worker），可切换 Algolia */
const HISTORY_KEY = 'search-history';
const MAX_HISTORY = 8;

let state = {
  worker: null,
  ready: false,
  docs: [],
  results: [],
  index: -1,
  query: '',
};

function config() {
  const el = document.getElementById('search-config');
  return el ? JSON.parse(el.textContent) : {};
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
}
function pushHistory(q) {
  let h = getHistory().filter(function (x) { return x !== q; });
  h.unshift(q);
  h = h.slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) {}
}

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return safe.replace(re, '<mark class="search-highlight">$1</mark>');
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

function open() {
  const modal = document.getElementById('searchModal');
  if (!modal) return;
  modal.classList.add('is-open');
  const input = document.getElementById('searchInput');
  if (input) setTimeout(function () { input.focus(); }, 60);
  if (!state.query) renderHistory();
}
function close() {
  const modal = document.getElementById('searchModal');
  if (modal) modal.classList.remove('is-open');
}

function renderHistory() {
  const body = document.getElementById('searchBody');
  const h = getHistory();
  body.innerHTML = h.length
    ? '<div class="search-section-title"><span>搜索历史</span><button type="button" id="clearHistory" style="color:var(--text-muted)">清除</button></div>' +
      h.map(function (q) {
        return '<div class="search-history-item" data-q="' + escapeHtml(q) + '"><span class="item-title">' + escapeHtml(q) + '</span></div>';
      }).join('')
    : '<div class="search-empty">没有搜索历史</div>';
  const clear = document.getElementById('clearHistory');
  if (clear) clear.addEventListener('click', function () {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });
  body.querySelectorAll('.search-history-item').forEach(function (el) {
    el.addEventListener('click', function () {
      const input = document.getElementById('searchInput');
      input.value = el.dataset.q;
      doSearch(el.dataset.q);
    });
  });
}

function renderResults(items, q) {
  const body = document.getElementById('searchBody');
  if (!items.length) {
    body.innerHTML = '<div class="search-empty">没有找到相关结果</div>';
    return;
  }
  body.innerHTML = items.map(function (d, i) {
    return '<div class="search-result-item' + (i === 0 ? ' is-active' : '') + '" data-url="' + (d.url || '') + '">' +
      '<span class="item-title">' + highlight(d.title, q) + '</span>' +
      '<span class="item-path">' + escapeHtml(d.url || '') + '</span>' +
      '<span class="item-excerpt">' + highlight(((d.content || d.description || '').slice(0, 120)), q) + '</span>' +
      '</div>';
  }).join('');
  body.querySelectorAll('.search-result-item').forEach(function (el) {
    el.addEventListener('click', function () { location.href = el.dataset.url; });
    el.addEventListener('mouseenter', function () {
      body.querySelectorAll('.search-result-item').forEach(function (x) { x.classList.remove('is-active'); });
      el.classList.add('is-active');
      state.index = Array.prototype.indexOf.call(body.querySelectorAll('.search-result-item'), el);
    });
  });
}

function move(delta) {
  const items = Array.prototype.slice.call(document.querySelectorAll('.search-result-item'));
  if (!items.length) return;
  items.forEach(function (x) { x.classList.remove('is-active'); });
  state.index = (state.index + delta + items.length) % items.length;
  const el = items[state.index];
  el.classList.add('is-active');
  el.scrollIntoView({ block: 'nearest' });
}

function doSearch(q) {
  q = (q || '').trim();
  state.query = q;
  state.index = -1;
  if (!q) { renderHistory(); return; }
  pushHistory(q);

  const cfg = config();
  const body = document.getElementById('searchBody');

  if (cfg.provider === 'algolia' && cfg.algolia && cfg.algolia.appId) {
    body.innerHTML = '<div class="search-loading">搜索引擎加载中…</div>';
    searchAlgolia(cfg.algolia, q).then(function (items) { state.results = items; renderResults(items, q); });
    return;
  }

  if (state.worker && state.ready) {
    body.innerHTML = '<div class="search-loading">搜索中…</div>';
    state.worker.postMessage({ type: 'SEARCH', query: q, limit: 12 });
  } else {
    // 索引未就绪：退化为本地线性检索
    const items = state.docs.filter(function (d) {
      return (d.title + (d.content || '')).toLowerCase().indexOf(q.toLowerCase()) > -1;
    }).slice(0, 12);
    renderResults(items, q);
  }
}

function searchAlgolia(opts, q) {
  const url = 'https://' + opts.appId + '-dsn.algolia.net/1/indexes/' + opts.indexName + '/query';
  return fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': opts.apiKey,
      'X-Algolia-Application-Id': opts.appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: q, hitsPerPage: 12 }),
  }).then(function (r) { return r.json(); })
    .then(function (data) {
      return (data.hits || []).map(function (h) {
        return {
          id: h.objectID,
          title: h.title || (h.hierarchy && h.hierarchy.lvl0) || '',
          url: h.url || h.permalink || '',
          content: h.content || h.excerpt || '',
        };
      });
    }).catch(function () { return []; });
}

function initWorker() {
  const cfg = config();
  if (cfg.provider === 'algolia') return;
  if (typeof Worker === 'undefined') return;
  try {
    state.worker = new Worker('/js/search-worker.js');
  } catch (e) { return; }

  state.worker.onmessage = function (e) {
    const msg = e.data || {};
    if (msg.type === 'INDEX_READY') {
      state.ready = true;
      return;
    }
    if (msg.type === 'RESULT') {
      state.results = msg.results || [];
      renderResults(state.results, msg.query);
    }
  };

  fetch(cfg.indexUrl || '/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.docs = Array.isArray(data) ? data : (data.docs || []);
      state.worker.postMessage({ type: 'BUILD_INDEX', payload: { data: state.docs } });
    })
    .catch(function () { /* 索引缺失时静默降级 */ });
}

export function initSearch() {
  const trigger = document.getElementById('searchTrigger');
  const extra = document.getElementById('searchTrigger404');
  const modal = document.getElementById('searchModal');
  if (!modal) return;

  if (trigger) trigger.addEventListener('click', open);
  if (extra) extra.addEventListener('click', open);
  ['searchTrigger404', 'mobileSearchBtn'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', open);
  });
  const cancel = document.getElementById('searchCancel');
  if (cancel) cancel.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

  const input = document.getElementById('searchInput');
  let timer = null;
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(timer);
      const v = input.value;
      timer = setTimeout(function () { doSearch(v); }, 180);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const active = document.querySelector('.search-result-item.is-active');
        if (active && active.dataset.url) { location.href = active.dataset.url; return; }
        doSearch(input.value);
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    if (e.key === 'Escape') close();
  });

  initWorker();

  // 调试入口：控制台可用 __search 查看索引状态（ready / docs / results）
  window.__search = state;
}
