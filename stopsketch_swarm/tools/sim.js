// 물방울 무리 시험판 — 브라우저 없이 물리를 돌려 보는 시뮬레이션 (수치·배치 조정용, 재미 판단 아님)
// 사용: node tools/sim.js
var fs = require('fs'), path = require('path'), vm = require('vm');
var SRC = path.join(__dirname, '..', 'src');
global.Matter = require(path.join(SRC, 'vendor', 'matter.min.js'));
['data.js', 'uitext.js', 'levels.js', 'rules.js', 'levelcheck.js', 'util.js', 'physics.js', 'props.js', 'level.js', 'drop.js', 'draw.js', 'game.js'].forEach(function (f) {
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
    g.result ? '별 ' + g.result.stars : '', '· 이탈 누적 ' + g.drops.reduce(function (n, d) { return n + (d.detaches || 0); }, 0));
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

// 6. 물방울 속도·서로 충돌 (레벨 툴 스테이지 설정, 2026-10-20)
(function () {
  function run(drops) {
    var lv = { id: 't', name: '시험', ink: 1000, stops: 3, start: { x: 0 }, goal: { x: 3000 }, inks: ['black'], drops: drops,
      ground: [{ x0: -400, x1: 4000, top: 600 }],
      props: [{ type: 'wall', x: -300, y: 400, w: 40, h: 200 }, { type: 'drop', x: 300, y: 587 }, { type: 'wall', x: 900, y: 400, w: 40, h: 200 }] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 240; i++) G.Game.update(g, STEP);    // 4초
    var w = G.Game.walking(g), s = w.filter(function (d) { return !d.hero; })[0];
    return { hero: Math.round(g.hero.body.position.x), small: s ? Math.round(s.body.position.x) : null,
      turns: w.reduce(function (n, d) { return n + d.turns; }, 0), group: s && s.body.collisionFilter.group };
  }
  var a = run({ heroSpeed: 5.2, smallSpeed: 5.2, collide: false, follow: false });
  var b = run({ heroSpeed: 5.2, smallSpeed: 2.6, collide: false, follow: false });
  var c = run({ heroSpeed: 5.2, smallSpeed: 5.2, collide: true, follow: false });
  console.log('6 물방울 설정 (대열 끔, 4초 뒤, 두 벽 사이 왕복)');
  console.log('  기본(통과, 같은 속도)   주인공 x=' + a.hero, '작은 x=' + a.small, '되돌기 합 ' + a.turns, 'group ' + a.group);
  console.log('  작은 물방울 속도 절반   주인공 x=' + b.hero, '작은 x=' + b.small, '되돌기 합 ' + b.turns);
  console.log('  서로 충돌 켬            주인공 x=' + c.hero, '작은 x=' + c.small, '되돌기 합 ' + c.turns, 'group ' + c.group, '(부딪혀 되돌기가 늘어야 정상)');
})();

// 7. 경사·낮은 턱 오르기 (사용자 요청 2026-10-20: 낮은 턱에서 멈추거나 느리게 오름 → 매끄럽게)
(function () {
  function climb(name, ramp, speed) {
    var lv = { id: 't', name: '시험', ink: 2000, stops: 3, start: { x: 0 }, goal: { x: 1900 }, inks: ['black'], drops: { heroSpeed: speed },
      ground: [{ x0: -400, x1: 900, top: 600 }, { x0: 900, x1: 2400, top: 480 }], props: [] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    g.color = 'black'; G.Draw.begin(g, ramp[0]);
    for (var k = 1; k < ramp.length; k++) {
      var a = ramp[k - 1], b = ramp[k], n = Math.ceil(G.Rules.dist(a, b) / 4);
      for (var j = 1; j <= n; j++) G.Draw.move(g, { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
    }
    G.Draw.end(g);
    var minV = 99, t0 = null, t1 = null;
    for (var i = 0; i < 60 * 40 && g.status === 'run'; i++) {
      G.Game.update(g, STEP);
      var p = g.hero.body ? g.hero.body.position : null;
      if (!p) break;
      if (t0 === null && p.x > 450) t0 = i;
      if (t0 !== null && t1 === null && p.x > 960) t1 = i;
      if (t0 !== null && t1 === null) minV = Math.min(minV, Math.abs(g.hero.body.velocity.x));
    }
    var ideal = (960 - 450) / (speed * 60);
    console.log('  ' + (name + ' · 속도 ' + speed).padEnd(30), '오르막 통과', t1 !== null ? ((t1 - t0) / 60).toFixed(2) + 's (평지라면 ' + ideal.toFixed(2) + 's)' : '못 오름', '· 오르는 중 최저 가로 속도', minV.toFixed(2));
  }
  console.log('7 경사·턱 오르기 (높이 120 언덕, 바닥에 걸친 선의 끝 턱 포함)');
  var photo = [{ x: 560, y: 598 }, { x: 640, y: 590 }, { x: 700, y: 575 }, { x: 760, y: 545 }, { x: 830, y: 500 }, { x: 900, y: 478 }, { x: 1000, y: 476 }];
  [5.2, 1.5, 1].forEach(function (sp) {
    climb('완만한 선 (약 20°)', [{ x: 520, y: 598 }, { x: 920, y: 478 }], sp);
    climb('가파른 선 (약 40°)', [{ x: 760, y: 598 }, { x: 920, y: 478 }], sp);
    climb('사진처럼 꺾인 선', photo, sp);
  });
})();

// 8. 대열 (사용자 결정 2026-10-20): 주인공이 깨운 물방울은 발자국을 따라옴. 경사·턱·빨강 튕김도 같은 길로, 뒤에 그린 선에 밀리면 이탈
(function () {
  function stage(props, extra) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black', 'red'],
      drops: { heroSpeed: 1.5, smallSpeed: 1 }, eraser: { pct: 50, delayMs: 600000 },
      ground: [{ x0: -400, x1: 900, top: 600 }, { x0: 900, x1: 3000, top: 480 }],
      props: [{ type: 'drop', x: 120, y: 587 }, { type: 'drop', x: 160, y: 587 }, { type: 'drop', x: 200, y: 587 }, { type: 'drop', x: 240, y: 587 }].concat(props || []) };
    for (var k in extra) lv[k] = extra[k];
    var g = G.Game.create('A', lv); G.Game.start(g);
    drawLine(g, [{ x: 520, y: 598 }, { x: 920, y: 478 }], 'black');          // 언덕 오르막 (20°)
    return g;
  }
  function det(g) { return g.drops.reduce(function (n, d) { return n + (d.detaches || 0); }, 0); }
  function gaps(g) {
    var xs = [g.hero].concat(g.line).filter(function (d) { return d.body; }).map(function (d) { return Math.round(d.body.position.x); });
    return xs.join(' ');
  }
  console.log('8 대열 (주인공 1.5 · 작은 1, 잠든 물방울 4마리, 오르막 선)');
  var g = stage();
  for (var i = 0; i < 60 * 4; i++) G.Game.update(g, STEP);
  console.log('  4초: 대열 ' + g.line.length + ' (붙는 중 ' + g.line.filter(function (d) { return d.mode === 'join'; }).length + ') · x ' + gaps(g));
  for (i = 0; i < 60 * 8; i++) G.Game.update(g, STEP);
  console.log('  12초(오르막 뒤): 대열 ' + g.line.length + ' · 이탈 ' + det(g) + ' · x ' + gaps(g) + ' · 주인공 y ' + Math.round(g.hero.body.position.y));
  for (i = 0; i < 60 * 40 && g.status === 'run'; i++) G.Game.update(g, STEP);
  console.log('  끝: ' + g.status, '도착 ' + g.rescued + '/' + g.total, '잃음 ' + g.lost, '이탈 ' + det(g), '(4/4 · 이탈 0 이어야 정상)');

  // 빨강 튕김: 주인공이 튕긴 궤적을 대열도 같이
  var r = stage([], { ground: [{ x0: -400, x1: 900, top: 600 }, { x0: 1000, x1: 3000, top: 600 }] });
  r.lines.forEach(function (l) { G.Draw.drop(r, l, true); });
  for (i = 0; i < 60 * 3; i++) G.Game.update(r, STEP);
  drawLine(r, [{ x: 760, y: 598 }, { x: 900, y: 598 }], 'red');
  var maxUp = 0;
  for (i = 0; i < 60 * 40 && r.status === 'run'; i++) {
    G.Game.update(r, STEP);
    r.line.forEach(function (d) { if (d.body) maxUp = Math.max(maxUp, 600 - d.body.position.y); });
  }
  console.log('  빨강 튕김(틈 100 건너기): ' + r.status, r.failReason || '', '도착 ' + r.rescued + '/' + r.total, '이탈 ' + det(r), '· 대열 최고 높이 ' + Math.round(maxUp));

  // 주인공이 지나간 뒤 대열 앞에 벽을 그리면 밀려서 이탈 → 혼자 걷다 벽에서 돌아옴 → 주인공이 돌아오면 재합류
  var w = stage([{ type: 'wall', x: 1500, y: 280, w: 40, h: 200 }, { type: 'wall', x: -300, y: 400, w: 40, h: 200 }]);
  for (i = 0; i < 60 * 9; i++) G.Game.update(w, STEP);
  var hx0 = w.hero.body.position.x;
  drawLine(w, [{ x: hx0 - 50, y: 380 }, { x: hx0 - 50, y: 478 }], 'black');
  for (i = 0; i < 60 * 2; i++) G.Game.update(w, STEP);
  var alone = G.Game.walking(w).filter(function (d) { return d.mode === 'free'; }).length;
  console.log('  대열 앞에 벽: 이탈 ' + det(w) + ' · 혼자 걷는 중 ' + alone + ' · 대열 ' + w.line.length);
  for (i = 0; i < 60 * 30 && w.status === 'run'; i++) G.Game.update(w, STEP);
  alone = G.Game.walking(w).filter(function (d) { return d.mode === 'free'; }).length;
  console.log('    → 30초 뒤 (주인공이 두 벽 사이를 오가며 다시 만남): 대열 ' + w.line.length + ' · 혼자 ' + alone + ' · 잃음 ' + w.lost + ' (대열 4 이어야 정상)');
})();

// 9. 다리를 지우면 그 위 대열은 떨어짐 (사용자 요청 2026-10-20: 이탈 직후 공중에서 다시 붙어 따라가던 문제)
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black'],
    drops: { heroSpeed: 3, smallSpeed: 4 }, eraser: { pct: 50, delayMs: 600000 },
    ground: [{ x0: -400, x1: 600, top: 600 }, { x0: 900, x1: 3000, top: 600 }],
    props: [120, 150, 180, 210, 240, 270, 300, 330].map(function (x) { return { type: 'drop', x: x, y: 587 }; }) };
  var g = G.Game.create('A', lv); G.Game.start(g);
  drawLine(g, [{ x: 560, y: 596 }, { x: 940, y: 596 }], 'black');
  var sucked = false, onBridge = 0;
  for (var i = 0; i < 60 * 40 && g.status === 'run'; i++) {
    if (!sucked && g.hero.body.position.x > 960) {
      onBridge = g.line.filter(function (d) { return d.mode === 'line' && d.body.position.x > 610 && d.body.position.x < 890; }).length;
      G.Game.toggleStop(g); G.Draw.suck(g, { x: 750, y: 596 }); G.Game.toggleStop(g); sucked = true;
    }
    G.Game.update(g, STEP);
  }
  console.log('9 다리 지우기 (주인공 3 · 작은 4): 틈 위 근처 대열 ' + onBridge + ' → 잃음 ' + g.lost + ' · 도착 ' + g.rescued + '/' + g.total, g.status, '(틈 위는 떨어지고, 땅 끝에 걸친 물방울만 남아야 정상)');
})();

