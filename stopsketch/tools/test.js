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

console.log('선 수명');
t('수명 전에는 진하게', function () { eq(R.lineAlpha(0, 5000, 1200), 1); eq(R.lineAlpha(3800, 5000, 1200), 1); });
t('마지막 구간에서 흐려짐', function () { near(R.lineAlpha(4400, 5000, 1200), 0.5); });
t('수명이 다하면 0, 사라짐', function () {
  eq(R.lineAlpha(5000, 5000, 1200), 0); eq(R.lineExpired(5000, 5000), true); eq(R.lineExpired(4999, 5000), false);
});
t('data.js: 흐려지는 시간 < 수명', function () { if (!(D.ink.fadeMs < D.ink.lifeMs)) throw new Error('fadeMs >= lifeMs'); });

console.log('잉크 회복·웅덩이 (사용자 결정 2026-10-19)');
t('사라진 선만큼 돌려받음', function () { eq(R.refundInk(500, 200, 1800), 700); });
t('돌려받아도 최대량을 넘지 않음', function () { eq(R.refundInk(1700, 300, 1800), 1800); });
t('웅덩이: 초당 400이면 0.5초에 200 줄어듦', function () { near(R.drainInk(1000, 400, 500), 800); });
t('웅덩이: 0 아래로는 안 감', function () { eq(R.drainInk(50, 400, 1000), 0); });

console.log('클리어 평가 (조건 수 = 별)');
var rate = { timeSec: 30, allStars: true, maxTries: 3 };
t('조건 3개 모두 → 별 3', function () { eq(R.rateClear(rate, { timeMs: 29000, starsGot: 3, starsTotal: 3, tries: 1 }).stars, 3); });
t('시간 초과 → 별 2', function () { eq(R.rateClear(rate, { timeMs: 31000, starsGot: 3, starsTotal: 3, tries: 2 }).stars, 2); });
t('시간 초과 + 별 부족 + 4번째 → 별 0', function () { eq(R.rateClear(rate, { timeMs: 40000, starsGot: 1, starsTotal: 3, tries: 4 }).stars, 0); });
t('시간 경계: 정확히 30초는 성공', function () { eq(R.rateClear(rate, { timeMs: 30000, starsGot: 3, starsTotal: 3, tries: 3 }).checks[0].ok, true); });
t('수집 별 조건 끄면 별 개수와 상관없음', function () {
  eq(R.rateClear({ timeSec: 30, allStars: false, maxTries: 3 }, { timeMs: 1000, starsGot: 0, starsTotal: 3, tries: 1 }).stars, 3);
});

console.log('정지 횟수');
t('구간당 3회', function () { eq(D.stop.perSection, 3); eq(R.newStops(D.stop.perSection).left, 3); });
t('3번 쓰면 0, 4번째는 실패', function () {
  var s = R.newStops(3);
  eq(R.useStop(s), true); eq(R.useStop(s), true); eq(R.useStop(s), true);
  eq(s.left, 0); eq(R.canStop(s), false); eq(R.useStop(s), false); eq(s.left, 0);
});
t('충전하면 최대치로', function () { var s = R.newStops(3); R.useStop(s); R.rechargeStops(s); eq(s.left, 3); });

console.log('시간 배율');
t('재생 중 배율 1', function () { eq(R.timeScale(D.timeModes.B, false), 1); });
t('A 정지 0 / B 정지 0.3 / C 정지 0', function () {
  eq(R.timeScale(D.timeModes.A, true), 0); eq(R.timeScale(D.timeModes.B, true), 0.3); eq(R.timeScale(D.timeModes.C, true), 0);
});
t('C는 제한 시간 뒤 자동 재생, A·B는 아님', function () {
  var C = D.timeModes.C;
  eq(R.shouldAutoResume(C, true, C.limitMs - 1), false);
  eq(R.shouldAutoResume(C, true, C.limitMs), true);
  eq(R.shouldAutoResume(D.timeModes.A, true, 99999), false);
  eq(R.shouldAutoResume(D.timeModes.B, true, 99999), false);
});

