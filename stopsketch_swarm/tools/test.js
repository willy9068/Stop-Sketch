// 순수 계산 규칙 테스트 (선 길이, 잉크 소모, 정지 횟수, 시간 배율). 물리 결과는 대상 아님.
// 사용: node tools/test.js
var fs = require('fs'), path = require('path'), vm = require('vm');
var SRC = path.join(__dirname, '..', 'src');
['data.js', 'levels.js', 'rules.js', 'levelcheck.js', 'util.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
});
var R = G.Rules, D = G.DATA;
var pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + ' — ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' 기대 ' + b + ', 실제 ' + a); }
function near(a, b, eps, msg) { if (Math.abs(a - b) > (eps || 1e-6)) throw new Error((msg || '') + ' 기대 ' + b + ', 실제 ' + a); }
var cfg = { sampleDist: 8, minStrokeLen: 30, maxStrokeLen: 100, smoothPasses: 2 };

console.log('선 길이');
t('두 점 거리 3-4-5', function () { near(R.dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5); });
t('꺾인 선 길이 합', function () { near(R.polylineLength([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]), 20); });
t('점 1개 길이 0', function () { eq(R.polylineLength([{ x: 5, y: 5 }]), 0); });

console.log('잉크 소모');
t('샘플 거리보다 짧은 이동은 기록 안 함', function () {
  var s = R.newStroke({ x: 0, y: 0 });
  eq(R.addSample(s, { x: 5, y: 0 }, 1000, cfg), 0); eq(s.pts.length, 1);
});
t('이동한 거리만큼 잉크 소모', function () {
  var s = R.newStroke({ x: 0, y: 0 }), used = 0;
  for (var x = 10; x <= 50; x += 10) used += R.addSample(s, { x: x, y: 0 }, 1000, cfg);
  near(used, 50); near(s.len, 50); eq(s.pts.length, 6);
});
t('잉크가 모자라면 남은 만큼만 그리고 끝남', function () {
  var s = R.newStroke({ x: 0, y: 0 });
  var used = R.addSample(s, { x: 40, y: 0 }, 25, cfg);
  near(used, 25); eq(s.full, true); near(s.pts[1].x, 25);
  eq(R.addSample(s, { x: 60, y: 0 }, 1000, cfg), 0, '끝난 선에는 더 못 그림');
});
t('잉크 0이면 그릴 수 없음', function () {
  var s = R.newStroke({ x: 0, y: 0 });
  eq(R.addSample(s, { x: 40, y: 0 }, 0, cfg), 0); eq(s.full, true);
});
t('한 번 최대 길이에서 잘림', function () {
  var s = R.newStroke({ x: 0, y: 0 }), used = 0;
  for (var x = 20; x <= 200; x += 20) used += R.addSample(s, { x: x, y: 0 }, 1000, cfg);
  near(used, 100); eq(s.full, true);
});
t('너무 짧은 선은 취소 + 잉크 반환', function () {
  var s = R.newStroke({ x: 0, y: 0 });
  R.addSample(s, { x: 20, y: 0 }, 1000, cfg);
  var r = R.finishStroke(s, cfg);
  eq(r.ok, false); near(r.refund, 20);
});
t('충분한 선은 확정, 반환 0', function () {
  var s = R.newStroke({ x: 0, y: 0 });
  R.addSample(s, { x: 20, y: 0 }, 1000, cfg); R.addSample(s, { x: 40, y: 10 }, 1000, cfg);
  var r = R.finishStroke(s, cfg);
  eq(r.ok, true); eq(r.refund, 0); eq(r.pts.length, 3);
});
t('평활화는 양 끝을 유지하고 꺾임을 줄임', function () {
  var pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
  var out = R.smooth(pts, 1);
  eq(out[0].y, 0); eq(out[2].y, 0); near(out[1].y, 5);
});
t('data.js 기본값: 최대 한 번 길이 < 잉크 총량', function () {
  if (!(D.ink.maxStrokeLen < D.ink.max)) throw new Error('한 번에 잉크 전부를 쓸 수 있음');
});

console.log('잉크 회수 (사용자 결정 2026-10-20: 선은 사라지지 않고 우클릭으로 빨아들이면 전부 돌려받음)');
t('빨아들인 선만큼 돌려받음', function () { eq(R.refundInk(500, 200, 1800), 700); });
t('돌려받아도 최대량을 넘지 않음', function () { eq(R.refundInk(1700, 300, 1800), 1800); });

