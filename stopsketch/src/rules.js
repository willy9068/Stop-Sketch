// 순수 계산 규칙 (화면·물리 없음). node tools/test.js 가 이 파일만 시험한다.
var G = G || {};

G.Rules = (function () {
  function dist(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function polylineLength(pts) {
    var len = 0;
    for (var i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    return len;
  }

  // ---- 선 그리기 ----
  // stroke = { pts: [...], len: 0, full: false }
  function newStroke(p) {
    return { pts: [{ x: p.x, y: p.y }], len: 0, full: false };
  }

  // 마우스 점 p를 선에 더한다. 잉크·한 번 최대 길이를 넘으면 그 지점에서 잘라 선을 끝낸다.
  // 반환: 이번에 쓴 잉크 양 (0이면 추가 안 됨)
  function addSample(stroke, p, inkLeft, cfg) {
    if (stroke.full) return 0;
    var last = stroke.pts[stroke.pts.length - 1];
    var d = dist(last, p);
    if (d < cfg.sampleDist) return 0;
    var room = Math.min(inkLeft, cfg.maxStrokeLen - stroke.len);
    if (room <= 0) { stroke.full = true; return 0; }
    var q = { x: p.x, y: p.y };
    if (d > room) {                       // 남은 만큼만 그리고 멈춘다
      var t = room / d;
      q = { x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t };
      d = room;
      stroke.full = true;
    }
    stroke.pts.push(q);
    stroke.len += d;
    return d;
  }

  // 양 끝은 그대로 두고 가운데 점을 이웃 평균 쪽으로 당긴다
  function smooth(pts, passes) {
    var out = pts.slice();
    for (var k = 0; k < passes; k++) {
      if (out.length < 3) break;
      var next = [out[0]];
      for (var i = 1; i < out.length - 1; i++) {
        next.push({
          x: (out[i - 1].x + out[i].x * 2 + out[i + 1].x) / 4,
          y: (out[i - 1].y + out[i].y * 2 + out[i + 1].y) / 4
        });
      }
      next.push(out[out.length - 1]);
      out = next;
    }
    return out;
  }

  // 선을 끝낼 때: 너무 짧으면 취소하고 쓴 잉크를 돌려준다
  function finishStroke(stroke, cfg) {
    if (stroke.pts.length < 2 || stroke.len < cfg.minStrokeLen) {
      return { ok: false, refund: stroke.len };
    }
    return { ok: true, refund: 0, pts: smooth(stroke.pts, cfg.smoothPasses) };
  }

  // ---- 선 수명 ----
  // 발판이 된 뒤 ageMs 가 지나면 사라진다. 마지막 fadeMs 동안 1 → 0 으로 흐려짐
  function lineAlpha(ageMs, lifeMs, fadeMs) {
    var left = lifeMs - ageMs;
    if (left <= 0) return 0;
    return left >= fadeMs ? 1 : left / fadeMs;
  }
  function lineExpired(ageMs, lifeMs) { return ageMs >= lifeMs; }

  // ---- 정지 횟수 ----
  function newStops(n) { return { left: n, max: n }; }
  function canStop(s) { return s.left > 0; }
  function useStop(s) {
    if (s.left <= 0) return false;
    s.left -= 1;
    return true;
  }
  function rechargeStops(s) { s.left = s.max; }

  // ---- 잉크 회복 (사용자 결정 2026-10-19) ----
  // 발판 선이 사라지면 그 선에 쓴 잉크만큼 돌려받는다. 최대량을 넘지 않는다
  function refundInk(ink, len, inkMax) { return Math.min(inkMax, ink + len); }
  // 잉크 웅덩이에 닿아 있는 동안 초당 rate 만큼 줄어든다 (0 아래로는 안 감)
  function drainInk(ink, rate, ms) { return Math.max(0, ink - rate * ms / 1000); }

  // ---- 클리어 평가: 조건을 몇 개 만족했는가 → 별 0~3 (사용자 결정 2026-10-19) ----
  // rate = { timeSec, allStars, maxTries } (levels.js 구간마다), res = { timeMs, starsGot, starsTotal, tries }
  function rateClear(rate, res, labels) {
    var checks = [
      { key: 'time', ok: res.timeMs <= rate.timeSec * 1000, label: rate.timeSec + '초 안에 도착' },
      { key: 'stars', ok: !rate.allStars || res.starsGot >= res.starsTotal,
        label: rate.allStars ? '수집 별 모두 (' + res.starsGot + '/' + res.starsTotal + ')' : '수집 별 조건 없음' },
      { key: 'tries', ok: res.tries <= rate.maxTries, label: rate.maxTries + '번 안에 성공 (' + res.tries + '번째)' }
    ];
    var n = checks.filter(function (c) { return c.ok; }).length;
    return { checks: checks, stars: n };
  }

  // ---- 시간 배율 ----
  function timeScale(mode, stopped) { return stopped ? mode.scale : 1; }
  function shouldAutoResume(mode, stopped, stoppedMs) {
    return stopped && mode.limitMs > 0 && stoppedMs >= mode.limitMs;
  }

  return {
    dist: dist, polylineLength: polylineLength,
    newStroke: newStroke, addSample: addSample, smooth: smooth, finishStroke: finishStroke,
    lineAlpha: lineAlpha, lineExpired: lineExpired,
    refundInk: refundInk, drainInk: drainInk, rateClear: rateClear,
    newStops: newStops, canStop: canStop, useStop: useStop, rechargeStops: rechargeStops,
    timeScale: timeScale, shouldAutoResume: shouldAutoResume
  };
})();
