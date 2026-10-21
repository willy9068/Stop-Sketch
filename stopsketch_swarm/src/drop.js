// 물방울: 주인공 1 + 깨어난 작은 물방울들 (사용자 결정 2026-10-20). 모두 원형 몸체, 바닥에서 자동으로 걷고 벽에 막히면 뒤로 돎.
// 물방울끼리는 서로 통과(같은 음수 group). 색 선: 빨강 = 선과 수직으로 튕김, 파랑 = 밟는 동안·내린 뒤 잠시 빨라짐.
// 위·아래로 끼면 죽지 않고 가까운 옆으로 밀려남. 가시에 닿으면 죽음.
var G = G || {};

G.Drop = {
  GROUP: -7,

  // hero: 주인공이면 true (크기가 크고, 죽으면 실패). cfg = 스테이지 drops 설정 {heroSpeed, smallSpeed, collide}
  //   collide 가 꺼져 있으면 같은 음수 group 이라 물방울끼리 통과, 켜져 있으면 서로 부딪힘(벽처럼 뒤로 돌고 위에 올라탐)
  create: function (engine, x, y, hero, dir, cfg) {
    var D = G.DATA.drop, M = G.Physics.M, r = hero ? D.heroRadius : D.smallRadius;
    cfg = cfg || {};
    var body = M.Bodies.circle(x, y, r, {
      friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0, label: 'drop',
      collisionFilter: { group: cfg.collide ? 0 : this.GROUP }
    });
    M.Body.setDensity(body, D.density);
    M.Body.setInertia(body, Infinity);
    G.Physics.add(engine, body);
    return {
      body: body, r: r, hero: !!hero, dir: dir || 1, state: 'walk', grounded: false,
      mode: hero ? 'hero' : 'free',                // 작은 물방울: free 혼자 걷기 / join 깨어나 대열로 튀는 중 / line 대열 (사용자 결정 2026-10-20)
                                                   //   / fall 대열에 남은 채 떨어지는 중 / wait 착지해 복귀 기다림 (사용자 결정 2026-10-21)
      speed: (hero ? cfg.heroSpeed : cfg.smallSpeed) || D.runSpeed,
      turnCdMs: 0, turns: 0, boostMs: 0, bounceCdMs: 0, bounces: 0, pinchMs: 0, onInk: null,
      events: [], dead: null
    };
  },

  // 바닥에서 걷기: 발 앞쪽 바닥 면을 따라(경사·낮은 턱이면 그 기울기대로) 목표 속도로 (사용자 요청 2026-10-20: 경사·턱을 매끄럽게)
  control: function (d, scale, fx) {
    var D = G.DATA.drop, M = G.Physics.M, v = d.body.velocity;
    if (!d.grounded) return;
    var boost = d.boostMs > 0 && fx;
    var target = d.speed * (boost ? fx.boostPct / 100 : 1) * d.dir;
    var a = Math.min(1, D.accel * (boost ? 2.5 : 1) * scale);
    var n = d.groundN || { x: 0, y: -1 }, tx = -n.y, ty = n.x;      // 바닥 면 방향 (n = 닿은 점 → 중심)
    // 오르막 (가는 쪽으로 바닥이 올라감): 각도에 따라 느려짐, 30도 넘으면 스스로 오르지 못하고 더 느려지다 미끄러짐 (사용자 결정 2026-10-21)
    var sn = d.surfN;
    if (sn && sn.x * d.dir < -0.01) {
      var deg = Math.acos(Math.max(-1, Math.min(1, -sn.y))) * 180 / Math.PI, k = G.Rules.slopeFactor(deg - (boost ? D.slope.boostBonus : 0) - 0.05, D.slope.steps);   // 파랑 가속 중이면 그만큼 완만하게 침 (외부 도움)
      d.slopeDeg = deg;
      // (2026-10-21 뺌: "평평한 바닥에 서 있으면 턱으로 보고 계속 오름" — 비탈 아래 끝에서 바닥과 비탈을 같이 밟으면 60도 비탈을 계속 오르려다
      //   튀어 오르고 떨어지기를 반복하며 되돌아서지 못했음. 턱·선 끝은 이제 "밟은 모서리가 짧으면 비탈 아님"(minEdge)으로 가림)
      if (k <= 0) {
        var ux = tx * d.dir, uy = ty * d.dir, along = v.x * ux + v.y * uy;   // 오르는 쪽 속도
        if (along > 0) {
          var drag = Math.min(along, D.slope.steepDrag * (deg - D.slope.steps[D.slope.steps.length - 1][0]) / 10 * scale);
          M.Body.setVelocity(d.body, { x: v.x - ux * drag, y: v.y - uy * drag });
        } else if (d.turnCdMs === 0) {              // 다 멈추고 미끄러지기 시작하면 반대 방향으로 (사용자 결정 2026-10-21)
          d.dir = -d.dir;
          d.turns += 1;
          d.turnCdMs = D.turnCooldownMs;
        }
        return;
      }
      target *= k;
    } else d.slopeDeg = 0;
    var want = { x: tx * target, y: ty * target };
    if (want.y < -0.01) {                          // 오르막: 위로 가는 속도는 빨리 맞춰 멈칫하지 않게
      M.Body.setVelocity(d.body, { x: v.x + (want.x - v.x) * Math.max(a, D.climbAccel * scale), y: v.y + (want.y - v.y) * Math.min(1, D.climbAccel * scale) });
    } else {
      M.Body.setVelocity(d.body, { x: v.x + (want.x - v.x) * a, y: v.y });
    }
  },

  // 물리 스텝 직후: 바닥·벽·색 선·가시·끼임 판정
  sense: function (d, engine, realMs, scale, fx) {
    var D = G.DATA.drop, M = G.Physics.M, b = d.body, r = d.r, gameMs = realMs * scale;
    var stepUp = Math.max(D.stepUpMin, D.stepUp * r / D.heroRadius);
    var touch = G.Physics.touching(engine, b);
    var under = null, ground = false, wall = false, red = null, blue = false, above = null, below = false, low = false, front = null, flat = false;
    d.events.length = 0;
    function face(part, p) { var e = G.Physics.edgeAt(part, p, b.position); return !!e && e.len >= D.slope.minEdge; }   // 닿은 곳이 긴 면(비탈·벽 면)인가
    for (var t = 0; t < touch.length; t++) {
      var pts = touch[t].pts, other = touch[t].other, root = touch[t].root, color = other.inkColor || root.inkColor;
      if (root.label === 'spike' || other.label === 'spike') { d.dead = 'spike'; return; }
      for (var i = 0; i < pts.length; i++) {
        var dy = pts[i].y - b.position.y, dx = pts[i].x - b.position.x;
        if (dy > r * D.groundCheck) {
          ground = true; below = true;
          if (dy > r * 0.94) flat = true;          // 거의 평평한 바닥(20도 이하)을 밟고 있음 — 턱 올라타기 판정용
          if (!front || dx * d.dir > front.f) front = { f: dx * d.dir, dx: dx, dy: dy, part: other, p: pts[i] };   // 가는 쪽으로 가장 앞선 바닥 접점
          if (dx * d.dir > r * 0.75 && !face(other, pts[i])) low = true;   // 발 앞쪽 모서리에 걸침 → 올라타기 (긴 비탈 면이면 아님)
          if (color && color !== 'yellow' && !under) under = color;   // 밟고 있는 색 (물들기)
          if (color === 'red') red = other;
          if (color === 'blue') blue = true;
        } else if (dy < -r * D.groundCheck) above = root;
        else if (dx * d.dir > r * 0.5 && dy < r - stepUp) wall = true;
        else if (dx * d.dir > 0 && dy >= r - stepUp) {   // 가는 쪽 발치: 짧은 모서리면 낮은 턱(쓰러진 선 조각 등), 긴 면이면 가파른 비탈 = 벽처럼 되돌아섬
          if (face(other, pts[i])) wall = true; else low = true;   // (사용자 요청 2026-10-21: 60도 비탈 아래에서 턱 올라타기를 반복하며 못 돌아서던 문제)
        }
      }
    }
    d.grounded = ground;
    d.flat = flat;
    d.under = red ? 'red' : under;                 // 빨강을 같이 밟았으면 빨강 (닿자마자 튕겨 나가므로 놓치지 않게)
    if (front) {                                   // 바닥 면 방향 = 앞선 접점에서 중심으로 (턱 모서리면 그 기울기로 타고 오름)
      var len = Math.sqrt(front.dx * front.dx + front.dy * front.dy) || 1;
      d.groundN = { x: -front.dx / len, y: -front.dy / len };
      // 비탈 면 방향: 접점 아래 모서리가 길면 그 면의 법선, 짧으면(모서리·선의 둥근 끝 = 턱) null → 비탈 규칙 안 씀 (사용자 결정 2026-10-21)
      var eg = G.Physics.edgeAt(front.part, front.p, b.position);
      d.surfN = eg && eg.len >= D.slope.minEdge && eg.n.y < 0 ? eg.n : null;
    } else d.groundN = d.surfN = null;
    // 그래도 낮은 턱 앞에서 멈칫하면 살짝 들어 올려 넘김 (Matter.js 원은 턱을 스스로 넘지 못함)
    //   평평한 바닥에 선 채 앞이 걸릴 때만 (사용자 결정 2026-10-21: 가파른 비탈 위에서 들어 올려 55도도 오르던 문제)
    if (low && flat && !wall && scale > 0 && Math.abs(b.velocity.x) < d.speed * 0.4) M.Body.translate(b, { x: d.dir * 1.5 * scale, y: -3 * scale });
    d.onInk = red ? 'red' : blue ? 'blue' : null;
    d.boostMs = Math.max(0, d.boostMs - gameMs);
    d.bounceCdMs = Math.max(0, d.bounceCdMs - gameMs);
    if (fx && blue) {
      if (d.boostMs <= 0) d.events.push('boost');
      d.boostMs = fx.boostMs;
    }
    if (fx && red && d.bounceCdMs === 0 && scale > 0) {
      M.Body.setVelocity(b, G.Rules.bounceVelocity(red.angle, fx.bounce, b.velocity));
      d.grounded = false;
      d.bounceCdMs = G.DATA.bounceCdMs;
      d.bounces += 1;
      d.events.push('bounce');
    }
    // 위·아래로 끼임: 일정 시간 이어지면 누르는 물체의 가까운 옆 끝 바깥으로 옮김 (사용자 결정 2026-10-20: 끼여서 죽지 않음)
    if (above && below && scale > 0) {
      d.pinchMs += gameMs;
      if (d.pinchMs >= D.pinchMs) {
        var bx = above.bounds, left = b.position.x - bx.min.x, right = bx.max.x - b.position.x;
        var nx = left < right ? bx.min.x - r - 2 : bx.max.x + r + 2;
        M.Body.setPosition(b, { x: nx, y: b.position.y });
        M.Body.setVelocity(b, { x: 0, y: 0 });
        d.pinchMs = 0;
      }
    } else d.pinchMs = 0;
    d.turnCdMs = Math.max(0, d.turnCdMs - gameMs);
    if (wall && d.turnCdMs === 0) {
      d.dir = -d.dir;
      d.turns += 1;
      d.turnCdMs = D.turnCooldownMs;
    }
  },

  // 대열 물방울: 가시에 닿았는가, 발밑(반지름 + supportTol 안)에 물방울 아닌 몸체가 있는가
  //   위치를 직접 옮기므로 걷기 판정 대신 아래로 짧은 광선을 쏴서 봄 (경사에서 살짝 떠도 바닥으로 침)
  support: function (d, engine) {
    var b = d.body, touch = G.Physics.touching(engine, b), color = null;
    for (var t = 0; t < touch.length; t++) {
      if (touch[t].root.label === 'spike' || touch[t].other.label === 'spike') return { ground: true, spike: true };
      var c = touch[t].other.inkColor || touch[t].root.inkColor;
      if (c && c !== 'yellow' && !color && touch[t].pts.some(function (q) { return q.y > b.position.y; })) color = c;   // 발밑 색 (물들기)
    }
    var M = G.Physics.M, p = b.position, reach = d.r + G.DATA.drop.follow.supportTol;
    var bodies = G.Physics.allBodies(engine).filter(function (q) { return q.label !== 'drop'; });
    var hit = M.Query.ray(bodies, { x: p.x, y: p.y }, { x: p.x, y: p.y + reach }, d.r * 1.2);
    return { ground: hit.length > 0, spike: false, color: color };
  },

  // 대열에 붙는 동안은 아무것과도 안 부딪힘 (통 튀어 날아가는 중), 대열에선 물방울끼리 통과(떨어지는 중·기다리는 중 포함), 혼자 걸을 땐 스테이지 설정대로
  setFilter: function (d, mode, collide) {
    var f = d.body.collisionFilter;
    f.mask = mode === 'join' ? 0 : 0xFFFFFFFF;
    f.group = mode === 'free' && collide ? 0 : this.GROUP;
  },

  // 물들기 (사용자 결정 2026-10-20): d.tc = 물든 색 [r,g,b], d.ta = 세기 0~1, d.tHold = 내려온 뒤 유지 남은 시간
  tint: function (d, ms) {
    var T = G.DATA.tint, c = d.under && T.colors[d.under];
    if (c && T.touchColors.indexOf(d.under) >= 0) d.tKick = { c: c, ms: T.inMs };   // 빨강: 닿으면 그 뒤로도 천천히 끝까지
    if (!c && d.tKick && d.tKick.ms > 0) { c = d.tKick.c; d.tKick.ms -= ms; }
    if (c) {
      if (!d.tc || (d.ta || 0) <= 0.01) d.tc = c.slice();
      var k = 1 - Math.exp(-3 * ms / T.inMs);        // 다른 색이면 섞이며 넘어감
      d.tc = d.tc.map(function (v, i) { return v + (c[i] - v) * k; });
      d.ta = Math.min(1, (d.ta || 0) + ms / T.inMs);
      d.tHold = T.holdMs;
    } else if (d.ta > 0) {
      if (d.tHold > 0) d.tHold -= ms;
      else d.ta = Math.max(0, d.ta - ms / T.fadeMs);
    }
  },

  remove: function (engine, d) { if (d.body) { G.Physics.remove(engine, d.body); d.body = null; } }
};