// 10. 잉크병: 닿은 순서대로 하나씩 들어감 (사용자 요청 2026-10-20)
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 700 }, inks: ['black'],
    drops: { heroSpeed: 3 }, eraser: { pct: 50, delayMs: 600000 }, ground: [{ x0: -400, x1: 1200, top: 600 }],
    props: [100, 130, 160, 190, 220].map(function (x) { return { type: 'drop', x: x, y: 587 }; }) };
  var g = G.Game.create('A', lv); G.Game.start(g);
  var times = [], last = 0;
  for (var i = 0; i < 60 * 30 && g.status === 'run'; i++) {
    G.Game.update(g, STEP);
    var n = g.rescued + (g.heroIn ? 1 : 0);
    if (n > last) { times.push((g.timeMs / 1000).toFixed(2)); last = n; }
  }
  console.log('10 잉크병 들어가기: 들어간 시각 ' + times.join(' ') + ' · 마지막 닿음 ' + (g.lastReachMs / 1000).toFixed(2) + 's · 끝 ' + (g.timeMs / 1000).toFixed(2) + 's', g.status, '정화 ' + Math.round(G.Game.purity(g) * 100) + '%');
})();

// 11. 초록을 벽에 겹쳐 그려도 떠오름 (사용자 요청 2026-10-20)
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['green'],
    drops: { heroSpeed: 1 }, eraser: { pct: 50, delayMs: 600000 }, ground: [{ x0: -400, x1: 3000, top: 600 }],
    props: [{ type: 'wall', x: 400, y: 300, w: 40, h: 300 }, { type: 'platform', x: 700, y: 200, w: 300, h: 20 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  drawLine(g, [{ x: 300, y: 500 }, { x: 600, y: 500 }], 'green');            // 벽을 가로지름
  var ln = g.lines[0], y0 = ln.body.position.y;
  for (var i = 0; i < 60 * 3; i++) G.Game.update(g, STEP);
  var y1 = ln.body.position.y;
  drawLine(g, [{ x: 650, y: 560 }, { x: 900, y: 560 }], 'green');            // 땅에 겹침 → 발판 밑에서 멈춰야
  var l2 = g.lines[1];
  for (i = 0; i < 60 * 8; i++) G.Game.update(g, STEP);
  console.log('11 초록 겹쳐 그리기: 벽 가로지른 선 3초에 ' + Math.round(y0 - y1) + 'px 오름 (0이면 안 됨) · 땅에 겹친 선 멈춘 높이 y=' + Math.round(l2.body.position.y) + ' 떠오르는 중 ' + l2.rising + ' (발판 밑 y≈225 에서 멈춰야)');
})();

