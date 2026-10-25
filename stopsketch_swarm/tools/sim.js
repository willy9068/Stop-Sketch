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

// 정지 한 번에 여러 선 (strokes: [{color, pts}])
function drawStrokes(game, strokes) {
  G.Game.toggleStop(game);
  strokes.forEach(function (st) {
    game.color = st.color;
    G.Draw.begin(game, st.pts[0]);
    for (var k = 1; k < st.pts.length; k++) {
      var a = st.pts[k - 1], b = st.pts[k], n = Math.ceil(G.Rules.dist(a, b) / 4);
      for (var j = 1; j <= n; j++) G.Draw.move(game, { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
    }
    G.Draw.end(game);
  });
  G.Game.toggleStop(game);
  G.Rules.rechargeStops(game.stops);
}
function hx(g) { return g.hero.body ? g.hero.body.position.x : Infinity; }

// plans: [{when(g) → true 이면 그림, color, pts, what}]
function play(lv, plans, skip, maxSec) {
  var g = G.Game.create('A', lv, { inkBonus: 0, bottles: {} });
  G.Game.start(g);
  var todo = plans.filter(function (p, i) { return i !== skip; }).map(function (p) { return { p: p }; });
  for (var i = 0; i < (maxSec || 120) * 60 && g.status === 'run'; i++) {
    todo.forEach(function (t) { if (!t.done && t.p.when(g)) { if (t.p.strokes) drawStrokes(g, t.p.strokes); else drawLine(g, t.p.pts, t.p.color); t.done = 1; } });
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
  ],
  // 데모 3 (사용자 레벨 2026-10-22) — Claude 플레이 테스트에서 찾은 풀이: 별 2/3 (아래 통로 별 3450,880 빼고) · 정화 100% · 약 53초
  //   선은 떨어지므로 검정 벽은 ㄴ자로 세움. 빨강은 눕혀져 제자리에서 위로만 튐 (공중 앞으로 약 150px)
  d3: [
    { what: '발사기 앞 빨강 1', color: 'red', when: function (g) { return hx(g) > -330; }, pts: [{ x: 400, y: 666 }, { x: 440, y: 666 }] },
    { what: 'ㄴ자 검정 벽', color: 'black', when: function (g) { return hx(g) > -330; }, pts: [{ x: 475, y: 560 }, { x: 475, y: 664 }, { x: 445, y: 664 }] },
    { what: '발사기 앞 빨강 2', color: 'red', when: function (g) { return hx(g) > -330; }, pts: [{ x: 530, y: 666 }, { x: 626, y: 666 }] },
    { what: '절벽 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 1100; }, pts: [{ x: 1610, y: 638 }, { x: 1700, y: 638 }] },
    { what: '절벽 앞 빨강', color: 'red', when: function (g) { return hx(g) > 1100; }, pts: [{ x: 1710, y: 638 }, { x: 1768, y: 638 }] },
    { what: '초록으로 발사기 막기', color: 'green', when: function (g) { return hx(g) > 2450; }, pts: [{ x: 2915, y: 0 }, { x: 2985, y: 0 }] },
    { what: '다리 끝 빨강', color: 'red', when: function (g) { return hx(g) > 2450; }, pts: [{ x: 3020, y: 326 }, { x: 3095, y: 326 }] },
    { what: '가시 위 검정', color: 'black', when: function (g) { return hx(g) > 3650 && hy(g) < 300; }, pts: [{ x: 3680, y: 208 }, { x: 4016, y: 212 }] },
    { what: '벽 앞 빨강', color: 'red', when: function (g) { return hx(g) > 3650 && hy(g) < 300; }, pts: [{ x: 3910, y: 200 }, { x: 4016, y: 200 }] },
    { what: '31도 오르막 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 4060 && hy(g) > 850; }, pts: [{ x: 4250, y: 897 }, { x: 4455, y: 897 }] },
    { what: '틈 위 검정 다리', color: 'black', when: function (g) { return hx(g) > 4700; }, pts: [{ x: 5140, y: 1076 }, { x: 5580, y: 1076 }] },
    { what: '공중 물방울 빨강', color: 'red', when: function (g) { return hx(g) > 4700; }, pts: [{ x: 5420, y: 1068 }, { x: 5480, y: 1068 }] }
  ]
};
function hy(g) { return g.hero.body ? g.hero.body.position.y : -Infinity; }

// 2차 데모 월드 1(검정)·2(파랑) 스테이지 초안 풀이 (Claude 2026-10-23, 2일차). 사용자가 레벨 툴로 다듬으면 여기도 맞춰 고칠 것
function P(pts) { return pts.map(function (p) { return { x: p[0], y: p[1] }; }); }
PLANS.s1_1 = [
  { what: '첫 틈 다리', color: 'black', when: function (g) { return hx(g) > -350; }, pts: P([[260, 494], [520, 494]]) },
  { what: '작은 틈 다리', color: 'black', when: function (g) { return hx(g) > 700; }, pts: P([[1070, 494], [1250, 494]]) }
];
PLANS.s1_2 = [
  { what: '첫 오르막', color: 'black', when: function (g) { return hx(g) > 300; }, pts: P([[420, 496], [700, 394], [760, 394]]) },
  { what: '둘째 오르막', color: 'black', when: function (g) { return hx(g) > 760 && hy(g) < 420; }, pts: P([[920, 396], [1100, 324], [1150, 324]]) }
];
PLANS.s1_3 = [
  { what: '구덩이 오르막', color: 'black', when: function (g) { return hy(g) > 600 && hx(g) > 500; }, pts: P([[640, 636], [1000, 496], [1060, 496]]) },
  { what: '벽 넘는 오르막', color: 'black', when: function (g) { return hx(g) > 1020 && hy(g) < 520; }, pts: P([[1150, 496], [1480, 346], [1540, 346], [1780, 496]]) }
];
PLANS.s1_4 = [
  { what: '위로 휜 다리', color: 'black', when: function (g) { return hx(g) > -350; }, pts: P([[220, 494], [300, 470], [360, 462], [420, 470], [500, 494]]) },
  { what: '첫 오르막', color: 'black', when: function (g) { return hx(g) > 520; }, pts: P([[640, 496], [900, 384], [950, 384]]) },
  { what: '둘째 오르막', color: 'black', when: function (g) { return hx(g) > 1320 && hy(g) > 500; }, pts: P([[1440, 556], [1700, 414], [1750, 414]]) }
];
PLANS.s2_1 = [
  { what: '첫 비탈 앞 파랑', color: 'blue', when: function (g) { return hx(g) > -300; }, pts: P([[210, 494], [395, 494]]) },
  { what: '둘째 비탈 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 650; }, pts: P([[840, 354], [995, 354]]) }
];
PLANS.s2_2 = [
  { what: '긴 파랑 1', color: 'blue', when: function (g) { return hx(g) > -400; }, pts: P([[-300, 494], [380, 494]]) },
  { what: '틈 다리', color: 'black', when: function (g) { return hx(g) > 400; }, pts: P([[1060, 494], [1300, 494]]) },
  { what: '긴 파랑 2', color: 'blue', when: function (g) { return hx(g) > 1250; }, pts: P([[1400, 494], [2050, 494]]) }
];
PLANS.s2_3 = [
  { what: '파랑 다리', color: 'blue', when: function (g) { return hx(g) > -350; }, pts: P([[260, 494], [540, 494]]) },
  { what: '턱 앞 파랑 오르막', color: 'blue', when: function (g) { return hx(g) > 700; }, pts: P([[930, 396], [1100, 326], [1150, 326]]) }
];
PLANS.s2_4 = [
  { what: '긴 파랑', color: 'blue', when: function (g) { return hx(g) > -400; }, pts: P([[-250, 494], [400, 494]]) },
  { what: '파랑 다리', color: 'blue', when: function (g) { return hx(g) > -100; }, pts: P([[440, 494], [760, 494]]) },
  { what: '비탈 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 600; }, pts: P([[800, 494], [1000, 494]]) },
  { what: '턱 넘는 파랑', color: 'blue', when: function (g) { return hx(g) > 1250; }, pts: P([[1420, 346], [1640, 246], [1700, 246], [1820, 354]]) }
];
// 2차 데모 월드 3(빨강)·4(초록) 스테이지 초안 풀이 (Claude 2026-10-23, 3일차). strokes = 정지 한 번에 여러 선
PLANS.s3_1 = [
  { what: '턱 앞 빨강', color: 'red', when: function (g) { return hx(g) > -300; }, pts: P([[580, 496], [700, 496]]) },
  { what: '가시 덮기', color: 'black', when: function (g) { return hx(g) > 300; }, pts: P([[930, 326], [995, 294], [1205, 294], [1270, 326]]) }
];
PLANS.s3_2 = [
  { what: '파랑 도움닫기', color: 'blue', when: function (g) { return hx(g) > -350; }, pts: P([[300, 494], [640, 494]]) },
  { what: '끝 빨강', color: 'red', when: function (g) { return hx(g) > -340; }, pts: P([[645, 496], [700, 496]]) },
  { what: '가시 덮기', color: 'black', when: function (g) { return hx(g) > 1150 && hy(g) < 520; }, pts: P([[1380, 496], [1445, 464], [1805, 464], [1870, 496]]) }
];
PLANS.s3_3 = [
  { what: '첫 빨강', color: 'red', when: function (g) { return hx(g) > -350; }, pts: P([[450, 496], [550, 496]]) },
  { what: '가시 덮기', color: 'black', when: function (g) { return hx(g) > 620 && hy(g) < 300; }, pts: P([[730, 256], [795, 224], [955, 224], [1000, 256]]) },
  { what: '둘째 빨강', color: 'red', when: function (g) { return hx(g) > 640 && hy(g) < 300; }, pts: P([[1040, 256], [1140, 256]]) }
];
PLANS.s3_4 = [
  { what: '파랑 도움닫기', color: 'blue', when: function (g) { return hx(g) > -400; }, pts: P([[250, 494], [545, 494]]) },
  { what: '끝 빨강', color: 'red', when: function (g) { return hx(g) > -390; }, pts: P([[550, 496], [600, 496]]) },
  { what: '턱 앞 빨강', color: 'red', when: function (g) { return hx(g) > 1060 && hy(g) < 520; }, pts: P([[1390, 496], [1490, 496]]) },
  { what: '위 가시 덮기', color: 'black', when: function (g) { return hx(g) > 1060 && hy(g) < 520; }, pts: P([[1630, 276], [1695, 244], [1905, 244], [1970, 276]]) }
];
PLANS.s4_1 = [
  { what: '구덩이 바닥 초록', color: 'green', when: function (g) { return G.Game.walking(g).filter(function (d) { return d.body.position.y > 700; }).length >= 4; }, pts: P([[520, 796], [885, 796]]) }
];
PLANS.s4_2 = [
  { what: '초록 방패', color: 'green', when: function (g) { return hx(g) > -400; }, pts: P([[920, 330], [1080, 330]]) },
  { what: '초록 + 검정 방패', color: 'green', when: function (g) { return hx(g) > -390; }, pts: P([[1420, 330], [1580, 330]]) },
  { what: '검정 얹기', color: 'black', when: function (g) { return hx(g) > -380; }, pts: P([[1420, 318], [1580, 318]]) }
];
PLANS.s4_3 = [
  { what: '구덩이 초록', color: 'green', when: function (g) { return hx(g) > 380; }, pts: P([[465, 760], [885, 760]]) },
  { what: '턱 앞 빨강', color: 'red', when: function (g) { return hx(g) > 905 && hy(g) < 520; }, pts: P([[1040, 496], [1140, 496]]) }
];
PLANS.s4_4 = [
  { what: '초록 + 빨강 방패', strokes: [{ color: 'green', pts: P([[600, 60], [800, 60]]) }, { color: 'red', pts: P([[600, 48], [800, 48]]) }], when: function (g) { return hx(g) > -400; } },
  { what: '구덩이 초록', color: 'green', when: function (g) { return G.Game.walking(g).filter(function (d) { return d.body.position.y > 700; }).length >= 5; }, pts: P([[520, 796], [885, 796]]) },
  { what: '파랑 + 빨강 멀리뛰기', strokes: [{ color: 'blue', pts: P([[1000, 494], [1295, 494]]) }, { color: 'red', pts: P([[1300, 496], [1350, 496]]) }], when: function (g) { return hx(g) > 920 && hy(g) < 520; } }
];
// 2차 데모 월드 5(노랑)·6(모든 물감) 스테이지 초안 풀이 (Claude 2026-10-23, 4일차)
PLANS.s5_1 = [
  { what: '첫 결정 지우기', color: 'yellow', when: function (g) { return hx(g) > -350; }, pts: P([[555, 488], [645, 488]]) },
  { what: '두 결정 한 번에', color: 'yellow', when: function (g) { return hx(g) > 700; }, pts: P([[1000, 488], [1300, 488]]) }
];
PLANS.s5_2 = [
  { what: '우리 아래 지우기', color: 'yellow', when: function (g) { return hx(g) > -350; }, pts: P([[460, 488], [940, 488]]) },
  { what: '틈 다리', color: 'black', when: function (g) { return hx(g) > 300; }, pts: P([[1110, 494], [1490, 494]]) }
];
PLANS.s5_3 = [
  { what: '결정 비탈 지우고 오르막', strokes: [{ color: 'yellow', pts: P([[620, 470], [790, 310]]) }, { color: 'black', pts: P([[440, 496], [800, 294], [850, 294]]) }], when: function (g) { return hx(g) > -350; } },
  // 천장 결정 위로 오르는 검정 오르막 (2026-10-25: 예전 풀이 "천장 기둥 지우기"는 잘린 밑동 + 조각 ≈25px 을 뛰어 천장 위로 올라갔는데,
  //   낮은 턱 점프를 22px 로 줄여 막힘. 천장과 바닥 사이 35px 은 주인공(44)이 못 지나가고, 세 번째 별이 천장 위에 있음)
  { what: '천장 오르막', color: 'black', when: function (g) { return hx(g) > 850 && hy(g) < 320; }, pts: P([[960, 299], [1190, 249]]) }
];
PLANS.s5_4 = [
  { what: '우리 지우기', color: 'yellow', when: function (g) { return hx(g) > -400; }, pts: P([[260, 488], [600, 488]]) },
  { what: '가시 덮기', color: 'black', when: function (g) { return hx(g) > -100; }, pts: P([[650, 496], [715, 464], [935, 464], [1000, 496]]) },
  { what: '결정 문 지우고 빨강', strokes: [{ color: 'yellow', pts: P([[1210, 488], [1290, 488]]) }, { color: 'red', pts: P([[1290, 496], [1390, 496]]) }], when: function (g) { return hx(g) > 700; } },
  { what: '위 결정 지우기', color: 'yellow', when: function (g) { return hx(g) > 1420 && hy(g) < 300; }, pts: P([[1760, 268], [1840, 268]]) }
];
PLANS.s6_1 = [
  { what: '파랑 + 빨강 멀리뛰기', strokes: [{ color: 'blue', pts: P([[300, 444], [640, 444]]) }, { color: 'red', pts: P([[645, 446], [700, 446]]) }], when: function (g) { return hx(g) > -350; } },
  { what: '결정 문 지우기', color: 'yellow', when: function (g) { return hx(g) > 1160 && hy(g) < 470; }, pts: P([[1410, 438], [1490, 438]]) },
  { what: '구덩이 초록', color: 'green', when: function (g) { return G.Game.walking(g).filter(function (d) { return d.body.position.y > 700; }).length >= 5; }, pts: P([[1620, 796], [1985, 796]]) }
];
PLANS.s6_2 = [
  { what: '초록 + 파랑 방패', strokes: [{ color: 'green', pts: P([[420, 330], [580, 330]]) }, { color: 'blue', pts: P([[420, 318], [580, 318]]) }], when: function (g) { return hx(g) > -400; } },
  { what: '초록 + 빨강 방패', strokes: [{ color: 'green', pts: P([[920, 330], [1080, 330]]) }, { color: 'red', pts: P([[920, 318], [1080, 318]]) }], when: function (g) { return hx(g) > -390; } },
  { what: '가시 덮기 + 결정 지우기', strokes: [{ color: 'black', pts: P([[1350, 496], [1415, 464], [1685, 464], [1750, 496]]) }, { color: 'yellow', pts: P([[1860, 488], [1940, 488]]) }], when: function (g) { return hx(g) > 600; } }
];
PLANS.s6_3 = [
  { what: '구덩이 초록', color: 'green', when: function (g) { return hx(g) > 380; }, pts: P([[465, 760], [885, 760]]) },
  { what: '우리 지우기', color: 'yellow', when: function (g) { return hx(g) > 400; }, pts: P([[960, 488], [1240, 488]]) },
  { what: '비탈 앞 파랑', color: 'blue', when: function (g) { return hx(g) > 1000 && hy(g) < 520; }, pts: P([[1140, 494], [1300, 494]]) },
  { what: '파랑 + 빨강 멀리뛰기', strokes: [{ color: 'blue', pts: P([[1550, 344], [1845, 344]]) }, { color: 'red', pts: P([[1850, 346], [1900, 346]]) }], when: function (g) { return hx(g) > 1320 && hy(g) < 420; } },
  { what: '턱 앞 빨강', color: 'red', when: function (g) { return hx(g) > 2360 && hy(g) < 370; }, pts: P([[2690, 346], [2790, 346]]) }
];

console.log('1 아무것도 안 함');
G.LEVELS.forEach(function (lv) { report('  ' + lv.name, play(lv, [], -1, 60)); });

console.log('2 모범 풀이 (핵심 선을 하나씩 빼면 어떻게 되는지)');
G.LEVELS.forEach(function (lv) {
  var plans = PLANS[lv.id];
  if (!plans) return;
  report('  ' + lv.name, play(lv, plans, -1));
  plans.forEach(function (p, i) { report('    - ' + p.what + ' 빼면', play(lv, plans, i)); });
});

// 3. 주인공 도착 (사용자 결정 2026-10-21: 스킵 끔): 주인공이 도착하면 이탈해 혼자 걷던 물방울은 죽은 것, 대열은 마저 들어가고 결과 창
(function () {
  var lv = { id: 't', name: '시험', ink: 1000, stops: 3, start: { x: 0 }, goal: { x: 600 }, inks: ['black'], drops: { follow: true },
    ground: [{ x0: -1400, x1: 2000, top: 600 }],
    props: [{ type: 'drop', x: 60, y: 587 }, { type: 'drop', x: 100, y: 587 },
      { type: 'wall', x: -1300, y: 400, w: 40, h: 200 }, { type: 'wall', x: -900, y: 400, w: 40, h: 200 }] };   // 두 벽 사이에 가둔 이탈 물방울
  var g = G.Game.create('A', lv); G.Game.start(g);
  for (var i = 0; i < 60; i++) G.Game.update(g, STEP);
  var lone = g.line[0];                            // 1초 뒤 하나를 이탈시켜 두 벽 사이로 보냄
  if (lone) { G.Game.detach(g, lone); lone.dir = -1; G.Physics.M.Body.setPosition(lone.body, { x: -1100, y: 580 }); }
  for (i = 0; i < 60 * 30 && g.status === 'run' && !g.heroHome; i++) G.Game.update(g, STEP);
  var alone = G.Game.walking(g).filter(function (d) { return d.mode === 'free'; }).length, can = G.Game.canSkip(g);
  for (i = 0; i < 60 * 10 && g.status === 'run'; i++) G.Game.update(g, STEP);
  console.log('3 주인공 도착:', g.heroHome, '· 도착 직후 남은 이탈 물방울', alone, '· 스킵 가능', can, '→', g.status, '도착', g.rescued + '/' + g.total, '잃음', g.lost, '(남은 이탈 0 · clear 1/2 잃음 1 · 스킵 false 이어야 정상)');
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
  console.log('7 경사·턱 오르기 (높이 120 언덕, 바닥에 걸친 선의 끝 턱 포함) — 2026-10-21부터 30도 넘는 오르막은 도움 없이 "못 오름"이 정상 (약 17° 완만한 선만 통과)');
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

// 17. 비탈 땅 (사용자 요청 2026-10-21: 레벨 툴에서 땅 경사). 오르막·내리막 30도까지 주인공·대열이 넘어가는가
(function () {
  var out = [];
  [-30, -15, 15, 30].forEach(function (a) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2400 }, inks: ['black'],
      drops: { heroSpeed: 3, smallSpeed: 3 }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 600, top: 600 }, { x0: 600, x1: 1400, top: 600, angle: a }, { x0: 1400, x1: 3000, top: 600 }], props: [] };
    var s = G.LevelCheck.groundShape(lv.ground[1]);
    lv.ground[0].top = s.l; lv.ground[2].top = s.r; lv.start.y = s.l;
    lv.props = [100, 140].map(function (x) { return { type: 'drop', x: x, y: s.l - 13 }; });
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 60 * 40 && g.status === 'run'; i++) G.Game.update(g, STEP);
    out.push(a + '도 ' + g.status + ' ' + g.rescued + '/' + g.total);
  });
  console.log('17 비탈 땅: ' + out.join(' · ') + ' (모두 clear 2/2 이어야 정상)');
})();

// 18. 오르막 속도 규칙 (사용자 결정 2026-10-21): 30도까지는 느리지만 스스로 오름, 31도부터는 미끄러져 못 오름 → 파랑 가속이 있으면 60도 아래는 넘음
(function () {
  function slope(a, len, boost) {
    var w = len * Math.cos(a * Math.PI / 180);
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2500 }, inks: ['black', 'blue'], drops: { heroSpeed: 3 }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 600, top: 600, h: 900 }, { x0: 600, x1: 600 + w, top: 600, angle: -a, h: 900 }, { x0: 600 + w, x1: 3400, top: 600, h: 900 }], props: [] };
    var s = G.LevelCheck.groundShape(lv.ground[1]);
    lv.ground[0].top = s.l; lv.ground[2].top = s.r; lv.start.y = s.l;
    var g = G.Game.create('A', lv); G.Game.start(g);
    if (boost) drawLine(g, [{ x: 300, y: s.l - 2 }, { x: 560, y: s.l - 2 }], 'blue');
    var t0 = null, t1 = null;
    for (var i = 0; i < 60 * 25 && g.status === 'run' && g.hero.body; i++) {
      G.Game.update(g, STEP);
      if (!g.hero.body) break;
      var x = g.hero.body.position.x;
      if (t0 === null && x > 600) t0 = i;
      if (t1 === null && x > 600 + w) t1 = i;
    }
    return t1 === null ? '못 넘음' + (g.hero.dir < 0 ? '→되돌아섬' : '') : '속도 ' + (len / 3 / (t1 - t0) * 100).toFixed(0) + '%';
  }
  var out = [0, 10, 20, 30, 31, 45].map(function (a) { return a + '° ' + slope(a, 300); });
  var help = [[35, 120], [45, 100], [60, 80]].map(function (c) { return c[0] + '° ' + slope(c[0], c[1], true); });
  console.log('18 오르막 (길이 300, 평지 대비 속도): ' + out.join(' · ') + '\n   파랑 가속 (짧은 비탈): ' + help.join(' · ') + ' (30도까지 넘고 31도부터 못 넘고 되돌아섬, 가속하면 45도까지 넘고 60도는 못 넘어야 정상)');
})();

