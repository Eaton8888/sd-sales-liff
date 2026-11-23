/* 本月我的成績 */
(function () {
  var el = SD.el;

  function bars(map) {
    var keys = Object.keys(map || {}).filter(function (k) { return map[k] > 0; });
    var max = 1;
    keys.forEach(function (k) { if (map[k] > max) max = map[k]; });
    if (!keys.length) return el('div', { class: 'empty', text: '尚無資料' });
    return el('div', {}, keys.map(function (k) {
      return el('div', { class: 'bar-row' },
        el('div', { class: 'bar-lab', text: k }),
        el('div', { class: 'bar-track' }, el('div', { class: 'bar-fill', style: { width: (map[k] / max * 100) + '%' } })),
        el('div', { class: 'bar-n', text: String(map[k]) })
      );
    }));
  }

  function goalBlock(goal, stats) {
    if (!goal || !goal.set) {
      return el('div', { class: 'empty', text: '尚未設定目標' });
    }
    var rows = [
      ['帶看', stats.visitCount, goal.visitGoal, goal.visitProgress],
      ['下訂', stats.orderCount, goal.orderGoal, goal.orderProgress],
      ['成交', stats.dealCount, goal.dealGoal, goal.dealProgress]
    ];
    return el('div', {}, rows.map(function (r) {
      var cur = r[1] || 0, target = r[2], prog = r[3];
      var has = target != null && target !== 0;
      var pctLab = has ? SD.pct(prog) : '—';
      var width = has ? Math.min(100, (prog || 0) * 100) : 0;
      return el('div', { class: 'goal', style: { marginBottom: '12px' } },
        el('div', { class: 'goal-top' },
          el('span', { text: r[0] }),
          el('span', { class: 'dim', text: cur + ' / ' + (target == null ? '—' : target) + '　' + pctLab })
        ),
        el('div', { class: 'goal-track' }, el('div', { class: 'goal-fill', style: { width: width + '%' } }))
      );
    }));
  }

  function statTriple(stats) {
    var vs = stats.vsPrevious || {};
    function one(label, num, d) {
      var t = SD.vsText(d);
      return el('div', { class: 'stat' },
        el('div', { class: 'stat-label', text: label }),
        el('div', { class: 'stat-num', text: String(num || 0) }),
        el('div', { class: 'stat-vs ' + t.cls, text: t.text })
      );
    }
    return el('div', { class: 'stats-3' },
      one('帶看', stats.visitCount, vs.visitCount),
      one('下訂', stats.orderCount, vs.orderCount),
      one('成交', stats.dealCount, vs.dealCount)
    );
  }

  SD.start({
    page: 'month',
    liffId: (window.SD_CONFIG || {}).liffIds.month,
    onReady: async function (ctx) {
      var me = ctx.me;
      var isMgr = me.role === '主管';
      var month = ctx.month();
      var maxMonth = ctx.month();
      var staffId = '';
      var viewingName = '';
      var data = null;

      async function load() {
        var payload = { month: month };
        if (staffId) payload.staffId = staffId;
        data = await ctx.api('monthStats', payload);
      }

      function prevDisabled() { return false; }
      function nextDisabled() { return month >= maxMonth; }

      function render() {
        var stats = data.stats || {};
        var goal = data.goal || stats.goal || { set: false };
        var prevM = data.previousMonth;
        var canNext = !nextDisabled();

        var nav = el('div', { class: 'month-nav' },
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': '上一個月', onclick: function () { month = SD.shiftMonth(month, -1); refresh(); } }, SD.svg(SD.ICO.chevL, 'ico')),
          el('div', { class: 'label', text: SD.ymLabel(month) }),
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': '下一個月', disabled: !canNext, onclick: function () { if (month < maxMonth) { month = SD.shiftMonth(month, 1); refresh(); } } }, SD.svg(SD.ICO.chevR, 'ico'))
        );

        var kids = [nav];

        if (isMgr && data.scope === 'self') {
          kids.push(el('button', { class: 'back-link', type: 'button', text: '← 返回全店', onclick: function () { staffId = ''; viewingName = ''; refresh(); } }));
          kids.push(el('p', { class: 'hint', style: { margin: '0 0 12px' }, text: '檢視：' + (data.staffName || viewingName) + '（' + data.staffId + '）' }));
        }

        kids.push(statTriple(stats));
        kids.push(el('div', { class: 'rates' },
          el('div', { class: 'rate' },
            el('div', { class: 'rate-label', text: '成交率' }),
            el('div', { class: 'rate-num', text: SD.pct(stats.dealRate) })
          ),
          el('div', { class: 'rate' },
            el('div', { class: 'rate-label', text: '下訂率' }),
            el('div', { class: 'rate-num', text: SD.pct(stats.orderRate) })
          )
        ));

        kids.push(el('div', { class: 'section-title', text: '目標進度' }));
        kids.push(el('div', { class: 'card' }, goalBlock(goal, stats)));

        kids.push(el('div', { class: 'section-title', text: '客戶來源' }));
        kids.push(el('div', { class: 'card' }, bars(data.sourceCounts || stats.sourceCounts)));

        var prev = data.previous || {};
        kids.push(el('div', { class: 'section-title', text: '對照 ' + SD.ymLabel(prevM) }));
        kids.push(el('div', { class: 'card' },
          el('div', { class: 'visit-meta', text: '帶看 ' + (prev.visitCount || 0) + '　下訂 ' + (prev.orderCount || 0) + '　成交 ' + (prev.dealCount || 0) }),
          el('div', { class: 'visit-meta', text: '成交率 ' + SD.pct(prev.dealRate) + '　下訂率 ' + SD.pct(prev.orderRate) })
        ));

        if (isMgr && data.scope === 'store' && data.staffTable) {
          kids.push(el('div', { class: 'section-title', text: '各業務成績' }));
          var rows = data.staffTable.filter(function (row) {
            var n = (row.stats && row.stats.visitCount) || 0;
            if (row.role === '主管' && n === 0) return false;
            return true;
          }).sort(function (a, b) {
            var av = (a.stats && a.stats.visitCount) || 0;
            var bv = (b.stats && b.stats.visitCount) || 0;
            if (av !== bv) return bv - av;
            return String(a.staffId).localeCompare(String(b.staffId), 'zh-Hant');
          });
          var table = el('div', { class: 'card', style: { padding: '6px 8px' } },
            el('div', { class: 'staff-row staff-head' },
              el('span', { text: '姓名' }),
              el('span', { class: 'n', text: '帶看' }),
              el('span', { class: 'n', text: '下訂' }),
              el('span', { class: 'n', text: '成交' }),
              el('span', { class: 'n', text: '成交率' }),
              el('span', {})
            )
          );
          rows.forEach(function (row) {
            var st = row.stats || {};
            table.appendChild(el('button', { class: 'staff-row', type: 'button', onclick: function () {
              staffId = row.staffId;
              viewingName = row.name;
              refresh();
            } },
              el('span', { class: 'name', text: row.name }),
              el('span', { class: 'n', text: String(st.visitCount || 0) }),
              el('span', { class: 'n', text: String(st.orderCount || 0) }),
              el('span', { class: 'n', text: String(st.dealCount || 0) }),
              el('span', { class: 'n', text: SD.pct(st.dealRate) }),
              el('span', { class: 'chev', text: '›' })
            ));
          });
          kids.push(table);
        }

        SD.setApp([
          SD.topbar(me),
          SD.pageHead('本月我的成績', 'My month', SD.ICO.chart),
          el('div', { class: 'wrap' }, kids)
        ]);
      }

      async function refresh() {
        SD.setApp([SD.topbar(me), SD.bootScreen('載入中…')]);
        try {
          await load();
          render();
        } catch (err) {
          SD.setApp([SD.topbar(me), SD.errorScreen('無法載入本月成績', err.message, refresh)]);
        }
      }

      await refresh();
    }
  });
})();
