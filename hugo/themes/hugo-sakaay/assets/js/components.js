/* 迁移组件运行时：把迁移后的语义化 HTML 块渲染为可交互组件
 * 数据来自 /data/*.json（构建期由迁移脚本从原 Vue 组件抽取）
 */

// ------------------------------------------------------------------ 基础工具

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

function readProps(el) {
  const raw = el.getAttribute('data-props');
  if (!raw) return {};
  try { return JSON.parse(raw.replace(/&quot;/g, '"')); } catch (e) { return {}; }
}

const cache = {};
function fetchData(name) {
  if (!cache[name]) {
    cache[name] = fetch('/data/' + name + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  return cache[name];
}

function asList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.items || raw.list || raw.events || raw.photos || raw.problems || [];
}

/** 对含 # 《》 等字符的本地文件名做逐段编码 */
function encodePath(p) {
  if (!p) return '';
  if (/^https?:/i.test(p)) return p;
  return p.split('/').map(function (seg, i) {
    return i === 0 ? seg : encodeURIComponent(seg);
  }).join('/');
}

// ------------------------------------------------------ 选择题 / 判断题 / 填空题

function renderQuestionBlock(box) {
  let data = {};
  const script = box.querySelector('script[type="application/json"]');
  if (script) {
    try { data = JSON.parse(script.textContent); } catch (e) { data = {}; }
  } else {
    data = readProps(box);
  }

  const type = data.type || box.dataset.type || 'mcq';
  const options = data.options || [];
  const correct = (Array.isArray(data.correct) ? data.correct : (data.correct == null ? [] : [data.correct]))
    .map(function (v) { return parseInt(v, 10); })
    .filter(function (v) { return !isNaN(v); });
  const multiple = type === 'mcq' && correct.length > 1;

  const wrap = document.createElement('div');
  wrap.className = 'question-card';

  const head = document.createElement('div');
  head.className = 'question-title';
  head.innerHTML = '<span class="question-badge">' +
    (type === 'tf' ? '判断题' : type === 'fib' ? '填空题' : multiple ? '多选题' : '单选题') + '</span>' +
    '<span>' + (data.title || '') + '</span>';
  wrap.appendChild(head);

  if (data.images && data.images.length) {
    const imgs = document.createElement('div');
    imgs.className = 'question-images';
    data.images.forEach(function (src) {
      const im = document.createElement('img');
      im.src = typeof src === 'string' ? src : (src.src || src.url || '');
      im.loading = 'lazy';
      im.alt = '';
      imgs.appendChild(im);
    });
    wrap.appendChild(imgs);
  }

  const analysis = document.createElement('div');
  analysis.className = 'question-analysis';

  if (type === 'fib') {
    const answers = (Array.isArray(data.correct) ? data.correct : [data.correct]).map(String);
    const inputWrap = document.createElement('div');
    inputWrap.className = 'fib-inputs';
    answers.forEach(function (_a, i) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'fill-blank';
      input.placeholder = '第 ' + (i + 1) + ' 空';
      input.dataset.index = String(i);
      inputWrap.appendChild(input);
    });
    wrap.appendChild(inputWrap);

    const actions = document.createElement('div');
    actions.className = 'question-actions';
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'btn btn-brand';
    check.textContent = '提交答案';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn';
    reset.textContent = '重新答题';
    reset.style.display = 'none';
    actions.appendChild(check);
    actions.appendChild(reset);
    wrap.appendChild(actions);
    wrap.appendChild(analysis);

    const judge = function (input) {
      const idx = parseInt(input.dataset.index, 10);
      const expect = answers[idx] == null ? '' : answers[idx].trim().toLowerCase();
      const got = input.value.trim().toLowerCase();
      return got !== '' && got === expect;
    };

    check.addEventListener('click', function () {
      let right = 0;
      inputWrap.querySelectorAll('input').forEach(function (input) {
        const ok = judge(input);
        input.classList.toggle('is-correct', ok);
        input.classList.toggle('is-wrong', !ok);
        if (ok) right++;
      });
      analysis.classList.add('is-open');
      analysis.innerHTML =
        '<div class="result-message ' + (right === answers.length ? 'correct-message' : 'incorrect-message') + '">' +
        (right === answers.length ? '✅ 全部回答正确' : '❌ 答对 ' + right + ' / ' + answers.length + ' 空') + '</div>' +
        '<div>参考答案：' + answers.map(esc).join('、') + '</div>' +
        (data.explanation ? '<div class="explanation"><strong>解析：</strong>' + data.explanation + '</div>' : '');
      check.disabled = true;
      reset.style.display = '';
    });
    reset.addEventListener('click', function () {
      inputWrap.querySelectorAll('input').forEach(function (input) {
        input.value = '';
        input.classList.remove('is-correct', 'is-wrong');
      });
      analysis.classList.remove('is-open');
      analysis.innerHTML = '';
      check.disabled = false;
      reset.style.display = 'none';
    });
  } else {
    const list = document.createElement('ul');
    list.className = 'question-options';
    const selected = [];

    options.forEach(function (text, i) {
      const li = document.createElement('li');
      li.className = 'question-option';
      li.dataset.index = String(i);
      li.innerHTML = '<b>' + String.fromCharCode(65 + i) + '.</b> <span>' + text + '</span>';
      li.addEventListener('click', function () {
        const at = selected.indexOf(i);
        if (at > -1) { selected.splice(at, 1); li.classList.remove('is-selected'); }
        else { selected.push(i); li.classList.add('is-selected'); }
      });
      list.appendChild(li);
    });
    wrap.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'question-actions';
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'btn btn-brand';
    check.textContent = '提交答案';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn';
    reset.textContent = '重新答题';
    reset.style.display = 'none';
    actions.appendChild(check);
    actions.appendChild(reset);
    wrap.appendChild(actions);
    wrap.appendChild(analysis);

    check.addEventListener('click', function () {
      if (!selected.length) return;
      // 集合相等判定（顺序无关、多选少选均不算对）
      let allRight = selected.length === correct.length;
      if (allRight) {
        allRight = selected.every(function (i) { return correct.indexOf(i) > -1; });
      }
      list.querySelectorAll('.question-option').forEach(function (li) {
        const idx = parseInt(li.dataset.index, 10);
        const isCorrect = correct.indexOf(idx) > -1;
        const isChosen = selected.indexOf(idx) > -1;
        li.classList.remove('is-correct', 'is-wrong');
        if (isCorrect) li.classList.add('is-correct');
        else if (isChosen) li.classList.add('is-wrong');
        li.classList.toggle('is-selected', isChosen);
      });
      analysis.classList.add('is-open');
      analysis.innerHTML =
        '<div class="result-message ' + (allRight ? 'correct-message' : 'incorrect-message') + '">' +
        (allRight ? '✅ 回答正确' : '❌ 回答有误') + '</div>' +
        '<div>参考答案：' + correct.map(function (i) { return String.fromCharCode(65 + i); }).join('、') + '</div>' +
        (data.explanation ? '<div class="explanation"><strong>解析：</strong>' + data.explanation + '</div>' : '');
      check.disabled = true;
      reset.style.display = '';
    });
    reset.addEventListener('click', function () {
      selected.length = 0;
      list.querySelectorAll('.question-option').forEach(function (li) {
        li.classList.remove('is-selected', 'is-correct', 'is-wrong');
      });
      analysis.classList.remove('is-open');
      analysis.innerHTML = '';
      check.disabled = false;
      reset.style.display = 'none';
    });
  }

  box.innerHTML = '';
  box.appendChild(wrap);
}

// ------------------------------------------------------------------ Python 编辑器

// Pyodide 各版本会从 jsDelivr 的 pyodide 镜像下线（v0.23.4 已 404），故按序回退
const PYODIDE_SOURCES = [
  'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
  'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
  'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
];

