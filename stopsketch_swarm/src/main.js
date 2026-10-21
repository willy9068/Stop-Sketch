// 시작점: 캔버스, 입력, 고정 타임스텝 루프 — 물방울 무리 시험판
// 조작 (사용자 결정 2026-10-20): 왼쪽 드래그 그리기 · 스페이스 시간 정지 · 우클릭 선 빨아들이기 · 1~5/병 클릭 색 · 휠 줌 · Enter 스킵
//   Esc 일시 정지 (사용자 결정 2026-10-21): 달리는 중에만, 창이 포커스를 잃어도 자동으로. 일시 정지 중엔 Esc·R·D·창 버튼만
var G = G || {};

(function () {
  var D = G.DATA;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  G.Assets.load();
  canvas.width = D.view.w;
  canvas.height = D.view.h;

  var app = {
    save: G.Save.load(),
    game: null,
    // 시간 정지 방식은 A로 확정 (사용자 결정 2026-10-19). B·C 는 비교용으로 Q/W/E, 저장하지 않음
    setMode: function (k) {
      if (!D.timeModes[k]) return;
      G.Game.setMode(app.game, k);
      app.restart();
      app.game.toast(D.timeModes[k].name + ' (구간 다시 시작)');
    },
    restart: function () { G.Game.reset(app.game); G.UI.resetCamera(); },
    // 구간 목록: 보통은 levels.js, 레벨 툴의 "테스트 플레이"는 주소 #test= 로 구간 하나를 넘겨준다
    levels: G.LEVELS.filter(function (l) { return !l.test; }),   // 테스트용 스테이지(test: true)는 게임·제출본에서 숨김 (사용자 결정 2026-10-20)
    levelIndex: 0,
    testMode: false,
    goLevel: function (i) {
      if (!app.levels[i]) return;
      app.levelIndex = i;
      G.Game.setLevel(app.game, app.levels[i]);
      G.UI.resetCamera();
      app.game.hasNext = !!app.levels[i + 1];
      G.Debug.refresh(app);
    }
  };
  var m = /#test=(.+)$/.exec(location.hash);
  if (m) {
    try { app.levels = [JSON.parse(decodeURIComponent(m[1]))]; app.testMode = true; } catch (e) { /* 잘못된 주소면 무시 */ }
  }
  // 계정: 잉크 성장(inkBonus·먹은 병)과 구간 기록. 레벨 툴 테스트는 계정을 건드리지 않게 복사본으로 (저장 안 함)
  app.account = app.testMode ? JSON.parse(JSON.stringify(app.save)) : app.save;
  app.game = G.Game.create(D.defaultTimeMode, app.levels[0], app.account);
  app.game.hasNext = !!app.levels[1];
  if (app.testMode) app.game.toast(G.T('toast.test', { name: app.levels[0].name }));
  function persist() { if (!app.testMode) G.Save.write(app.save); }
  app.game.onAccountChange = function () { persist(); G.Debug.refresh(app); };
  app.game.onFinish = function (g) {
    var st = app.save.stats[g.modeKey] || (app.save.stats[g.modeKey] = { tries: 0, clears: 0, fails: 0, stopsUsed: 0 });
    st.tries += 1;
    st[g.status === 'clear' ? 'clears' : 'fails'] += 1;
    st.stopsUsed += g.stopsUsedThisRun;
    var id = g.level.data.id, rec = app.account.records[id] || (app.account.records[id] = { clears: 0, tries: 0 });
    rec.tries += 1;
    if (g.status === 'clear' && g.result) {       // 최고 기록: 별(모은 별 누적)·정화(최고 %) 따로 (사용자 결정 2026-10-20)
      rec.clears += 1;
      G.Rules.mergeRecord(rec, g.result);
    }
    g.best = rec.clears ? rec : null;
    persist();
    G.Debug.refresh(app);
  };
  // 계정 초기화 (잉크 성장·먹은 병·구간 기록). 시간 정지 방식 설정과 모드별 기록은 남김
  app.resetAccount = function () {
    app.account.inkBonus = 0; app.account.bottles = {}; app.account.records = {};
    persist();
    app.restart();
    app.game.toast('계정 초기화: 잉크 성장·기록을 지웠어요');
  };
  G.Debug.init(app);
  G.app = app;

  // ---- 입력 ----
  function mouseScreen(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * D.view.w / r.width, y: (e.clientY - r.top) * D.view.h / r.height };
  }

  window.addEventListener('keydown', function (e) {
    var g = app.game;
    if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) G.Game.togglePause(g); return; }
    if (g.paused) {
      if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
      if (e.code === 'KeyR') app.restart();
      else if (e.code === 'KeyD') G.Debug.toggle(app);
      return;
    }
    if (e.code === 'Space') {                       // 출발 / 시간 정지 (사용자 결정 2026-10-20)
      e.preventDefault();
      if (e.repeat) return;
      if (g.status === 'ready') G.Game.start(g); else G.Game.toggleStop(g);
      return;
    }
    if (e.code === 'Enter') { e.preventDefault(); if (g.status === 'ready') G.Game.start(g); else G.Game.skip(g); return; }   // 스킵은 data.js goalEnter.skip 이 켜졌을 때만
    if (e.code === 'KeyR') app.restart();
    else if (e.code === 'KeyN') { if (g.status === 'clear' && g.hasNext) app.goLevel(app.levelIndex + 1); }
    else if (e.code === 'KeyD') G.Debug.toggle(app);
    else if (/^[1-9]$/.test(e.key) && D.inks.order[+e.key - 1]) G.Game.setColor(g, D.inks.order[+e.key - 1]);
  });

  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); if (e.deltaY && !app.game.paused) G.UI.wheel(e.deltaY); }, { passive: false });
  // 다른 창·탭으로 가면 자동 일시 정지 (사용자 결정 2026-10-21)
  window.addEventListener('blur', function () { G.Game.pause(app.game); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) G.Game.pause(app.game); });
  canvas.addEventListener('mousedown', function (e) {
    var g = app.game, sp = mouseScreen(e);
    if (g.paused) {                                // 일시 정지 창: 버튼만
      var pa = e.button === 0 && G.UI.resultAt(g, sp.x, sp.y);
      if (pa === 'resume') G.Game.unpause(g);
      else if (pa === 'retry') app.restart();
      return;
    }
    if (e.button === 2) {                          // 우클릭: 선 빨아들이기 (달리는 중에도)
      if (g.status === 'run' && !G.Draw.suck(g, G.UI.toWorld(sp.x, sp.y), D.ink.suckReach / G.UI.cam.z)) g.toast(G.T('toast.noSuck'));
      return;
    }
    if (e.button !== 0) return;
    var bottle = G.UI.inkAt(sp.x, sp.y);
    if (bottle && g.status !== 'clear' && g.status !== 'fail') { G.Game.setColor(g, bottle); return; }
    if (G.Game.canSkip(g) && G.UI.skipAt(sp.x, sp.y)) { G.Game.skip(g); return; }
    if (g.status === 'ready') { G.Game.start(g); return; }
    if (g.status !== 'run') {                      // 결과 창: 버튼을 눌러야 다시 하기 / 다음 스테이지 (사용자 요청 2026-10-21)
      var act = G.UI.resultAt(g, sp.x, sp.y);
      if (act === 'retry') app.restart();
      else if (act === 'next' && g.status === 'clear' && g.hasNext) app.goLevel(app.levelIndex + 1);
      return;
    }
    if (g.ink <= 0 && !g.level.data.infInk) { g.toast(G.T('toast.noInk')); return; }
    G.Draw.begin(g, G.UI.toWorld(sp.x, sp.y));
  });
  window.addEventListener('mousemove', function (e) { G.UI.hover(mouseScreen(e).x, mouseScreen(e).y); if (app.game.stroke) { var sp = mouseScreen(e); G.Draw.move(app.game, G.UI.toWorld(sp.x, sp.y)); } });
  window.addEventListener('mouseup', function (e) { if (e.button === 0) G.Draw.end(app.game); });

  // ---- 루프 (고정 타임스텝) ----
  var last = performance.now(), acc = 0, frames = 0, fpsT = 0;
  function frame(now) {
    var dt = Math.min(250, now - last);
    last = now;
    acc += dt;
    var n = 0;
    while (acc >= D.loop.stepMs && n < D.loop.maxStepsPerFrame) {
      G.Game.update(app.game, D.loop.stepMs);
      acc -= D.loop.stepMs;
      n++;
    }
    if (n === D.loop.maxStepsPerFrame) acc = 0;   // 너무 밀리면 버린다 (탭 전환 등)
    G.UI.render(ctx, app.game, G.Debug.state);

    frames++; fpsT += dt;
    if (fpsT >= 500) {
      G.Debug.state.fps = Math.round(frames * 1000 / fpsT);
      frames = 0; fpsT = 0;
      G.Debug.tick();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