// 19. 초록 위에 그린 선도 같이 떠오름 (사용자 요청 2026-10-21: 초록 위에 다른 색 선을 그리면 멈추던 문제). 위에 발판이 있으면 거기서 같이 멈춤
(function () {
  function run(ceiling) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: -300 }, goal: { x: 2600 }, inks: ['black', 'green', 'red'], eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 3000, top: 600 }], props: ceiling ? [{ type: 'platform', x: 300, y: 300, w: 400, h: 28 }] : [] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    G.Game.toggleStop(g);                          // 정지 중에 초록 → 그 위에 빨강 → 그 위에 검정 (쌓기)
    [['green', 560], ['red', 548], ['black', 536]].forEach(function (c) {
      g.color = c[0]; G.Draw.begin(g, { x: 400, y: c[1] });
      for (var x = 404; x <= 600; x += 4) G.Draw.move(g, { x: x, y: c[1] });
      G.Draw.end(g);
    });
    G.Game.toggleStop(g);
    for (var i = 0; i < 60 * 6; i++) G.Game.update(g, STEP);
    return g.lines.map(function (l) { return l.color[0] + Math.round(l.body.position.y); }).join(' ');
  }
  console.log('19 초록 위에 쌓은 선: 막힘 없음 ' + run(false) + ' · 위에 발판(y 300~328) ' + run(true) + ' (셋 다 함께 올라가야 정상, 발판이면 그 밑에서 멈춤)');
})();

