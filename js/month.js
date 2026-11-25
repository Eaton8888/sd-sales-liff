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

  function goalBlock(goal, stats, first) {
    if (!goal || !goal.set) {
      return el('div', { class: 'empty', text: '尚未設定目標' });
    }
    var rows = [
      [first || '帶看', stats.visitCount, goal.visitGoal, goal.visitProgress],
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

  function statTriple(stats, first) {
    var vs = stats.vsPrevious || {};
    function one(label, num, d) {
      var t = SD.vsText(d);
      return el('div', { class: 'stat' },
        el('div', { class: 'stat-label', text: label }),
        el('div', { class: 'stat-num', text: String(num || 0) }),
        el('div', { class: 'stat-vs ' + t.cls, text: t.text })
      );
    }
    var cancel = stats.cancelCount != null ? stats.cancelCount : ((stats.resultCounts || {})['退訂'] || 0);
    return el('div', { class: 'stats-4' },
      one(first || '帶看', stats.visitCount, vs.visitCount),
      one('下訂', stats.orderCount, vs.orderCount),
      one('成交', stats.dealCount, vs.dealCount),
      one('退訂', cancel, vs.cancelCount)
    );
  }

  SD.start({
    page: 'month',
    liffId: (window.SD_CONFIG || {}).liffIds.month,
    onReady: async function (ctx) {
      var me = ctx.me;
      var isMgr = SD.isManagerRole(me.role);
      var kind = SD.initialKind();
      var updating = false;
      function first() { return kind === 'buy' ? '估車' : '帶看'; }
      function title() { return kind === 'buy' ? '本月收車成績' : '本月賣車成績'; }
      function switchKind(k) { kind = k; staffId = ''; viewingName = ''; refresh(); window.scrollTo(0, 0); }
      var month = ctx.month();
      var maxMonth = ctx.month();
      var staffId = '';
      var viewingName = '';
      var data = null;

      var loading = false;
      var seq = 0;

      function prevDisabled() { return false; }
      function nextDisabled() { return month >= maxMonth; }

      function render() {
        document.title = title() + '｜SD上達_業務系統';
        if (updating) {
          SD.setApp([
            SD.topbar(me),
            SD.pageHead(title(), 'My month', SD.ICO.chart),
            el('div', { class: 'wrap' }, SD.kindSwitch(kind, switchKind), SD.updatingCard())
          ]);
          return;
        }
        if (!data) {
          SD.setApp([
            SD.topbar(me),
            SD.pageHead(title(), 'My month', SD.ICO.chart),
            el('div', { class: 'wrap' },
              SD.kindSwitch(kind, switchKind),
              el('div', { class: 'month-nav' }, el('div', { class: 'label', text: SD.ymLabel(month) })),
              SD.loadingNote('讀取中…'), SD.skeleton(5))
          ]);
          return;
        }
        var stats = data.stats || {};
        var goal = data.goal || stats.goal || { set: false };
        var prevM = data.previousMonth;
        var canNext = !nextDisabled();

        var nav = el('div', { class: 'month-nav' },
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': '上一個月', onclick: function () { month = SD.shiftMonth(month, -1); refresh(); } }, SD.svg(SD.ICO.chevL, 'ico')),
          el('div', { class: 'label', text: SD.ymLabel(month) }),
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': '下一個月', disabled: !canNext, onclick: function () { if (month < maxMonth) { month = SD.shiftMonth(month, 1); refresh(); } } }, SD.svg(SD.ICO.chevR, 'ico'))
        );

        var kids = [SD.kindSwitch(kind, switchKind), nav];
        if (loading) kids.push(SD.loadingNote('更新中…'));

        if (isMgr && data.scope === 'self') {
          kids.push(el('button', { class: 'back-link', type: 'button', text: '← 返回全店', onclick: function () { staffId = ''; viewingName = ''; refresh(); } }));
          kids.push(el('p', { class: 'hint', style: { margin: '0 0 12px' }, text: '檢視：' + (data.staffName || viewingName) + '（' + data.staffId + '）' }));
        }

        kids.push(statTriple(stats, first()));
        kids.push(el('p', { class: 'check-hint', style: { margin: '6px 0 10px' }, text: '每一筆回報都算一次' + first() + '；下訂、成交、退訂另外計算，不會扣掉' + first() + '數。' }));
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
        kids.push(el('div', { class: 'card' }, goalBlock(goal, stats, first())));

        kids.push(el('div', { class: 'section-title', text: '客戶來源' }));
        kids.push(el('div', { class: 'card' }, bars(SD.mergeSourceCounts(data.sourceCounts || stats.sourceCounts))));

        var prev = data.previous || {};
        kids.push(el('div', { class: 'section-title', text: '對照 ' + SD.ymLabel(prevM) }));
        kids.push(el('div', { class: 'card' },
          el('div', { class: 'visit-meta', text: first() + ' ' + (prev.visitCount || 0) + '　下訂 ' + (prev.orderCount || 0) + '　成交 ' + (prev.dealCount || 0) + '　退訂 ' + (prev.cancelCount || 0) }),
          el('div', { class: 'visit-meta', text: '成交率 ' + SD.pct(prev.dealRate) + '　下訂率 ' + SD.pct(prev.orderRate) })
        ));

        if (isMgr && data.scope === 'store' && data.staffTable) {
          kids.push(el('div', { class: 'section-title', text: '各業務成績' }));
          var rows = data.staffTable.filter(function (row) {
            var n = (row.stats && row.stats.visitCount) || 0;
            if (SD.isManagerRole(row.role) && n === 0) return false;
            return true;
          }).sort(function (a, b) {
            var av = (a.stats && a.stats.visitCount) || 0;
            var bv = (b.stats && b.stats.visitCount) || 0;
            if (av !== bv) return bv - av;
            return String(a.staffId).localeCompare(String(b.staffId), 'zh-Hant');
          });
          var table = el('div', { class: 'card', style: { padding: '6px 8px' } },
            el('div', { class: 'staff-row r7 staff-head' },
              el('span', { text: '姓名' }),
              el('span', { class: 'n', text: first() }),
              el('span', { class: 'n', text: '下訂' }),
              el('span', { class: 'n', text: '成交' }),
              el('span', { class: 'n', text: '退訂' }),
              el('span', { class: 'n', text: '成交率' }),
              el('span', {})
            )
          );
          rows.forEach(function (row) {
            var st = row.stats || {};
            table.appendChild(el('button', { class: 'staff-row r7', type: 'button', onclick: function () {
              staffId = row.staffId;
              viewingName = row.name;
              refresh();
            } },
              el('span', { class: 'name', text: row.name }),
              el('span', { class: 'n', text: String(st.visitCount || 0) }),
              el('span', { class: 'n', text: String(st.orderCount || 0) }),
              el('span', { class: 'n', text: String(st.dealCount || 0) }),
              el('span', { class: 'n', text: String(st.cancelCount || 0) }),
              el('span', { class: 'n', text: SD.pct(st.dealRate) }),
              el('span', { class: 'chev', text: '›' })
            ));
          });
          kids.push(table);
        }

        SD.setApp([
          SD.topbar(me),
          SD.pageHead(title(), 'My month', SD.ICO.chart),
          el('div', { class: 'wrap' }, kids)
        ]);
      }

      // 先顯示上次的資料（或骨架），背景拿最新的再更新畫面
      async function refresh() {
        var my = ++seq;
        var payload = { month: month };
        if (staffId) payload.staffId = staffId;
        var forKind = kind;
        var name = (forKind === 'buy' ? 'buymonth_' : 'month_') + month + '_' + (staffId || '');
        data = ctx.cacheGet(name);
        updating = false;
        loading = true;
        render();
        try {
          var fresh = await ctx.api(forKind === 'buy' ? 'buyMonth' : 'monthStats', payload);
          ctx.cacheSet(name, fresh);
          if (my !== seq) return;
          data = fresh;
          loading = false;
          render();
        } catch (err) {
          if (my !== seq) return;
          loading = false;
          if (forKind === 'buy' && SD.isUpdatingError(err)) { updating = true; render(); return; }
          if (data) { render(); ctx.toast('更新失敗：' + (err.message || '請稍後再試')); }
          else SD.setApp([SD.topbar(me), SD.errorScreen('無法載入本月成績', err.message, refresh)]);
        }
      }

      await refresh();
    }
  });
})();