// 12. 땅 높이 h (사용자 결정 2026-10-20): 얇은 공중 땅 밑으로는 지나가고 위에는 설 수 있음
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black'],
    drops: { heroSpeed: 3 }, eraser: { pct: 50, delayMs: 600000 },
    ground: [{ x0: -400, x1: 3000, top: 600 }, { x0: 300, x1: 700, top: 450, h: 60 }], props: [] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  for (var i = 0; i < 60 * 6; i++) G.Game.update(g, STEP);
  var under = Math.round(g.hero.body.position.x);
  console.log('12 공중 땅(높이 60) 밑 지나가기: 6초 뒤 x=' + under + ' (900 넘으면 정상, 높이 400이면 벽에 막힘)');
})();

// 13. 노랑: 잉크 절반, 떨어진 조각도 다시 지움 (사용자 요청 2026-10-20)
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black', 'yellow'],
    drops: { heroSpeed: 1 }, eraser: { pct: 50, delayMs: 600000 }, ground: [{ x0: -400, x1: 3000, top: 600 }],
    props: [{ type: 'crystal', x: 400, y: 300, w: 200, h: 10, angle: 0, pin: 'none' }, { type: 'wall', x: -300, y: 400, w: 40, h: 200 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  var ink0 = g.ink;
  drawLine(g, [{ x: 500, y: 250 }, { x: 500, y: 350 }], 'yellow');            // 가운데를 가로질러 칠함 → 두 조각 떨어짐
  var used = ink0 - g.ink;
  for (var i = 0; i < 60 * 3; i++) G.Game.update(g, STEP);
  var n1 = g.fallen.length, w1 = g.fallen.map(function (f) { return Math.round(f.w); }).join('+');
  var f0 = g.fallen[0].body.position;
  drawLine(g, [{ x: f0.x - 60, y: f0.y }, { x: f0.x + 60, y: f0.y }], 'yellow');   // 땅에 떨어진 조각을 따라 칠함
  console.log('13 노랑: 100px 칠하는 데 잉크 ' + Math.round(used) + ' (검정이면 100) · 떨어진 조각 ' + n1 + '개(' + w1 + ') → 다시 칠한 뒤 ' + g.fallen.length + '개(' + g.fallen.map(function (f) { return Math.round(f.w); }).join('+') + ')');
})();