// 20. 초록 엘리베이터에 탄 대열 (사용자 결정 2026-10-21): 우물 바닥에서 초록을 그려 올라와도 대열 그대로(이탈 0).
//     벽 모서리에 걸쳐 그린 아치를 얹어도 초록이 멈추지 않음(원래 닿아 있던 벽·땅은 무시)
(function () {
  function well(gy, arch) {
    var lv = { id: 't', name: '시험', ink: 5000, stops: 9, start: { x: 800, y: 600 }, goal: { x: 3000, y: 760 }, inks: ['black', 'green'],
      drops: { heroSpeed: 2.5, smallSpeed: 2.5, follow: true, gap: 32 }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -700, x1: 1150, top: 600, h: 400 }, { x0: 1150, x1: 1310, top: 900, h: 400 }, { x0: 1310, x1: 3910, top: 760, h: 440 }],
      props: [{ type: 'drop', x: 900, y: 587 }, { type: 'drop', x: 940, y: 587 }, { type: 'drop', x: 980, y: 587 }] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 60 * 6; i++) G.Game.update(g, STEP);
    var d0 = g.drops.reduce(function (n, d) { return n + (d.detaches || 0); }, 0);
    G.Game.toggleStop(g);
    function line(pts, c) { g.color = c; G.Draw.begin(g, pts[0]); pts.slice(1).forEach(function (p) { G.Draw.move(g, p); }); G.Draw.end(g); }
    var gp = []; for (var x = 1110; x <= 1350; x += 4) gp.push({ x: x, y: gy });
    line(gp, 'green');
    if (arch) line([{ x: 1280, y: gy - 4 }, { x: 1285, y: 850 }, { x: 1290, y: 800 }, { x: 1300, y: 760 }, { x: 1310, y: 740 }, { x: 1320, y: 760 }, { x: 1330, y: 800 }, { x: 1340, y: gy - 4 }], 'black');
    G.Game.toggleStop(g);
    var gl = g.lines[0], y0 = gl.body.position.y;
    for (i = 0; i < 60 * 4; i++) G.Game.update(g, STEP);
    var det = g.drops.reduce(function (n, d) { return n + (d.detaches || 0); }, 0) - d0;
    return '오른 높이 ' + Math.round(y0 - gl.body.position.y) + ' · 대열 ' + g.line.length + ' · 이탈 ' + det;
  }
  console.log('20 초록 엘리베이터: 바닥 높이 ' + well(897) + ' / 바닥 밑 ' + well(930) + ' / 아치 얹음 ' + well(930, true) +
    ' (오른 높이 약 288, 앞 둘은 이탈 0 · 대열 3. 아치는 우물 안에 다리가 서서 처음에 밀려 이탈할 수 있음)');
})();

