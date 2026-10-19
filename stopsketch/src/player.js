// 캐릭터: 원형 몸체. 바닥에 있으면 바라보는 방향으로 목표 속도까지 가속(자동 달리기).
// 벽에 부딪히면 뒤로 돈다 (레밍즈식). 점프 없음 — 플레이어는 그림으로만 조작 (사용자 결정 2026-10-19).
var G = G || {};

G.Player = {
  create: function (engine, x, y) {
    var D = G.DATA.player, M = G.Physics.M;
    var body = M.Bodies.circle(x, y, D.radius, {
      friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0, label: 'player'
    });
    M.Body.setInertia(body, Infinity);   // 굴러가지 않게 (회전 없음)
    G.Physics.add(engine, body);
    return {
      body: body, dir: 1, grounded: false,
      turnCdMs: 0, turns: 0, stillMs: 0, lastX: x,
      boostMs: 0, bounceCdMs: 0, bounces: 0, onInk: null, events: []   // events: 이번 스텝의 색 효과 (화면 효과용)
    };
  },

  // 물리 스텝 직전에 호출. scale = 지금 시간 배율
  // fx = 구간의 색 효과 세기 (levels.js fx). 파랑을 밟는 중이거나 내린 직후면 더 빠른 목표 속도
  control: function (pl, scale, fx) {
    var D = G.DATA.player, M = G.Physics.M, v = pl.body.velocity;
    if (!pl.grounded) return;                     // 공중에서는 물리에 맡김
    var boost = pl.boostMs > 0 && fx;
    var target = D.runSpeed * (boost ? fx.boostPct / 100 : 1) * pl.dir;
    var vx = v.x + (target - v.x) * Math.min(1, D.accel * (boost ? 2.5 : 1) * scale);
    M.Body.setVelocity(pl.body, { x: vx, y: v.y });
  },

  // 물리 스텝 직후에 호출: 바닥 판정, 벽 판정(뒤로 돌기), 막힘 판정
  //   색 잉크: 빨강 선을 밟으면 선과 수직으로 튕김, 파랑 선을 밟는 동안·내린 뒤 boostMs 동안 빠름 (사용자 결정 2026-10-19)
  sense: function (pl, engine, realMs, scale, fx) {
    var D = G.DATA.player, b = pl.body, r = D.radius, gameMs = realMs * scale;
    var touch = G.Physics.touching(engine, b);
    var ground = false, wall = false, red = null, blue = false;
    pl.events.length = 0;
    for (var t = 0; t < touch.length; t++) {
      var pts = touch[t].pts, color = touch[t].other.inkColor;
      for (var i = 0; i < pts.length; i++) {
        var dy = pts[i].y - b.position.y, dx = pts[i].x - b.position.x;
        if (dy > r * D.groundCheck) {
          ground = true;
          if (color === 'red') red = touch[t].other;
          if (color === 'blue') blue = true;
        }
        else if (dx * pl.dir > r * 0.5 && dy < r - D.stepUp) wall = true;   // 가는 쪽 옆구리, 낮은 턱은 제외
      }
    }
    pl.grounded = ground;
    pl.onInk = red ? 'red' : blue ? 'blue' : null;
    pl.boostMs = Math.max(0, pl.boostMs - gameMs);
    pl.bounceCdMs = Math.max(0, pl.bounceCdMs - gameMs);
    if (fx && blue) {
      if (pl.boostMs <= 0) pl.events.push('boost');
      pl.boostMs = fx.boostMs;
    }
    if (fx && red && pl.bounceCdMs === 0 && scale > 0) {
      G.Physics.M.Body.setVelocity(b, G.Rules.bounceVelocity(red.angle, fx.bounce, b.velocity));
      pl.grounded = false;
      pl.bounceCdMs = G.DATA.bounceCdMs;
      pl.bounces += 1;
      pl.events.push('bounce');
    }
    pl.turnCdMs = Math.max(0, pl.turnCdMs - gameMs);
    if (wall && pl.turnCdMs === 0) {
      pl.dir = -pl.dir;
      pl.turns += 1;
      pl.turnCdMs = D.turnCooldownMs;
    }
    if (scale > 0) {
      if (Math.abs(b.position.x - pl.lastX) < 0.3 * scale) pl.stillMs += realMs;
      else pl.stillMs = 0;
    }
    pl.lastX = b.position.x;
  },

  isStuck: function (pl) { return pl.stillMs >= G.DATA.player.stuckMs; }
};