function renderPython(box) {
  const props = readProps(box);
  const problemId = (props.problemId || box.dataset.problemId || '').trim();

  box.innerHTML =
    '<div class="python-editor">' +
    '<div class="editor-toolbar">' +
    '<select class="py-problem"></select>' +
    '<button type="button" class="py-run">▶ 运行代码</button>' +
    '<span class="editor-status py-status" style="font-size:.8rem;color:var(--text-muted)"></span>' +
    '</div>' +
    '<div class="editor-desc py-desc" style="padding:8px 12px;font-size:.84rem;color:var(--text-secondary);background:var(--vp-c-bg-alt)"></div>' +
    '<textarea class="py-code" spellcheck="false"></textarea>' +
    '<div class="editor-label" style="padding:4px 12px;font-size:.78rem;color:var(--text-muted)">标准输入（每行一个）：</div>' +
    '<textarea class="py-input" spellcheck="false" style="min-height:70px"></textarea>' +
    '<div class="editor-output py-output">点击「运行代码」执行（首次运行需从 CDN 加载 Python 运行环境）</div>' +
    '</div>';

  // 一页可能有多个编辑器，必须用类名作用域而不是 id（重复 id 不合法且会互相干扰）
  const select = box.querySelector('.py-problem');
  const code = box.querySelector('.py-code');
  const input = box.querySelector('.py-input');
  const output = box.querySelector('.py-output');
  const status = box.querySelector('.py-status');
  const desc = box.querySelector('.py-desc');

  let problems = [];
  fetchData('python-problems').then(function (raw) {
    if (!raw) { select.style.display = 'none'; return; }
    problems = Array.isArray(raw) ? raw : Object.keys(raw).map(function (k) { return raw[k]; });
    problems.forEach(function (p) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title || p.id;
      select.appendChild(opt);
    });
    load(props.problemId ? problems.filter(function (p) { return p.id === props.problemId; })[0] || problems[0] : problems[0]);
    select.addEventListener('change', function () {
      load(problems.filter(function (p) { return p.id === select.value; })[0]);
    });
  });

  function load(p) {
    if (!p) return;
    select.value = p.id;
    code.value = p.code || '';
    input.value = (p.inputs || []).join('\n');
    desc.textContent = p.description ? '题目：' + p.description : '';
    output.textContent = '';
    status.textContent = '';
  }

  let pyodideReady = null;

  /** 依次尝试多个版本/镜像：单一 CDN 版本下线会导致编辑器彻底不可用 */
  function tryLoad(indexURL) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = indexURL + 'pyodide.js';
      script.onload = function () {
        if (typeof window.loadPyodide !== 'function') return reject(new Error('loadPyodide 未定义'));
        window.loadPyodide({ indexURL: indexURL }).then(resolve).catch(reject);
      };
      script.onerror = function () { reject(new Error('脚本加载失败 ' + indexURL)); };
      document.head.appendChild(script);
    });
  }

  function loadPyodide() {
    if (pyodideReady) return pyodideReady;
    const sources = PYODIDE_SOURCES;
    pyodideReady = (async function () {
      let lastErr = null;
      for (let i = 0; i < sources.length; i++) {
        status.textContent = '正在加载 Python 运行环境…（首次约 10MB，来源 ' + (i + 1) + '/' + sources.length + '）';
        try {
          return await tryLoad(sources[i]);
        } catch (e) {
          lastErr = e;
        }
      }
      pyodideReady = null; // 允许重试
      throw new Error('Python 运行环境加载失败，请检查网络后重试（' + (lastErr && lastErr.message) + '）');
    })();
    return pyodideReady;
  }

  box.querySelector('.py-run').addEventListener('click', function () {
    const btn = box.querySelector('.py-run');
    btn.disabled = true;
    output.textContent = '运行中…';
    loadPyodide().then(function (py) {
      const inputs = input.value.split('\n').filter(function (l) { return l !== ''; });
      const userCode = code.value.split('\n').map(function (l) { return '    ' + l; }).join('\n');
      const wrapped =
        'import sys\n' +
        'from io import StringIO\n' +
        '_inputs = ' + JSON.stringify(inputs) + '\n' +
        '_idx = 0\n' +
        'def custom_input(prompt=""):\n' +
        '    global _idx\n' +
        '    if prompt:\n' +
        '        print(prompt, end="")\n' +
        '    if _idx < len(_inputs):\n' +
        '        v = _inputs[_idx]; _idx += 1\n' +
        '        print(v)\n' +
        '        return v\n' +
        '    return ""\n' +
        'import builtins\n' +
        'builtins.input = custom_input\n' +
        'mystdout = StringIO()\n' +
        '_old = sys.stdout\n' +
        'sys.stdout = mystdout\n' +
        'try:\n' + userCode + '\n' +
        'except Exception as e:\n' +
        '    print("运行错误:", type(e).__name__, e)\n' +
        'finally:\n' +
        '    sys.stdout = _old\n' +
        'mystdout.getvalue()\n';
      return py.runPythonAsync(wrapped);
    }).then(function (result) {
      output.textContent = result || '(无输出)';
      status.textContent = '执行完成';
    }).catch(function (err) {
      output.textContent = '运行失败：' + (err && err.message ? err.message : err);
      status.textContent = '';
    }).finally(function () {
      btn.disabled = false;
    });
  });
}

// ------------------------------------------------------------------ 工具 / 娱乐 广场

function renderGallery(box, dataName) {
  fetchData(dataName).then(function (raw) {
    if (!raw) { box.innerHTML = '<div class="search-empty">数据加载失败</div>'; return; }
    const categories = raw.categories || [];
    const colors = raw.categoryColors || {};
    const items = raw.items || [];
    let active = '全部';

    box.innerHTML =
      '<div class="gallery-filters">' +
      categories.map(function (c) {
        return '<button class="filter-btn' + (c.key === '全部' ? ' is-active' : '') +
          '" data-cat="' + esc(c.key) + '" type="button">' + esc(c.label) + '</button>';
      }).join('') + '</div><div class="gallery-grid"></div>';

    const grid = box.querySelector('.gallery-grid');
    function paint() {
      const list = active === '全部' ? items : items.filter(function (it) { return it.category === active; });
      if (!list.length) { grid.innerHTML = '<div class="search-empty">该分类暂无内容</div>'; return; }
      grid.innerHTML = list.map(function (it) {
        const url = it.playUrl || it.link || '#';
        const color = colors[it.category] || 'var(--primary-color)';
        return '<a class="gallery-card" href="' + esc(url) + '"' +
          (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '') + '>' +
          '<div class="gallery-cover">' +
          (it.cover
            ? '<img src="' + esc(it.cover) + '" loading="lazy" alt="">'
            : '<div class="gallery-cover-placeholder"><span>' + esc((it.title || '?').slice(0, 1)) + '</span></div>') +
          '</div>' +
          '<div class="gallery-body">' +
          '<div class="gallery-title">' + esc(it.title) + '</div>' +
          (it.subtitle ? '<div class="gallery-subtitle" style="color:' + color + '">' + esc(it.subtitle) + '</div>' : '') +
          '<div class="gallery-desc">' + esc(it.desc || '') + '</div>' +
          '<div class="gallery-tags">' + (it.tags || []).slice(0, 4).map(function (t) {
            return '<span class="badge" style="background:' + color + '1a;color:' + color + '">' + esc(t) + '</span>';
          }).join('') + '</div>' +
          '<div class="gallery-action" style="color:' + color + '">' + esc(it.btnText || '进入') + ' →</div>' +
          '</div></a>';
      }).join('');
    }
    paint();

    box.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        box.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        active = btn.dataset.cat;
        paint();
      });
    });
  });
}

// ------------------------------------------------------------------ 照片墙 / 相册画廊