// 21. 가파른 비탈 아래 끝에서 되돌아섬 (사용자 요청 2026-10-21: 데모 2 계곡, 60도 비탈 아래에서 한쪽으로만 가려던 문제)
//     원 접점이 다각형이라 60도 면이 약 65도로 읽혀 "낮은 턱" 판정 → 바닥과 같이 밟으면 턱 올라타기 보조가 끝없이 반복됐음. 긴 면이면 벽처럼 되돌아섬
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 450, y: 912 }, goal: { x: 3000, y: 818 }, inks: ['black'], drops: { heroSpeed: 2.5 }, eraser: { pct: 1, delayMs: 600000 },
    ground: [{ x0: -700, x1: 180, top: 600, h: 540 }, { x0: 180, x1: 361, top: 756.134, h: 383.866, angle: 60 }, { x0: 360, x1: 540, top: 912, h: 300 },
      { x0: 540, x1: 620, top: 866, h: 346, angle: -50 }, { x0: 620, x1: 3400, top: 818, h: 393 }], props: [] };
  var g = G.Game.create('A', lv); G.Game.start(g); g.hero.dir = -1;
  var minX = 1e9, maxX = -1e9, turns0 = 0;
  for (var i = 0; i < 60 * 20 && g.status === 'run'; i++) {
    G.Game.update(g, STEP);
    if (i > 60 * 2) { minX = Math.min(minX, g.hero.body.position.x); maxX = Math.max(maxX, g.hero.body.position.x); }
  }
  console.log('21 계곡 (왼쪽 60도·오른쪽 50도): 되돌기 ' + g.hero.turns + '번 · 오간 범위 x ' + Math.round(minX) + '~' + Math.round(maxX) + ' (양쪽 비탈 아래에서 되돌아 오가야 정상, 되돌기 여러 번)');
})();

