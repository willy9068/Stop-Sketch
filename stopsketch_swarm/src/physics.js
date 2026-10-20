// Matter.js 감싸기. 다른 파일은 Matter를 직접 부르지 않고 이 함수들을 쓴다.
var G = G || {};

G.Physics = (function () {
  var M = (typeof Matter !== 'undefined') ? Matter : null;

  function create() {
    var engine = M.Engine.create();
    engine.gravity.y = G.DATA.physics.gravityY;
    return engine;
  }

  function add(engine, body) { M.Composite.add(engine.world, body); return body; }
  function remove(engine, body) { M.Composite.remove(engine.world, body); }

  function staticRect(x, y, w, h, opts) {
    var o = { isStatic: true, friction: 0.8, label: 'ground' };   // 선이 미끄러지지 않게 (물방울은 마찰 0이라 쌍 마찰 = 0)
    for (var k in opts) o[k] = opts[k];
    return M.Bodies.rectangle(x, y, w, h, o);
  }

  // 점 a → b 를 잇는 얇은 사각형. 끝을 둥글게 하고 살짝 길게 해 이음매 턱을 줄인다
  function segment(a, b, thick, opts) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) + thick * 0.5;
    var o = {
      isStatic: true, angle: Math.atan2(dy, dx), friction: G.DATA.ink.friction,
      chamfer: { radius: thick * 0.49 }, label: 'ink'
    };
    for (var k in opts) o[k] = opts[k];
    return M.Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, len, thick, o);
  }

  // 그린 선 하나 = 선분 여러 개를 묶은 한 덩어리 몸체 (사용자 결정 2026-10-20: 한 덩어리로 회전하며 떨어짐)
  //   isStatic 이면 고정(초록이 떠오르는 동안·멈춘 뒤). 몸체와 조각 모두에 inkColor 를 붙여 접촉 판정에 씀
  function lineBody(pts, thick, color, isStatic) {
    var D = G.DATA.ink, parts = [];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) + thick * 0.5;
      if (len < 1) continue;
      var part = M.Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, len, thick, {
        angle: Math.atan2(dy, dx), chamfer: { radius: thick * 0.49 }
      });
      part.inkColor = color;
      parts.push(part);
    }
    if (!parts.length) return null;
    var body = parts.length === 1 ? parts[0] : M.Body.create({ parts: parts });
    M.Body.set(body, { friction: D.friction, frictionStatic: 0.8, restitution: 0, label: 'ink' });
    M.Body.setDensity(body, D.density);
    if (isStatic) M.Body.setStatic(body, true);
    body.inkColor = color;
    return body;
  }

  // body 가 bodies 중 하나와 겹치는가 (초록이 떠오르다 닿았는지)
  function overlapsAny(body, bodies) { return M.Query.collides(body, bodies).length > 0; }
  // body 와 겹친 몸체 목록 (조각이면 바깥 몸체로)
  function overlapping(body, bodies) {
    var out = [];
    M.Query.collides(body, bodies).forEach(function (c) {
      var o = c.bodyA.parent === body || c.bodyA === body ? c.bodyB : c.bodyA;
      o = o.parent || o;
      if (out.indexOf(o) < 0) out.push(o);
    });
    return out;
  }

  // 시간 배율 scale 로 한 스텝 진행 (scale 0이면 진행하지 않음)
  function step(engine, scale) {
    if (scale <= 0) return;
    engine.timing.timeScale = scale;
    M.Engine.update(engine, G.DATA.loop.stepMs);
  }

  // body 와 지금 닿아 있는 접촉점 목록
  function contacts(engine, body) {
    var out = [], list = engine.pairs.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p.isActive || p.isSensor) continue;
      if (p.bodyA !== body && p.bodyB !== body) continue;
      var c = p.collision;
      for (var j = 0; j < c.supportCount; j++) out.push(c.supports[j]);
    }
    return out;
  }

  // body 와 닿아 있는 상대 바디마다 { other, pts } (색 잉크 선을 밟았는지 보려고)
  function touching(engine, body) {
    var out = [], list = engine.pairs.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p.isActive || p.isSensor) continue;
      if (p.bodyA !== body && p.bodyB !== body) continue;
      var c = p.collision, pts = [];
      for (var j = 0; j < c.supportCount; j++) pts.push(c.supports[j]);
      var o = p.bodyA === body ? p.bodyB : p.bodyA;   // 묶은 몸체의 조각일 수 있음 (조각에도 inkColor)
      out.push({ other: o, root: o.parent || o, pts: pts });
    }
    return out;
  }

  function allBodies(engine) { return M.Composite.allBodies(engine.world); }

  return {
    M: M, create: create, add: add, remove: remove, staticRect: staticRect,
    segment: segment, lineBody: lineBody, overlapsAny: overlapsAny, overlapping: overlapping,
    step: step, contacts: contacts, touching: touching, allBodies: allBodies
  };
})();
