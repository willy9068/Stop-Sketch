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

  // 점을 줄인다 (Ramer–Douglas–Peucker, 허용 오차 tol px). 떨어지는 선의 물리 조각이 짧고 많으면 Matter.js 에서 뒤집히며 빠져서
  // 조각을 길게 만든다 (2026-10-20 시뮬레이션에서 확인: 8px 조각 47개 → 틈에 빠짐, 조각 2~5개 → 걸쳐서 버팀)
  function simplify(pts, tol) {
    if (pts.length < 3) return pts.slice();
    var keep = [0, pts.length - 1], stack = [[0, pts.length - 1]];
    while (stack.length) {
      var r = stack.pop(), a = pts[r[0]], b = pts[r[1]], best = -1, bi = -1;
      for (var i = r[0] + 1; i < r[1]; i++) {
        var d = pointSegDist(pts[i], a, b);
        if (d > best) { best = d; bi = i; }
      }
      if (best > tol) { keep.push(bi); stack.push([r[0], bi], [bi, r[1]]); }
    }
    keep.sort(function (x, y) { return x - y; });
    return keep.map(function (i) { return pts[i]; });
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

  // ---- 클리어 결과 (사용자 결정 2026-10-20): 별(이번 판에 주인공이 주운 수 / 배치된 수)과 정화(들어간 물방울 / 전체)를 따로 ----
  //   res = { stars: 주운 별 key 목록, starsTotal, rescued, total(작은 물방울), heroIn, timeMs }
  function clearResult(res) {
    var all = res.total + 1, inJar = res.rescued + (res.heroIn ? 1 : 0);
    return { stars: res.stars.length, starKeys: res.stars.slice(), starsTotal: res.starsTotal,
             purity: inJar / all, inJar: inJar, all: all, timeMs: res.timeMs };
  }
  // 최고 기록: 별은 클리어한 판에서 주운 별의 합집합(판마다 달라도 누적), 정화는 최고 %, 시간은 가장 빠른 것
  function mergeRecord(rec, r) {
    rec = rec || {};
    if (!rec.starKeys) rec.starKeys = {};             // 예전 기록(별이 조건 수)은 새로 셈
    r.starKeys.forEach(function (k) { rec.starKeys[k] = true; });
    rec.stars = Object.keys(rec.starKeys).length;
    rec.bestPurity = Math.max(rec.bestPurity || 0, r.purity);
    if (!rec.bestMs || r.timeMs < rec.bestMs) rec.bestMs = Math.round(r.timeMs);
    return rec;
  }

  // ---- 색 잉크 (사용자 결정 2026-10-19) ----
  // 쓸 수 있는 색 목록 list 안에서 cur 다음(d=+1)/이전(d=-1) 색. 목록에 cur 가 없으면 첫 색
  function nextColor(list, cur, d) {
    if (!list.length) return null;
    var i = list.indexOf(cur);
    if (i < 0) return list[0];
    return list[(i + d + list.length) % list.length];
  }
  // 빨강 선(기울기 angle 라디안)을 밟았을 때 튕기는 속도: 선과 수직이면서 위쪽 방향으로 bounce, 선을 따라가는 속도는 유지
  function bounceVelocity(angle, bounce, v) {
    var nx = Math.sin(angle), ny = -Math.cos(angle);
    if (ny > 0) { nx = -nx; ny = -ny; }          // 늘 위쪽을 향하게
    var along = v.x * Math.cos(angle) + v.y * Math.sin(angle);
    return { x: Math.cos(angle) * along + nx * bounce, y: Math.sin(angle) * along + ny * bounce };
  }
  // 점 p 와 선분 a-b 사이 거리 (투사체가 초록 선에 닿았는지)
  function pointSegDist(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
  }

  // 선분 a-b 와 c-d 가 만나면 a-b 위의 비율 t(0~1), 아니면 null
  function segHit(a, b, c, d) {
    var rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
    var den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
  }

  // ---- 배치된 선 지우기 (사용자 결정 2026-10-20): 노랑으로 칠한 자리(선에서 r 안)에 든 부분만 없어짐 ----
  //   c = { x, y, w(길이), h(두께), angle(도), pin } — x,y 는 돌리기 전 왼쪽 위, 가운데 기준으로 회전
  //   남은 조각마다 { x, y, w, h, angle, pin, anchored }. 못 박힌 끝(pin: both/start/end/none)이 있는 조각만 anchored(고정), 나머지는 떨어짐
  function crystalAxis(c) {
    var a = (c.angle || 0) * Math.PI / 180;
    return { cx: c.x + c.w / 2, cy: c.y + c.h / 2, ux: Math.cos(a), uy: Math.sin(a), L: c.w };
  }
  function eraseCrystal(c, pts, r) {
    var ax = crystalAxis(c), L = ax.L, step = 2, keep = [], cur = null, hit = false;
    function painted(t) {
      var p = { x: ax.cx + ax.ux * (t - L / 2), y: ax.cy + ax.uy * (t - L / 2) };
      if (pts.length === 1) return dist(p, pts[0]) <= r;
      for (var i = 1; i < pts.length; i++) if (pointSegDist(p, pts[i - 1], pts[i]) <= r) return true;
      return false;
    }
    for (var t = 0; t <= L + 0.001; t += step) {
      var tt = Math.min(t, L);
      if (painted(tt)) { hit = true; if (cur) { keep.push(cur); cur = null; } }
      else if (!cur) cur = [tt, tt]; else cur[1] = tt;
    }
    if (cur) keep.push(cur);
    if (!hit) return null;
    var pin = c.pin || 'both', pinS = pin === 'both' || pin === 'start', pinE = pin === 'both' || pin === 'end';
    return keep.filter(function (k) { return k[1] - k[0] >= 4; }).map(function (k) {
      if (k[0] <= step) k[0] = 0;
      if (k[1] >= L - step) k[1] = L;
      var len = k[1] - k[0], mid = (k[0] + k[1]) / 2 - L / 2, mx = ax.cx + ax.ux * mid, my = ax.cy + ax.uy * mid;
      var s = pinS && k[0] === 0, e = pinE && k[1] === L;
      return { x: mx - len / 2, y: my - c.h / 2, w: len, h: c.h, angle: c.angle || 0,
               anchored: s || e, pin: s && e ? 'both' : s ? 'start' : e ? 'end' : 'none' };
    });
  }

  // 이번 프레임 카메라 배율: 상자(box)가 화면 안에 들어오게, minZoom~maxZoom 사이. base: 기본 줌 (이보다 크게는 안 함, 없으면 1)
  function fitZoom(box, view, cam, base) {
    var w = box.x1 - box.x0 + cam.margin * 2, h = box.y1 - box.y0 + cam.margin * 2;
    var z = Math.min(view.w / w, view.h / h, base != null ? base : 1);
    return Math.max(cam.minZoom, Math.min(cam.maxZoom, z));
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
    refundInk: refundInk, drainInk: drainInk,
    segHit: segHit, crystalAxis: crystalAxis, eraseCrystal: eraseCrystal, fitZoom: fitZoom, clearResult: clearResult, mergeRecord: mergeRecord,
    nextColor: nextColor, bounceVelocity: bounceVelocity, pointSegDist: pointSegDist, simplify: simplify,
    newStops: newStops, canStop: canStop, useStop: useStop, rechargeStops: rechargeStops,
    timeScale: timeScale, shouldAutoResume: shouldAutoResume
  };
})();