function renderGalleryWall(box) {
  const props = readProps(box);
  const images = (props.images || []).filter(function (it) { return it && it.src; });
  if (!images.length) { box.innerHTML = '<div class="search-empty">相册暂无图片</div>'; return; }

  const colw = parseInt(props.colw || '240', 10);
  box.innerHTML =
    '<div class="gw-caption">' +
    (props.caption ? '<span>' + esc(props.caption) + '</span>' : '<span></span>') +
    '<span class="gw-count">' + images.length + ' 张</span></div>' +
    '<div class="gw-wall" style="--gw-colw:' + colw + 'px">' +
    images.map(function (it, i) {
      return '<figure class="gw-item" data-i="' + i + '" tabindex="0" role="button" aria-label="查看大图">' +
        '<img src="' + esc(it.src) + '" alt="' + esc(it.caption || '') + '" loading="lazy" decoding="async">' +
        '<span class="gw-zoom" aria-hidden="true">⤢</span>' +
        (it.caption ? '<figcaption>' + esc(it.caption) + '</figcaption>' : '') +
        '</figure>';
    }).join('') +
    '</div>';

  const items = Array.prototype.slice.call(box.querySelectorAll('.gw-item'));

  // 入场：滚动到视口时逐个浮现
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.transitionDelay = (Math.min(el.dataset.i, 12) % 6) * 60 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  items.forEach(function (el) {
    el.addEventListener('click', function () { lightbox(parseInt(el.dataset.i, 10)); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lightbox(parseInt(el.dataset.i, 10)); }
    });
  });

  function lightbox(start) {
    let idx = start;
    let thumbsEl = null;

    const lb = document.createElement('div');
    lb.className = 'gw-lightbox';
    lb.innerHTML =
      '<div class="gw-lb-stage"><img class="gw-lb-img" alt=""></div>' +
      '<button class="gw-lb-nav gw-lb-prev" type="button" aria-label="上一张">‹</button>' +
      '<button class="gw-lb-nav gw-lb-next" type="button" aria-label="下一张">›</button>' +
      '<div class="gw-lb-bar">' +
      '<span class="gw-lb-count"></span>' +
      '<span class="gw-lb-cap"></span>' +
      '<a class="gw-lb-origin" target="_blank" rel="noopener">原图 ↗</a>' +
      '</div>' +
      '<div class="gw-lb-thumbs"></div>' +
      '<button class="gw-lb-close" type="button" aria-label="关闭">✕</button>';
    document.body.appendChild(lb);
    document.body.classList.add('gw-lock');

    const stage = lb.querySelector('.gw-lb-stage');
    const img = lb.querySelector('.gw-lb-img');
    const count = lb.querySelector('.gw-lb-count');
    const cap = lb.querySelector('.gw-lb-cap');
    const origin = lb.querySelector('.gw-lb-origin');
    const box2 = lb.querySelector('.gw-lb-thumbs');
    thumbsEl = lb.querySelector('.gw-lb-thumbs');

    thumbsEl.innerHTML = images.map(function (it, i) {
      return '<img src="' + esc(it.src) + '" data-i="' + i + '" loading="lazy" alt="">';
    }).join('');
    const thumbs = Array.prototype.slice.call(thumbsEl.querySelectorAll('img'));
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () { show(parseInt(t.dataset.i, 10)); });
    });

    function show(i, dir) {
      idx = (i + images.length) % images.length;
      const cur = images[idx];
      img.classList.remove('is-in');
      // 立即开始加载真实大图，加载完成后渐显（避免黑屏等待）
      img.src = cur.src;
      img.alt = cur.caption || '';
      const pre = new Image();
      pre.onload = pre.onerror = function () {
        requestAnimationFrame(function () { img.classList.add('is-in'); });
      };
      pre.src = cur.src;
      count.textContent = (idx + 1) + ' / ' + images.length;
      cap.textContent = cur.caption || '';
      origin.href = cur.src;
      thumbs.forEach(function (t, ti) { t.classList.toggle('is-active', ti === idx); });
      if (thumbs[idx]) thumbs[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
      // 预加载相邻两张
      [idx + 1, idx + 2].forEach(function (n) { new Image().src = images[n % images.length].src; });
    }

    function prev() { show(idx - 1); }
    function next() { show(idx + 1); }

    function close() {
      lb.classList.remove('is-open');
      document.body.classList.remove('gw-lock');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { lb.remove(); }, 240);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    }

    lb.querySelector('.gw-lb-prev').addEventListener('click', function (e) { e.stopPropagation(); prev(); });
    lb.querySelector('.gw-lb-next').addEventListener('click', function (e) { e.stopPropagation(); next(); });
    lb.querySelector('.gw-lb-close').addEventListener('click', close);
    stage.addEventListener('click', function (e) {
      if (e.target === img) next(); else close();
    });
    document.addEventListener('keydown', onKey);

    // 触摸左右滑动
    let startX = null;
    lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); }
      startX = null;
    });

    show(idx);
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
  }
}

// ------------------------------------------------------------------ 播放器

