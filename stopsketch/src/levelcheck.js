// 구간 데이터 계산·검사 (화면·물리 없음). 게임, 레벨 툴, node 테스트가 함께 쓴다.
var G = G || {};

G.LevelCheck = (function () {
  // 빠진 값을 기본값으로 채운 복사본
  function normalize(lv) {
    var D = G.DATA, o = JSON.parse(JSON.stringify(lv || {}));
    o.id = o.id || 'new';
    o.name = o.name || '새 구간';
    o.bg = o.bg || 'bg_a';
    o.ink = o.ink || D.ink.max;
    o.stops = o.stops != null ? o.stops : D.stop.perSection;
    o.start = o.start || { x: 200 };
    o.goal = o.goal || { x: 2000 };
    o.ground = o.ground || [];
    o.props = o.props || [];
    var r = D.level.rate;                          // 클리어 평가 조건 (빠진 칸만 기본값)
    o.rate = o.rate || {};
    if (o.rate.timeSec == null) o.rate.timeSec = r.timeSec;
    if (o.rate.allStars == null) o.rate.allStars = r.allStars;
    if (o.rate.maxTries == null) o.rate.maxTries = r.maxTries;
    return o;
  }

  function groundTopAt(lv, x) {
    for (var i = 0; i < lv.ground.length; i++) {
      var g = lv.ground[i];
      if (x >= g.x0 && x <= g.x1) return g.top;
    }
    return null;
  }

  // 시작~도착 사이의 틈 목록 (땅 조각 사이 빈 곳). dy: 건너편이 높으면 음수
  function gaps(lv) {
    var segs = lv.ground.slice().sort(function (a, b) { return a.x0 - b.x0; }), out = [];
    var reach = null, reachTop = 0;               // 지금까지 땅이 이어진 오른쪽 끝 (겹친 조각 고려)
    segs.forEach(function (s) {
      if (reach !== null && s.x0 > reach && s.x0 >= lv.start.x && reach <= lv.goal.x) {
        out.push({ x0: reach, x1: s.x0, w: s.x0 - reach, dy: s.top - reachTop });
      }
      if (reach === null || s.x1 > reach) { reach = s.x1; reachTop = s.top; }
    });
    return out;
  }

  // 길을 막는 벽 (땅 위에 서 있고 넘어갈 수 없는 높이)
  function blockingWalls(lv) {
    var step = G.DATA.player.stepUp;
    return lv.props.filter(function (p) {
      var def = G.DATA.props[p.type];
      if (!def || !def.solid || p.x + p.w < lv.start.x || p.x > lv.goal.x) return false;
      var top = groundTopAt(lv, p.x + p.w / 2);
      return top != null && Math.abs(p.y + p.h - top) < 4 && p.h > step;
    });
  }

  // 장애물마다 드는 잉크 대략치: 틈마다 다리(양쪽 20px 걸침) + 벽마다 약 30° 경사로. [{x, cost}]
  function obstacleCosts(lv) {
    var out = [];
    gaps(lv).forEach(function (g) { out.push({ x: g.x0, cost: Math.sqrt((g.w + 40) * (g.w + 40) + g.dy * g.dy) }); });
    blockingWalls(lv).forEach(function (w) { out.push({ x: w.x, cost: w.h * 2 }); });
    return out.sort(function (a, b) { return a.x - b.x; });
  }

  // 모범 풀이 전체에 드는 잉크 대략치 (합계)
  function estimateInk(lv) {
    return Math.round(obstacleCosts(lv).reduce(function (s, o) { return s + o.cost; }, 0));
  }

  // 선은 사라지면 잉크를 돌려주므로, 실제로 모자라는지는 "선 수명 동안 달리는 거리" 안의 장애물 합으로 본다
  function peakInk(lv) {
    var D = G.DATA, span = D.player.runSpeed * 60 * D.ink.lifeMs / 1000, obs = obstacleCosts(lv), best = 0;
    obs.forEach(function (o) {
      var sum = 0;
      obs.forEach(function (q) { if (q.x >= o.x && q.x <= o.x + span) sum += q.cost; });
      best = Math.max(best, sum);
    });
    return { peak: Math.round(best), span: Math.round(span) };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // 경고 목록: {lv: 'error'|'warn'|'info', msg}
  function check(raw) {
    var lv = normalize(raw), out = [], D = G.DATA;
    function add(k, m) { out.push({ lv: k, msg: m }); }
    if (!lv.ground.length) add('error', '땅이 하나도 없어요');
    if (groundTopAt(lv, lv.start.x) == null) add('error', '시작 위치 아래에 땅이 없어요');
    if (groundTopAt(lv, lv.goal.x) == null) add('error', '도착 위치 아래에 땅이 없어요');
    if (lv.goal.x <= lv.start.x) add('error', '도착이 시작보다 왼쪽에 있어요 (캐릭터는 오른쪽으로 출발)');

    var segs = lv.ground.slice().sort(function (a, b) { return a.x0 - b.x0; });
    for (var i = 1; i < segs.length; i++) {
      if (segs[i].x0 < segs[i - 1].x1) add('warn', '땅 조각이 겹쳐요 (x ' + segs[i].x0 + ')');
    }
    lv.ground.forEach(function (g) { if (g.x1 - g.x0 < 20) add('warn', '너무 짧은 땅 (x ' + g.x0 + ')'); });

    var stars = lv.props.filter(function (p) { return p.type === 'star'; });
    if (stars.length !== D.level.starsPerLevel) add('warn', '별이 ' + stars.length + '개예요 (권장 ' + D.level.starsPerLevel + '개)');
    var solids = lv.props.filter(function (p) { var d = D.props[p.type]; return d && d.solid; });
    solids.forEach(function (p) { if (p.w < 10 || p.h < 10) add('warn', D.props[p.type].name + '이(가) 너무 작아요 (x ' + p.x + ')'); });
    stars.forEach(function (s) {
      var r = s.size / 2, box = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
      solids.forEach(function (p) { if (overlaps(box, p)) add('warn', '별이 ' + D.props[p.type].name + ' 안에 묻혀 있어요 (x ' + s.x + ')'); });
    });

    var bottles = lv.props.filter(function (p) { return p.type === 'inkup'; });
    var drains = lv.props.filter(function (p) { return p.type === 'drain'; });
    if (bottles.length || drains.length) add('info', '잉크 병 ' + bottles.length + '개 (먹으면 최대량 +' + D.ink.upAmount + ', 영구) · 잉크 웅덩이 ' + drains.length + '개');
    var ids = {};
    bottles.forEach(function (b) { if (b.id && ids[b.id]) add('warn', '잉크 병 id가 겹쳐요 (' + b.id + ') — 계정 저장이 섞임'); ids[b.id] = 1; });
    var minTime = Math.ceil((lv.goal.x - lv.start.x) / (D.player.runSpeed * 60));
    if (lv.rate.timeSec < minTime) add('warn', '목표 시간 ' + lv.rate.timeSec + '초는 너무 짧아요 (쉬지 않고 달려도 약 ' + minTime + '초)');
    add('info', '별 평가 조건: ' + lv.rate.timeSec + '초 안 · ' + (lv.rate.allStars ? '수집 별 모두 · ' : '') + lv.rate.maxTries + '번 안');
    var est = estimateInk(lv), pk = peakInk(lv);
    add('info', '틈 ' + gaps(lv).length + '개 · 막는 벽 ' + blockingWalls(lv).length + '개 · 모범 풀이 잉크 합계 약 ' + est +
      ' · 한꺼번에 필요한 최대(선 수명 동안 ' + pk.span + 'px 구간) 약 ' + pk.peak + ' / 기본 잉크 ' + lv.ink);
    if (pk.peak > lv.ink * 0.9) add('warn', '한꺼번에 필요한 잉크가 빠듯하거나 모자라요 (약 ' + pk.peak + ', 기본 ' + lv.ink + '). 잉크 병 없이도 깰 수 있게 기본량으로 맞추세요');
    if (lv.stops < 1) add('info', '정지 횟수 0: 달리면서만 그려야 해요');
    return out;
  }

  return { normalize: normalize, groundTopAt: groundTopAt, gaps: gaps, blockingWalls: blockingWalls, estimateInk: estimateInk, peakInk: peakInk, check: check };
})();
