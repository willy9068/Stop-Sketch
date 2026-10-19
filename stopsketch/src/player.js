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
      turnCdMs: 0, turns: 0, stillMs: 0, lastX: x
    };
  },

  // 물리 스텝 직전에 호출. scale = 지금 시간 배율
  control: function (pl, scale) {
    var D = G.DATA.player, M = G.Physics.M, v = pl.body.velocity;
    if (!pl.grounded) return;                     // 공중에서는 물리에 맡김
    var vx = v.x + (D.runSpeed * pl.dir - v.x) * Math.min(1, D.accel * scale);
    M.Body.setVelocity(pl.body, { x: vx, y: v.y });
  },

  // 물리 스텝 직후에 호출: 바닥 판정, 벽 판정(뒤로 돌기), 막힘 판정
  sense: function (pl, engine, realMs, scale) {
    var D = G.DATA.player, b = pl.body, r = D.radius;
    var pts = G.Physics.contacts(engine, b);
    var ground = false, wall = false;
    for (var i = 0; i < pts.length; i++) {
      var dy = pts[i].y - b.position.y, dx = pts[i].x - b.position.x;
      if (dy > r * D.groundCheck) ground = true;
      else if (dx * pl.dir > r * 0.5 && dy < r - D.stepUp) wall = true;   // 가는 쪽 옆구리, 낮은 턱은 제외
    }
    pl.grounded = ground;
    pl.turnCdMs = Math.max(0, pl.turnCdMs - realMs * scale);
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
