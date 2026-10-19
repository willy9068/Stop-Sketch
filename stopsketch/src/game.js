// 게임 상태와 한 스텝 진행. 화면(DOM)과 무관 → 브라우저 밖에서도 돌릴 수 있다.
var G = G || {};

G.Game = {
  // levelData: levels.js 의 구간 하나 (없으면 첫 구간)
  // account: 계정 저장 (G.Save). 잉크 최대량 성장·먹은 잉크 병을 여기에 기록한다. 없으면 빈 계정
  create: function (timeModeKey, levelData, account) {
    var game = {
      modeKey: timeModeKey, mode: G.DATA.timeModes[timeModeKey],
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

  // 구간 처음부터 (잉크·정지 횟수·선·별 모두 초기화)
  reset: function (game) {
    var D = G.DATA;
    game.engine = G.Physics.create();
    game.level = G.Level.build(game.engine, game.levelData, game.account);
    var lv = game.level.data;
    var top = G.Level.groundTopAt(lv, lv.start.x);
    if (top == null) top = 600;                    // 레벨 툴에서 잘못 놓은 경우에도 멈추지 않게
    game.player = G.Player.create(game.engine, lv.start.x, top - D.player.radius - 1);
    var lowest = lv.ground.reduce(function (m, g) { return Math.max(m, g.top); }, 600);
    game.failY = lowest + D.physics.failY - 600;   // 가장 낮은 땅보다 500 아래로 떨어지면 실패
    game.inkMax = lv.ink + (game.account.inkBonus || 0);   // 구간 기본량 + 계정에 쌓인 잉크 병 보너스
    game.ink = game.inkMax;
    game.inkRefunded = 0;         // 이번 판에 사라진 선에서 돌려받은 양 (확인용)
    game.inkDrained = 0;          // 이번 판에 웅덩이로 잃은 양
    game.stops = G.Rules.newStops(lv.stops);
    game.stopped = false;
    game.stoppedMs = 0;
    game.stroke = null;
    game.lines = [];
    game.fx = [];                 // 짧은 효과 (별 반짝, 착지 먼지, 튕김·가속·막기)
    game.projs = [];              // 날아가는 투사체 {x, y, vx, vy, ms}
    game.blocked = 0;             // 초록 선으로 막은 투사체 수
    game.finishedAt = 0;          // 끝난 시각 (Date.now, 도착 물감 통이 차오르는 연출용)
    // 고른 색: 이 구간에서 쓸 수 있으면 그대로, 아니면 첫 색 (사용자 결정 2026-10-19: 병 클릭 / 휠 / 1·2·3)
    //   처음에는 초록(보통 발판)이 있으면 초록
    if (lv.inks.indexOf(game.color) < 0) game.color = lv.inks.indexOf('green') >= 0 ? 'green' : (lv.inks[0] || 'green');
    game.status = 'ready';        // ready(시작 대기) | run | clear | fail
    game.failReason = '';
    game.timeMs = 0;              // 구간 진행 시간(실제 시간 기준)
    game.stopsUsedThisRun = 0;
    game.attempt += 1;
  },

  start: function (game) { if (game.status === 'ready') game.status = 'run'; },

  setMode: function (game, key) {
    game.modeKey = key;
    game.mode = G.DATA.timeModes[key];
  },

  toggleStop: function (game) {
    if (game.status !== 'run') return;
    if (game.stopped) { this.resume(game); return; }
    if (!G.Rules.useStop(game.stops)) { game.toast('정지 횟수가 없어요'); return; }
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

  // 색 고르기. 이 구간에서 아직 못 쓰는 색이면 안내만
  setColor: function (game, c) {
    if (!G.DATA.inks[c]) return false;
    if (game.level.data.inks.indexOf(c) < 0) { game.toast(G.DATA.inks[c].name + ': 이 구간에서는 아직 못 써요'); return false; }
    game.color = c;
    return true;
  },
  cycleColor: function (game, d) { game.color = G.Rules.nextColor(game.level.data.inks, game.color, d) || game.color; },

  scale: function (game) { return G.Rules.timeScale(game.mode, game.stopped); },

  // 고정 타임스텝 한 번 (realMs = 실제 시간 1스텝)
  update: function (game, realMs) {
    for (var i = game.messages.length - 1; i >= 0; i--) {
      game.messages[i].ms -= realMs;
      if (game.messages[i].ms <= 0) game.messages.splice(i, 1);
    }
    if (game.status !== 'run') return;
    if (game.fx.length) game.fx = game.fx.filter(function (f) { return game.timeMs - f.t < 1000; });

    if (game.stopped) {
      game.stoppedMs += realMs;
      if (G.Rules.shouldAutoResume(game.mode, game.stopped, game.stoppedMs)) {
        this.resume(game);
        game.toast('시간 제한! 재생');
      }
    }
    game.timeMs += realMs;

    var s = this.scale(game), pl = game.player;
    if (s > 0) {
      var wasGrounded = pl.grounded, vyBefore = pl.body.velocity.y;
      var fx = game.level.data.fx;
      G.Player.control(pl, s, fx);
      G.Physics.step(game.engine, s);
      G.Player.sense(pl, game.engine, realMs, s, fx);
      pl.events.forEach(function (e) {             // 튕김·가속 효과
        game.fx.push({ type: e, x: pl.body.position.x, y: pl.body.position.y + G.DATA.player.radius, dir: pl.dir, t: game.timeMs });
      });
      if (!wasGrounded && pl.grounded && vyBefore >= G.DATA.art.fx.landVy) {   // 높은 곳에서 떨어져 닿음 → 먼지
        game.fx.push({ type: 'land', x: pl.body.position.x, y: pl.body.position.y + G.DATA.player.radius, t: game.timeMs });
      }
      G.Draw.age(game, realMs * s);
      this.shoot(game, realMs * s);
      this.moveProjectiles(game, s);
    }

    var pos = pl.body.position;
    this.collectStars(game, pos);
    this.collectBottles(game, pos);
    if (s > 0) this.drain(game, pos, realMs * s);
    if (game.status !== 'run') return;             // 투사체에 맞음
    if (pos.y > game.failY) this.finish(game, 'fail', '떨어졌어요');
    else if (pos.x >= game.level.goalX) this.finish(game, 'clear', '');
    else if (!game.stopped && G.Player.isStuck(pl)) this.finish(game, 'fail', '막혔어요');
  },

  collectStars: function (game, pos) {
    var D = G.DATA, r = D.player.radius;
    game.level.stars.forEach(function (s) {
      if (s.got) return;
      var p = s.prop, reach = r + (p.size || D.props.star.size) * D.level.starPickup;
      var dx = p.x - pos.x, dy = p.y - pos.y;
      if (dx * dx + dy * dy <= reach * reach) {
        s.got = true; s.gotMs = game.timeMs;
        game.fx.push({ type: 'star', x: p.x, y: p.y, t: game.timeMs });
      }
    });
  },

  starsGot: function (game) { return game.level.stars.filter(function (s) { return s.got; }).length; },

  // 잉크 병: 계정에 아직 없는 병이면 먹고 최대량이 영구히 늘어남 (먹은 순간 계정에 저장, 실패해도 유지)
  collectBottles: function (game, pos) {
    var D = G.DATA, r = D.player.radius, acc = game.account;
    game.level.bottles.forEach(function (b) {
      if (b.got) return;
      var p = b.prop, reach = r + (p.size || D.props.inkup.size) * D.level.starPickup;
      var dx = p.x - pos.x, dy = p.y - pos.y;
      if (dx * dx + dy * dy > reach * reach) return;
      b.got = true; b.gotMs = game.timeMs;
      acc.bottles[b.key] = true;
      acc.inkBonus = (acc.inkBonus || 0) + D.ink.upAmount;
      game.inkMax += D.ink.upAmount;
      game.ink += D.ink.upAmount;
      game.fx.push({ type: 'star', x: p.x, y: p.y, t: game.timeMs });
      game.toast('잉크 최대량 +' + D.ink.upAmount + ' (영구)');
      if (game.onAccountChange) game.onAccountChange(game);
    });
  },

  // 잉크 웅덩이: 캐릭터(원)가 웅덩이 사각형에 닿아 있는 동안 잉크가 줄어듦 (gameMs = 게임 시간)
  drain: function (game, pos, gameMs) {
    var r = G.DATA.player.radius, touching = false;
    game.level.drains.forEach(function (d) {
      var cx = Math.max(d.x, Math.min(pos.x, d.x + d.w)), cy = Math.max(d.y, Math.min(pos.y, d.y + d.h));
      var dx = pos.x - cx, dy = pos.y - cy;
      if (dx * dx + dy * dy < r * r) touching = true;
    });
    game.draining = touching;
    if (!touching) return;
    var before = game.ink;
    game.ink = G.Rules.drainInk(game.ink, G.DATA.ink.drainPerSec, gameMs);
    game.inkDrained += before - game.ink;
  },

  // 발사기: periodMs 마다 angle 방향으로 투사체 (gameMs = 게임 시간이라 정지 중에는 안 쏨)
  shoot: function (game, gameMs) {
    var D = G.DATA, def = D.props.shooter;
    game.level.shooters.forEach(function (sh) {
      var p = sh.prop, period = p.periodMs || def.periodMs;
      sh.ms += gameMs;
      if (sh.ms < period) return;
      sh.ms -= period;
      var a = (p.angle != null ? p.angle : def.angle) * Math.PI / 180, sp = p.speed || def.speed;
      var cx = p.x + p.w / 2, cy = p.y + p.h / 2, reach = Math.max(p.w, p.h) / 2 + D.projectile.radius + 2;
      game.projs.push({ x: cx + Math.cos(a) * reach, y: cy + Math.sin(a) * reach, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ms: 0, from: p });
    });
  },

  // 투사체 이동: 초록 선(발판이 된 것)에 닿으면 막힘, 땅·단단한 프랍에 닿으면 사라짐, 캐릭터에 닿으면 실패
  moveProjectiles: function (game, s) {
    var D = G.DATA, pr = D.projectile.radius, th = D.ink.thickness / 2, lv = game.level.data;
    var pl = game.player.body.position, hitR = D.player.radius + pr * 0.8;
    for (var i = game.projs.length - 1; i >= 0; i--) {
      var q = game.projs[i], gone = false;
      q.x += q.vx * s; q.y += q.vy * s; q.ms += D.loop.stepMs * s;
      for (var k = 0; k < game.lines.length && !gone; k++) {
        var ln = game.lines[k];
        if (!ln.active || ln.color !== 'green') continue;
        for (var j = 1; j < ln.pts.length; j++) {
          if (G.Rules.pointSegDist(q, ln.pts[j - 1], ln.pts[j]) <= pr + th) { gone = 'block'; break; }
        }
      }
      if (!gone) {
        var top = G.LevelCheck.groundTopAt(lv, q.x);
        if (top != null && q.y + pr * 0.5 >= top) gone = 'hit';
        lv.props.forEach(function (p) {
          var d = D.props[p.type];
          if (gone || p === q.from || !d || !d.solid) return;
          if (q.x > p.x - pr * 0.5 && q.x < p.x + p.w + pr * 0.5 && q.y > p.y - pr * 0.5 && q.y < p.y + p.h + pr * 0.5) gone = 'hit';
        });
      }
      if (!gone && q.ms > D.projectile.lifeMs) gone = 'old';
      if (!gone) {
        var dx = q.x - pl.x, dy = q.y - pl.y;
        if (dx * dx + dy * dy < hitR * hitR) { game.projs.splice(i, 1); this.finish(game, 'fail', '투사체에 맞았어요'); return; }
        continue;
      }
      if (gone === 'block') { game.blocked += 1; game.fx.push({ type: 'block', x: q.x, y: q.y, t: game.timeMs }); }
      game.projs.splice(i, 1);
    }
  },

  finish: function (game, status, reason) {
    game.status = status;
    game.finishedAt = Date.now();
    game.failReason = reason;
    game.stopped = false;
    game.stroke = null;
    game.result = null;
    if (status === 'clear') {
      game.result = G.Rules.rateClear(game.level.data.rate, {
        timeMs: game.timeMs, starsGot: this.starsGot(game), starsTotal: game.level.stars.length, tries: game.attempt
      });
    }
    if (game.onFinish) game.onFinish(game);
  }
};