// 22. 정지 중에 노랑을 여러 번 그으면 재생할 때 모두 지움 (사용자 요청 2026-10-21: 2개 그으면 하나만 지워지던 문제)
//     원인: 재생할 때 기다리던 선을 차례로 켜는데, 노랑은 켜자마자 목록에서 빠져 바로 다음 선을 건너뛰었음
(function () {
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 0 }, goal: { x: 2600 }, inks: ['black', 'yellow'], eraser: { pct: 1, delayMs: 600000 },
    ground: [{ x0: -400, x1: 3000, top: 600 }],
    props: [{ type: 'crystal', x: 300, y: 400, w: 100, h: 10, angle: 0, pin: 'both' }, { type: 'crystal', x: 600, y: 400, w: 100, h: 10, angle: 0, pin: 'both' },
      { type: 'crystal', x: 900, y: 400, w: 100, h: 10, angle: 0, pin: 'both' }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  G.Game.toggleStop(g);
  [350, 650, 950].forEach(function (x) {         // 배치된 선 셋의 가운데를 노랑으로 하나씩
    g.color = 'yellow'; G.Draw.begin(g, { x: x, y: 380 });
    for (var y = 384; y <= 420; y += 4) G.Draw.move(g, { x: x, y: y });
    G.Draw.end(g);
  });
  var before = g.level.crystals.length, pending = g.lines.length;
  G.Game.toggleStop(g);
  var pieces = g.level.crystals.length;           // 가운데를 지우면 배치된 선 하나가 양 끝 두 조각으로 (양쪽 못 박힘)
  console.log('22 노랑 여러 번: 기다리던 노랑 ' + pending + '개 → 재생 뒤 남은 노랑 ' + g.lines.length + ' · 배치된 선 ' + before + '개 → 조각 ' + pieces + '개 (노랑 0 · 조각 6 이어야 정상)');
})();

