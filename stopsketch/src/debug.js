// 디버그 패널 (D키): 구간 선택, 시간 배율 전환, 정지 횟수 충전, 충돌 박스 표시, FPS, 모드별 기록
var G = G || {};

G.Debug = {
  state: { open: false, showBoxes: false, fps: 0 },
  el: null,

  init: function (app) {
    var el = document.createElement('div');
    el.id = 'debug';
    el.style.display = 'none';
    document.body.appendChild(el);
    this.el = el;
    var self = this;
    el.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-act');
      if (!a) return;
      if (a.indexOf('mode:') === 0) app.setMode(a.slice(5));
      if (a === 'stops') { G.Rules.rechargeStops(app.game.stops); }
      if (a === 'ink') { app.game.ink = app.game.inkMax; }
      if (a.indexOf('level:') === 0) app.goLevel(+a.slice(6));
      if (a === 'boxes') { self.state.showBoxes = !self.state.showBoxes; }
      if (a === 'reset') { app.restart(); }
      if (a === 'clear') { app.save.stats = {}; G.Save.write(app.save); }
      if (a === 'account' && confirm('잉크 성장(먹은 잉크 병)과 구간 기록을 지울까요?')) app.resetAccount();
      self.refresh(app);
    });
    el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
  },

  toggle: function (app) {
    this.state.open = !this.state.open;
    this.el.style.display = this.state.open ? 'block' : 'none';
    this.refresh(app);
  },

  // FPS 숫자만 바꾼다 (패널 전체를 다시 만들면 버튼 클릭이 씹힐 수 있음)
  tick: function () {
    var f = this.state.open && document.getElementById('dbg-fps');
    if (f) f.textContent = this.state.fps;
  },

  refresh: function (app) {
    if (!this.state.open) return;
    var g = app.game, s = this.state, modes = G.DATA.timeModes;
    var html = '<b>디버그 (D로 닫기)</b>';
    html += '<div>FPS <span id="dbg-fps">' + s.fps + '</span> · 시드 ' + G.DATA.seed + '</div>';
    html += '<div class="row">구간' + (app.testMode ? ' (레벨 툴 테스트)' : '') + '</div><div class="row">';
    app.levels.forEach(function (lv, i) {
      html += '<button data-act="level:' + i + '"' + (app.levelIndex === i ? ' class="on"' : '') + '>' + lv.name + '</button>';
    });
    html += '</div><div class="row">시간 정지 방식 (키 1/2/3)</div><div class="row">';
    Object.keys(modes).forEach(function (k) {
      html += '<button data-act="mode:' + k + '"' + (g.modeKey === k ? ' class="on"' : '') + '>' + modes[k].name + '</button>';
    });
    html += '</div><div class="row">';
    html += '<button data-act="stops">정지 횟수 충전</button>';
    html += '<button data-act="ink">잉크 충전</button>';
    html += '<button data-act="boxes"' + (s.showBoxes ? ' class="on"' : '') + '>충돌 박스</button>';
    html += '<button data-act="reset">구간 다시 (R)</button>';
    html += '</div><div class="row">모드별 기록 (이 브라우저에 저장)</div>';
    html += '<table><tr><th>모드</th><th>시도</th><th>도착</th><th>실패</th><th>평균 정지</th></tr>';
    Object.keys(modes).forEach(function (k) {
      var st = app.save.stats[k] || { tries: 0, clears: 0, fails: 0, stopsUsed: 0 };
      var avg = st.tries ? (st.stopsUsed / st.tries).toFixed(1) : '-';
      html += '<tr><td>' + k + '</td><td>' + st.tries + '</td><td>' + st.clears + '</td><td>' + st.fails + '</td><td>' + avg + '</td></tr>';
    });
    html += '</table><button data-act="clear">기록 지우기</button>';
    var acc = app.account || app.save, rec = acc.records[g.level.data.id];
    html += '<div class="row">계정' + (app.testMode ? ' (테스트: 저장 안 됨)' : '') + ': 잉크 최대량 +' + (acc.inkBonus || 0) +
      ' (먹은 병 ' + Object.keys(acc.bottles || {}).length + '개)' +
      (rec ? ' · 이 구간 최고 별 ' + rec.stars + '개, ' + rec.clears + '/' + rec.tries + '번 성공' : '') + '</div>';
    html += '<button data-act="account">계정 초기화 (잉크 성장·구간 기록)</button>';
    this.el.innerHTML = html;
  }
};