function renderMusicPlayer(box) {
  const props = readProps(box);
  let list = props.songs || [];

  function boot(lst) {
    if (!lst.length) { box.innerHTML = '<div class="search-empty">歌单为空</div>'; return; }
    render(lst);
  }

  if (!list.length) {
    // 兼容旧式无内联数据的 <MusicPlayer />：回退到 /data/music.json
    fetchData('music').then(function (raw) { boot(asList(raw)); });
    return;
  }
  boot(list);

  function render(songs) {
    // 支持 #t=N 锚点：从「音乐」页唱片墙点过来直接选中对应歌曲
    let start = 0;
    const m = /^#t=(\d+)$/.exec(location.hash || '');
    if (m && parseInt(m[1], 10) < songs.length) start = parseInt(m[1], 10);

    // 声波柱：随机高度/延迟，播放时跳动
    const BARS = 32;
    let barsHtml = '';
    for (let b = 0; b < BARS; b++) {
      const h = 18 + Math.round(Math.random() * 78);
      barsHtml += '<span style="height:' + h + '%;animation-delay:-' + (Math.random() * 1.4).toFixed(2) +
        's;animation-duration:' + (0.7 + Math.random() * 0.9).toFixed(2) + 's"></span>';
    }

    box.innerHTML =
      '<div class="music-player mp-stage">' +
      '<div class="mp-glow mp-glow-a"></div><div class="mp-glow mp-glow-b"></div>' +
      '<div class="mp-topbar">' +
      '<div class="mp-headline"><h2>沉浸聆听</h2><span class="mp-sub">Focus Flow · ' + songs.length + ' 首</span></div>' +
      '<div class="mp-topbar-actions">' +
      '<button type="button" class="mp-chip mp-mode" title="顺序播放">🔁 <span>顺序播放</span></button>' +
      '<button type="button" class="mp-chip mp-collapse">收起歌单</button>' +
      '</div></div>' +
      '<div class="mp-body">' +
      '<aside class="mp-side"><div class="mp-side-head">🎵 歌单</div>' +
      '<ul class="mp-playlist">' +
      songs.map(function (s, i) {
        return '<li class="mp-item" data-i="' + i + '" tabindex="0" role="button">' +
          '<span class="mp-thumb">' + (s.cover ? '<img src="' + esc(s.cover) + '" alt="" loading="lazy">' : '🎵') + '</span>' +
          '<div class="mp-pinfo"><p class="mp-ptitle">' + esc(s.title) + '</p>' +
          '<p class="mp-partist">' + esc(s.artist || '') + '</p></div>' +
          '<span class="mp-eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '</li>';
      }).join('') +
      '</ul></aside>' +
      '<div class="mp-deck">' +
      '<div class="mp-turntable">' +
      '<div class="mp-disc">' +
      '<div class="mp-disc-face"><img alt=""><div class="mp-cover-ph">🎵</div></div>' +
      '<span class="mp-disc-hole"></span>' +
      '</div>' +
      '<div class="mp-tonearm"><span class="mp-arm-pivot"></span><span class="mp-arm-stick"></span><span class="mp-arm-head"></span></div>' +
      '</div>' +
      '<div class="mp-wave">' + barsHtml + '</div>' +
      '<div class="mp-now"><h3 class="mp-title">—</h3><p class="mp-artist">—</p></div>' +
      '<div class="mp-progress"><span class="mp-time mp-cur">0:00</span>' +
      '<input type="range" class="mp-bar" min="0" max="100" step="0.1" value="0" aria-label="播放进度">' +
      '<span class="mp-time mp-dur">0:00</span></div>' +
      '<div class="mp-controls">' +
      '<button type="button" class="mp-btn mp-prev" title="上一首">⏮</button>' +
      '<button type="button" class="mp-btn mp-play" title="播放">▶</button>' +
      '<button type="button" class="mp-btn mp-next" title="下一首">⏭</button>' +
      '<button type="button" class="mp-btn mp-volbtn" title="音量：70%">🔊</button>' +
      '<input type="range" class="mp-vol" min="0" max="100" value="70" title="音量">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<audio preload="metadata"></audio></div>';

    const stage = box.querySelector('.mp-stage');
    const audio = box.querySelector('audio');
    const disc = box.querySelector('.mp-disc');
    const tonearm = box.querySelector('.mp-tonearm');
    const wave = box.querySelector('.mp-wave');
    const titleEl = box.querySelector('.mp-title');
    const artistEl = box.querySelector('.mp-artist');
    const bar = box.querySelector('.mp-bar');
    const curEl = box.querySelector('.mp-cur');
    const durEl = box.querySelector('.mp-dur');
    const playBtn = box.querySelector('.mp-play');
    const modeBtn = box.querySelector('.mp-mode');
    const volBtn = box.querySelector('.mp-volbtn');
    const volEl = box.querySelector('.mp-vol');
    const ul = box.querySelector('.mp-playlist');
    const collapse = box.querySelector('.mp-collapse');

    let idx = start;
    let mode = 'list'; // list 顺序 | loop 列表循环 | single 单曲循环
    let volume = 0.7;
    const MODES = { list: { icon: '🔁', label: '顺序播放' }, loop: { icon: '🔂', label: '列表循环' }, single: { icon: '🔊', label: '单曲循环' } };

    function fmt(s) {
      if (!isFinite(s) || s < 0) return '0:00';
      return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    }

    const items = Array.prototype.slice.call(ul.querySelectorAll('.mp-item'));

    function load(i, autoplay) {
      idx = i;
      const s = songs[idx];
      if (!s) return;
      titleEl.textContent = s.title;
      artistEl.textContent = s.artist || '—';
      const img = disc.querySelector('img');
      img.src = s.cover || '';
      img.style.display = s.cover ? '' : 'none';
      audio.src = encodePath(s.src || s.url || '');
      audio.volume = volume;
      audio.load();
      items.forEach(function (el) { el.classList.toggle('is-active', parseInt(el.dataset.i, 10) === idx); });
      const on = items.filter(function (el) { return parseInt(el.dataset.i, 10) === idx; })[0];
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
      if (autoplay) audio.play().catch(function () {});
    }

    function togglePlay() {
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    }
    function next() {
      if (mode === 'single') { audio.currentTime = 0; audio.play().catch(function () {}); return; }
      if (mode === 'list' && idx >= songs.length - 1) { audio.pause(); audio.currentTime = 0; syncPlay(); return; }
      load((idx + 1) % songs.length, true);
    }
    function prev() {
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      load((idx - 1 + songs.length) % songs.length, true);
    }

    function syncPlay() {
      const playing = !audio.paused && !audio.ended;
      playBtn.textContent = playing ? '⏸' : '▶';
      playBtn.title = playing ? '暂停' : '播放';
      disc.classList.toggle('is-playing', playing);
      tonearm.classList.toggle('is-playing', playing);
      stage.classList.toggle('is-playing', playing);
      items.forEach(function (el) {
        const on = parseInt(el.dataset.i, 10) === idx;
        el.classList.toggle('is-eq', on && playing);
      });
    }
    function cycleMode() {
      mode = mode === 'list' ? 'loop' : mode === 'loop' ? 'single' : 'list';
      modeBtn.firstChild.nodeValue = MODES[mode].icon + ' ';
      modeBtn.title = MODES[mode].label;
      modeBtn.querySelector('span').textContent = MODES[mode].label;
    }

    playBtn.addEventListener('click', togglePlay);
    modeBtn.addEventListener('click', cycleMode);
    box.querySelector('.mp-prev').addEventListener('click', prev);
    box.querySelector('.mp-next').addEventListener('click', next);
    items.forEach(function (el) {
      el.addEventListener('click', function () { load(parseInt(el.dataset.i, 10), true); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(parseInt(el.dataset.i, 10), true); }
      });
    });
    collapse.addEventListener('click', function () {
      const hidden = stage.classList.toggle('is-list-hidden');
      collapse.textContent = hidden ? '展开歌单' : '收起歌单';
    });
    volEl.addEventListener('input', function () {
      volume = Number(volEl.value) / 100;
      audio.volume = volume;
      volBtn.textContent = volume === 0 ? '🔇' : '🔊';
      volBtn.title = '音量：' + Math.round(volume * 100) + '%';
    });
    volBtn.addEventListener('click', function () {
      if (volume > 0) { volume = 0; audio.volume = 0; volEl.value = 0; volBtn.textContent = '🔇'; volBtn.title = '音量：0%'; }
      else { volume = 0.7; audio.volume = 0.7; volEl.value = 70; volBtn.textContent = '🔊'; volBtn.title = '音量：70%'; }
    });
    bar.addEventListener('input', function () {
      if (audio.duration) audio.currentTime = (Number(bar.value) / 100) * audio.duration;
    });
    audio.addEventListener('timeupdate', function () {
      curEl.textContent = fmt(audio.currentTime);
      if (audio.duration) { bar.value = (audio.currentTime / audio.duration) * 100; durEl.textContent = fmt(audio.duration); }
    });
    audio.addEventListener('loadedmetadata', function () { durEl.textContent = fmt(audio.duration); });
    audio.addEventListener('play', syncPlay);
    audio.addEventListener('pause', syncPlay);
    audio.addEventListener('ended', next);

    load(idx, false);
    syncPlay();

    // 暴露 API，供同页唱片墙页内联动
    box.__mpApi = { play: function (i) { if (i >= 0 && i < songs.length) load(i, true); } };
  }
}

