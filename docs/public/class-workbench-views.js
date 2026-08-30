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
    html += statCard('📞', '待沟通家长', stats.pendingParents, '家长沟通待跟进');
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
    if (!sc.teachers) sc.teachers = {};          // 教师通讯录：{ 姓名: { phone, wechat, note } }
    if (typeof sc.mode === 'undefined') sc.mode = 'grid'; // 'grid' 课程表 | 'teacher' 任课表
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
    if (sc.mode === 'teacher') return renderTeacherTable();
    var days = sc.days, periods = sc.periods;
    var todayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var today = todayMap[new Date().getDay()];

    var html = '<div class="card">';
    html += '<div class="card-title">📅 课程表 <span class="extra">图形化周课表 · 点击格子录入科目与任课教师</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="sched-add-sub">＋ 添加科目</button>';
    html += '<button class="btn" id="sched-edit-periods">🕐 编辑时段</button>';
    html += '<button class="btn" id="sched-days" title="自定义每周显示星期几">📆 设置周次</button>';
    html += '<button class="btn" id="sched-stats">📊 课时统计</button>';
    html += '<button class="btn" id="sched-teacher" title="查看各科任课教师及联系方式">👨‍🏫 任课表</button>';
    html += '<button class="btn" id="sched-clear">🧹 清空课表</button>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn" id="sched-export">⬇ 导出课表</button>';
    html += '<label class="btn" style="cursor:pointer" title="从 Excel/CSV 导入课表数据">⬆ 导入课表<input type="file" id="sched-import-file" accept=".xlsx,.xls,.csv" style="display:none"></label>';
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
          if (cell.teacher) html += '<div class="s-teacher">' + H(cell.teacher) + '</div>';
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
      else if (id === 'sched-days') editScheduleDays();
      else if (id === 'sched-stats') showScheduleStats();
      else if (id === 'sched-teacher') { getSchedule().mode = 'teacher'; WB.saveState(); renderScheduleRefresh(); }
      else if (id === 'sched-clear') clearSchedule();
      else if (id === 'sched-export') exportSchedule();
    });
    // 导入文件
    var importInput = el('sched-import-file');
    if (importInput) {
      importInput.addEventListener('change', function () { importSchedule(this.files[0]); this.value = ''; });
    }
  }

  // 自定义周次：勾选要显示的星期几
  function editScheduleDays() {
    var sc = getSchedule();
    var html = '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:10px;line-height:1.7">勾选课表要显示的星期，取消勾选的星期不展示（数据保留，重新勾选后恢复）。</div>';
    html += '<div class="sched-days-ck">';
    DEFAULT_DAYS.forEach(function (d) {
      var on = sc.days.indexOf(d) >= 0;
      html += '<label class="sched-day-ck' + (on ? ' on' : '') + '"><input type="checkbox" value="' + d + '"' + (on ? ' checked' : '') + '>' + d + '</label>';
    });
    html += '</div>';
    WB.openModal('📆 设置周次', html, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var picked = [];
      Array.prototype.forEach.call(document.querySelectorAll('.sched-day-ck input:checked'), function (cb) { picked.push(cb.value); });
      if (picked.length === 0) { WB.showToast('请至少保留一个星期'); return false; }
      // 按默认顺序排列
      sc.days = DEFAULT_DAYS.filter(function (d) { return picked.indexOf(d) >= 0; });
      WB.saveState();
      renderScheduleRefresh();
      WB.showToast('周次已更新：' + sc.days.join('、'));
    });
  }

  function openSchedCell(key) {
    var sc = getSchedule();
    var cur = sc.grid[key] || {};
    var subjects = Object.keys(sc.subjects);
    // 教师候选名单：已录入教师 + 课表中出现的教师名
    var teacherNames = collectTeacherNames();
    var html = '<div style="font-size:13px;margin-bottom:10px;color:var(--c-text-2)">' + H(key) + '</div>';
    html += '<label><span class="lbl">科目</span><select id="sc-subj">';
    html += '<option value="">— 清除本格 —</option>';
    subjects.forEach(function (s) {
      html += '<option value="' + H(s) + '"' + (cur.subject === s ? ' selected' : '') + '>' + H(s) + '</option>';
    });
    html += '</select></label>';
    html += '<label class="full"><span class="lbl">任课教师</span>';
    html += '<input id="sc-teacher" list="sc-teacher-list" value="' + H(cur.teacher || '') + '" placeholder="可手输，或从列表选择">';
    html += '<datalist id="sc-teacher-list">';
    teacherNames.forEach(function (t) { html += '<option value="' + H(t) + '">'; });
    html += '</datalist></label>';
    html += '<label class="full"><span class="lbl">备注（如 双周 / 单周 / 实验课）</span>';
    html += '<input id="sc-note" value="' + H(cur.note || '') + '" placeholder="如 双周、单周、实验课、自习"></label>';
    WB.openModal('编辑课程 · ' + key, html, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var subj = el('sc-subj').value;
      var teacher = el('sc-teacher').value.trim();
      var note = el('sc-note').value.trim();
      if (subj) {
        sc.grid[key] = { subject: subj, note: note };
        if (teacher) sc.grid[key].teacher = teacher;
      } else delete sc.grid[key];
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
        if (!cell) return '';
        var parts = [cell.subject];
        if (cell.teacher) parts.push(cell.teacher);
        if (cell.note) parts.push(cell.note);
        return parts.join('·');
      }));
    });
    // 优先 XLSX
    if (typeof XLSX !== 'undefined') {
      var data = [header].concat(lines);
      var ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 18 }].concat(sc.days.map(function () { return { wch: 14 }; }));
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '课程表');
      XLSX.writeFile(wb, '课程表_' + WB.today() + '.xlsx');
      WB.showToast('课表已导出 Excel');
      return;
    }
    // CSV 降级
    var csv = '\uFEFF' + [header.map(WB.csvEscape).join(',')].concat(
      lines.map(function (r) { return r.map(WB.csvEscape).join(','); })
    ).join('\r\n');
    WB.downloadBlob(csv, '课程表_' + WB.today() + '.csv', 'text/csv;charset=utf-8');
    WB.showToast('课表已导出（CSV，Excel 可直接打开）');
  }

  function importSchedule(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = XLSX.read(e.target.result, { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows || rows.length < 2) { WB.showToast('文件内容为空'); return; }
        var header = rows[0];
        // 解析星期列（从第2列起）
        var dayCols = [];
        for (var ci = 1; ci < header.length; ci++) {
          var dn = String(header[ci] || '').trim();
          if (dn) dayCols.push({ i: ci, name: dn });
        }
        if (!dayCols.length) { WB.showToast('未找到星期列'); return; }
        var sc = getSchedule();
        var updated = 0;
        for (var ri = 1; ri < rows.length; ri++) {
          var row = rows[ri];
          var periodLabel = String(row[0] || '').trim();
          if (!periodLabel) continue;
          // 匹配时段（支持 "第一节" 或 "第一节课 8:00-8:40" 格式）
          var periodName = periodLabel.split(/\s/)[0];
          var period = sc.periods.find(function (p) { return p.name === periodName || p.name === periodLabel; });
          if (!period) continue;
          dayCols.forEach(function (dc) {
            var val = String(row[dc.i] || '').trim();
            if (!val) return;
            var key = dc.name + '-' + period.name;
            // 解析格式：科目 或 科目·教师·备注
            var parts = val.split(/·/);
            var subject = parts[0] || '';
            var teacher = parts[1] || '';
            var note = parts.slice(2).join('·') || '';
            if (!subject) return;
            if (!sc.subjects[subject]) sc.subjects[subject] = SUBJ_COLORS[Object.keys(sc.subjects).length % SUBJ_COLORS.length];
            sc.grid[key] = { subject: subject, teacher: teacher, note: note };
            updated++;
          });
        }
        WB.saveState();
        renderScheduleRefresh();
        WB.showToast('导入成功：更新 ' + updated + ' 个课表格子');
      } catch (err) { WB.showToast('解析失败：' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderScheduleRefresh() {
    var sc = getSchedule();
    el('content').innerHTML = renderSchedule();
    if (sc.mode === 'teacher') bindTeacherTable();
    else bindSchedule();
  }

  // ============ 任课表 ============
  // 教师名单：已录入通讯录 + 课表中出现的教师名（去重）
  function collectTeacherNames() {
    var sc = getSchedule();
    var set = {};
    Object.keys(sc.teachers).forEach(function (t) { if (t) set[t] = true; });
    Object.keys(sc.grid).forEach(function (k) {
      var t = sc.grid[k].teacher;
      if (t) set[t] = true;
    });
    return Object.keys(set).sort();
  }

  // 聚合每个教师的任课情况：科目、课时、课表明细
  function buildTeacherAssignments() {
    var sc = getSchedule();
    var map = {};
    Object.keys(sc.grid).forEach(function (k) {
      var cell = sc.grid[k];
      if (!cell.subject) return;
      var t = cell.teacher || '（未指定）';
      if (!map[t]) map[t] = { subjects: {}, cells: [] };
      map[t].subjects[cell.subject] = (map[t].subjects[cell.subject] || 0) + 1;
      map[t].cells.push({ key: k, subject: cell.subject, note: cell.note || '' });
    });
    // 已录入通讯录但未排课的教师也展示
    Object.keys(sc.teachers).forEach(function (t) {
      if (!map[t]) map[t] = { subjects: {}, cells: [] };
    });
    var list = Object.keys(map).map(function (t) {
      return { name: t, info: sc.teachers[t] || {}, subjects: map[t].subjects, cells: map[t].cells, total: map[t].cells.length };
    });
    list.sort(function (a, b) { return b.total - a.total || a.name.localeCompare(b.name, 'zh'); });
    return list;
  }

  function renderTeacherTable() {
    var sc = getSchedule();
    var list = buildTeacherAssignments();

    var html = '<div class="card">';
    html += '<div class="card-title">👨‍🏫 任课表 <span class="extra">各科任课教师一览 · 点击教师查看联系方式</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn" id="tt-back">📅 返回课程表</button>';
    html += '<button class="btn btn-primary" id="tt-add">＋ 添加教师</button>';
    html += '<div class="spacer"></div>';
    html += '<span class="tt-total">共 ' + list.length + ' 位教师</span>';
    html += '</div>';

    if (!list.length) {
      html += '<div class="empty">还没有教师信息。<br>可先「返回课程表」在格子里录入任课教师，或点击「＋ 添加教师」直接登记。</div>';
      html += '</div>';
      return html;
    }

    html += '<div class="tt-grid">';
    list.forEach(function (t) {
      var info = t.info;
      var subjKeys = Object.keys(t.subjects);
      var color = SUBJ_COLORS[Math.abs(hashStr(t.name)) % SUBJ_COLORS.length];
      html += '<div class="tt-card" data-tt="' + H(t.name) + '" title="点击查看 / 编辑联系方式">';
      html += '<div class="tt-head">';
      html += '<div class="tt-avatar" style="background:' + hexToRgba(color, 0.15) + ';color:' + darkenHex(color) + '">' + H(t.name.slice(0, 1)) + '</div>';
      html += '<div class="tt-id"><b>' + H(t.name) + '</b>';
      html += '<span>' + t.total + ' 节/周' + (subjKeys.length ? ' · ' + subjKeys.length + ' 科' : ' · 未排课') + '</span></div>';
      html += '<span class="tt-arrow">›</span>';
      html += '</div>';
      if (subjKeys.length) {
        html += '<div class="tt-subjs">';
        subjKeys.forEach(function (s) {
          var c = sc.subjects[s] || '#64748b';
          html += '<span class="tt-subj" style="background:' + hexToRgba(c, 0.14) + ';color:' + darkenHex(c) + ';border:1px solid ' + c + '">' + H(s) + ' ×' + t.subjects[s] + '</span>';
        });
        html += '</div>';
      } else {
        html += '<div class="tt-subjs"><span class="tt-none">暂无排课</span></div>';
      }
      html += '<div class="tt-meta">';
      html += info.phone
        ? '<span class="tt-phone">📞 ' + H(info.phone) + '</span>'
        : '<span class="tt-phone none">📞 未登记手机号</span>';
      if (info.wechat) html += '<span class="tt-phone">💬 ' + H(info.wechat) + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="sched-hint">💡 点击教师卡片查看任课明细并登记手机号 / 微信，方便家校联系。</div>';
    html += '</div>';
    return html;
  }

  // 简单字符串哈希（用于给教师分配头像底色）
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function bindTeacherTable() {
    var root = rebindRoot();
    root.addEventListener('click', function (e) {
      var card = e.target.closest('.tt-card');
      if (card) { openTeacherEditor(card.dataset.tt); return; }
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'tt-back') {
        getSchedule().mode = 'grid';
        WB.saveState();
        renderScheduleRefresh();
      } else if (btn.id === 'tt-add') addTeacherManually();
    });
  }

  // 教师详情弹窗：联系方式编辑 + 任课明细
  function openTeacherEditor(name) {
    var sc = getSchedule();
    var info = sc.teachers[name] || {};
    var assigns = buildTeacherAssignments();
    var me = null;
    assigns.forEach(function (t) { if (t.name === name) me = t; });
    if (!me) me = { name: name, subjects: {}, cells: [], total: 0 };

    var body = '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:10px">登记联系方式后，点击「保存」即可。</div>';
    body += '<label><span class="lbl">姓名</span><input id="tt-name" value="' + H(name) + '"></label>';
    body += '<label><span class="lbl">📞 手机号</span><input id="tt-phone" value="' + H(info.phone || '') + '" placeholder="如 138****8888"></label>';
    body += '<label><span class="lbl">💬 微信</span><input id="tt-wechat" value="' + H(info.wechat || '') + '" placeholder="选填"></label>';
    body += '<label class="full"><span class="lbl">备注</span><input id="tt-note" value="' + H(info.note || '') + '" placeholder="如 语文备课组长 / 班主任"></label>';

    if (me.cells.length) {
      body += '<div style="margin-top:12px"><div class="form-title" style="margin-bottom:6px">📖 任课明细（' + me.total + ' 节）</div>';
      body += '<div class="tt-detail">';
      me.cells.forEach(function (c) {
        var subj = c.subject;
        var col = sc.subjects[subj] || '#64748b';
        body += '<div class="tt-detail-item"><span class="tt-dot" style="background:' + col + '"></span>' +
          '<span class="tt-detail-key">' + H(c.key) + '</span>' +
          '<span class="tt-detail-subj" style="color:' + darkenHex(col) + '">' + H(subj) + '</span>' +
          (c.note ? '<span class="tt-detail-note">' + H(c.note) + '</span>' : '') +
          '</div>';
      });
      body += '</div></div>';
    }

    WB.openModal('👨‍🏫 教师 · ' + H(name), body, [
      { text: '关闭', cls: 'btn', act: 'close' },
      { text: '删除登记', cls: 'btn btn-danger', act: 'remove' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act === 'close') return;
      var newName = el('tt-name').value.trim();
      if (!newName) { WB.showToast('姓名不能为空'); return false; }
      if (act === 'remove') {
        delete sc.teachers[name];
        // 课表中该教师标注清除，回到未指定
        Object.keys(sc.grid).forEach(function (k) {
          if (sc.grid[k].teacher === name) delete sc.grid[k].teacher;
        });
        WB.saveState();
        renderScheduleRefresh();
        WB.showToast('已删除教师登记');
        return;
      }
      // 改名：同步课表中所有该教师的格子
      if (newName !== name) {
        Object.keys(sc.grid).forEach(function (k) {
          if (sc.grid[k].teacher === name) sc.grid[k].teacher = newName;
        });
        var old = sc.teachers[name];
        delete sc.teachers[name];
        sc.teachers[newName] = old || {};
      }
      sc.teachers[newName].phone = el('tt-phone').value.trim();
      sc.teachers[newName].wechat = el('tt-wechat').value.trim();
      sc.teachers[newName].note = el('tt-note').value.trim();
      WB.saveState();
      renderScheduleRefresh();
      WB.showToast('教师信息已保存');
    });
  }

  // 手动添加教师（无排课也可先登记）
  function addTeacherManually() {
    var sc = getSchedule();
    var html = '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:10px">登记教师姓名与联系方式；之后在课程表格子中可直接选择该教师。</div>';
    html += '<label><span class="lbl">姓名</span><input id="tt-new-name" placeholder="如 王老师"></label>';
    html += '<label><span class="lbl">📞 手机号</span><input id="tt-new-phone" placeholder="如 138****8888"></label>';
    html += '<label><span class="lbl">💬 微信</span><input id="tt-new-wechat" placeholder="选填"></label>';
    WB.openModal('＋ 添加教师', html, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act) {
      if (act !== 'save') return;
      var n = el('tt-new-name').value.trim();
      if (!n) { WB.showToast('请填写教师姓名'); return false; }
      if (sc.teachers[n]) { WB.showToast('教师已存在：' + n); return false; }
      sc.teachers[n] = {
        phone: el('tt-new-phone').value.trim(),
        wechat: el('tt-new-wechat').value.trim(),
        note: ''
      };
      WB.saveState();
      renderScheduleRefresh();
      WB.showToast('已添加教师：' + n);
    });
  }

  // ============ 成绩分析 ============
  function renderGrades() {
    var state = WB.state.grades;
    var exams = state.exams || [];
    var html = '<div class="card">';
    html += '<div class="card-title">📈 智能成绩分析 <span class="extra">多批次对比 · 自动统计 · 学情分析</span></div>';
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="g-new-exam">＋ 新建考试批次</button>';
    html += '<button class="btn" id="g-import-roster">从花名册同步学生</button>';
    html += '<button class="btn" id="g-lines" title="设置上线分数线（总分/单科），用于上线类分析">🎯 分数线设置</button>';
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
        (ex.icon || '📅') + ' ' + H(ex.name) +
        (ex.type ? '<small>' + H(ex.type) + '</small>' : '') + '</button>';
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

  // ===== 成绩分析页签 =====
  var GA_TABS = [
    { key: 'overview', icon: '📊', label: '考情总览' },
    { key: 'classes', icon: '🏫', label: '各班对比' },
    { key: 'lines', icon: '🎯', label: '上线分析' },
    { key: 'balance', icon: '⚖️', label: '学科均衡' },
    { key: 'history', icon: '📈', label: '班级历次' },
    { key: 'table', icon: '📋', label: '学生成绩' },
    { key: 'report', icon: '👤', label: '学生报告' }
  ];
  function renderGTabNav() {
    var tab = WB.state.grades.gTab || 'overview';
    var html = '<div class="score-tabs ga-tabs" id="g-tabs2">';
    GA_TABS.forEach(function (t) {
      html += '<button class="score-tab ga-tab' + (tab === t.key ? ' active' : '') + '" data-gtab="' + t.key + '">' +
        t.icon + ' ' + t.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  // 班级映射：成绩行姓名/学号 → 花名册班级
  function getClassMap() {
    var map = {};
    (WB.getTable('roster') || []).forEach(function (r) {
      if (r.name) map[r.name] = r.className || '';
      if (r.studentNo) map['#' + r.studentNo] = r.className || '';
    });
    return map;
  }
  function classOfRow(row, classMap) {
    var c = classMap[row.name] || classMap['#' + (row.studentNo || '')];
    return c || '未分班';
  }
  // 按班级分组
  function groupByClass(withRank, classMap) {
    var groups = {}, order = [];
    withRank.forEach(function (r) {
      var c = classOfRow(r, classMap);
      if (!groups[c]) { groups[c] = []; order.push(c); }
      groups[c].push(r);
    });
    return { groups: groups, order: order };
  }

  function renderExamDetail(exam) {
    var html = '';

    // 顶部：基本信息 + 编辑
    html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">';
    html += '<div style="font-weight:600;font-size:15px">' + (exam.icon || '📅') + ' ' + H(exam.name) + '</div>';
    if (exam.type) html += '<span class="ga-exam-type">' + H(exam.type) + '</span>';
    if (exam.subjects) html += '<div style="color:var(--c-text-2);font-size:12px">' + H(exam.subjects.join(' / ')) + '</div>';
    html += '<div style="margin-left:auto">';
    html += '<button class="btn btn-sm" data-act="edit-exam" data-id="' + exam.__id + '">编辑批次</button>';
    html += '<button class="btn btn-sm btn-danger" data-act="del-exam" data-id="' + exam.__id + '">删除批次</button>';
    html += '</div></div>';

    // 工具栏
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" data-act="add-score">＋ 录入学生成绩</button>';
    html += '<button class="btn" data-act="import-scores" title="Excel/CSV 按列映射批量导入，自动按姓名更新">📥 Excel 导入</button>';
    html += '<button class="btn" data-act="export-scores">⬇ 导出成绩</button>';
    html += '<button class="btn" data-act="analysis-summary">📝 生成学情小结</button>';
    html += '</div>';

    // 分析页签
    html += renderGTabNav();

    // 数据
    var scores = WB.state.grades.scores[exam.__id] || [];
    var subjects = (exam.subjects && exam.subjects.length) ? exam.subjects
      : getSubjectsFromScores(scores);
    var withRank = scores.length > 0 ? computeWithRank(scores, subjects) : [];
    var tab = WB.state.grades.gTab || 'overview';

    if (tab === 'overview') {
      // 📊 考情总览：统计摘要 + 分段对比 + 等级分布 + 直方图 + 学情小结
      html += renderScoreSummary();
      html += renderSegmentCompare(withRank);
      html += renderHistogram(withRank, subjects);
      html += renderAnalysisPanel(subjects, withRank);
    } else if (tab === 'classes') {
      // 🏫 各班对比：班级成绩对比 + 各班各科对比 + 优秀生分布
      html += renderClassCompare(withRank, subjects);
    } else if (tab === 'lines') {
      // 🎯 上线分析：上线情况 / 各科上线 / 人数对比 / 命中贡献 / 均分对比 / 临界生
      html += renderLinesPanel(withRank, subjects);
    } else if (tab === 'balance') {
      // ⚖️ 学科均衡
      html += renderBalancePanel(withRank, subjects);
    } else if (tab === 'history') {
      // 📈 班级历次对比 + 多批次对比
      html += renderClassHistory();
      html += renderComparePanel();
    } else if (tab === 'table') {
      // 📋 学生成绩表
      html += renderScoreTable(withRank, subjects);
    } else if (tab === 'report') {
      // 👤 学生报告
      html += renderReportPanel(withRank, subjects);
    }

    return html;
  }

  // 📋 学生成绩表
  function renderScoreTable(withRank, subjects) {
    var html = '<div class="table-wrap"><div class="table-scroll"><table class="data"><thead><tr>';
    html += '<th>学号</th><th>姓名</th>';
    subjects.forEach(function (s) { html += '<th>' + H(s) + '</th>'; });
    html += '<th>总分</th><th>班级排名</th><th>等级</th><th>操作</th></tr></thead><tbody id="score-tbody">';

    if (withRank.length === 0) {
      html += '<tr><td colspan="' + (subjects.length + 7) + '" class="empty">尚未录入成绩</td></tr>';
    } else {
      withRank.forEach(function (row) {
        html += '<tr>';
        html += '<td>' + H(row.studentNo || '') + '</td>';
        html += '<td class="ga-name" data-act="trend" data-name="' + H(row.name) + '" title="点击查看跨批次成绩趋势">📈 ' + H(row.name) + '</td>';
        subjects.forEach(function (s) {
          var rk = row['__rk_' + s];
          html += '<td>' + (row[s] != null ? H(row[s]) : '—') +
            (rk ? ' <span class="ga-srank" title="' + H(s) + '第 ' + rk + ' 名">#' + rk + '</span>' : '') +
            '</td>';
        });
        html += '<td style="font-weight:600;color:var(--c-primary)">' + row.__total.toFixed(1) +
          (row.__imported ? ' <span class="ga-srank" title="使用导入的总分（可在编辑中留空改为按科目相加）">导</span>' : '') + '</td>';
        html += '<td style="font-weight:600">' + row.__rank + '</td>';
        html += '<td><span class="tag ' + levelTag(row.__level) + '" style="padding:2px 8px;border-radius:4px;font-size:11px">' + row.__level + '</span></td>';
        html += '<td class="op">' +
          '<button class="btn btn-sm" data-act="edit-score" data-name="' + H(row.name) + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del-score" data-name="' + H(row.name) + '">删除</button>' +
          '<button class="btn btn-sm" data-act="open-report" data-name="' + H(row.name) + '" title="查看完整学生报告">📄 报告</button>' +
          '</td></tr>';
      });
    }
    html += '</tbody></table></div></div>';
    return html;
  }

  // 📊 分数分段对比（总分 ≥90/80/70/60/<60 人数与占比）
  function renderSegmentCompare(withRank) {
    if (!withRank || withRank.length === 0) return '';
    var segs = [
      { name: '优秀 ≥90', min: 90, c: 0, cls: 'var(--c-success)' },
      { name: '良好 80-89', min: 80, c: 0, cls: 'var(--c-primary)' },
      { name: '中等 70-79', min: 70, c: 0, cls: 'var(--c-warn)' },
      { name: '及格 60-69', min: 60, c: 0, cls: 'var(--c-text-2)' },
      { name: '待提高 <60', min: 0, c: 0, cls: 'var(--c-danger)' }
    ];
    withRank.forEach(function (r) {
      var t = r.__total;
      for (var i = 0; i < segs.length; i++) {
        if (t >= segs[i].min) { segs[i].c++; break; }
      }
    });
    var maxC = Math.max.apply(null, segs.map(function (s) { return s.c; })) || 1;
    var html = '<div class="card" style="margin-top:12px"><div class="card-title">🔢 分数分段对比 <span class="extra">总分分段人数分布</span></div>';
    html += '<div class="ga-hist-chart" style="grid-template-columns:repeat(' + segs.length + ',1fr);display:grid;gap:8px">';
    segs.forEach(function (s) {
      var h = Math.round(s.c / maxC * 100);
      html += '<div class="ga-hist-col" title="' + s.name + '：' + s.c + ' 人">' +
        '<span class="ga-hist-n">' + s.c + ' 人</span>' +
        '<span class="ga-hist-bar" style="height:' + Math.max(h, s.c > 0 ? 8 : 2) + '%;background:' + s.cls + '"></span>' +
        '<span style="font-size:11px;color:var(--c-text-2)">' + (s.c / withRank.length * 100).toFixed(0) + '%</span></div>';
    });
    html += '</div><div class="ga-hist-legend">' + segs.map(function (s) { return H(s.name); }).join(' · ') + '</div></div>';
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
      // Excel 导入的总分优先（__totalImported 有值 = 以导入为准；否则按科目相加）
      var it = parseFloat(r.__totalImported);
      var imported = !isNaN(it);
      if (imported) total = it;
      return Object.assign({}, r, { __total: total, __count: count, __imported: imported });
    });
    arr.sort(function (a, b) { return b.__total - a.__total; });
    arr.forEach(function (r, i) { r.__rank = i + 1; });
    // 单科名次（同分并列同名次），存于 __rk_{科目}
    subjects.forEach(function (s) {
      var idxs = arr.map(function (r, i) {
        return { v: parseFloat(r[s]), i: i };
      }).filter(function (x) { return !isNaN(x.v); })
        .sort(function (a, b) { return b.v - a.v; });
      var prevV = null, prevRank = 0;
      idxs.forEach(function (x, k) {
        var rank = (prevV !== null && x.v === prevV) ? prevRank : k + 1;
        arr[x.i]['__rk_' + s] = rank;
        prevV = x.v;
        prevRank = rank;
      });
    });
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

  // 总分/单科分布直方图（纯 CSS 柱状，8 桶，科目可切换）
  var GA_HIST_SUBJ = '__total';
  function renderHistogram(withRank, subjects) {
    if (!withRank || withRank.length < 2) return '';
    subjects = subjects || [];
    // 当前维度取数（切到无效科目时回退总分）
    var vals;
    if (GA_HIST_SUBJ === '__total') {
      vals = withRank.map(function (r) { return r.__total; });
    } else {
      vals = withRank.map(function (r) { return parseFloat(r[GA_HIST_SUBJ]); })
        .filter(function (v) { return !isNaN(v); });
      if (vals.length < 2) { GA_HIST_SUBJ = '__total'; vals = withRank.map(function (r) { return r.__total; }); }
    }
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    var n = 8;
    var step = (max - min) / n || 1;
    if (step <= 0) step = 1;
    var buckets = [];
    for (var i = 0; i < n; i++) {
      var lo = min + i * step;
      buckets.push({ lo: lo, hi: lo + step, c: 0 });
    }
    vals.forEach(function (t) {
      var idx = Math.floor((t - min) / step);
      if (idx < 0) idx = 0;
      if (idx >= n) idx = n - 1;
      buckets[idx].c++;
    });
    var maxC = Math.max.apply(null, buckets.map(function (b) { return b.c; }));

    // 维度切换按钮：总分 + 各科目
    function tabBtn(key, label) {
      return '<button class="ga-hist-tab' + (GA_HIST_SUBJ === key ? ' on' : '') +
        '" data-act="hist-sub" data-sub="' + H(key) + '">' + H(label) + '</button>';
    }
    var tabs = tabBtn('__total', '总分');
    subjects.forEach(function (s) { tabs += tabBtn(s, s); });

    var dimLabel = GA_HIST_SUBJ === '__total' ? '总分' : GA_HIST_SUBJ;
    var html = '<div class="ga-hist"><div class="ga-hist-title">📊 ' + H(dimLabel) + '分布（' +
      min.toFixed(0) + ' ~ ' + max.toFixed(0) + ' 分，' + vals.length + ' 人）' +
      '<span class="ga-hist-tabs">' + tabs + '</span></div>';
    html += '<div class="ga-hist-chart">';
    buckets.forEach(function (b) {
      var h = maxC > 0 ? Math.round(b.c / maxC * 100) : 0;
      html += '<div class="ga-hist-col" title="' + b.lo.toFixed(0) + '-' + b.hi.toFixed(0) + ' 分：' + b.c + ' 人">' +
        '<span class="ga-hist-n"' + (b.c === 0 ? ' style="opacity:.35"' : '') + '>' + b.c + '</span>' +
        '<span class="ga-hist-bar" style="height:' + Math.max(h, b.c > 0 ? 8 : 2) + '%"></span>' +
        '</div>';
    });
    html += '</div><div class="ga-hist-legend">' + H(dimLabel) + '区间 →</div></div>';
    return html;
  }

  // ===== 多批次对比 =====
  // 计算两次考试的总分/名次对照（按姓名匹配，科目可不同）
  function computeCompare(aId, bId) {
    var g = WB.state.grades;
    function stats(eid) {
      var exam = g.exams.find(function (x) { return x.__id === eid; });
      var scores = g.scores[eid] || [];
      var subs = (exam && exam.subjects && exam.subjects.length) ? exam.subjects : getSubjectsFromScores(scores);
      var wr = computeWithRank(scores, subs);
      var map = {};
      wr.forEach(function (r) { map[r.name] = { total: r.__total, rank: r.__rank }; });
      return { map: map, subs: subs, rows: wr, count: scores.length };
    }
    var A = stats(aId), B = stats(bId);
    var names = Object.keys(A.map).filter(function (n) { return B.map[n]; });
    var rows = names.map(function (n) {
      return { name: n, ta: A.map[n].total, ra: A.map[n].rank, tb: B.map[n].total, rb: B.map[n].rank };
    });
    rows.sort(function (x, y) { return x.rb - y.rb; });
    rows.forEach(function (r) { r.dt = r.tb - r.ta; r.dr = r.ra - r.rb; }); // dr>0 = 名次上升
    return { A: A, B: B, rows: rows, names: names };
  }

  function renderComparePanel() {
    var g = WB.state.grades;
    var withScores = (g.exams || []).filter(function (e) { return (g.scores[e.__id] || []).length > 0; });
    if (withScores.length < 2) return '';
    // 默认对比最近两次（列表顺序视为时间顺序）
    var aId = g.cmpA, bId = g.cmpB;
    if (!withScores.some(function (e) { return e.__id === aId; })) aId = withScores[withScores.length - 2].__id;
    if (!withScores.some(function (e) { return e.__id === bId; }) || bId === aId) bId = withScores[withScores.length - 1].__id === aId
      ? withScores[withScores.length - 2].__id : withScores[withScores.length - 1].__id;
    g.cmpA = aId; g.cmpB = bId;

    function sel(id, val) {
      var h = '<select id="' + id + '" class="ga-cmp-sel">';
      withScores.forEach(function (e) {
        h += '<option value="' + e.__id + '"' + (e.__id === val ? ' selected' : '') + '>' +
          H((e.icon || '📅') + ' ' + e.name) + '</option>';
      });
      return h + '</select>';
    }

    var html = '<div class="card" style="margin-top:12px">';
    html += '<div class="card-title">🔀 多批次对比 <span class="extra">进退步追踪 · 均分变化</span></div>';
    html += '<div class="ga-cmp-bar">' +
      sel('g-cmp-a', aId) +
      '<span class="ga-cmp-vs">VS</span>' +
      sel('g-cmp-b', bId) +
      '<span style="font-size:11px;color:var(--c-text-3);margin-left:8px">两次科目可不同，按总分与名次对比；仅匹配两次都参考的学生</span>' +
      '</div>';

    var cmp = computeCompare(aId, bId);
    var aName = (g.exams.find(function (e) { return e.__id === aId; }) || {}).name;
    var bName = (g.exams.find(function (e) { return e.__id === bId; }) || {}).name;

    if (cmp.names.length < 2) {
      html += '<div class="empty">两次考试没有共同学生（按姓名匹配），无法对比。</div></div>';
      return html;
    }

    // 均分变化
    var avgA = cmp.rows.reduce(function (a, r) { return a + r.ta; }, 0) / cmp.rows.length;
    var avgB = cmp.rows.reduce(function (a, r) { return a + r.tb; }, 0) / cmp.rows.length;
    var dAvg = avgB - avgA;
    html += '<div class="score-summary">';
    html += summaryCell('共同参考', cmp.rows.length + ' 人');
    html += '<div class="cell"><div class="k">' + H(aName) + ' 均分</div><div class="v">' + avgA.toFixed(1) + '</div></div>';
    html += '<div class="cell"><div class="k">' + H(bName) + ' 均分</div><div class="v">' + avgB.toFixed(1) + '</div></div>';
    html += '<div class="cell"><div class="k">均分变化</div><div class="v" style="color:' +
      (dAvg > 0 ? 'var(--c-success)' : dAvg < 0 ? 'var(--c-danger)' : 'var(--c-text-2)') + '">' +
      (dAvg > 0 ? '+' : '') + dAvg.toFixed(1) + '</div></div>';
    html += '</div>';

    // 进步榜 / 退步预警
    var asc = cmp.rows.slice().sort(function (x, y) { return y.dr - x.dr; }).slice(0, 5);
    var desc = cmp.rows.slice().sort(function (x, y) { return x.dr - y.dr; }).filter(function (r) { return r.dr < 0; }).slice(0, 5);
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:10px 0">';
    html += '<div class="card" style="border-color:#a7f3d0;background:#f0fdf4">' +
      '<div class="card-title" style="color:var(--c-success);margin-bottom:6px">🚀 进步榜（名次上升 Top' + asc.length + '）</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (asc.filter(function (r) { return r.dr > 0; }).map(function (r) {
        return H(r.name) + ' <b style="color:var(--c-success)">↑' + r.dr + '</b>（' + r.ra + '→' + r.rb + '）';
      }).join('、') || '<span class="empty">—</span>') + '</div></div>';
    html += '<div class="card" style="border-color:#fecaca;background:#fef2f2">' +
      '<div class="card-title" style="color:var(--c-danger);margin-bottom:6px">⚠️ 退步预警（名次下降 Top' + desc.length + '）</div>' +
      '<div style="font-size:12px;color:var(--c-text-2);line-height:1.8">' +
      (desc.map(function (r) {
        return H(r.name) + ' <b style="color:var(--c-danger)">↓' + (-r.dr) + '</b>（' + r.ra + '→' + r.rb + '）';
      }).join('、') || '<span class="empty">—</span>') + '</div></div>';
    html += '</div>';

    // 对比表
    html += '<div class="table-wrap"><div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>姓名</th><th>' + H(aName) + ' 总分</th><th>名次</th><th>' + H(bName) + ' 总分</th><th>名次</th>' +
      '<th>总分变化</th><th>名次变化</th></tr></thead><tbody>';
    cmp.rows.forEach(function (r) {
      html += '<tr><td>' + H(r.name) + '</td><td>' + r.ta.toFixed(1) + '</td><td>' + r.ra + '</td>' +
        '<td>' + r.tb.toFixed(1) + '</td><td>' + r.rb + '</td>' +
        '<td style="color:' + (r.dt > 0 ? 'var(--c-success)' : r.dt < 0 ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
        (r.dt > 0 ? '+' : '') + r.dt.toFixed(1) + '</td>' +
        '<td style="font-weight:600;color:' + (r.dr > 0 ? 'var(--c-success)' : r.dr < 0 ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
        (r.dr > 0 ? '↑' + r.dr : r.dr < 0 ? '↓' + (-r.dr) : '—') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '</div>';
    return html;
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
    var failCount = {};
    subjects.forEach(function (s) {
      var failN = scoresOfSubject(s).filter(function (v) { return v < 60; }).length;
      failCount[s] = failN;
    });
    var failTotal = Object.keys(failCount).map(function (k) { return failCount[k]; })
      .reduce(function (a, b) { return a + b; }, 0);
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

  // ===== 分数线（独立弹窗配置）=====
  var LINES_DEFAULT = [
    { name: '一本线', total: 560, subs: {} },
    { name: '本科线', total: 460, subs: {} },
    { name: '专科线', total: 200, subs: {} }
  ];
  function getLines() {
    var g = WB.state.grades;
    if (!g.lines || !Array.isArray(g.lines.rows) || !g.lines.rows.length) {
      g.lines = { rows: JSON.parse(JSON.stringify(LINES_DEFAULT)) };
      WB.saveState();
    }
    return g.lines.rows;
  }
  function linesRowHtml(row, idx, subjects) {
    var h = '<div class="lr" data-idx="' + idx + '">';
    h += '<input class="lr-name" value="' + H(row.name || '') + '" placeholder="线名称">';
    h += '<input class="lr-total" type="number" value="' + (row.total != null ? row.total : '') + '" placeholder="总分线">';
    subjects.forEach(function (s) {
      h += '<input class="lr-sub" type="number" data-sub="' + H(s) + '" value="' +
        (row.subs && row.subs[s] != null ? row.subs[s] : '') + '" placeholder="' + H(s) + '">';
    });
    h += '<button class="btn btn-sm btn-danger lr-del" title="删除此线">✕</button>';
    h += '</div>';
    return h;
  }
  function openLinesForm() {
    var g = WB.state.grades;
    var exam = g.exams.find(function (e) { return e.__id === g.currentExamId; });
    var subjects = (exam && exam.subjects) || [];
    var lines = getLines();
    var head = '<div class="lr lr-head"><span>线名称</span><span>总分线</span>' +
      subjects.map(function (s) { return '<span>' + H(s) + ' 线</span>'; }).join('') + '<span></span></div>';
    var body = '<div class="lines-editor" id="lines-box">' + head +
      lines.map(function (l, i) { return linesRowHtml(l, i, subjects); }).join('') +
      '<button class="btn btn-sm lr-add">＋ 添加一条分数线</button>' +
      '</div>';
    body += '<p style="font-size:11px;color:var(--c-text-3);margin-top:8px;line-height:1.7">' +
      '· 总分线：总分 ≥ 线值即上线；单科线：填了则对应科目也需 ≥ 线值才计入上线（留空 = 不设单科线）<br>' +
      '· 分数线用于「🎯 上线分析」页签：上线情况 / 各科上线 / 人数对比 / 命中率贡献率 / 上线均分 / 临界生</p>';
    WB.openModal('🎯 分数线设置', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return;
      var rows = [];
      formEl.querySelectorAll('.lr[data-idx]').forEach(function (rowEl) {
        var name = rowEl.querySelector('.lr-name').value.trim();
        var total = parseFloat(rowEl.querySelector('.lr-total').value);
        if (!name || isNaN(total)) return;
        var subs = {};
        rowEl.querySelectorAll('.lr-sub').forEach(function (inp) {
          var v = parseFloat(inp.value);
          if (!isNaN(v)) subs[inp.dataset.sub] = v;
        });
        rows.push({ name: name, total: total, subs: subs });
      });
      g.lines = { rows: rows };
      WB.saveState();
      renderGradesRefresh();
      WB.showToast('已保存 ' + rows.length + ' 条分数线');
    }, function (formEl) {
      var box = formEl.querySelector('#lines-box');
      if (!box) return;
      box.addEventListener('click', function (e) {
        var del = e.target.closest('.lr-del');
        if (del) { var row = del.closest('.lr'); if (row) row.parentNode.removeChild(row); return; }
        var add = e.target.closest('.lr-add');
        if (add) {
          var idx = box.querySelectorAll('.lr[data-idx]').length;
          var rowEl = document.createElement('div');
          rowEl.innerHTML = linesRowHtml({ name: '', total: '', subs: {} }, idx, subjects);
          box.insertBefore(rowEl.firstChild, add);
        }
      });
    });
  }
  // 该生是否过某条线（总分 + 单科全达标）
  function linePass(row, line) {
    if (row.__total < line.total) return false;
    var subs = line.subs || {};
    for (var s in subs) {
      var v = parseFloat(row[s]);
      if (isNaN(v) || v < subs[s]) return false;
    }
    return true;
  }
  function lineSubsHtml(line) {
    var subs = line.subs || {};
    var ks = Object.keys(subs);
    if (!ks.length) return '—';
    return ks.map(function (s) { return H(s) + '≥' + subs[s]; }).join('、');
  }

  // ===== 🏫 各班对比：班级成绩对比 / 各班各科对比 / 优秀生分布 =====
  function renderClassCompare(withRank, subjects) {
    if (!withRank.length) return '';
    var classMap = getClassMap();
    var g = groupByClass(withRank, classMap);
    var html = '';

    // 1. 班级成绩对比（总分）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🏫 班级成绩对比 <span class="extra">本次考试总分概况（按花名册班级字段分组）</span></div>';
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr>' +
      '<th>班级</th><th>参考人数</th><th>总分均分</th><th>最高分</th><th>最低分</th><th>平均名次</th></tr></thead><tbody>';
    var bestAvg = -1;
    g.order.forEach(function (c) {
      var arr = g.groups[c];
      var avg = arr.reduce(function (a, r) { return a + r.__total; }, 0) / arr.length;
      if (avg > bestAvg) bestAvg = avg;
    });
    g.order.forEach(function (c) {
      var arr = g.groups[c];
      var avg = arr.reduce(function (a, r) { return a + r.__total; }, 0) / arr.length;
      var mx = Math.max.apply(null, arr.map(function (r) { return r.__total; }));
      var mn = Math.min.apply(null, arr.map(function (r) { return r.__total; }));
      var avgRank = arr.reduce(function (a, r) { return a + r.__rank; }, 0) / arr.length;
      html += '<tr><td style="font-weight:600">' + H(c) + '</td><td>' + arr.length + '</td>' +
        '<td' + (avg === bestAvg && g.order.length > 1 ? ' class="best"' : '') + '>' + avg.toFixed(1) + '</td>' +
        '<td>' + mx.toFixed(1) + '</td><td>' + mn.toFixed(1) + '</td><td>' + avgRank.toFixed(1) + '</td></tr>';
    });
    if (g.order.length <= 1) {
      html += '<tr><td colspan="6" class="empty" style="text-align:center">仅一个班级（未分班数据），可在「全班花名册」为学生填写班级后对比多班</td></tr>';
    }
    html += '</tbody></table></div></div>';

    // 2. 各班各科对比（均分矩阵）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🧮 各班各科对比 <span class="extra">各科均分（绿=最高，红=最低）</span></div>';
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>科目</th>';
    g.order.forEach(function (c) { html += '<th>' + H(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    subjects.forEach(function (s) {
      var vals = g.order.map(function (c) {
        var arr = g.groups[c].map(function (r) { return parseFloat(r[s]); }).filter(function (v) { return !isNaN(v); });
        return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null;
      });
      var best = Math.max.apply(null, vals.filter(function (v) { return v != null; }));
      var worst = Math.min.apply(null, vals.filter(function (v) { return v != null; }));
      html += '<tr><td style="font-weight:600">' + H(s) + '</td>';
      vals.forEach(function (v) {
        if (v == null) { html += '<td>—</td>'; return; }
        var cls = (g.order.length > 1 && v === best) ? ' class="best"' : (g.order.length > 1 && v === worst) ? ' class="worst"' : '';
        html += '<td' + cls + '>' + v.toFixed(1) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 3. 优秀生分布
    var topN = WB.state.grades.topN || 10;
    var top = withRank.slice(0, Math.min(topN, withRank.length));
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🏅 优秀生分布 <span class="extra">总分前 ' + topN + ' 名的班级归属' +
      '<span class="ga-top-nav">' + [5, 10, 20, 50].map(function (n) {
        return '<button class="ga-hist-tab' + (topN === n ? ' on' : '') + '" data-act="top-dist" data-n="' + n + '">前 ' + n + '</button>';
      }).join('') + '</span></span></div>';
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>班级</th><th>优秀人数</th><th>占比</th><th>名单</th></tr></thead><tbody>';
    g.order.slice().sort(function (a, b) {
      var ca = top.filter(function (r) { return classOfRow(r, classMap) === a; }).length;
      var cb = top.filter(function (r) { return classOfRow(r, classMap) === b; }).length;
      return cb - ca;
    }).forEach(function (c) {
      var hit = top.filter(function (r) { return classOfRow(r, classMap) === c; });
      html += '<tr><td style="font-weight:600">' + H(c) + '</td><td class="best">' + hit.length + '</td>' +
        '<td>' + (hit.length / top.length * 100).toFixed(0) + '%</td>' +
        '<td style="font-size:12px;color:var(--c-text-2)">' + (hit.map(function (r) {
          return H(r.name) + '(' + r.__total.toFixed(0) + ')';
        }).join('、') || '—') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  // ===== 🎯 上线分析：上线情况 / 各科上线 / 人数对比 / 命中贡献 / 均分对比 / 临界生 =====
  function renderLinesPanel(withRank, subjects) {
    if (!withRank.length) return '';
    var lines = getLines();
    if (!lines.length) return '<div class="empty">请先点击右上角「🎯 分数线设置」配置分数线。</div>';
    var classMap = getClassMap();
    var g = groupByClass(withRank, classMap);
    var html = '';

    // 1. 上线情况（按线）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🎯 上线情况 <span class="extra">总分 ≥ 线值（单科线需全部达标）</span></div>';
    html += '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>线</th><th>总分线</th><th>单科线</th><th>上线人数</th><th>上线率</th><th>上线名单</th></tr></thead><tbody>';
    lines.forEach(function (ln) {
      var hit = withRank.filter(function (r) { return linePass(r, ln); });
      var names = hit.slice(0, 15).map(function (r) { return H(r.name) + '(' + r.__total.toFixed(0) + ')'; }).join('、');
      html += '<tr><td><b>' + H(ln.name) + '</b></td><td>' + ln.total + '</td><td style="font-size:12px;color:var(--c-text-2)">' +
        lineSubsHtml(ln) + '</td>' +
        '<td class="best">' + hit.length + '</td><td>' + (hit.length / withRank.length * 100).toFixed(1) + '%</td>' +
        '<td style="font-size:12px;color:var(--c-text-2);max-width:300px">' +
        (names + (hit.length > 15 ? ' …共 ' + hit.length + ' 人' : '') || '—') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // 2. 各科上线对比（设置了单科线的科目）
    var subLines = {};
    lines.forEach(function (ln) {
      Object.keys(ln.subs || {}).forEach(function (s) {
        if (!subLines[s]) subLines[s] = [];
        subLines[s].push({ line: ln.name, v: ln.subs[s] });
      });
    });
    var subKeys = Object.keys(subLines);
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🔬 各科上线对比 <span class="extra">单科线达标情况（未设单科线可在分数线弹窗补充）</span></div>';
    if (!subKeys.length) {
      html += '<div class="empty">尚未为任何科目设置单科线。在「🎯 分数线设置」弹窗中填写单科线后，此处显示各科上线人数。</div>';
    } else {
      html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>科目</th><th>达标要求</th><th>达标人数</th><th>达标率</th></tr></thead><tbody>';
      subKeys.forEach(function (s) {
        var req = subLines[s].map(function (x) { return H(x.line) + '≥' + x.v; }).join('、');
        var hit = withRank.filter(function (r) {
          var v = parseFloat(r[s]);
          if (isNaN(v)) return false;
          return subLines[s].every(function (x) { return v >= x.v; });
        });
        html += '<tr><td style="font-weight:600">' + H(s) + '</td><td style="font-size:12px;color:var(--c-text-2)">' + req + '</td>' +
          '<td class="best">' + hit.length + '</td><td>' + (hit.length / withRank.length * 100).toFixed(1) + '%</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    // 3. 上线人数对比 + 命中率与贡献率（班级 × 线）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">📊 上线人数对比 / 命中率 / 贡献率 <span class="extra">命中率=本班上线/本班参考；贡献率=本班上线/全校上线</span></div>';
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>班级</th><th>参考</th>';
    lines.forEach(function (ln) { html += '<th>' + H(ln.name) + '<br><small>人数</small></th><th><small>命中率</small></th><th><small>贡献率</small></th>'; });
    html += '</tr></thead><tbody>';
    g.order.forEach(function (c) {
      var arr = g.groups[c];
      html += '<tr><td style="font-weight:600">' + H(c) + '</td><td>' + arr.length + '</td>';
      lines.forEach(function (ln) {
        var hit = arr.filter(function (r) { return linePass(r, ln); }).length;
        var totalHit = withRank.filter(function (r) { return linePass(r, ln); }).length;
        html += '<td class="best">' + hit + '</td>' +
          '<td>' + (hit / arr.length * 100).toFixed(0) + '%</td>' +
          '<td>' + (totalHit ? (hit / totalHit * 100).toFixed(0) + '%' : '—') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 4. 上线均分对比（班级 × 线）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">📈 上线均分对比 <span class="extra">各班上线学生的总分均分</span></div>';
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>班级</th>';
    lines.forEach(function (ln) { html += '<th>' + H(ln.name) + ' 上线均分</th>'; });
    html += '</tr></thead><tbody>';
    g.order.forEach(function (c) {
      var arr = g.groups[c];
      html += '<tr><td style="font-weight:600">' + H(c) + '</td>';
      lines.forEach(function (ln) {
        var hit = arr.filter(function (r) { return linePass(r, ln); });
        var avg = hit.length ? hit.reduce(function (a, r) { return a + r.__total; }, 0) / hit.length : null;
        html += '<td>' + (avg != null ? avg.toFixed(1) + '（' + hit.length + '人）' : '—') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 5. 临界生分析（距线 10 分内）
    html += '<div class="card" style="margin-top:12px"><div class="card-title">🚧 临界生分析 <span class="extra">总分低于线值 10 分内，最有望冲线</span></div>';
    lines.forEach(function (ln) {
      var crit = withRank.filter(function (r) {
        return r.__total < ln.total && r.__total >= ln.total - 10;
      }).sort(function (a, b) { return b.__total - a.__total; });
      html += '<div style="margin-bottom:8px"><b>' + H(ln.name) + '</b>（' + ln.total + ' 分）临界 ' + crit.length + ' 人：' +
        '<span style="font-size:12px;color:var(--c-text-2)">' +
        (crit.map(function (r) {
          return H(r.name) + '(' + r.__total.toFixed(0) + '分，差' + (ln.total - r.__total).toFixed(0) + ')';
        }).join('、') || '—') + '</span></div>';
    });
    html += '</div>';
    return html;
  }

  // ===== ⚖️ 学科均衡分析 =====
  function findImbalanced(withRank, subjects) {
    return withRank.filter(function (r, i) {
      if (i < Math.floor(withRank.length * 0.3) || i >= Math.floor(withRank.length * 0.7)) return false;
      var rankInClass = r.__rank;
      return subjects.some(function (s) {
        var v = parseFloat(r[s]);
        if (isNaN(v)) return false;
        var sorted = withRank.map(function (x) { return parseFloat(x[s]); }).sort(function (a, b) { return b - a; });
        var sRank = sorted.indexOf(v) + 1;
        return Math.abs(sRank - rankInClass) > 20;
      });
    });
  }
  function renderBalancePanel(withRank, subjects) {
    if (!withRank.length) return '';
    var html = '<div class="card" style="margin-top:12px"><div class="card-title">⚖️ 学科均衡分析 <span class="extra">各科均分 / 优秀率 / 及格率 / 离散度</span></div>';
    // 各科统计
    var rows = subjects.map(function (s) {
      var vals = withRank.map(function (r) { return parseFloat(r[s]); }).filter(function (v) { return !isNaN(v); });
      if (!vals.length) return null;
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
      var sd = Math.sqrt(vals.reduce(function (a, v) { return a + (v - avg) * (v - avg); }, 0) / vals.length);
      var good = vals.filter(function (v) { return v >= 90; }).length;
      var pass = vals.filter(function (v) { return v >= 60; }).length;
      return { s: s, avg: avg, mx: mx, mn: mn, sd: sd, good: good, pass: pass, n: vals.length };
    }).filter(Boolean);
    var maxAvg = Math.max.apply(null, rows.map(function (r) { return r.avg; })) || 1;
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr>' +
      '<th>科目</th><th>参考</th><th>均分</th><th>最高</th><th>最低</th><th>标准差</th><th>优秀率≥90</th><th>及格率</th><th>相对均衡</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var pct = Math.round(r.avg / maxAvg * 100);
      var color = r.avg === maxAvg ? 'var(--c-success)' : (r.avg / maxAvg > 0.9 ? 'var(--c-primary)' : 'var(--c-danger)');
      html += '<tr><td style="font-weight:600">' + H(r.s) + '</td><td>' + r.n + '</td>' +
        '<td class="best">' + r.avg.toFixed(1) + '</td><td>' + r.mx + '</td><td>' + r.mn + '</td>' +
        '<td>' + r.sd.toFixed(1) + '</td>' +
        '<td>' + (r.good / r.n * 100).toFixed(0) + '%（' + r.good + '）</td>' +
        '<td>' + (r.pass / r.n * 100).toFixed(0) + '%（' + r.pass + '）</td>' +
        '<td style="min-width:120px"><div class="ga-hist-chart" style="height:16px;gap:0;background:var(--c-bg);border-radius:4px;overflow:hidden">' +
        '<span class="ga-hist-bar" style="height:100%;width:' + pct + '%;max-width:none;background:' + color + '"></span></div>' +
        '<span style="font-size:10px;color:var(--c-text-3)">' + pct + '%</span></td></tr>';
    });
    html += '</tbody></table></div>';
    // 均衡度说明 + 最弱科
    var weakest = rows.slice().sort(function (a, b) { return a.avg - b.avg; })[0];
    var hardest = rows.slice().sort(function (a, b) { return a.sd - b.sd; })[0];
    var failTotal = rows.reduce(function (a, r) { return a + (r.n - r.pass); }, 0);
    html += '<div style="font-size:12px;color:var(--c-text-2);line-height:1.9;margin-top:10px">' +
      '📌 班级最弱科目：<b style="color:var(--c-danger)">' + H(weakest.s) + '</b>（均分 ' + weakest.avg.toFixed(1) + '，建议作为补弱重点）<br>' +
      '📌 两极分化最大科目：<b>' + H(hardest.s) + '</b>（标准差 ' + hardest.sd.toFixed(1) + '）' +
      (failTotal ? '；本次不及格共 <b style="color:var(--c-danger)">' + failTotal + '</b> 人次' : '') + '</div>';
    // 偏科学生
    var imbalanced = findImbalanced(withRank, subjects);
    html += '<div style="margin-top:10px"><b>⚠️ 偏科筛查（' + imbalanced.length + ' 人）</b>' +
      '<span style="font-size:12px;color:var(--c-text-2)">：总分中游且某科名次与总分名次相差 20 名以上</span><br>' +
      '<span style="font-size:12px;color:var(--c-text-2)">' +
      (imbalanced.map(function (r) { return H(r.name); }).join('、') || '—') + '</span></div>';
    html += '</div>';
    return html;
  }

  // ===== 📈 班级历次对比 =====
  function renderClassHistory() {
    var g = WB.state.grades;
    var withScores = (g.exams || []).filter(function (e) { return (g.scores[e.__id] || []).length > 0; });
    if (!withScores.length) return '<div class="empty">暂无成绩数据</div>';
    var classMap = getClassMap();
    var html = '<div class="card" style="margin-top:12px"><div class="card-title">📈 班级历次对比 <span class="extra">各批次 × 班级 总分均分与名次</span></div>';
    // 班级 × 批次 矩阵
    var classSet = {};
    withScores.forEach(function (ex) {
      var scores = g.scores[ex.__id] || [];
      var subs = (ex.subjects && ex.subjects.length) ? ex.subjects : getSubjectsFromScores(scores);
      var wr = computeWithRank(scores, subs);
      wr.forEach(function (r) {
        var c = classOfRow(r, classMap);
        if (!classSet[c]) classSet[c] = [];
      });
    });
    var classOrder = Object.keys(classSet);
    html += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>班级</th>';
    withScores.forEach(function (ex) {
      html += '<th>' + H((ex.icon || '📅') + ' ' + ex.name) + '<br><small>均分(班名次)</small></th>';
    });
    html += '<th>趋势</th></tr></thead><tbody>';
    if (classOrder.length <= 1) {
      // 单班：批次均分表
      html += '</tbody></table></div>';
      html += '<div class="table-wrap" style="margin-top:8px"><table class="data ga-matrix"><thead><tr>' +
        '<th>批次</th><th>参考</th><th>总分均分</th><th>最高</th><th>最低</th><th>较上次</th></tr></thead><tbody>';
      var prevAvg = null;
      withScores.forEach(function (ex) {
        var scores = g.scores[ex.__id] || [];
        var subs = (ex.subjects && ex.subjects.length) ? ex.subjects : getSubjectsFromScores(scores);
        var wr = computeWithRank(scores, subs);
        var avg = wr.reduce(function (a, r) { return a + r.__total; }, 0) / wr.length;
        var mx = Math.max.apply(null, wr.map(function (r) { return r.__total; }));
        var mn = Math.min.apply(null, wr.map(function (r) { return r.__total; }));
        var d = prevAvg != null ? avg - prevAvg : null;
        prevAvg = avg;
        html += '<tr><td style="font-weight:600">' + H(ex.name) + '</td><td>' + wr.length + '</td><td class="best">' + avg.toFixed(1) + '</td>' +
          '<td>' + mx.toFixed(1) + '</td><td>' + mn.toFixed(1) + '</td>' +
          '<td style="color:' + (d != null && d >= 0 ? 'var(--c-success)' : d != null ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
          (d != null ? (d >= 0 ? '+' : '') + d.toFixed(1) : '—') + '</td></tr>';
      });
      html += '</tbody></table></div>';
      html += '<div class="empty" style="margin-top:8px">仅一个班级：可在「全班花名册」为学生填写班级后查看多班历次对比</div>';
      html += '</div>';
      return html;
    }
    // 多班：每个班一行，列=批次均分+班名次
    classOrder.forEach(function (c) {
      html += '<tr><td style="font-weight:600">' + H(c) + '</td>';
      var prevRank = null, trend = '';
      withScores.forEach(function (ex) {
        var scores = g.scores[ex.__id] || [];
        var subs = (ex.subjects && ex.subjects.length) ? ex.subjects : getSubjectsFromScores(scores);
        var wr = computeWithRank(scores, subs);
        var cArr = wr.filter(function (r) { return classOfRow(r, classMap) === c; });
        if (!cArr.length) { html += '<td>—</td>'; return; }
        var avg = cArr.reduce(function (a, r) { return a + r.__total; }, 0) / cArr.length;
        var clsAvgs = classOrder.map(function (cc) {
          var a2 = wr.filter(function (r) { return classOfRow(r, classMap) === cc; });
          return a2.length ? a2.reduce(function (x, r) { return x + r.__total; }, 0) / a2.length : null;
        });
        var rank = clsAvgs.filter(function (v) { return v != null; }).sort(function (a, b) { return b - a; }).indexOf(avg) + 1;
        if (prevRank != null) trend += (rank < prevRank ? '↑' : rank > prevRank ? '↓' : '→');
        prevRank = rank;
        var best = Math.max.apply(null, clsAvgs.filter(function (v) { return v != null; }));
        html += '<td' + (avg === best ? ' class="best"' : '') + '>' + avg.toFixed(1) + '<br><small>第' + rank + '名</small></td>';
      });
      html += '<td style="color:var(--c-text-2);font-size:12px">' + (trend || '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    // 底部：批次均分汇总行
    html += '<div style="font-size:11px;color:var(--c-text-3);margin-top:6px">趋势：↑名次上升 ↓下降 →持平（每列一个字符，从左到右为各批次间变化）。下方为「多批次对比」明细。</div>';
    html += '</div>';
    return html;
  }

  // ===== 👤 学生报告 =====
  function renderReportPanel(withRank, subjects) {
    if (!withRank.length) return '<div class="empty">暂无成绩数据</div>';
    var opts = withRank.map(function (r) {
      return '<option value="' + H(r.name) + '">' + H(r.name) + '</option>';
    }).join('');
    var html = '<div class="card" style="margin-top:12px"><div class="card-title">👤 学生报告 <span class="extra">成绩明细 · 优势科目 · 薄弱科目 · 历次趋势 · 提升建议</span></div>';
    html += '<div class="ga-cmp-bar">' +
      '<select id="rp-select" class="ga-cmp-sel">' + opts + '</select>' +
      '<button class="btn btn-primary" data-act="rp-view">📄 查看报告</button>' +
      '<span style="font-size:11px;color:var(--c-text-3)">也可在「📋 学生成绩」表点学生姓名旁的 📄 报告</span>' +
      '</div></div>';
    return html;
  }
  function openStudentReport(name) {
    var g = WB.state.grades;
    var exam = g.exams.find(function (e) { return e.__id === g.currentExamId; });
    if (!exam) { WB.showToast('当前无考试批次'); return; }
    var scores = g.scores[g.currentExamId] || [];
    var subjects = (exam.subjects && exam.subjects.length) ? exam.subjects : getSubjectsFromScores(scores);
    var wr = computeWithRank(scores, subjects);
    var row = null;
    wr.forEach(function (r) { if (r.name === name && !row) row = r; });
    if (!row) { WB.showToast('未找到「' + name + '」的成绩'); return; }
    var classMap = getClassMap();
    var cls = classOfRow(row, classMap);

    var body = '<div class="rp-block" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<b style="font-size:16px">' + H(name) + '</b>' +
      '<span class="ga-exam-type">' + H(cls) + '</span>' +
      '<span class="tag ' + levelTag(row.__level) + '" style="padding:2px 10px;border-radius:10px;font-size:11px">' + row.__level + '</span>' +
      '</div>';

    // 本次成绩
    body += '<div class="rp-block"><div class="rp-title">📊 本次成绩 · ' + H(exam.name) + '</div>';
    body += '<div class="score-summary">' +
      summaryCell('总分', row.__total.toFixed(1)) +
      summaryCell('班级排名', row.__rank + ' / ' + wr.length) +
      summaryCell('参考科目', row.__count + ' 科') +
      '</div>';
    // 各科明细（分数/名次/班均分/差值）
    body += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>科目</th><th>分数</th><th>单科名次</th><th>班均分</th><th>差值</th></tr></thead><tbody>';
    subjects.forEach(function (s) {
      var v = parseFloat(row[s]);
      if (isNaN(v)) return;
      var rk = row['__rk_' + s] || '—';
      var all = wr.map(function (x) { return parseFloat(x[s]); }).filter(function (x) { return !isNaN(x); });
      var avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length;
      var d = v - avg;
      body += '<tr><td>' + H(s) + '</td><td class="best">' + v + '</td><td>' + rk + '</td>' +
        '<td>' + avg.toFixed(1) + '</td>' +
        '<td style="color:' + (d >= 0 ? 'var(--c-success)' : 'var(--c-danger)') + '">' + (d >= 0 ? '+' : '') + d.toFixed(1) + '</td></tr>';
    });
    body += '</tbody></table></div></div>';

    // 优势/薄弱科目（按超班均分排序）
    var diffs = subjects.map(function (s) {
      var v = parseFloat(row[s]);
      if (isNaN(v)) return null;
      var all = wr.map(function (x) { return parseFloat(x[s]); }).filter(function (x) { return !isNaN(x); });
      var avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length;
      return { s: s, d: v - avg, v: v };
    }).filter(Boolean).sort(function (a, b) { return b.d - a.d; });
    var adv = diffs.slice(0, 3);
    var weak = diffs.slice(-3).reverse();
    body += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:12px">' +
      '<div class="card" style="border-color:#a7f3d0;background:#f0fdf4"><div class="card-title" style="color:var(--c-success);margin-bottom:6px">💪 优势科目</div>' +
      '<div style="font-size:12px;line-height:1.9">' + adv.map(function (x) {
        return '<span class="rp-adv">' + H(x.s) + ' ' + x.v + '</span> <span style="color:var(--c-text-3)">(超均分' + (x.d >= 0 ? '+' : '') + x.d.toFixed(1) + ')</span>';
      }).join('<br>') + '</div></div>' +
      '<div class="card" style="border-color:#fecaca;background:#fef2f2"><div class="card-title" style="color:var(--c-danger);margin-bottom:6px">⚠️ 薄弱科目</div>' +
      '<div style="font-size:12px;line-height:1.9">' + weak.map(function (x) {
        return '<span class="rp-weak">' + H(x.s) + ' ' + x.v + '</span> <span style="color:var(--c-text-3)">(低于均分' + (x.d >= 0 ? '+' : '') + x.d.toFixed(1) + ')</span>';
      }).join('<br>') + '</div></div></div>';

    // 历次趋势
    var points = [];
    (g.exams || []).forEach(function (ex) {
      var sc = g.scores[ex.__id] || [];
      var ss = (ex.subjects && ex.subjects.length) ? ex.subjects : getSubjectsFromScores(sc);
      if (!ss.length) return;
      var w = computeWithRank(sc, ss);
      var r2 = null;
      w.forEach(function (x) { if (x.name === name && !r2) r2 = x; });
      if (r2) points.push({ exam: ex.name, icon: ex.icon || '📅', total: r2.__total, rank: r2.__rank });
    });
    if (points.length > 1) {
      body += '<div class="rp-block"><div class="rp-title">📈 历次趋势（' + points.length + ' 次考试）</div>';
      body += '<div class="table-wrap"><table class="data ga-matrix"><thead><tr><th>批次</th><th>总分</th><th>名次</th><th>总分变化</th><th>名次变化</th></tr></thead><tbody>';
      points.slice().reverse().forEach(function (p, i, arr2) {
        var prev = arr2[i + 1];
        var dT = prev ? p.total - prev.total : null;
        var dR = prev ? prev.rank - p.rank : null;
        body += '<tr><td>' + H(p.icon) + ' ' + H(p.exam) + '</td><td>' + p.total.toFixed(1) + '</td><td>' + p.rank + '</td>' +
          '<td style="color:' + (dT != null && dT >= 0 ? 'var(--c-success)' : dT != null ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
          (dT != null ? (dT >= 0 ? '+' : '') + dT.toFixed(1) : '—') + '</td>' +
          '<td style="color:' + (dR != null && dR > 0 ? 'var(--c-success)' : dR != null && dR < 0 ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
          (dR != null ? (dR > 0 ? '↑' + dR : dR < 0 ? '↓' + (-dR) : '—') : '—') + '</td></tr>';
      });
      body += '</tbody></table></div></div>';
    }

    // 提升建议
    var tips = [];
    if (row.__level === '尖子生') tips.push('保持优势科目稳定，重点突破薄弱科目，冲刺更高名次');
    else if (row.__level === '临界生') tips.push('当前处于临界区间，主抓薄弱科目基础分，是提分最快阶段');
    else if (row.__level === '学困生') tips.push('建议从基础题抓起，优先补足最低分科目，先及格再提升');
    else tips.push('保持现状稳步提升，建议每科稳定高于班级均分');
    if (weak.length) tips.push('重点补弱：' + weak[0].s + '（低于均分' + Math.abs(weak[0].d).toFixed(1) + '）');
    if (points.length >= 2) {
      var last = points[points.length - 1], first = points[0];
      tips.push(last.rank < first.rank ? '近 ' + points.length + ' 次考试名次总体上升，继续保持' :
        last.rank > first.rank ? '近 ' + points.length + ' 次考试名次总体下滑，建议调整学习节奏' : '名次总体平稳');
    }
    body += '<div class="card" style="border-color:#bfdbfe;background:#eff6ff"><div class="card-title" style="color:var(--c-primary);margin-bottom:6px">💡 提升建议</div>' +
      '<div style="font-size:12px;line-height:1.9;color:var(--c-text-2)">' + tips.map(function (t) { return '· ' + H(t); }).join('<br>') + '</div></div>';

    WB.openModal('📄 学生报告 · ' + H(name), body, [
      { text: '关闭', cls: 'btn btn-primary', act: 'close' }
    ]);
  }

  function bindGrades() {
    // 关键：必须先 rebindRoot（clone 替换 content 会丢失所有旧监听器），
    // 之后再绑定，否则上面所有直接绑定都会因元素被 clone 替换而失效
    var root = rebindRoot();

    // 顶部：新建考试、同步花名册、分数线设置（包一层避免 event 对象被当作批次 id 传入）
    el('g-new-exam').addEventListener('click', function () { openExamForm(null); });
    el('g-import-roster').addEventListener('click', syncRosterToCurrent);
    el('g-lines').addEventListener('click', openLinesForm);

    // 分析页签切换
    var gtabs = el('g-tabs2');
    if (gtabs) {
      gtabs.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-gtab]');
        if (!tab) return;
        WB.state.grades.gTab = tab.dataset.gtab;
        WB.saveState();
        renderGradesRefresh();
      });
    }

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

    // 多批次对比：切换对比批次
    ['g-cmp-a', 'g-cmp-b'].forEach(function (sid) {
      var s = el(sid);
      if (!s) return;
      s.addEventListener('change', function () {
        WB.state.grades[sid === 'g-cmp-a' ? 'cmpA' : 'cmpB'] = s.value;
        WB.saveState();
        renderGradesRefresh();
      });
    });

    // 直方图维度切换（走 root 的 data-act 委托）

    // 数据表格操作（content 级委托）
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
      } else if (act === 'import-scores') {
        openScoreImport();
      } else if (act === 'trend') {
        openTrendModal(btn.dataset.name);
      } else if (act === 'hist-sub') {
        GA_HIST_SUBJ = btn.dataset.sub || '__total';
        renderGradesRefresh();
      } else if (act === 'edit-score') {
        // withRank 是排序副本，按姓名回找原始行（修复排序后 idx 错位）
        var editScores = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
        var eIdx = -1;
        for (var i = 0; i < editScores.length; i++) {
          if (editScores[i].name === btn.dataset.name) { eIdx = i; break; }
        }
        openScoreForm(eIdx >= 0 ? eIdx : null);
      } else if (act === 'del-score') {
        if (confirm('确认删除该学生成绩？')) {
          var scores = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
          var dIdx = -1;
          for (var j = 0; j < scores.length; j++) {
            if (scores[j].name === btn.dataset.name) { dIdx = j; break; }
          }
          if (dIdx >= 0) scores.splice(dIdx, 1);
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
      } else if (act === 'top-dist') {
        WB.state.grades.topN = parseInt(btn.dataset.n, 10) || 10;
        WB.saveState();
        renderGradesRefresh();
      } else if (act === 'rp-view') {
        var sel = el('rp-select');
        if (sel && sel.value) openStudentReport(sel.value);
        else WB.showToast('请先选择学生');
      } else if (act === 'open-report') {
        openStudentReport(btn.dataset.name);
      }
    });
  }

  function renderGradesRefresh() {
    el('content').innerHTML = renderGrades();
    bindGrades();
  }

  // 考试类型（成绩模板中的分类）
  var EXAM_TYPES = ['限时练', '周测', '月考', '期中', '期末', '联考', '模拟考', '入学考', '竞赛', '其他'];
  // 预设科目（勾选即可）；不在列表中的科目走「其他科目」输入
  var PRESET_SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '体育', '信息技术'];

  function openExamForm(id) {
    var exam = null;
    if (id) exam = WB.state.grades.exams.find(function (e) { return e.__id === id; });
    var cur = exam ? (exam.subjects || []) : [];
    var selSet = {};
    cur.forEach(function (s) { selSet[s] = true; });
    var custom = cur.filter(function (s) { return PRESET_SUBJECTS.indexOf(s) < 0; });

    var body = '<div class="form-grid">' +
      '<label><span class="lbl required">考试名称</span>' +
        '<input id="e-name" value="' + H(exam ? exam.name : '') + '" placeholder="如 第3周周测 / 期中考试"></label>' +
      '<label><span class="lbl">考试类型</span>' +
        '<select id="e-type">' + EXAM_TYPES.map(function (t) {
          return '<option value="' + H(t) + '"' + ((exam ? (exam.type || '月考') : '月考') === t ? ' selected' : '') + '>' + H(t) + '</option>';
        }).join('') + '</select></label>' +
      '<label><span class="lbl">图标</span>' +
        '<input id="e-icon" value="' + H(exam ? exam.icon || '📅' : '📅') + '" placeholder="📅"></label>' +
      '<label class="full"><span class="lbl required">考试科目（点选勾选）</span>' +
        '<div class="ga-sub-list" id="e-subj-grid">' +
        PRESET_SUBJECTS.map(function (s) {
          return '<label class="ga-sub-item"><input type="checkbox" class="e-sj" data-sj="' + H(s) + '"' +
            (selSet[s] ? ' checked' : '') + '>' + H(s) + '</label>';
        }).join('') +
        '</div></label>' +
      '<label class="full"><span class="lbl">其他科目（逗号分隔，列表中没有的）</span>' +
        '<input id="e-subj-custom" value="' + H(custom.join(', ')) + '" placeholder="如 科学、社政、实验"></label>' +
      '<label class="full"><span class="lbl">备注</span>' +
        '<textarea id="e-note">' + H(exam ? (exam.note || '') : '') + '</textarea></label>' +
      '</div>';
    WB.openModal(id ? '编辑考试批次' : '新建考试批次', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return;
      var name = formEl.querySelector('#e-name').value.trim();
      if (!name) { WB.showToast('请填写考试名称'); return false; }
      // 勾选的预设科目 + 自定义科目，去重（预设顺序优先）
      var picked = [];
      formEl.querySelectorAll('.e-sj:checked').forEach(function (cb) { picked.push(cb.dataset.sj); });
      var customArr = formEl.querySelector('#e-subj-custom').value.split(/[,，、\s]+/).filter(Boolean);
      var seen = {}, subjects = [];
      picked.concat(customArr).forEach(function (s) {
        if (!seen[s]) { seen[s] = 1; subjects.push(s); }
      });
      if (subjects.length === 0) { WB.showToast('请至少勾选或填写一个科目'); return false; }
      var data = {
        name: name,
        type: formEl.querySelector('#e-type').value,
        icon: formEl.querySelector('#e-icon').value.trim() || '📅',
        subjects: subjects,
        note: formEl.querySelector('#e-note').value.trim()
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
      WB.showToast('已保存：' + subjects.length + ' 个科目');
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

  // ===== 成绩 Excel 批量导入 =====
  // 流程：选文件 → SheetJS 解析 → 列映射（姓名/学号/科目勾选）→ 预览 → 按姓名 upsert 到当前批次
  function openScoreImport() {
    var currentExamId = WB.state.grades.currentExamId;
    var exam = WB.state.grades.exams.find(function (e) { return e.__id === currentExamId; });
    if (!exam) { WB.showToast('当前无考试批次'); return; }
    if (window.WB_XLSX_STATE === 'loading' && (typeof XLSX === 'undefined' || !XLSX.read)) {
      WB.showToast('Excel 库仍在加载中，请稍候再试');
      return;
    }
    if (typeof XLSX === 'undefined' || !XLSX.read) {
      WB.openModal('Excel 库未加载',
        '<div style="font-size:13px;line-height:1.8;color:var(--c-text-2)">' +
        '📥 批量导入需要 SheetJS 库（CDN 与本地均不可用）。<br>' +
        '可稍后刷新重试，或使用「＋ 录入学生成绩」手动录入。</div>',
        [{ text: '知道了', cls: 'btn btn-primary', act: 'close' }]);
      return;
    }
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = function () {
      if (inp.files && inp.files[0]) parseScoreFile(inp.files[0], exam);
    };
    inp.click();
  }

  function parseScoreFile(file, exam) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['xlsx', 'xls', 'csv'].indexOf(ext) < 0) { WB.showToast('仅支持 .xlsx / .xls / .csv 文件'); return; }
    var isCsv = ext === 'csv';
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = isCsv ? XLSX.read(e.target.result, { type: 'string' })
                       : XLSX.read(e.target.result, { type: 'array' });
        var rows = [];
        // 取第一个有数据的工作表
        wb.SheetNames.some(function (nm) {
          var r = XLSX.utils.sheet_to_json(wb.Sheets[nm], { defval: '' });
          if (r.length) { rows = r; return true; }
          return false;
        });
        if (!rows.length) {
          WB.showToast('未解析到数据行，请确认第一行是表头（姓名/学号/各科目列）');
          return;
        }
        showScoreImport(file.name, rows, exam);
      } catch (err) {
        WB.showToast('解析失败：' + (err.message || err));
      }
    };
    reader.onerror = function () { WB.showToast('文件读取失败'); };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  // 列是否为数字主导（用于自动勾选科目列）
  function scoreIsNumericCol(rows, col) {
    var n = 0, c = 0;
    rows.slice(0, 20).forEach(function (r) {
      var v = r[col];
      if (v === '' || v == null) return;
      c++;
      if (!isNaN(parseFloat(v))) n++;
    });
    return c > 0 && n / c >= 0.5;
  }
  // 列名是否为总分类（不可作为科目导入）
  function scoreIsTotalCol(col) { return /总分|总成绩|总分数|合计/.test(String(col)); }

  function showScoreImport(fileName, rows, exam) {
    var columns = Object.keys(rows[0]);
    // 自动识别姓名/学号列
    var nameAuto = columns.find(function (c) { return /姓名|学生/.test(c); }) || columns[0];
    var noAuto = columns.find(function (c) { return /学号|考号|准考证/.test(c); }) || '';
    // 自动识别总分列（数字列且列名含"总分/合计"）
    var totalAuto = columns.find(function (c) {
      return c !== nameAuto && c !== noAuto && scoreIsTotalCol(c) && scoreIsNumericCol(rows, c);
    }) || '';

    function colOpts(sel, filter) {
      var list = columns.filter(filter || function () { return true; });
      return '<option value="">— 无 —</option>' + list.map(function (c) {
        return '<option value="' + H(c) + '"' + (c === sel ? ' selected' : '') + '>' + H(c) + '</option>';
      }).join('');
    }

    // 科目列勾选：排除姓名/学号/总分列；数字列或列名已在批次科目中 → 默认勾选
    var subHtml = '';
    columns.forEach(function (c) {
      if (c === nameAuto || c === noAuto || scoreIsTotalCol(c)) return;
      var isSub = scoreIsNumericCol(rows, c) || (exam.subjects || []).indexOf(c) >= 0;
      subHtml += '<label class="ga-sub-item"><input type="checkbox" class="si-subj" data-col="' + H(c) + '"' +
        (isSub ? ' checked' : '') + '>' + H(c) +
        '<small>' + (scoreIsNumericCol(rows, c) ? '' + rows.length + ' 行' : '非数字') + '</small></label>';
    });
    if (!subHtml) subHtml = '<div class="empty">没有可用的科目列</div>';

    // 预览表（前 10 行，全部列）
    var pv = '<table class="data"><thead><tr>' + columns.map(function (c) { return '<th>' + H(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.slice(0, 10).map(function (r) {
        return '<tr>' + columns.map(function (c) {
          var v = r[c];
          if (v && typeof v === 'object' && v.rich) v = v.rich.map(function (x) { return x.t; }).join('');
          return '<td>' + H(v == null ? '' : String(v)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';

    var body = '<div style="padding:10px 12px;background:var(--c-primary-bg);border-radius:6px;font-size:12px;color:var(--c-text-2);line-height:1.7;margin-bottom:12px">' +
      '📋 已解析：<strong>' + H(fileName) + '</strong>（' + rows.length + ' 行数据）<br>' +
      '· 按姓名匹配更新：已有成绩的学生更新分数，没有的新建<br>' +
      '· 勾选要导入的科目列；不在批次科目中的列会自动追加为新科目<br>' +
      '· <b>总分列</b>：选择后以导入总分为准（排名/统计直接使用）；不选则按各科目自动相加' +
      '</div>';
    body += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
      '<label style="flex:1;min-width:130px"><span class="lbl required">姓名列</span><select id="si-name" style="width:100%">' + colOpts(nameAuto) + '</select></label>' +
      '<label style="flex:1;min-width:120px"><span class="lbl">学号列</span><select id="si-no" style="width:100%">' + colOpts(noAuto) + '</select></label>' +
      '<label style="flex:1;min-width:150px"><span class="lbl">总分列</span><select id="si-total" style="width:100%">' +
      '<option value=""' + (totalAuto ? '' : ' selected') + '>— 不导入（按科目相加）</option>' +
      columns.filter(function (c) { return c !== nameAuto && scoreIsNumericCol(rows, c); }).map(function (c) {
        return '<option value="' + H(c) + '"' + (c === totalAuto ? ' selected' : '') + '>' + H(c) + '</option>';
      }).join('') +
      '</select></label>' +
      '</div>';
    body += '<div class="form-title" style="margin-bottom:6px">导入科目（勾选）</div>';
    body += '<div class="ga-sub-list">' + subHtml + '</div>';
    body += '<div class="form-title" style="margin:10px 0 6px">数据预览（前 10 行）</div>';
    body += '<div style="max-height:220px;overflow:auto;border:1px solid var(--c-border);border-radius:6px">' + pv + '</div>';

    WB.openModal('📥 导入成绩 · ' + H(exam.name), body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '导入', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return true;
      var nameCol = formEl.querySelector('#si-name').value;
      if (!nameCol) { WB.showToast('请选择姓名列'); return false; }
      var noCol = formEl.querySelector('#si-no').value;
      var totalCol = formEl.querySelector('#si-total').value; // 总分列：导入总分 or 留空按科目相加
      var subjCols = [];
      formEl.querySelectorAll('.si-subj:checked').forEach(function (cb) {
        subjCols.push(cb.dataset.col);
      });
      if (!subjCols.length) { WB.showToast('请至少勾选一个科目列'); return false; }

      var scores = WB.state.grades.scores[exam.__id] || [];
      var created = 0, updated = 0, skipped = 0;
      rows.forEach(function (row) {
        var name = String(row[nameCol] == null ? '' : row[nameCol]).trim();
        if (!name) { skipped++; return; }
        var noVal = noCol ? String(row[noCol] == null ? '' : row[noCol]).trim() : '';
        var totalVal = null;
        if (totalCol) {
          var tv = parseFloat(row[totalCol]);
          if (!isNaN(tv)) totalVal = tv;
        }
        var exist = null;
        scores.forEach(function (r) { if (r.name === name) { if (!exist) exist = r; } });
        if (exist) {
          if (noVal) exist.studentNo = noVal;
          subjCols.forEach(function (s) {
            var raw = row[s];
            var v = parseFloat(raw);
            if (raw === '' || raw == null || isNaN(v)) return; // 空值不覆盖已有分数
            exist[s] = v;
          });
          if (totalVal != null) exist.__totalImported = totalVal; // 导入总分，优先于科目相加
          updated++;
        } else {
          var data = { studentNo: noVal, name: name };
          subjCols.forEach(function (s) {
            var raw = row[s];
            var v = parseFloat(raw);
            data[s] = (raw === '' || raw == null || isNaN(v)) ? null : v;
          });
          if (totalVal != null) data.__totalImported = totalVal;
          scores.unshift(data);
          created++;
        }
      });
      // 追加新科目到批次
      subjCols.forEach(function (s) {
        if ((exam.subjects || []).indexOf(s) < 0) {
          exam.subjects = exam.subjects || [];
          exam.subjects.push(s);
        }
      });
      WB.state.grades.scores[exam.__id] = scores;
      WB.saveState();
      renderGradesRefresh();
      WB.showToast('导入完成：新建 ' + created + ' 人，更新 ' + updated + ' 人' +
        (skipped ? '，跳过 ' + skipped + ' 行（无姓名）' : ''));
      return true;
    });
  }

  // ===== 单科名次列 / 学生跨批次趋势 =====
  // 学生趋势弹窗：SVG 总分折线（跨全部批次），点上标注名次
  function openTrendModal(name) {
    var exams = WB.state.grades.exams || [];
    var points = [];
    exams.forEach(function (ex) {
      var scores = WB.state.grades.scores[ex.__id] || [];
      var subs = (ex.subjects && ex.subjects.length) ? ex.subjects : getSubjectsFromScores(scores);
      if (!subs.length) return;
      var wr = computeWithRank(scores, subs);
      var r = null;
      wr.forEach(function (x) { if (x.name === name && !r) r = x; });
      if (r) points.push({ exam: ex.name, icon: ex.icon || '📅', total: r.__total, rank: r.__rank });
    });
    if (points.length < 2) {
      WB.showToast('「' + name + '」不足 2 次有效成绩，暂无趋势');
      return;
    }

    // SVG 折线
    var W = 520, Hh = 230, padL = 44, padR = 16, padT = 26, padB = 42;
    var totals = points.map(function (p) { return p.total; });
    var vMin = Math.min.apply(null, totals), vMax = Math.max.apply(null, totals);
    var span = (vMax - vMin) || 10;
    var innerW = W - padL - padR, innerH = Hh - padT - padB;
    function px(i) { return padL + (points.length === 1 ? innerW / 2 : i * innerW / (points.length - 1)); }
    function py(v) { return padT + innerH - (v - vMin) / span * innerH; }
    var linePts = points.map(function (p, i) { return px(i).toFixed(1) + ',' + py(p.total).toFixed(1); }).join(' ');
    var svg = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" style="width:100%;max-width:' + W + 'px;background:#fff;border:1px solid var(--c-border);border-radius:8px">';
    // 网格 + Y 轴刻度（5 档）
    for (var g = 0; g <= 4; g++) {
      var gy = padT + innerH - g * innerH / 4;
      var gv = vMin + g * span / 4;
      svg += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="var(--c-border)" stroke-dasharray="3,3"/>';
      svg += '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--c-text-3)">' + gv.toFixed(0) + '</text>';
    }
    // 折线
    svg += '<polyline points="' + linePts + '" fill="none" stroke="var(--c-primary)" stroke-width="2.5" stroke-linejoin="round"/>';
    // 点 + 名次标注 + X 轴批次名
    points.forEach(function (p, i) {
      var x = px(i), y = py(p.total);
      var up = i > 0 && p.total >= points[i - 1].total;
      svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="' +
        (up ? 'var(--c-success)' : 'var(--c-danger)') + '" stroke="#fff" stroke-width="2"/>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--c-text-2)">#' + p.rank + '</text>';
      // X 轴：批次名（过长截断）+ 总分
      var label = p.exam.length > 6 ? p.exam.slice(0, 6) + '…' : p.exam;
      svg += '<text x="' + x.toFixed(1) + '" y="' + (Hh - 22) + '" text-anchor="middle" font-size="10" fill="var(--c-text-2)">' + H(label) + '</text>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="middle" font-size="10" font-weight="600" fill="var(--c-primary)">' + p.total.toFixed(0) + '</text>';
    });
    svg += '</svg>';

    // 明细表
    var rowsHtml = points.slice().reverse().map(function (p, i, arr2) {
      var prev = arr2[i + 1];
      var dRank = prev ? (prev.rank - p.rank) : 0; // >0 进步
      var dTotal = prev ? (p.total - prev.total) : 0;
      return '<tr><td>' + H(p.icon) + ' ' + H(p.exam) + '</td><td>' + p.total.toFixed(1) + '</td><td>' + p.rank + '</td>' +
        '<td style="color:' + (dTotal > 0 ? 'var(--c-success)' : dTotal < 0 ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
        (prev ? (dTotal > 0 ? '+' : '') + dTotal.toFixed(1) : '—') + '</td>' +
        '<td style="font-weight:600;color:' + (dRank > 0 ? 'var(--c-success)' : dRank < 0 ? 'var(--c-danger)' : 'var(--c-text-3)') + '">' +
        (prev ? (dRank > 0 ? '↑' + dRank : dRank < 0 ? '↓' + (-dRank) : '—') : '—') + '</td></tr>';
    }).join('');

    var body = '<div style="text-align:center;font-weight:600;font-size:15px;margin-bottom:10px">📈 ' + H(name) + ' · 成绩趋势（共 ' + points.length + ' 次考试）</div>';
    body += svg;
    body += '<div style="font-size:11px;color:var(--c-text-3);text-align:center;margin:6px 0 10px">折线为总分（趋势），点上标注班级名次</div>';
    body += '<div style="max-height:200px;overflow:auto;border:1px solid var(--c-border);border-radius:6px">' +
      '<table class="data"><thead><tr><th>批次</th><th>总分</th><th>名次</th><th>总分变化</th><th>名次变化</th></tr></thead><tbody>' +
      rowsHtml + '</tbody></table></div>';

    WB.openModal('成绩趋势 · ' + H(name), body, [
      { text: '关闭', cls: 'btn btn-primary', act: 'close' }
    ]);
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
    body += '<label><span class="lbl">总分（Excel导入）</span>' +
        '<input type="number" step="0.1" id="s-total" value="' +
        (row && row.__totalImported != null ? row.__totalImported : '') + '" placeholder="留空=按科目相加"></label>';
    body += '<label class="full"><span class="lbl">备注</span>' +
          '<textarea id="s-remark">' + H(rowRemark) + '</textarea></label>';
    body += '</div>';
    body += '<p style="font-size:11px;color:var(--c-text-3);margin-top:-4px">总分为空时按各科目相加计算；填入数值则以该总分参与排名与统计。</p>';

    WB.openModal('录入成绩 · ' + exam.name, body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return;
      var name = formEl.querySelector('#s-name').value.trim();
      if (!name) { WB.showToast('请填写姓名'); return false; }
      var data = {
        studentNo: formEl.querySelector('#s-no').value.trim(),
        name: name,
        remark: formEl.querySelector('#s-remark').value.trim()
      };
      subjects.forEach(function (s) {
        var v = formEl.querySelector('#s-sub-' + H(s)).value.trim();
        data[s] = v === '' ? null : parseFloat(v);
      });
      // 总分：填了值则以导入总分为准；留空 = 按科目相加（并清除旧的导入总分）
      var tv = formEl.querySelector('#s-total').value.trim();
      if (tv !== '') {
        var fv = parseFloat(tv);
        if (!isNaN(fv)) data.__totalImported = fv;
      }
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
    // 首列为考试类型（与成绩模板对齐），文件名也带类型
    var header = ['考试类型', '学号', '姓名'].concat(subjects, ['总分', '班级排名', '等级']);
    var lines = [header.map(WB.csvEscape).join(',')];
    withRank.forEach(function (r) {
      var row = [exam.type || ''].concat([r.studentNo || '', r.name])
        .concat(subjects.map(function (s) { return r[s] == null ? '' : r[s]; }))
        .concat([r.__total.toFixed(1), r.__rank, r.__level]);
      lines.push(row.map(WB.csvEscape).join(','));
    });
    var csv = '\uFEFF' + lines.join('\r\n');
    WB.downloadBlob(csv, (exam.type ? exam.type + '_' : '') + exam.name + '_成绩_' + WB.today() + '.csv', 'text/csv;charset=utf-8');
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
  // ============ 住宿床位画布 ============
  var DORM_PENDING = null; // 待分配学生（先点学生 chip，再点空床入住）

  // 布局数据懒初始化：state.dormLayout = { rooms: [{ __id, name, gender, beds, bedMode }], bedMode:'bunk'|'desk' }
  function dormRooms() {
    if (!WB.state.dormLayout) WB.state.dormLayout = { rooms: [], bedMode: 'bunk', oddIsTop: true };
    if (!Array.isArray(WB.state.dormLayout.rooms)) WB.state.dormLayout.rooms = [];
    return WB.state.dormLayout.rooms;
  }
  function dormRows() {
    if (!WB.state.tables.dorm) WB.state.tables.dorm = [];
    return WB.state.tables.dorm;
  }
  // 床位铺位模式：bunk=上下铺（默认），desk=上床下桌
  // oddIsTop=true 时奇数=上铺/上床，false 时奇数=下铺/下床
  function dormBedLevel(i) {
    var mode = WB.state.dormLayout && WB.state.dormLayout.bedMode;
    var oddTop = !(WB.state.dormLayout && WB.state.dormLayout.oddIsTop === false);
    if (mode === 'desk') return oddTop ? (i % 2 === 1 ? '上床' : '下桌') : (i % 2 === 1 ? '下桌' : '上床');
    return oddTop ? (i % 2 === 1 ? '上' : '下') : (i % 2 === 1 ? '下' : '上');
  }
  function dormBedNo(i) {
    var mode = WB.state.dormLayout && WB.state.dormLayout.bedMode;
    if (mode === 'desk') return i; // 上床下桌每床独立编号
    return Math.ceil(i / 2);
  }
  function dormRoomKey(name) { return String(name || '').replace(/\s+/g, '').toUpperCase(); }
  function dormRecInRoom(rec, room) { return dormRoomKey(rec.roomNo) === dormRoomKey(room.name); }

  // 记录关联花名册学生：优先 _sid，回退姓名匹配
  function dormRecStudent(rec) {
    var roster = WB.state.tables.roster || [];
    var stu = null;
    if (rec._sid) stu = roster.find(function (s) { return (s.__id || '') === rec._sid; });
    if (!stu && rec.name) stu = roster.find(function (s) { return s.name === rec.name; });
    return stu || null;
  }
  function dormRecGender(rec) { var s = dormRecStudent(rec); return s ? (s.gender || '') : ''; }
  // 待分配 = 无床位，或房间号未在布局中（孤儿记录）
  function dormIsUnassigned(r, rooms) {
    if (!r.roomNo || !parseInt(r.bedNo, 10)) return true;
    return !rooms.some(function (rm) { return dormRecInRoom(r, rm); });
  }

  // 从住宿表自动生成房间（房间号非空的记录按房号聚合）
  function dormAutoImport() {
    var rows = dormRows();
    var rooms = dormRooms();
    var exist = {};
    rooms.forEach(function (r) { exist[dormRoomKey(r.name)] = true; });
    var groups = {};
    rows.forEach(function (r) {
      if (!r.roomNo) return;
      var key = dormRoomKey(r.roomNo);
      if (exist[key] || groups[key]) { if (groups[key]) { var bn = parseInt(r.bedNo, 10) || 0; if (bn > groups[key].beds) groups[key].beds = bn; } return; }
      groups[key] = { name: r.roomNo, beds: 0, gc: {} };
      var bn = parseInt(r.bedNo, 10) || 0;
      if (bn > groups[key].beds) groups[key].beds = bn;
    });
    // 需要把性别也聚合（上面 groups[key] 只建一次，这里重扫）
    rows.forEach(function (r) {
      if (!r.roomNo) return;
      var g = groups[dormRoomKey(r.roomNo)];
      if (!g) return;
      var gg = dormRecGender(r);
      if (gg) g.gc[gg] = (g.gc[gg] || 0) + 1;
    });
    var added = 0;
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      var cnt = Object.keys(g.gc).reduce(function (a, x) { return a + g.gc[x]; }, 0);
      var beds = Math.max(g.beds, cnt, 4);
      if (beds % 2 === 1) beds++;
      beds = Math.min(beds, 12);
      var gs = Object.keys(g.gc);
      var gender = '混合';
      if (gs.length === 1 && (gs[0] === '男' || gs[0] === '女')) gender = gs[0];
      rooms.push({ __id: WB.uid(), name: g.name, gender: gender, beds: beds, bedMode: 'bunk' });
      exist[k] = true;
      added++;
    });
    if (added > 0) WB.saveState();
    return added;
  }

  // 同房间 roommate 互写（全量同步）
  function dormSyncAll() {
    var rows = dormRows();
    dormRooms().forEach(function (room) {
      var members = rows.filter(function (r) { return dormRecInRoom(r, room); });
      members.forEach(function (r) {
        r.roommate = members.filter(function (x) { return x !== r; })
          .map(function (x) { return x.name; }).join('、');
      });
    });
  }

  // 入住：学生分配到房间某床；同床已有学生自动腾出，学生旧床位自动迁移
  function dormAssign(room, bedNo, stu) {
    var rows = dormRows();
    if ((room.gender === '男' || room.gender === '女') && stu.gender && stu.gender !== room.gender) {
      WB.showToast(room.name + ' 是' + room.gender + '生宿舍，' + stu.name + ' 无法入住');
      return false;
    }
    var key = dormRoomKey(room.name);
    // 该床已有其他学生 → 腾床
    rows.forEach(function (r) {
      if (r.roomNo && dormRoomKey(r.roomNo) === key && String(parseInt(r.bedNo, 10)) === String(bedNo) && r.name !== stu.name) {
        r.roomNo = ''; r.bedNo = '';
      }
    });
    // 学生已有记录 → 换床；没有 → 新建
    var rec = null;
    rows.forEach(function (r) {
      if (stu.__id && r._sid === stu.__id) rec = r;
      else if (!rec && r.name === stu.name) rec = r;
    });
    if (rec) {
      rec.roomNo = room.name; rec.bedNo = String(bedNo);
      if (stu.__id) rec._sid = stu.__id;
    } else {
      rows.push({ __id: WB.uid(), name: stu.name, building: '', roomNo: room.name,
        bedNo: String(bedNo), roommate: '', guardianPhone: '', note: '', _sid: stu.__id || '' });
    }
    dormSyncAll();
    WB.saveState();
    return true;
  }

  function renderDormRoom(room, bedMap) {
    var key = dormRoomKey(room.name);
    var occ = 0;
    var beds = '';
    for (var i = 1; i <= room.beds; i++) {
      var rec = bedMap[key + '|' + i];
      if (rec) occ++;
      beds += '<div class="dorm-bed' + (rec ? ' occ' : ' empty') + '" data-room="' + room.__id + '" data-bed="' + i + '" title="' + H(room.name) + ' · ' + i + '号床">';
      beds += '<span class="dorm-bed-tag">' + dormBedNo(i) + dormBedLevel(i) + '</span>';
      if (rec) {
        var g = dormRecGender(rec);
        beds += '<span class="dorm-bed-name' + (g === '男' ? ' m' : g === '女' ? ' f' : '') + '">' + H(rec.name) + '</span>';
      } else {
        beds += '<span class="dorm-bed-plus">＋</span>';
      }
      beds += '</div>';
    }
    var full = occ >= room.beds;
    var modeTag = room.bedMode === 'desk' ? '上床下桌' : '上下铺';
    return '<div class="dorm-room">' +
      '<div class="dorm-room-head"><b>' + H(room.name) + '</b>' +
      '<span class="dorm-room-info' + (full ? ' full' : '') + '">' + (full ? '满员' : occ + '/' + room.beds) + ' · ' + modeTag + '</span>' +
      '<span class="dorm-room-ops">' +
      '<button class="dorm-op" data-edit-room="' + room.__id + '" title="编辑房间">✎</button>' +
      '<button class="dorm-op" data-del-room="' + room.__id + '" title="删除房间">🗑</button>' +
      '</span></div>' +
      '<div class="dorm-beds">' + beds + '</div></div>';
  }

  function renderDormCanvas() {
    var rooms = dormRooms();
    var rows = dormRows();
    // 首次进入：尝试从住宿表自动生成房间
    if (rooms.length === 0) dormAutoImport();

    // 床位占用表：roomKey|bedNo → 记录
    var bedMap = {};
    rows.forEach(function (r) {
      if (!r.roomNo) return;
      var bn = parseInt(r.bedNo, 10) || 0;
      if (bn > 0) bedMap[dormRoomKey(r.roomNo) + '|' + bn] = r;
    });

    var html = '<div class="card">';
    var bedMode = WB.state.dormLayout && WB.state.dormLayout.bedMode || 'bunk';
    var oddTop = !(WB.state.dormLayout && WB.state.dormLayout.oddIsTop === false);
    var modeLabel = bedMode === 'desk' ? '上床下桌' : '上下铺';
    var oddLabel = oddTop ? (bedMode === 'desk' ? '奇数=上床' : '奇数=上铺') : (bedMode === 'desk' ? '奇数=下桌' : '奇数=下铺');
    html += '<div class="card-title">🏠 住宿床位 · 画布视图 <span class="extra">' + modeLabel + ' · ' + oddLabel + '</span></div>';

    // 工具栏 + 统计
    var totalBeds = 0, occ = 0;
    rooms.forEach(function (rm) {
      totalBeds += rm.beds;
      for (var i = 1; i <= rm.beds; i++) if (bedMap[dormRoomKey(rm.name) + '|' + i]) occ++;
    });
    html += '<div class="dorm-toolbar">';
    html += '<button class="btn btn-sm" id="dm-add">＋ 添加房间</button>';
    html += '<button class="btn btn-sm" id="dm-batch" title="按起始房号批量生成多个房间">⧉ 批量建房</button>';
    html += '<button class="btn btn-sm" id="dm-roster" title="与花名册保持一致：新增新学生、移除已不在册的学生、校准姓名/电话">👥 同步花名册</button>';
    html += '<button class="btn btn-sm" id="dm-sync">🔄 从表格同步</button>';
    html += '<button class="btn btn-sm" id="dm-auto">⚡ 一键分配</button>';
    html += '<button class="btn btn-sm" id="dm-table" title="切回表格模式，可批量导入/编辑字段">📋 表格</button>';
    html += '<button class="btn btn-sm" id="dm-mode" title="切换上下铺/上床下桌">🔄 ' + (bedMode === 'desk' ? '上下铺' : '上床下桌') + '</button>';
    html += '<button class="btn btn-sm" id="dm-odd" title="切换奇数床是上铺还是下铺">🔀 奇数=' + (oddTop ? '上' : '下') + '</button>';
    html += '<div style="flex:1"></div>';
    html += '<span class="dorm-stat">🛏 ' + totalBeds + ' 床</span>';
    html += '<span class="dorm-stat ok">✅ 已住 ' + occ + '</span>';
    html += '<span class="dorm-stat empty-c">▢ 空 ' + (totalBeds - occ) + '</span>';
    html += '</div>';

    if (rooms.length === 0) {
      html += '<div class="empty" style="margin-top:12px">还没有房间。点击「＋ 添加房间」创建宿舍布局；若住宿表已录房间号，可点「从表格同步」自动生成。</div>';
    } else {
      ['男', '女', '混合'].forEach(function (g) {
        var list = rooms.filter(function (r) { return (r.gender || '混合') === g; });
        if (!list.length) return;
        html += '<div class="dorm-sec"><div class="dorm-sec-title">' +
          (g === '男' ? '👨 男生宿舍区' : g === '女' ? '👩 女生宿舍区' : '🌗 混合区') +
          '<span>' + list.length + ' 间 · ' + list.reduce(function (a, r) { return a + r.beds; }, 0) + ' 床</span></div>';
        html += '<div class="dorm-room-grid">';
        list.forEach(function (rm) { html += renderDormRoom(rm, bedMap); });
        html += '</div></div>';
      });
    }

    // 待分配住宿生
    var un = rows.filter(function (r) { return dormIsUnassigned(r, rooms); });
    var orphan = rows.filter(function (r) {
      return r.roomNo && parseInt(r.bedNo, 10) > 0 && !rooms.some(function (rm) { return dormRecInRoom(r, rm); });
    });
    html += '<div class="dorm-unassigned"><div class="dorm-sec-title">🧳 待分配住宿生 <span>' + un.length + ' 人</span></div>';
    if (orphan.length) {
      html += '<div class="dorm-orphan-tip">⚠ 有 ' + orphan.length + ' 人录入了房间号但房间未创建，点「从表格同步」可补建</div>';
    }
    if (un.length) {
      html += '<div class="dorm-pend-list">';
      un.forEach(function (r) {
        var g = dormRecGender(r);
        var dm = r._sid || ('n:' + r.name + ':' + (r.__id || ''));
        var on = DORM_PENDING === dm ? ' on' : '';
        html += '<span class="dorm-pend' + on + (g === '男' ? ' m' : g === '女' ? ' f' : '') + '" data-dm="' + H(dm) + '">' +
          H(r.name) + (g ? '<i>' + (g === '男' ? '♂' : '♀') + '</i>' : '') + '</span>';
      });
      html += '</div>';
      html += '<div class="dorm-pend-tip">' + (DORM_PENDING ? '已选中，点击空床位即可入住' : '点击学生后再点空床，或直接点空床从花名册选择') + '</div>';
    } else {
      html += '<div class="empty" style="padding:6px 0">' +
        (rows.length === 0
          ? '住宿名单为空，点击上方「👥 同步花名册」把全班学生加入待分配'
          : '全部住宿生均已安排床位 🎉') + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  // 空床选人入住（复用统一学生选择器，数据源花名册）
  function openDormBedPicker(room, bedNo) {
    WB.openStudentPicker(function (stu) {
      if (dormAssign(room, bedNo, stu)) {
        DORM_PENDING = null;
        renderDormRefresh();
        WB.showToast(stu.name + ' 已入住 ' + room.name + ' ' + bedNo + ' 号床');
      }
    }, { title: '入住 ' + room.name + ' · ' + bedNo + ' 号床' });
  }

  // 已占床：换人 / 移出 / 编辑档案
  function openDormBedEditor(room, bedNo, rec) {
    var body = '<div style="font-size:13px;margin-bottom:10px;color:var(--c-text-2)">' +
      '当前入住：<b style="color:var(--c-text)">' + H(rec.name) + '</b> · ' + H(room.name) + ' ' + bedNo + ' 号床' +
      (rec.roommate ? '<br><small>室友：' + H(rec.roommate) + '</small>' : '') + '</div>';
    WB.openModal('床位 · ' + H(room.name) + ' ' + bedNo + '号', body, [
      { text: '关闭', cls: 'btn', act: 'close' },
      { text: '编辑档案', cls: 'btn', act: 'edit' },
      { text: '换人', cls: 'btn', act: 'swap' },
      { text: '移出床位', cls: 'btn btn-danger', act: 'remove' }
    ], function (act) {
      if (act === 'edit') {
        var idx = dormRows().indexOf(rec);
        WB.openForm('dorm', idx >= 0 ? idx : null, function () { renderDormRefresh(); });
        return false; // 保留新打开的编辑表单
      }
      if (act === 'swap') {
        openDormBedPicker(room, bedNo);
        return true;
      }
      if (act === 'remove') {
        rec.roomNo = ''; rec.bedNo = '';
        dormSyncAll();
        WB.saveState();
        renderDormRefresh();
        WB.showToast(rec.name + ' 已移出床位，回到待分配列表');
      }
      return true;
    });
  }

  // 房间新增 / 编辑（改名同步记录、减床溢出学生回待分配）
  function openDormRoomEditor(roomId) {
    var rooms = dormRooms();
    var room = roomId ? rooms.find(function (r) { return r.__id === roomId; }) : null;
    var body = '';
    body += '<label><span class="lbl required">房间号</span><input id="dr-name" value="' + H(room ? room.name : '') + '" placeholder="如 A301 / 男生楼 302"></label>';
    var gs = ['男', '女', '混合'];
    body += '<label><span class="lbl">性别分区</span><select id="dr-gender">';
    gs.forEach(function (g) {
      body += '<option value="' + g + '"' + ((room ? (room.gender || '混合') : '男') === g ? ' selected' : '') + '>' +
        (g === '男' ? '男生宿舍' : g === '女' ? '女生宿舍' : '混合') + '</option>';
    });
    body += '</select></label>';
    body += '<label><span class="lbl">床位数（上下铺成对）</span><input id="dr-beds" type="number" min="2" max="12" value="' + (room ? room.beds : 4) + '"></label>';
    body += '<label><span class="lbl">铺位模式</span><select id="dr-mode">' +
      '<option value="bunk"' + ((room ? (room.bedMode || 'bunk') : 'bunk') === 'bunk' ? ' selected' : '') + '>上下铺</option>' +
      '<option value="desk"' + ((room ? (room.bedMode || 'bunk') : 'bunk') === 'desk' ? ' selected' : '') + '>上床下桌</option>' +
      '</select></label>';
    WB.openModal(room ? '编辑房间 · ' + H(room.name) : '添加房间', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: room ? '保存' : '创建', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return true;
      var name = formEl.querySelector('#dr-name').value.trim();
      var gender = formEl.querySelector('#dr-gender').value;
      var beds = parseInt(formEl.querySelector('#dr-beds').value, 10) || 4;
      beds = Math.max(2, Math.min(12, beds));
      if (!name) { WB.showToast('请填写房间号'); return false; }
      var dup = rooms.find(function (r) { return r !== room && dormRoomKey(r.name) === dormRoomKey(name); });
      if (dup) { WB.showToast('已存在同名房间：' + dup.name); return false; }
      var bedMode = formEl.querySelector('#dr-mode') ? formEl.querySelector('#dr-mode').value : 'bunk';
      var rows = dormRows();
      if (room) {
        var oldKey = dormRoomKey(room.name);
        room.name = name; room.gender = gender; room.beds = beds; room.bedMode = bedMode;
        if (oldKey !== dormRoomKey(name)) {
          rows.forEach(function (r) { if (r.roomNo && dormRoomKey(r.roomNo) === oldKey) r.roomNo = name; });
        }
        rows.forEach(function (r) {
          if (dormRecInRoom(r, room) && (parseInt(r.bedNo, 10) || 0) > beds) { r.roomNo = ''; r.bedNo = ''; }
        });
        WB.showToast('房间已更新：' + name, 'ok');
      } else {
        rooms.push({ __id: WB.uid(), name: name, gender: gender, beds: beds, bedMode: bedMode });
        WB.showToast('房间已创建：' + name, 'ok');
      }
      dormSyncAll();
      WB.saveState();
      renderDormRefresh();
      return true;
    });
  }

  function dormDeleteRoom(roomId) {
    var rooms = dormRooms();
    var room = rooms.find(function (r) { return r.__id === roomId; });
    if (!room) return;
    var members = dormRows().filter(function (r) { return dormRecInRoom(r, room); });
    if (!confirm('删除房间「' + room.name + '」？' +
      (members.length ? members.length + ' 名成员将回到待分配列表。' : ''))) return;
    members.forEach(function (r) { r.roomNo = ''; r.bedNo = ''; });
    WB.state.dormLayout.rooms = rooms.filter(function (r) { return r !== room; });
    dormSyncAll();
    WB.saveState();
    renderDormRefresh();
    WB.showToast('房间已删除');
  }

  // 从花名册同步住宿生：新增（花名册有、住宿无）+ 移除（花名册已无此人）+ 字段校准
  // 关联优先级：_sid（学号/唯一ID）> 姓名，避免改名后重复新增或误删
  function dormSyncRoster() {
    var roster = WB.getTable('roster') || [];
    if (!roster.length) { WB.showToast('花名册为空，请先在「学生档案库」录入'); return; }
    var rows = dormRows();

    // 花名册索引：_sid → 学生，姓名 → 学生（同名取首个）
    var bySid = {}, byName = {};
    roster.forEach(function (s) {
      var name = String(s.name || '').trim();
      if (s.__id) bySid[s.__id] = s;
      if (name && !byName[name]) byName[name] = s;
    });

    var usedSid = {};   // 已被某条住宿行占用的花名册 __id，防止多人匹配同一学生
    var toRemove = [];  // 花名册中已不存在的住宿行（含重复孤儿数据）
    var updated = 0;    // 校准条数

    rows.forEach(function (r) {
      var name = String(r.name || '').trim();
      var s = (r._sid && bySid[r._sid]) || (name && byName[name]) || null;
      if (!s) { toRemove.push(r); return; }
      var sid = s.__id || '';
      if (sid) {
        if (usedSid[sid]) { toRemove.push(r); return; } // 该学生已被别的行关联，本行是重复数据
        usedSid[sid] = true;
      }
      // 校准：姓名 / 关联ID / 联系电话
      var newName = String(s.name || '').trim();
      if (newName && newName !== name) { r.name = newName; updated++; }
      if (s.__id && r._sid !== s.__id) { r._sid = s.__id; updated++; }
      var phone = s.phone || '';
      if (phone && r.guardianPhone !== phone) { r.guardianPhone = phone; updated++; }
    });

    // 待新增：花名册中尚未被任何住宿行关联的学生
    var toAdd = [];
    roster.forEach(function (s) {
      var name = String(s.name || '').trim();
      if (!name) return;
      if (s.__id && usedSid[s.__id]) return;
      var dup = rows.some(function (r) {
        return toRemove.indexOf(r) < 0 && String(r.name || '').trim() === name;
      });
      if (dup) return;
      toAdd.push(s);
    });

    if (!toAdd.length && !toRemove.length && !updated) {
      WB.showToast('住宿名单已与花名册一致');
      return;
    }

    // 移除对象中已分配床位的人数（移除即释放床位，需明确提示）
    var occupied = toRemove.filter(function (r) { return r.roomNo && parseInt(r.bedNo, 10) > 0; });

    // 名单预览：折叠展示，便于核对是否误判
    function nameList(list) {
      if (!list.length) return '';
      var items = list.map(function (r) {
        var nm = H(String(r.name || '').trim() || '(未命名)');
        var bn = parseInt(r.bedNo, 10) || 0;
        var bed = (r.roomNo && bn > 0)
          ? '<i style="font-style:normal;color:#dc2626"> · ' + H(r.roomNo) + '-' + bn + '</i>' : '';
        return '<span style="display:inline-block;padding:1px 6px;margin:2px;border:1px solid var(--c-border);border-radius:4px;font-size:12px">' +
          nm + bed + '</span>';
      }).join('');
      return '<details style="margin-top:2px"><summary style="cursor:pointer;font-size:12px;color:var(--c-text-2)">查看名单</summary>' +
        '<div style="margin-top:4px">' + items + '</div></details>';
    }

    var body = '<div style="font-size:13px;line-height:1.9">' +
      '<div style="margin-bottom:6px">本次同步将执行以下操作：</div>' +
      '<div>➕ <b>新增 ' + toAdd.length + ' 人</b>（花名册有、住宿名单无）' + nameList(toAdd) + '</div>' +
      '<div style="margin-top:6px">➖ <b>移除 ' + toRemove.length + ' 人</b>（花名册已无此人）' +
      (occupied.length
        ? '<span style="color:#dc2626">，其中 ' + occupied.length + ' 人已占床位，移除后床位自动释放</span>'
        : '') + nameList(toRemove) + '</div>' +
      '<div style="margin-top:6px">🔧 <b>校准 ' + updated + ' 条</b>（姓名 / 关联 / 联系电话）</div>' +
      '<div style="font-size:11px;color:var(--c-text-3);margin-top:8px">' +
      '按学号（_sid）优先匹配，改名不会误删或重复新增。</div>' +
      '</div>';

    WB.openModal('🔄 同步花名册', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '确认同步', cls: 'btn btn-primary', act: 'ok' }
    ], function (act) {
      if (act !== 'ok') return true;
      toRemove.forEach(function (r) {
        var i = rows.indexOf(r);
        if (i >= 0) rows.splice(i, 1);
      });
      toAdd.forEach(function (s) {
        rows.push({ __id: WB.uid(), name: String(s.name || '').trim(), building: '', roomNo: '', bedNo: '',
          roommate: '', guardianPhone: s.phone || '', note: '', _sid: s.__id || '' });
      });
      dormSyncAll();
      WB.saveState();
      renderDormRefresh();
      WB.showToast('同步完成：新增 ' + toAdd.length + ' 人 · 移除 ' + toRemove.length + ' 人 · 校准 ' + updated + ' 条');
      return true;
    });
  }

  // 批量创建宿舍：起始房号 + 间数 + 性别 + 每间床数
  function openDormBatchCreate() {
    var body = '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<label style="flex:2;min-width:120px"><span class="lbl required">起始房号</span><input id="db-start" value="" placeholder="如 301"></label>' +
      '<label style="flex:1;min-width:80px"><span class="lbl required">间数</span><input id="db-count" type="number" min="1" max="30" value="4"></label>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' +
      '<label style="flex:1;min-width:100px"><span class="lbl">性别分区</span><select id="db-gender">' +
      '<option value="男">男生宿舍</option><option value="女">女生宿舍</option><option value="混合">混合</option>' +
      '</select></label>' +
      '<label style="flex:1;min-width:100px"><span class="lbl">每间床位数</span><input id="db-beds" type="number" min="2" max="12" value="4"></label>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' +
      '<label style="flex:1;min-width:100px"><span class="lbl">铺位模式</span><select id="db-mode">' +
      '<option value="bunk">上下铺</option><option value="desk">上床下桌</option>' +
      '</select></label>' +
      '</div>' +
      '<p style="font-size:11px;color:var(--c-text-3);margin-top:8px">示例：起始 301、间数 8 → 生成 301~308 共 8 间房（编号自动递增）。已存在的同名房间会跳过。</p>';

    WB.openModal('⧉ 批量创建宿舍', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '创建', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formEl) {
      if (act !== 'save') return true;
      var start = formEl.querySelector('#db-start').value.trim();
      var count = parseInt(formEl.querySelector('#db-count').value, 10) || 0;
      var gender = formEl.querySelector('#db-gender').value;
      var beds = parseInt(formEl.querySelector('#db-beds').value, 10) || 4;
      beds = Math.max(2, Math.min(12, beds));
      if (!start) { WB.showToast('请填写起始房号'); return false; }
      if (count <= 0) { WB.showToast('间数需大于 0'); return false; }

      var rooms = dormRooms();
      var existKeys = {};
      rooms.forEach(function (r) { existKeys[dormRoomKey(r.name)] = true; });

      // 房号递增：纯数字尾号递增；含字母前缀则只递增数字部分（A301 → A302…）
      var m = start.match(/^(\D*?)(\d+)$/);
      var prefix = m ? m[1] : '';
      var num = m ? parseInt(m[2], 10) : 1;
      var padLen = m ? m[2].length : 0;

      var bedMode = formEl.querySelector('#db-mode') ? formEl.querySelector('#db-mode').value : 'bunk';
      var created = 0, skipped = 0;
      for (var i = 0; i < count; i++) {
        var name = m ? prefix + String(num + i).padStart(padLen, '0') : start + '-' + (i + 1);
        if (existKeys[dormRoomKey(name)]) { skipped++; continue; }
        rooms.push({ __id: WB.uid(), name: name, gender: gender, beds: beds, bedMode: bedMode });
        existKeys[dormRoomKey(name)] = true;
        created++;
      }
      if (!created) { WB.showToast('没有创建任何房间（房号均已存在）'); return false; }
      WB.saveState();
      renderDormRefresh();
      WB.showToast('已创建 ' + created + ' 间宿舍' + (skipped ? '，跳过 ' + skipped + ' 间已存在' : ''));
      return true;
    });
  }

  // 一键分配：待分配学生按性别随机填入单性别区空床
  function dormAutoFill() {
    var rooms = dormRooms();
    var rows = dormRows();
    var un = rows.filter(function (r) { return dormIsUnassigned(r, rooms); });
    if (!un.length) { WB.showToast('没有待分配的住宿生'); return; }
    // 收集空床（仅男/女区参与一键分配，混合区不动）
    var free = [];
    rooms.forEach(function (rm) {
      if (rm.gender !== '男' && rm.gender !== '女') return;
      var key = dormRoomKey(rm.name);
      var used = {};
      rows.forEach(function (r) {
        if (r.roomNo && dormRoomKey(r.roomNo) === key) {
          var bn = parseInt(r.bedNo, 10) || 0;
          if (bn > 0) used[bn] = true;
        }
      });
      for (var i = 1; i <= rm.beds; i++) if (!used[i]) free.push({ room: rm, bedNo: i });
    });
    // 随机打散空床顺序
    for (var i = free.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = free[i]; free[i] = free[j]; free[j] = t;
    }
    var ok = 0, fail = 0;
    un.forEach(function (r) {
      var g = dormRecGender(r);
      var stu = dormRecStudent(r);
      var idx = -1;
      for (var k = 0; k < free.length; k++) {
        var fg = free[k].room.gender;
        if (fg === g || (!g && fg)) { idx = k; break; }
      }
      if (idx < 0) { fail++; return; }
      var f = free.splice(idx, 1)[0];
      r.roomNo = f.room.name; r.bedNo = String(f.bedNo);
      if (stu && stu.__id) r._sid = stu.__id;
      ok++;
    });
    dormSyncAll();
    WB.saveState();
    renderDormRefresh();
    WB.showToast('一键分配完成：入住 ' + ok + ' 人' +
      (fail ? '，' + fail + ' 人因性别不匹配或空床不足未分配' : ''));
  }

  function bindDormCanvas() {
    var root = rebindRoot();
    root.addEventListener('click', function (e) {
      // 待分配学生 chip：选中 → 点空床入住
      var pend = e.target.closest('.dorm-pend');
      if (pend) {
        DORM_PENDING = (DORM_PENDING === pend.dataset.dm) ? null : pend.dataset.dm;
        renderDormRefresh();
        return;
      }
      // 床位格
      var bed = e.target.closest('.dorm-bed');
      if (bed) {
        var room = dormRooms().find(function (r) { return r.__id === bed.dataset.room; });
        if (!room) return;
        var bedNo = parseInt(bed.dataset.bed, 10);
        var key = dormRoomKey(room.name);
        var rec = null;
        dormRows().forEach(function (r) {
          if (r.roomNo && dormRoomKey(r.roomNo) === key && String(parseInt(r.bedNo, 10) || 0) === String(bedNo)) rec = r;
        });
        if (!rec) {
          if (DORM_PENDING) {
            // 已选中待分配学生 → 直接入住
            var target = dormRows().find(function (r) { return (r._sid || ('n:' + r.name + ':' + (r.__id || ''))) === DORM_PENDING; });
            DORM_PENDING = null;
            var stu = target ? dormRecStudent(target) : null;
            if (stu && dormAssign(room, bedNo, stu)) {
              renderDormRefresh();
              WB.showToast(stu.name + ' 已入住 ' + room.name + ' ' + bedNo + ' 号床');
            } else renderDormRefresh();
          } else {
            openDormBedPicker(room, bedNo);
          }
        } else {
          openDormBedEditor(room, bedNo, rec);
        }
        return;
      }
      // 房间编辑 / 删除
      var eb = e.target.closest('[data-edit-room]');
      if (eb) { openDormRoomEditor(eb.dataset.editRoom); return; }
      var db = e.target.closest('[data-del-room]');
      if (db) { dormDeleteRoom(db.dataset.delRoom); return; }
    });
    el('dm-add') && el('dm-add').addEventListener('click', function () { openDormRoomEditor(null); });
    el('dm-batch') && el('dm-batch').addEventListener('click', openDormBatchCreate);
    el('dm-roster') && el('dm-roster').addEventListener('click', dormSyncRoster);
    el('dm-sync') && el('dm-sync').addEventListener('click', function () {
      var n = dormAutoImport();
      WB.showToast(n > 0 ? '已同步生成 ' + n + ' 个房间' : '没有发现可新增的房间');
      renderDormRefresh();
    });
    el('dm-auto') && el('dm-auto').addEventListener('click', dormAutoFill);
    el('dm-table') && el('dm-table').addEventListener('click', function () {
      WB.state.dormTableMode = true;
      WB.saveState();
      WB.render();
    });
    // 全局铺位模式切换
    var modeBtn = el('dm-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        var cur = WB.state.dormLayout && WB.state.dormLayout.bedMode || 'bunk';
        WB.state.dormLayout.bedMode = cur === 'bunk' ? 'desk' : 'bunk';
        WB.saveState();
        renderDormRefresh();
        WB.showToast('已切换为 ' + (WB.state.dormLayout.bedMode === 'desk' ? '上床下桌' : '上下铺'));
      });
    }
    var oddBtn = el('dm-odd');
    if (oddBtn) {
      oddBtn.addEventListener('click', function () {
        var cur = !(WB.state.dormLayout && WB.state.dormLayout.oddIsTop === false);
        WB.state.dormLayout.oddIsTop = !cur;
        WB.saveState();
        renderDormRefresh();
        WB.showToast('已切换：奇数 = ' + (WB.state.dormLayout.oddIsTop ? '上铺/上床' : '下铺/下桌'));
      });
    }
  }

  function renderDormRefresh() {
    el('content').innerHTML = renderDormCanvas();
    bindDormCanvas();
  }

  // ============ 作息时间表 ============
  // 数据模型：state.dailySchedule = { grades: [], periods: [{id, category, label, times:{grade:time}}] }
  var DS_DEFAULT = {
    grades: ['高三', '高二', '高一'],
    categories: ['上午', '中午', '下午', '晚上'],
    periods: [
      { id:'ds1', category:'上午', label:'起床', times:{} },
      { id:'ds2', category:'上午', label:'早操、早餐', times:{} },
      { id:'ds3', category:'上午', label:'预备（公寓锁门）', times:{} },
      { id:'ds4', category:'上午', label:'早读', times:{} },
      { id:'ds5', category:'上午', label:'第一节课', times:{} },
      { id:'ds6', category:'上午', label:'第二节课', times:{} },
      { id:'ds7', category:'上午', label:'大课间', times:{} },
      { id:'ds8', category:'上午', label:'第三节课', times:{} },
      { id:'ds9', category:'上午', label:'第四节课', times:{} },
      { id:'ds10', category:'上午', label:'第五节课', times:{} },
      { id:'ds11', category:'中午', label:'午餐', times:{} },
      { id:'ds12', category:'中午', label:'午休', times:{} },
      { id:'ds13', category:'下午', label:'预备', times:{} },
      { id:'ds14', category:'下午', label:'第一节课', times:{} },
      { id:'ds15', category:'下午', label:'第二节课', times:{} },
      { id:'ds16', category:'下午', label:'大课间', times:{} },
      { id:'ds17', category:'下午', label:'第三节课', times:{} },
      { id:'ds18', category:'下午', label:'第四节课', times:{} },
      { id:'ds19', category:'下午', label:'晚餐及体育活动', times:{} },
      { id:'ds20', category:'晚上', label:'预备', times:{} },
      { id:'ds21', category:'晚上', label:'第一节', times:{} },
      { id:'ds22', category:'晚上', label:'第二节', times:{} },
      { id:'ds23', category:'晚上', label:'大课间及加餐', times:{} },
      { id:'ds24', category:'晚上', label:'第三节', times:{} },
      { id:'ds25', category:'晚上', label:'洗漱', times:{} },
      { id:'ds26', category:'晚上', label:'公寓锁门', times:{} },
      { id:'ds27', category:'晚上', label:'公寓熄灯', times:{} }
    ]
  };
  // 预填示例数据（与截图一致）
  var DS_SAMPLE = {
    '高三': {
      'ds1':'6:30','ds2':'6:40-7:15','ds3':'7:15','ds4':'7:25-7:55',
      'ds5':'8:00-8:40','ds6':'8:50-9:30','ds7':'9:30-9:55','ds8':'9:55-10:35',
      'ds9':'10:45-11:25','ds10':'11:35-12:10',
      'ds13':'14:20','ds14':'14:30-15:10','ds15':'15:20-16:00','ds16':'16:00-16:20',
      'ds17':'16:20-17:00','ds18':'17:10-17:50','ds19':'17:50-18:50',
      'ds20':'18:50','ds21':'19:00-19:50','ds22':'20:00-20:50','ds23':'20:50-21:10',
      'ds24':'21:10-22:00','ds25':'22:00-22:20','ds26':'22:20','ds27':'22:20'
    },
    '高二': {
      'ds1':'','ds2':'6:40-7:15','ds3':'7:15','ds4':'7:25-7:55',
      'ds5':'8:00-8:40','ds6':'8:50-9:30','ds7':'9:30-9:55','ds8':'9:55-10:35',
      'ds9':'10:45-11:25','ds10':'11:35-12:20',
      'ds11':'12:10-13:00','ds12':'13:00-14:00（静校时间）',
      'ds13':'14:20','ds14':'14:30-15:10','ds15':'15:20-16:00','ds16':'16:00-16:20',
      'ds17':'16:20-17:00','ds18':'17:10-17:50','ds19':'17:50-18:50',
      'ds20':'18:50'
    },
    '高一': {
      'ds1':'','ds2':'','ds3':'','ds4':'',
      'ds5':'','ds6':'','ds7':'','ds8':'',
      'ds9':'','ds10':'11:35-12:30',
      'ds11':'','ds12':'',
      'ds13':'','ds14':'','ds15':'','ds16':'',
      'ds17':'','ds18':'','ds19':'',
      'ds20':'','ds21':'','ds22':'','ds23':'',
      'ds24':'','ds25':'','ds26':'','ds27':''
    }
  };

  function getDS() {
    if (!WB.state.dailySchedule) WB.state.dailySchedule = JSON.parse(JSON.stringify(DS_DEFAULT));
    // 迁移：旧数据无 sample 标记时自动填充示例
    var ds = WB.state.dailySchedule;
    if (!ds._sampled) {
      Object.keys(DS_SAMPLE).forEach(function(g){
        if(ds.grades.indexOf(g)>=0&&!ds.times) ds.periods.forEach(function(p){p.times[g]=DS_SAMPLE[g][p.id]||''});
      });
      ds._sampled=true;
    }
    return ds;
  }

  function renderDailySchedule() {
    var ds=getDS(),grades=ds.grades||[],cats=ds.categories||[],periods=ds.periods||[];
    var html='<div class="wb-page"><div class="wb-page-header">';
    html+='<h2>🕐 作息时间表</h2><p>自定义每日作息安排，支持多年级对比、导入导出、批量修改</p></div>';
    html+='<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
    html+='<button class="wb-btn wb-btn-primary" id="ds-add-period">➕ 添加节次</button>';
    html+='<button class="wb-btn" id="ds-add-cat">📂 添加午别</button>';
    html+='<button class="wb-btn" id="ds-edit-grades">🏫 编辑年级</button>';
    html+='<button class="wb-btn" id="ds-export">📤 导出</button>';
    html+='<button class="wb-btn" id="ds-import">📥 导入</button>';
    html+='<button class="wb-btn wb-btn-warn" id="ds-reset">🔄 重置模板</button>';
    html+='<label class="wb-btn" style="cursor:pointer">📥 批量修改字段<input type="file" id="ds-batch-file" accept=".xlsx,.xls,.csv" style="display:none"></label>';
    html+='</div>';

    // 表格
    html+='<div style="overflow-x:auto"><table class="wb-table ds-table" style="min-width:600px;border-collapse:collapse">';
    html+='<thead><tr><th style="width:60px">午别</th><th style="width:140px">节次</th>';
    grades.forEach(function(g){html+='<th style="min-width:100px">'+H(g)+'</th>'});
    html+='</tr></thead><tbody>';
    // 按午别分组渲染：避免同类别节次不相邻时 rowspan 计算错乱（新增节次常插到末尾）
    var byCat={},catOrder=[];
    periods.forEach(function(p){
      var cat=p.category||'';
      if(!byCat[cat]){byCat[cat]=[];catOrder.push(cat)}
      byCat[cat].push(p)
    });
    catOrder.forEach(function(cat){
      var list=byCat[cat];
      list.forEach(function(p,idx){
        if(idx===0)html+='<tr class="ds-cat-row"><td rowspan="'+list.length+'" class="ds-cat-cell">'+H(cat)+'</td><td>'+H(p.label)+'</td>';
        else html+='<tr><td>'+H(p.label)+'</td>';
        grades.forEach(function(g){html+='<td contenteditable="true" data-pid="'+p.id+'" data-g="'+H(g)+'" class="ds-time-cell">'+H((p.times||{})[g]||'')+'</td>'});
        html+='</tr>'
      })
    });
    if(!periods.length)html+='<tr><td colspan="'+(grades.length+2)+'" style="text-align:center;color:#94a3b8;padding:40px">暂无节次，点击「添加节次」开始</td></tr>';
    html+='</tbody></table></div>';
    // 隐藏的批量导入 file input
    html+='<input type="file" id="ds-import-file" accept=".xlsx,.xls,.csv" style="display:none">';
    html+='</div>';
    return html;
  }

  function bindDailySchedule() {
    var root=rebindRoot();
    // 单元格编辑
    root.addEventListener('blur',function(e){
      var cell=e.target.closest('.ds-time-cell');
      if(!cell)return;
      var pid=cell.dataset.pid,g=cell.dataset.g,val=cell.textContent.trim();
      var ds=getDS(),p=ds.periods.find(function(x){return x.id===pid});
      if(p){if(!p.times)p.times={};p.times[g]=val;WB.saveState()}
    },true);
    root.addEventListener('keydown',function(e){
      if(e.target.classList.contains('ds-time-cell')&&e.key==='Enter'){e.preventDefault();e.target.blur()}
    },true);
    // 工具栏按钮
    root.addEventListener('click',function(e){
      var id=e.target.id||e.target.closest('[id]')?.id;
      if(id==='ds-add-period')addDSPeriod();
      else if(id==='ds-add-cat')addDSCategory();
      else if(id==='ds-edit-grades')editDSGrades();
      else if(id==='ds-export')exportDailySchedule();
      else if(id==='ds-import')el('ds-import-file').click();
      else if(id==='ds-reset')resetDailySchedule();
    });
    // 导入文件
    el('ds-import-file').addEventListener('change',handleDSImport);
    // 批量修改
    el('ds-batch-file').addEventListener('change',handleDSBatch);
  }

  function addDSPeriod(){
    WB.openModal('添加节次','<div class="wb-form-group"><label>午别</label><select id="ds-new-cat">'+(getDS().categories||[]).map(function(c){return '<option value="'+c+'">'+H(c)+'</option>'}).join('')+'</select></div>'+
      '<div class="wb-form-group"><label>节次名称</label><input id="ds-new-label" class="wb-input" placeholder="如：第五节课"></div>',
      [{ text: '取消', cls: 'btn', act: 'close' }, { text: '添加', cls: 'btn btn-primary', act: 'save' }],
      function (act) {
        if (act !== 'save') return;
        var cat = el('ds-new-cat').value, label = el('ds-new-label').value.trim();
        if (!label) { WB.showToast('请输入节次名称'); return false; }
        var ds = getDS(); ds.periods.push({ id: 'ds' + Date.now(), category: cat, label: label, times: {} }); WB.saveState(); refreshDS();
      });
  }
  function addDSCategory(){
    WB.openModal('添加午别',      '<div class="wb-form-group"><label>午别名称</label><input id="ds-new-cat-name" class="wb-input" placeholder="如：凌晨"></div>',
      [{ text: '取消', cls: 'btn', act: 'close' }, { text: '添加', cls: 'btn btn-primary', act: 'save' }],
      function (act) {
        if (act !== 'save') return;
        var name = el('ds-new-cat-name').value.trim();
        if (!name) { WB.showToast('请输入名称'); return false; }
        var ds = getDS(); if (ds.categories.indexOf(name) < 0) ds.categories.push(name); WB.saveState(); refreshDS();
      });
  }
  function editDSGrades(){
    var ds=getDS(),current=ds.grades.join(', ');
    WB.openModal('编辑年级列','<div class="wb-form-group"><label>年级列表（逗号分隔）</label>'+
      '<textarea id="ds-grades-input" class="wb-input" rows="3" placeholder="如：高三,高二,高一,初三">'+H(current)+'</textarea>'+
      '<p style="font-size:11px;color:#64748b">修改年级后，原有时间数据会保留（删除的年级数据将被丢弃）</p></div>',
      [{ text: '取消', cls: 'btn', act: 'close' }, { text: '保存', cls: 'btn btn-primary', act: 'save' }],
      function (act) {
        if (act !== 'save') return;
        var val = el('ds-grades-input').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!val.length) { WB.showToast('至少保留一个年级'); return false; }
        var old=ds.grades;
        ds.grades=val;
        // 清理被删年级的时间数据
        ds.periods.forEach(function(p){if(p.times)old.forEach(function(g){if(val.indexOf(g)<0)delete p.times[g]})});
        WB.saveState();refreshDS()
      });
  }
  function resetDailySchedule(){
    if(!confirm('将重置为默认模板，当前所有自定义数据会被清空。是否继续？'))return;
    WB.state.dailySchedule=JSON.parse(JSON.stringify(DS_DEFAULT));WB.saveState();refreshDS();WB.showToast('已重置为默认模板')
  }
  function refreshDS(){el('content').innerHTML=renderDailySchedule();bindDailySchedule()}

  // ===== 导出 =====
  function exportDailySchedule(){
    var ds=getDS(),grades=ds.grades||[],periods=ds.periods||[];
    if(typeof XLSX!=='undefined'){
      var rows=[];
      // 表头
      var h=['午别','节次'];grades.forEach(function(g){h.push(g)});rows.push(h);
      // 数据
      periods.forEach(function(p){var r=[p.category,p.label];grades.forEach(function(g){r.push((p.times||{})[g]||'')});rows.push(r)});
      var ws=XLSX.utils.aoa_to_sheet(rows);
      ws['!cols']=[{wch:8},{wch:16}].concat(grades.map(function(){return{wch:18}}));
      var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'作息时间表');
      XLSX.writeFile(wb,'作息时间表_'+WB.today()+'.xlsx');
      WB.showToast('已导出 Excel');
      return;
    }
    // CSV 降级
    var csv='\uFEFF午别,节次,'+grades.join(',')+'\r\n';
    periods.forEach(function(p){csv+=p.category+','+p.label+','+grades.map(function(g){return csvEscape((p.times||{})[g]||'')}).join(',')+'\r\n'});
    WB.downloadBlob(csv,'作息时间表_'+WB.today()+'.csv','text/csv;charset=utf-8');
    WB.showToast('已导出 CSV')
  }

  // ===== 导入（完整替换或合并） =====
  function handleDSImport(e){
    var file=e.target.files[0];if(!file)return;
    e.target.value='';
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var wb=XLSX.read(ev.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var rows=XLSX.utils.sheet_to_json(ws,{header:1});
        if(!rows||rows.length<2){WB.showToast('文件内容为空');return}
        // 解析表头找年级列
        var header=rows[0];
        var gradeCols=[]; // {colIndex, gradeName}
        for(var ci=2;ci<header.length;ci++){var gn=String(header[ci]||'').trim();if(gn)gradeCols.push({i:ci,n:gn})}
        if(!gradeCols.length){WB.showToast('未找到年级列（表头从第3列起应为年级名）');return}
        // 询问模式
        WB.openModal('选择导入方式',
          '<div style="margin-bottom:10px">检测到 <b>'+gradeCols.length+'</b> 个年级列：'+gradeCols.map(function(c){return c.n}).join('、')+'</div>'+
          '<div style="display:flex;flex-direction:column;gap:6px">'+
          '<label style="cursor:pointer;padding:8px;border:1px solid #e2e8f0;border-radius:8px"><input type="radio" name="ds-mode" value="replace" checked style="margin-right:6px"> <b>完全替换</b>：清空当前数据，用文件内容重建</label>'+
          '<label style="cursor:pointer;padding:8px;border:1px solid #e2e8f0;border-radius:8px"><input type="radio" name="ds-mode" value="merge" style="margin-right:6px"> <b>智能合并</b>：按节次名匹配，只覆盖文件中非空单元格</label>'+
          '</div>',
          [{ text: '取消', cls: 'btn', act: 'close' }, { text: '开始导入', cls: 'btn btn-primary', act: 'save' }],
          function (act, body) {
            if (act !== 'save') return;
            var picked = body.querySelector('input[name="ds-mode"]:checked');
            var mode = picked ? picked.value : 'replace';
            var ds=getDS();
            if(mode==='replace'){
              ds.grades=gradeCols.map(function(c){return c.n});ds.periods=[];
            }
            for(var ri=1;ri<rows.length;ri++){
              var row=rows[ri];if(!row[0]&&!row[1])continue;
              var cat=String(row[0]||'').trim(),label=String(row[1]||'').trim();
              if(!label)continue;
              var p=null;
              if(mode==='merge'){
                p=ds.periods.find(function(x){return x.label===label&&x.category===cat});
                if(!p)p=ds.periods.find(function(x){return x.label===label})
              }
              if(!p){p={id:'ds'+Date.now()+'_'+ri,category:cat||'',label:label,times:{}};ds.periods.push(p)}
              if(!p.times)p.times={};
              gradeCols.forEach(function(gc){var v=String(row[gc.i]||'').trim();if(v)p.times[gc.n]=v});
            }
            // 补充缺失类别
            var newCats=[];ds.periods.forEach(function(p){if(p.category&&newCats.indexOf(p.category)<0)newCats.push(p.category)});
            ds.categories=newCats.length?newCats:(ds.categories||[]);
            WB.saveState();refreshDS();WB.showToast('导入成功（'+(mode==='replace'?'替换':'合并')+'模式，'+ds.periods.length+' 个节次）')
          }
        );
      }catch(err){WB.showToast('解析失败：'+err.message)}
    };
    reader.readAsArrayBuffer(file)
  }

  // ===== 批量修改（选字段导入） =====
  function handleDSBatch(e){
    var file=e.target.files[0];if(!file)return;
    e.target.value='';
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var wb=XLSX.read(ev.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var rows=XLSX.utils.sheet_to_json(ws,{header:1});
        if(!rows||rows.length<2){WB.showToast('文件内容为空');return}
        var header=rows[0];
        // 找出可映射的列：节次 + 年级时间列
        var colMap=[]; // {colIndex, field: 'label'|gradeName}
        for(var ci=0;ci<header.length;ci++){
          var hn=String(header[ci]||'').trim().toLowerCase();
          if(ci===1||hn.indexOf('节次')>=0||hn.indexOf('项目')>=0)colMap.push({i:ci,f:'label'});
          else if(ci>=2)colMap.push({i:ci,f:hn}) // 年级列
        }
        if(colMap.length<2){WB.showToast('文件格式不正确：至少需要「节次」和1个年级列');return}
        // 字段选择 UI
        var options=colMap.map(function(c,i){
          return '<label style="display:block;padding:4px 0;font-size:12px;cursor:pointer">'+
            '<input type="checkbox" value="'+i+'" checked style="margin-right:6px"> '+
            H(String(header[c.i]||''))+(c.f==='label'?' <span style="color:#64748b">(节次)</span>':' <span style="color:#64748b">(年级)</span>')+
            '</label>'
        }).join('');
        WB.openModal('批量修改 — 选择要导入的字段',
          '<p style="font-size:12px;color:#64748b;margin-bottom:8px">勾选需要更新的列，未勾选的列保持原值不变。按「节次」匹配行。</p>'+
          '<div style="max-height:300px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px">'+options+'</div>'+
          '<p style="font-size:11px;color:#94a3b8;margin-top:6px">预览：共 '+rows.length+' 行数据</p>',
          [{ text: '取消', cls: 'btn', act: 'close' }, { text: '开始更新', cls: 'btn btn-primary', act: 'save' }],
          function (act, body) {
            if (act !== 'save') return;
            var checked = [];
            body.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) { checked.push(parseInt(cb.value, 10)); });
            if (checked.length < 2) { WB.showToast('至少选择「节次」和1个年级列'); return false; }
            var selected=checked.map(function(i){return colMap[i]});
            var ds=getDS(),updated=0,added=0;
            for(var ri=1;ri<rows.length;ri++){
              var row=rows[ri];var labelVal='';selected.forEach(function(s){
                if(s.f==='label')labelVal=String(row[s.i]||'').trim()
              });
              if(!labelVal)continue;
              var p=ds.periods.find(function(x){return x.label===labelVal});
              if(!p){p={id:'ds'+Date.now()+'_'+ri,category:'',label:labelVal,times:{}};ds.periods.push(p);added++}
              if(!p.times)p.times={};
              selected.forEach(function(s){
                if(s.f!=='label'){var v=String(row[s.i]||'').trim();if(v){p.times[s.f]=v;updated++}}
              });
            }
            WB.saveState();refreshDS();
            WB.showToast('批量修改完成：更新 '+updated+' 个单元格'+(added?'，新增 '+added+' 个节次':''))
          }
        );
      }catch(err){WB.showToast('解析失败：'+err.message)}
    };
    reader.readAsArrayBuffer(file)
  }

  return {
    renderDashboard: renderDashboard,
    bindDashboard: bindDashboard,
    renderSchedule: renderSchedule,
    bindSchedule: bindSchedule,
    bindTeacherTable: bindTeacherTable,
    renderGrades: renderGrades,
    bindGrades: bindGrades,
    renderPoints: renderPoints,
    bindPoints: bindPoints,
    renderDutyWeekView: renderDutyWeekView,
    bindDutyWeekView: bindDutyWeekView,
    renderDormCanvas: renderDormCanvas,
    bindDormCanvas: bindDormCanvas,
    renderTodo: renderTodo,
    bindTodo: bindTodo,
    renderDailySchedule: renderDailySchedule,
    bindDailySchedule: bindDailySchedule
  };
})();