// 14. 물들기 (사용자 결정 2026-10-20): 색 선 위에서 점차 물들고, 내려와 6초 유지 → 3초에 걸쳐 원래 색. 잉크병 색에 섞임
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 1500 }, inks: ['black', 'blue'],
    drops: { heroSpeed: 1 }, eraser: { pct: 50, delayMs: 600000 }, ground: [{ x0: -400, x1: 3000, top: 600 }], props: [{ type: 'drop', x: 60, y: 587 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  drawLine(g, [{ x: 40, y: 597 }, { x: 260, y: 597 }], 'black');
  var log = [];
  for (var i = 1; i <= 60 * 20; i++) {
    G.Game.update(g, STEP);
    if (i % 120 === 0) log.push((i / 60) + 's ' + (g.hero.ta || 0).toFixed(2) + (g.hero.under ? '(' + g.hero.under + ')' : ''));
  }
  var small = g.drops.filter(function (d) { return !d.hero; })[0];
  console.log('14 물들기 (검정 선 220px, 주인공 속도 1): ' + log.join(' · ') + ' · 작은 물방울 세기 ' + (small ? (small.ta || 0).toFixed(2) : '-'));
  for (i = 0; i < 60 * 40 && g.status === 'run'; i++) G.Game.update(g, STEP);
  console.log('   잉크병 색 비율 (정화 ' + Math.round(G.Game.purity(g) * 100) + '%) ' + G.Game.jarMix(G.Game.purity(g)).toFixed(2) + ' · 50% 면 ' + G.Game.jarMix(0.5).toFixed(2) + ' (물방울 색은 안 섞임)', g.status);
})();