/** 唱片墙（「音乐」页）：点击卡片联动同页播放器；若显式指定 target 则改为跳转 */
function renderVinylWall(box) {
  const props = readProps(box);
  const songs = props.songs || [];
  if (!songs.length) { box.innerHTML = ''; return; }
  const target = props.target || '#';
  const external = target !== '#' && target !== '';
  box.innerHTML =
    '<div class="vinyl-wall">' +
    songs.map(function (s, i) {
      const href = (external ? target + '#t=' + i : '#t=' + i);
      return '<a class="vw-card" href="' + esc(href) + '" data-i="' + i + '" title="播放：' + esc(s.title) + '">' +
        '<span class="vw-disc">' +
        (s.cover ? '<img src="' + esc(s.cover) + '" alt="' + esc(s.title) + '" loading="lazy">' : '🎵') +
        '<span class="vw-shine"></span>' +
        '<span class="vw-hole"></span>' +
        '</span>' +
        '<span class="vw-play">▶</span>' +
        '<span class="vw-meta"><b>' + esc(s.title) + '</b><i>' + esc(s.artist || '') + '</i></span>' +
        '</a>';
    }).join('') +
    '</div>';

  if (external) return;
  box.querySelectorAll('.vw-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      const i = parseInt(card.dataset.i, 10);
      const player = document.querySelector('.sk-music-player');
      if (player && player.__mpApi) {
        player.__mpApi.play(i);
        player.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderMoviePlayer(box) {
  const props = readProps(box);
  let list = props.movies || [];

  function boot(lst) {
    if (!lst.length) { box.innerHTML = '<div class="search-empty">片单为空</div>'; return; }
    render(lst);
  }

  if (!list.length) {
    fetchData('movies').then(function (raw) { boot(asList(raw)); });
    return;
  }
  boot(list);

  function render(movies) {
    box.innerHTML =
      '<div class="movie-player mv-stage">' +
      '<div class="mv-glow mv-glow-a"></div><div class="mv-glow mv-glow-b"></div>' +
      '<div class="mv-topbar">' +
      '<div class="mv-headline"><h2>私人影院</h2><span class="mv-sub">Cinema · ' + movies.length + ' 部</span></div>' +
      '<div class="mv-topbar-actions"><button type="button" class="mv-chip mv-collapse">收起片单</button></div>' +
      '</div>' +
      '<div class="mv-body">' +
      '<aside class="mv-side"><div class="mv-side-head">🎬 片单</div><ul class="mv-list"></ul></aside>' +
      '<div class="mv-deck">' +
      '<div class="mv-screen-wrap">' +
      '<div class="mv-screen"></div>' +
      '<div class="mv-ctrl">' +
      '<input type="range" class="mv-bar" min="0" max="100" step="0.1" value="0">' +
      '<div class="mv-row">' +
      '<button type="button" class="mv-btn mv-prev" title="上一部">⏮</button>' +
      '<button type="button" class="mv-btn mv-play main" title="播放">▶</button>' +
      '<button type="button" class="mv-btn mv-next" title="下一部">⏭</button>' +
      '<button type="button" class="mv-btn mv-back10" title="后退10秒">⏪</button>' +
      '<button type="button" class="mv-btn mv-fwd10" title="前进10秒">⏩</button>' +
      '<span class="mv-time">0:00 / 0:00</span>' +
      '<span class="mv-spacer"></span>' +
      '<button type="button" class="mv-btn mv-mute" title="静音">🔊</button>' +
      '<input type="range" class="mv-vol" min="0" max="100" value="90" title="音量">' +
      '<button type="button" class="mv-btn mv-fs" title="全屏">⛶</button>' +
      '</div></div></div>' +
      '<div class="mv-now"><div class="mv-info-head"><h2 class="mv-title"></h2><div class="mv-badges"></div></div>' +
      '<p class="mv-desc"></p><div class="mv-tags"></div></div>' +
      '</div></div></div>';

    const stage = box.querySelector('.mv-stage');
    const screen = box.querySelector('.mv-screen');
    const ctrlBar = box.querySelector('.mv-ctrl');
    const bar = box.querySelector('.mv-bar');
    const playBtn = box.querySelector('.mv-play');
    const timeEl = box.querySelector('.mv-time');
    const volEl = box.querySelector('.mv-vol');
    const muteBtn = box.querySelector('.mv-mute');
    const fsBtn = box.querySelector('.mv-fs');
    const titleEl = box.querySelector('.mv-title');
    const badgesEl = box.querySelector('.mv-badges');
    const descEl = box.querySelector('.mv-desc');
    const tagsEl = box.querySelector('.mv-tags');
    const listEl = box.querySelector('.mv-list');
    const collapse = box.querySelector('.mv-collapse');

    let idx = 0;
    let video = null;
    let volume = 0.9;
    let muted = false;
    let isEmbed = false;

    function fmt(s) {
      if (!isFinite(s) || s < 0) return '0:00';
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
      return h > 0 ? h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0') : m + ':' + String(sec).padStart(2, '0');
    }

    listEl.innerHTML = movies.map(function (m, i) {
      return '<li class="mv-item" data-i="' + i + '" tabindex="0" role="button">' +
        '<span class="mv-thumb">' + (m.cover ? '<img src="' + esc(m.cover) + '" alt="" loading="lazy">' : '🎬') + '</span>' +
        '<div class="mv-pinfo"><p class="mv-ptitle">' + esc(m.title) + '</p>' +
        '<p class="mv-psub">' + esc(m.quality || '') + (m.duration ? ' · ' + esc(m.duration) : '') + '</p></div>' +
        '<span class="mv-kind">' + (m.embedUrl ? 'B站' : '直链') + '</span>' +
        '</li>';
    }).join('');
    const items = Array.prototype.slice.call(listEl.querySelectorAll('.mv-item'));

    function showMeta() {
      const m = movies[idx];
      if (!m) return;
      titleEl.textContent = m.title;
      descEl.textContent = m.desc || '';
      let b = '';
      if (m.quality) b += '<span class="mv-badge quality">' + esc(m.quality) + '</span>';
      if (m.duration) b += '<span class="mv-badge dur">⏱ ' + esc(m.duration) + '</span>';
      b += '<span class="mv-badge type">' + (m.embedUrl ? 'B 站播放' : '直链播放') + '</span>';
      badgesEl.innerHTML = b;
      tagsEl.innerHTML = (m.tags && m.tags.length) ? m.tags.map(function (t) { return '<span class="mv-tag">' + esc(t) + '</span>'; }).join('') : '';
      items.forEach(function (el) {
        el.classList.toggle('is-active', parseInt(el.dataset.i, 10) === idx);
      });
      const on = items[idx];
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
    }

    function play(i) {
      idx = i;
      const m = movies[idx];
      if (!m) return;
      isEmbed = !!m.embedUrl;
      video = null;
      bar.value = 0;
      timeEl.textContent = '0:00 / 0:00';
      screen.innerHTML = '';
      if (isEmbed) {
        ctrlBar.style.display = 'none';
        screen.innerHTML = '<iframe src="' + esc(m.embedUrl) + '" title="' + esc(m.title) + '" frameborder="0" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" scrolling="no"></iframe>';
      } else {
        ctrlBar.style.display = '';
        screen.innerHTML = '<video preload="metadata" playsinline' + (m.cover ? ' poster="' + esc(m.cover) + '"' : '') + '></video>';
        video = screen.querySelector('video');
        video.src = encodePath(m.src || m.url || '');
        video.volume = muted ? 0 : volume;
        video.addEventListener('timeupdate', function () {
          timeEl.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
          if (video.duration) bar.value = (video.currentTime / video.duration) * 100;
        });
        video.addEventListener('loadedmetadata', function () {
          timeEl.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
        });
        video.addEventListener('play', function () { playBtn.textContent = '⏸'; playBtn.title = '暂停'; });
        video.addEventListener('pause', function () { playBtn.textContent = '▶'; playBtn.title = '播放'; });
        video.addEventListener('ended', function () { playBtn.textContent = '▶'; playBtn.title = '播放'; });
        video.addEventListener('click', togglePlay);
        // 片源缺失（如体积超过部署平台 25MiB 上限而未随站部署）时给出降级提示
        video.addEventListener('error', function () {
          ctrlBar.style.display = 'none';
          screen.innerHTML = '<div class="mv-empty">' +
            '<b>该片源未随站点部署</b>' +
            '<span>单文件超过部署平台 25MiB 上限。可压缩到 25MiB 以内，或上传到对象存储 / CDN 后改用外链。</span>' +
            '</div>';
        });
        video.play().catch(function () {});
      }
      showMeta();
    }

    function togglePlay() {
      if (isEmbed || !video) return;
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    }
    function skip(d) {
      if (!video) return;
      video.currentTime = Math.min(Math.max(0, video.currentTime + d), video.duration || 0);
    }

    box.querySelector('.mv-prev').addEventListener('click', function () { play(Math.max(0, idx - 1)); });
    box.querySelector('.mv-next').addEventListener('click', function () { play(Math.min(movies.length - 1, idx + 1)); });
    box.querySelector('.mv-back10').addEventListener('click', function () { skip(-10); });
    box.querySelector('.mv-fwd10').addEventListener('click', function () { skip(10); });
    playBtn.addEventListener('click', togglePlay);
    bar.addEventListener('input', function () { if (video && video.duration) video.currentTime = (Number(bar.value) / 100) * video.duration; });
    volEl.addEventListener('input', function () {
      volume = Number(volEl.value) / 100;
      muted = volume === 0;
      if (video) { video.volume = volume; video.muted = muted; }
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.title = muted ? '取消静音' : '静音';
    });
    muteBtn.addEventListener('click', function () {
      muted = !muted;
      if (video) {
        video.muted = muted;
        if (!muted && volume === 0) { volume = 0.6; video.volume = 0.6; volEl.value = 60; }
      }
      muteBtn.textContent = muted ? '🔇' : '🔊';
    });
    fsBtn.addEventListener('click', function () {
      const wrap = box.querySelector('.mv-screen-wrap');
      if (!document.fullscreenElement) { if (wrap.requestFullscreen) wrap.requestFullscreen(); }
      else { document.exitFullscreen(); }
    });
    collapse.addEventListener('click', function () {
      const hidden = stage.classList.toggle('is-list-hidden');
      collapse.textContent = hidden ? '展开片单' : '收起片单';
    });
    items.forEach(function (el) {
      el.addEventListener('click', function () { play(parseInt(el.dataset.i, 10)); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(parseInt(el.dataset.i, 10)); }
      });
    });

    play(idx);

    // 暴露 API，供同页海报墙页内联动
    box.__mvApi = { play: function (i) { if (i >= 0 && i < movies.length) play(i); } };
  }
}

/** 电影海报墙（「电影」页）：点击海报联动同页电影播放器 */
function renderMovieWall(box) {
  const props = readProps(box);
  const movies = props.movies || [];
  if (!movies.length) { box.innerHTML = ''; return; }
  box.innerHTML =
    '<div class="movie-wall">' +
    movies.map(function (m, i) {
      return '<a class="mw-card" href="#movie-' + i + '" data-i="' + i + '" title="播放：' + esc(m.title) + '">' +
        '<span class="mw-poster">' +
        (m.cover ? '<img src="' + esc(m.cover) + '" alt="' + esc(m.title) + '" loading="lazy">' : '<span class="mw-nocover">🎬</span>') +
        '<span class="mw-shade"></span>' +
        (m.duration ? '<span class="mw-dur">' + esc(m.duration) + '</span>' : '') +
        (m.embed ? '<span class="mw-kind">B站</span>' : '<span class="mw-kind">直链</span>') +
        '<span class="mw-play">▶</span>' +
        '</span>' +
        '<span class="mw-meta"><b>' + esc(m.title) + '</b>' +
        '<i>' + esc(m.quality || '') + '</i></span>' +
        '</a>';
    }).join('') +
    '</div>';

  box.querySelectorAll('.mw-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      const i = parseInt(card.dataset.i, 10);
      const player = document.querySelector('.sk-movie-player');
      if (player && player.__mvApi) {
        player.__mvApi.play(i);
        player.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderPdfReader(box) {
  const props = readProps(box);
  const queryId = new URLSearchParams(location.search).get('id');
  const wantId = props.bookId || queryId;

  fetchData('books').then(function (raw) {
    let list = asList(raw);
    const custom = props.src;
    if (custom) {
      list = [{ id: 'custom', title: '自定义文档', author: '—', src: custom }].concat(list);
    }
    if (!list.length) { box.innerHTML = '<div class="search-empty">书库为空</div>'; return; }

    let current = wantId ? list.filter(function (b) { return b.id === wantId; })[0] : null;
    if (current) list = [current].concat(list.filter(function (b) { return b !== current; }));
    else current = list[0];

    box.innerHTML =
      '<div class="pdf-reader">' +
      '<div class="pdf-toolbar">' +
      '<span class="pdf-title" id="pdfTitle"></span>' +
      '<span style="margin-left:auto;display:flex;gap:6px">' +
      '<a class="btn" id="pdfDownload" target="_blank" rel="noopener">下载</a>' +
      '</span></div>' +
      '<div class="pdf-frame"><iframe id="pdfFrame" src="" loading="lazy"></iframe></div>' +
      '</div>';

    const frame = box.querySelector('#pdfFrame');
    const title = box.querySelector('#pdfTitle');
    const dl = box.querySelector('#pdfDownload');
    function show(book) {
      if (!book) return;
      title.textContent = (book.title || '') + (book.author && book.author !== '—' ? ' · ' + book.author : '');
      frame.src = book.src || book.url || book.pdf || '';
      dl.href = frame.src;
      dl.download = (book.title || 'document') + '.pdf';
    }
    show(current);
  });
}

// ------------------------------------------------------------------ 3D 模型

function render3D(box) {
  const props = readProps(box);
  const path = props['model-path'] || props.modelPath || '';
  if (!path) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="embed-block" style="height:480px">' +
    '<model-viewer src="' + esc(path) + '" alt="3D 模型" camera-controls auto-rotate ' +
    'style="width:100%;height:480px"></model-viewer></div>';
  if (!document.querySelector('script[data-model-viewer]')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.dataset.modelViewer = '1';
    s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
    document.head.appendChild(s);
  }
}

// ------------------------------------------------------------- 关于页（三段式）

function renderAbout(box) {
  fetchData('about').then(function (d) {
    if (!d) { box.innerHTML = ''; return; }
    const p = d.profile || {};
    let html = '<section class="about-profile">' +
      '<div class="about-avatar"><img src="' + esc(p.avatar || '/img/xyy.webp') + '" alt=""></div>' +
      '<div><div class="about-hello">' + esc(p.title || '你好，我是') + '</div>' +
      '<h1 class="about-name">' + esc(p.name || '') + '</h1>' +
      '<div class="about-desc">' + esc(p.desc || '') + '</div>' +
      '<div class="about-buttons">' + (p.buttons || []).map(function (b) {
        return '<a class="btn ' + (b.type === 'primary' ? 'btn-brand' : '') + '" href="' + esc(b.link) + '">' +
          esc(b.text) + '</a>';
      }).join('') + '</div></div></section>';

    html += '<section class="about-skills"><h2 class="section-title"><span class="title-icon">🛠️</span>主要技能</h2>' +
      (d.majorSkills || []).map(function (s) {
        return '<div class="skill-group">' +
          '<div class="skill-head"><span>' + esc(s.name) + '</span>' +
          '<div class="progress-bar" style="flex:1;margin:0 12px"><div class="progress-fill" style="width:' +
          esc(s.percent) + '%;background:' + esc(s.color) + '"></div></div>' +
          '<span class="progress-percent" style="color:' + esc(s.color) + '">' + esc(s.percent) + '%</span></div>' +
          '<div class="skill-tags">' + (s.tags || []).map(function (t) {
            return '<span class="skill-tag" style="background:' + esc(t.bg) + ';color:' + esc(t.color) + '">' +
              esc(t.name) + '</span>';
          }).join('') + '</div></div>';
      }).join('') + '</section>';

    if (d.techStack && d.techStack.length) {
      html += '<section class="about-stack"><h2 class="section-title"><span class="title-icon">🧰</span>技术栈</h2>' +
        '<div class="stack-grid">' + d.techStack.map(function (t) {
          return '<span class="stack-item">' + esc(t) + '</span>';
        }).join('') + '</div></section>';
    }

    html += '<section class="about-projects"><h2 class="section-title"><span class="title-icon">📦</span>开源项目</h2>' +
      '<div class="post-grid">' + (d.ossProjects || []).map(function (pr) {
        return '<a class="article-card" href="' + esc(pr.github || '#') + '" target="_blank" rel="noopener">' +
          (pr.projectsimg ? '<div class="card-cover"><img src="' + esc(pr.projectsimg) + '" loading="lazy" alt=""></div>' : '') +
          '<div class="card-content"><h3 class="card-title">' + esc(pr.name) + '</h3>' +
          '<p class="card-excerpt">' + esc(pr.desc) + '</p>' +
          '<div class="card-footer">' +
          '<span class="card-meta-item">⭐ ' + esc(pr.Star || '') + '</span>' +
          '<span class="card-meta-item">🍴 ' + esc(pr.Fork || '') + '</span>' +
          '<span class="card-meta-item">👁 ' + esc(pr.View || '') + '</span>' +
          (pr.tag ? '<span class="badge" style="background:' + esc(pr.tag.bg) + ';color:' + esc(pr.tag.color) + '">' +
            esc(pr.tag.name) + '</span>' : '') +
          '</div></div></a>';
      }).join('') + '</div></section>';

    box.innerHTML = html;
  });
}

// ------------------------------------------------------------------ 思考卡片

const THOUGHT_COLORS = { blue: '#4298b4', green: '#33a474', purple: '#88619a', orange: '#e4ae3a' };

function renderThoughts(box) {
  fetchData('thoughts').then(function (raw) {
    const list = asList(raw);
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="thought-grid">' + list.map(function (t) {
      const color = THOUGHT_COLORS[t.color] || THOUGHT_COLORS.blue;
      return '<div class="thought-card" style="border-top-color:' + color + '">' +
        '<div class="thought-head"><span class="thought-cat" style="background:' + color + '1a;color:' + color + '">' +
        esc(t.category || '') + '</span>' +
        '<span class="thought-date">' + esc(t.date || '') + '</span></div>' +
        '<div class="thought-body">' + esc(t.content || '') + '</div>' +
        '<div class="thought-foot">— 自己</div></div>';
    }).join('') + '</div>';
  });
}

// ------------------------------------------------------------------ 情侣相册

function renderAlbum(box) {
  fetchData('album').then(function (raw) {
    if (!raw) { box.innerHTML = ''; return; }
    const filters = raw.filters || [];
    const names = raw.categoryNames || {};
    const KEY = 'coupleAlbumPhotos';
    let photos = raw.photos || [];
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved) && saved.length) photos = saved;
    } catch (e) { /* ignore */ }

    let active = 'all';
    let order = raw.defaultSortOrder || 'desc';

    box.innerHTML =
      '<div class="album-toolbar">' +
      '<div class="gallery-filters" id="albumFilters">' + filters.map(function (f) {
        return '<button class="filter-btn' + (f.key === 'all' ? ' is-active' : '') + '" data-cat="' +
          esc(f.key) + '" type="button">' + esc(f.label) + '</button>';
      }).join('') + '</div>' +
      '<div class="album-actions">' +
      '<button class="btn" type="button" id="albumSort">' + (order === 'desc' ? '最新在前 ↓' : '最早在前 ↑') + '</button>' +
      '<button class="btn btn-brand" type="button" id="albumAdd">+ 添加回忆</button>' +
      '</div></div>' +
      '<div class="album-grid" id="albumGrid"></div>' +
      '<div class="album-form" id="albumForm" style="display:none">' +
      '<div class="sidebar-card">' +
      '<div class="card-title"><span class="title-icon">💖</span><span class="title-text">添加回忆</span></div>' +
      '<label class="login-field"><span>图片地址</span><input type="text" id="albumUrl" placeholder="https://..."></label>' +
      '<label class="login-field"><span>日期</span><input type="date" id="albumDate"></label>' +
      '<label class="login-field"><span>描述</span><textarea id="albumDesc" rows="3"></textarea></label>' +
      '<label class="login-field"><span>分类</span><select id="albumCat">' +
      filters.filter(function (f) { return f.key !== 'all'; }).map(function (f) {
        return '<option value="' + esc(f.key) + '">' + esc(f.label) + '</option>';
      }).join('') + '</select></label>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-brand" type="button" id="albumSave">保存</button>' +
      '<button class="btn" type="button" id="albumCancel">取消</button></div>' +
      '</div></div>';

    const grid = box.querySelector('#albumGrid');
    function paint() {
      let list = active === 'all' ? photos.slice() : photos.filter(function (p) { return p.category === active; });
      list.sort(function (a, b) {
        return order === 'desc' ? String(b.date).localeCompare(String(a.date))
          : String(a.date).localeCompare(String(b.date));
      });
      if (!list.length) { grid.innerHTML = '<div class="search-empty">还没有回忆</div>'; return; }
      grid.innerHTML = list.map(function (p) {
        return '<div class="album-card"><img src="' + esc(p.url) + '" loading="lazy" alt="">' +
          '<div class="album-body"><span class="badge">' + esc(names[p.category] || p.category || '') + '</span>' +
          '<div class="album-date">' + esc(p.date || '') + '</div>' +
          '<div class="album-desc">' + esc(p.description || '') + '</div></div></div>';
      }).join('');
    }
    paint();

    box.querySelectorAll('#albumFilters .filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        box.querySelectorAll('#albumFilters .filter-btn').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        active = btn.dataset.cat;
        paint();
      });
    });
    box.querySelector('#albumSort').addEventListener('click', function () {
      order = order === 'desc' ? 'asc' : 'desc';
      this.textContent = order === 'desc' ? '最新在前 ↓' : '最早在前 ↑';
      paint();
    });
    const form = box.querySelector('#albumForm');
    box.querySelector('#albumAdd').addEventListener('click', function () { form.style.display = ''; });
    box.querySelector('#albumCancel').addEventListener('click', function () { form.style.display = 'none'; });
    box.querySelector('#albumSave').addEventListener('click', function () {
      const url = box.querySelector('#albumUrl').value.trim();
      const date = box.querySelector('#albumDate').value;
      const description = box.querySelector('#albumDesc').value.trim();
      const category = box.querySelector('#albumCat').value;
      if (!url || !date) { alert('请至少填写图片地址与日期'); return; }
      const id = photos.reduce(function (m, p) { return Math.max(m, p.id || 0); }, 0) + 1;
      photos.unshift({ id: id, url: url, date: date, description: description, category: category });
      try { localStorage.setItem(KEY, JSON.stringify(photos)); } catch (e) { /* ignore */ }
      form.style.display = 'none';
      box.querySelector('#albumUrl').value = '';
      box.querySelector('#albumDesc').value = '';
      paint();
    });
  });
}

