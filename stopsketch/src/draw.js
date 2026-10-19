// 선 그리기: 마우스 드래그 → 잉크 소모 → 평활화 → 얇은 선분 체인 물리 바디
// 달리는 중에도 그릴 수 있다(사용자 결정 2026-10-19). 정지는 "여유 있게 설계"하는 수단.
// 화면(DOM)과 무관하다. 좌표는 모두 월드 좌표.
var G = G || {};

G.Draw = {
  begin: function (game, p) {
    if (game.status !== 'run' || game.ink <= 0) return false;
    game.stroke = G.Rules.newStroke(p);
    game.stroke.color = game.color;               // 그리기 시작할 때 고른 색 (그리는 중 바꿔도 이 선은 그대로)
    return true;
  },

  move: function (game, p) {
    if (!game.stroke) return;
    var used = G.Rules.addSample(game.stroke, p, game.ink, G.DATA.ink);
    game.ink -= used;
    if (game.stroke.full) this.end(game);   // 잉크·최대 길이 도달 → 자동으로 끝냄
  },

  end: function (game) {
    var s = game.stroke;
    if (!s) return;
    game.stroke = null;
    var r = G.Rules.finishStroke(s, G.DATA.ink);
    if (!r.ok) { game.ink += r.refund; game.toast('선이 너무 짧아요 (잉크 반환)'); return; }
    var line = { pts: r.pts, bodies: [], active: false, len: s.len, ageMs: 0, color: s.color || 'green' };
    game.lines.push(line);
    // 달리는 중에 그린 선, 슬로 모션 중에 그린 선은 바로 물리에 반영. 완전 정지 중 선은 재생 때 반영
    if (!game.stopped || game.mode.activateOnStrokeEnd) this.activate(game, line);
  },

  activate: function (game, line) {
    if (line.active) return;
    var P = G.Physics, th = G.DATA.ink.thickness;
    for (var i = 1; i < line.pts.length; i++) {
      line.bodies.push(P.add(game.engine, P.segment(line.pts[i - 1], line.pts[i], th, { inkColor: line.color })));
    }
    line.active = true;
  },

  // 재생할 때: 정지 중 그린 선을 한꺼번에 물리에 넣는다
  activateAll: function (game) {
    for (var i = 0; i < game.lines.length; i++) this.activate(game, game.lines[i]);
  },

  // 발판이 된 선만 나이를 먹고, 수명이 다하면 물리에서 빼고 지운다 (사용자 결정 2026-10-19)
  // gameMs = 게임 시간 (실제 시간 × 시간 배율)
  age: function (game, gameMs) {
    var life = G.DATA.ink.lifeMs;
    for (var i = game.lines.length - 1; i >= 0; i--) {
      var ln = game.lines[i];
      if (!ln.active) continue;
      ln.ageMs += gameMs;
      if (G.Rules.lineExpired(ln.ageMs, life)) {
        for (var j = 0; j < ln.bodies.length; j++) G.Physics.remove(game.engine, ln.bodies[j]);
        game.lines.splice(i, 1);
        var before = game.ink;                    // 사라진 선의 잉크를 돌려받음 (사용자 결정 2026-10-19)
        game.ink = G.Rules.refundInk(game.ink, ln.len, game.inkMax);
        game.inkRefunded = (game.inkRefunded || 0) + (game.ink - before);
      }
    }
  }
};
