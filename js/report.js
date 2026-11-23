/* 回報看車 */
(function () {
  var el = SD.el;

  function badge(kind, value) {
    return el('span', { class: 'badge badge-' + kind + '-' + value, text: (kind === 'heat' ? '熱度 ' : '') + value });
  }

  function visitCard(v, onEdit) {
    var tags = el('div', { class: 'visit-tags' },
      v.customerSource ? el('span', { class: 'badge', text: v.customerSource }) : null,
      v.heat ? badge('heat', v.heat) : null,
      v.result ? badge('result', v.result) : null
    );
    var edit = onEdit ? el('button', {
      class: 'edit-btn', type: 'button', text: '編輯',
      onclick: function (e) { e.preventDefault(); e.stopPropagation(); onEdit(v); }
    }) : null;
    return el('article', { class: 'visit' },
      el('div', { class: 'visit-top' },
        el('div', {},
          el('div', { class: 'visit-id', text: v.visitId + (v.createdAt ? '　' + String(v.createdAt).slice(11, 16) : '') }),
          el('div', { class: 'visit-name', text: v.customerName || '（未填稱呼）' })
        ),
        edit
      ),
      el('div', { class: 'visit-meta', text: [v.carModel, v.stockId, v.budgetRange].filter(Boolean).join(' ｜ ') }),
      v.staffName && onEdit === false ? el('div', { class: 'visit-meta', text: v.staffName + '　' + v.staffId }) : null,
      v.nextContactDate ? el('div', { class: 'visit-meta', text: '下次聯絡：' + v.nextContactDate }) : null,
      tags
    );
  }

  function chips(name, values, current, onChange) {
    var box = el('div', { class: 'chips', role: 'group' });
    values.forEach(function (v) {
      var b = el('button', { class: 'chip' + (v === current ? ' is-on' : ''), type: 'button', text: v });
      b.addEventListener('click', function () { onChange(v === current ? '' : v); });
      box.appendChild(b);
    });
    return box;
  }

  function seg(values, current, onChange) {
    var box = el('div', { class: 'seg', role: 'group' });
    values.forEach(function (v) {
      var b = el('button', { class: 'seg-item' + (v === current ? ' is-on' : ''), type: 'button', text: v });
      b.addEventListener('click', function () { onChange(v); });
      box.appendChild(b);
    });
    return box;
  }

  function emptyForm(today) {
    return {
      visitDate: today, customerName: '', customerPhone: '', customerSource: '',
      carModel: '', stockId: '', budgetRange: '', heat: '', result: '',
      nextContactDate: '', note: ''
    };
  }

  SD.start({
    page: 'report',
    liffId: (window.SD_CONFIG || {}).liffIds.report,
    onReady: async function (ctx) {
      var me = ctx.me;
      var isMgr = me.role === '主管';
      var options = { '客戶來源': [], '客戶熱度': [], '結果': [] };
      var form = emptyForm(ctx.today());
      var editing = null;
      var tab = 'mine';
      var filterId = '';
      var myVisits = [];
      var allVisits = [];
      var staffNames = [];
      var unreported = [];
      var successId = new URLSearchParams(location.search).get('success') || '';

      try {
        options = await ctx.api('options');
      } catch (err) {
        SD.setApp([SD.topbar(me), SD.errorScreen('無法載入選項', err.message)]);
        return;
      }

      async function reloadLists() {
        var mine = await ctx.api('listToday', { date: ctx.today() });
        myVisits = mine.visits || [];
        if (isMgr) {
          var all = await ctx.api('listToday', { date: ctx.today(), staffId: filterId || undefined });
          allVisits = all.visits || [];
          unreported = all.unreported || [];
          var seen = {};
          staffNames = [];
          allVisits.forEach(function (v) {
            if (!seen[v.staffId]) {
              seen[v.staffId] = true;
              staffNames.push({ staffId: v.staffId, name: v.staffName });
            }
          });
        }
      }

      function validate() {
        if (!form.visitDate) return '請填寫看車日期。';
        if (!form.customerName.trim()) return '請填寫客戶稱呼。';
        if (!form.customerSource) return '請選擇客戶來源。';
        if (!form.carModel.trim()) return '請填寫看車車款。';
        if (!form.heat) return '請選擇客戶熱度。';
        if (!form.result) return '請選擇結果。';
        if (form.result === '再約' && !form.nextContactDate) return '結果為「再約」時，請填寫下次聯絡日。';
        if (form.nextContactDate && form.visitDate && form.nextContactDate < form.visitDate) return '下次聯絡日不可早於看車日期。';
        return '';
      }

      async function submit(ev) {
        ev.preventDefault();
        var msg = validate();
        var banner = document.getElementById('form-err');
        if (msg) {
          banner.textContent = msg;
          banner.classList.remove('is-hidden');
          banner.scrollIntoView({ block: 'nearest' });
          return;
        }
        banner.classList.add('is-hidden');
        var btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.textContent = editing ? '儲存中…' : '送出中…';
        var payload = {
          visitDate: form.visitDate,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerSource: form.customerSource,
          carModel: form.carModel.trim(),
          stockId: form.stockId.trim(),
          budgetRange: form.budgetRange.trim(),
          heat: form.heat,
          result: form.result,
          nextContactDate: form.nextContactDate,
          note: form.note.trim()
        };
        try {
          var rec;
          if (editing) rec = await ctx.api('updateVisit', Object.assign({ visitId: editing }, payload));
          else rec = await ctx.api('createVisit', payload);
          successId = rec.visitId;
          editing = null;
          form = emptyForm(ctx.today());
          await reloadLists();
          render();
        } catch (err) {
          banner.textContent = err.message || '送出失敗';
          banner.classList.remove('is-hidden');
          btn.disabled = false;
          btn.textContent = editing ? '儲存修改' : '送出回報';
        }
      }

      function startEdit(v) {
        editing = v.visitId;
        form = {
          visitDate: v.visitDate || ctx.today(),
          customerName: v.customerName || '',
          customerPhone: v.customerPhone || '',
          customerSource: v.customerSource || '',
          carModel: v.carModel || '',
          stockId: v.stockId || '',
          budgetRange: v.budgetRange || '',
          heat: v.heat || '',
          result: v.result || '',
          nextContactDate: v.nextContactDate || '',
          note: v.note || ''
        };
        successId = '';
        tab = 'mine';
        render();
        document.getElementById('visit-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function renderForm() {
        var nextWrap = el('div', { class: 'field' + (form.result === '再約' ? '' : ' is-hidden'), id: 'next-wrap' },
          el('label', { class: 'label', for: 'nextContactDate', text: '下次聯絡日' }, el('span', { class: 'req', text: ' *' })),
          el('input', { class: 'input', type: 'date', id: 'nextContactDate', value: form.nextContactDate, oninput: function (e) { form.nextContactDate = e.target.value; } })
        );
        return el('form', { id: 'visit-form', class: 'card' },
          editing ? el('div', { class: 'ok-banner banner', text: '正在編輯 ' + editing }) : null,
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'visitDate', text: '看車日期' }, el('span', { class: 'req', text: ' *' })),
            el('input', { class: 'input', type: 'date', id: 'visitDate', value: form.visitDate, max: ctx.today(), oninput: function (e) { form.visitDate = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'customerName', text: '客戶稱呼' }, el('span', { class: 'req', text: ' *' })),
            el('input', { class: 'input', id: 'customerName', maxlength: '50', placeholder: '例如 王先生', value: form.customerName, oninput: function (e) { form.customerName = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'customerPhone', text: '客戶電話' }),
            el('input', { class: 'input', id: 'customerPhone', inputmode: 'tel', placeholder: '09xx-xxx-xxx', value: form.customerPhone, oninput: function (e) { form.customerPhone = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '客戶來源' }, el('span', { class: 'req', text: ' *' })),
            chips('source', options['客戶來源'] || [], form.customerSource, function (v) { form.customerSource = v; render(); })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'carModel', text: '看車車款' }, el('span', { class: 'req', text: ' *' })),
            el('input', { class: 'input', id: 'carModel', maxlength: '80', placeholder: '例如 Porsche Macan', value: form.carModel, oninput: function (e) { form.carModel = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'stockId', text: '庫存編號' }),
            el('input', { class: 'input', id: 'stockId', placeholder: '選填', value: form.stockId, oninput: function (e) { form.stockId = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'budgetRange', text: '預算區間' }),
            el('input', { class: 'input', id: 'budgetRange', placeholder: '例如 150–200萬', value: form.budgetRange, oninput: function (e) { form.budgetRange = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '客戶熱度' }, el('span', { class: 'req', text: ' *' })),
            seg(options['客戶熱度'] || ['A', 'B', 'C'], form.heat, function (v) { form.heat = v; render(); })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '結果' }, el('span', { class: 'req', text: ' *' })),
            chips('result', options['結果'] || [], form.result, function (v) {
              form.result = v;
              if (v !== '再約') form.nextContactDate = form.nextContactDate;
              render();
            })
          ),
          nextWrap,
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'note', text: '備註' }),
            el('textarea', { class: 'textarea', id: 'note', maxlength: '2000', placeholder: '選填，例如下次聯絡重點', oninput: function (e) { form.note = e.target.value; } }, form.note)
          ),
          el('div', { class: 'banner is-hidden', id: 'form-err' }),
          el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'submit-btn', text: editing ? '儲存修改' : '送出回報' }),
          editing ? el('button', { class: 'btn btn-ghost btn-block', type: 'button', style: { marginTop: '8px' }, text: '取消編輯', onclick: function () { editing = null; form = emptyForm(ctx.today()); render(); } }) : null
        );
      }

      function renderSuccess() {
        if (!successId) return null;
        return el('div', { class: 'overlay', role: 'dialog', 'aria-label': '回報成功' },
          el('div', { class: 'success-card' },
            SD.svg(SD.ICO.check, 'check ico'),
            el('h2', { text: '回報已送出' }),
            el('p', { class: 'success-id', text: '紀錄編號　' + successId }),
            el('div', { class: 'btn-row' },
              el('button', { class: 'btn btn-primary', type: 'button', text: '再回報一筆', onclick: function () { successId = ''; render(); } }),
              el('button', { class: 'btn btn-ghost', type: 'button', text: '關閉', onclick: function () { ctx.close(); } })
            )
          )
        );
      }

      function listBlock(title, items, withEdit, extra) {
        return el('section', {},
          el('div', { class: 'section-title' },
            el('span', { text: title }),
            el('span', { class: 'count', text: items.length + ' 筆' })
          ),
          extra || null,
          items.length ? items.map(function (v) {
            return visitCard(v, withEdit ? startEdit : false);
          }) : el('div', { class: 'empty', text: '今天還沒有看車紀錄。' })
        );
      }

      function render() {
        var bodyKids = [];
        if (isMgr) {
          bodyKids.push(el('div', { class: 'tabs' },
            el('button', { class: 'tab' + (tab === 'mine' ? ' is-on' : ''), type: 'button', text: '我的回報', onclick: function () { tab = 'mine'; render(); } }),
            el('button', { class: 'tab' + (tab === 'all' ? ' is-on' : ''), type: 'button', text: '全店今日', onclick: function () { tab = 'all'; render(); } })
          ));
        }
        if (tab === 'mine') {
          bodyKids.push(renderForm());
          var mineToday = myVisits.filter(function (v) { return v.staffId === me.staffId; });
          bodyKids.push(listBlock('今日已回報', isMgr ? mineToday : myVisits, true));
        } else {
          var sel = el('select', { class: 'select', onchange: async function (e) {
            filterId = e.target.value;
            await reloadLists();
            render();
          } });
          sel.appendChild(el('option', { value: '', text: '全部業務' }));
          storeStaffOptions(sel);
          if (filterId) sel.value = filterId;
          bodyKids.push(listBlock('全店今日看車', allVisits, false, el('div', { class: 'field' },
            el('label', { class: 'label', text: '篩選業務' }), sel
          )));
          if (unreported.length) {
            bodyKids.push(el('div', { class: 'section-title', text: '尚未回報' }));
            bodyKids.push(el('div', { class: 'unreported' }, unreported.map(function (s) {
              return el('span', { class: 'pill', text: s.name + '（' + s.staffId + '）' });
            })));
          }
        }
        SD.setApp([
          SD.topbar(me),
          SD.pageHead('回報看車', 'Report a visit', SD.ICO.clip),
          el('div', { class: 'wrap' }, bodyKids),
          renderSuccess()
        ]);
        var formEl = document.getElementById('visit-form');
        if (formEl) formEl.addEventListener('submit', submit);
      }

      function storeStaffOptions(sel) {
        var map = {};
        allVisits.forEach(function (v) { map[v.staffId] = v.staffName; });
        unreported.forEach(function (s) { map[s.staffId] = s.name; });
        Object.keys(map).sort().forEach(function (id) {
          sel.appendChild(el('option', { value: id, text: map[id] + '（' + id + '）' }));
        });
      }

      await reloadLists();
      render();
    }
  });
})();
