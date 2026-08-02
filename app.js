(function () {
  'use strict';

  // ===== 配置 =====
  var CONFIG_KEY = 'lx_workbench_supabase';
  var DEFAULT_CONFIG = {
    url: 'https://uvclcbuinqtyooupeqlr.supabase.co',
    key: 'sb_publishable__-gEFeyZu9EFcQiHN0MVcg_vrYJ8jT1'
  };

  function getConfig() {
    try {
      var saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      if (saved.url && saved.key) return saved;
      return DEFAULT_CONFIG;
    } catch (e) { return DEFAULT_CONFIG; }
  }
  function saveConfig(url, key) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url, key: key }));
  }

  var config = getConfig();
  var sb = null;

  // 表名映射
  var TABLES = {
    goals: 'goals', life_quests: 'life_quests', books: 'books',
    daily_tasks: 'daily_tasks', inbox_tasks: 'inbox_tasks',
    projects: 'projects', important_dates: 'important_dates',
    reading_logs: 'reading_logs', book_notes: 'book_notes',
    reflections: 'reflections', inspiration: 'inspiration'
  };

  // 状态标签
  var STATUS_LABELS = {
    active: { text: '进行中', cls: 'badge-active' },
    completed: { text: '已完成', cls: 'badge-completed' },
    paused: { text: '暂停', cls: 'badge-paused' },
    want: { text: '想读', cls: 'badge-want' },
    reading: { text: '在读', cls: 'badge-reading' },
    done: { text: '已读', cls: 'badge-done' },
    todo: { text: '待办', cls: 'badge-todo' },
    low: { text: '低', cls: 'badge-low' },
    medium: { text: '中', cls: 'badge-medium' },
    high: { text: '高', cls: 'badge-high' },
    yearly: { text: '年度', cls: 'badge-yearly' },
    quarterly: { text: '季度', cls: 'badge-quarterly' },
    monthly: { text: '月度', cls: 'badge-monthly' },
    work: { text: '工作', cls: 'badge-work' },
    daily: { text: '日常', cls: 'badge-daily' }
  };

  var MOOD_EMOJIS = {
    happy: '😊', thinking: '🤔', relaxed: '😌',
    mindblown: '🤯', sleepy: '😴', moved: '😢'
  };
  var MOOD_LABELS = {
    happy: '开心', thinking: '思考', relaxed: '放松',
    mindblown: '震撼', sleepy: '困了', moved: '感动'
  };
  var NOTE_TYPE_LABELS = { excerpt: '摘抄', summary: '总结', insight: '感悟' };

  // 表单字段定义
  var SCHEMAS = {
    goals: [
      { key: 'title', label: '目标', type: 'text', required: true },
      { key: 'type', label: '类型', type: 'select', options: ['yearly', 'quarterly', 'monthly'], def: 'yearly' },
      { key: 'progress', label: '进度 (%)', type: 'number', def: 0, min: 0, max: 100 },
      { key: 'status', label: '状态', type: 'select', options: ['active', 'completed'], def: 'active' },
      { key: 'target_date', label: '目标日期', type: 'date' }
    ],
    life_quests: [
      { key: 'title', label: '支线名称', type: 'text', required: true },
      { key: 'category', label: '分类', type: 'text', ph: '如：学习、技能、健康' },
      { key: 'progress', label: '进度 (%)', type: 'number', def: 0, min: 0, max: 100 },
      { key: 'status', label: '状态', type: 'select', options: ['active', 'paused', 'completed'], def: 'active' },
      { key: 'target_date', label: '目标日期', type: 'date' }
    ],
    daily_tasks: [
      { key: 'title', label: '任务', type: 'text', required: true },
      { key: 'task_type', label: '类型', type: 'select', options: ['daily', 'weekly'], def: 'daily' },
      { key: 'due_date', label: '截止日期', type: 'date', def: 'today' },
      { key: 'due_time', label: '截止时间', type: 'time' },
      { key: 'priority', label: '优先级', type: 'select', options: ['low', 'medium', 'high'], def: 'medium' },
      { key: 'status', label: '状态', type: 'select', options: ['todo', 'done'], def: 'todo' }
    ],
    inbox_tasks: [
      { key: 'title', label: '内容', type: 'text', required: true }
    ],
    projects: [
      { key: 'name', label: '项目名称', type: 'text', required: true },
      { key: 'status', label: '状态', type: 'select', options: ['active', 'paused', 'completed'], def: 'active' },
      { key: 'progress', label: '进度 (%)', type: 'number', def: 0, min: 0, max: 100 },
      { key: 'blocker_type', label: '卡点类型', type: 'select', options: ['work', 'daily'], def: 'work' },
      { key: 'blockers', label: '卡点 (每行一个)', type: 'textarea' },
      { key: 'solution', label: '解决方案', type: 'textarea' },
      { key: 'materials', label: '物料 / 备注', type: 'textarea' }
    ],
    important_dates: [
      { key: 'title', label: '事件', type: 'text', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'type', label: '类型', type: 'select', options: ['birthday', 'anniversary', 'deadline', 'other'], def: 'other' },
      { key: 'recurring', label: '每年重复', type: 'checkbox' }
    ]
  };

  // 数据状态
  var state = {
    goals: [], life_quests: [], books: [], daily_tasks: [],
    inbox_tasks: [], projects: [], important_dates: [],
    reading_logs: [], book_notes: [], reflections: [], inspiration: []
  };

  // 当前选中的状态
  var currentGoalType = 'yearly';
  var currentBookFilter = 'all';
  var selectedMood = '';
  var currentBookEdit = { id: null, isNew: true };
  var inspFilterCat = 'all';
  var inspFilterRegion = 'all';
  var inspSearch = '';

  // ===== 工具函数 =====
  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }
  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function showToast(msg, type) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast' + (type ? ' ' + type : '');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.add('hidden'); }, 2500);
  }

  function badge(status) {
    var info = STATUS_LABELS[status];
    if (!info) return '';
    return '<span class="badge ' + info.cls + '">' + info.text + '</span>';
  }

  function bookTitle(id) {
    var b = state.books.find(function (x) { return x.id === id; });
    return b ? b.title : '未知书籍';
  }

  // ===== 路由 =====
  var navItems = document.querySelectorAll('.nav-item');
  var views = document.querySelectorAll('.view');

  function switchView(viewName) {
    navItems.forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    views.forEach(function (view) {
      view.classList.toggle('active', view.id === 'view-' + viewName);
    });
    if (location.hash !== '#' + viewName) {
      history.replaceState(null, '', '#' + viewName);
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });
  initInspirationFilters();

  var initialView = location.hash.slice(1) || 'dashboard';
  switchView(initialView);

  window.addEventListener('hashchange', function () {
    var v = location.hash.slice(1);
    if (v) switchView(v);
  });

  // ===== 时钟 + 日期 =====
  var weekdaysZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function updateTime() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var el = document.getElementById('now-time');
    if (el) el.textContent = timeStr;
  }
  setInterval(updateTime, 1000);
  updateTime();

  function updateDate() {
    var now = new Date();
    var year = now.getFullYear();
    var weekdayZh = weekdaysZh[now.getDay()];
    var weekdayEn = weekdaysEn[now.getDay()];
    var monthEn = now.toLocaleDateString('en-US', { month: 'long' });
    var monthZh = now.toLocaleDateString('zh-CN', { month: 'long' });
    var day = now.getDate();
    // 仪表盘新版标题
    var dm = document.getElementById('dash-month');
    if (dm) dm.textContent = monthZh + ' · ' + year;
    var de = document.getElementById('dash-date-en');
    if (de) de.textContent = weekdayEn + ', ' + monthEn + ' ' + day;
    var dg = document.getElementById('dash-greet');
    if (dg) {
      var h = now.getHours();
      var greet = h < 6 ? '深夜好' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : h < 22 ? '晚上好' : '夜深了';
      dg.textContent = greet + ', xu';
    }
    // 兼容旧 view-date（其他页面可能还在用）
    var dateEl = document.getElementById('view-date');
    if (dateEl) {
      dateEl.innerHTML = year + ' &middot; ' + weekdayZh +
        '<span class="date-en">' + weekdayEn + ', ' + monthEn + ' ' + day + '</span>';
    }
    var pillEl = document.getElementById('today-pill');
    if (pillEl) pillEl.textContent = '今天是 ' + weekdayZh;
  }
  updateDate();

  // ===== Supabase =====
  function loadSupabaseSDK() {
    return new Promise(function (resolve, reject) {
      if (window.supabase) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('SDK load failed')); };
      document.head.appendChild(s);
    });
  }

  function updateConnStatus(connected, errMsg) {
    var el = document.getElementById('conn-status');
    if (!el) return;
    var dot = el.querySelector('.conn-dot');
    var text = el.querySelector('.conn-text');
    if (connected) { dot.className = 'conn-dot conn-dot-on'; text.textContent = '已同步'; }
    else if (errMsg) { dot.className = 'conn-dot conn-dot-err'; text.textContent = '连接失败'; }
    else { dot.className = 'conn-dot conn-dot-off'; text.textContent = '未连接'; }
  }

  async function initSupabase() {
    if (!config.url || !config.key) { updateConnStatus(false); return; }
    try {
      await loadSupabaseSDK();
      sb = window.supabase.createClient(config.url, config.key);
      updateConnStatus(true);
      await loadAllData();
      subscribeToChanges();
    } catch (err) {
      console.error('Supabase init failed:', err);
      updateConnStatus(false, err.message);
    }
  }

  // ===== CRUD =====
  async function fetchAll(table) {
    if (!sb) return [];
    var result = await sb.from(table).select('*').order('created_at', { ascending: false });
    if (result.error) { console.error('Fetch error:', table, result.error); return []; }
    return result.data || [];
  }
  async function insertRow(table, row) {
    if (!sb) return null;
    var result = await sb.from(table).insert(row).select().single();
    if (result.error) { console.error('Insert error:', table, result.error); showToast('添加失败: ' + result.error.message, 'error'); return null; }
    return result.data;
  }
  async function updateRow(table, id, updates) {
    if (!sb) return null;
    var result = await sb.from(table).update(updates).eq('id', id).select().single();
    if (result.error) { console.error('Update error:', table, result.error); showToast('更新失败: ' + result.error.message, 'error'); return null; }
    return result.data;
  }
  async function deleteRow(table, id) {
    if (!sb) return;
    var result = await sb.from(table).delete().eq('id', id);
    if (result.error) { console.error('Delete error:', table, result.error); showToast('删除失败: ' + result.error.message, 'error'); }
  }

  // ===== 加载数据 =====
  async function loadAllData() {
    var results = await Promise.all([
      fetchAll('goals'), fetchAll('life_quests'), fetchAll('books'),
      fetchAll('daily_tasks'), fetchAll('inbox_tasks'), fetchAll('projects'),
      fetchAll('important_dates'), fetchAll('reading_logs'), fetchAll('book_notes'),
      fetchAll('reflections'), fetchAll('inspiration')
    ]);
    state.goals = results[0]; state.life_quests = results[1]; state.books = results[2];
    state.daily_tasks = results[3]; state.inbox_tasks = results[4]; state.projects = results[5];
    state.important_dates = results[6]; state.reading_logs = results[7]; state.book_notes = results[8];
    state.reflections = results[9]; state.inspiration = results[10];
    renderAll();
    fetchWeather();
    startReminderLoop();
  }

  // ===== 实时同步 =====
  function subscribeToChanges() {
    if (!sb) return;
    var stateKeyMap = {};
    Object.keys(TABLES).forEach(function (k) { stateKeyMap[TABLES[k]] = k; });

    sb.channel('workbench-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, function (payload) {
        var table = payload.table;
        var stateKey = stateKeyMap[table];
        if (!stateKey) return;
        var eventType = payload.eventType;
        var newRow = payload.new;
        var oldRow = payload.old;

        if (eventType === 'INSERT' && newRow) {
          var exists = state[stateKey].some(function (r) { return r.id === newRow.id; });
          if (!exists) state[stateKey].unshift(newRow);
        } else if (eventType === 'UPDATE' && newRow) {
          var idx = state[stateKey].findIndex(function (r) { return r.id === newRow.id; });
          if (idx >= 0) state[stateKey][idx] = newRow; else state[stateKey].unshift(newRow);
        } else if (eventType === 'DELETE' && oldRow) {
          state[stateKey] = state[stateKey].filter(function (r) { return r.id !== oldRow.id; });
        }
        renderAll();
      })
      .subscribe();
  }

  // ===== 渲染 =====
  function renderAll() {
    renderDashboard();
    renderGoals();
    renderList('life_quests', 'life-quests-list');
    renderBookshelf();
    renderReadingLogs();
    renderBookNotes();
    renderList('projects', 'projects-list');
    renderTasks('daily', 'daily-tasks-list');
    renderTasks('weekly', 'weekly-tasks-list');
    renderList('inbox_tasks', 'inbox-list');
    renderImportantDates();
    renderDailyWork();
    populateBookSelects();
    renderReflections();
    renderInspirationCard();
    renderInspirationPage();
  }

  // 仪表盘
  function renderDashboard() {
    // 统计：目标完成
    var goals = state.goals;
    var goalsDone = goals.filter(function (g) { return g.status === 'completed'; }).length;
    var goalsTotal = goals.length;
    var elGd = document.getElementById('goals-done');
    var elGt = document.getElementById('goals-total');
    var elGb = document.getElementById('goals-bar');
    if (elGd) elGd.textContent = goalsDone;
    if (elGt) elGt.textContent = '/ ' + goalsTotal;
    if (elGb) elGb.style.width = (goalsTotal > 0 ? (goalsDone / goalsTotal) * 100 : 0) + '%';

    // 统计：今日任务
    var today = todayStr();
    var todayTasks = state.daily_tasks.filter(function (t) {
      return t.task_type !== 'weekly' && t.due_date === today;
    });
    var tasksDone = todayTasks.filter(function (t) { return t.status === 'done'; }).length;
    var tasksTotal = todayTasks.length;
    var elTd = document.getElementById('tasks-done');
    var elTt = document.getElementById('tasks-total');
    var elTb = document.getElementById('tasks-bar');
    if (elTd) elTd.textContent = tasksDone;
    if (elTt) elTt.textContent = '/ ' + tasksTotal;
    if (elTb) elTb.style.width = (tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0) + '%';

    // 今日聚焦鼓励条
    renderFocusBanner(tasksDone, tasksTotal);

    // 今天任务列表
    renderTodayList();

    // mini 日历
    renderMiniCalendar();

    // 重要日子
    var datesList = document.getElementById('dates-list');
    if (datesList) {
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      var upcoming = state.important_dates
        .map(function (d) {
          var date = new Date(d.date);
          var days = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
          return { item: d, days: days };
        })
        .filter(function (d) { return d.days >= 0; })
        .sort(function (a, b) { return a.days - b.days; })
        .slice(0, 5);

      // 没数据就整张卡片隐藏，不占位
      var datesCard = document.querySelector('.dash-dates-card');
      if (datesCard) datesCard.style.display = upcoming.length === 0 ? 'none' : '';

      if (upcoming.length === 0) {
        datesList.innerHTML = '';
      } else {
        datesList.innerHTML = upcoming.map(function (d) {
          var dayText = d.days === 0 ? '今天' : d.days === 1 ? '明天' : '还有 ' + d.days + ' 天';
          return '<li class="date-item"><span class="date-title">' + escapeHtml(d.item.title) +
            '</span><span class="date-days">' + dayText + '</span></li>';
        }).join('');
      }
    }
  }

  // 今日聚焦鼓励条
  function renderFocusBanner(done, total) {
    var el = document.getElementById('dash-focus');
    if (!el) return;
    var emoji, text;
    if (total === 0) {
      emoji = '🌙'; text = '今天还没有待办，放松一下吧';
    } else if (done === total) {
      emoji = '🎉'; text = '今天的任务都完成啦，真棒';
    } else {
      emoji = '💪'; text = '还有 ' + (total - done) + ' 件待完成，加油';
    }
    el.innerHTML = '<span class="focus-emoji">' + emoji + '</span><span class="focus-text">' + text + '</span>';
  }

  // 今天任务列表（仪表盘用）
  function renderTodayList() {
    var el = document.getElementById('dash-today-list');
    if (!el) return;
    var today = todayStr();
    var tasks = state.daily_tasks.filter(function (t) {
      return t.task_type !== 'weekly' && t.due_date === today;
    });
    tasks.sort(function (a, b) {
      var ta = a.due_time || '99:99';
      var tb = b.due_time || '99:99';
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
    tasks = tasks.slice(0, 5);

    if (tasks.length === 0) {
      // 空状态：提示明日待办或鼓励添加
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      var y = tomorrow.getFullYear();
      var m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      var d = String(tomorrow.getDate()).padStart(2, '0');
      var tomorrowStr = y + '-' + m + '-' + d;
      var tomorrowCount = state.daily_tasks.filter(function (t) {
        return t.task_type !== 'weekly' && t.due_date === tomorrowStr;
      }).length;
      var hint = tomorrowCount === 0
        ? '今天和明天都没安排 · 加一件想做的小事吧'
        : '明天还有 ' + tomorrowCount + ' 件待办 · 先记一下今天想做的也行';
      el.innerHTML = '<div class="dash-empty">' + hint + '</div>';
      return;
    }
    el.innerHTML = tasks.map(function (t) {
      var doneClass = t.status === 'done' ? ' done' : '';
      var timeTag = t.due_time ? '<span class="dash-task-time">' + escapeHtml(t.due_time) + '</span>' : '';
      return '<div class="dash-task-item' + doneClass + '">' +
        '<label class="dash-check"><input type="checkbox" data-task-id="' + t.id + '"' + (t.status === 'done' ? ' checked' : '') + '></label>' +
        '<span class="dash-task-title">' + escapeHtml(t.title) + '</span>' +
        timeTag +
      '</div>';
    }).join('');

    el.querySelectorAll('.dash-check input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = this.getAttribute('data-task-id');
        toggleTaskStatus('daily_tasks', id);
      });
    });
  }

  // Mini 日历
  function renderMiniCalendar() {
    var grid = document.getElementById('mini-cal-grid');
    var title = document.getElementById('mini-cal-title');
    if (!grid || !title) return;

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    title.textContent = year + '年 ' + monthNames[month];

    // 有 todo 的日期集合
    var taskDates = {};
    state.daily_tasks.forEach(function (t) {
      if (t.due_date) taskDates[t.due_date] = (taskDates[t.due_date] || 0) + 1;
    });

    var startWeekday = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var html = '';
    for (var i = 0; i < startWeekday; i++) html += '<span class="mc-cell mc-empty"></span>';
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var cls = 'mc-cell';
      if (d === today) cls += ' mc-today';
      html += '<span class="' + cls + '">' + d;
      if (taskDates[ds]) html += '<i class="mc-dot"></i>';
      html += '</span>';
    }
    grid.innerHTML = html;
  }

  // ===== 灵感多现 =====
  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function inspDomainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function inspItemHtml(item) {
    var catBadge = item.category === 'douyin'
      ? '<span class="insp-badge insp-badge-douyin">抖音</span>'
      : '<span class="insp-badge insp-badge-marketing">营销</span>';
    var region = item.region ? '<span class="insp-region">' + escapeHtml(item.region) + '</span>' : '';
    var domain = inspDomainOf(item.source_url);
    var fav = domain
      ? '<img class="insp-fav" src="https://icons.duckduckgo.com/ip3/' + encodeURIComponent(domain) + '.ico" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    var srcName = item.source_name ? '<span class="insp-srcname">' + escapeHtml(item.source_name) + '</span>' : '';
    var domainEl = domain ? '<span class="insp-domain">' + escapeHtml(domain) + '</span>' : '';
    var cta = item.source_url ? '<span class="insp-cta">查看原文 ↗</span>' : '';
    var sourceRow = (item.source_url || item.source_name)
      ? '<div class="insp-source">' + fav + srcName + domainEl + '<span class="insp-spacer"></span>' + cta + '</div>'
      : '';
    var thumb = item.image_url
      ? '<img class="insp-thumb" src="' + escapeHtml(item.image_url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    var tags = (item.tags && item.tags.length)
      ? '<div class="insp-tags">' + item.tags.map(function (t) { return '<span class="insp-tag">#' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
      : '';
    return '<div class="insp-item' + (item.source_url ? ' insp-clickable' : '') + '"' +
      (item.source_url ? ' data-url="' + escapeHtml(item.source_url) + '"' : '') + '>' +
      thumb +
      '<div class="insp-item-head">' + catBadge + region + '</div>' +
      '<div class="insp-title">' + escapeHtml(item.title) + '</div>' +
      '<div class="insp-summary">' + escapeHtml(item.summary) + '</div>' +
      sourceRow +
      tags +
    '</div>';
  }

  function renderInspirationCard() {
    var el = document.getElementById('dash-insp-list');
    if (!el) return;
    var today = todayStr();
    var items = (state.inspiration || []).filter(function (x) { return x.date === today; });
    if (items.length === 0) {
      el.innerHTML = '<div class="dash-empty">今日灵感生成中 · 每天 08:00 自动更新</div>';
      return;
    }
    var mk = items.filter(function (x) { return x.category === 'marketing'; });
    var dy = items.filter(function (x) { return x.category === 'douyin'; });
    function grp(title, arr) {
      if (arr.length === 0) return '';
      return '<div class="insp-card-group"><div class="insp-card-group-title">' + title +
        ' <span class="cnt">' + arr.length + '</span></div>' + arr.map(inspItemHtml).join('') + '</div>';
    }
    el.innerHTML = grp('📈 营销灵感', mk) + grp('🎵 抖音热点', dy);
  }

  function renderInspirationPage() {
    var el = document.getElementById('insp-list');
    if (!el) return;
    var items = (state.inspiration || []).slice();
    if (inspFilterCat !== 'all') items = items.filter(function (x) { return x.category === inspFilterCat; });
    if (inspFilterRegion !== 'all') items = items.filter(function (x) { return x.region === inspFilterRegion; });
    if (inspSearch) {
      var q = inspSearch;
      items = items.filter(function (x) {
        var hay = [
          x.title, x.summary, x.source_name, x.source_url, x.region,
          (x.tags || []).join(' ')
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    if (items.length === 0) {
      if ((state.inspiration || []).length === 0) {
        el.innerHTML = '<div class="dash-empty">还没有灵感内容 · 每天 08:00 自动生成</div>';
      } else {
        el.innerHTML = '<div class="dash-empty">没有匹配「' + escapeHtml(inspSearch) + '」的灵感 · 试试别的关键词</div>';
      }
      return;
    }
    var groups = {};
    items.forEach(function (x) {
      var d = x.date || '未知';
      (groups[d] = groups[d] || []).push(x);
    });
    var dates = Object.keys(groups).sort().reverse();
    var today = todayStr();
    el.innerHTML = dates.map(function (d) {
      var label = d === today ? '今天' : (d === yesterdayStr() ? '昨天' : d);
      return '<div class="insp-group"><div class="insp-group-title">' + label + '</div>' +
        groups[d].map(inspItemHtml).join('') + '</div>';
    }).join('');
  }

  function initInspirationFilters() {
    document.querySelectorAll('#insp-filter-cat .insp-filter').forEach(function (b) {
      b.addEventListener('click', function () {
        inspFilterCat = b.dataset.cat;
        document.querySelectorAll('#insp-filter-cat .insp-filter').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderInspirationPage();
      });
    });
    document.querySelectorAll('#insp-filter-region .insp-filter').forEach(function (b) {
      b.addEventListener('click', function () {
        inspFilterRegion = b.dataset.region;
        document.querySelectorAll('#insp-filter-region .insp-filter').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderInspirationPage();
      });
    });
    // 关键词搜索
    var search = document.getElementById('insp-search');
    if (search) {
      search.addEventListener('input', function () {
        inspSearch = search.value.trim().toLowerCase();
        renderInspirationPage();
      });
    }
    // 整卡点击跳转原文（事件委托，渲染后依然有效）
    ['dash-insp-list', 'insp-list'].forEach(function (id) {
      var box = document.getElementById(id);
      if (!box) return;
      box.addEventListener('click', function (e) {
        var node = e.target.closest ? e.target.closest('.insp-item') : null;
        if (!node) return;
        var url = node.getAttribute('data-url');
        if (url) window.open(url, '_blank', 'noopener');
      });
    });
  }

  // 天气获取（Open-Meteo，免费不要 key）
  var weatherFetched = false;
  var DEFAULT_WEATHER_LOCATION = { name: '上海', lat: 31.23, lon: 121.47 };
  var WEATHER_CITY_KEY = 'lx_weather_city';

  function getSavedWeatherLocation() {
    try {
      var raw = localStorage.getItem(WEATHER_CITY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveWeatherLocation(location) {
    try { localStorage.setItem(WEATHER_CITY_KEY, JSON.stringify(location)); } catch (e) {}
  }

  function fetchWeather(force) {
    if (weatherFetched && !force) return;
    weatherFetched = true;
    var saved = getSavedWeatherLocation();
    loadWeather(saved || DEFAULT_WEATHER_LOCATION, saved ? '手动城市' : '默认城市，可改');
  }

  function loadWeather(location, note) {
    var card = document.getElementById('weather-card');
    if (!card) return;
    card.innerHTML = '<div class="weather-loading">正在获取 ' + escapeHtml(location.name || '天气') + '…</div>';
    var lat = Number(location.lat).toFixed(2);
    var lon = Number(location.lon).toFixed(2);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&timezone=auto';
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      renderWeather(data, location.name, note);
    }).catch(function () {
      card.innerHTML = '<div class="weather-loading">天气获取失败，先当作适合摸鱼的一天</div>' + weatherActionsHtml();
      bindWeatherActions();
    });
  }

  function useCurrentWeatherLocation() {
    var card = document.getElementById('weather-card');
    if (!card) return;
    if (!navigator.geolocation) {
      showToast('浏览器不支持定位，先用手动城市吧', 'info');
      changeWeatherCity();
      return;
    }
    card.innerHTML = '<div class="weather-loading">正在请求定位权限…</div>' + weatherActionsHtml();
    bindWeatherActions();
    navigator.geolocation.getCurrentPosition(function (pos) {
      var location = { name: '当前位置', lat: pos.coords.latitude, lon: pos.coords.longitude };
      saveWeatherLocation(location);
      loadWeather(location, '实时定位');
      showToast('已切换到当前位置天气', 'success');
    }, function () {
      showToast('定位没打开：点地址栏左侧图标，允许此网站访问位置', 'error');
      fetchWeather(true);
    }, { timeout: 10000, enableHighAccuracy: false });
  }

  function changeWeatherCity() {
    var current = getSavedWeatherLocation();
    var name = window.prompt('输入城市名，例如：深圳、北京、杭州', current && current.name !== '当前位置' ? current.name : '');
    if (!name) return;
    geocodeWeatherCity(name.trim());
  }

  function geocodeWeatherCity(name) {
    var card = document.getElementById('weather-card');
    if (!card) return;
    card.innerHTML = '<div class="weather-loading">正在查找 ' + escapeHtml(name) + '…</div>';
    var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) + '&count=1&language=zh&format=json';
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data.results || !data.results.length) {
        card.innerHTML = '<div class="weather-loading">没找到这个城市，换个名字试试</div>' + weatherActionsHtml();
        bindWeatherActions();
        return;
      }
      var r = data.results[0];
      var location = { name: r.name || name, lat: r.latitude, lon: r.longitude };
      saveWeatherLocation(location);
      loadWeather(location, '手动城市');
      showToast('已切换天气城市：' + location.name, 'success');
    }).catch(function () {
      card.innerHTML = '<div class="weather-loading">城市查询失败，稍后再试</div>' + weatherActionsHtml();
      bindWeatherActions();
    });
  }

  function weatherActionsHtml() {
    return '<div class="weather-actions"><button type="button" class="weather-btn" id="weather-current">用当前位置</button><button type="button" class="weather-btn" id="weather-city">换城市</button></div>';
  }

  function bindWeatherActions() {
    var currentBtn = document.getElementById('weather-current');
    var cityBtn = document.getElementById('weather-city');
    if (currentBtn) currentBtn.addEventListener('click', useCurrentWeatherLocation);
    if (cityBtn) cityBtn.addEventListener('click', changeWeatherCity);
  }

  function renderWeather(data, locationName, note) {
    var card = document.getElementById('weather-card');
    if (!card || !data || !data.current) return;
    var c = data.current;
    var temp = Math.round(c.temperature_2m);
    var feel = Math.round(c.apparent_temperature);
    var humidity = c.relative_humidity_2m;
    var wind = (c.wind_speed_10m != null && !isNaN(c.wind_speed_10m)) ? Math.round(c.wind_speed_10m) : null;
    var code = c.weather_code;
    var wMap = {
      0: ['晴', '\u2600\uFE0F'], 1: ['少云', '\u{1F324}\uFE0F'], 2: ['多云', '\u26C5'], 3: ['阴', '\u2601\uFE0F'],
      45: ['雾', '\u{1F32B}\uFE0F'], 48: ['冻雾', '\u{1F32B}\uFE0F'],
      51: ['毛毛雨', '\u{1F326}\uFE0F'], 53: ['小雨', '\u{1F327}\uFE0F'], 55: ['中雨', '\u{1F327}\uFE0F'],
      56: ['冻毛雨', '\u{1F327}\uFE0F'], 57: ['冻雨', '\u{1F327}\uFE0F'],
      61: ['小雨', '\u{1F327}\uFE0F'], 63: ['中雨', '\u{1F327}\uFE0F'], 65: ['大雨', '\u{1F327}\uFE0F'],
      66: ['冻雨', '\u{1F327}\uFE0F'], 67: ['强冻雨', '\u{1F327}\uFE0F'],
      71: ['小雪', '\u{1F328}\uFE0F'], 73: ['中雪', '\u{1F328}\uFE0F'], 75: ['大雪', '\u2744\uFE0F'],
      77: ['雪粒', '\u2744\uFE0F'],
      80: ['阵雨', '\u{1F326}\uFE0F'], 81: ['中阵雨', '\u{1F327}\uFE0F'], 82: ['强阵雨', '\u26C8\uFE0F'],
      85: ['阵雪', '\u{1F328}\uFE0F'], 86: ['强阵雪', '\u2744\uFE0F'],
      95: ['雷暴', '\u26C8\uFE0F'], 96: ['雷暴冰雹', '\u26C8\uFE0F'], 99: ['强雷暴', '\u26C8\uFE0F']
    };
    var info = wMap[code] || ['未知', '\u{1F321}\uFE0F'];

    // 今日最高/最低 + 当前温度位置
    var daily = data.daily || {};
    var highs = daily.temperature_2m_max || [];
    var lows = daily.temperature_2m_min || [];
    var high = highs.length ? Math.round(highs[0]) : null;
    var low = lows.length ? Math.round(lows[0]) : null;
    var nowPct = 50;
    if (high !== null && low !== null && high > low) {
      nowPct = Math.max(4, Math.min(96, Math.round(((temp - low) / (high - low)) * 100)));
    }

    var rightHtml = '';
    if (high !== null && low !== null) {
      rightHtml =
        '<div class="weather-right">' +
          '<div class="weather-hl">' +
            '<span class="weather-hl-label">今日</span>' +
            '<span class="hl-hi">↑ ' + high + '°</span>' +
            '<span class="weather-hl-bar" style="--hl-now:' + nowPct + '%"></span>' +
            '<span class="hl-lo">↓ ' + low + '°</span>' +
          '</div>' +
        '</div>';
    }

    var windTag = (wind !== null) ? '<span>风速 ' + wind + ' km/h</span>' : '';

    card.innerHTML =
      '<div class="weather-note">' + escapeHtml(locationName || '天气') + ' · ' + escapeHtml(note || '') + '</div>' +
      '<div class="weather-body">' +
        '<div class="weather-left">' +
          '<div class="weather-main"><span class="weather-icon">' + info[1] + '</span><span class="weather-temp">' + temp + '\u00B0</span></div>' +
          '<div class="weather-desc">' + info[0] + '</div>' +
          '<div class="weather-meta"><span>\u4F53\u611F ' + feel + '\u00B0</span><span>\u6E7F\u5EA6 ' + humidity + '%</span>' + windTag + '</div>' +
        weatherActionsHtml() +
        '</div>' +
        rightHtml +
      '</div>';
    bindWeatherActions();
  }

  // 目标（按类型过滤）
  function renderGoals() {
    var list = document.getElementById('goals-list');
    if (!list) return;
    var data = state.goals.filter(function (g) {
      return (g.type || 'yearly') === currentGoalType;
    });

    if (data.length === 0) {
      list.innerHTML = '<div class="placeholder">还没有' + STATUS_LABELS[currentGoalType].text + '目标</div>';
      return;
    }

    list.innerHTML = data.map(function (item) {
      return renderCardItem('goals', item);
    }).join('');
  }

  // 通用卡片列表
  function renderList(tableKey, listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    var data = state[tableKey] || [];

    if (data.length === 0) {
      var hints = {
        life_quests: '还没有支线，点击右上角添加',
        projects: '还没有项目，点击右上角添加',
        inbox_tasks: '还没有碎碎念'
      };
      list.innerHTML = '<div class="placeholder">' + (hints[tableKey] || '空空如也') + '</div>';
      return;
    }

    if (tableKey === 'inbox_tasks') {
      list.innerHTML = data.map(function (item) { return renderTaskItem(tableKey, item); }).join('');
    } else {
      list.innerHTML = data.map(function (item) { return renderCardItem(tableKey, item); }).join('');
    }
  }

  function renderCardItem(tableKey, item) {
    var title = escapeHtml(item.title || item.name || '');
    var metaParts = [];
    var progressBar = '';

    if (item.status) metaParts.push(badge(item.status));
    if (item.type && tableKey === 'goals') metaParts.push(badge(item.type));
    if (item.blocker_type && tableKey === 'projects') metaParts.push(badge(item.blocker_type));
    if (item.category) metaParts.push('<span class="meta-text">' + escapeHtml(item.category) + '</span>');
    if (item.author) metaParts.push('<span class="meta-text">' + escapeHtml(item.author) + '</span>');
    if (item.target_date) metaParts.push('<span class="meta-text">' + escapeHtml(item.target_date) + '</span>');
    if (item.date) metaParts.push('<span class="meta-text">' + escapeHtml(item.date) + '</span>');
    if (item.rating) metaParts.push('<span class="meta-text">' + item.rating + ' ⭐</span>');

    if (item.progress != null && item.progress > 0) {
      progressBar = '<div class="list-item-progress"><div class="list-item-progress-fill" style="width:' + item.progress + '%"></div></div>';
      metaParts.push('<span class="meta-text">' + item.progress + '%</span>');
    }

    if (item.blockers && item.blockers.trim()) {
      var blockerLines = item.blockers.split('\n').filter(function (l) { return l.trim(); });
      if (blockerLines.length > 0) {
        metaParts.push('<span class="meta-text" style="color:var(--danger)">' + blockerLines.length + ' 个卡点</span>');
      }
    }

    var meta = metaParts.length > 0 ? '<div class="list-item-meta">' + metaParts.join('') + '</div>' : '';

    return '<div class="list-item" data-table="' + tableKey + '" data-id="' + item.id + '">' +
      '<div class="list-item-body">' +
      '<div class="list-item-title">' + title + '</div>' +
      meta + progressBar +
      '</div></div>';
  }

  // 任务列表（按 task_type 过滤，daily 按日期分组）
  function renderTasks(taskType, listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    var data = state.daily_tasks.filter(function (t) {
      return (t.task_type || 'daily') === taskType;
    });

    if (data.length === 0) {
      list.innerHTML = '<div class="placeholder">' + (taskType === 'weekly' ? '本周还没有任务' : '还没有任务，点右上角 + 添加') + '</div>';
      return;
    }

    // weekly 保持平坦列表
    if (taskType === 'weekly') {
      list.innerHTML = data.map(function (item) { return renderTaskItem('daily_tasks', item); }).join('');
      return;
    }

    // daily 按日期分组
    var today = todayStr();
    var overdue = [];   // 逾期未完成
    var todayList = []; // 今天
    var upcoming = [];  // 未来
    var doneList = [];  // 已完成

    data.forEach(function (t) {
      if (t.status === 'done') {
        doneList.push(t);
      } else if (!t.due_date || t.due_date === today) {
        todayList.push(t);
      } else if (t.due_date < today) {
        overdue.push(t);
      } else {
        upcoming.push(t);
      }
    });

    // 排序：逾期按日期升序，未来按日期升序
    var sortByDate = function (a, b) { return (a.due_date || '').localeCompare(b.due_date || ''); };
    overdue.sort(sortByDate);
    upcoming.sort(sortByDate);

    var html = '';

    if (overdue.length > 0) {
      html += '<div class="task-group-header task-group-overdue">⚠️ 逾期未完成 · ' + overdue.length + '</div>';
      html += overdue.map(function (item) { return renderTaskItem('daily_tasks', item); }).join('');
    }

    if (todayList.length > 0) {
      html += '<div class="task-group-header task-group-today">📌 今天 · ' + todayList.length + '</div>';
      html += todayList.map(function (item) { return renderTaskItem('daily_tasks', item); }).join('');
    } else {
      html += '<div class="task-group-header task-group-today">📌 今天</div>';
      html += '<div class="placeholder">今天没有待办</div>';
    }

    if (upcoming.length > 0) {
      html += '<div class="task-group-header task-group-upcoming">📅 即将到来 · ' + upcoming.length + '</div>';
      html += upcoming.map(function (item) { return renderTaskItem('daily_tasks', item); }).join('');
    }

    if (doneList.length > 0) {
      doneList.sort(sortByDate);
      html += '<details class="task-group-done"><summary>✅ 已完成 · ' + doneList.length + '</summary>';
      html += doneList.map(function (item) { return renderTaskItem('daily_tasks', item); }).join('');
      html += '</details>';
    }

    list.innerHTML = html;
  }

  function renderTaskItem(tableKey, item) {
    var isDone = item.status === 'done' || item.processed === true;
    var title = escapeHtml(item.title || '');
    var metaParts = [];

    if (item.priority) metaParts.push(badge(item.priority));
    if (item.due_time) metaParts.push('<span class="meta-text">🕐 ' + escapeHtml(item.due_time) + '</span>');
    if (item.due_date && item.due_date !== todayStr()) {
      metaParts.push('<span class="meta-text">' + escapeHtml(item.due_date) + '</span>');
    }

    var meta = metaParts.length > 0 ? '<div class="list-item-meta">' + metaParts.join('') + '</div>' : '';

    return '<div class="list-item' + (isDone ? ' done' : '') + '" data-table="' + tableKey + '" data-id="' + item.id + '">' +
      '<div class="task-checkbox' + (isDone ? ' checked' : '') + '" data-toggle="' + item.id + '" data-table="' + tableKey + '"></div>' +
      '<div class="list-item-body">' +
      '<div class="list-item-title">' + title + '</div>' +
      meta +
      '</div></div>';
  }

  // 重要日子列表
  function renderImportantDates() {
    var list = document.getElementById('important-dates-list');
    if (!list) return;
    var data = state.important_dates;
    if (data.length === 0) {
      list.innerHTML = '<div class="placeholder">还没有重要日子</div>';
      return;
    }
    list.innerHTML = data.map(function (item) {
      return renderCardItem('important_dates', item);
    }).join('');
  }

  // 日常工作
  function renderDailyWork() {
    var todayList = document.getElementById('dw-today-list');
    if (todayList) {
      var today = todayStr();
      var todayTasks = state.daily_tasks.filter(function (t) {
        return t.task_type !== 'weekly' && t.due_date && t.due_date <= today && t.status !== 'done';
      });
      if (todayTasks.length === 0) {
        todayList.innerHTML = '<li class="placeholder">今天没有待办</li>';
      } else {
        todayList.innerHTML = todayTasks.map(function (t) {
          return '<li>' + escapeHtml(t.title) + '</li>';
        }).join('');
      }
    }

    var projList = document.getElementById('dw-projects-list');
    if (projList) {
      var active = state.projects.filter(function (p) { return p.status === 'active'; });
      if (active.length === 0) {
        projList.innerHTML = '<li class="placeholder">没有进行中的项目</li>';
      } else {
        projList.innerHTML = active.map(function (p) {
          return '<li>' + escapeHtml(p.name) + ' (' + (p.progress || 0) + '%)</li>';
        }).join('');
      }
    }
  }

  // ===== 书架 =====
  function renderBookshelf() {
    var list = document.getElementById('bookshelf-list');
    if (!list) return;
    var books = state.books;

    if (currentBookFilter !== 'all') {
      books = books.filter(function (b) { return b.status === currentBookFilter; });
    }

    if (books.length === 0) {
      list.innerHTML = '<div class="placeholder">书架是空的，点击右上角添加</div>';
      return;
    }

    list.innerHTML = books.map(function (book) {
      var totalPages = book.total_pages || 0;
      var currentPage = book.current_page || 0;
      var progress = totalPages > 0 ? Math.round(currentPage / totalPages * 100) : (book.progress || 0);

      var html = '<div class="book-card" data-book-id="' + book.id + '">';

      if (book.cover_url) {
        html += '<div class="book-cover"><img src="' + escapeHtml(book.cover_url) + '" alt="' + escapeHtml(book.title) + '" onerror="this.parentElement.innerHTML=\'<div class=book-cover-empty>📖</div>\'"></div>';
      } else {
        html += '<div class="book-cover book-cover-empty">📖</div>';
      }

      html += '<div class="book-card-info">';
      html += '<div class="book-card-title">' + escapeHtml(book.title) + '</div>';

      if (book.author) html += '<div class="book-card-author">' + escapeHtml(book.author) + '</div>';

      html += '<div class="book-card-meta">';
      if (book.status) html += badge(book.status);
      if (book.reading_round > 1) html += '<span class="book-round-badge">第' + book.reading_round + '遍</span>';
      html += '</div>';

      if (totalPages > 0) {
        html += '<div class="book-card-pages">第' + currentPage + '页 / 共' + totalPages + '页</div>';
      }

      html += '<div class="book-progress-bar"><div class="book-progress-fill" style="width:' + progress + '%"></div></div>';
      html += '</div></div>';
      return html;
    }).join('');
  }

  // ===== 读书打卡列表 =====
  function renderReadingLogs() {
    var list = document.getElementById('reading-logs-list');
    if (!list) return;
    var logs = state.reading_logs;

    if (logs.length === 0) {
      list.innerHTML = '<div class="placeholder">还没有打卡记录</div>';
      return;
    }

    list.innerHTML = logs.map(function (log) {
      var moodEmoji = MOOD_EMOJIS[log.mood] || '';
      var moodLabel = MOOD_LABELS[log.mood] || '';
      var title = bookTitle(log.book_id);

      var html = '<div class="log-item" data-log-id="' + log.id + '">';
      html += '<div class="log-item-emoji">' + (moodEmoji || '📖') + '</div>';
      html += '<div class="log-item-body">';
      html += '<div class="log-item-header">';
      html += '<span class="log-item-title">' + escapeHtml(title) + '</span>';
      html += '<span class="log-item-date">' + escapeHtml(log.log_date || '') + '</span>';
      html += '</div>';
      html += '<div class="log-item-meta">';
      if (log.pages_read) html += '<span>📄 ' + log.pages_read + ' 页</span>';
      if (moodLabel) html += '<span>' + moodEmoji + ' ' + moodLabel + '</span>';
      html += '</div>';
      if (log.reflection) html += '<div class="log-item-text">' + escapeHtml(log.reflection) + '</div>';
      html += '</div>';
      html += '<button class="btn-delete-sm" data-delete-log="' + log.id + '">×</button>';
      html += '</div>';
      return html;
    }).join('');
  }

  // ===== 读书笔记列表 =====
  function renderBookNotes() {
    var list = document.getElementById('book-notes-list');
    if (!list) return;
    var notes = state.book_notes;

    if (notes.length === 0) {
      list.innerHTML = '<div class="placeholder">还没有笔记</div>';
      return;
    }

    list.innerHTML = notes.map(function (note) {
      var title = bookTitle(note.book_id);
      var typeLabel = NOTE_TYPE_LABELS[note.note_type] || note.note_type;
      var typeCls = note.note_type || 'excerpt';

      var html = '<div class="note-item ' + typeCls + '" data-note-id="' + note.id + '">';
      html += '<div class="note-item-header">';
      html += '<div class="note-item-actions">';
      html += '<span class="note-type-badge ' + typeCls + '">' + typeLabel + '</span>';
      html += '<span class="note-item-title">' + escapeHtml(title) + '</span>';
      html += '</div>';
      html += '<button class="btn-delete-sm" data-delete-note="' + note.id + '">×</button>';
      html += '</div>';
      html += '<div class="note-item-content">' + escapeHtml(note.content || '') + '</div>';
      if (note.page_ref) html += '<div class="note-item-page">' + escapeHtml(note.page_ref) + '</div>';
      html += '</div>';
      return html;
    }).join('');
  }

  // 填充书籍下拉框
  function populateBookSelects() {
    var options = state.books.map(function (b) {
      return '<option value="' + b.id + '">' + escapeHtml(b.title) + '</option>';
    }).join('');

    var checkinBook = document.getElementById('checkin-book');
    if (checkinBook) checkinBook.innerHTML = options || '<option value="">请先添加书籍</option>';

    var noteBook = document.getElementById('note-book');
    if (noteBook) noteBook.innerHTML = options || '<option value="">请先添加书籍</option>';

    var checkinDate = document.getElementById('checkin-date');
    if (checkinDate && !checkinDate.value) checkinDate.value = todayStr();
  }

  // ===== 复盘渲染 =====
  var MOOD_SCORE_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
  var ENERGY_EMOJIS = ['🪫', '🔋', '⚡'];
  var currentReflectionEdit = { id: null, isNew: true, type: 'event' };

  function renderReflections() {
    var eventData = state.reflections.filter(function (r) { return r.type === 'event'; });
    var moodData = state.reflections.filter(function (r) { return r.type === 'mood'; });
    var freeData = state.reflections.filter(function (r) { return r.type === 'free'; });

    // 事件复盘
    var eventList = document.getElementById('reflection-event-list');
    if (eventList) {
      if (eventData.length === 0) {
        eventList.innerHTML = '<div class="placeholder">还没有事件复盘</div>';
      } else {
        eventList.innerHTML = eventData.map(function (item) {
          var html = '<div class="reflection-card" data-reflection-id="' + item.id + '">';
          html += '<div class="reflection-card-header">';
          html += '<span class="reflection-title">' + escapeHtml(item.title || '未命名') + '</span>';
          html += '<span class="reflection-date">' + escapeHtml(item.reflect_date || '') + '</span>';
          html += '</div>';
          if (item.highlights) {
            html += '<div class="reflection-section reflection-good"><span class="reflection-label">✅ 做得好</span><span class="reflection-text">' + escapeHtml(item.highlights) + '</span></div>';
          }
          if (item.lowlights) {
            html += '<div class="reflection-section reflection-bad"><span class="reflection-label">⚠️ 待改进</span><span class="reflection-text">' + escapeHtml(item.lowlights) + '</span></div>';
          }
          if (item.next_action) {
            html += '<div class="reflection-section reflection-next"><span class="reflection-label">➡️ 下次</span><span class="reflection-text">' + escapeHtml(item.next_action) + '</span></div>';
          }
          html += '</div>';
          return html;
        }).join('');
      }
    }

    // 情绪记录
    var moodList = document.getElementById('reflection-mood-list');
    if (moodList) {
      if (moodData.length === 0) {
        moodList.innerHTML = '<div class="placeholder">还没有情绪记录</div>';
      } else {
        moodList.innerHTML = moodData.map(function (item) {
          var moodEmoji = (item.mood_score >= 1 && item.mood_score <= 5) ? MOOD_SCORE_EMOJIS[item.mood_score - 1] : '😐';
          var energyEmoji = item.energy_level ? ENERGY_EMOJIS[Math.min(2, Math.floor((item.energy_level - 1) / 2))] : '';

          var html = '<div class="mood-card" data-reflection-id="' + item.id + '">';
          html += '<div class="mood-card-left">';
          html += '<span class="mood-emoji">' + moodEmoji + '</span>';
          if (energyEmoji) html += '<span class="energy-emoji">' + energyEmoji + ' ' + (item.energy_level || 0) + '/5</span>';
          html += '</div>';
          html += '<div class="mood-card-body">';
          html += '<span class="mood-date">' + escapeHtml(item.reflect_date || '') + '</span>';
          if (item.content) html += '<div class="mood-text">' + escapeHtml(item.content) + '</div>';
          html += '</div>';
          html += '</div>';
          return html;
        }).join('');
      }
    }

    // 自由复盘
    var freeList = document.getElementById('reflection-free-list');
    if (freeList) {
      if (freeData.length === 0) {
        freeList.innerHTML = '<div class="placeholder">还没有自由复盘</div>';
      } else {
        freeList.innerHTML = freeData.map(function (item) {
          var html = '<div class="reflection-card" data-reflection-id="' + item.id + '">';
          html += '<div class="reflection-card-header">';
          html += '<span class="reflection-title">' + escapeHtml(item.title || '无题') + '</span>';
          html += '<span class="reflection-date">' + escapeHtml(item.reflect_date || '') + '</span>';
          html += '</div>';
          if (item.content) {
            html += '<div class="reflection-content-text">' + escapeHtml(item.content) + '</div>';
          }
          html += '</div>';
          return html;
        }).join('');
      }
    }
  }

  // 复盘弹窗
  function openReflectionModal(item, type) {
    currentReflectionEdit = item ? { id: item.id, isNew: false, type: item.type || type } : { id: null, isNew: true, type: type };

    var typeLabels = { event: '事件复盘', mood: '情绪记录', free: '自由复盘' };
    document.getElementById('reflection-modal-title').textContent = (item ? '编辑' : '新增') + typeLabels[type];
    document.getElementById('reflection-delete').classList.toggle('hidden', !item);

    var title = item ? (item.title || '') : '';
    var date = item ? (item.reflect_date || todayStr()) : todayStr();
    var highlights = item ? (item.highlights || '') : '';
    var lowlights = item ? (item.lowlights || '') : '';
    var nextAction = item ? (item.next_action || '') : '';
    var moodScore = item ? (item.mood_score || 3) : 3;
    var energyLevel = item ? (item.energy_level || 3) : 3;
    var content = item ? (item.content || '') : '';

    var html = '';
    html += '<div class="form-group"><label>日期</label><input type="date" id="rf-date" value="' + escapeHtml(date) + '"></div>';

    if (type === 'event') {
      html += '<div class="form-group"><label>标题 *</label><input type="text" id="rf-title" value="' + escapeHtml(title) + '" placeholder="什么事？"></div>';
      html += '<div class="form-group"><label>✅ 做得好</label><textarea id="rf-highlights" rows="2" placeholder="哪些做得好？">' + escapeHtml(highlights) + '</textarea></div>';
      html += '<div class="form-group"><label>⚠️ 待改进</label><textarea id="rf-lowlights" rows="2" placeholder="哪些做得不好？">' + escapeHtml(lowlights) + '</textarea></div>';
      html += '<div class="form-group"><label>➡️ 下次怎么做</label><textarea id="rf-next" rows="2" placeholder="下次怎么改进？">' + escapeHtml(nextAction) + '</textarea></div>';
    } else if (type === 'mood') {
      html += '<div class="form-group"><label>😊 情绪值</label>';
      html += '<div class="mood-score-picker" id="rf-mood-picker">';
      for (var i = 1; i <= 5; i++) {
        html += '<span class="mood-score-tag' + (i === moodScore ? ' selected' : '') + '" data-score="' + i + '">' + MOOD_SCORE_EMOJIS[i - 1] + '</span>';
      }
      html += '</div></div>';
      html += '<div class="form-group"><label>⚡ 精力值</label>';
      html += '<div class="energy-score-picker" id="rf-energy-picker">';
      for (var j = 1; j <= 5; j++) {
        html += '<span class="energy-score-tag' + (j === energyLevel ? ' selected' : '') + '" data-score="' + j + '">' + j + '</span>';
      }
      html += '</div></div>';
      html += '<div class="form-group"><label>备注</label><textarea id="rf-content" rows="2" placeholder="一句话记录...">' + escapeHtml(content) + '</textarea></div>';
    } else if (type === 'free') {
      html += '<div class="form-group"><label>标题</label><input type="text" id="rf-title" value="' + escapeHtml(title) + '" placeholder="无题也行"></div>';
      html += '<div class="form-group"><label>内容</label><textarea id="rf-content" rows="6" placeholder="想到什么写什么...">' + escapeHtml(content) + '</textarea></div>';
    }

    document.getElementById('reflection-modal-body').innerHTML = html;
    document.getElementById('reflection-modal').classList.remove('hidden');

    // 情绪/精力选择器事件
    var moodPicker = document.getElementById('rf-mood-picker');
    if (moodPicker) {
      moodPicker.querySelectorAll('.mood-score-tag').forEach(function (tag) {
        tag.addEventListener('click', function () {
          moodPicker.querySelectorAll('.mood-score-tag').forEach(function (t) { t.classList.remove('selected'); });
          tag.classList.add('selected');
        });
      });
    }
    var energyPicker = document.getElementById('rf-energy-picker');
    if (energyPicker) {
      energyPicker.querySelectorAll('.energy-score-tag').forEach(function (tag) {
        tag.addEventListener('click', function () {
          energyPicker.querySelectorAll('.energy-score-tag').forEach(function (t) { t.classList.remove('selected'); });
          tag.classList.add('selected');
        });
      });
    }
  }

  // 复盘保存
  document.getElementById('reflection-save').addEventListener('click', async function () {
    var type = currentReflectionEdit.type;
    var data = {
      type: type,
      reflect_date: document.getElementById('rf-date').value || todayStr()
    };

    if (type === 'event') {
      data.title = document.getElementById('rf-title').value.trim();
      data.highlights = document.getElementById('rf-highlights').value.trim() || null;
      data.lowlights = document.getElementById('rf-lowlights').value.trim() || null;
      data.next_action = document.getElementById('rf-next').value.trim() || null;
      if (!data.title) { showToast('标题不能为空', 'error'); return; }
    } else if (type === 'mood') {
      var moodSelected = document.querySelector('#rf-mood-picker .mood-score-tag.selected');
      var energySelected = document.querySelector('#rf-energy-picker .energy-score-tag.selected');
      data.mood_score = moodSelected ? parseInt(moodSelected.dataset.score) : 3;
      data.energy_level = energySelected ? parseInt(energySelected.dataset.score) : 3;
      data.content = document.getElementById('rf-content').value.trim() || null;
    } else if (type === 'free') {
      data.title = document.getElementById('rf-title').value.trim() || null;
      data.content = document.getElementById('rf-content').value.trim() || null;
    }

    document.getElementById('reflection-modal').classList.add('hidden');

    if (currentReflectionEdit.isNew) {
      var result = await insertRow('reflections', data);
      if (result) {
        state.reflections.unshift(result);
        renderReflections();
        showToast('已添加', 'success');
      }
    } else {
      var updated = await updateRow('reflections', currentReflectionEdit.id, data);
      if (updated) {
        var idx = state.reflections.findIndex(function (r) { return r.id === currentReflectionEdit.id; });
        if (idx >= 0) state.reflections[idx] = updated;
        renderReflections();
        showToast('已保存', 'success');
      }
    }
  });

  // 复盘删除
  document.getElementById('reflection-delete').addEventListener('click', async function () {
    if (!currentReflectionEdit.id) return;
    document.getElementById('reflection-modal').classList.add('hidden');
    await deleteRow('reflections', currentReflectionEdit.id);
    state.reflections = state.reflections.filter(function (r) { return r.id !== currentReflectionEdit.id; });
    renderReflections();
    showToast('已删除', 'success');
  });

  // 复盘卡片点击 → 打开编辑弹窗
  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-reflection-id]');
    if (card) {
      var id = card.dataset.reflectionId;
      var item = state.reflections.find(function (r) { return r.id === id; });
      if (item) openReflectionModal(item, item.type);
      return;
    }
  });

  // thinks 子 tab 切换
  document.querySelectorAll('[data-thinks-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('[data-thinks-tab]').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var pane = tab.dataset.thinksTab;
      document.querySelectorAll('[data-thinks-pane]').forEach(function (p) {
        p.classList.toggle('active', p.dataset.thinksPane === pane);
      });
    });
  });

  // ===== 书籍详情弹窗 =====
  function openBookModal(book) {
    currentBookEdit = book ? { id: book.id, isNew: false } : { id: null, isNew: true };

    var title = book ? (book.title || '') : '';
    var author = book ? (book.author || '') : '';
    var status = book ? (book.status || 'want') : 'want';
    var totalPages = book ? (book.total_pages || 0) : 0;
    var currentPage = book ? (book.current_page || 0) : 0;
    var readingRound = book ? (book.reading_round || 1) : 1;
    var rating = book ? (book.rating || '') : '';
    var notes = book ? (book.notes || '') : '';
    var coverUrl = book ? (book.cover_url || '') : '';

    document.getElementById('book-modal-title').textContent = book ? '编辑书籍' : '添加书籍';
    document.getElementById('book-delete').classList.toggle('hidden', !book);

    var html = '';
    // 封面区
    html += '<div class="book-cover-section">';
    html += '<label>封面</label>';
    html += '<div class="cover-preview" id="bk-cover-preview">';
    if (coverUrl) {
      html += '<img src="' + escapeHtml(coverUrl) + '" class="cover-preview-img" onerror="this.parentElement.innerHTML=\'<div class=cover-preview-placeholder>📷</div>\'">';
    } else {
      html += '<div class="cover-preview-placeholder">📖</div>';
    }
    html += '</div>';
    html += '<div class="cover-actions">';
    html += '<input type="file" id="bk-cover-file" accept="image/*" style="display:none">';
    html += '<button type="button" class="btn-cover-upload" id="bk-cover-btn">📷 上传图片</button>';
    html += '<input type="text" id="bk-cover-url" placeholder="或粘贴图片链接" value="' + escapeHtml(coverUrl) + '">';
    html += '</div>';
    html += '</div>';
    // 书名
    html += '<div class="form-group"><label>书名 *</label><input type="text" id="bk-title" value="' + escapeHtml(title) + '"></div>';
    html += '<div class="form-group"><label>作者</label><input type="text" id="bk-author" value="' + escapeHtml(author) + '"></div>';
    html += '<div class="form-group"><label>状态</label><select id="bk-status">';
    ['want', 'reading', 'done'].forEach(function (s) {
      html += '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' + STATUS_LABELS[s].text + '</option>';
    });
    html += '</select></div>';

    // 滑动条区域
    html += '<div class="book-slider-section">';
    html += '<div class="book-slider-display">';
    html += '<span class="book-slider-pages" id="bk-pages-display">第' + currentPage + '页 / 共' + totalPages + '页</span>';
    html += '<span class="book-slider-percent" id="bk-percent">' + (totalPages > 0 ? Math.round(currentPage / totalPages * 100) : 0) + '%</span>';
    html += '</div>';
    html += '<input type="range" class="book-slider" id="bk-slider" min="0" max="' + (totalPages || 100) + '" value="' + currentPage + '">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-top:8px">';
    html += '<span style="font-size:12px;color:var(--text-3)">总页数:</span>';
    html += '<input type="number" class="book-total-input" id="bk-total" value="' + totalPages + '" min="0">';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-group"><label>第几遍</label><input type="number" id="bk-round" value="' + readingRound + '" min="1"></div>';
    html += '<div class="form-group"><label>评分 (1-5)</label><input type="number" id="bk-rating" value="' + rating + '" min="1" max="5"></div>';
    html += '<div class="form-group"><label>笔记</label><textarea id="bk-notes" rows="3">' + escapeHtml(notes) + '</textarea></div>';

    document.getElementById('book-modal-body').innerHTML = html;
    document.getElementById('book-modal').classList.remove('hidden');

    // 滑动条事件
    var slider = document.getElementById('bk-slider');
    var totalInput = document.getElementById('bk-total');

    function updateSliderDisplay() {
      var cp = parseInt(slider.value) || 0;
      var tp = parseInt(totalInput.value) || 0;
      document.getElementById('bk-pages-display').textContent = '第' + cp + '页 / 共' + tp + '页';
      var pct = tp > 0 ? Math.round(cp / tp * 100) : 0;
      document.getElementById('bk-percent').textContent = pct + '%';
    }

    slider.addEventListener('input', updateSliderDisplay);
    totalInput.addEventListener('input', function () {
      var tp = parseInt(totalInput.value) || 0;
      slider.max = tp || 100;
      var cp = parseInt(slider.value) || 0;
      if (cp > tp && tp > 0) { slider.value = tp; }
      updateSliderDisplay();
    });

    updateSliderDisplay();

    // 封面事件
    var coverBtn = document.getElementById('bk-cover-btn');
    var coverFile = document.getElementById('bk-cover-file');
    var coverUrlInput = document.getElementById('bk-cover-url');
    var coverPreview = document.getElementById('bk-cover-preview');

    coverBtn.addEventListener('click', function () { coverFile.click(); });

    coverFile.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var maxW = 400;
          var w = img.width, h = img.height;
          if (w > maxW) { h = h * maxW / w; w = maxW; }
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          coverUrlInput.value = dataUrl;
          coverPreview.innerHTML = '<img src="' + dataUrl + '" class="cover-preview-img">';
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    coverUrlInput.addEventListener('input', function () {
      var val = coverUrlInput.value.trim();
      if (val) {
        coverPreview.innerHTML = '<img src="' + escapeHtml(val) + '" class="cover-preview-img" onerror="this.parentElement.innerHTML=\'<div class=cover-preview-placeholder>📷</div>\'">';
      } else {
        coverPreview.innerHTML = '<div class="cover-preview-placeholder">📖</div>';
      }
    });
  }

  // 书籍保存
  document.getElementById('book-save').addEventListener('click', async function () {
    var data = {
      cover_url: document.getElementById('bk-cover-url').value.trim() || null,
      title: document.getElementById('bk-title').value.trim(),
      author: document.getElementById('bk-author').value.trim() || null,
      status: document.getElementById('bk-status').value,
      total_pages: parseInt(document.getElementById('bk-total').value) || 0,
      current_page: parseInt(document.getElementById('bk-slider').value) || 0,
      reading_round: parseInt(document.getElementById('bk-round').value) || 1,
      rating: document.getElementById('bk-rating').value ? parseInt(document.getElementById('bk-rating').value) : null,
      notes: document.getElementById('bk-notes').value.trim() || null
    };

    if (!data.title) { showToast('书名不能为空', 'error'); return; }

    // 自动计算 progress
    if (data.total_pages > 0) {
      data.progress = Math.round(data.current_page / data.total_pages * 100);
    }

    document.getElementById('book-modal').classList.add('hidden');

    if (currentBookEdit.isNew) {
      var result = await insertRow('books', data);
      if (result) { state.books.unshift(result); renderAll(); showToast('已添加', 'success'); }
    } else {
      var updated = await updateRow('books', currentBookEdit.id, data);
      if (updated) {
        var idx = state.books.findIndex(function (r) { return r.id === currentBookEdit.id; });
        if (idx >= 0) state.books[idx] = updated;
        renderAll();
        showToast('已保存', 'success');
      }
    }
  });

  // 书籍删除
  document.getElementById('book-delete').addEventListener('click', async function () {
    if (!currentBookEdit.id) return;
    document.getElementById('book-modal').classList.add('hidden');
    await deleteRow('books', currentBookEdit.id);
    state.books = state.books.filter(function (r) { return r.id !== currentBookEdit.id; });
    renderAll();
    showToast('已删除', 'success');
  });

  // 书架点击 → 打开书籍弹窗
  document.addEventListener('click', function (e) {
    var bookCard = e.target.closest('[data-book-id]');
    if (bookCard) {
      var bookId = bookCard.dataset.bookId;
      var book = state.books.find(function (b) { return b.id === bookId; });
      if (book) openBookModal(book);
      return;
    }

    // 打卡删除
    var delLog = e.target.closest('[data-delete-log]');
    if (delLog) {
      e.stopPropagation();
      var logId = delLog.dataset.deleteLog;
      deleteRow('reading_logs', logId);
      state.reading_logs = state.reading_logs.filter(function (r) { return r.id !== logId; });
      renderReadingLogs();
      showToast('已删除', 'success');
      return;
    }

    // 笔记删除
    var delNote = e.target.closest('[data-delete-note]');
    if (delNote) {
      e.stopPropagation();
      var noteId = delNote.dataset.deleteNote;
      deleteRow('book_notes', noteId);
      state.book_notes = state.book_notes.filter(function (r) { return r.id !== noteId; });
      renderBookNotes();
      showToast('已删除', 'success');
      return;
    }

    // checkbox 切换
    var toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      e.stopPropagation();
      toggleTaskStatus(toggle.dataset.table, toggle.dataset.toggle);
      return;
    }

    // list-item 点击编辑
    var item = e.target.closest('.list-item');
    if (item && item.dataset.table && item.dataset.id) {
      var tableKey = item.dataset.table;
      var id = item.dataset.id;
      var found = state[tableKey] ? state[tableKey].find(function (r) { return r.id === id; }) : null;
      if (found) openEditModal(tableKey, found);
    }
  });

  // ===== Tabs =====
  // 目标类型 tab
  document.querySelectorAll('[data-goal-type]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('[data-goal-type]').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentGoalType = tab.dataset.goalType;
      renderGoals();
    });
  });

  // 书架过滤 tab
  document.querySelectorAll('[data-book-filter]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('[data-book-filter]').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentBookFilter = tab.dataset.bookFilter;
      renderBookshelf();
    });
  });

  // reads 子 tab
  document.querySelectorAll('[data-reads-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('[data-reads-tab]').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var pane = tab.dataset.readsTab;
      document.querySelectorAll('[data-reads-pane]').forEach(function (p) {
        p.classList.toggle('active', p.dataset.readsPane === pane);
      });
    });
  });

  // 心情标签
  document.querySelectorAll('.mood-tag').forEach(function (tag) {
    tag.addEventListener('click', function () {
      document.querySelectorAll('.mood-tag').forEach(function (t) { t.classList.remove('selected'); });
      tag.classList.add('selected');
      selectedMood = tag.dataset.mood;
    });
  });

  // ===== 打卡提交 =====
  document.getElementById('checkin-submit').addEventListener('click', async function () {
    var bookId = document.getElementById('checkin-book').value;
    var pages = parseInt(document.getElementById('checkin-pages').value) || 0;
    var date = document.getElementById('checkin-date').value || todayStr();
    var reflection = document.getElementById('checkin-reflection').value.trim();

    if (!bookId) { showToast('请先选择书籍', 'error'); return; }

    var result = await insertRow('reading_logs', {
      book_id: bookId, pages_read: pages, log_date: date,
      mood: selectedMood, reflection: reflection || null
    });

    if (result) {
      state.reading_logs.unshift(result);

      // 自动更新书籍当前页
      var book = state.books.find(function (b) { return b.id === bookId; });
      if (book && pages > 0) {
        var newPage = (book.current_page || 0) + pages;
        var totalPages = book.total_pages || 0;
        var updates = { current_page: newPage };
        if (totalPages > 0) {
          updates.progress = Math.min(100, Math.round(newPage / totalPages * 100));
        }
        if (book.status === 'want') updates.status = 'reading';
        var updated = await updateRow('books', bookId, updates);
        if (updated) {
          var idx = state.books.findIndex(function (b) { return b.id === bookId; });
          if (idx >= 0) state.books[idx] = updated;
        }
      }

      // 重置表单
      document.getElementById('checkin-pages').value = '0';
      document.getElementById('checkin-reflection').value = '';
      document.querySelectorAll('.mood-tag').forEach(function (t) { t.classList.remove('selected'); });
      selectedMood = '';

      renderAll();
      showToast('打卡成功!', 'success');
    }
  });

  // ===== 笔记提交 =====
  document.getElementById('note-submit').addEventListener('click', async function () {
    var bookId = document.getElementById('note-book').value;
    var type = document.getElementById('note-type').value;
    var content = document.getElementById('note-content').value.trim();
    var pageRef = document.getElementById('note-page').value.trim();

    if (!bookId) { showToast('请先选择书籍', 'error'); return; }
    if (!content) { showToast('内容不能为空', 'error'); return; }

    var result = await insertRow('book_notes', {
      book_id: bookId, note_type: type,
      content: content, page_ref: pageRef || null
    });

    if (result) {
      state.book_notes.unshift(result);
      document.getElementById('note-content').value = '';
      document.getElementById('note-page').value = '';
      renderBookNotes();
      showToast('笔记已添加', 'success');
    }
  });

  // ===== 设置弹窗 =====
  var btnSettings = document.getElementById('btn-settings');
  var settingsModal = document.getElementById('settings-modal');

  btnSettings.addEventListener('click', function () {
    document.getElementById('settings-url').value = config.url || '';
    document.getElementById('settings-key').value = config.key || '';
    settingsModal.classList.remove('hidden');
  });

  document.getElementById('settings-save').addEventListener('click', async function () {
    var url = document.getElementById('settings-url').value.trim();
    var key = document.getElementById('settings-key').value.trim();
    if (!url || !key) { showToast('URL 和 key 都不能为空', 'error'); return; }
    url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    saveConfig(url, key);
    config = getConfig();
    settingsModal.classList.add('hidden');
    showToast('正在连接...');
    sb = null;
    await initSupabase();
    if (sb) showToast('连接成功!', 'success');
  });

  // ===== 通用编辑弹窗 =====
  var editModal = document.getElementById('edit-modal');
  var editTitle = document.getElementById('edit-title');
  var editBody = document.getElementById('edit-body');
  var editSave = document.getElementById('edit-save');
  var editDelete = document.getElementById('edit-delete');
  var currentEdit = { table: null, id: null, isNew: false, defaults: {} };

  function openEditModal(tableKey, item, defaults) {
    var schema = SCHEMAS[tableKey];
    if (!schema) return;

    currentEdit.table = tableKey;
    currentEdit.isNew = !item;
    currentEdit.id = item ? item.id : null;
    currentEdit.defaults = defaults || {};

    var tableLabels = {
      goals: '目标', life_quests: '支线', daily_tasks: '任务',
      inbox_tasks: '临时任务', projects: '项目', important_dates: '重要日子'
    };

    editTitle.textContent = (item ? '编辑' : '新增') + tableLabels[tableKey];
    editDelete.classList.toggle('hidden', !item);

    var html = '';
    schema.forEach(function (field) {
      var val;
      if (item) {
        val = item[field.key];
      } else if (currentEdit.defaults[field.key] !== undefined) {
        val = currentEdit.defaults[field.key];
      } else if (field.def !== undefined) {
        val = field.def === 'today' ? todayStr() : field.def;
      } else {
        val = '';
      }

      html += '<div class="form-group">';
      html += '<label>' + field.label + (field.required ? ' *' : '') + '</label>';

      if (field.type === 'textarea') {
        html += '<textarea id="field-' + field.key + '">' + escapeHtml(val || '') + '</textarea>';
      } else if (field.type === 'select') {
        html += '<select id="field-' + field.key + '">';
        field.options.forEach(function (opt) {
          var label = STATUS_LABELS[opt] ? STATUS_LABELS[opt].text : opt;
          html += '<option value="' + opt + '"' + (val === opt ? ' selected' : '') + '>' + label + '</option>';
        });
        html += '</select>';
      } else if (field.type === 'checkbox') {
        html += '<div class="form-check"><input type="checkbox" id="field-' + field.key + '"' + (val ? ' checked' : '') + '><label for="field-' + field.key + '" style="margin:0">是</label></div>';
      } else {
        html += '<input type="' + field.type + '" id="field-' + field.key + '" value="' + escapeHtml(val || '') + '"' +
          (field.ph ? ' placeholder="' + field.ph + '"' : '') +
          (field.min != null ? ' min="' + field.min + '"' : '') +
          (field.max != null ? ' max="' + field.max + '"' : '') + '>';
      }
      html += '</div>';
    });

    editBody.innerHTML = html;
    editModal.classList.remove('hidden');
  }

  editSave.addEventListener('click', async function () {
    if (!currentEdit.table) return;
    var schema = SCHEMAS[currentEdit.table];
    var data = {};

    schema.forEach(function (field) {
      var el = document.getElementById('field-' + field.key);
      if (!el) return;
      if (field.type === 'checkbox') {
        data[field.key] = el.checked;
      } else if (field.type === 'number') {
        data[field.key] = el.value ? parseInt(el.value, 10) : null;
      } else {
        data[field.key] = el.value || null;
      }
    });

    // 应用默认值（新建时）
    if (currentEdit.isNew) {
      Object.keys(currentEdit.defaults).forEach(function (k) {
        if (data[k] === null || data[k] === undefined) {
          data[k] = currentEdit.defaults[k];
        }
      });
    }

    // 清理空值（保留必填）
    Object.keys(data).forEach(function (k) {
      if (data[k] === null || data[k] === '') {
        if (k === 'title' || k === 'name') return;
        delete data[k];
      }
    });

    editModal.classList.add('hidden');

    if (currentEdit.isNew) {
      var result = await insertRow(TABLES[currentEdit.table], data);
      if (result) {
        state[currentEdit.table].unshift(result);
        renderAll();
        showToast('已添加', 'success');
      }
    } else {
      var updated = await updateRow(TABLES[currentEdit.table], currentEdit.id, data);
      if (updated) {
        var idx = state[currentEdit.table].findIndex(function (r) { return r.id === currentEdit.id; });
        if (idx >= 0) state[currentEdit.table][idx] = updated;
        renderAll();
        showToast('已保存', 'success');
      }
    }
  });

  editDelete.addEventListener('click', async function () {
    if (!currentEdit.table || !currentEdit.id) return;
    editModal.classList.add('hidden');
    await deleteRow(TABLES[currentEdit.table], currentEdit.id);
    state[currentEdit.table] = state[currentEdit.table].filter(function (r) { return r.id !== currentEdit.id; });
    renderAll();
    showToast('已删除', 'success');
  });

  // 关闭弹窗
  document.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', function () {
      var target = document.getElementById(el.dataset.close);
      if (target) target.classList.add('hidden');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // ===== 添加按钮 =====
  document.querySelectorAll('.btn-add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var table = btn.dataset.table;

      // 书籍用专属弹窗
      if (table === 'books') {
        openBookModal(null);
        return;
      }

      // 复盘用专属弹窗
      if (table === 'reflections') {
        openReflectionModal(null, btn.dataset.reflectionType || 'event');
        return;
      }

      // 任务带默认 task_type
      var defaults = {};
      if (btn.dataset.taskType) {
        defaults.task_type = btn.dataset.taskType;
      }
      openEditModal(table, null, defaults);
    });
  });

  // 任务状态切换
  async function toggleTaskStatus(tableKey, id) {
    var data = state[tableKey];
    if (!data) return;
    var item = data.find(function (r) { return r.id === id; });
    if (!item) return;

    var newStatus;
    if (tableKey === 'inbox_tasks') {
      newStatus = { processed: !item.processed };
    } else {
      newStatus = { status: item.status === 'done' ? 'todo' : 'done' };
    }

    Object.assign(item, newStatus);
    renderAll();
    await updateRow(TABLES[tableKey], id, newStatus);
  }

  // ===== Inbox 快速输入 =====
  var inboxInput = document.getElementById('inbox-input');
  var inboxAdd = document.getElementById('inbox-add');

  async function addInbox() {
    var text = inboxInput.value.trim();
    if (!text) return;
    inboxInput.value = '';
    var result = await insertRow('inbox_tasks', { title: text });
    if (result) {
      state.inbox_tasks.unshift(result);
      renderList('inbox_tasks', 'inbox-list');
      showToast('记下了', 'success');
    }
  }

  inboxAdd.addEventListener('click', addInbox);
  inboxInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addInbox();
  });

  function openDailyTaskModal() {
    openEditModal('daily_tasks', null, { task_type: 'daily', due_date: todayStr() });
  }

  var dashFab = document.getElementById('dash-fab');
  if (dashFab) dashFab.addEventListener('click', openDailyTaskModal);

  // ===== Todo 到点提醒（前台，需页面打开）=====
  var reminderTimer = null;
  var reminderToggle = document.getElementById('reminder-toggle');

  function notifySupported() { return ('Notification' in window); }

  // localStorage 持久化已通知标记，避免刷新页面后重复弹或静默标记丢失
  function remindedKey(id, date) { return 'lx_reminded_' + id + '_' + date; }
  function isReminded(id, date) {
    try { return localStorage.getItem(remindedKey(id, date)) === '1'; } catch (e) { return false; }
  }
  function markReminded(id, date) {
    try { localStorage.setItem(remindedKey(id, date), '1'); } catch (e) {}
  }

  function updateReminderButton() {
    if (!reminderToggle) return;
    if (!notifySupported()) {
      reminderToggle.textContent = '⏰ 不支持提醒';
      reminderToggle.disabled = true;
      reminderToggle.classList.add('disabled');
      return;
    }
    var perm = Notification.permission;
    if (perm === 'granted') {
      reminderToggle.textContent = '⏰ 提醒已开';
      reminderToggle.classList.add('on');
      reminderToggle.disabled = false;
    } else if (perm === 'denied') {
      reminderToggle.textContent = '⏰ 提醒被禁';
      reminderToggle.disabled = true;
    } else {
      reminderToggle.textContent = '⏰ 开启提醒';
      reminderToggle.classList.remove('on');
      reminderToggle.disabled = false;
    }
  }

  async function toggleReminder() {
    if (!notifySupported()) return;
    if (Notification.permission === 'granted') {
      // 已开启，弹一条测试通知让用户确认能收到
      var ok = fireNotification('⏰ 测试通知', '提醒功能正常！到点会这样弹通知', 'test-notify');
      if (ok) showToast('已弹测试通知，如果没看到请检查 Mac 系统通知设置', 'success');
      else showToast('通知发送失败', 'error');
      // 顺便检查一次有没有到点但还没弹的
      checkTaskReminders(false);
      return;
    }
    if (Notification.permission === 'denied') { showToast('通知权限被禁，请在浏览器地址栏左侧 🔒 图标里开启通知', 'error'); return; }
    var perm = await Notification.requestPermission();
    updateReminderButton();
    if (perm === 'granted') {
      showToast('提醒已开启', 'success');
      // 立刻弹一条测试通知
      fireNotification('⏰ 提醒已开启', '到点会这样弹通知，请确认能看到这条', 'test-notify');
      // 授权后启动轮询（首次静默只标记超过 10 分钟的过期任务，10 分钟内的会弹）
      startReminderLoop();
    } else {
      showToast('未开启通知权限', 'info');
    }
  }

  function fireNotification(title, body, tag) {
    console.log('[reminder] fireNotification:', title, body);
    // Mac Chrome 上 new Notification() 会静默失败，优先走 SW showNotification
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title, { body: body, tag: tag, icon: 'icons/icon-192-v15.png', requireInteraction: false });
        console.log('[reminder] SW showNotification sent');
      }).catch(function (e) {
        console.log('[reminder] SW showNotification failed:', e);
      });
      return true;
    }
    // fallback: new Notification（部分环境可用）
    try {
      var n = new Notification(title, { body: body, tag: tag, icon: 'icons/icon-192-v15.png' });
      n.onshow = function () { console.log('[reminder] notification shown'); };
      n.onerror = function (e) { console.log('[reminder] notification error', e); };
      n.onclick = function () { window.focus(); switchView('daily-tasks'); n.close(); };
      return true;
    } catch (e) {
      console.log('[reminder] new Notification failed:', e.message);
      return false;
    }
  }

  function checkTaskReminders(silent) {
    if (!notifySupported() || Notification.permission !== 'granted') return;
    var today = todayStr();
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    state.daily_tasks.forEach(function (t) {
      if (t.status === 'done') return;
      if (!t.due_time) return;
      if (t.due_date !== today) return;   // 只提醒今天的，逾期由列表分组展示
      var parts = t.due_time.split(':');
      if (parts.length < 2) return;
      var taskMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (isNaN(taskMin)) return;
      // 当前时间 >= 任务时间
      if (nowMin >= taskMin) {
        // 已通知过，跳过（localStorage 持久化，刷新页面也不丢）
        if (isReminded(t.id, today)) return;
        // 首次静默模式：只标记超过 10 分钟的旧任务，不弹通知
        // 10 分钟内的不标记，留给后续轮询弹
        if (silent && (nowMin - taskMin) > 10) {
          markReminded(t.id, today);
          return;
        }
        markReminded(t.id, today);
        if (!silent) {
          fireNotification('⏰ 到点啦', t.title + (t.due_time ? ' · ' + t.due_time : ''), 'todo-' + t.id);
        }
      }
    });
  }

  function startReminderLoop() {
    updateReminderButton();
    if (reminderTimer) clearInterval(reminderTimer);
    // 首次静默标记已过期任务，不弹通知（避免一打开页面一堆通知）
    checkTaskReminders(true);
    // 后续轮询才真正弹通知
    reminderTimer = setInterval(function () { checkTaskReminders(false); }, 30000);   // 30 秒检查一次
  }

  if (reminderToggle) {
    reminderToggle.addEventListener('click', toggleReminder);
  }
  // 页面从后台切回前台时立即检查一次（setInterval 在后台会被限流）
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) checkTaskReminders();
  });

  // ===== Service Worker =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js?v=37').catch(function (err) {
        console.warn('Service Worker 注册失败:', err);
      });
    });
  }

  // ===== 启动 =====
  initSupabase();
})();
