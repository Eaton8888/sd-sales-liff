/* 使用說明（?view=help，不需綁定） */
(function () {
  var el = SD.el;

  function phone(title, inner) {
    return el('div', { class: 'help-phone', 'aria-hidden': 'true' },
      el('div', { class: 'help-phone-chrome' },
        el('span', { class: 'help-phone-time', text: '9:41' }),
        el('span', { class: 'help-phone-notch' }),
        el('span', { class: 'help-phone-inds', text: '●●●' })
      ),
      el('div', { class: 'help-phone-title', text: title }),
      el('div', { class: 'help-phone-body' }, inner)
    );
  }

  function chip(text, on) {
    return el('span', { class: 'help-chip' + (on ? ' is-on' : ''), text: text });
  }

  function mockReport() {
    return phone('回報看車', [
      el('div', { class: 'help-lab', text: '客戶來源' }),
      el('div', { class: 'help-chips' },
        chip('官方LINE', true), chip('8891'), chip('IG Reels'), chip('過路客')
      ),
      el('div', { class: 'help-lab', text: '客戶熱度' }),
      el('div', { class: 'help-heat' },
        el('div', { class: 'help-heat-opt is-on' },
          el('b', { text: 'A（熱）' }),
          el('span', { text: '很想買，約兩週內有機會' })
        ),
        el('div', { class: 'help-heat-opt' },
          el('b', { text: 'B（溫）' }),
          el('span', { text: '還在比較車款或價格' })
        )
      ),
      el('div', { class: 'help-lab', text: '看車車款' }),
      el('div', { class: 'help-input', text: '範例：BMW 320i' }),
      el('div', { class: 'help-cta', text: '送出回報' }),
      el('div', { class: 'help-chat' },
        el('div', { class: 'help-chat-label', text: '聊天室會留下紀錄卡' }),
        el('div', { class: 'help-flex' },
          el('div', { class: 'help-flex-bar' }),
          el('div', { class: 'help-flex-kicker', text: '回報看車已送出' }),
          el('div', { class: 'help-flex-name', text: '範例客戶' }),
          el('div', { class: 'help-flex-meta', text: 'BMW 320i' }),
          el('div', { class: 'help-flex-tags' },
            el('span', { text: '官方LINE' }),
            el('span', { class: 'is-on', text: '熱度 A' })
          )
        )
      )
    ]);
  }

  function mockToday() {
    function stat(lab, n) {
      return el('div', { class: 'help-stat' },
        el('div', { class: 'help-stat-lab', text: lab }),
        el('div', { class: 'help-stat-n', text: n })
      );
    }
    return phone('今日回報總覽', [
      el('div', { class: 'help-stats' },
        stat('帶看', '3'), stat('再約', '1'), stat('成交', '0')
      ),
      el('div', { class: 'help-lab', text: '待跟進 1 筆' }),
      el('div', { class: 'help-visit' },
        el('div', { class: 'help-visit-name', text: '範例客戶' }),
        el('div', { class: 'help-visit-meta', text: 'BMW 320i　下次聯絡：今天' }),
        el('div', { class: 'help-flex-tags' },
          el('span', { text: '官方LINE' }),
          el('span', { class: 'is-on', text: '熱度 A' })
        )
      ),
      el('div', { class: 'help-lab', text: '今日心得' }),
      el('div', { class: 'help-note', text: '今天下午有一組客人要再來看這台，已約好時間。' }),
      el('div', { class: 'help-cta', text: '送出今日心得' })
    ]);
  }

  function mockStock() {
    function car(title, price, specs) {
      return el('div', { class: 'help-car' },
        el('div', { class: 'help-car-top' },
          el('div', { class: 'help-car-title', text: title }),
          el('div', { class: 'help-car-price' }, price, el('small', { text: ' 萬' }))
        ),
        el('div', { class: 'help-car-specs' }, specs.map(function (s) {
          return el('div', { class: 'help-car-spec' },
            el('b', { text: s[0] }),
            el('span', { text: s[1] })
          );
        })),
        el('div', { class: 'help-cta help-cta-ghost', text: '分享給客戶' })
      );
    }
    return phone('查在庫車', [
      el('div', { class: 'help-lab', text: '搜尋' }),
      el('div', { class: 'help-input', text: '廠牌、價格、車型或車牌' }),
      el('div', { class: 'help-chips' },
        chip('BMW', true), chip('BENZ'), chip('TOYOTA'), chip('100–150萬', true)
      ),
      car('BMW 320i', '128', [['年份', '2020'], ['顏色', '黑色'], ['里程', '4.2 萬']]),
      car('BENZ C300', '148', [['年份', '2019'], ['顏色', '白色'], ['里程', '5.8 萬']])
    ]);
  }

  function section(n, emoji, title, keyword, lines, mock) {
    return el('section', { class: 'help-sec' },
      el('div', { class: 'help-sec-head' },
        el('span', { class: 'help-num', text: String(n) }),
        el('h2', {}, el('span', { class: 'help-emoji', text: emoji + ' ' }), title)
      ),
      el('p', { class: 'help-kw' },
        '在官方帳號輸入「',
        el('b', { text: keyword }),
        '」，點圖卡上的按鈕。'
      ),
      lines.map(function (t) { return el('p', { class: 'help-txt', text: t }); }),
      mock
    );
  }

  SD.renderHelp = function () {
    document.title = '使用說明｜SD上達_業務系統';
    document.documentElement.style.background = '#0a0a0b';
    SD.setApp([
      SD.topbar(null),
      el('div', { class: 'page-head help-head' },
        el('div', {},
          el('h1', { class: 'page-title', text: '使用說明' }),
          el('p', { class: 'page-sub', text: '回報、今日、庫存怎麼用，一次看懂' })
        )
      ),
      el('div', { class: 'wrap help-wrap' },
        section(1, '📝', '回報看車', '回報', [
          '填好客戶來源、A 到 D 熱度和車款後送出。送出後，聊天室會留下一張紀錄卡。'
        ], mockReport()),
        section(2, '📅', '今日回報總覽', '今日', [
          '可查看今天的帶看和待跟進名單，也可以寫今日心得。'
        ], mockToday()),
        section(3, '🚗', '查在庫車', '庫存', [
          '可依廠牌、價格、車型或車牌找車，並把車卡直接分享給客戶。'
        ], mockStock()),
        el('p', { class: 'help-foot', text: '有問題找主管。' })
      )
    ]);
    window.scrollTo(0, 0);
  };
})();