// ------------------------------------------------------------------ 朋友圈

function renderMoments(box) {
  fetchData('moments').then(function (raw) {
    const base = asList(raw);
    if (!base.length) { box.innerHTML = ''; return; }
    const KEY = 'momentsData';
    let list = base.map(function (m) {
      return Object.assign({}, m, { time: Date.now() + (m.timeOffsetMs || 0) });
    });
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved) && saved.length) list = saved;
    } catch (e) { /* ignore */ }

    function paint() {
      box.innerHTML = list.map(function (m, i) {
        const diff = Date.now() - m.time;
        const label = m.timeLabel || (diff < 3600000 ? Math.max(1, Math.round(diff / 60000)) + '分钟前'
          : diff < 86400000 ? Math.round(diff / 3600000) + '小时前' : Math.round(diff / 86400000) + '天前');
        return '<div class="moment-item">' +
          '<img class="moment-avatar" src="/img/xyy.webp" alt="">' +
          '<div class="moment-body">' +
          '<div class="moment-name">sakaay|飒龘</div>' +
          '<div class="moment-text">' + esc(m.content) + '</div>' +
          (m.images && m.images.length ? '<div class="moment-images">' + m.images.map(function (im) {
            return '<img src="' + esc(im) + '" loading="lazy" alt="">';
          }).join('') + '</div>' : '') +
          '<div class="moment-foot"><span class="moment-time">' + esc(label) + '</span>' +
          '<button class="moment-like' + (m.liked ? ' is-liked' : '') + '" data-i="' + i + '" type="button">' +
          '❤ ' + esc(m.likes || 0) + '</button>' +
          '<span class="moment-comment">💬 ' + esc(m.comments || 0) + '</span></div>' +
          '</div></div>';
      }).join('');

      box.querySelectorAll('.moment-like').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const i = parseInt(btn.dataset.i, 10);
          const m = list[i];
          m.liked = !m.liked;
          m.likes = (m.likes || 0) + (m.liked ? 1 : -1);
          try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
          paint();
        });
      });
    }
    paint();
  });
}

