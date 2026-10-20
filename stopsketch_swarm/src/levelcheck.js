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
    delete o.rate;                                 // 시간·물방울%·시도 조건은 없앰 (사용자 결정 2026-10-20: 평가 = 별 n/3 + 정화 %)
    o.segments = o.segments || [];                 // 구간(설계 용어): [{x, name}] — 레벨 툴에 경계와 이름만 표시
    o.drops = o.drops || {};                       // 물방울 이동 속도·서로 충돌 (레벨 툴 "스테이지 설정 → 물방울")
    if (o.drops.heroSpeed == null) o.drops.heroSpeed = D.drop.runSpeed;
    if (o.drops.smallSpeed == null) o.drops.smallSpeed = D.drop.runSpeed;
    if (o.drops.collide == null) o.drops.collide = D.drop.collide;
    if (o.drops.follow == null) o.drops.follow = D.drop.follow.on;   // 대열 따라오기 (사용자 결정 2026-10-20)
    if (o.drops.gap == null) o.drops.gap = D.drop.follow.gap;
    o.eraser = o.eraser || {};
    if (o.eraser.pct == null) o.eraser.pct = D.eraser.pct;
    if (o.eraser.delayMs == null) o.eraser.delayMs = D.eraser.delayMs;
    // 쓸 수 있는 색 (없으면 3색 모두), 색 효과 세기 (빠진 칸만 기본값)
    o.inks = (o.inks || D.inks.order).filter(function (c) { return D.inks[c]; });
    o.fx = o.fx || {};
    Object.keys(D.inkFx).forEach(function (k) { if (o.fx[k] == null) o.fx[k] = D.inkFx[k]; });
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

  // 길을 막는 벽 (땅 위에 서 있고 넘어갈 수 없는 높이). 가시는 막는 벽이 아니라 함정
  function blockingWalls(lv) {
    var step = G.DATA.drop.stepUp;
    return lv.props.filter(function (p) {
      var def = G.DATA.props[p.type];
      if (!def || !def.solid || p.type === 'spike' || p.x + p.w < lv.start.x || p.x > lv.goal.x) return false;
      var top = groundTopAt(lv, p.x + p.w / 2);
      return top != null && Math.abs(p.y + p.h - top) < 4 && p.h > step;
    });
  }

  // 장애물마다 드는 잉크 대략치: 틈마다 다리(양쪽 40px 걸침, 떨어지는 선이라 양 끝이 땅에 걸쳐야 함) + 벽마다 약 30° 경사로 + 가시마다 덮개
  function obstacleCosts(lv) {
    var out = [];
    gaps(lv).forEach(function (g) { out.push({ x: g.x0, cost: Math.sqrt((g.w + 80) * (g.w + 80) + g.dy * g.dy) }); });
    blockingWalls(lv).forEach(function (w) { out.push({ x: w.x, cost: w.h * 2 }); });
    lv.props.forEach(function (p) { if (p.type === 'spike') out.push({ x: p.x, cost: p.w + 60 }); });
    return out.sort(function (a, b) { return a.x - b.x; });
  }

  // 모범 풀이 전체에 드는 잉크 대략치 (선은 사라지지 않으므로, 빨아들이지 않으면 이 합계가 필요)
  function estimateInk(lv) {
    return Math.round(obstacleCosts(lv).reduce(function (s, o) { return s + o.cost; }, 0));
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // 배치된 작은 물방울 수 (평가 기준)
  function dropCount(lv) { return lv.props.filter(function (p) { return p.type === 'drop'; }).length; }

  // 경고 목록: {lv: 'error'|'warn'|'info', msg}
  function check(raw) {
    var lv = normalize(raw), out = [], D = G.DATA;
    function add(k, m) { out.push({ lv: k, msg: m }); }
    if (!lv.ground.length) add('error', '땅이 하나도 없어요');
    if (groundTopAt(lv, lv.start.x) == null) add('error', '시작 위치 아래에 땅이 없어요');
    if (groundTopAt(lv, lv.goal.x) == null) add('error', '도착 위치 아래에 땅이 없어요');
    if (lv.goal.x <= lv.start.x) add('error', '도착이 시작보다 왼쪽에 있어요 (주인공은 오른쪽으로 출발)');

    var segs = lv.ground.slice().sort(function (a, b) { return a.x0 - b.x0; });
    for (var i = 1; i < segs.length; i++) {
      if (segs[i].x0 < segs[i - 1].x1) add('warn', '땅 조각이 겹쳐요 (x ' + segs[i].x0 + ')');
    }
    lv.ground.forEach(function (g) { if (g.x1 - g.x0 < 20) add('warn', '너무 짧은 땅 (x ' + g.x0 + ')'); });

    var solids = lv.props.filter(function (p) { var d = D.props[p.type]; return d && d.solid; });
    solids.forEach(function (p) { if (p.w < 8 || p.h < 8) add('warn', D.props[p.type].name + '이(가) 너무 작아요 (x ' + p.x + ')'); });
    var drops = lv.props.filter(function (p) { return p.type === 'drop'; });
    drops.forEach(function (s) {
      var r = D.drop.smallRadius, box = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
      solids.forEach(function (p) { if (overlaps(box, p)) add('warn', '물방울이 ' + D.props[p.type].name + ' 안에 묻혀 있어요 (x ' + s.x + ')'); });
    });
    if (!drops.length) add('warn', '잠든 물방울이 없어요 (물방울 도착 비율 조건이 늘 만족됨)');
    if (drops.length > 20) add('warn', '물방울이 ' + drops.length + '마리예요 (시험판 권장 최대 20)');

    var minTime = Math.ceil((lv.goal.x - lv.start.x) / (lv.drops.heroSpeed * 60));
    var nStar = lv.props.filter(function (p) { return p.type === 'star'; }).length;
    add(nStar === D.level.starsPerStage ? 'info' : 'warn', '별 ' + nStar + '개 (스테이지당 ' + D.level.starsPerStage + '개 권장, 주인공이 닿아야 획득) · 쉬지 않고 걸으면 약 ' + minTime + '초');
    var est = estimateInk(lv);
    add('info', '틈 ' + gaps(lv).length + '개 · 막는 벽 ' + blockingWalls(lv).length + '개 · 모범 풀이 잉크 합계 약 ' + est + ' / 기본 잉크 ' + lv.ink + ' (우클릭으로 빨아들이면 다시 씀)');
    if (est > lv.ink * 1.5) add('warn', '잉크가 많이 모자라요 — 선을 여러 번 빨아들여 다시 써야 해요');
    if (lv.stops < 1) add('info', '정지 횟수 0: 달리면서만 그려야 해요');
    if (!lv.inks.length) add('error', '쓸 수 있는 색이 없어요 (스테이지 설정 → 쓸 수 있는 색)');
    else add('info', '쓸 수 있는 색: ' + lv.inks.map(function (c) { return D.inks[c].name; }).join(', ') +
      ' · 튕김 ' + lv.fx.bounce + ' · 가속 ' + lv.fx.boostPct + '% ' + (lv.fx.boostMs / 1000) + '초 · 떠오름 ' + lv.fx.riseSpeed);
    var crystals = lv.props.filter(function (p) { return p.type === 'crystal'; });
    if (crystals.length && lv.inks.indexOf('yellow') < 0) add('warn', '배치된 선이 있는데 노랑(지우기)을 쓸 수 없어요');
    add('info', '물방울 속도: 주인공 ' + lv.drops.heroSpeed + ' · 작은 물방울 ' + lv.drops.smallSpeed + ' · 서로 충돌 ' + (lv.drops.collide ? '켬' : '끔') +
      ' · 대열 ' + (lv.drops.follow ? '켬 (간격 ' + lv.drops.gap + ', 작은 물방울 속도는 이탈해 혼자 걸을 때만)' : '끔'));
    if (lv.drops.follow && lv.drops.gap <= 0) add('error', '대열 간격은 0보다 커야 해요');
    if (lv.drops.heroSpeed <= 0 || lv.drops.smallSpeed <= 0) add('error', '물방울 속도는 0보다 커야 해요');
    if (lv.drops.smallSpeed < lv.drops.heroSpeed * lv.eraser.pct / 100) add('warn', '작은 물방울이 지우개보다 느려요 — ' + (lv.drops.follow ? '대열에서 이탈해 ' : '') + '뒤처진 물방울은 모두 지워져요');
    add('info', '지우개: ' + (lv.eraser.delayMs / 1000) + '초 뒤 출발, 주인공 속도의 ' + lv.eraser.pct + '% · 구간 경계 ' + lv.segments.length + '개');
    return out;
  }

  return { normalize: normalize, groundTopAt: groundTopAt, gaps: gaps, blockingWalls: blockingWalls, estimateInk: estimateInk, dropCount: dropCount, check: check };
})();