console.log('클리어 결과 (사용자 결정 2026-10-20: 별 n/3 + 정화 % 따로, 최고 기록은 별 누적·정화 최고)');
t('별·정화 따로 집계', function () {
  var r = R.clearResult({ stars: ['star0', 'star2'], starsTotal: 3, rescued: 6, total: 8, heroIn: true, timeMs: 35600 });
  eq(r.stars, 2); eq(r.starsTotal, 3); eq(r.inJar, 7); eq(r.all, 9); near(r.purity, 7 / 9);
});
t('최고 기록: 판마다 다른 별을 먹어도 누적, 정화는 최고', function () {
  var rec = R.mergeRecord({ clears: 1, tries: 1 }, R.clearResult({ stars: ['star0'], starsTotal: 3, rescued: 8, total: 8, heroIn: true, timeMs: 40000 }));
  R.mergeRecord(rec, R.clearResult({ stars: ['star1', 'star2'], starsTotal: 3, rescued: 2, total: 8, heroIn: true, timeMs: 30000 }));
  eq(rec.stars, 3); eq(rec.bestPurity, 1); eq(rec.bestMs, 30000);
});
t('예전 기록(별이 숫자)도 읽음', function () { eq(R.mergeRecord({ stars: 2, bestMs: 1 }, R.clearResult({ stars: [], starsTotal: 3, rescued: 0, total: 0, heroIn: true, timeMs: 5 })).stars, 0); });

console.log('배치된 선 지우기 (사용자 결정 2026-10-20: 노랑으로 칠한 부분만 지움, 못 박힌 끝 조각은 남고 나머지는 떨어짐)');
var bar = { x: 0, y: 100, w: 200, h: 10, angle: 0 };
var cross = function (x) { return [{ x: x, y: 50 }, { x: x, y: 150 }]; };
t('가로질러 칠하면 그 폭(±14)만 지워지고 양쪽 조각은 고정(기본 pin both)', function () {
  var p = R.eraseCrystal(bar, cross(100), 14);
  eq(p.length, 2); near(p[0].w, 86, 2.5); near(p[1].x, 114, 2.5); eq(p[0].anchored, true); eq(p[1].anchored, true);
});
t('선을 따라 칠하면 칠한 길이만큼 지워짐', function () {
  var p = R.eraseCrystal(bar, [{ x: 60, y: 105 }, { x: 140, y: 105 }], 14);
  eq(p.length, 2); near(p[0].w, 46, 2.5); near(p[1].x, 154, 2.5);
});
t('두 군데 칠하면 가운데 조각은 떨어짐', function () {
  var p = R.eraseCrystal(bar, cross(50).concat(cross(150).reverse()), 14);
  eq(p.length, 3); eq(p[1].anchored, false); eq(p[1].pin, 'none');
});
t('안 닿으면 null', function () { eq(R.eraseCrystal(bar, cross(300), 14), null); });
t('90도 막대(pin end = 아래 끝만 박힘)를 아래쪽에서 칠하면 윗조각은 떨어짐', function () {
  var wall = { x: -60, y: 530, w: 130, h: 10, angle: 90, pin: 'end' };      // 가운데 (5, 535), 위 470 ~ 아래 600
  var p = R.eraseCrystal(wall, [{ x: -30, y: 592 }, { x: 40, y: 592 }], 14);
  eq(p.length, 1); eq(p[0].anchored, false); near(p[0].w, 108, 2.5); eq(p[0].angle, 90);
});
t('45도로 돌린 막대도 칠한 자리만 지움', function () {
  var d = { x: -50, y: -5, w: 100, h: 10, angle: 45 };                     // 가운데 (0,0)
  var p = R.eraseCrystal(d, [{ x: -20, y: 20 }, { x: 20, y: -20 }], 10);   // 가운데를 가로지름
  eq(p.length, 2); near(p[0].w, 40, 2.5); near(p[1].w, 40, 2.5);
});
t('예전 세로 배치된 선은 90도로 바꿔 읽음', function () {
  var n = G.LevelCheck.normalize({ props: [{ type: 'crystal', x: 900, y: 470, w: 10, h: 130, pin: 'end' }] }).props[0];
  eq(n.angle, 90); eq(n.w, 130); eq(n.h, 10); near(n.x + n.w / 2, 905); near(n.y + n.h / 2, 535);
});

console.log('선 점 줄이기 (떨어지는 선 물리 안정)');
t('곧은 선은 양 끝 두 점만', function () {
  var pts = []; for (var x = 0; x <= 100; x += 4) pts.push({ x: x, y: 0 });
  eq(R.simplify(pts, 3).length, 2);
});
t('꺾인 선은 꺾인 점을 남김', function () {
  var pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }];
  var s2 = R.simplify(pts, 3); eq(s2.length, 3); eq(s2[1].x, 100); eq(s2[1].y, 0);
});