// 23. 발밑이 사라지면 대열에 남은 채 떨어짐 (사용자 결정 2026-10-21, grill me): 초록 엘리베이터를 타고 오르다 우클릭으로 회수 →
//     그냥 떨어지면 이탈 0 · 착지 뒤 자기 자리로 복귀해 대열 3. 떨어지는 곳에 빨강이 있으면 튕겨서 이탈
(function () {
  function well(red, w) {
    var lv = { id: 't', name: '시험', ink: 5000, stops: 9, start: { x: 800, y: 600 }, goal: { x: 3000, y: 760 }, inks: ['black', 'green', 'red'],
      drops: { heroSpeed: 2.5, smallSpeed: 2.5, follow: true, gap: 32 }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -700, x1: 1150, top: 600, h: 400 }, { x0: 1150, x1: 1150 + w, top: 900, h: 400 }, { x0: 1150 + w, x1: 3910, top: 760, h: 440 }],
      props: [{ type: 'drop', x: 900, y: 587 }, { type: 'drop', x: 940, y: 587 }, { type: 'drop', x: 980, y: 587 }] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 60 * 6; i++) G.Game.update(g, STEP);
    var gp = []; for (var x = 1110; x <= 1190 + w; x += 4) gp.push({ x: x, y: 897 });
    drawLine(g, gp, 'green');
    for (i = 0; i < 60 * 2 || (i < 60 * 8 && Math.abs(g.hero.body.position.x - 1150 - w / 2) > 20); i++) G.Game.update(g, STEP);   // 140px 넘게 오른 뒤 주인공이 우물 가운데일 때
    if (red) drawLine(g, [{ x: 1150, y: 897 }, { x: 1150 + w, y: 897 }], 'red');
    var gl = g.lines[0], fell = 0;
    G.Draw.suck(g, { x: gl.body.position.x, y: gl.body.position.y }, 200);
    for (i = 0; i < 60 * 4; i++) { G.Game.update(g, STEP); fell = Math.max(fell, g.line.filter(function (d) { return d.mode === 'fall'; }).length); }
    var det = g.drops.reduce(function (n, d) { return n + (d.detaches || 0); }, 0);
    return '떨어진 대열 ' + fell + ' · 이탈 ' + det + ' · 대열 ' + g.line.filter(function (d) { return d.mode === 'line'; }).length;
  }
  console.log('23 대열에 남은 채 떨어짐: 넓은 우물 ' + well(false, 700) + ' / 좁은 우물(벽 옆면에 부딪힘) ' + well(false, 160) + ' / 빨강 위로 ' + well(true, 700) +
    '\n   (넓은 우물: 이탈 0 · 대열 3, 좁은 우물·빨강: 이탈 1 이상이어야 정상. 이탈한 물방울도 주인공에 닿으면 다시 붙음)');
})();

// 24. 발사기 (사용자 결정 2026-10-22): 투사체에 색이 있고 같은 색 선에만 막힘. 주인공이 맞으면 실패
//     위에서 아래로 쏘는 발사기 밑을 지나감. 발판 둘 위에 선을 걸쳐 지붕을 만듦 (선은 떨어지므로 받침 필요)
(function () {
  function run(shot, roof) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 200 }, goal: { x: 1400 }, inks: ['black', 'red', 'green'], eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 1800, top: 600 }],
      props: [{ type: 'shooter', x: 600, y: 250, w: 70, h: 70, aim: 90, periodMs: 200, speed: 5, firstMs: 0, shot: shot },
        { type: 'platform', x: 520, y: 450, w: 40, h: 28 }, { type: 'platform', x: 710, y: 450, w: 40, h: 28 }] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    if (roof) drawLine(g, [{ x: 525, y: 440 }, { x: 745, y: 440 }], roof);
    for (var i = 0; i < 60 * 12 && g.status === 'run'; i++) G.Game.update(g, STEP);
    return roof ? shot + ' 투사체 + ' + roof + ' 지붕: ' + g.status + (g.failReason ? '(' + g.failReason + ')' : '') + ' 막힘 ' + g.blocked
                : shot + ' 투사체, 지붕 없음: ' + g.status + (g.failReason ? '(' + g.failReason + ')' : '');
  }
  console.log('24 발사기: ' + [run('black'), run('black', 'black'), run('black', 'red'), run('green', 'green')].join(' · ') +
    '\n   (지붕 없음·다른 색 지붕은 fail(투사체), 같은 색 지붕은 clear · 막힘 여러 개여야 정상)');
})();

// 25. 잉크 병 (사용자 결정 2026-10-22): 먹으면 이 스테이지에서만 최대량·남은 양 +300 (병마다 amount), 다시 하면 원래대로 + 병이 다시 나타남
(function () {
  var lv = { id: 't', name: '시험', ink: 1000, stops: 9, start: { x: 200 }, goal: { x: 1400 }, inks: ['black'], eraser: { pct: 1, delayMs: 600000 },
    ground: [{ x0: -400, x1: 1800, top: 600 }], props: [{ type: 'inkup', x: 500, y: 570, size: 60 }, { type: 'inkup', x: 700, y: 570, size: 60, amount: 150 }] };
  var g = G.Game.create('A', lv); G.Game.start(g);
  for (var i = 0; i < 60 * 3; i++) G.Game.update(g, STEP);
  var got = g.inkMax + '/' + Math.round(g.ink);
  G.Game.reset(g);
  console.log('25 잉크 병: 둘 먹은 뒤 최대/남은 ' + got + ' · 다시 하기 ' + g.inkMax + '/' + Math.round(g.ink) + ' · 병 ' + g.level.items.filter(function (it) { return !it.got; }).length + '개 다시 보임' +
    ' (1450/1450 → 1000/1000 · 2개여야 정상)');
})();

// 26. 지우개 끄기 (레벨 툴 테스트용, 사용자 요청 2026-10-22): 벽 사이를 오가는 주인공이 켜면 지워지고, 끄면 30초 뒤에도 안 지워짐
(function () {
  function run(off) {
    var lv = { id: 't', name: '시험', ink: 1000, stops: 9, start: { x: 300 }, goal: { x: 3000 }, inks: ['black'], noEraser: off, eraser: { pct: 50, delayMs: 1000 },
      ground: [{ x0: -400, x1: 3400, top: 600 }], props: [{ type: 'wall', x: 100, y: 450, w: 40, h: 150 }, { type: 'wall', x: 700, y: 450, w: 40, h: 150 }] };
    var g = G.Game.create('A', lv); G.Game.start(g);
    for (var i = 0; i < 60 * 30 && g.status === 'run'; i++) G.Game.update(g, STEP);
    return (off ? '끔' : '켬') + ' ' + g.status + (g.failReason ? '(' + g.failReason + ')' : '') + ' ' + (g.timeMs / 1000).toFixed(1) + 's';
  }
  console.log('26 지우개 끄기: ' + run(false) + ' · ' + run(true) + ' (켬은 fail(지우개), 끔은 30초 뒤에도 run 이어야 정상)');
})();

