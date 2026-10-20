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
    var ground = false, wall = false, red = null, blue = false, above = null, below = false, low = false, front = null;
    d.events.length = 0;
    for (var t = 0; t < touch.length; t++) {
      var pts = touch[t].pts, other = touch[t].other, root = touch[t].root, color = other.inkColor || root.inkColor;
      if (root.label === 'spike' || other.label === 'spike') { d.dead = '가시에 찔렸어요'; return; }
      for (var i = 0; i < pts.length; i++) {
        var dy = pts[i].y - b.position.y, dx = pts[i].x - b.position.x;
        if (dy > r * D.groundCheck) {
          ground = true; below = true;
          if (!front || dx * d.dir > front.f) front = { f: dx * d.dir, dx: dx, dy: dy };   // 가는 쪽으로 가장 앞선 바닥 접점
          if (dx * d.dir > r * 0.75) low = true;   // 발 앞쪽 모서리에 걸침 → 올라타기
          if (color === 'red') red = other;
          if (color === 'blue') blue = true;
        } else if (dy < -r * D.groundCheck) above = root;
        else if (dx * d.dir > r * 0.5 && dy < r - stepUp) wall = true;
        else if (dx * d.dir > 0 && dy >= r - stepUp) low = true;   // 가는 쪽 발치의 낮은 턱 (쓰러진 선 조각 등)
      }
    }
    d.grounded = ground;
    if (front) {                                   // 바닥 면 방향 = 앞선 접점에서 중심으로 (턱 모서리면 그 기울기로 타고 오름)
      var len = Math.sqrt(front.dx * front.dx + front.dy * front.dy) || 1;
      d.groundN = { x: -front.dx / len, y: -front.dy / len };
    } else d.groundN = null;
    // 그래도 낮은 턱 앞에서 멈칫하면 살짝 들어 올려 넘김 (Matter.js 원은 턱을 스스로 넘지 못함)
    if (low && !wall && scale > 0 && Math.abs(b.velocity.x) < d.speed * 0.4) M.Body.translate(b, { x: d.dir * 1.5 * scale, y: -3 * scale });
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

  remove: function (engine, d) { if (d.body) { G.Physics.remove(engine, d.body); d.body = null; } }
};
