/* 班主任工作台 - 特殊视图
 * 依赖顺序：class-workbench.js 已加载 window.WB
 */
window.WB_VIEWS = (function () {
  'use strict';
  var WB = window.WB;
  var H = WB.escapeHtml;

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

    // 主体两栏
    html += '<div class="dash-row">';

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

  function bindDashboard() {
    // 今日待办完成
    document.addEventListener('click', function (e) {
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
    }, { once: false });
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
      var active = (WB.state && false);
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
    var scores = WB.state.grades.scores[exam.__id] || [];
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
    var scores = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
    var subjects = (WB.state.grades.scores['_meta'] && WB.state.grades.scores['_meta'][WB.state.grades.currentExamId]) ||
                   getSubjectsFromScores(scores);
    html += '<div class="table-wrap"><div class="table-scroll"><table class="data"><thead><tr>';
    html += '<th>学号</th><th>姓名</th>';
    subjects.forEach(function (s) { html += '<th>' + H(s) + '</th>'; });
    html += '<th>总分</th><th>班级排名</th><th>等级</th><th>操作</th></tr></thead><tbody id="score-tbody">';

    if (scores.length === 0) {
      html += '<tr><td colspan="' + (subjects.length + 7) + '" class="empty">尚未录入成绩</td></tr>';
    } else {
      var withRank = computeWithRank(scores, subjects);
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
    var scores = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
    var subjects = getSubjectsFromScores(scores);
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

    // 数据表格操作
    var root = el('content');
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'edit-exam') openExamForm(btn.dataset.id);
      else if (act === 'del-exam') {
        if (confirm('确认删除该考试批次及其全部成绩？不可恢复。')) {
          delete WB.state.grades.scores[btn.dataset.id];
          delete WB.state.grades.scores['_meta'] && WB.state.grades.scores['_meta'] && delete WB.state.grades.scores['_meta'][btn.dataset.id];
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
    var subjects = exam.subjects || [];

    var body = '<div class="form-grid">';
    body += '<label><span class="lbl">学号</span>' +
      '<input id="s-no" value="' + H(row ? row.studentNo : '') + '"></label>';
    body += '<label><span class="lbl required">姓名</span>' +
      '<input id="s-name" value="' + H(row ? row.name : '') + '" placeholder="请输入姓名"></label>';
    subjects.forEach(function (s) {
      body += '<label><span class="lbl">' + H(s) + '</span>' +
          '<input type="number" step="0.1" id="s-sub-' + H(s) + '" value="' +
          (rowLikeVal(s) || '') + '"></label>';
    });
    body += '<label class="full"><span class="lbl">备注</span>' +
          '<textarea id="s-remark">' + (rowRemark || '') + '</textarea></label>';
    body += '</div>';

    WB.openModal('录入成绩 · ' + currentExamName, body, [
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

    function rowLikeVal(s) {
      var r = WB.state.grades.scores[WB.state.grades.currentExamId] || [];
      var idx = parseInt(btn.dataset.idx, 10);
      var row = r[idx];
      return row && row[s] != null ? row[s] : '';
    }
    var rowRemark = '';
    var row = null;
    if (idx != null) {
      row = WB.state.grades.scores[WB.state.grades.currentExamId][idx];
      rowRemark = row ? (row.remark || '') : '';
    }
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
    var text = document.querySelector('.card-title:has(> * )') &&
      Array.from(document.querySelectorAll('.card')).find(function (c) {
        return c.querySelector('.card-title') && c.querySelector('.card-title').textContent.indexOf('学情小结') >= 0;
      });
    if (text) {
      var t = text.innerText;
      navigator.clipboard && navigator.clipboard.writeText(t).then(function () {
        WB.showToast('已复制到剪贴板');
      }, function () {
        WB.showToast('复制失败');
      });
    }
  }

  // ============ 暴露 ============
  return {
    renderDashboard: renderDashboard,
    bindDashboard: bindDashboard,
    renderGrades: renderGrades,
    bindGrades: bindGrades,
    renderTodo: renderTodo,
    bindTodo: bindTodo
  };
})();