console.log('카메라 줌 (사용자 결정 2026-10-20)');
var CAM = D.art.camera, V = D.view;
t('무리가 좁으면 1배 (확대는 안 함)', function () { eq(R.fitZoom({ x0: 0, x1: 100, y0: 0, y1: 50 }, V, CAM), 1); });
t('무리가 넓으면 줌 아웃, 최소 minZoom', function () {
  var z = R.fitZoom({ x0: 0, x1: 1800, y0: 0, y1: 50 }, V, CAM); near(z, V.w / (1800 + CAM.margin * 2), 1e-9);
  eq(R.fitZoom({ x0: 0, x1: 9000, y0: 0, y1: 50 }, V, CAM), CAM.minZoom);
});

console.log('정지 횟수');
t('구간당 3회', function () { eq(D.stop.perSection, 3); eq(R.newStops(D.stop.perSection).left, 3); });
t('3번 쓰면 0, 4번째는 실패', function () {
  var s = R.newStops(3);
  eq(R.useStop(s), true); eq(R.useStop(s), true); eq(R.useStop(s), true);
  eq(s.left, 0); eq(R.canStop(s), false); eq(R.useStop(s), false); eq(s.left, 0);
});
t('충전하면 최대치로', function () { var s = R.newStops(3); R.useStop(s); R.rechargeStops(s); eq(s.left, 3); });

console.log('스테이지 데이터 (levels.js · levelcheck.js)');
var LC = G.LevelCheck;
function mini(extra) {
  var lv = { name: 't', start: { x: 100 }, goal: { x: 900 }, ground: [{ x0: 0, x1: 400, top: 600 }, { x0: 600, x1: 1000, top: 500 }], props: [] };
  for (var k in extra) lv[k] = extra[k];
  return lv;
}
function hasMsg(list, kind, word) { return list.some(function (w) { return w.lv === kind && w.msg.indexOf(word) >= 0; }); }
t('기본값 채우기: 잉크·정지 횟수는 data.js 값', function () {
  var n = LC.normalize({}); eq(n.ink, D.ink.max); eq(n.stops, D.stop.perSection); eq(n.props.length, 0);
});
t('땅 높이 찾기, 틈 위는 null', function () { eq(LC.groundTopAt(mini(), 200), 600); eq(LC.groundTopAt(mini(), 500), null); eq(LC.groundTopAt(mini(), 700), 500); });
t('틈 계산: 폭 200, 건너편 100 높음', function () { var g = LC.gaps(mini()); eq(g.length, 1); eq(g[0].w, 200); eq(g[0].dy, -100); });
t('틈 계산: 안쪽에 겹친 짧은 땅 조각은 틈을 만들지 않음', function () {
  var lv = mini(); lv.ground.push({ x0: 50, x1: 150, top: 700 });
  var g = LC.gaps(lv); eq(g.length, 1); eq(g[0].x0, 400); eq(g[0].w, 200);
});
t('막는 벽: 땅 위에 선 높이 150 벽만', function () {
  var lv = mini({ props: [{ type: 'wall', x: 200, y: 450, w: 40, h: 150 }, { type: 'wall', x: 300, y: 300, w: 40, h: 100 }, { type: 'wall', x: 50, y: 590, w: 40, h: 10 }] });
  eq(LC.blockingWalls(lv).length, 1);
});
t('잉크 대략치 = 다리(양쪽 40씩 걸침) + 벽 높이×2 + 가시 폭+60', function () {
  var lv = mini({ props: [{ type: 'wall', x: 200, y: 450, w: 40, h: 150 }, { type: 'spike', x: 100, y: 570, w: 80, h: 30 }] });
  eq(LC.estimateInk(lv), Math.round(Math.sqrt(280 * 280 + 100 * 100) + 300 + 140));
});
t('검사: 시작 아래 땅이 없으면 경고 (공중 시작 허용, 사용자 결정 2026-10-20)', function () {
  var w = LC.check(mini({ start: { x: 500, y: 300 }, goal: { x: 1200 } }));
  if (!hasMsg(w, 'warn', '시작')) throw new Error('시작 경고 없음');
});
t('시작·도착 y 없으면 그 x 땅 윗면', function () {
  var n = LC.normalize({ ground: [{ x0: 0, x1: 500, top: 450 }], start: { x: 100 }, goal: { x: 400, y: 200 } });
  eq(n.start.y, 450); eq(n.goal.y, 200);
});
t('검사: 벽에 묻힌 물방울, 물방울 없음 경고', function () {
  var w = LC.check(mini({ props: [{ type: 'wall', x: 200, y: 450, w: 60, h: 150 }, { type: 'drop', x: 230, y: 587 }] }));
  if (!hasMsg(w, 'warn', '묻혀')) throw new Error('묻힘 경고 없음');
  if (!hasMsg(LC.check(mini()), 'warn', '잠든 물방울이 없어요')) throw new Error('없음 경고 없음');
});
t('예전 평가 조건(rate)은 지움', function () { eq(LC.normalize({ rate: { timeSec: 45 } }).rate, undefined); });
t('땅 높이 기본값 400, 있는 값은 유지', function () { var n = LC.normalize({ ground: [{ x0: 0, x1: 100, top: 600 }, { x0: 0, x1: 100, top: 300, h: 80 }] }); eq(n.ground[0].h, D.level.groundDepth); eq(n.ground[1].h, 80); });
t('지우개·구간 기본값', function () { var n = LC.normalize({}); eq(n.eraser.pct, D.eraser.pct); eq(n.segments.length, 0); });
t('물방울 속도·충돌 기본값, 있는 값은 유지', function () {
  var n = LC.normalize({}); eq(n.drops.heroSpeed, D.drop.runSpeed); eq(n.drops.smallSpeed, D.drop.runSpeed); eq(n.drops.collide, false);
  var m = LC.normalize({ drops: { smallSpeed: 3, collide: true } }); eq(m.drops.heroSpeed, D.drop.runSpeed); eq(m.drops.smallSpeed, 3); eq(m.drops.collide, true);
});
t('대열 기본값 (켬, 간격), 있는 값은 유지', function () {
  var n = LC.normalize({}); eq(n.drops.follow, D.drop.follow.on); eq(n.drops.gap, D.drop.follow.gap);
  var m = LC.normalize({ drops: { follow: false, gap: 50 } }); eq(m.drops.follow, false); eq(m.drops.gap, 50);
});
t('검사: 작은 물방울이 지우개보다 느리면 경고', function () {
  if (!hasMsg(LC.check(mini({ drops: { heroSpeed: 5, smallSpeed: 0.5 } })), 'warn', '지우개보다 느려요')) throw new Error('경고 없음');
});
t('검사: 배치된 선이 있는데 노랑이 없으면 경고', function () {
  if (!hasMsg(LC.check(mini({ inks: ['black'], props: [{ type: 'crystal', x: 0, y: 0, w: 100, h: 10 }] })), 'warn', '노랑')) throw new Error('경고 없음');
});
t('levels.js 의 모든 스테이지에 오류가 없음', function () {
  G.LEVELS.forEach(function (lv) {
    var errs = LC.check(lv).filter(function (w) { return w.lv === 'error'; });
    if (errs.length) throw new Error(lv.name + ': ' + errs[0].msg);
  });
});

