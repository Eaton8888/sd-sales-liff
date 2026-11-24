/* 今日總結 */
(function () {
  var el = SD.el;

  function badge(kind, value) {
    return el('span', { class: 'badge badge-' + kind + '-' + value, text: (kind === 'heat' ? '熱度 ' : '') + value });
  }

  function visitCard(v, showStaff) {
    return el('article', { class: 'visit' },
      el('div', { class: 'visit-top' },
        el('div', {},
          el('div', { class: 'visit-id', text: v.visitId + (v.createdAt ? '　' + String(v.createdAt).slice(11, 16) : '') }),
          el('div', { class: 'visit-name', text: v.customerName || '（未填稱呼）' })
        )
      ),
      el('div', { class: 'visit-meta', text: [showStaff ? v.staffName : '', v.carModel, v.carPlate, v.stockId, v.customerPhone].filter(Boolean).join(' ｜ ') }),
      v.nextContactDate ? el('div', { class: 'visit-meta', text: '下次聯絡：' + v.nextContactDate }) : null,
      el('div', { class: 'visit-tags' },
        v.customerSource ? el('span', { class: 'badge', text: SD.sourceDisplay(v) }) : null,
        v.heat ? badge('heat', v.heat) : null,
        v.result ? badge('result', v.result) : null
      )
    );
  }

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

  SD.start({
    page: 'today',
    liffId: (window.SD_CONFIG || {}).liffIds.today,
    onReady: async function (ctx) {
      var me = ctx.me;
      var isMgr = me.role === '主管';
      var scope = isMgr ? 'store' : 'self';
      var filterId = '';
      var summary = null;
      var visits = [];
      var note = '';
      var saving = false;
      var staffOptions = [];

      var loading = false;
      var noteDirty = false;
      var seq = 0;
      function cacheName() { return 'today_' + ctx.today() + '_' + scope + '_' + (filterId || ''); }

      function apply(results) {
        summary = results[0];
        var list = results[1];
        visits = list.visits || [];
        if (isMgr && scope === 'store' && !filterId) {
          var map = {};
          (list.visits || []).forEach(function (v) { map[v.staffId] = v.staffName; });
          (list.unreported || []).forEach(function (s) { map[s.staffId] = s.name; });
          staffOptions = Object.keys(map).sort().map(function (id) { return { staffId: id, name: map[id] }; });
        }
        if (!noteDirty) {
          if (summary.dailyNote != null) note = summary.dailyNote;
          else if (scope === 'self') note = summary.dailyNote || note;
        }
      }

      async function fetchData() {
        var payload = { date: ctx.today() };
        if (isMgr && scope === 'self') payload.staffId = filterId || me.staffId;
        if (isMgr && scope === 'store' && filterId) payload.staffId = filterId;
        var listPayload = { date: ctx.today() };
        if (payload.staffId) listPayload.staffId = payload.staffId;
        // 兩個請求同時送，減少等待時間
        // 合併成一次連線
        var listCall = Object.assign({ action: 'listToday' }, listPayload);
        return ctx.batch([Object.assign({ action: 'todaySummary' }, payload), listCall]).then(function (r) {
          if (r[0] instanceof Error) throw r[0];
          if (r[1] instanceof Error) throw r[1];
          return r;
        });
      }

      async function saveNote() {
        var text = (document.getElementById('daily-note') || {}).value || '';
        text = text.trim();
        var banner = document.getElementById('note-err');
        if (!text) {
          banner.textContent = '請填寫今日心得。';
          banner.classList.remove('is-hidden');
          return;
        }
        banner.classList.add('is-hidden');
        var btn = document.getElementById('save-note');
        btn.disabled = true;
        btn.textContent = '儲存中…';
        try {
          var rec = await ctx.api('saveDailyNote', { date: ctx.today(), note: text });
          note = rec.note;
          noteDirty = false;
          ctx.toast(rec.updated ? '今日心得已更新' : '今日心得已儲存');
          if (summary) summary.dailyNote = rec.note;
          try { await SD.postDailyNoteToChat(rec); } catch (chatErr) { console.warn(chatErr); }
        } catch (err) {
          banner.textContent = err.message || '儲存失敗';
          banner.classList.remove('is-hidden');
        } finally {
          btn.disabled = false;
          btn.textContent = '儲存心得';
        }
      }

      function render() {
        var headExtra = [];
        if (isMgr) {
          headExtra.push(el('div', { class: 'tabs' },
            el('button', { class: 'tab' + (scope === 'store' ? ' is-on' : ''), type: 'button', text: '全店', onclick: function () { scope = 'store'; filterId = ''; refresh(); } }),
            el('button', { class: 'tab' + (scope === 'self' ? ' is-on' : ''), type: 'button', text: '個人', onclick: function () { scope = 'self'; filterId = me.staffId; refresh(); } })
          ));
          if (scope === 'store') {
            var sel = el('select', { class: 'select', onchange: function (e) { filterId = e.target.value; refresh(); } });
            sel.appendChild(el('option', { value: '', text: '全部業務' }));
            staffOptions.forEach(function (s) {
              sel.appendChild(el('option', { value: s.staffId, text: s.name + '（' + s.staffId + '）' }));
            });
            sel.value = filterId;
            headExtra.push(el('div', { class: 'field' }, el('label', { class: 'label', text: '篩選業務' }), sel));
          }
        }

        var showStaff = isMgr && !(scope === 'self' && (filterId === me.staffId || !filterId));
        if (isMgr && scope === 'store' && !filterId) showStaff = true;

        if (!summary) {
          SD.setApp([
            SD.topbar(me),
            SD.pageHead('今日總結', 'Today', SD.ICO.cal),
            el('div', { class: 'wrap' }, headExtra, SD.loadingNote('讀取中…'), SD.skeleton(5))
          ]);
          return;
        }

        var kids = headExtra.concat(loading ? [SD.loadingNote('更新中…')] : []).concat([
          el('div', { class: 'stats-3' },
            el('div', { class: 'stat' },
              el('div', { class: 'stat-label', text: '帶看' }),
              el('div', { class: 'stat-num', text: String(summary.visitCount || 0) })
            ),
            el('div', { class: 'stat' },
              el('div', { class: 'stat-label', text: '再約' }),
              el('div', { class: 'stat-num', text: String((summary.resultCounts || {})['再約'] || 0) })
            ),
            el('div', { class: 'stat' },
              el('div', { class: 'stat-label', text: '成交' }),
              el('div', { class: 'stat-num', text: String((summary.resultCounts || {})['成交'] || 0) })
            )
          ),
          el('div', { class: 'section-title', text: '結果分布' }),
          el('div', { class: 'card' }, bars(summary.resultCounts)),
          el('div', { class: 'section-title', text: '客戶來源' }),
          el('div', { class: 'card' }, bars(SD.mergeSourceCounts(summary.sourceCounts))),
          el('div', { class: 'section-title' },
            el('span', { text: '今日待跟進' }),
            el('span', { class: 'count', text: (summary.followUps || []).length + ' 筆' })
          ),
          (summary.followUps && summary.followUps.length)
            ? summary.followUps.map(function (v) { return visitCard(v, showStaff); })
            : el('div', { class: 'empty', text: '今天沒有到期的下次聯絡。' }),
          el('div', { class: 'section-title' },
            el('span', { text: '今日看車列表' }),
            el('span', { class: 'count', text: visits.length + ' 筆' })
          ),
          visits.length ? visits.map(function (v) { return visitCard(v, showStaff); }) : el('div', { class: 'empty', text: '今天還沒有看車紀錄。' })
        ]);

        if (isMgr && scope === 'store' && !filterId) {
          var un = summary.unreported || [];
          kids.push(el('div', { class: 'section-title', text: '尚未回報' }));
          kids.push(un.length
            ? el('div', { class: 'unreported' }, un.map(function (s) { return el('span', { class: 'pill', text: s.name + '（' + s.staffId + '）' }); }))
            : el('div', { class: 'empty', text: '所有業務都已回報。' }));
          var notes = summary.dailyNotes || [];
          kids.push(el('div', { class: 'section-title', text: '今日心得' }));
          if (notes.length) {
            notes.forEach(function (n) {
              kids.push(el('div', { class: 'card note-card' },
                el('div', {},
                  el('span', { class: 'note-who', text: n.staffName }),
                  el('span', { class: 'note-time', text: String(n.createdAt || '').slice(11, 16) })
                ),
                el('div', { class: 'note-text', text: n.note })
              ));
            });
          } else {
            kids.push(el('div', { class: 'empty', text: '還沒有人提交今日心得。' }));
          }
        }

        var canWriteNote = !isMgr || scope === 'self' || (filterId && filterId === me.staffId) || (scope === 'store' && !filterId);
        if (!isMgr || scope === 'self' || (filterId === me.staffId) || (isMgr && scope === 'store' && !filterId)) {
          /* 主管在全店檢視時仍可寫自己的心得 */
          kids.push(el('div', { class: 'section-title', text: isMgr && scope === 'store' && !filterId ? '我的今日心得' : '今日心得' }));
          kids.push(el('div', { class: 'card' },
            el('textarea', { class: 'textarea', id: 'daily-note', maxlength: '2000', placeholder: '今天的狀況、待跟進重點…', oninput: function (e) { note = e.target.value; noteDirty = true; } }, note || ''),
            el('div', { class: 'banner is-hidden', id: 'note-err', style: { marginTop: '12px' } }),
            el('button', { class: 'btn btn-primary btn-block', type: 'button', id: 'save-note', style: { marginTop: '12px' }, text: '儲存心得', onclick: saveNote })
          ));
        }

        SD.setApp([
          SD.topbar(me),
          SD.pageHead('今日總結', 'Today', SD.ICO.cal),
          el('div', { class: 'wrap' }, kids)
        ]);
      }

      function renderKeepFocus() {
        var ae = document.activeElement;
        var fid = ae && ae.id === 'daily-note' ? 'daily-note' : '';
        var a = null, b = null;
        try { if (fid) { a = ae.selectionStart; b = ae.selectionEnd; } } catch (e) {}
        render();
        if (fid) {
          var n = document.getElementById(fid);
          if (n) { try { n.focus({ preventScroll: true }); n.setSelectionRange(a, b); } catch (e) {} }
        }
      }

      // 先顯示上次的資料（或骨架），背景同時拿最新的再更新畫面
      async function refresh() {
        var my = ++seq;
        var name = cacheName();
        var cached = ctx.cacheGet(name);
        summary = null;
        if (cached) apply(cached);
        loading = true;
        renderKeepFocus();
        try {
          var results = await fetchData();
          ctx.cacheSet(name, results);
          if (my !== seq) return;
          apply(results);
          loading = false;
          renderKeepFocus();
        } catch (err) {
          if (my !== seq) return;
          loading = false;
          if (summary) { renderKeepFocus(); ctx.toast('更新失敗：' + (err.message || '請稍後再試')); }
          else SD.setApp([SD.topbar(me), SD.errorScreen('無法載入今日總結', err.message, refresh)]);
        }
      }

      await refresh();
    }
  });
})();