// ------------------------------------------------------------------ 时间轴

function renderTimeline(box) {
  fetchData('timeline').then(function (raw) {
    if (!raw) { box.innerHTML = ''; return; }
    const KEY = raw.storageKey || 'timelineEvents';
    const events = raw.events || [];
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved) && saved.length) events.splice.apply(events, [0, events.length].concat(saved));
    } catch (e) { /* ignore */ }

    box.innerHTML = '<div class="timeline-wrap" id="timelineWrap"></div>' +
      '<div class="timeline-editor">' +
      '<button class="btn btn-brand" type="button" id="tlAdd">+ 添加事件</button>' +
      '<div class="timeline-form" id="tlForm" style="display:none">' +
      '<label class="login-field"><span>日期</span><input type="date" id="tlDate"></label>' +
      '<label class="login-field"><span>标题</span><input type="text" id="tlTitle"></label>' +
      '<label class="login-field"><span>描述</span><textarea id="tlDesc" rows="3"></textarea></label>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-brand" type="button" id="tlSave">保存</button>' +
      '<button class="btn" type="button" id="tlCancel">取消</button></div>' +
      '</div></div>';

    const wrap = box.querySelector('#timelineWrap');
    function paint() {
      const sorted = events.map(function (e, i) { return Object.assign({}, e, { _i: i }); })
        .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
      wrap.innerHTML = sorted.map(function (e) {
        return '<div class="timeline-event"><div class="timeline-date">' + esc(e.date) + '</div>' +
          '<div class="timeline-title">' + esc(e.title) + '</div>' +
          '<div class="timeline-desc">' + esc(e.description || '') + '</div>' +
          '<button class="timeline-del" data-i="' + e._i + '" type="button" title="删除">×</button></div>';
      }).join('');
      wrap.querySelectorAll('.timeline-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          events.splice(parseInt(btn.dataset.i, 10), 1);
          try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (e) { /* ignore */ }
          paint();
        });
      });
    }
    paint();

    const form = box.querySelector('#tlForm');
    box.querySelector('#tlAdd').addEventListener('click', function () { form.style.display = ''; });
    box.querySelector('#tlCancel').addEventListener('click', function () { form.style.display = 'none'; });
    box.querySelector('#tlSave').addEventListener('click', function () {
      const date = box.querySelector('#tlDate').value;
      const title = box.querySelector('#tlTitle').value.trim();
      const description = box.querySelector('#tlDesc').value.trim();
      if (!date || !title) { alert('请填写日期与标题'); return; }
      events.push({ date: date, title: title, description: description });
      try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (e) { /* ignore */ }
      form.style.display = 'none';
      box.querySelector('#tlTitle').value = '';
      box.querySelector('#tlDesc').value = '';
      paint();
    });
  });
}

