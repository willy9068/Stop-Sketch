// 선 그리기: 마우스 드래그 → 잉크 소모 → 평활화 → 한 덩어리 물리 몸체 (사용자 결정 2026-10-20)
//   선은 사라지지 않고 중력으로 떨어짐(초록은 천천히 떠올라 닿으면 고정). 우클릭으로 빨아들이면 잉크를 전부 돌려받음
//   노랑은 칠한 자리의 배치된 선(crystal) 부분을 지우고 바로 사라짐 (잉크 소모)
//   정지 중에 그린 선은 점선으로 기다렸다가 재생할 때 한꺼번에 떨어짐. 달리는 중에 그린 선은 손을 떼면 바로
var G = G || {};

G.Draw = {
  begin: function (game, p) {
    if (game.status !== 'run' || (game.ink <= 0 && !game.level.data.infInk)) return false;
    game.stroke = G.Rules.newStroke(p);
    game.stroke.color = game.color;
    game.stroke.cost = game.color === 'yellow' ? G.DATA.ink.yellowCost : 1;   // 길이당 잉크 비율
    return true;
  },

  move: function (game, p) {
    if (!game.stroke) return;
    var k = game.stroke.cost || 1;
    if (game.level.data.infInk) { G.Rules.addSample(game.stroke, p, Infinity, G.DATA.ink); }   // 잉크 무제한 (레벨 툴, 사용자 요청 2026-10-21)
    else game.ink -= G.Rules.addSample(game.stroke, p, game.ink / k, G.DATA.ink) * k;
    if (game.stroke.full) this.end(game);
  },

  end: function (game) {
    var s = game.stroke;
    if (!s) return;
    game.stroke = null;
    var r = G.Rules.finishStroke(s, G.DATA.ink);
    if (!r.ok) { if (!game.level.data.infInk) game.ink += r.refund * (s.cost || 1); game.toast(G.T('toast.short')); return; }
    var line = { pts: G.Rules.simplify(r.pts, G.DATA.ink.simplifyTol), color: s.color || 'black', len: s.len, active: false, body: null, local: null, rising: false };
    game.lines.push(line);
    if (!game.stopped) this.activate(game, line);
  },

  activate: function (game, line) {
    if (line.active) return;
    line.active = true;
    if (line.color === 'yellow') { this.cut(game, line); this.drop(game, line, false); return; }
    var green = line.color === 'green';
    var body = G.Physics.lineBody(line.pts, G.DATA.ink.thickness, line.color, green);
    if (!body) { this.drop(game, line, true); return; }
    // 그릴 때의 점을 몸체 기준 좌표로 저장 → 몸체가 움직이고 돌면 그림도 따라감
    line.local = line.pts.map(function (q) { return { x: q.x - body.position.x, y: q.y - body.position.y }; });
    line.angle0 = body.angle;                      // 조각 하나짜리 몸체는 처음부터 각도가 있음 → 그 뒤 돈 만큼만 반영
    line.body = G.Physics.add(game.engine, body);
    line.rising = green;
    // 초록을 벽·발판·땅에 겹쳐 그렸으면 그 몸체는 빠져나갈 때까지 무시 (사용자 요청 2026-10-20: 겹쳐 그려도 떠오르게)
    if (green) line.ignore = G.Physics.overlapping(body, this.riseBlockers(game, line).concat(this.carryables(game, line)));
  },

  activateAll: function (game) {
    for (var i = 0; i < game.lines.length; i++) if (!game.lines[i].active) this.activate(game, game.lines[i]);
  },

  // 몸체 위치·각도를 반영한 지금 점들 (그리기·빨아들이기 판정용)
  worldPts: function (line) {
    if (!line.body) return line.pts;
    var b = line.body, a = b.angle - (line.angle0 || 0), c = Math.cos(a), s = Math.sin(a);
    return line.local.map(function (q) { return { x: b.position.x + q.x * c - q.y * s, y: b.position.y + q.x * s + q.y * c }; });
  },

  // 선 하나를 없앰. refund 면 잉크를 돌려받음
  drop: function (game, line, refund) {
    var i = game.lines.indexOf(line);
    if (i >= 0) game.lines.splice(i, 1);
    if (line.body) G.Physics.remove(game.engine, line.body);
    line.body = null;
    if (refund) game.ink = G.Rules.refundInk(game.ink, line.len, game.inkMax);
  },

  // 우클릭: p(월드) 가까운 선을 빨아들여 잉크를 전부 돌려받음 (달리는 중에도, 정지 중에도. 사용자 결정 2026-10-20)
  //   reach: 판정 거리(세계 px). 없으면 기본값 (화면에서 부를 때는 줌을 반영해 넘김)
  suck: function (game, p, reach) {
    reach = reach || G.DATA.ink.suckReach;
    var best = null, bestD = reach;
    for (var i = 0; i < game.lines.length; i++) {
      var pts = this.worldPts(game.lines[i]);
      for (var j = 1; j < pts.length; j++) {
        var d = G.Rules.pointSegDist(p, pts[j - 1], pts[j]);
        if (d <= bestD) { bestD = d; best = game.lines[i]; }
      }
    }
    if (!best) return false;
    game.fx.push({ type: 'suck', pts: this.worldPts(best), color: best.color, t: game.timeMs });
    this.drop(game, best, true);
    return true;
  },

  // 노랑: 칠한 자리(선에서 yellowCut 안)에 든 배치된 선 부분을 지움 (사용자 결정 2026-10-20). 못 박힌 끝이 있는 조각은 고정으로 남고,
  //   나머지 조각은 떨어지는 "배치된 선" 조각이 됨 (빨아들일 수 없음)
  cut: function (game, line) {
    var P = G.Physics, M = P.M, r = G.DATA.ink.yellowCut, list = game.level.crystals, n = 0;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i], pieces = G.Rules.eraseCrystal(c, line.pts, r);
      if (!pieces) continue;
      n++;
      P.remove(game.engine, c.body);
      list.splice(i, 1);
      pieces.forEach(function (q) {
        var rad = q.angle * Math.PI / 180;
        if (q.anchored) {
          q.body = P.add(game.engine, P.staticRect(q.x + q.w / 2, q.y + q.h / 2, q.w, q.h, { label: 'crystal', angle: rad }));
          list.push(q);
        } else {
          var body = M.Bodies.rectangle(q.x + q.w / 2, q.y + q.h / 2, q.w, q.h, { friction: G.DATA.ink.friction, label: 'crystal', angle: rad });
          M.Body.setDensity(body, G.DATA.ink.density);
          M.Body.setAngularVelocity(body, (game.fallen.length % 2 ? 0.02 : -0.02));   // 세워진 채 떨어져 다시 서지 않게 살짝 기울임
          game.fallen.push({ w: q.w, h: q.h, body: P.add(game.engine, body) });
        }
      });
    }
    // 이미 떨어진 조각도 칠하면 지워짐 (사용자 요청 2026-10-20). 남은 조각은 계속 떨어지는 조각으로 (속도·회전 이어받음)
    for (var f = game.fallen.length - 1; f >= 0; f--) {
      var fb = game.fallen[f], b = fb.body, deg = b.angle * 180 / Math.PI;
      var rest = G.Rules.eraseCrystal({ x: b.position.x - fb.w / 2, y: b.position.y - fb.h / 2, w: fb.w, h: fb.h, angle: deg, pin: 'none' }, line.pts, r);
      if (!rest) continue;
      n++;
      P.remove(game.engine, b);
      game.fallen.splice(f, 1);
      rest.forEach(function (q) {
        var body = M.Bodies.rectangle(q.x + q.w / 2, q.y + q.h / 2, q.w, q.h, { friction: G.DATA.ink.friction, label: 'crystal', angle: b.angle });
        M.Body.setDensity(body, G.DATA.ink.density);
        M.Body.setVelocity(body, b.velocity);
        M.Body.setAngularVelocity(body, b.angularVelocity);
        game.fallen.push({ w: q.w, h: q.h, body: P.add(game.engine, body) });
      });
    }
    if (n) game.fx.push({ type: 'cut', pts: line.pts, t: game.timeMs });
    else game.toast(G.T('toast.noCrystal'));
  },

  // 초록이 닿으면 멈추는 것들: 벽·발판·땅, 배치된 선, 고정된 선(멈춘 초록)
  riseBlockers: function (game, ln) {
    return game.level.statics.concat(game.level.crystals.map(function (c) { return c.body; }),
      game.lines.filter(function (o) { return o !== ln && o.body && o.body.isStatic; }).map(function (o) { return o.body; }));
  },
  // 초록이 같이 들어 올리는 것들: 떨어지는 다른 선, 잘려 떨어진 배치된 선 조각 (사용자 요청 2026-10-21: 위에 그린 선도 같이 올라가게)
  carryables: function (game, ln) {
    return game.lines.filter(function (o) { return o !== ln && o.body && !o.body.isStatic; }).map(function (o) { return o.body; })
      .concat(game.fallen.map(function (f) { return f.body; }));
  },

  // 초록: 떠오르다 무언가에 닿거나 꼭대기에 이르면 고정 (사용자 결정 2026-10-20)
  //   위에 얹힌 선·조각은 같이 들어 올림(쌓인 것도 차례로). 들어 올린 것이 막혀도 멈춤 (사용자 요청 2026-10-21)
  //   처음부터 겹쳐 있던 몸체(ln.ignore)는 빠져나갈 때까지 무시
  rise: function (game, scale, fx) {
    var M = G.Physics.M, top = G.DATA.greenTopY;
    for (var i = 0; i < game.lines.length; i++) {
      var ln = game.lines[i];
      if (!ln.rising || !ln.body) continue;
      var b = ln.body, dy = fx.riseSpeed * scale, ign = ln.ignore || [], movers = this.carryables(game, ln), walls = this.riseBlockers(game, ln);
      var moved = [b];
      M.Body.setPosition(b, { x: b.position.x, y: b.position.y - dy });
      for (var q = 0; q < moved.length; q++) {     // 올린 것과 새로 겹친 것 = 위에 얹힌 것 → 같이 올림
        G.Physics.overlapping(moved[q], movers).forEach(function (o) {
          if (moved.indexOf(o) >= 0 || ign.indexOf(o) >= 0) return;
          M.Body.setPosition(o, { x: o.position.x, y: o.position.y - dy });
          M.Body.setVelocity(o, { x: o.velocity.x, y: Math.min(o.velocity.y, 0) });
          moved.push(o);
        });
      }
      var hit = G.Physics.overlapping(b, walls.concat(movers));
      ln.ignore = ign.filter(function (o) { return hit.indexOf(o) >= 0; });   // 빠져나간 몸체는 다시 막음
      var blocked = moved.some(function (m) {
        return G.Physics.overlapping(m, walls).some(function (o) { return m !== b || ign.indexOf(o) < 0; });
      });
      var high = moved.some(function (m) { return m.bounds.min.y <= top; });
      if (blocked || high) {
        moved.forEach(function (m) { M.Body.setPosition(m, { x: m.position.x, y: m.position.y + dy }); });
        ln.rising = false;
      }
    }
  },

  // 화면 아래로 떨어져 나간 선은 정리 (잉크는 돌려받음)
  cleanup: function (game) {
    for (var i = game.lines.length - 1; i >= 0; i--) {
      var ln = game.lines[i];
      if (ln.body && ln.body.position.y > game.failY + 300) this.drop(game, ln, true);
    }
  }
};
