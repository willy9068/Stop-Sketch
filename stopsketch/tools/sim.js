// 브라우저 없이 물리를 돌려 보는 시뮬레이션 (수치 조정용, 결과는 참고만)
// 사용: node tools/sim.js
var fs = require('fs'), path = require('path'), vm = require('vm');
var SRC = path.join(__dirname, '..', 'src');
global.Matter = require(path.join(SRC, 'vendor', 'matter.min.js'));
['data.js', 'levels.js', 'rules.js', 'levelcheck.js', 'util.js', 'physics.js', 'props.js', 'level.js', 'player.js', 'draw.js', 'game.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
});
var D = G.DATA, STEP = D.loop.stepMs;

function run(name, script, maxSec) {
  var game = G.Game.create('A');
  G.Game.start(game);
  var t = 0, steps = (maxSec || 30) * 60;
  for (var i = 0; i < steps && game.status === 'run'; i++) {
    if (script) script(game, i);
    G.Game.update(game, STEP);
    t += STEP;
  }
  var p = game.player.body.position;
  console.log(name.padEnd(28), game.status.padEnd(6), (game.failReason || '').padEnd(8),
    'x=' + p.x.toFixed(0), 'y=' + p.y.toFixed(0), 't=' + (t / 1000).toFixed(1) + 's',
    'ink=' + game.ink.toFixed(0), 'stops=' + game.stops.left, 'turns=' + game.player.turns, 'lines=' + game.lines.length, 'stars=' + G.Game.starsGot(game) + '/' + game.level.stars.length);
  return game;
}