// ------------------------------------------------------------------ 文创产品

function renderProductGrid(box) {
  fetchData('products').then(function (list) {
    const cat = box.dataset.category || '';
    const items = (Array.isArray(list) ? list : []).filter(function (p) { return !cat || p.category === cat; });
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="gallery-grid">' + items.map(function (p) {
      const img = (p.images && p.images[0]) || p.image || '';
      return '<div class="gallery-card">' +
        (img ? '<div class="gallery-cover"><img src="' + esc(img) + '" loading="lazy" alt=""></div>' : '') +
        '<div class="gallery-body"><div class="gallery-title">' + esc(p.name) + '</div>' +
        '<div class="gallery-desc">' + esc(p.description || '') + '</div>' +
        '<div class="gallery-action" style="color:var(--accent-color)">￥' + esc(p.price) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  });
}

function initProductDetail() {
  const host = document.getElementById('productDetail');
  if (!host) return;
  const id = new URLSearchParams(location.search).get('id');
  fetchData('products').then(function (list) {
    const p = (Array.isArray(list) ? list : []).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) { host.innerHTML = '<div class="search-empty">未找到该产品</div>'; return; }
    host.innerHTML = '<div class="sidebar-card"><div class="card-title"><span class="title-icon">🎁</span>' +
      '<span class="title-text">' + esc(p.name) + '</span></div>' +
      '<div style="display:flex;gap:1rem;flex-wrap:wrap">' +
      (p.images || []).map(function (im) {
        return '<img src="' + esc(im) + '" style="width:220px;border-radius:10px" loading="lazy" alt="">';
      }).join('') + '</div>' +
      '<p style="margin-top:1rem">' + esc(p.description || '') + '</p>' +
      '<p style="color:var(--accent-color);font-weight:700">￥' + esc(p.price) + '</p></div>';
  });
}

// ------------------------------------------------------------------ 导航页 / 登录

function initNavFilter() {
  const input = document.getElementById('navSearch');
  if (!input) return;
  input.addEventListener('input', function () {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.nav-card-item').forEach(function (card) {
      const text = ((card.dataset.name || '') + (card.dataset.desc || '')).toLowerCase();
      card.style.display = !q || text.indexOf(q) > -1 ? '' : 'none';
    });
  });
}

function initLogin() {
  const btn = document.getElementById('loginSubmit');
  if (!btn) return;
  const tip = document.getElementById('loginTip');
  btn.addEventListener('click', function () {
    const user = (document.getElementById('loginUser') || {}).value || '';
    const pass = (document.getElementById('loginPass') || {}).value || '';
    if (!user || !pass) { tip.textContent = '请输入账号和密码'; tip.style.color = '#f56c6c'; return; }
    tip.textContent = '登录接口未在此构建中接入，请联系站长开通。';
    tip.style.color = 'var(--text-muted)';
  });
}

// ------------------------------------------------------------------ 启动

export function initComponents() {
  document.querySelectorAll('.sk-question').forEach(renderQuestionBlock);
  document.querySelectorAll('.sk-python').forEach(renderPython);
  document.querySelectorAll('.sk-tools-gallery').forEach(function (el) { renderGallery(el, 'tools'); });
  document.querySelectorAll('.sk-fun-gallery').forEach(function (el) { renderGallery(el, 'fun'); });
  document.querySelectorAll('.sk-music-player').forEach(renderMusicPlayer);
  document.querySelectorAll('.sk-vinyl-wall').forEach(renderVinylWall);
  document.querySelectorAll('.sk-movie-player').forEach(renderMoviePlayer);
  document.querySelectorAll('.sk-movie-wall').forEach(renderMovieWall);
  document.querySelectorAll('.sk-gallery').forEach(renderGalleryWall);
  document.querySelectorAll('.sk-pdf-reader').forEach(renderPdfReader);
  document.querySelectorAll('.sk-3d').forEach(render3D);
  document.querySelectorAll('.sk-products').forEach(renderProductGrid);
  document.querySelectorAll('.sk-about').forEach(renderAbout);
  document.querySelectorAll('.sk-thought-cards').forEach(renderThoughts);
  document.querySelectorAll('.sk-couple-album').forEach(renderAlbum);
  document.querySelectorAll('.sk-moments').forEach(renderMoments);
  document.querySelectorAll('.sk-timeline').forEach(renderTimeline);
  initNavFilter();
  initLogin();
  initProductDetail();
}
