// 게임 상태와 한 스텝 진행 — 물방울 무리 시험판 (사용자 결정 2026-10-20). 화면(DOM)과 무관 → 브라우저 밖에서도 돌릴 수 있다.
//   주인공이 죽으면 실패. 검은 잉크병(도착)에 닿은 물방울은 흡수되어 잉크병이 정화됨.
//   주인공이 도착하면 스킵 가능(남은 물방울은 죽은 것으로). 걷는 물방울이 하나도 안 남으면 바로 클리어
//   대열 (사용자 결정 2026-10-20): 주인공이 깨운 물방울은 주인공 발자국(game.trail)을 그대로 따라옴. 밀리거나 발밑이 사라지면 이탈,
//   혼자 걷다가 주인공에 닿으면 다시 대열 끝으로. game.line = 대열 순서 (통 튀어 붙는 중인 물방울 포함)
var G = G || {};

G.Game = {
  create: function (timeModeKey, levelData, account) {
    var game = {
      modeKey: 'A', mode: G.DATA.timeModes.A,
      levelData: levelData || G.LEVELS[0],
      account: account || { inkBonus: 0, bottles: {} },
      messages: [], attempt: 0, color: null
    };
    game.toast = function (text) { game.messages.push({ text: text, ms: 1800 }); };
    this.reset(game);
    return game;
  },

  setLevel: function (game, levelData) {
    game.levelData = levelData;
    game.attempt = 0;
    this.reset(game);
  },

  reset: function (game) {
    var D = G.DATA;
    game.engine = G.Physics.create();
    game.level = G.Level.build(game.engine, game.levelData);
    var lv = game.level.data;
    game.hero = G.Drop.create(game.engine, lv.start.x, lv.start.y - D.drop.heroRadius - 1, true, 1, lv.drops);   // 시작 y = 발밑
    game.drops = [game.hero];                      // 깨어난 물방울 (주인공 포함)
    game.line = [];                                // 대열 (주인공 뒤 순서대로)
    var hp = game.hero.body.position;
    game.trail = [{ x: hp.x, y: hp.y, s: 0, nx: 0, ny: -1, g: true }];   // 주인공 발자국 (s = 지나온 길이)
    game.trailS = 0;
    game.total = game.level.sleepers.length;       // 배치된 작은 물방울 수 (평가 기준)
    game.rescued = 0;                              // 도착한 작은 물방울
    game.lost = 0;                                 // 죽은 작은 물방울
    game.heroHome = false;                         // 주인공이 잉크병에 닿음 (이탈한 물방울은 죽은 것으로, 대열은 마저 들어감)
    game.heroIn = false;                           // 주인공이 잉크병 안에 들어감 (정화에 셈)
    game.goalQueue = [];                           // 잉크병 앞에 줄 선 물방울 (닿은 순서)
    game.entering = [];                            // 잉크병 입구로 뛰어드는 중
    game.enterCdMs = 0;
    game.lastReachMs = 0;
    var lowest = G.LevelCheck.lowestTop(lv);           // 비탈이면 낮은 쪽 끝 (사용자 요청 2026-10-21)
    game.failY = lowest + D.physics.failY - 600;
    game.inkMax = lv.ink;                          // 잉크 병은 이 스테이지에서만 늘림 (사용자 결정 2026-10-22: 계정 영구 성장 안 씀)
    game.ink = game.inkMax;
    game.stops = G.Rules.newStops(lv.stops);
    game.stopped = false;
    game.stoppedMs = 0;
    game.paused = false;                           // Esc 일시 정지 (사용자 결정 2026-10-21) — 시간 정지(stopped)와 따로
    game.stroke = null;
    game.lines = [];
    game.fallen = [];                              // 노랑으로 잘려 떨어진 배치된 선 조각
    game.projs = [];                               // 날아가는 투사체 {x, y, vx, vy, ms, color, from} (사용자 결정 2026-10-22)
    game.blocked = 0;                              // 같은 색 선에 막힌 투사체 수
    game.fx = [];
    game.eraserX = lv.noEraser ? -1e9 : lv.start.x - D.eraser.startBack;   // 지우개 끔 (레벨 툴, 사용자 요청 2026-10-22): 아주 먼 왼쪽에 둠
    game.status = 'ready';
    game.failReason = '';
    game.timeMs = 0;
    game.runMs = 0;                                // 게임 시간 (정지 중엔 안 흐름) — 지우개 출발에 씀
    game.finishedAt = 0;
    game.result = null;
    game.stopsUsedThisRun = 0;
    game.starKeys = [];                            // 이번 판에 주인공이 주운 별
    game.starsTotal = game.level.items.filter(function (it) { return it.kind === 'star'; }).length;
    game.attempt += 1;
    if (lv.inks.indexOf(game.color) < 0) game.color = lv.inks.indexOf('black') >= 0 ? 'black' : (lv.inks[0] || 'black');
  },

  start: function (game) { if (game.status === 'ready') game.status = 'run'; },
  setMode: function () {},

  setColor: function (game, c) {
    if (!G.DATA.inks[c]) return false;
    if (game.level.data.inks.indexOf(c) < 0) { game.toast(G.T('toast.inkLocked', { ink: G.DATA.inks[c].name })); return false; }
    game.color = c;
    return true;
  },

  toggleStop: function (game) {
    if (game.status !== 'run' || game.paused) return;
    if (game.stopped) { this.resume(game); return; }
    if (!game.level.data.infStops && !G.Rules.useStop(game.stops)) { game.toast(G.T('toast.noStops')); return; }   // 정지 무제한이면 안 줄어듦 (레벨 툴, 사용자 요청 2026-10-21)
    game.stopped = true;
    game.stoppedMs = 0;
    game.stopsUsedThisRun += 1;
  },

  resume: function (game) {
    if (!game.stopped) return;
    G.Draw.end(game);
    G.Draw.activateAll(game);
    game.stopped = false;
  },

  // Esc 일시 정지 (사용자 결정 2026-10-21): 달리는 중에만. 정지 횟수 안 씀, 게임 시간·알림도 멈춤, 그리던 선은 끝냄.
  //   시간 정지 중에 걸면 풀었을 때 시간 정지 그대로
  pause: function (game) {
    if (game.status !== 'run' || game.paused) return;
    G.Draw.end(game);
    game.paused = true;
  },
  unpause: function (game) { game.paused = false; },
  togglePause: function (game) { if (game.paused) this.unpause(game); else this.pause(game); },

  scale: function (game) { return game.stopped ? 0 : 1; },

  walking: function (game) { return game.drops.filter(function (d) { return d.state === 'walk'; }); },

  update: function (game, realMs) {
    if (game.paused) return;
    for (var i = game.messages.length - 1; i >= 0; i--) {
      game.messages[i].ms -= realMs;
      if (game.messages[i].ms <= 0) game.messages.splice(i, 1);
    }
    if (game.status !== 'run') return;
    if (game.fx.length) game.fx = game.fx.filter(function (f) { return f.real ? Date.now() - f.real < 1500 : game.timeMs - f.t < 1000; });
    if (game.stopped) game.stoppedMs += realMs;
    game.timeMs += realMs;
    var s = this.scale(game);
    if (s <= 0) return;                            // 완전 정지: 물리·지우개 모두 멈춤
    var fx = game.level.data.fx, self = this, walk = this.walking(game);
    game.runMs += realMs * s;
    var free = walk.filter(function (d) { return d.mode === 'hero' || d.mode === 'free'; });
    var liners = walk.filter(function (d) { return d.mode === 'line'; });
    var joiners = walk.filter(function (d) { return d.mode === 'join'; });
    var fallers = walk.filter(function (d) { return d.mode === 'fall' || d.mode === 'wait'; });

    var vyBefore = free.map(function (d) { return { g: d.grounded, vy: d.body.velocity.y }; });
    free.forEach(function (d) { G.Drop.control(d, s, fx); });
    liners.forEach(function (d) { self.placeLine(game, d); });
    fallers.forEach(function (d) { self.beforeFall(game, d); });
    G.Physics.step(game.engine, s);
    liners.forEach(function (d) { self.checkLine(game, d); });
    fallers.forEach(function (d) { self.afterFall(game, d, realMs, s, fx); });
    free.forEach(function (d, k) {
      G.Drop.sense(d, game.engine, realMs, s, fx);
      d.events.forEach(function (e) { game.fx.push({ type: e, x: d.body.position.x, y: d.body.position.y + d.r, dir: d.dir, small: !d.hero, t: game.timeMs }); });   // small: 소리 크기 (sound.js)
      if (!vyBefore[k].g && d.grounded && vyBefore[k].vy >= G.DATA.art.fx.landVy && d.hero) {
        game.fx.push({ type: 'land', x: d.body.position.x, y: d.body.position.y + d.r, t: game.timeMs });
      }
    });
    this.recordTrail(game);
    walk.forEach(function (d) { if (d.state === 'walk' && d.mode !== 'join') G.Drop.tint(d, realMs * s); });
    joiners.forEach(function (d) { self.moveJoin(game, d, realMs * s); });
    G.Draw.rise(game, s, fx);
    G.Draw.cleanup(game);
    this.shoot(game);                              // 물방울 판정(대열·떨어짐)이 끝난 뒤에 → 맞아서 몸체가 없어진 물방울을 다시 보지 않게 (2026-10-22 수정)
    this.moveProjectiles(game, s);
    if (game.status !== 'run') return;
    this.moveEraser(game, s);

    walk.forEach(function (d) {
      if (d.state !== 'walk' || game.status !== 'run') return;
      var p = d.body.position;
      if (d.dead) return self.kill(game, d, d.dead);
      if (p.y > game.failY) return self.kill(game, d, 'fall');
      if (p.x - d.r < game.eraserX) return self.kill(game, d, 'erased');
      if (game.heroHome && d.mode === 'free' && !self.inGoal(game, p)) return self.kill(game, d, 'home');   // 주인공 도착 뒤 이탈한 물방울은 죽은 것 (사용자 결정 2026-10-21)
      self.collect(game, d);
      if (d.hero || !game.level.data.drops.follow) self.wake(game, d);
      if (d.mode === 'free' && game.level.data.drops.follow) self.rejoin(game, d);
      if (self.inGoal(game, p)) self.arrive(game, d);
    });
    if (game.status !== 'run') return;
    this.updateGoal(game, realMs * s);
    if (game.heroHome && !this.walking(game).length && !game.goalQueue.length && !game.entering.length) this.clear(game);
  },

  // 지우개: 출발 delay 뒤 eraser.speed 로 오른쪽으로 (게임 시간 기준이라 정지 중엔 멈춤). 주인공 속도와 따로 (사용자 요청 2026-10-23)
  moveEraser: function (game, s) {
    var E = game.level.data.eraser;
    if (game.level.data.noEraser || game.runMs < E.delayMs) return;
    game.eraserX += E.speed * s;
    for (var i = game.lines.length - 1; i >= 0; i--) {   // 지우개가 지나간 선도 지움 (잉크는 돌아오지 않음)
      var ln = game.lines[i], pts = G.Draw.worldPts(ln), maxX = -Infinity;
      pts.forEach(function (q) { maxX = Math.max(maxX, q.x); });
      if (maxX < game.eraserX) {
        var lp = pts[pts.length - 1];
        game.fx.push({ type: 'erasePuff', x: lp.x, y: lp.y, r: 14, line: true, real: Date.now(), t: game.timeMs });
        G.Draw.drop(game, ln, false);
      }
    }
  },

  // ── 발사기 (사용자 결정 2026-10-22) ──
  // firstMs 뒤 periodMs 마다 aim 방향으로 투사체. 게임 시간(runMs)이라 정지 중에는 안 쏨
  shoot: function (game) {
    var D = G.DATA, def = D.props.shooter;
    game.level.shooters.forEach(function (sh) {
      var p = sh.prop, period = Math.max(100, p.periodMs || def.periodMs);
      while (game.runMs >= sh.next) {
        sh.next += period;
        var a = (p.aim != null ? p.aim : def.aim) * Math.PI / 180, sp = p.speed || def.speed;
        var cx = p.x + p.w / 2, cy = p.y + p.h / 2, reach = Math.max(p.w, p.h) / 2 + D.projectile.radius + 2;
        game.projs.push({ x: cx + Math.cos(a) * reach, y: cy + Math.sin(a) * reach, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ms: 0,
                          color: p.shot || def.shot, from: sh.body });
      }
    });
  },

  // 투사체 이동: 같은 색 선에 닿으면 막힘, 땅·벽·발판·가시·배치된 선(조각 포함)에 닿으면 사라짐 (다른 색 선은 통과, 선은 그대로).
  //   주인공이 맞으면 실패, 작은 물방울은 잃음 (가시와 같은 규칙)
  moveProjectiles: function (game, s) {
    var D = G.DATA, pr = D.projectile.radius, th = D.ink.thickness / 2, M = G.Physics.M;
    var solids = game.level.statics.concat(game.level.crystals.map(function (c) { return c.body; }), game.fallen.map(function (f) { return f.body; }));
    for (var i = game.projs.length - 1; i >= 0; i--) {
      var q = game.projs[i], gone = false;
      q.x += q.vx * s; q.y += q.vy * s; q.ms += D.loop.stepMs * s;
      for (var k = 0; k < game.lines.length && !gone; k++) {
        var ln = game.lines[k];
        if (!ln.body || ln.color !== q.color) continue;
        var pts = G.Draw.worldPts(ln);
        for (var j = 1; j < pts.length; j++) {
          if (G.Rules.pointSegDist(q, pts[j - 1], pts[j]) <= pr + th) { gone = 'block'; break; }
        }
      }
      if (!gone && M.Query.point(solids.filter(function (b) { return b !== q.from; }), { x: q.x, y: q.y }).length) gone = 'hit';
      if (!gone && (q.ms > D.projectile.lifeMs || q.y > game.failY)) gone = 'old';
      if (!gone) {
        var hit = null;
        this.walking(game).forEach(function (d) {
          if (hit || !d.body) return;
          var r = d.r + pr * D.projectile.hitK, dx = q.x - d.body.position.x, dy = q.y - d.body.position.y;
          if (dx * dx + dy * dy < r * r) hit = d;
        });
        if (!hit) continue;
        game.projs.splice(i, 1);
        game.fx.push({ type: 'block', x: q.x, y: q.y, color: q.color, t: game.timeMs });
        this.kill(game, hit, 'shot');
        if (game.status !== 'run') return;
        continue;
      }
      if (gone !== 'old') game.fx.push({ type: 'block', x: q.x, y: q.y, color: q.color, t: game.timeMs });
      if (gone === 'block') game.blocked += 1;
      game.projs.splice(i, 1);
    }
  },

  // ── 대열 ──
  // 주인공 발자국: 1px 이상 움직일 때마다 위치·바닥 방향·바닥에 있었는지 기록. 대열이 다 지나간 앞부분은 버림
  recordTrail: function (game) {
    var h = game.hero, tr = game.trail;
    if (h.state !== 'walk' || !h.body) return;
    var p = h.body.position, last = tr[tr.length - 1], dx = p.x - last.x, dy = p.y - last.y, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var n = h.groundN || { x: 0, y: -1 };
    game.trailS += len;
    tr.push({ x: p.x, y: p.y, s: game.trailS, nx: n.x, ny: n.y, g: !!h.grounded, c: h.under || null });   // c: 주인공이 밟은 색 (대열 물들기)
    if (tr.length > 3000) {
      var minS = game.trailS - game.level.data.drops.gap * (game.line.length + 2);
      game.line.forEach(function (d) { if (d.s != null) minS = Math.min(minS, d.s); });
      var cut = 0;
      while (cut < tr.length - 2 && tr[cut + 1].s < minS - 50) cut++;
      if (cut) tr.splice(0, cut);
    }
  },

  // 발자국 위 길이 s 지점 (사이는 보간). 작은 물방울 중심 = 주인공 중심을 바닥 방향으로 반지름 차만큼 내린 곳
  trailAt: function (game, s, r) {
    var tr = game.trail, lo = 0, hi = tr.length - 1;
    if (s <= tr[0].s) hi = 0;
    else if (s >= tr[hi].s) lo = hi;
    else {
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (tr[mid].s <= s) lo = mid; else hi = mid; }
    }
    var a = tr[lo], b = tr[hi], u = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0, off = G.DATA.drop.heroRadius - r;
    return { x: a.x + (b.x - a.x) * u - a.nx * off, y: a.y + (b.y - a.y) * u - a.ny * off, g: a.g && b.g };
  },

  // 발자국 s0 ~ s1 사이에서 주인공이 밟은 색. 닿자마자 튕기는 색(빨강)이 있으면 그 색 먼저
  //   (사용자 요청 2026-10-21: 주인공은 빨강에 1~2스텝만 닿고 튕겨서, 발자국을 따라 옮겨지는 대열 물방울은 빨강에 직접 닿지 못해 안 물들던 문제)
  trailColor: function (game, s0, s1) {
    var tr = game.trail, lo = 0, hi = tr.length - 1, out = null, touch = G.DATA.tint.touchColors;
    if (s0 == null || !(s1 > s0)) return null;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (tr[mid].s <= s0) lo = mid; else hi = mid; }
    for (var i = lo; i < tr.length && tr[i].s <= s1; i++) {
      var c = tr[i].c;
      if (!c || tr[i].s < s0) continue;
      if (touch.indexOf(c) >= 0) return c;
      out = out || c;
    }
    return out;
  },

  // 대열에서 내 자리: 주인공 뒤 (순서 + 1) × 간격. 주인공이 도착했으면 모두 발자국 끝(잉크병)으로
  slotS: function (game, d) {
    if (game.heroHome) return game.trailS;
    return Math.max(game.trail[0].s, game.trailS - game.level.data.drops.gap * (game.line.indexOf(d) + 1));
  },

  // 물리 스텝 전: 대열 물방울을 제자리(발자국 위)로 옮김
  placeLine: function (game, d) {
    var F = G.DATA.drop.follow, M = G.Physics.M, want = this.slotS(game, d), s0 = d.s;
    if (game.heroHome) d.s = Math.min(want, d.s + Math.max(game.level.data.drops.heroSpeed, (want - d.s) * F.catchUp));
    else if (want > d.s) d.s += (want - d.s) * F.catchUp;
    var t = this.trailAt(game, d.s, d.r);
    d.trailC = this.trailColor(game, s0, d.s);
    d.prev = { x: d.body.position.x, y: d.body.position.y };
    d.expect = t;
    M.Body.setPosition(d.body, { x: t.x, y: t.y });
    M.Body.setVelocity(d.body, { x: 0, y: 0 });
  },

  // 물리 스텝 뒤: 밀렸거나(새로 그린 선·떨어지는 선) 주인공이 밟았던 바닥이 사라졌으면 이탈
  checkLine: function (game, d) {
    var F = G.DATA.drop.follow, M = G.Physics.M, b = d.body, e = d.expect;
    var dx = b.position.x - e.x, dy = b.position.y - e.y, disp = Math.sqrt(dx * dx + dy * dy);
    var sup = G.Drop.support(d, game.engine);
    if (sup.spike) { d.dead = 'spike'; return; }
    d.vel = { x: e.x - d.prev.x, y: e.y - d.prev.y };
    d.under = d.trailC || sup.color;               // 주인공이 그 자리에서 밟은 색이 먼저 (직접 닿은 색은 그다음)
    if (Math.abs(d.vel.x) > 0.05) d.dir = d.vel.x > 0 ? 1 : -1;
    d.nudge = disp > F.nudgeDist ? (d.nudge || 0) + 1 : 0;
    d.unsup = e.g && !sup.ground ? (d.unsup || 0) + 1 : 0;
    if (disp > F.breakDist || d.nudge > F.nudgeSteps) { this.detach(game, d); return; }
    if (d.unsup > F.unsupportedSteps) { this.startFall(game, d); return; }   // 발밑이 사라짐 → 대열에 남은 채 떨어짐 (사용자 결정 2026-10-21)
    M.Body.setPosition(b, { x: e.x, y: e.y });     // 중력으로 살짝 내려간 만큼 되돌림
    d.grounded = e.g;
  },

  // ── 대열에 남은 채 떨어지기 (사용자 결정 2026-10-21, grill me) ──
  //   fall: 실제 물리로 낙하 (걷던 옆 속도 유지, 걷기 조작 없음) / wait: 착지해서 제자리에 서서 자기 자리가 바닥 있는 곳이 되길 기다림
  startFall: function (game, d) {
    d.mode = 'fall';
    G.Drop.setFilter(d, 'fall');
    var v = d.vel || { x: 0, y: 0 }, vx = Math.max(-d.speed, Math.min(d.speed, v.x));   // 옆 속도는 걷는 속도까지 (대열 따라붙기로 빨라진 만큼은 뺌)
    G.Physics.M.Body.setVelocity(d.body, { x: vx, y: Math.max(0, v.y) });
    d.nudge = d.unsup = 0;
  },

  beforeFall: function (game, d) {
    var M = G.Physics.M, v = d.body.velocity;
    if (d.mode === 'wait') M.Body.setVelocity(d.body, { x: 0, y: v.y });   // 서서 기다림 (걷지 않음)
    d.prev = { x: d.body.position.x, y: d.body.position.y };
    d.vBefore = { x: d.body.velocity.x, y: d.body.velocity.y };
  },

  afterFall: function (game, d, realMs, s, fx) {
    var F = G.DATA.drop.follow, b = d.body, v = b.velocity, vb = d.vBefore;
    if (d.mode === 'wait') {                       // 서 있는 동안은 걷기 판정(턱 올라타기 등) 없이 발밑만 봄
      var sup = G.Drop.support(d, game.engine);
      if (sup.spike) { d.dead = 'spike'; return; }
      d.grounded = sup.ground; d.under = sup.color; d.events.length = 0;
    } else G.Drop.sense(d, game.engine, realMs, s, fx);
    if (d.dead) return;
    d.events.forEach(function (e) { game.fx.push({ type: e, x: b.position.x, y: b.position.y + d.r, dir: d.dir, small: true, t: game.timeMs }); });
    d.vel = { x: v.x, y: v.y };
    if (d.mode === 'fall') {
      // 외부 영향 = 빨강에 튕김, 공중에서 옆으로 부딪힘(옆 속도가 확 바뀜), 위로 밀림. 위에서 내려서는 착지는 아님
      if (d.events.indexOf('bounce') >= 0 || (!d.grounded && (Math.abs(v.x - vb.x) > F.fallPush || v.y - vb.y < -F.fallUp))) { this.detach(game, d); return; }
      if (d.grounded) { d.mode = 'wait'; d.unsup = 0; G.Physics.M.Body.setVelocity(b, { x: 0, y: v.y }); }
      return;
    }
    // wait: 밀리면 평소처럼 이탈, 발밑이 다시 사라지면 다시 떨어짐
    var dx = Math.abs(b.position.x - d.prev.x);
    d.nudge = dx > F.nudgeDist ? (d.nudge || 0) + 1 : 0;
    if (dx > F.breakDist || d.nudge > F.nudgeSteps) { this.detach(game, d); return; }
    d.unsup = d.grounded ? 0 : (d.unsup || 0) + 1;
    if (d.unsup > F.unsupportedSteps) { d.mode = 'fall'; d.unsup = 0; return; }
    var slot = this.slotS(game, d), tp = this.trailAt(game, slot, d.r);
    if (tp.g && this.groundAt(game, tp, d.r)) this.startReturn(game, d);
  },

  // 대열 자리(발자국 위 점)에 지금 바닥이 있는가 (주인공이 지나간 뒤 지워진 선 위면 없음)
  groundAt: function (game, p, r) {
    var M = G.Physics.M, reach = r + G.DATA.drop.follow.supportTol;
    var bodies = G.Physics.allBodies(game.engine).filter(function (q) { return q.label !== 'drop'; });
    return M.Query.ray(bodies, { x: p.x, y: p.y }, { x: p.x, y: p.y + reach }, r * 1.2).length > 0;
  },

  // 자기 자리로 통 튀어 복귀 (순서 그대로). 멀수록 길고 높게
  startReturn: function (game, d) {
    var F = G.DATA.drop.follow, H = F.returnHop, tp = this.trailAt(game, this.slotS(game, d), d.r);
    var dist = Math.sqrt(Math.pow(tp.x - d.body.position.x, 2) + Math.pow(tp.y - d.body.position.y, 2));
    d.mode = 'join';
    G.Drop.setFilter(d, 'join');
    d.join = { t: 0, wake: 0, from: { x: d.body.position.x, y: d.body.position.y },
      ms: Math.min(H.maxMs, Math.max(F.hopMs, dist * H.msPerPx)), h: Math.min(H.maxH, Math.max(F.hopHeight, dist * H.hPerPx)) };
    d.s = null;
  },

  detach: function (game, d) {
    this.unline(game, d);
    d.mode = 'free';
    G.Drop.setFilter(d, 'free', game.level.data.drops.collide);
    G.Physics.M.Body.setVelocity(d.body, d.vel || { x: 0, y: 0 });
    d.nudge = d.unsup = 0; d.s = null; d.turnCdMs = 0;
    d.detaches = (d.detaches || 0) + 1;
    d.detachAt = game.runMs;
  },

  unline: function (game, d) { var i = game.line.indexOf(d); if (i >= 0) game.line.splice(i, 1); },

  // 대열 끝에 붙기 시작: wakeMs 동안 제자리에서 깨어나는 모션 → hopMs 동안 대열 끝자리로 통 튐 (사용자 결정 2026-10-20)
  startJoin: function (game, d, wakeMs) {
    d.mode = 'join';
    G.Drop.setFilter(d, 'join');
    game.line.push(d);
    d.join = { t: 0, wake: wakeMs, from: { x: d.body.position.x, y: d.body.position.y } };
    d.s = null;
  },

  moveJoin: function (game, d, ms) {
    var F = G.DATA.drop.follow, M = G.Physics.M, j = d.join, prev = { x: d.body.position.x, y: d.body.position.y }, p;
    j.t += ms;
    if (j.t < j.wake) p = j.from;
    else {
      var u = Math.min(1, (j.t - j.wake) / (j.ms || F.hopMs)), slot = this.slotS(game, d), tp = this.trailAt(game, slot, d.r);
      p = { x: j.from.x + (tp.x - j.from.x) * u, y: j.from.y + (tp.y - j.from.y) * u - (j.h || F.hopHeight) * 4 * u * (1 - u) };
      if (u >= 1) {
        d.mode = 'line'; d.s = slot; d.join = null; d.nudge = d.unsup = 0;
        G.Drop.setFilter(d, 'line');
      }
    }
    M.Body.setPosition(d.body, p);
    M.Body.setVelocity(d.body, { x: 0, y: 0 });
    d.vel = { x: p.x - prev.x, y: p.y - prev.y };
    if (Math.abs(d.vel.x) > 0.05) d.dir = d.vel.x > 0 ? 1 : -1;
    d.grounded = d.mode === 'line' || j.t < j.wake;
  },

  // 혼자 걷는 물방울이 주인공에 닿으면 다시 대열 끝으로
  rejoin: function (game, d) {
    var h = game.hero;
    if (h.state !== 'walk' || !h.body || !d.grounded) return;              // 떨어지는 중엔 안 붙음
    if (d.detachAt != null && game.runMs - d.detachAt < G.DATA.drop.follow.rejoinCdMs) return;
    var reach = (d.r + h.r) * G.DATA.drop.follow.rejoinReach, dx = d.body.position.x - h.body.position.x, dy = d.body.position.y - h.body.position.y;
    if (dx * dx + dy * dy > reach * reach) return;
    this.startJoin(game, d, 0);
    game.fx.push({ type: 'star', x: d.body.position.x, y: d.body.position.y, t: game.timeMs });
  },

  // 잠든 물방울: 주인공이 닿으면 깨어나 대열 끝에 붙음 (대열 켬). 대열 끔이면 걷는 물방울 누구나 깨우고 그 방향으로 출발 (사용자 결정 2026-10-20)
  wake: function (game, d) {
    var D = G.DATA.drop, p = d.body.position;
    game.level.sleepers.forEach(function (sl) {
      if (sl.state !== 'sleep') return;
      var reach = (d.r + D.smallRadius) * D.wakeReach, dx = sl.x - p.x, dy = sl.y - p.y;
      if (dx * dx + dy * dy > reach * reach) return;
      sl.state = 'awake';
      var nd = G.Drop.create(game.engine, sl.x, sl.y, false, d.dir, game.level.data.drops);
      game.drops.push(nd);
      if (game.level.data.drops.follow) G.Game.startJoin(game, nd, G.DATA.drop.follow.wakeMs);
      game.fx.push({ type: 'star', x: sl.x, y: sl.y, t: game.timeMs });
    });
  },

  // 아이템: 아무 물방울이나 닿으면 획득, 별은 주인공만 (사용자 결정 2026-10-20). 정지 +1·잉크 병은 이 스테이지에서만 (잉크 병: 사용자 결정 2026-10-22)
  collect: function (game, d) {
    var D = G.DATA, p = d.body.position;
    game.level.items.forEach(function (it) {
      if (it.got) return;
      if (it.kind === 'star' && !d.hero) return;   // 별은 주인공만 (사용자 결정 2026-10-20)
      var q = it.prop, reach = d.r + (q.size || D.props[it.kind].size) * D.level.pickup;
      var dx = q.x - p.x, dy = q.y - p.y;
      if (dx * dx + dy * dy > reach * reach) return;
      it.got = true; it.gotMs = game.timeMs;
      game.fx.push({ type: 'star', x: q.x, y: q.y, t: game.timeMs });
      if (it.kind === 'star') game.starKeys.push(it.key);
      else if (it.kind === 'stopup') {
        game.stops.left += D.stopUp; game.stops.max += D.stopUp;
        game.toast(G.T('toast.stopUp', { n: D.stopUp }));
      } else if (it.kind === 'inkup') {
        var up = q.amount || D.ink.upAmount;       // 병마다 양을 바꿀 수 있음 (레벨 툴)
        game.inkMax += up; game.ink += up;
        game.toast(G.T('toast.inkUp', { n: up }));
      }
    });
  },

  // 잉크병에 닿음: 몸체를 빼고 잉크병 앞 줄에 섬 → 닿은 순서대로 하나씩 입구로 뛰어듦 (사용자 요청 2026-10-20: 한꺼번에 빨리 들어가지 않게)
  arrive: function (game, d) {
    d.state = 'queue';
    this.unline(game, d);
    d.qx = d.body.position.x; d.qy = d.body.position.y;
    G.Drop.remove(game.engine, d);
    game.goalQueue.push(d);
    game.lastReachMs = game.timeMs;
    if (d.hero) { game.heroHome = true; game.toast(G.T('toast.heroHome')); }
  },

  // 잉크병에 닿았는가: 도착 x 오른쪽이면서 잉크병 높이 안 (사용자 결정 2026-10-20: 도착을 위아래로도 옮김)
  inGoal: function (game, p) {
    var J = G.DATA.art.goalJar, g = game.level.data.goal;
    return p.x >= g.x && p.x <= g.x + J.w && p.y >= g.y - J.h - 60 && p.y <= g.y + 10;
  },

  // 잉크병 입구 (그림 기준: 왼쪽 끝 ≈ 도착 x)
  goalMouth: function (game) {
    var J = G.DATA.art.goalJar, gx = game.level.goalX, gy = game.level.data.goal.y;
    return { x: gx - 10 + J.w * J.mouth, y: gy - J.h * 0.95, gy: gy };
  },

  // 줄: 잉크병 왼쪽 앞으로 간격대로 섬 (미끄러져 자리로). 맨 앞부터 gapMs 마다 하나씩 enterMs 동안 포물선으로 뛰어들며 작아짐
  updateGoal: function (game, ms) {
    var E = G.DATA.goalEnter, m = this.goalMouth(game), self = this;
    game.enterCdMs = Math.max(0, game.enterCdMs - ms);
    game.goalQueue.forEach(function (d, k) {
      var tx = game.level.goalX - E.spacing * (k + 0.5), ty = m.gy - d.r;   // 잉크병 바닥 높이에 줄 섬 (공중 잉크병이어도)
      d.qx += (tx - d.qx) * Math.min(1, E.slide * ms / 16.7);
      d.qy += (ty - d.qy) * Math.min(1, E.slide * ms / 16.7);
    });
    if (game.goalQueue.length && game.enterCdMs <= 0) {
      var d = game.goalQueue.shift();
      d.state = 'enter';
      d.enter = { t: 0, x0: d.qx, y0: d.qy };
      game.entering.push(d);
      game.enterCdMs = E.gapMs;
    }
    game.entering = game.entering.filter(function (d) {
      d.enter.t += ms;
      if (d.enter.t < E.enterMs) return true;
      self.absorb(game, d, m);
      return false;
    });
  },

  // 입구로 뛰어드는 중인 물방울 위치·크기 (그리기용)
  enterPose: function (game, d) {
    var E = G.DATA.goalEnter, m = this.goalMouth(game), u = Math.min(1, d.enter.t / E.enterMs), e = d.enter;
    var top = Math.min(e.y0, m.y) - E.hopHeight;
    var x = e.x0 + (m.x - e.x0) * u;
    var y = (1 - u) * (1 - u) * e.y0 + 2 * u * (1 - u) * top + u * u * m.y;   // 2차 베지어 포물선
    return { x: x, y: y, scale: 1 - u * (1 - E.endScale), u: u };
  },

  absorb: function (game, d, m) {
    d.state = 'home';
    game.fx.push({ type: 'absorb', x: m.x, y: 0, t: game.timeMs });
    if (d.hero) game.heroIn = true; else game.rescued += 1;
  },

  // reason: 실패 이유 이름 fall / erased / spike / shot (글자는 uitext.js fail.*). 스킵으로 지울 때는 ''
  kill: function (game, d, reason) {
    if ((reason === 'erased' || reason === 'home') && d.body) {   // 지워지는 순간: 가루 효과 + 지워진 얼굴 (화면 시간으로, 실패 뒤에도 재생)
      game.fx.push({ type: 'erasePuff', x: d.body.position.x, y: d.body.position.y, r: d.r, real: Date.now(), t: game.timeMs });
    }
    d.state = 'dead';
    this.unline(game, d);
    G.Drop.remove(game.engine, d);
    if (d.hero) { this.finish(game, 'fail', reason ? G.T('fail.' + reason) : ''); return; }
    game.lost += 1;
  },

  // 정화 정도 0~1: 도착한 물방울(주인공 포함) / 전체(주인공 + 배치된 작은 물방울)
  // 잉크병 색 비율 0~1: 정화 정도보다 빨리 밝아지게 (^jarCurve). 1 이면 물방울 기본색 그대로 (사용자 요청 2026-10-21, 물방울 색 섞기는 뺌)
  jarMix: function (p) { return G.Rules.jarMix(p, G.DATA.goalEnter.jarCurve); },

  purity: function (game) { return (game.rescued + (game.heroIn ? 1 : 0)) / (game.total + 1); },

  canSkip: function (game) { return G.DATA.goalEnter.skip && game.status === 'run' && game.heroHome; },   // 지금은 꺼짐 (사용자 결정 2026-10-21)
  skip: function (game) {
    if (!this.canSkip(game)) return;
    var self = this;
    this.walking(game).forEach(function (d) { self.kill(game, d, ''); });   // 기다리지 않은 물방울은 죽은 것 (사용자 결정 2026-10-20)
    var m = this.goalMouth(game);                  // 이미 잉크병에 닿아 줄 선 물방울은 바로 들어간 것으로
    game.goalQueue.concat(game.entering).forEach(function (d) { self.absorb(game, d, m); });
    game.goalQueue = []; game.entering = [];
    this.clear(game);
  },

  clear: function (game) { this.finish(game, 'clear', ''); },

  finish: function (game, status, reason) {
    game.status = status;
    game.finishedAt = Date.now();
    game.failReason = reason;
    game.stopped = false;
    game.paused = false;
    game.stroke = null;
    game.result = null;
    if (status === 'clear') {
      game.result = G.Rules.clearResult({
        stars: game.starKeys, starsTotal: game.starsTotal, rescued: game.rescued, total: game.total, heroIn: game.heroIn,
        timeMs: game.lastReachMs || game.timeMs
      });
    }
    if (game.onFinish) game.onFinish(game);
  }
};
