/* 侧栏挂件：日历、时间进度、运行时长、最新评论 */
import { once } from './util.js';
import { loadTwikoo, version as twikooVersion } from './twikoo.js';

const SPRING_FESTIVALS = {
  2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06',
  2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03',
};

function pad(n) { return String(n).padStart(2, '0'); }

function initCalendar() {
  const dayEl = document.getElementById('calendarDay');
  if (!dayEl) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const start = new Date(year, 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);

  dayEl.textContent = now.getDate();
  const weekEl = document.getElementById('calendarWeek');
  if (weekEl) weekEl.textContent = '第 ' + Math.ceil((dayOfYear + new Date(year, 0, 1).getDay()) / 7) + ' 周 · ' + weekNames[now.getDay()];
  const dateEl = document.getElementById('calendarDate');
  if (dateEl) dateEl.textContent = year + '年' + (month + 1) + '月';
  const doyEl = document.getElementById('calendarDayOfYear');
  if (doyEl) doyEl.textContent = '第 ' + dayOfYear + ' 天';

  let lunar = '';
  try {
    lunar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(now);
  } catch (e) { lunar = ''; }
  const lunarEl = document.getElementById('calendarLunar');
  if (lunarEl) lunarEl.textContent = lunar;

  // 迷你月历
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const box = document.getElementById('calendarDays');
  if (!box) return;
  let html = '';
  for (let i = 0; i < first; i++) html += '<span></span>';
  for (let d = 1; d <= days; d++) {
    html += '<span class="' + (d === now.getDate() ? 'is-today' : '') + '">' + d + '</span>';
  }
  box.innerHTML = html;
}

function setBar(idPrefix, percent, remainText) {
  const fill = document.getElementById(idPrefix + 'Fill');
  const pct = document.getElementById(idPrefix + 'Percent');
  const remain = document.getElementById(idPrefix + 'Remain');
  if (fill) fill.style.width = percent.toFixed(1) + '%';
  if (pct) pct.textContent = percent.toFixed(0) + '%';
  if (remain) remain.textContent = remainText;
}

function initTimeProgress() {
  if (!document.getElementById('yearFill')) return;
  const now = new Date();
  const y = now.getFullYear();

  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y + 1, 0, 1);
  setBar('year', ((now - yearStart) / (yearEnd - yearStart)) * 100, '本年还剩 ' + Math.ceil((yearEnd - now) / 86400000) + ' 天');

  const monthEnd = new Date(y, now.getMonth() + 1, 1);
  const monthStart = new Date(y, now.getMonth(), 1);
  setBar('month', ((now - monthStart) / (monthEnd - monthStart)) * 100, '本月还剩 ' + Math.ceil((monthEnd - now) / 86400000) + ' 天');

  const weekStart = new Date(y, now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  setBar('week', ((now - weekStart) / (weekEnd - weekStart)) * 100, '本周还剩 ' + Math.ceil((weekEnd - now) / 86400000) + ' 天');

  // 春节倒计时
  let target = SPRING_FESTIVALS[y];
  if (!target || new Date(target) < now) target = SPRING_FESTIVALS[y + 1];
  const daysEl = document.getElementById('springDays');
  const dateEl = document.getElementById('springDate');
  if (target && daysEl) {
    daysEl.textContent = Math.ceil((new Date(target) - now) / 86400000) + ' 天';
    if (dateEl) dateEl.textContent = target;
  }
}

function runtimeText(start, ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d + ' 天 ' + pad(h) + ' 时 ' + pad(m) + ' 分 ' + pad(s % 60) + ' 秒';
}

/** 运行时长：定时器只启动一次，刷新目标元素指向新 DOM */
function initRuntime() {
  let cfg = {};
  try { cfg = JSON.parse(document.getElementById('site-config').textContent); } catch (e) { return; }
  const start = new Date(cfg.siteStart || '2021-10-19T00:00:00+08:00');

  function tick() {
    const text = runtimeText(start, Date.now() - start.getTime());
    const el = document.getElementById('runtime');
    if (el) el.textContent = '小破站已运行 ' + text;
    const el2 = document.getElementById('siteRuntime');
    if (el2) el2.textContent = text;
  }
  tick();
  setInterval(tick, 1000);
}

function initRecentComments() {
  const list = document.getElementById('recent-comments-list');
  const cfgEl = document.getElementById('recent-comments-config');
  if (!list || !cfgEl) return;
  let cfg = {};
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  if (!cfg.envId) { list.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted)">未配置评论服务</div>'; return; }

  function render(items) {
    if (!items.length) { list.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted)">暂无评论</div>'; return; }
    list.innerHTML = items.map(function (c) {
      const nick = c.nick || c.nickname || '匿名';
      const text = (c.commentText || c.comment || '').replace(/<[^>]+>/g, '');
      const url = c.url || '';
      return '<div class="tk-friend-item">' +
        '<img class="tk-friend-avatar" src="' + (c.avatar || '/img/xyy.webp') + '" alt="" loading="lazy">' +
        '<div><div class="tk-friend-name">' + nick + '</div>' +
        '<div class="tk-friend-desc">' + text.slice(0, 40) + '</div>' +
        (url ? '<a class="tk-friend-desc" href="' + url + '">' + url + '</a>' : '') + '</div></div>';
    }).join('');
  }
  function failed() {
    list.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted)">评论加载失败</div>';
  }

  loadTwikoo(twikooVersion())
    .then(function (tw) {
      if (!tw || typeof tw.getRecentComments !== 'function') return failed();
      return tw.getRecentComments({ envId: cfg.envId, pageSize: cfg.pageSize || 5 })
        .then(function (res) { render(res || []); })
        .catch(failed);
    })
    .catch(failed);
}

/** 文章页评论区初始化（SPA 切换后需重新调用） */
export function initComments() {
  const el = document.getElementById('tcomment');
  if (!el || el.dataset.inited) return;
  const envId = el.getAttribute('data-env-id');
  if (!envId) return;

  loadTwikoo(el.getAttribute('data-twikoo-version'))
    .then(function (tw) {
      if (!tw) return;
      el.dataset.inited = '1';
      tw.init({ envId: envId, el: '#tcomment' });
    })
    .catch(function () { /* 评论服务不可用时静默降级 */ });
}

/** 全局一次：运行时长定时器（页面级挂件由 page.js 的 reinitPage 负责） */
export function initWidgets() {
  once('runtime', initRuntime);
}

export function initPageWidgets() {
  initCalendar();
  initTimeProgress();
  initRecentComments();
}
