// 게임 상태와 한 스텝 진행 — 물방울 무리 시험판 (사용자 결정 2026-10-20). 화면(DOM)과 무관 → 브라우저 밖에서도 돌릴 수 있다.
//   주인공이 죽으면 실패. 검은 잉크병(도착)에 닿은 물방울은 흡수되어 잉크병이 정화됨.
//   주인공이 도착하면 스킵 가능(남은 물방울은 죽은 것으로). 걷는 물방울이 하나도 안 남으면 바로 클리어
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
    game.level = G.Level.build(game.engine, game.levelData, game.account);
    var lv = game.level.data;
    var top = G.Level.groundTopAt(lv, lv.start.x);
    if (top == null) top = 600;
    game.hero = G.Drop.create(game.engine, lv.start.x, top - D.drop.heroRadius - 1, true, 1, lv.drops);
    game.drops = [game.hero];                      // 깨어난 물방울 (주인공 포함)
    game.total = game.level.sleepers.length;       // 배치된 작은 물방울 수 (평가 기준)
    game.rescued = 0;                              // 도착한 작은 물방울
    game.lost = 0;                                 // 죽은 작은 물방울
    game.heroHome = false;
    var lowest = lv.ground.reduce(function (m, g) { return Math.max(m, g.top); }, 600);
    game.failY = lowest + D.physics.failY - 600;
    game.inkMax = lv.ink + (game.account.inkBonus || 0);
    game.ink = game.inkMax;
    game.stops = G.Rules.newStops(lv.stops);
    game.stopped = false;
    game.stoppedMs = 0;
    game.stroke = null;
    game.lines = [];
    game.fallen = [];                              // 노랑으로 잘려 떨어진 배치된 선 조각
    game.fx = [];
    game.eraserX = lv.start.x - D.eraser.startBack;
    game.status = 'ready';
    game.failReason = '';
    game.timeMs = 0;
    game.runMs = 0;                                // 게임 시간 (정지 중엔 안 흐름) — 지우개 출발에 씀
    game.finishedAt = 0;
    game.result = null;
    game.stopsUsedThisRun = 0;
    game.attempt += 1;
    if (lv.inks.indexOf(game.color) < 0) game.color = lv.inks.indexOf('black') >= 0 ? 'black' : (lv.inks[0] || 'black');
  },

  start: function (game) { if (game.status === 'ready') game.status = 'run'; },
  setMode: function () {},

  setColor: function (game, c) {
    if (!G.DATA.inks[c]) return false;
    if (game.level.data.inks.indexOf(c) < 0) { game.toast(G.DATA.inks[c].name + ': 이 스테이지에서는 아직 못 써요'); return false; }
    game.color = c;
    return true;
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

  scale: function (game) { return game.stopped ? 0 : 1; },

  walking: function (game) { return game.drops.filter(function (d) { return d.state === 'walk'; }); },

  update: function (game, realMs) {
    for (var i = game.messages.length - 1; i >= 0; i--) {
      game.messages[i].ms -= realMs;
      if (game.messages[i].ms <= 0) game.messages.splice(i, 1);
    }
    if (game.status !== 'run') return;
    if (game.fx.length) game.fx = game.fx.filter(function (f) { return game.timeMs - f.t < 1000; });
    if (game.stopped) game.stoppedMs += realMs;
    game.timeMs += realMs;
    var s = this.scale(game);
    if (s <= 0) return;                            // 완전 정지: 물리·지우개 모두 멈춤
    var fx = game.level.data.fx, self = this, walk = this.walking(game);
    game.runMs += realMs * s;

    var vyBefore = walk.map(function (d) { return { g: d.grounded, vy: d.body.velocity.y }; });
    walk.forEach(function (d) { G.Drop.control(d, s, fx); });
    G.Physics.step(game.engine, s);
    walk.forEach(function (d, k) {
      G.Drop.sense(d, game.engine, realMs, s, fx);
      d.events.forEach(function (e) { game.fx.push({ type: e, x: d.body.position.x, y: d.body.position.y + d.r, dir: d.dir, t: game.timeMs }); });
      if (!vyBefore[k].g && d.grounded && vyBefore[k].vy >= G.DATA.art.fx.landVy && d.hero) {
        game.fx.push({ type: 'land', x: d.body.position.x, y: d.body.position.y + d.r, t: game.timeMs });
      }
    });
    G.Draw.rise(game, s, fx);
    G.Draw.cleanup(game);
    this.moveEraser(game, s);

    walk.forEach(function (d) {
      if (d.state !== 'walk' || game.status !== 'run') return;
      var p = d.body.position;
      if (d.dead) return self.kill(game, d, d.dead);
      if (p.y > game.failY) return self.kill(game, d, '떨어졌어요');
      if (p.x - d.r < game.eraserX) return self.kill(game, d, '지우개에 지워졌어요');
      self.collect(game, d);
      self.wake(game, d);
      if (p.x >= game.level.goalX) self.arrive(game, d);
    });
    if (game.status !== 'run') return;
    if (game.heroHome && !this.walking(game).length) this.clear(game);
  },

  // 지우개: 출발 delay 뒤 주인공 속도의 pct% 로 오른쪽으로 (게임 시간 기준이라 정지 중엔 멈춤)
  moveEraser: function (game, s) {
    var E = game.level.data.eraser;
    if (game.runMs < E.delayMs) return;
    game.eraserX += game.level.data.drops.heroSpeed * E.pct / 100 * s;
    for (var i = game.lines.length - 1; i >= 0; i--) {   // 지우개가 지나간 선도 지움 (잉크는 돌아오지 않음)
      var ln = game.lines[i], pts = G.Draw.worldPts(ln), maxX = -Infinity;
      pts.forEach(function (q) { maxX = Math.max(maxX, q.x); });
      if (maxX < game.eraserX) G.Draw.drop(game, ln, false);
    }
  },

  // 잠든 물방울: 걷는 물방울이 닿으면 깨어나 그 물방울이 가던 방향으로 출발 (사용자 결정 2026-10-20)
  wake: function (game, d) {
    var D = G.DATA.drop, p = d.body.position;
    game.level.sleepers.forEach(function (sl) {
      if (sl.state !== 'sleep') return;
      var reach = (d.r + D.smallRadius) * D.wakeReach, dx = sl.x - p.x, dy = sl.y - p.y;
      if (dx * dx + dy * dy > reach * reach) return;
      sl.state = 'awake';
      var nd = G.Drop.create(game.engine, sl.x, sl.y, false, d.dir, game.level.data.drops);
      game.drops.push(nd);
      game.fx.push({ type: 'star', x: sl.x, y: sl.y, t: game.timeMs });
    });
  },

  // 아이템: 아무 물방울이나 닿으면 획득 (사용자 결정 2026-10-20). 정지 +1 은 이 스테이지에서만
  collect: function (game, d) {
    var D = G.DATA, p = d.body.position, acc = game.account;
    game.level.items.forEach(function (it) {
      if (it.got) return;
      var q = it.prop, reach = d.r + (q.size || D.props[it.kind].size) * D.level.pickup;
      var dx = q.x - p.x, dy = q.y - p.y;
      if (dx * dx + dy * dy > reach * reach) return;
      it.got = true; it.gotMs = game.timeMs;
      game.fx.push({ type: 'star', x: q.x, y: q.y, t: game.timeMs });
      if (it.kind === 'stopup') {
        game.stops.left += D.stopUp; game.stops.max += D.stopUp;
        game.toast('정지 +' + D.stopUp + ' (이 스테이지에서만)');
      } else if (it.kind === 'inkup') {
        acc.bottles[it.key] = true;
        acc.inkBonus = (acc.inkBonus || 0) + D.ink.upAmount;
        game.inkMax += D.ink.upAmount; game.ink += D.ink.upAmount;
        game.toast('잉크 최대량 +' + D.ink.upAmount + ' (영구)');
        if (game.onAccountChange) game.onAccountChange(game);
      }
    });
  },

  arrive: function (game, d) {
    d.state = 'home';
    G.Drop.remove(game.engine, d);
    game.fx.push({ type: 'absorb', x: game.level.goalX + 60, y: 0, t: game.timeMs });
    if (d.hero) { game.heroHome = true; game.toast('주인공 도착! Enter: 남은 물방울을 기다리지 않고 끝내기'); }
    else game.rescued += 1;
  },

  kill: function (game, d, reason) {
    d.state = 'dead';
    G.Drop.remove(game.engine, d);
    if (d.hero) { this.finish(game, 'fail', reason); return; }
    game.lost += 1;
  },

  // 정화 정도 0~1: 도착한 물방울(주인공 포함) / 전체(주인공 + 배치된 작은 물방울)
  purity: function (game) { return (game.rescued + (game.heroHome ? 1 : 0)) / (game.total + 1); },

  canSkip: function (game) { return game.status === 'run' && game.heroHome; },
  skip: function (game) {
    if (!this.canSkip(game)) return;
    var self = this;
    this.walking(game).forEach(function (d) { self.kill(game, d, ''); });   // 기다리지 않은 물방울은 죽은 것 (사용자 결정 2026-10-20)
    this.clear(game);
  },

  clear: function (game) { this.finish(game, 'clear', ''); },

  finish: function (game, status, reason) {
    game.status = status;
    game.finishedAt = Date.now();
    game.failReason = reason;
    game.stopped = false;
    game.stroke = null;
    game.result = null;
    if (status === 'clear') {
      game.result = G.Rules.rateClear(game.level.data.rate, {
        timeMs: game.timeMs, rescued: game.rescued, total: game.total, tries: game.attempt
      });
    }
    if (game.onFinish) game.onFinish(game);
  }
};