console.log('구간 데이터 (levels.js · levelcheck.js)');
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
t('잉크 대략치 = 다리 + 벽 높이×2', function () {
  var lv = mini({ props: [{ type: 'wall', x: 200, y: 450, w: 40, h: 150 }] });
  eq(LC.estimateInk(lv), Math.round(Math.sqrt(240 * 240 + 100 * 100)) + 300);
});
t('검사: 시작·도착 아래 땅 없음은 오류', function () {
  var w = LC.check(mini({ start: { x: 500 }, goal: { x: 1200 } }));
  if (!hasMsg(w, 'error', '시작')) throw new Error('시작 오류 없음');
  if (!hasMsg(w, 'error', '도착')) throw new Error('도착 오류 없음');
});
t('검사: 별 개수 권장 3개, 벽에 묻힌 별 경고', function () {
  var w = LC.check(mini({ props: [{ type: 'wall', x: 200, y: 450, w: 60, h: 150 }, { type: 'star', x: 230, y: 500, size: 56 }] }));
  if (!hasMsg(w, 'warn', '별이 1개')) throw new Error('개수 경고 없음');
  if (!hasMsg(w, 'warn', '묻혀')) throw new Error('묻힘 경고 없음');
});
t('평가 조건 기본값 채우기, 있는 값은 유지', function () {
  var n = LC.normalize({ rate: { timeSec: 45 } });
  eq(n.rate.timeSec, 45); eq(n.rate.allStars, D.level.rate.allStars); eq(n.rate.maxTries, D.level.rate.maxTries);
});
t('한꺼번에 필요한 잉크: 선 수명 동안 달리는 거리 안의 장애물만 더함', function () {
  var span = D.player.runSpeed * 60 * D.ink.lifeMs / 1000;
  var lv = mini({ ground: [{ x0: 0, x1: 400, top: 600 }, { x0: 600, x1: 600 + span + 200, top: 600 }, { x0: 800 + span + 200, x1: 5000, top: 600 }], goal: { x: 4000 } });
  var gs = LC.gaps(lv); eq(gs.length, 2);
  eq(LC.peakInk(lv).peak, 240, '두 틈이 멀리 떨어져 있으면 하나씩만');
});
t('검사: 잉크 부족 경고', function () { if (!hasMsg(LC.check(mini({ ink: 100 })), 'warn', '잉크')) throw new Error('경고 없음'); });
t('levels.js 의 모든 구간에 오류가 없음', function () {
  G.LEVELS.forEach(function (lv) {
    var errs = LC.check(lv).filter(function (w) { return w.lv === 'error'; });
    if (errs.length) throw new Error(lv.name + ': ' + errs[0].msg);
  });
});

console.log('색 잉크 (사용자 결정 2026-10-19)');
t('휠: 다음 색, 끝에서 처음으로', function () {
  eq(R.nextColor(['red', 'green'], 'red', 1), 'green'); eq(R.nextColor(['red', 'green'], 'green', 1), 'red');
  eq(R.nextColor(['red', 'blue', 'green'], 'red', -1), 'green');
});
t('목록에 없는 색이면 첫 색, 빈 목록이면 null', function () {
  eq(R.nextColor(['green'], 'red', 1), 'green'); eq(R.nextColor([], 'red', 1), null);
});
t('평평한 빨강: 바로 위로 튕기고 가로 속도 유지', function () {
  var v = R.bounceVelocity(0, 15, { x: 5, y: 3 });
  near(v.x, 5, 1e-9); near(v.y, -15, 1e-9);
});
t('반대 방향으로 그은 선(각도 π)도 위로 튕김', function () {
  near(R.bounceVelocity(Math.PI, 15, { x: 0, y: 0 }).y, -15, 1e-9);
});
t('기운 빨강: 선과 수직으로 튕김', function () {
  var a = -Math.PI / 4, v = R.bounceVelocity(a, 10, { x: 0, y: 0 });
  near(v.x * Math.cos(a) + v.y * Math.sin(a), 0, 1e-9, '선 방향 성분'); near(Math.sqrt(v.x * v.x + v.y * v.y), 10, 1e-9);
});
t('점-선분 거리 (가운데·끝 바깥)', function () {
  near(R.pointSegDist({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
  near(R.pointSegDist({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 5);
});
t('구간에 색 설정이 없으면 3색 모두 + 기본 세기', function () {
  var lv = G.LevelCheck.normalize({});
  eq(lv.inks.join(), D.inks.order.join()); eq(lv.fx.bounce, D.inkFx.bounce);
});
t('구간 fx 일부만 있으면 나머지는 기본값', function () {
  var lv = G.LevelCheck.normalize({ inks: ['red', 'nope'], fx: { bounce: 9 } });
  eq(lv.inks.join(), 'red'); eq(lv.fx.bounce, 9); eq(lv.fx.boostPct, D.inkFx.boostPct);
});

console.log('시드 난수');
t('같은 시드 같은 수열', function () {
  var a = G.makeRng(42), b = G.makeRng(42);
  for (var i = 0; i < 5; i++) eq(a(), b());
});

console.log('\n' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
