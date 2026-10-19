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
    var o = { isStatic: true, friction: 0, label: 'ground' };
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
      out.push({ other: p.bodyA === body ? p.bodyB : p.bodyA, pts: pts });
    }
    return out;
  }

  function allBodies(engine) { return M.Composite.allBodies(engine.world); }

  return {
    M: M, create: create, add: add, remove: remove, staticRect: staticRect,
    segment: segment, step: step, contacts: contacts, touching: touching, allBodies: allBodies
  };
})();
