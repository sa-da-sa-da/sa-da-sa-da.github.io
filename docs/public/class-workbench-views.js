/* 班主任工作台 - 特殊视图
 * 依赖：window.WB 由 class-workbench.js 提供
 * 加载顺序：class-workbench.js 必须先于本文件加载
 */
window.WB_VIEWS = (function () {
  'use strict';
  var WB = window.WB;
  var H = WB.escapeHtml;
  function el(id) { return document.getElementById(id); }

  // 重新获取 content 根节点：用 cloneNode 替换以清除旧的根级事件监听，防止重复累积
  function rebindRoot() {
    var content = el('content');
    if (content.parentNode) {
      var clone = content.cloneNode(true);
      content.parentNode.replaceChild(clone, content);
    }
    return el('content');
  }

  // ============ 仪表盘 ============
  function renderDashboard() {
    var stats = computeDashboardStats();
    var html = '';
    // 顶部统计
    html += '<div class="stats-row">';
    html += statCard('👥', '班级总人数', stats.totalStudents, '来自花名册', '');
    html += statCard('✅', '今日待办', stats.todoToday, '含今日到期事项', stats.todoToday > 0 ? 'warn' : '');
    html += statCard('📞', '待沟通家长', stats.pendingParents, '家长沟通待跟进', 'warn');
    html += statCard('⭐', '重点关注学生', stats.keyStudents, '心理/特殊档案', 'danger');
    html += '</div>';

    // 百度搜索
    html += '<div style="margin-top:12px">';
    html += dashCard('🔍 百度搜索', renderBaiduSearch(), 'baidu');
    html += '</div>';

    // 主体两栏
    html += '<div class="dash-row" style="margin-top:12px">';

    // 左：今日待办 + 本周日程
    html += '<div>';
    html += dashCard('✅ 今日待办', renderTodoList(stats.todoTodayList), 'todo');
    html += '<div style="height:12px"></div>';
    html += dashCard('📅 本周日程', renderWeeklyPlan(stats.weeklyPlans), 'weeklyPlan');
    html += '</div>';

    // 右：待沟通 + 重点学生 + 材料倒计时
    html += '<div>';
    html += dashCard('📞 待沟通家长', renderParents(stats.pendingParentsList), 'talk');
    html += '<div style="height:12px"></div>';
    html += dashCard('⭐ 重点学生提醒', renderKeyStudents(stats.keyStudentsList), 'special');
    html += '<div style="height:12px"></div>';
    html += dashCard('📤 材料上交倒计时', renderDeadlines(stats.deadlines), 'notice');
    html += '</div>';
    html += '</div>';

    return html;
  }

  function statCard(icon, label, value, hint, cls) {
    return '<div class="stat-card">' +
      '<div class="icon-box ' + cls + '">' + icon + '</div>' +
      '<div class="info"><div class="label">' + H(label) + '</div>' +
      '<div class="value">' + value + '</div>' +
      (hint ? '<div class="hint">' + H(hint) + '</div>' : '') +
      '</div></div>';
  }

  function dashCard(title, bodyHtml, tableId) {
    return '<div class="dash-card">' +
      '<h3>' + H(title) + '</h3>' +
      '<div class="dash-list">' + bodyHtml + '</div>' +
      '</div>';
  }

  function renderTodoList(items) {
    if (items.length === 0) return '<div class="empty">今日无待办</div>';
    return items.slice(0, 8).map(function (it) {
      var tag = it.priority === '高' ? 'danger' : (it.priority === '中' ? 'warn' : '');
      return '<div class="row">' +
        '<span class="tag ' + tag + '">' + (it.priority || '普通') + '</span>' +
        '<span class="text">' + H(it.title) + '</span>' +
        '<button class="btn btn-sm btn-ghost" data-act="done" data-id="' + it.__id + '">完成</button>' +
        '</div>';
    }).join('');
  }

  function renderParents(items) {
    if (items.length === 0) return '<div class="empty">暂无待沟通家长</div>';
    return items.slice(0, 6).map(function (p) {
      return '<div class="row">' +
        '<span class="tag">' + H(p.relation || '家长') + '</span>' +
        '<span class="text">' + H(p.name) + ' · ' + H(p.parentName || '') + '</span>' +
        '<a class="btn btn-sm btn-ghost" href="tel:' + H(p.phone) + '">拨打</a>' +
        '</div>';
    }).join('');
  }

  function renderKeyStudents(items) {
    if (items.length === 0) return '<div class="empty">暂无重点关注学生</div>';
    return items.slice(0, 6).map(function (s) {
      var cls = s.level === '重点' ? 'danger' : (s.level === '关注' ? 'warn' : '');
      return '<div class="row">' +
        '<span class="tag ' + cls + '">' + H(s.category || '特殊') + '</span>' +
        '<span class="text">' + H(s.name) + '</span>' +
        '<span class="time">' + H(s.lastUpdate || '') + '</span>' +
        '</div>';
    }).join('');
  }

  function renderWeeklyPlan(items) {
    var start = new Date();
    var day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    var end = new Date(start); end.setDate(end.getDate() + 6);
    var weekRange = fmt(start) + ' ~ ' + fmt(end);

    var inWeek = items.filter(function (p) {
      if (!p.startDate) return false;
      var d = new Date(p.startDate);
      return d >= start && d <= end;
    });
    if (inWeek.length === 0) return '<div class="empty">本周暂无计划（' + weekRange + '）</div>';
    return inWeek.map(function (p) {
      return '<div class="row">' +
        '<span class="tag">第' + H(p.week) + '</span>' +
        '<span class="text">' + H(p.focus || p.tasks || '—') + '</span>' +
        '</div>';
    }).join('');
  }

  function renderDeadlines(items) {
    if (items.length === 0) return '<div class="empty">暂无截止任务</div>';
    return items.slice(0, 6).map(function (n) {
      var days = daysUntil(n.deadline);
      var tagCls = days < 0 ? 'danger' : (days <= 3 ? 'warn' : '');
      var label = days < 0 ? '已过期' : (days === 0 ? '今日' : days + '天后');
      return '<div class="row">' +
        '<span class="tag ' + tagCls + '">' + label + '</span>' +
        '<span class="text">' + H(n.title) + '</span>' +
        '</div>';
    }).join('');
  }

  function fmt(d) { return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  function daysUntil(dateStr) {
    if (!dateStr) return 9999;
    var t = new Date(); t.setHours(0,0,0,0);
    var d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.round((d - t) / 86400000);
  }

  function computeDashboardStats() {
    var state = WB.state;
    var tables = state.tables || {};
    // 班级总人数：花名册
    var roster = tables.roster || [];
    var totalStudents = roster.length;

    // 今日待办
    var t = WB.today();
    var todoItems = (state.todo && state.todo.items) || [];
    var todoToday = todoItems.filter(function (i) {
      if (i.done) return false;
      return i.due === t || (!i.due && true);
    });
    var todoTodayList = todoItems.filter(function (i) { return !i.done && (i.due === t || !i.due); }).slice(0, 20);

    // 待沟通家长：谈话台账中"待跟进"的，或家长通讯录中未通话的
    var pendingParents = (tables.contacts || []).filter(function (c) {
      return c.phone; // 有电话都算可沟通
    });
    var pendingParentsList = pendingParents.slice(0, 20);

    // 重点学生
    var keyStudents = (tables.mental || []).filter(function (m) { return m.level === '重点' || m.level === '关注'; });
    var specialStudents = (tables.special || []);
    var keyStudentsList = keyStudents.concat(specialStudents).slice(0, 20);

    // 本周计划
    var weeklyPlans = tables.weeklyPlan || [];

    // 材料倒计时：班级通知的 deadline
    var deadlines = (tables.notice || []).filter(function (n) { return n.deadline; });

    return {
      totalStudents: totalStudents,
      todoToday: todoToday.length,
      todoTodayList: todoTodayList,
      pendingParents: pendingParents.length,
      pendingParentsList: pendingParentsList,
      keyStudents: keyStudentsList.length,
      keyStudentsList: keyStudentsList,
      weeklyPlans: weeklyPlans,
      deadlines: deadlines
    };
  }

  var DEFAULT_QUICK_WORDS = ['班级管理经验', '教学设计', '班主任工作总结'];

  // 百度搜索：通栏搜索框 + 可自定义的快捷搜索词（新增/删除均持久化）
  function renderBaiduSearch() {
    var qw = (WB.state.quickWords && WB.state.quickWords.length) ? WB.state.quickWords : DEFAULT_QUICK_WORDS;
    var h = '<div style="display:flex;gap:8px;align-items:center">' +
      '<input id="bd-search" placeholder="输入关键词，回车或点击搜索" style="flex:1;padding:8px 12px;border:1px solid var(--c-border);border-radius:6px;font-size:13px">' +
      '<button class="btn btn-primary" id="bd-btn">🔍 百度搜索</button>' +
      '</div>';
    h += '<div class="qw-list">';
    qw.forEach(function (w, i) {
      h += '<span class="qw-item" data-qw="' + H(w) + '" title="点击搜索：' + H(w) + '">' + H(w) +
        '<span class="qw-x" data-qw-del="' + i + '" title="删除该快捷词">✕</span></span>';
    });
    h += '<span class="qw-add" id="qw-add" title="添加自定义快捷词">＋ 添加</span>';
    h += '</div>';
    return h;
  }

  function bindDashboard() {
    // 今日待办完成（content 级委托，rebindRoot 防止重复绑定）
    var root = rebindRoot();
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="done"]');
      if (!btn) return;
      var id = btn.dataset.id;
      var items = WB.state.todo.items || [];
      var item = items.find(function (i) { return i.__id === id; });
      if (item) {
        item.done = true;
        item.doneAt = new Date().toISOString();
        WB.saveState();
        renderDashboardRefresh();
      }
    });
    // 百度搜索
    var bdBtn = el('bd-btn');
    var bdInput = el('bd-search');
    function baiduGo(q) {
      if (q) window.open('https://www.baidu.com/s?wd=' + encodeURIComponent(q), '_blank');
    }
    if (bdBtn && bdInput) {
      bdBtn.addEventListener('click', function () { baiduGo(bdInput.value.trim()); });
      bdInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') baiduGo(bdInput.value.trim());
      });
    }
    // 快捷搜索词：委托到 content 根节点（重绘后依然有效）
    root.addEventListener('click', function (e) {
      var del = e.target.closest('[data-qw-del]');
      if (del) {
        var i = parseInt(del.dataset.qwDel, 10);
        WB.state.quickWords = WB.state.quickWords || DEFAULT_QUICK_WORDS.slice();
        WB.state.quickWords.splice(i, 1);
        WB.saveState();
        renderDashboardRefresh();
        return;
      }
      if (e.target.closest('#qw-add')) {
        var w = prompt('输入新的快捷搜索词：');
        if (w && w.trim()) {
          WB.state.quickWords = WB.state.quickWords || DEFAULT_QUICK_WORDS.slice();
          WB.state.quickWords.push(w.trim());
          WB.saveState();
          renderDashboardRefresh();
        }
        return;
      }
      var item = e.target.closest('[data-qw]');
      if (item) baiduGo(item.dataset.qw);
    });
  }

  function renderDashboardRefresh() {
    var content = document.getElementById('content');
    content.innerHTML = renderDashboard();
  }

  // ============ 待办备忘录 ============
  function renderTodo() {
    var items = WB.state.todo.items || [];
    var html = '<div class="card">';
    html += '<div class="card-title">✅ 待办备忘录<span class="extra">共 ' + items.length + ' 条</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="todo-new">＋ 新增待办</button>';
    html += '<select class="filter" id="todo-filter">';
    html += '<option value="">全部状态</option>';
    html += '<option value="pending">未完成</option>';
    html += '<option value="done">已完成</option>';
    html += '</select>';
    html += '<div class="search"><input id="todo-search" placeholder="搜索待办内容"></div>';
    html += '</div>';
    html += '<div id="todo-list">';
    html += renderTodoItems(items, '', 'all');
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderTodoItems(items, search, filter) {
    var kw = search ? search.toLowerCase() : '';
    var filtered = items.filter(function (i) {
      var isDone = !!i.done;
      if (filter === 'pending' && isDone) return false;
      if (filter === 'done' && !isDone) return false;
      if (kw && !String(i.title || '').toLowerCase().indexOf(kw) >= 0 &&
                  !String(i.note || '').toLowerCase().indexOf(kw) >= 0) {
        return false;
      }
      return true;
    });
    if (filtered.length === 0) return '<div class="empty">暂无待办</div>';
    return '<table class="data"><thead><tr>' +
      '<th>完成</th><th>标题</th><th>优先级</th><th>截止日期</th><th>备注</th><th>操作</th>' +
      '</tr></thead><tbody>' +
      filtered.map(function (i) {
        var overdue = i.due && !i.done && daysUntil(i.due) < 0;
        var prCls = i.priority === '高' ? 'danger' : (i.priority === '中' ? 'warn' : '');
        return '<tr>' +
          '<td><input type="checkbox" data-todo-check="' + i.__id + '"' + (i.done ? ' checked' : '') + '></td>' +
          '<td>' + (i.done ? '<span style="text-decoration:line-through;color:var(--c-text-3)">' : '') +
            H(i.title) + (i.done ? '</span>' : '') + '</td>' +
          '<td><span class="tag ' + prCls + '" style="padding:2px 8px;border-radius:4px;font-size:11px;background:' +
            (i.priority === '高' ? '#fef2f2;color:#ef4444' :
              i.priority === '中' ? '#fffbeb;color:#f59e0b' :
                'var(--c-primary-bg);color:var(--c-primary)') + '">' +
            (i.priority || '普通') + '</span></td>' +
          '<td style="' + (overdue ? 'color:var(--c-danger);font-weight:600' : '') + '">' +
            (i.due || '—') + (overdue ? ' (已过期)' : '') + '</td>' +
          '<td>' + H(i.note || '') + '</td>' +
          '<td class="op">' +
            '<button class="btn btn-sm" data-todo-edit="' + i.__id + '">编辑</button>' +
            '<button class="btn btn-sm btn-danger" data-todo-del="' + i.__id + '">删除</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function bindTodo() {
    el('todo-new').addEventListener('click', function () { openTodoForm(null); });
    el('todo-search').addEventListener('input', function () {
      el('todo-list').innerHTML = renderTodoItems(
        WB.state.todo.items || [], el('todo-search').value, el('todo-filter').value);
    });
    el('todo-filter').addEventListener('change', function () {
      el('todo-list').innerHTML = renderTodoItems(
        WB.state.todo.items || [], el('todo-search').value, el('todo-filter').value);
    });
    el('todo-list').addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-todo-edit]');
      var delBtn = e.target.closest('[data-todo-del]');
      if (editBtn) openTodoForm(editBtn.dataset.todoEdit);
      if (delBtn) {
        var id = delBtn.dataset.todoDel;
        if (confirm('确认删除？')) {
          WB.state.todo.items = WB.state.todo.items.filter(function (i) { return i.__id !== id; });
          WB.saveState();
          el('todo-list').innerHTML = renderTodoItems(WB.state.todo.items, '', 'all');
          WB.showToast('已删除');
        }
      }
    });
    el('todo-list').addEventListener('change', function (e) {
      var cb = e.target.closest('[data-todo-check]');
      if (cb) {
        var id = cb.dataset.todoCheck;
        var item = (WB.state.todo.items || []).find(function (i) { return i.__id === id; });
        if (item) {
          item.done = cb.checked;
          item.doneAt = cb.checked ? new Date().toISOString() : null;
          WB.saveState();
          el('todo-list').innerHTML = renderTodoItems(WB.state.todo.items, el('todo-search').value, el('todo-filter').value);
        }
      }
    });
  }

  function openTodoForm(id) {
    var item = null;
    if (id) {
      item = (WB.state.todo.items || []).find(function (i) { return i.__id === id; });
    }
    var body = '<div class="form-grid">' +
      '<label class="full"><span class="lbl required">标题</span>' +
        '<input id="t-title" value="' + H(item ? item.title : '') + '" placeholder="待办事项"></label>' +
      '<label><span class="lbl">优先级</span>' +
        '<select id="t-priority">' + ['普通', '中', '高'].map(function (o) {
          return '<option value="' + o + '"' + ((item && item.priority) === o ? ' selected' : '') + '>' + o + '</option>';
        }).join('') + '</select></label>' +
      '<label><span class="lbl">截止日期</span>' +
        '<input type="date" id="t-due" value="' + H(item ? item.due : '') + '"></label>' +
      '<label class="full"><span class="lbl">备注</span>' +
        '<textarea id="t-note">' + H(item ? item.note : '') + '</textarea></label>' +
      '</div>';
    WB.openModal(item ? '编辑待办' : '新增待办', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act, form) {
      if (act !== 'save') return;
      var title = el('t-title').value.trim();
      if (!title) { WB.showToast('请填写标题'); return false; }
      var data = {
        title: title,
        priority: el('t-priority').value,
        due: el('t-due').value,
        note: el('t-note').value.trim(),
        done: item ? !!item.done : false
      };
      if (item) {
        Object.assign(item, data);
      } else {
        data.__id = WB.uid();
        data.createdAt = new Date().toISOString();
        WB.state.todo.items.unshift(data);
      }
      WB.saveState();
      renderTodoRefresh();
      WB.showToast('已保存');
    });
  }

  function renderTodoRefresh() {
    var content = document.getElementById('content');
    content.innerHTML = renderTodo();
    bindTodo();
  }

  // ============ 课程表（图形化周课表） ============
  var DEFAULT_PERIODS = [
    { name: '早读', time: '7:40-8:00' },
    { name: '第1节', time: '8:00-8:45' },
    { name: '第2节', time: '8:55-9:40' },
    { name: '课间操', time: '9:40-10:00' },
    { name: '第3节', time: '10:00-10:45' },
    { name: '第4节', time: '10:55-11:40' },
    { name: '午休', time: '12:00-13:50' },
    { name: '第5节', time: '14:00-14:45' },
    { name: '第6节', time: '14:55-15:40' },
    { name: '第7节', time: '15:50-16:35' },
    { name: '第8节', time: '16:45-17:30' },
    { name: '晚自习①', time: '19:00-19:50' },
    { name: '晚自习②', time: '20:00-20:50' }
  ];
  var DEFAULT_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var SUBJ_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#65a30d', '#0f766e', '#b45309', '#1d4ed8', '#9333ea', '#475569', '#64748b'];
  var SUBJ_INIT = { '语文': '#4f46e5', '数学': '#0891b2', '英语': '#059669', '道法': '#d97706', '历史': '#dc2626', '地理': '#7c3aed', '生物': '#db2777', '物理': '#65a30d', '化学': '#0f766e', '体育': '#b45309', '音乐': '#1d4ed8', '美术': '#9333ea', '班会': '#475569', '自习': '#64748b' };

  function getSchedule() {
    if (!WB.state.schedule) WB.state.schedule = { days: null, periods: null, grid: {}, subjects: null };
    var sc = WB.state.schedule;
    if (!sc.days) sc.days = DEFAULT_DAYS.slice();
    if (!sc.periods || !sc.periods.length) sc.periods = DEFAULT_PERIODS.map(function (p) { return { name: p.name, time: p.time }; });
    if (!sc.subjects) sc.subjects = Object.assign({}, SUBJ_INIT);
    if (!sc.grid) sc.grid = {};
    return sc;
  }

  function hexToRgba(hex, a) {
    var c = String(hex).replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function darkenHex(hex) {
    var c = String(hex).replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return 'rgb(' + Math.round(r * 0.72) + ',' + Math.round(g * 0.72) + ',' + Math.round(b * 0.72) + ')';
  }

  function renderSchedule() {
    var sc = getSchedule();
    var days = sc.days, periods = sc.periods;
    var todayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var today = todayMap[new Date().getDay()];

    var html = '<div class="card">';
    html += '<div class="card-title">📅 课程表 <span class="extra">图形化周课表 · 点击格子录入科目</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="sched-add-sub">＋ 添加科目</button>';
    html += '<button class="btn" id="sched-edit-periods">🕐 编辑时段</button>';
    html += '<button class="btn" id="sched-stats">📊 课时统计</button>';
    html += '<button class="btn" id="sched-clear">🧹 清空课表</button>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn" id="sched-export">⬇ 导出课表</button>';
    html += '</div>';

    // 科目图例
    var subjKeys = Object.keys(sc.subjects);
    if (subjKeys.length > 0) {
      html += '<div class="schedule-legend">';
      html += '<span class="lg-t">科目：</span>';
      subjKeys.forEach(function (k) {
        var c = sc.subjects[k];
        html += '<span class="legend-item" style="background:' + hexToRgba(c, 0.14) + ';color:' + darkenHex(c) + ';border:1px solid ' + c + '">' + H(k) + '</span>';
      });
      html += '</div>';
    }

    // 课表网格
    html += '<div class="sched-scroll"><table class="sched">';
    html += '<thead><tr><th class="sched-time">节次 / 时间</th>';
    days.forEach(function (d) {
      html += '<th class="' + (d === today ? 'today' : '') + '">' + H(d) + '</th>';
    });
    html += '</tr></thead><tbody>';
    periods.forEach(function (p) {
      html += '<tr>';
      html += '<td class="sched-time"><div class="t-name">' + H(p.name) + '</div><div class="t-time">' + H(p.time || '') + '</div></td>';
      days.forEach(function (d) {
        var key = d + '-' + p.name;
        var cell = sc.grid[key];
        var subj = cell && cell.subject ? cell.subject : '';
        if (subj) {
          var c = sc.subjects[subj] || '#64748b';
          html += '<td class="sched-cell has" data-key="' + H(key) + '" style="background:' + hexToRgba(c, 0.14) + ';border-left:4px solid ' + c + '">';
          html += '<div class="s-subj" style="color:' + darkenHex(c) + '">' + H(subj) + '</div>';
          if (cell.note) html += '<div class="s-note">' + H(cell.note) + '</div>';
          html += '</td>';
        } else {
          html += '<td class="sched-cell" data-key="' + H(key) + '"><div class="s-empty">＋</div></td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="sched-hint">💡 点击任意格子录入科目；再次点击可修改备注或清除。</div>';
    html += '</div>';
    return html;
  }

  function bindSchedule() {
    var root = rebindRoot();
    root.addEventListener('click', function (e) {
      var cell = e.target.closest('.sched-cell');
      if (cell) { openSchedCell(cell.dataset.key); return; }
      var btn = e.target.closest('button');
      if (!btn) return;
      var id = btn.id;
      if (id === 'sched-add-sub') addScheduleSubject();
      else if (id === 'sched-edit-periods') editSchedulePeriods();
      else if (id === 'sched-stats') showScheduleStats();
      else if (id === 'sched-clear') clearSchedule();
      else if (id === 'sched-export') exportSchedule();
    });
  }

  function openSchedCell(key) {
    var sc = getSchedule();
    var cur = sc.grid[key] || {};
    var subjects = Object.keys(sc.subjects);
    var html = '<div style="font-size:13px;margin-bottom:10px;color:var(--c-text-2)">' + H(key) + '</div>';
    html += '<label><span class="lbl">科目</span><select id="sc-subj">';
    html += '<option value="">— 清除本格 —</option>';
    subjects.forEach(function (s) {
      html += '<option value="' + H(s) + '"' + (cur.subject === s ? ' selected' : '') + '>' + H(s) + '</option>';
    });
    html += '</select></label>';
    html += '<label class="full"><span class="lbl">备注（如 双周 / 单周 / 实验课）</span>';
    html += '<input id="sc-note" value="' + H(cur.note || '') + '" placeholder="如 双周、单周、实验课、自习"></label>';
    WB.openModal('编辑课程 · ' + key, html, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var subj = el('sc-subj').value;
      var note = el('sc-note').value.trim();
      if (subj) sc.grid[key] = { subject: subj, note: note };
      else delete sc.grid[key];
      WB.saveState();
      renderScheduleRefresh();
    });
  }

  function addScheduleSubject() {
    var sc = getSchedule();
    var name = prompt('请输入科目名称：');
    if (!name) return;
    name = name.trim();
    if (!name) return;
    if (sc.subjects[name]) { WB.showToast('科目已存在：' + name); return; }
    sc.subjects[name] = SUBJ_COLORS[Object.keys(sc.subjects).length % SUBJ_COLORS.length];
    WB.saveState();
    renderScheduleRefresh();
    WB.showToast('已添加科目：' + name);
  }

  function editSchedulePeriods() {
    var sc = getSchedule();
    var html = '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:8px;line-height:1.7">每行一个时段，格式：<b>名称 时间</b>（时间可省略）。<br>例：早读 7:40-8:00</div>';
    html += '<textarea id="sc-periods" rows="12" style="width:100%;padding:10px;border:1px solid var(--c-border);border-radius:6px;font-size:12px">' +
      sc.periods.map(function (p) { return (p.name || '') + ' ' + (p.time || ''); }).join('\n') + '</textarea>';
    WB.openModal('编辑时段', html, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var lines = el('sc-periods').value.split('\n');
      var periods = [];
      var oldGrid = sc.grid;
      var newGrid = {};
      lines.forEach(function (line) {
        line = line.trim();
        if (!line) return;
        var m = line.match(/^(\S+)(?:\s+(.*))?$/);
        var name = m ? m[1] : line;
        var time = m && m[2] ? m[2] : '';
        sc.days.forEach(function (d) {
          if (oldGrid[d + '-' + name]) newGrid[d + '-' + name] = oldGrid[d + '-' + name];
        });
        periods.push({ name: name, time: time });
      });
      if (periods.length === 0) { WB.showToast('请至少保留一个时段'); return false; }
      sc.periods = periods;
      sc.grid = newGrid;
      WB.saveState();
      renderScheduleRefresh();
      WB.showToast('时段已更新');
    });
  }

  function showScheduleStats() {
    var sc = getSchedule();
    var cnt = {};
    Object.keys(sc.grid).forEach(function (k) {
      var subj = sc.grid[k].subject;
      if (subj) cnt[subj] = (cnt[subj] || 0) + 1;
    });
    var keys = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    var html = '';
    if (keys.length === 0) {
      html = '<div class="empty">课表为空，暂无统计</div>';
    } else {
      var total = keys.reduce(function (a, k) { return a + cnt[k]; }, 0);
      html = '<div style="font-size:13px;line-height:2">';
      keys.forEach(function (k) {
        var c = sc.subjects[k] || '#64748b';
        var pct = Math.round(cnt[k] / total * 100);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0">' +
          '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:' + c + ';flex-shrink:0"></span>' +
          '<span style="width:70px;flex-shrink:0">' + H(k) + '</span>' +
          '<span style="flex:1;background:var(--c-border);border-radius:4px;height:14px;overflow:hidden">' +
          '<span style="display:block;height:100%;width:' + pct + '%;background:' + c + '"></span></span>' +
          '<span style="font-weight:600;width:36px;text-align:right;flex-shrink:0">' + cnt[k] + '节</span>' +
          '</div>';
      });
      html += '<div style="margin-top:8px;color:var(--c-text-2)">合计 ' + total + ' 节（含自习/班会）</div></div>';
    }
    WB.openModal('📊 课时统计', html, [{ text: '关闭', cls: 'btn btn-primary', act: 'close' }]);
  }

  function clearSchedule() {
    if (!confirm('确认清空整个课表？')) return;
    var sc = getSchedule();
    sc.grid = {};
    WB.saveState();
    renderScheduleRefresh();
    WB.showToast('课表已清空');
  }

  function exportSchedule() {
    var sc = getSchedule();
    var header = ['节次/时间'].concat(sc.days);
    var lines = sc.periods.map(function (p) {
      return [p.name + ' ' + (p.time || '')].concat(sc.days.map(function (d) {
        var cell = sc.grid[d + '-' + p.name];
        return cell ? (cell.subject + (cell.note ? '(' + cell.note + ')' : '')) : '';
      }));
    });
    var csv = '\uFEFF' + [header.map(WB.csvEscape).join(',')].concat(
      lines.map(function (r) { return r.map(WB.csvEscape).join(','); })
    ).join('\r\n');
    WB.downloadBlob(csv, '课程表_' + WB.today() + '.csv', 'text/csv;charset=utf-8');
    WB.showToast('课表已导出（CSV，Excel 可直接打开）');
  }

  function renderScheduleRefresh() {
    el('content').innerHTML = renderSchedule();
    bindSchedule();
  }

  // ============ 成绩分析 ============
  function renderGrades() {
    var state = WB.state.grades;
    var exams = state.exams || [];
    var html = '<div class="card">';
    html += '<div class="card-title">📈 智能成绩分析 <span class="extra">支持多批次对比 · 自动统计 · 学情分析</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="g-new-exam">＋ 新建考试批次</button>';
    html += '<button class="btn" id="g-import-roster">从花名册同步学生</button>';
    html += '</div>';

    if (exams.length === 0) {
      html += '<div class="empty">尚未创建任何考试批次。<br>建议：先点「＋ 新建考试批次」录入周测/月考/期末，再录入各批次的分数。</div>';
      html += '</div>';
      return html;
    }

    html += '<div class="score-tabs" id="g-tabs">';
    exams.forEach(function (ex) {
      // 用 dataset 存储 exam id
      html += '<button class="score-tab ' + (state.currentExamId === ex.__id ? 'active' : '') + '" data-exam-id="' + ex.__id + '">' +
        (ex.icon || '📅') + ' ' + H(ex.name) + '</button>';
    });
    html += '</div>';

    var current = state.exams.find(function (e) { return e.__id === state.currentExamId; });
    if (!current) {
      state.currentExamId = exams[0].__id;
      current = exams[0];
    }
    html += renderExamDetail(current);
    html += '</div>';
    return html;
  }

  function renderExamDetail(exam) {
    var html = '';

    // 顶部：基本信息 + 编辑
    html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">';
    html += '<div style="font-weight:600;font-size:15px">' + (exam.icon || '📅') + ' ' + H(exam.name) + '</div>';
    if (exam.subjects) html += '<div style="color:var(--c-text-2);font-size:12px">' + H(exam.subjects.join(' / ')) + '</div>';
    html += '<div style="margin-left:auto">';
    html += '<button class="btn btn-sm" data-act="edit-exam" data-id="' + exam.__id + '">编辑批次</button>';
    html += '<button class="btn btn-sm btn-danger" data-act="del-exam" data-id="' + exam.__id + '">删除批次</button>';
    html += '</div></div>';

    // 工具栏
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" data-act="add-score">＋ 录入学生成绩</button>';
    html += '<button class="btn" data-act="export-scores">⬇ 导出成绩</button>';
    html += '<button class="btn" data-act="analysis-summary">📝 生成学情小结</button>';
    html += '</div>';

    // 统计摘要
    html += renderScoreSummary();

    // 表格
    var scores = WB.state.grades.scores[exam.__id] || [];
    var subjects = (exam.subjects && exam.subjects.length) ? exam.subjects
      : getSubjectsFromScores(scores);
    var withRank = scores.length > 0 ? computeWithRank(scores, subjects) : [];
    html += '<div class="table-wrap"><div class="table-scroll"><table class="data"><thead><tr>';
    html += '<th>学号</th><th>姓名</th>';
    subjects.forEach(function (s) { html += '<th>' + H(s) + '</th>'; });
    html += '<th>总分</th><th>班级排名</th><th>等级</th><th>操作</th></tr></thead><tbody id="score-tbody">';

    if (scores.length === 0) {
      html += '<tr><td colspan="' + (subjects.length + 7) + '" class="empty">尚未录入成绩</td></tr>';
    } else {
      withRank.forEach(function (row, idx) {
        html += '<tr>';
        html += '<td>' + H(row.studentNo || '') + '</td>';
        html += '<td>' + H(row.name) + '</td>';
        subjects.forEach(function (s) {
          html += '<td>' + (row[s] != null ? row[s] : '—') + '</td>';
        });
        html += '<td style="font-weight:600;color:var(--c-primary)">' + row.__total.toFixed(1) + '</td>';
        html += '<td style="font-weight:600">' + row.__rank + '</td>';
        html += '<td><span class="tag ' + levelTag(row.__level) + '" style="padding:2px 8px;border-radius:4px;font-size:11px">' + row.__level + '</span></td>';
        html += '<td class="op">' +
          '<button class="btn btn-sm" data-act="edit-score" data-idx="' + idx + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del-score" data-idx="' + idx + '">删除</button>' +
          '</td></tr>';
      });
    }
    html += '</tbody></table></div></div>';

    // 学情分析卡
    html += renderAnalysisPanel(subjects, withRank);

    return html;
  }

  function levelTag(level) {
    if (level === '尖子生') return 'success';
    if (level === '临界生') return 'warn';
    if (level === '学困生') return 'danger';
    return '';
  }

  function getSubjectsFromScores(scores) {
    var subs = {};
    scores.forEach(function (r) {
      Object.keys(r).forEach(function (k) {
        if (['name', 'studentNo', 'remark'].indexOf(k) === -1) {
          subs[k] = 1;
        }
      });
    });
    return Object.keys(subs);
  }

  function computeWithRank(scores, subjects) {
    var arr = scores.map(function (r) {
      var total = 0, count = 0;
      subjects.forEach(function (s) {
        var v = parseFloat(r[s]);
        if (!isNaN(v)) { total += v; count++; }
      });
      return Object.assign({}, r, { __total: total, __count: count });
    });
    arr.sort(function (a, b) { return b.__total - a.__total; });
    arr.forEach(function (r, i) { r.__rank = i + 1; });
    // 划分等级：前 20% 尖子生，后 20% 学困生，中间 20% 临界生
    var n = arr.length;
    var topN = Math.max(1, Math.ceil(n * 0.2));
    var botN = Math.max(1, Math.floor(n * 0.2));
    arr.forEach(function (r, i) {
      if (i < topN) r.__level = '尖子生';
      else if (i >= n - botN) r.__level = '学困生';
      else if (i >= topN && i < topN + Math.max(1, Math.floor(n * 0.2))) r.__level = '临界生';
      else r.__level = '普通';
    });
    return arr;
  }

  function renderScoreSummary() {
    var currentExamId = WB.state.grades.currentExamId;
    var exam = (WB.state.grades.exams || []).find(function (e) { return e.__id === currentExamId; });
    var scores = WB.state.grades.scores[currentExamId] || [];
    var subjects = (exam && exam.subjects && exam.subjects.length) ? exam.subjects : getSubjectsFromScores(scores);
    if (scores.length === 0 || subjects.length === 0) {
      return '<div class="score-summary"><div class="cell"><div class="k">数据不足</div><div class="v small">需至少 1 名学生的成绩</div></div></div>';
    }
    var html = '<div class="score-summary">';
    var withRank = computeWithRank(scores, subjects);
    // 总分统计
    var totals = withRank.map(function (r) { return r.__total; });
    var avg = totals.reduce(function (a, b) { return a + b; }, 0) / totals.length;
    html += summaryCell('参考人数', scores.length);
    html += summaryCell('总分均分', avg.toFixed(1));
    html += summaryCell('最高分', Math.max.apply(null, totals).toFixed(1));
    html += summaryCell('最低分', Math.min.apply(null, totals).toFixed(1));

    // 每科
    subjects.forEach(function (s) {
      var vals = scores.map(function (r) { return parseFloat(r[s]); }).filter(function (v) { return !isNaN(v); });
      if (vals.length === 0) return;
      var sAvg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var sMax = Math.max.apply(null, vals);
      var sMin = Math.min.apply(null, vals);
      var failN = vals.filter(function (v) { return v < 60; }).length;
      html += '<div class="cell"><div class="k">' + H(s) + '</div>' +
        '<div class="v small">' + sAvg.toFixed(1) + '</div>' +
        '<div class="k" style="margin-top:2px">最高 ' + sMax + ' / 最低 ' + sMin +
        (failN > 0 ? ' / <span style="color:var(--c-danger)">不及格 ' + failN + ' 人</span>' : '') +
        '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function summaryCell(k, v) {
    return '<div class="cell"><div class="k">' + H(k) + '</div><div class="v">' + v + '</div></div>';
  }

  function renderAnalysisPanel(subjects, withRank) {
    if (withRank.length === 0) return '';
    var top = withRank.filter(function (r) { return r.__level === '尖子生'; });
    var critical = withRank.filter(function (r) { return r.__level === '临界生'; });
    var weak = withRank.filter(function (r) { return r.__level === '学困生'; });

    // 偏科筛查：总分排名 30%-70% 之间，但某科排名相差 > 20 位次
    var imbalanced = withRank.filter(function (r, i) {
      return i >= Math.floor(withRank.length * 0.3) && i < Math.floor(withRank.length * 0.7);
    }).filter(function (r) {
      var rankInClass = r.__rank;
      return subjects.some(function (s) {
        var v = parseFloat(r[s]);
        if (isNaN(v)) return false;
        // 按该科目排序
        var sorted = withRank.map(function (x) { return parseFloat(x[s]); }).sort(function (a, b) { return b - a; });
        var sRank = sorted.indexOf(v) + 1;
        return Math.abs(sRank - rankInClass) > 20;
      });
    });

    var html = '<div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">';
    html += '<div class="card" style="border-color:#a7f3d0;background:#f0fdf4">' +
      '<div class="card-title" style="color:var(--c-success);margin-bottom:6px">🏆 尖子生 (' + top.length + ')</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (top.map(function (r) { return H(r.name) + ' (' + r.__total.toFixed(1) + ')'; }).join('、') || '<span class="empty">—</span>') +
      '</div></div>';

    html += '<div class="card" style="border-color:#fde68a;background:#fffbeb">' +
      '<div class="card-title" style="color:var(--c-warn);margin-bottom:6px">🎯 临界生 (' + critical.length + ')</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (critical.map(function (r) { return H(r.name) + ' (' + r.__total.toFixed(1) + ')'; }).join('、') || '<span class="empty">—</span>') +
      '</div></div>';

    html += '<div class="card" style="border-color:#fecaca;background:#fef2f2">' +
      '<div class="card-title" style="color:var(--c-danger);margin-bottom:6px">📉 学困生 (' + weak.length + ')</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (weak.map(function (r) { return H(r.name) + ' (' + r.__total.toFixed(1) + ')'; }).join('、') || '<span class="empty">—</span>') +
      '</div></div>';

    html += '<div class="card">' +
      '<div class="card-title" style="margin-bottom:6px">⚠️ 偏科筛查 (' + imbalanced.length + ')</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (imbalanced.map(function (r) { return H(r.name); }).join('、') || '<span class="empty">—</span>') +
      '</div></div>';

    html += '</div>';

    // 简易学情小结
    var不及格 = {};
    subjects.forEach(function (s) {
      var failN = scoresOfSubject(s).filter(function (v) { return v < 60; }).length;
      不及格[s] = failN;
    });
    var failTotal = Object.values(不及格).reduce(function (a, b) { return a + b; }, 0);
    var failStudents = scoresOfSubjectArr().filter(function (r) {
      return subjects.some(function (s) { var v = parseFloat(r[s]); return !isNaN(v) && v < 60; });
    }).map(function (r) { return r.name; });

    html += '<div class="card" style="margin-top:12px">' +
      '<div class="card-title">📝 班级学情小结（自动生成）</div>' +
      '<div style="font-size:13px;line-height:1.8;color:var(--c-text-2)">' +
      '<p>本次考试共有 <strong>' + withRank.length + '</strong> 人参考。总分均分 <strong style="color:var(--c-primary)">' +
      (withRank.reduce(function (a, b) { return a + b.__total; }, 0) / withRank.length).toFixed(1) + '</strong> 分，' +
      '最高 <strong>' + Math.max.apply(null, withRank.map(function (r) { return r.__total; })).toFixed(1) +
      '</strong> 分，最低 <strong>' + Math.min.apply(null, withRank.map(function (r) { return r.__total; })).toFixed(1) + '</strong> 分。</p>' +
      '<p>等级划分：尖子生 <strong style="color:var(--c-success)">' + top.length + '</strong> 人、临界生 <strong style="color:var(--c-warn)">' + critical.length + '</strong> 人、' +
      '学困生 <strong style="color:var(--c-danger)">' + weak.length + '</strong> 人；偏科现象 <strong>' + imbalanced.length + '</strong> 人。</p>' +
      '<p>不及格情况：共有 <strong>' + failStudents.length + '</strong> 名学生至少一科不及格，累计 <strong>' + failTotal + '</strong> 人次。<br>' +
      (failStudents.length > 0 ? '名单：' + failStudents.map(H).join('、') + '。' : '') + '</p>' +
      '</div>' +
      '<button class="btn btn-sm" style="margin-top:8px" data-act="copy-summary">📋 复制小结</button>' +
      '</div>';

    return html;

    function scoresOfSubject(s) {
      return (WB.state.grades.scores[WB.state.grades.currentExamId] || [])
        .map(function (r) { return parseFloat(r[s]); })
        .filter(function (v) { return !isNaN(v); });
    }
    function scoresOfSubjectArr() {
      return WB.state.grades.scores[WB.state.grades.currentExamId] || [];
    }
  }

  function bindGrades() {
    // 顶部：新建考试、同步花名册
    el('g-new-exam').addEventListener('click', openExamForm);
    el('g-import-roster').addEventListener('click', syncRosterToCurrent);

    // Tab 切换
    var tabs = el('g-tabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-exam-id]');
        if (!tab) return;
        WB.state.grades.currentExamId = tab.dataset.examId;
        WB.saveState();
        renderGradesRefresh();
      });
    }

    // 数据表格操作（content 级委托，rebindRoot 防止重复绑定）
    var root = rebindRoot();
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'edit-exam') openExamForm(btn.dataset.id);
      else if (act === 'del-exam') {
        if (confirm('确认删除该考试批次及其全部成绩？不可恢复。')) {
          delete WB.state.grades.scores[btn.dataset.id];
          WB.state.grades.exams = WB.state.grades.exams.filter(function (x) { return x.__id !== btn.dataset.id; });
          if (WB.state.grades.currentExamId === btn.dataset.id) {
            WB.state.grades.currentExamId = WB.state.grades.exams[0] ? WB.state.grades.exams[0].__id : null;
          }
          WB.saveState();
          renderGradesRefresh();
          WB.showToast('已删除');
        }
      } else if (act === 'add-score') {
        openScoreForm(null);
      } else if (act === 'edit-score') {
        openScoreForm(parseInt(btn.dataset.idx, 10));
      } else if (act === 'del-score') {
        if (confirm('确认删除该学生成绩？')) {
          var scores = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
          scores.splice(parseInt(btn.dataset.idx, 10), 1);
          WB.saveState();
          renderGradesRefresh();
          WB.showToast('已删除');
        }
      } else if (act === 'export-scores') {
        exportScores();
      } else if (act === 'analysis-summary') {
        copySummaryText();
      } else if (act === 'copy-summary') {
        copySummaryText();
      }
    });
  }

  function renderGradesRefresh() {
    el('content').innerHTML = renderGrades();
    bindGrades();
  }

  function openExamForm(id) {
    var exam = null;
    if (id) exam = WB.state.grades.exams.find(function (e) { return e.__id === id; });
    var body = '<div class="form-grid">' +
      '<label><span class="lbl required">考试名称</span>' +
        '<input id="e-name" value="' + H(exam ? exam.name : '') + '" placeholder="如 第3周周测 / 期中考试"></label>' +
      '<label><span class="lbl">图标</span>' +
        '<input id="e-icon" value="' + H(exam ? exam.icon || '📅' : '📅') + '" placeholder="📅"></label>' +
      '<label class="full"><span class="lbl required">考试科目（逗号分隔）</span>' +
        '<input id="e-subjects" value="' + H(exam ? (exam.subjects || []).join(', ') : '') + '" placeholder="如 语文,数学,英语,物理,化学,政治,历史,地理,生物"></label>' +
      '<label class="full"><span class="lbl">备注</span>' +
        '<textarea id="e-note">' + H(exam ? (exam.note || '') : '') + '</textarea></label>' +
      '</div>';
    WB.openModal(id ? '编辑考试批次' : '新建考试批次', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var name = el('e-name').value.trim();
      if (!name) { WB.showToast('请填写考试名称'); return false; }
      var subjects = el('e-subjects').value.split(/[,，、\s]+/).filter(Boolean);
      if (subjects.length === 0) { WB.showToast('请至少填写一个科目'); return false; }
      var data = {
        name: name,
        icon: el('e-icon').value.trim() || '📅',
        subjects: subjects,
        note: el('e-note').value.trim()
      };
      if (exam) {
        Object.assign(exam, data);
      } else {
        data.__id = WB.uid();
        data.createdAt = new Date().toISOString();
        WB.state.grades.exams.push(data);
        WB.state.grades.scores[data.__id] = WB.state.grades.scores[data.__id] || [];
        WB.state.grades.currentExamId = data.__id;
      }
      WB.saveState();
      renderGradesRefresh();
      WB.showToast('已保存');
    });
  }

  function syncRosterToCurrent() {
    var currentExamId = WB.state.grades.currentExamId;
    if (!currentExamId) { WB.showToast('请先创建考试批次'); return; }
    var roster = WB.getTable('roster');
    if (roster.length === 0) { WB.showToast('花名册为空，请先在「学生档案库」录入'); return; }
    var scores = WB.state.grades.scores[currentExamId] || [];
    var existingNames = new Set(scores.map(function (s) { return s.name; }));
    var added = 0;
    roster.forEach(function (r) {
      if (!existingNames.has(r.name)) {
        var obj = { studentNo: r.studentNo || '', name: r.name };
        scores.push(obj);
        added++;
      }
    });
    WB.state.grades.scores[currentExamId] = scores;
    WB.saveState();
    renderGradesRefresh();
    WB.showToast('已从花名册同步 ' + added + ' 名学生');
  }

  function openScoreForm(idx) {
    var currentExamId = WB.state.grades.currentExamId;
    var exam = WB.state.grades.exams.find(function (e) { return e.__id === currentExamId; });
    if (!exam) { WB.showToast('当前无考试批次'); return; }
    var scores = WB.state.grades.scores[currentExamId] || [];
    var row = idx != null ? scores[idx] : null;
    var rowRemark = row ? (row.remark || '') : '';
    var subjects = exam.subjects || [];

    var body = '<div class="form-grid">';
    body += '<label><span class="lbl">学号</span>' +
      '<input id="s-no" value="' + H(row ? row.studentNo : '') + '"></label>';
    body += '<label><span class="lbl required">姓名</span>' +
      '<input id="s-name" value="' + H(row ? row.name : '') + '" placeholder="请输入姓名"></label>';
    subjects.forEach(function (s) {
      body += '<label><span class="lbl">' + H(s) + '</span>' +
          '<input type="number" step="0.1" id="s-sub-' + H(s) + '" value="' +
          (row && row[s] != null ? row[s] : '') + '"></label>';
    });
    body += '<label class="full"><span class="lbl">备注</span>' +
          '<textarea id="s-remark">' + H(rowRemark) + '</textarea></label>';
    body += '</div>';

    WB.openModal('录入成绩 · ' + exam.name, body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var name = el('s-name').value.trim();
      if (!name) { WB.showToast('请填写姓名'); return false; }
      var data = {
        studentNo: el('s-no').value.trim(),
        name: name,
        remark: el('s-remark').value.trim()
      };
      subjects.forEach(function (s) {
        var v = el('s-sub-' + H(s)).value.trim();
        data[s] = v === '' ? null : parseFloat(v);
      });
      if (idx != null) scores[idx] = data;
      else scores.unshift(data);
      WB.state.grades.scores[currentExamId] = scores;
      WB.saveState();
      renderGradesRefresh();
      WB.showToast('已保存');
    });
  }

  function exportScores() {
    var currentExamId = WB.state.grades.currentExamId;
    var exam = WB.state.grades.exams.find(function (e) { return e.__id === currentExamId; });
    if (!exam) { WB.showToast('当前无考试批次'); return; }
    var scores = WB.state.grades.scores[currentExamId] || [];
    if (scores.length === 0) { WB.showToast('暂无成绩'); return; }
    var subjects = exam.subjects || [];
    var withRank = computeWithRank(scores, subjects);
    var header = ['学号', '姓名'].concat(subjects, ['总分', '班级排名', '等级']);
    var lines = [header.map(WB.csvEscape).join(',')];
    withRank.forEach(function (r) {
      var row = [r.studentNo || '', r.name].concat(subjects.map(function (s) { return r[s] == null ? '' : r[s]; }))
        .concat([r.__total.toFixed(1), r.__rank, r.__level]);
      lines.push(row.map(WB.csvEscape).join(','));
    });
    var csv = '\uFEFF' + lines.join('\r\n');
    WB.downloadBlob(csv, exam.name + '_成绩_' + WB.today() + '.csv', 'text/csv;charset=utf-8');
    WB.showToast('已导出成绩');
  }

  function copySummaryText() {
    var cards = document.querySelectorAll('.card');
    var card = null;
    for (var i = 0; i < cards.length; i++) {
      var title = cards[i].querySelector('.card-title');
      if (title && title.textContent.indexOf('学情小结') >= 0) { card = cards[i]; break; }
    }
    if (!card) { WB.showToast('未找到学情小结卡片'); return; }
    var t = card.innerText;
    navigator.clipboard && navigator.clipboard.writeText(t).then(function () {
      WB.showToast('已复制到剪贴板');
    }, function () {
      WB.showToast('复制失败');
    });
  }

  // ============ 积分管理 ============
  function renderPoints() {
    var records = WB.state.tables.point_records || [];
    var roster = WB.state.tables.roster || [];
    var names = roster.map(function (r) { return r.name; }).filter(Boolean);

    // 计算每人总分
    var scores = {};
    records.forEach(function (r) {
      var v = parseFloat(r.value);
      if (isNaN(v)) return;
      scores[r.name] = (scores[r.name] || 0) + v;
    });
    var ranking = Object.keys(scores).map(function (n) {
      return { name: n, total: scores[n] };
    }).sort(function (a, b) { return b.total - a.total; });

    var html = '<div class="card">';
    html += '<div class="card-title">🏆 积分管理 <span class="extra">积分榜 · 快速加减分</span></div>';

    // 快速加减分
    html += '<div class="table-toolbar" style="flex-wrap:wrap">';
    html += '<select id="pt-name" style="padding:6px 10px;border:1px solid var(--c-border);border-radius:6px;font-size:13px;min-width:120px">';
    html += '<option value="">选择学生</option>';
    names.forEach(function (n) { html += '<option value="' + H(n) + '">' + H(n) + '</option>'; });
    html += '</select>';
    html += '<input id="pt-value" type="text" placeholder="分值 如 +5 或 -3" style="padding:6px 10px;border:1px solid var(--c-border);border-radius:6px;font-size:13px;width:120px">';
    html += '<input id="pt-reason" type="text" placeholder="原因" style="padding:6px 10px;border:1px solid var(--c-border);border-radius:6px;font-size:13px;flex:1;min-width:140px">';
    html += '<button class="btn btn-primary" id="pt-add">➕ 记录积分</button>';
    html += '<button class="btn" onclick="WB.navigate(\'table\',{table:\'point_records\'})">📝 查看全部记录</button>';
    html += '<button class="btn" onclick="WB.navigate(\'table\',{table:\'point_rules\'})">📋 积分规则</button>';
    html += '</div>';

    // 积分榜
    if (ranking.length === 0) {
      html += '<div class="empty">暂无积分记录，请先在上方添加</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:10px">';
      ranking.forEach(function (s, idx) {
        var cls = idx < 3 ? 'tag-' + (idx === 0 ? 'danger' : idx === 1 ? 'warn' : 'custom') : '';
        var bg = idx === 0 ? '#fef2f2' : idx === 1 ? '#fffbeb' : idx === 2 ? '#f0fdf4' : 'var(--c-card)';
        var bd = idx === 0 ? '#fecaca' : idx === 1 ? '#fde68a' : idx === 2 ? '#a7f3d0' : 'var(--c-border)';
        html += '<div style="padding:10px 14px;border-radius:8px;background:' + bg + ';border:1px solid ' + bd + ';display:flex;align-items:center;gap:10px">';
        html += '<span style="font-size:18px;font-weight:700;color:var(--c-primary);width:28px;text-align:center">' + (idx + 1) + '</span>';
        html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">' + H(s.name) + '</div>';
        html += '<div style="font-size:12px;color:var(--c-text-2)">当前总分 <strong>' + s.total + '</strong></div></div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 最近记录
    var recent = records.slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    }).slice(0, 10);
    if (recent.length > 0) {
      html += '<div style="margin-top:14px"><div class="card-title" style="font-size:13px;margin-bottom:8px">📝 最近积分记录</div>';
      html += '<table class="data"><thead><tr><th>日期</th><th>学生</th><th>分值</th><th>原因</th><th>类型</th></tr></thead><tbody>';
      recent.forEach(function (r) {
        var v = parseFloat(r.value) || 0;
        var vCls = v > 0 ? 'color:var(--c-success)' : (v < 0 ? 'color:var(--c-danger)' : '');
        html += '<tr><td>' + H(r.date) + '</td><td>' + H(r.name) + '</td>';
        html += '<td style="' + vCls + ';font-weight:600">' + (v > 0 ? '+' : '') + v + '</td>';
        html += '<td>' + H(r.reason) + '</td><td>' + H(r.type || '—') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
    return html;
  }

  function bindPoints() {
    var root = rebindRoot();
    var btn = el('pt-add');
    if (btn) {
      btn.addEventListener('click', function () {
        var name = el('pt-name').value;
        var value = el('pt-value').value.trim();
        var reason = el('pt-reason').value.trim();
        if (!name) { WB.showToast('请选择学生'); return; }
        if (!value) { WB.showToast('请输入分值'); return; }
        if (isNaN(parseFloat(value))) { WB.showToast('分值需为数字'); return; }
        if (!reason) { WB.showToast('请输入原因'); return; }
        var records = WB.state.tables.point_records || [];
        records.unshift({
          __id: WB.uid(),
          date: WB.today(),
          name: name,
          value: value,
          reason: reason,
          type: '日常表现'
        });
        WB.state.tables.point_records = records;
        WB.saveState();
        renderPointsRefresh();
        WB.showToast('已记录 ' + name + ' ' + (parseFloat(value) > 0 ? '+' : '') + value + ' 分');
      });
    }
  }

  function renderPointsRefresh() {
    el('content').innerHTML = renderPoints();
    bindPoints();
  }

  // ============ 值日排班周视图（合并卫生评价+积分） ============
  var DUTY_AREAS = ['教室', '走廊', '卫生间', '室外'];
  var DUTY_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var RATING_MAP = { '优': 2, '良': 1, '中': 0, '差': -1 };
  var RATING_COLOR = { '优': '#16a34a', '良': '#2563eb', '中': '#ca8a04', '差': '#dc2626' };

  // 获取某周的起始日期（周一）
  function getWeekMonday(dateStr) {
    var d = dateStr ? new Date(dateStr) : new Date();
    var day = d.getDay(); // 0=Sun 1=Mon ... 6=Sat
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // 格式化日期为 YYYY-MM-DD
  function fmtDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function renderDutyWeekView() {
    var records = WB.state.tables.duty || [];
    var roster = WB.state.tables.roster || [];
    var now = new Date();
    var monday = getWeekMonday();
    var weekDates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday); d.setDate(monday.getDate() + i);
      weekDates.push(fmtDate(d));
    }

    // 构建查找表：{ "date-area" → record }
    var cellMap = {};
    records.forEach(function (r) {
      if (r.date && r.area) cellMap[r.date + '|' + r.area] = r;
    });

    // 统计每人本周值日次数
    var personCount = {};
    records.forEach(function (r) {
      if (!r.members) return;
      if (weekDates.indexOf(r.date) >= 0) {
        r.members.split(/[,，、\s]+/).forEach(function (n) {
          n = n.trim();
          if (n) personCount[n] = (personCount[n] || 0) + 1;
        });
      }
    });

    var html = '<div class="card">';
    html += '<div class="card-title">📅 值日排班 · 周视图 <span class="extra">可视化排班 + 卫生评价 + 积分</span></div>';

    // 周切换工具栏
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">';
    html += '<button class="btn btn-sm" id="dw-prev">◀ 上周</button>';
    html += '<strong id="dw-week-label" style="min-width:200px;text-align:center">' +
      fmtDate(monday) + ' ~ ' + fmtDate(weekDates[6]) + '</strong>';
    html += '<button class="btn btn-sm" id="dw-next">下周 ▶</button>';
    html += '<button class="btn btn-sm" id="dw-today">📍 本周</button>';
    html += '<div style="flex:1"></div>';
    html += '<button class="btn btn-sm" id="dw-copy">📋 复制上周</button>';
    html += '<button class="btn btn-sm btn-d" id="dw-clear">🗑 清空本周</button>';
    html += '</div>';

    // 周视图表格
    html += '<table class="data dw-table"><thead><tr>';
    html += '<th>区域</th>';
    weekDates.forEach(function (d, i) {
      var isToday = d === fmtDate(now);
      html += '<th class="' + (isToday ? 'dw-today' : '') + '">' + DUTY_DAYS[i] + '<br><small>' + d.slice(5) + '</small></th>';
    });
    html += '</tr></thead><tbody>';

    DUTY_AREAS.forEach(function (area) {
      html += '<tr><td class="dw-area">' + H(area) + '</td>';
      weekDates.forEach(function (d) {
        var key = d + '|' + area;
        var rec = cellMap[key];
        html += '<td class="dw-cell" data-key="' + key + '" data-date="' + d + '" data-area="' + area + '">';
        if (rec && rec.members) {
          // 成员标签
          var names = rec.members.split(/[,，、\s]+/).filter(Boolean);
          names.forEach(function (n) {
            html += '<span class="dw-member">' + H(n) + '</span>';
          });
          // 评价与积分
          if (rec.rating && rec.rating !== '—') {
            var rc = RATING_COLOR[rec.rating] || '#666';
            var pts = rec.points !== undefined ? rec.points : (RATING_MAP[rec.rating] || 0);
            html += '<div class="dw-rating" style="color:' + rc + '">' + H(rec.rating) +
              ' <small>(' + (pts > 0 ? '+' : '') + pts + ')</small></div>';
          }
        } else {
          html += '<span class="dw-empty">＋</span>';
        }
        html += '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    // 底部统计：每人本周值日次数
    var pcArr = Object.keys(personCount).map(function (n) { return { name: n, c: personCount[n] }; }).sort(function (a, b) { return b.c - a.c; });
    if (pcArr.length > 0) {
      html += '<div class="dw-stats"><strong>📊 本周值日统计：</strong>';
      pcArr.forEach(function (p) {
        html += '<span class="dw-stat-item">' + H(p.name) + ' ×' + p.c + '</span>';
      });
      html += '</div>';
    } else {
      html += '<div class="empty" style="margin-top:10px">本周暂无排班数据，点击单元格添加或使用「复制上周」</div>';
    }

    html += '</div>';
    return html;
  }

  function bindDutyWeekView() {
    var root = rebindRoot();

    // 单元格点击：弹出编辑/新增
    root.addEventListener('click', function (e) {
      var cell = e.target.closest('.dw-cell');
      if (!cell) return;
      var key = cell.dataset.key;
      var date = cell.dataset.date;
      var area = cell.dataset.area;
      openDutyCellEditor(date, area, function () { renderDutyRefresh(); });
    });

    // 周切换
    el('dw-prev') && el('dw-prev').addEventListener('click', function () {
      DW_WEEK_OFFSET--; renderDutyRefresh();
    });
    el('dw-next') && el('dw-next').addEventListener('click', function () {
      DW_WEEK_OFFSET++; renderDutyRefresh();
    });
    el('dw-today') && el('dw-today').addEventListener('click', function () {
      DW_WEEK_OFFSET = 0; renderDutyRefresh();
    });
    el('dw-copy') && el('dw-copy').addEventListener('click', copyLastWeek);
    el('dw-clear') && el('dw-clear').addEventListener('click', clearCurrentWeek);
  }

  // 当前查看的周偏移量（0=本周，-1=上周，1=下周）
  var DW_WEEK_OFFSET = 0;

  function getWeekDates(offset) {
    var base = offset === 0 ? new Date() : null;
    if (!base) {
      base = new Date();
      base.setDate(base.getDate() + offset * 7);
    }
    var monday = getWeekMonday(base);
    var arr = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday); d.setDate(monday.getDate() + i);
      arr.push(fmtDate(d));
    }
    return arr;
  }

  function renderDutyRefresh() {
    el('content').innerHTML = renderDutyWeekView();
    bindDutyWeekView();
  }

  // 单元格编辑弹窗
  function openDutyCellEditor(date, area, onSave) {
    var records = WB.state.tables.duty || [];
    var rec = null;
    records.forEach(function (r) { if (r.date === date && r.area === area) rec = r; });

    var body = '';
    body += '<div style="font-size:13px;margin-bottom:8px;color:var(--c-text-2)"><b>' + H(date) + '</b> · ' + H(area) + '</div>';

    // 学生选择
    var membersVal = rec ? (rec.members || '') : '';
    body += '<label><span class="lbl required">值日生</span>';
    body += '<div class="picker-wrap">';
    body += '<input type="text" class="picker-input" id="dc-members" value="' + H(membersVal) + '" readonly placeholder="点击选择学生">';
    body += '<button type="button" class="btn btn-sm" id="dc-pick-btn">👤 选择</button>';
    body += '</div></label>';

    // 评价
    var ratingVal = rec ? (rec.rating || '—') : '—';
    body += '<label><span class="lbl">卫生评价</span>';
    body += '<select id="dc-rating" style="width:100%;padding:8px;border:1px solid var(--c-border);border-radius:6px;font-size:13px">';
    ['—', '优', '良', '中', '差'].forEach(function (opt) {
      body += '<option value="' + opt + '"' + (opt === ratingVal ? ' selected' : '') + '>' + opt + '</option>';
    });
    body += '</select></label>';

    // 积分
    var ptsVal = rec ? (rec.points || '') : '';
    body += '<label><span class="lbl">积分</span>';
    body += '<input type="text" id="dc-points" value="' + H(String(ptsVal)) + '" placeholder="自动计算或手动输入">';
    body += '</label>';

    // 备注
    var remarkVal = rec ? (rec.remark || '') : '';
    body += '<label><span class="lbl">备注</span>';
    body += '<textarea id="dc-remark" rows="2" style="width:100%;padding:8px;border:1px solid var(--c-border);border-radius:6px;font-size:13px;resize:vertical">' + H(remarkVal) + '</textarea>';
    body += '</label>';

    WB.openModal('编辑值日 · ' + H(date) + ' ' + H(area), body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' },
      { text: rec ? '删除' : '', cls: 'btn btn-d', act: 'delete' }
    ], function (act, formHtml) {
      if (act === 'delete') {
        if (!confirm('确定删除该条记录？')) return false;
        WB.state.tables.duty = records.filter(function (r) { return !(r.date === date && r.area === area); });
        WB.saveState();
        if (onSave) onSave();
        return true;
      }
      if (act !== 'save') return true;
      var members = formHtml.querySelector('#dc-members').value.trim();
      var rating = formHtml.querySelector('#dc-rating').value;
      var points = formHtml.querySelector('#dc-points').value.trim();
      var remark = formHtml.querySelector('#dc-remark').value.trim();
      if (!members) { WB.showToast('请选择值日生'); return false; }

      // 自动积分
      if (!points && rating !== '—') points = String(RATING_MAP[rating] || 0);

      if (rec) {
        rec.members = members; rec.rating = rating; rec.points = points; rec.remark = remark;
      } else {
        records.push({ __id: WB.uid(), date: date, area: area, members: members, rating: rating, points: points, remark: remark });
      }
      WB.state.tables.duty = records;
      WB.saveState();
      if (onSave) onSave();
      return true;
    }, function (formHtml) {
      // 绑定学生选择器
      formHtml.querySelector('#dc-pick-btn').addEventListener('click', function () {
        WB.openStudentPicker(function (stu) {
          formHtml.querySelector('#dc-members').value = stu.name || '';
        }, { title: '选择值日生（可多次选择不同学生）' });
      });
      // 评价变化时自动填积分
      formHtml.querySelector('#dc-rating').addEventListener('change', function () {
        var v = this.value;
        if (v !== '—') formHtml.querySelector('#dc-points').value = String(RATING_MAP[v] || 0);
        else formHtml.querySelector('#dc-points').value = '';
      });
    });
  }

  // 复制上周排班到本周
  function copyLastWeek() {
    var lastWeekDates = getWeekDates(-1 + DW_WEEK_OFFSET);
    var thisWeekDates = getWeekDates(DW_WEEK_OFFSET);
    var records = WB.state.tables.duty || [];
    var added = 0;
    lastWeekDates.forEach(function (ld, i) {
      var td = thisWeekDates[i];
      DUTY_AREAS.forEach(function (area) {
        var srcRec = null;
        records.forEach(function (r) { if (r.date === ld && r.area === area) srcRec = r; });
        if (srcRec) {
          var exists = false;
          records.forEach(function (r) { if (r.date === td && r.area === area) exists = true; });
          if (!exists) {
            records.push({ __id: WB.uid(), date: td, area: area, members: srcRec.members, rating: '—', points: '', remark: '' });
            added++;
          }
        }
      });
    });
    WB.state.tables.duty = records;
    WB.saveState();
    renderDutyRefresh();
    WB.showToast('已复制上周 ' + added + ' 条排班');
  }

  // 清空本周排班
  function clearCurrentWeek() {
    if (!confirm('确定清空当前显示周的全部排班？')) return;
    var weekDates = getWeekDates(DW_WEEK_OFFSET);
    var datesSet = {};
    weekDates.forEach(function (d) { datesSet[d] = true; });
    WB.state.tables.duty = (WB.state.tables.duty || []).filter(function (r) { return !datesSet[r.date]; });
    WB.saveState();
    renderDutyRefresh();
    WB.showToast('已清空本周排班');
  }

  // ============ 暴露 ============
  return {
    renderDashboard: renderDashboard,
    bindDashboard: bindDashboard,
    renderSchedule: renderSchedule,
    bindSchedule: bindSchedule,
    renderGrades: renderGrades,
    bindGrades: bindGrades,
    renderPoints: renderPoints,
    bindPoints: bindPoints,
    renderDutyWeekView: renderDutyWeekView,
    bindDutyWeekView: bindDutyWeekView,
    renderTodo: renderTodo,
    bindTodo: bindTodo
  };
})();