// 27. 데모 3 정석 루트 (사용자 설명 2026-10-22): 위 길로 초록 발사기 구간 → 기둥으로 떨어지며 정지 +1(4210,400) → 31° 오르막에서 되돌아 왼쪽 아래 통로로 →
//     별(2950,870) → 도착. 지금 규칙(빨강에 튕겨도 걷는 방향은 그대로)에서는 빨강 ㄴ자 벽(포탄 막기) 오른쪽에 검정 ㄴ자 벽(돌아서기)을 붙여 세움
//     블록(3787)은 양쪽 모두 걸어서 못 넘어(약 24px) 들어갈 때·나올 때 검정 비탈, 배치된 선(4060)은 위아래 전부 노랑 (일부만 지우면 윗조각이 선 채로 끼어 막음)
(function () {
  var lv = G.LEVELS.filter(function (l) { return l.id === 'd3'; })[0];
  if (!lv) return;
  function until(g, f, sec) { for (var i = 0; i < sec * 60 && g.status === 'run' && !f(g); i++) G.Game.update(g, STEP); }
  function draws(g, list) { list.forEach(function (it) { drawLine(g, it[0], it[1], true); }); }   // 한 번 정지에 여러 선 (시험이라 정지 횟수 다시 채움)
  function run(delay, tri) {
    var g = G.Game.create('A', lv); G.Game.start(g);
    PLANS.d3.slice(0, 7).forEach(function (p) { until(g, p.when, 30); drawLine(g, p.pts, p.color); });   // 2번 모범 풀이 ①~③ (첫 발사기·절벽·초록 발사기)
    until(g, function (g) { return hx(g) > 3650 && hy(g) < 300; }, 15);
    draws(g, [[[{ x: 3680, y: 208 }, { x: 4016, y: 212 }], 'black'], [[{ x: 3910, y: 200 }, { x: 4016, y: 200 }], 'red']]);   // 3910: 떨어지며 정지 +1·물방울 2
    until(g, function (g) { return hx(g) < 4300 && g.hero.dir < 0 && hy(g) > 850; }, 30);
    for (var i = 0; i < delay; i++) G.Game.update(g, STEP);
    draws(g, [[[{ x: 4060, y: 700 }, { x: 4060, y: 900 }], 'yellow'], [[{ x: 3845, y: 873 }, { x: 3960, y: 897 }], 'black'],
      [[{ x: 3220, y: 903 }, { x: 3790, y: 903 }], 'black'], [[{ x: 2800, y: 903 }, { x: 3228, y: 903 }], 'black']
      ].concat(tri ? [[[{ x: 2830, y: 901 }, { x: 2845, y: 840 }, { x: 2860, y: 901 }, { x: 2830, y: 901 }], 'red']]   // 빨강 이등변 삼각형: 포탄을 막고 부딪히면 오른쪽으로 튕겨 돌아섬 (사용자 의도)
        : [[[{ x: 2830, y: 830 }, { x: 2830, y: 900 }, { x: 2805, y: 900 }], 'red'], [[{ x: 2845, y: 830 }, { x: 2845, y: 900 }, { x: 2870, y: 900 }], 'black']]));
    until(g, function (g) { return hx(g) < 3600 && g.hero.dir > 0; }, 40);
    draws(g, [[[{ x: 3660, y: 897 }, { x: 3810, y: 871 }], 'black']]);   // 나올 때 블록 왼쪽 비탈 (블록 위까지 걸치게)
    until(g, function (g) { return hx(g) > 4300; }, 25);
    G.Draw.suck(g, { x: 3500, y: 903 }, 60); G.Draw.suck(g, { x: 3000, y: 903 }, 60);   // 잉크가 모자라 통로 다리를 빨아들임
    PLANS.d3.slice(9).forEach(function (p) { until(g, p.when, 30); drawLine(g, p.pts, p.color); });   // 오르막 파랑·틈 다리·공중 물방울 빨강
    until(g, function () { return false; }, 60);
    return g.status + ' ' + (g.timeMs / 1000).toFixed(1) + 's ' + g.rescued + '/' + g.total + (g.result ? ' 별 ' + g.result.stars + ' 정화 ' + Math.round(g.result.purity * 100) + '%' : ' ' + g.failReason);
  }
  console.log('27 데모 3 정석 루트 (아래 통로 들어가는 때를 0·1·2초 늦춤)\n   빨강+검정 벽: ' + [0, 60, 120].map(function (d) { return run(d, false); }).join(' · ') +
    '\n   빨강 삼각형(세운 빨강 옆 튕김): ' + [0, 60, 120].map(function (d) { return run(d, true); }).join(' · ') + '\n   (clear 10/10 별 3 정화 100% 이어야 정상)');
})();

// 28. 세운 빨강에 옆으로 튕기면 걷는 방향도 바뀜 (사용자 결정 2026-10-22, grill me): 60° 넘는 빨강 = 부딪힌 쪽으로 튕기고 그쪽으로 걸어감.
//     눕힌 빨강은 지금처럼 위로 튕기고 가던 방향 그대로. ㄴ자로 세운 빨강 벽에 왼쪽·오른쪽에서 부딪혀 봄 (혼자 걷는 작은 물방울도)
(function () {
  function run(fromLeft, small) {
    var x = fromLeft ? 700 : 300;
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: fromLeft ? 300 : 1100 }, goal: { x: 3000 }, inks: ['red', 'black'], drops: { follow: false }, eraser: { pct: 1, delayMs: 600000 },
      ground: [{ x0: -400, x1: 3400, top: 600 }], props: small ? [{ type: 'drop', x: fromLeft ? 360 : 1040, y: 587 }] : [] };
    var g = G.Game.create('A', lv); G.Game.start(g); if (!fromLeft) g.hero.dir = -1;
    drawLine(g, fromLeft ? [{ x: x, y: 520 }, { x: x, y: 598 }, { x: x + 30, y: 598 }] : [{ x: 700, y: 520 }, { x: 700, y: 598 }, { x: 670, y: 598 }], 'red');
    var d = small ? null : g.hero, turned = null;
    for (var i = 0; i < 60 * 6 && g.status === 'run'; i++) {
      G.Game.update(g, STEP);
      if (small && !d) d = g.drops.filter(function (q) { return !q.hero; })[0] || null;
      if (d && d.body && turned === null && d.bounces) turned = { x: Math.round(d.body.position.x), dir: d.dir };
    }
    return (fromLeft ? '왼쪽에서' : '오른쪽에서') + (small ? '(작은)' : '') + ' → ' + (turned ? '튕김 x' + turned.x + ' 방향 ' + (turned.dir > 0 ? '오른쪽' : '왼쪽') : '안 튕김') +
      ' · 6초 뒤 x ' + (d && d.body ? Math.round(d.body.position.x) : '-');
  }
  // 눕힌 빨강: 그대로 가던 방향
  var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 300 }, goal: { x: 3000 }, inks: ['red'], eraser: { pct: 1, delayMs: 600000 }, ground: [{ x0: -400, x1: 3400, top: 600 }], props: [] };
  var g = G.Game.create('A', lv); G.Game.start(g); drawLine(g, [{ x: 500, y: 598 }, { x: 560, y: 598 }], 'red');
  for (var i = 0; i < 60 * 4; i++) G.Game.update(g, STEP);
  console.log('28 세운 빨강 옆 튕김: ' + [run(true), run(false), run(true, true)].join(' · ') + ' · 눕힌 빨강 → 튕김 ' + g.hero.bounces + '번 방향 ' + (g.hero.dir > 0 ? '오른쪽' : '왼쪽') +
    '\n   (왼쪽에서 부딪히면 왼쪽으로·오른쪽에서는 오른쪽으로 튕기고 그쪽으로 걸어가야, 눕힌 빨강은 오른쪽 그대로여야 정상)');
})();

