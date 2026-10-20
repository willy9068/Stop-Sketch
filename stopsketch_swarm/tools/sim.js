// 물방울 무리 시험판 — 브라우저 없이 물리를 돌려 보는 시뮬레이션 (수치·배치 조정용, 재미 판단 아님)
// 사용: node tools/sim.js
var fs = require('fs'), path = require('path'), vm = require('vm');
var SRC = path.join(__dirname, '..', 'src');
global.Matter = require(path.join(SRC, 'vendor', 'matter.min.js'));
['data.js', 'levels.js', 'rules.js', 'levelcheck.js', 'util.js', 'physics.js', 'props.js', 'level.js', 'drop.js', 'draw.js', 'game.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
});
var D = G.DATA, STEP = D.loop.stepMs;

// 정지 → 그리기 → 재생 (정지 횟수는 시험이라 다시 채움)
function drawLine(game, pts, color, keepStops) {
  G.Game.toggleStop(game);
  game.color = color;
  G.Draw.begin(game, pts[0]);
  for (var k = 1; k < pts.length; k++) {
    var a = pts[k - 1], b = pts[k], n = Math.ceil(G.Rules.dist(a, b) / 4);
    for (var j = 1; j <= n; j++) G.Draw.move(game, { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
  }
  G.Draw.end(game);
  G.Game.toggleStop(game);
  if (!keepStops) G.Rules.rechargeStops(game.stops);
}

function hx(g) { return g.hero.body ? g.hero.body.position.x : Infinity; }

// plans: [{when(g) → true 이면 그림, color, pts, what}]
function play(lv, plans, skip, maxSec) {
  var g = G.Game.create('A', lv, { inkBonus: 0, bottles: {} });
  G.Game.start(g);
  var todo = plans.filter(function (p, i) { return i !== skip; }).map(function (p) { return { p: p }; });
  for (var i = 0; i < (maxSec || 120) * 60 && g.status === 'run'; i++) {
    todo.forEach(function (t) { if (!t.done && t.p.when(g)) { drawLine(g, t.p.pts, t.p.color); t.done = 1; } });
    G.Game.update(g, STEP);
    if (process.env.SIMDBG === lv.id && skip === -1 && i % 45 === 0) {   // 자세히 보기: SIMDBG=w2 node tools/sim.js
      console.log('   ', (i / 60).toFixed(1) + 's', 'E' + Math.round(g.eraserX), G.Game.walking(g).map(function (d) {
        return (d.hero ? 'H' : 's') + Math.round(d.body.position.x) + ',' + Math.round(d.body.position.y) + (d.dir > 0 ? '>' : '<');
      }).join(' '), '| 선', g.lines.map(function (l) { return l.color[0] + (l.body ? Math.round(l.body.position.x) + ',' + Math.round(l.body.position.y) : '-'); }).join(' '),
      '| 결정', g.level.crystals.length, '| 조각', g.fallen.map(function (f) { return Math.round(f.body.position.x) + ',' + Math.round(f.body.position.y) + '@' + f.body.angle.toFixed(2); }).join(' '));
    }
  }
  return g;
}

function report(name, g) {
  console.log(name.padEnd(30), g.status.padEnd(5), (g.failReason || '').padEnd(10), 't=' + (g.timeMs / 1000).toFixed(1) + 's',
    '도착 ' + g.rescued + '/' + g.total, '잃음 ' + g.lost, '정화 ' + Math.round(G.Game.purity(g) * 100) + '%', 'ink=' + Math.round(g.ink),
    g.result ? '별 ' + g.result.stars : '');
}

var PLANS = {
  w1: [
    { what: '틈에 검정 다리', color: 'black', when: function (g) { return hx(g) > 900; }, pts: [{ x: 1340, y: 596 }, { x: 1710, y: 596 }] },
    { what: '가시 구덩이 덮기', color: 'black', when: function (g) { return hx(g) > 1750; }, pts: [{ x: 2150, y: 596 }, { x: 2450, y: 596 }] },
    { what: '절벽 앞 빨강', color: 'red', when: function (g) { return hx(g) > 2500; }, pts: [{ x: 3110, y: 598 }, { x: 3240, y: 598 }] }
  ],
  w2: [
    { what: '우리 벽을 노랑으로', color: 'yellow', when: function (g) { return hx(g) > 450; }, pts: [{ x: 870, y: 592 }, { x: 1140, y: 592 }] },
    { what: '우물 바닥 초록', color: 'green', when: function (g) {
      // 걷는 물방울이 모두 우물 안에 내려오면 (주인공 포함)
      var w = G.Game.walking(g);
      return w.filter(function (d) { return d.body.position.y > 820; }).length >= 7;
    }, pts: [{ x: 1615, y: 895 }, { x: 2105, y: 895 }] },
    { what: '우물 위 검정 다리', color: 'black', when: function (g) {
      var gl = g.lines.filter(function (l) { return l.color === 'green' && l.body; })[0];
      return gl && gl.body.position.y < 500;
    }, pts: [{ x: 1560, y: 596 }, { x: 2170, y: 746 }] },
    { what: '틈 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 2700 && hx(g) < 3000; }, pts: [{ x: 3050, y: 748 }, { x: 3350, y: 748 }] },
    { what: '틈 끝 빨강', color: 'red', when: function (g) { return hx(g) > 2750 && hx(g) < 3000; }, pts: [{ x: 3460, y: 748 }, { x: 3590, y: 748 }] }
  ]
};

console.log('1 아무것도 안 함');
G.LEVELS.forEach(function (lv) { report('  ' + lv.name, play(lv, [], -1, 60)); });

console.log('2 모범 풀이 (핵심 선을 하나씩 빼면 어떻게 되는지)');
G.LEVELS.forEach(function (lv) {
  var plans = PLANS[lv.id];
  if (!plans) return;
  report('  ' + lv.name, play(lv, plans, -1));
  plans.forEach(function (p, i) { report('    - ' + p.what + ' 빼면', play(lv, plans, i)); });
});

// 3. 스킵: 주인공이 도착했을 때 아직 걷는 물방울이 있으면 Enter 로 끝냄 → 그 물방울은 죽은 것 (사용자 결정 2026-10-20)
(function () {
  var lv = { id: 't', name: '시험', ink: 1000, stops: 3, start: { x: 0 }, goal: { x: 600 }, inks: ['black'],
    ground: [{ x0: -400, x1: 2000, top: 600 }],
    props: [{ type: 'wall', x: -300, y: 400, w: 40, h: 200 }, { type: 'drop', x: -150, y: 587 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  g.hero.dir = -1;                                 // 뒤로 출발 → 잠든 물방울을 깨우고 벽에서 돌아 옴 (깨어난 물방울은 뒤따름)
  for (var i = 0; i < 60 * 20 && g.status === 'run' && !g.heroHome; i++) G.Game.update(g, STEP);
  var walking = G.Game.walking(g).length, can = G.Game.canSkip(g);
  G.Game.skip(g);
  console.log('3 스킵: 주인공 도착', g.heroHome, '· 그때 걷는 물방울', walking, '· 스킵 가능', can, '→', g.status, '도착', g.rescued + '/' + g.total, '잃음', g.lost);
})();

// 4. 지우개: 주인공을 왼쪽 벽 쪽에 세워 두면 지우개에 지워져 실패
(function () {
  var lv = { id: 't', name: '시험', ink: 1000, stops: 3, start: { x: 0 }, goal: { x: 3000 }, inks: ['black'], eraser: { pct: 100, delayMs: 0 },
    ground: [{ x0: -900, x1: 4000, top: 600 }], props: [{ type: 'wall', x: -60, y: 300, w: 40, h: 300 }, { type: 'wall', x: 200, y: 300, w: 40, h: 300 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  for (var i = 0; i < 60 * 30 && g.status === 'run'; i++) G.Game.update(g, STEP);
  console.log('4 지우개(속도 100%, 갇힌 주인공)', g.status, g.failReason, 't=' + (g.timeMs / 1000).toFixed(1) + 's');
  var g2 = G.Game.create('A', lv); G.Game.start(g2); G.Game.toggleStop(g2);
  for (i = 0; i < 600; i++) G.Game.update(g2, STEP);
  console.log('  정지 10초 동안 지우개 위치', Math.round(g2.eraserX), '(출발 위치 ' + (0 - D.eraser.startBack) + ', 정지 중엔 안 움직여야 함)');
})();

// 5. 빨아들이기: 선을 빨아들이면 잉크를 전부 돌려받음
(function () {
  var g = G.Game.create('A', G.LEVELS[0]); G.Game.start(g);
  var ink0 = g.ink;
  drawLine(g, [{ x: 200, y: 500 }, { x: 400, y: 500 }], 'black');
  var used = ink0 - g.ink;
  for (var i = 0; i < 60; i++) G.Game.update(g, STEP);   // 떨어짐
  var ln = g.lines[0], p = G.Draw.worldPts(ln)[1];
  var ok = G.Draw.suck(g, p);
  console.log('5 빨아들이기', ok, '쓴 잉크', Math.round(used), '→ 돌려받은 뒤', Math.round(g.ink), '/', ink0, '· 선 수', g.lines.length);
})();