// 선을 월드 좌표 점 목록으로 그리는 도우미 (정지 → 그리기 → 재생)
function drawLine(game, pts) {
  G.Game.toggleStop(game);
  G.Draw.begin(game, pts[0]);
  for (var k = 1; k < pts.length; k++) {
    var a = pts[k - 1], b = pts[k], n = Math.ceil(G.Rules.dist(a, b) / 4);
    for (var j = 1; j <= n; j++) G.Draw.move(game, { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
  }
  G.Draw.end(game);
  G.Game.toggleStop(game);
}

// 달리면서(정지 없이) 작은 틈 ① 위에 짧은 다리를 긋는 도우미 — 점프 대신
function smallBridge(g, st) {
  if (st.sb || g.player.body.position.x < 1000) return;
  G.Draw.begin(g, { x: 1280, y: 604 });
  for (var k = 1; k <= 50; k++) G.Draw.move(g, { x: 1280 + k * 4, y: 604 });
  G.Draw.end(g);
  st.sb = 1;
}

// 1. 아무것도 안 함 → 작은 틈에서 떨어져야 정상
run('1 가만히', null);

// 2. 작은 틈만 짧은 다리로
var st2 = {};
run('2 작은 틈 다리', function (g) { smallBridge(g, st2); });

// 4. 모범 풀이: levels.js 구간 1을 읽어 틈마다 다리, 막는 벽마다 경사로를 그린다 (레벨 툴로 배치를 바꿔도 따라감)
//    틈 위에 별이 있으면 다리를 별 쪽으로 볼록하게 그려 별도 먹는다
(function () {
  var LC = G.LevelCheck, lv = LC.normalize(G.LEVELS[0]);
  var stars = lv.props.filter(function (p) { return p.type === 'star'; });
  var plans = [];
  LC.gaps(lv).forEach(function (gp) {
    var t0 = LC.groundTopAt(lv, gp.x0 - 1), t1 = LC.groundTopAt(lv, gp.x1 + 1), pts = [{ x: gp.x0 - 20, y: t0 + 4 }];
    var s = stars.filter(function (p) { return p.x > gp.x0 && p.x < gp.x1 && p.y > Math.min(t0, t1) - 200; })[0];
    if (s) pts.push({ x: s.x, y: s.y + 40 });
    pts.push({ x: gp.x1 + 20, y: t1 + 4 });
    plans.push({ at: gp.x0 - 350, pts: pts });
  });
  LC.blockingWalls(lv).forEach(function (w) {
    var top = w.y + w.h;
    plans.push({ at: w.x - 1.6 * w.h - 150, pts: [{ x: w.x - 1.6 * w.h, y: top + 4 }, { x: w.x, y: w.y - 4 }] });
  });
  plans.sort(function (a, b) { return a.at - b.at; });
  run('4 모범 풀이(구간 1 자동)', function (g) {
    var x = g.player.body.position.x;
    plans.forEach(function (p) { if (!p.done && x > p.at) { drawLine(g, p.pts); p.done = 1; } });
  }, 40);
  console.log('  (틈 ' + LC.gaps(lv).length + ' · 벽 ' + LC.blockingWalls(lv).length + ' · 레벨 툴 잉크 추정 ' + LC.estimateInk(lv) + ')');
})();

// 6. 정지 없이 달리는 중에 다리만 그리기 (사용자 결정: 진행 중 그리기)
var st6 = {};
run('6 정지 없이 다리 그리기', function (g) {
  var x = g.player.body.position.x;
  smallBridge(g, st6);
  if (!st6.b && x > 1900) {
    G.Draw.begin(g, { x: 2260, y: 604 });
    for (var k = 1; k <= 115; k++) G.Draw.move(g, { x: 2260 + k * 4, y: 604 });
    G.Draw.end(g); st6.b = 1;
  }
});

// 7. 벽에 부딪히면 뒤로 돎 → 다리는 이미 사라져 큰 틈에 떨어져야 함
var st7 = {}, turnX = null;
run('7 벽에서 뒤로 돌기', function (g) {
  var x = g.player.body.position.x;
  smallBridge(g, st7);
  if (!st7.b && x > 1900) { drawLine(g, [{ x: 2260, y: 604 }, { x: 2720, y: 604 }]); st7.b = 1; }
  if (turnX === null && g.player.dir < 0) { turnX = x; console.log('  → 뒤로 돈 위치 x=' + x.toFixed(0) + ' (벽 왼쪽 면 3250)'); }
});

// 8. 시작 왼쪽 끝 벽: 처음부터 왼쪽으로 보내도 떨어지지 않고 돌아옴
run('8 왼쪽 끝 벽에서 돌아옴', function (g, i) { if (i === 0) g.player.dir = -1; }, 3);

// 9. 선 수명: 발판 선은 5초(게임 시간) 뒤 사라지고 물리에서도 빠짐, 완전 정지 중에는 줄지 않음
(function () {
  var g = G.Game.create('A'); G.Game.start(g);
  var nBodies = function () { return G.Physics.allBodies(g.engine).length; };
  var b0 = nBodies();
  G.Draw.begin(g, { x: 1280, y: 604 });                    // 작은 틈 위 다리 (점프 없이 건너게)
  for (var k = 1; k <= 25; k++) G.Draw.move(g, { x: 1280 + k * 8, y: 604 });
  G.Draw.end(g);
  var b1 = nBodies(), i;
  G.Game.toggleStop(g);
  for (i = 0; i < 600; i++) G.Game.update(g, STEP);        // 정지 10초
  var afterStop = g.lines.length;
  G.Game.toggleStop(g);
  for (i = 0; i < 280; i++) G.Game.update(g, STEP);        // 재생 4.7초 (그 사이 다리를 건넘)
  var at47 = g.lines.length;
  for (i = 0; i < 30; i++) G.Game.update(g, STEP);         // +0.5초
  console.log('9 선 수명', g.status, 'x=' + g.player.body.position.x.toFixed(0), '바디', b0, '→', b1, '→', nBodies(),
    '| 정지 10초 뒤 선', afterStop, '| 재생 4.7초 선', at47, '| 5.2초 선', g.lines.length);
})();

// 5. 정지/재생 10번 반복해도 이상 없는지 (선 위에서)
var cnt = 0, st5 = {};
var g5 = run('5 선 위 정지/재생 반복', function (g, i) {
  var x = g.player.body.position.x;
  smallBridge(g, st5);
  if (!st5.b && x > 1900) { drawLine(g, [{ x: 2260, y: 604 }, { x: 2720, y: 604 }]); st5.b = 1; G.Rules.rechargeStops(g.stops); }
  if (x > 2350 && x < 2650 && i % 7 === 0 && cnt < 20) { G.Game.toggleStop(g); G.Rules.rechargeStops(g.stops); cnt++; }
}, 12);

// 10. 잉크 병(계정 영구 성장) · 잉크 웅덩이 · 클리어 평가 (사용자 결정 2026-10-19)
(function () {
  var lv = {
    id: 'simT', name: '시험', ink: 1000, stops: 3, start: { x: 200 }, goal: { x: 1500 }, rate: { timeSec: 10, allStars: true, maxTries: 1 },
    ground: [{ x0: -400, x1: 2000, top: 600 }],
    props: [
      { type: 'inkup', id: 'b1', x: 500, y: 570, size: 60 },
      { type: 'drain', x: 800, y: 586, w: 200, h: 14 },
      { type: 'star', x: 1200, y: 570, size: 56 }
    ]
  };
  var acc = { inkBonus: 0, bottles: {} };
  var g = G.Game.create('A', lv, acc), changes = 0;
  g.onAccountChange = function () { changes++; };
  G.Game.start(g);
  var inkAfterBottle = null, inkBeforeDrain = null;
  for (var i = 0; i < 1200 && g.status === 'run'; i++) {
    G.Game.update(g, STEP);
    var x = g.player.body.position.x;
    if (inkAfterBottle === null && x > 600) inkAfterBottle = g.ink;
    if (inkBeforeDrain === null && x > 760) inkBeforeDrain = g.ink;
  }
  console.log('10 잉크 병·웅덩이·평가', g.status, '| 병: 최대량', lv.ink, '→', g.inkMax, '계정 보너스', acc.inkBonus, '저장 알림', changes,
    '| 웅덩이로 잃은 잉크', Math.round(g.inkDrained), '(', Math.round(inkBeforeDrain), '→', Math.round(g.ink), ')',
    '| 평가 별', g.result && g.result.stars, g.result && g.result.checks.map(function (c) { return (c.ok ? 'O ' : 'X ') + c.label; }).join(' / '));
  // 같은 계정으로 다시: 병은 이미 먹어서 최대량이 처음부터 1300, 병은 다시 못 먹음
  var g2 = G.Game.create('A', lv, acc); G.Game.start(g2);
  for (i = 0; i < 300; i++) G.Game.update(g2, STEP);
  console.log('   같은 계정 두 번째 판: 시작 최대량', g2.inkMax, '· 병 이미 먹음', g2.level.bottles[0].owned, '· 보너스 그대로', acc.inkBonus);
})();

// 11. 색 잉크 구간 2~4 모범 풀이 (사용자 결정 2026-10-19: 구간마다 새 색 하나씩). 핵심 선을 빼면 실패해야 정상
//     레벨 툴로 배치를 바꾸면 이 좌표도 맞춰야 함 (참고용)
(function () {
  function colorLine(game, pts, color) {
    G.Game.toggleStop(game);
    game.color = color;
    G.Draw.begin(game, pts[0]);
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k], n = Math.ceil(G.Rules.dist(a, b) / 4);
      for (var j = 1; j <= n; j++) G.Draw.move(game, { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
    }
    G.Draw.end(game);
    G.Game.toggleStop(game);
    G.Rules.rechargeStops(game.stops);
  }
  var PLANS = {
    s2: [
      { at: 900, color: 'red', pts: [{ x: 1150, y: 602 }, { x: 1290, y: 602 }], what: '절벽 앞 빨강' },
      { at: 2500, color: 'red', pts: [{ x: 2880, y: 332 }, { x: 2990, y: 332 }], what: '틈 앞 빨강' },
      { at: 3420, color: 'red', pts: [{ x: 3600, y: 332 }, { x: 3740, y: 332 }], what: '벽 앞 빨강' }
    ],
    s3: [
      { at: 800, color: 'blue', pts: [{ x: 1150, y: 602 }, { x: 1450, y: 602 }], what: '틈 앞 파랑' },
      { at: 1000, color: 'red', pts: [{ x: 1560, y: 602 }, { x: 1690, y: 602 }], what: '틈 끝 빨강' },
      { at: 2500, color: 'blue', pts: [{ x: 2650, y: 602 }, { x: 2900, y: 602 }], what: '웅덩이 앞 파랑' }
    ],
    s4: [
      { at: 700, color: 'green', pts: [{ x: 1150, y: 470 }, { x: 1420, y: 470 }], what: '발사기 1 초록 지붕' },
      { at: 1700, color: 'red', pts: [{ x: 1900, y: 602 }, { x: 2040, y: 602 }], what: '절벽 앞 빨강' },
      { at: 2700, color: 'green', pts: [{ x: 2950, y: 210 }, { x: 3230, y: 210 }], what: '발사기 2 초록 지붕' },
      { at: 2900, color: 'blue', pts: [{ x: 3000, y: 352 }, { x: 3250, y: 352 }], what: '틈 앞 파랑' },
      { at: 3000, color: 'red', pts: [{ x: 3260, y: 352 }, { x: 3390, y: 352 }], what: '틈 끝 빨강' }
    ]
  };
  function play(lv, plans, skip) {
    var g = G.Game.create('A', lv, { inkBonus: 0, bottles: {} });
    G.Game.start(g);
    var todo = plans.filter(function (p, i) { return i !== skip; }).map(function (p) { return { p: p }; });
    for (var i = 0; i < 60 * 60 && g.status === 'run'; i++) {
      var x = g.player.body.position.x;
      todo.forEach(function (t) { if (!t.done && x > t.p.at) { colorLine(g, t.p.pts, t.p.color); t.done = 1; } });
      G.Game.update(g, STEP);
    }
    return g;
  }
  G.LEVELS.forEach(function (lv) {
    var plans = PLANS[lv.id];
    if (!plans) return;
    var g = play(lv, plans, -1);
    console.log('11 ' + (lv.name + ' 모범 풀이').padEnd(24), g.status.padEnd(6), (g.failReason || '').padEnd(8), 't=' + (g.timeMs / 1000).toFixed(1) + 's',
      'ink=' + Math.round(g.ink), 'stars=' + G.Game.starsGot(g) + '/' + g.level.stars.length, '튕김 ' + g.player.bounces, '막은 투사체 ' + g.blocked);
    plans.forEach(function (p, i) {
      var h = play(lv, plans, i);
      console.log('   ' + ('- ' + p.what + ' 빼면').padEnd(24), h.status.padEnd(6), h.failReason || '');
    });
  });
})();