// 29. 가시에 찔리는 범위를 그림보다 작게 (사용자 요청 2026-10-23: 데모 1 가시 위에 검정을 그려도 찔림)
//     물방울은 가시 상자와 부딪히지 않고 안쪽 "찔리는 범위"(위 35%·양옆 일부를 뺀 곳, 몸은 60% 크기로)에 들어가면 찔림. 선은 가시 상자 위에 얹히고, 겹쳐 그리면 위로 올려짐
(function () {
  function run(pts, small) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 200 }, goal: { x: 1400 }, inks: ['black'], eraser: { pct: 1, delayMs: 600000 },
      drops: { follow: true },
      ground: [{ x0: -400, x1: 500, top: 441 }, { x0: 500, x1: 900, top: 650, h: 350 }, { x0: 900, x1: 1800, top: 441 }],
      props: [{ type: 'spike', x: 500, y: 600, w: 400, h: 50 }].concat(small ? [{ type: 'drop', x: 260, y: 428 }] : []) };
    var g = G.Game.create('A', lv); G.Game.start(g);
    if (pts) drawLine(g, pts, 'black');
    for (var i = 0; i < 60 * 8 && g.status === 'run'; i++) G.Game.update(g, STEP);
    return g.status === 'run' ? (g.lost ? '안전(작은 물방울 잃음 ' + g.lost + ')' : '안전') : g.failReason;
  }
  console.log('29 가시 찔리는 범위: 맨 가시 ' + run(null) + ' · 가시 위 검정 ' + run([{ x: 505, y: 596 }, { x: 895, y: 596 }]) +
    ' · 가시 그림 가운데(y 625)에 그림 ' + run([{ x: 505, y: 625 }, { x: 895, y: 625 }]) + ' · 가시 그림 아래쪽(y 640) ' + run([{ x: 505, y: 640 }, { x: 895, y: 640 }]) +
    ' · 오른쪽 30px 빔 ' + run([{ x: 505, y: 596 }, { x: 865, y: 596 }]) + ' · 오른쪽 45px 빔 ' + run([{ x: 505, y: 596 }, { x: 850, y: 596 }]) +
    ' · 대열 작은 물방울과 함께 ' + run([{ x: 505, y: 596 }, { x: 895, y: 596 }], true) +
    '\n   (맨 가시·45px 빔(틈으로 빠짐)만 찔리고 나머지는 안전이어야 정상. 예전엔 가시 그림 아래쪽 절반에 그은 선이 땅으로 밀려 내려가 찔렸음)');
})();

// 30. 낮은 턱 살짝 점프 (사용자 요청 2026-10-23: 애매하게 낮은 턱에서 억울하게 되돌아가지 않게)
//     stepUp(주인공 16) 이하는 그냥 넘고, hop.up(주인공 22, 2026-10-25 에 30 에서 줄임) 이하는 살짝 뛰어 넘고, 그보다 높으면 되돌아섬. 작은 물방울은 minUp 16
//     세운 Λ 선 (2026-10-25): 높이 50 은 위쪽이 살짝 뒤로 기울어도 뛰지 않고 되돌아섬
(function () {
  function run(h, who, ceil) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 300 }, goal: { x: 3000 }, inks: ['black'], noEraser: true,
      drops: { follow: who === 'line' },
      ground: [{ x0: -400, x1: 800, top: 600 }, { x0: 800, x1: 3400, top: 600 - h }],
      props: (who !== 'hero' ? [{ type: 'drop', x: 360, y: 587 }] : []).concat(ceil ? [{ type: 'wall', x: 700, y: 600 - h - 60, w: 400, h: 20 }] : []) };
    var g = G.Game.create('A', lv); G.Game.start(g);
    var d = who === 'hero' ? g.hero : null;
    for (var i = 0; i < 60 * 6 && g.status === 'run'; i++) {
      G.Game.update(g, STEP);
      if (!d) d = g.drops.filter(function (q) { return !q.hero && q.body; })[0] || null;
    }
    if (!d || !d.body) return h + '?';
    return h + (d.body.position.x > 900 ? '넘음' + (d.hops ? '(점프' + d.hops + ')' : '') : '돌아섬');
  }
  // 세운 Λ 선 (사진처럼 거의 수직, 높이 h): 평지 위에 그려 떨어뜨린 뒤 주인공이 넘는지
  function steep(h) {
    var lv = { id: 't', name: '시험', ink: 3000, stops: 9, start: { x: 300 }, goal: { x: 3000 }, inks: ['black'], noEraser: true,
      ground: [{ x0: -400, x1: 3400, top: 600 }], props: [{ type: 'wall', x: -400, y: 300, w: 40, h: 300 }] };   // 돌아서면 왼쪽 끝에서 떨어지지 않게
    var g = G.Game.create('A', lv); G.Game.start(g);
    drawLine(g, [{ x: 600, y: 598 }, { x: 600 + h / 5.5, y: 600 - h }, { x: 600 + h / 2.75, y: 598 }], 'black');
    for (var i = 0; i < 60 * 6 && g.status === 'run'; i++) G.Game.update(g, STEP);
    if (!g.hero.body) return 'Λ' + h + '?(' + g.status + ' ' + g.failReason + ' t' + (g.timeMs / 1000).toFixed(1) + ')';
    return 'Λ' + h + (g.hero.body.position.x > 700 ? '넘음' + (g.hero.hops ? '(점프' + g.hero.hops + ')' : '') : '돌아섬');
  }
  var hs = [10, 16, 20, 24, 30, 44];
  console.log('30 낮은 턱 점프: 주인공 ' + hs.map(function (h) { return run(h, 'hero'); }).join(' ') + ' · ' + [40, 55].map(steep).join(' ') +
    '\n   작은 물방울(혼자) ' + [8, 12, 16, 18, 20, 24].map(function (h) { return run(h, 'free'); }).join(' ') +
    '\n   대열 작은 물방울 ' + [16, 20].map(function (h) { return run(h, 'line'); }).join(' ') + ' · 위가 막힌 20px 턱(주인공) ' + run(20, 'hero', true) +
    '\n   (주인공은 22 까지 넘고 24 부터 돌아섬, 세운 Λ 는 돌아섬, 작은 물방울은 16 까지 넘고 18 부터 돌아섬, 위가 막히면 돌아서야 정상)');
})();