// 15. 빨강은 닿자마자 튕기지만 그 뒤로도 천천히 끝까지 물듦 (사용자 요청 2026-10-20)
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 3000 }, inks: ['red'],
    drops: { heroSpeed: 3 }, eraser: { pct: 50, delayMs: 600000 }, ground: [{ x0: -400, x1: 4000, top: 600 }], props: [] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  drawLine(g, [{ x: 100, y: 598 }, { x: 180, y: 598 }], 'red');
  var log = [];
  for (var i = 1; i <= 60 * 4; i++) { G.Game.update(g, STEP); if (i % 30 === 0) log.push((i / 60).toFixed(1) + 's ' + (g.hero.ta || 0).toFixed(2)); }
  console.log('15 빨강 물들기: ' + log.join(' · ') + ' (튕긴 뒤에도 1까지 올라가야 정상)');
})();

// 16. 대열도 빨강에 물듦 (사용자 요청 2026-10-21: 주인공이 빨강에 튕기면 대열 물방울 일부가 안 물들던 문제)
//   주인공은 빨강에 1~2스텝만 닿고, 대열은 발자국을 따라 옮겨져 빨강에 직접 닿지 못함 → 발자국에 밟은 색을 기록해 대열도 물듦
(function () {
  var out = [];
  [2.5, 3, 3.5, 4, 5.2].forEach(function (sp) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black', 'red'],
      drops: { heroSpeed: sp, smallSpeed: sp }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 900, top: 600 }, { x0: 1150, x1: 3000, top: 600 }],
      props: [120, 160, 200, 240, 280, 320, 360, 400].map(function (x) { return { type: 'drop', x: x, y: 587 }; }) };
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 60 * 3; i++) G.Game.update(g, STEP);
    drawLine(g, [{ x: 760, y: 598 }, { x: 900, y: 598 }], 'red');
    var top = {}, passed = {};
    for (i = 0; i < 60 * 40 && g.status === 'run'; i++) {
      G.Game.update(g, STEP);
      g.drops.forEach(function (d, k) { top[k] = Math.max(top[k] || 0, d.ta || 0); if (d.body && d.body.position.x > 900 && d.mode !== 'free') passed[k] = 1; });
    }
    var n = Object.keys(passed).length, miss = Object.keys(passed).filter(function (k) { return top[k] < 0.5; }).length;
    out.push('속도 ' + sp + ': 지나감 ' + n + ' · 안 물듦 ' + miss);
  });
  console.log('16 대열 빨강 물들기: ' + out.join(' · ') + ' (안 물듦 0 이어야 정상)');
})();