console.log('물감 5색 (사용자 결정 2026-10-20)');
t('키 1~5 = 검정·빨강·파랑·초록·노랑', function () { eq(D.inks.order.join(), 'black,red,blue,green,yellow'); });
t('평평한 빨강: 바로 위로 튕기고 가로 속도 유지', function () {
  var v = R.bounceVelocity(0, 15, { x: 5, y: 3 });
  near(v.x, 5, 1e-9); near(v.y, -15, 1e-9);
});
t('기운 빨강: 선과 수직으로 튕김', function () {
  var a = -Math.PI / 4, v = R.bounceVelocity(a, 10, { x: 0, y: 0 });
  near(v.x * Math.cos(a) + v.y * Math.sin(a), 0, 1e-9, '선 방향 성분'); near(Math.sqrt(v.x * v.x + v.y * v.y), 10, 1e-9);
});
t('점-선분 거리 (가운데·끝 바깥)', function () {
  near(R.pointSegDist({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
  near(R.pointSegDist({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 5);
});
t('스테이지에 색 설정이 없으면 5색 모두 + 기본 세기 (초록 떠오름 포함)', function () {
  var lv = G.LevelCheck.normalize({});
  eq(lv.inks.join(), D.inks.order.join()); eq(lv.fx.bounce, D.inkFx.bounce); eq(lv.fx.riseSpeed, D.inkFx.riseSpeed);
});

console.log('시드 난수');
t('같은 시드 같은 수열', function () {
  var a = G.makeRng(42), b = G.makeRng(42);
  for (var i = 0; i < 5; i++) eq(a(), b());
});

console.log('\n' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
