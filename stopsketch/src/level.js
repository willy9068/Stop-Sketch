// 구간 만들기: levels.js 의 구간 데이터를 정적 물리 바디로 바꾼다
var G = G || {};

G.Level = {
  // account: 계정 저장. 이미 먹은 잉크 병은 got=true 로 시작 (다시 먹을 수 없음)
  build: function (engine, raw, account) {
    var P = G.Physics, lv = G.LevelCheck.normalize(raw), depth = G.DATA.level.groundDepth;
    var owned = (account && account.bottles) || {};
    var out = { data: lv, goalX: lv.goal.x, stars: [], bottles: [], drains: [], shooters: [] };
    lv.ground.forEach(function (g) {
      P.add(engine, P.staticRect((g.x0 + g.x1) / 2, g.top + depth / 2, g.x1 - g.x0, depth));
    });
    var nBottle = 0;
    lv.props.forEach(function (p) {
      G.Props.build(engine, p);
      if (p.type === 'star') out.stars.push({ prop: p, got: false });
      if (p.type === 'inkup') {
        var key = G.Level.bottleKey(lv, p, nBottle++);
        out.bottles.push({ prop: p, key: key, got: !!owned[key], owned: !!owned[key] });
      }
      if (p.type === 'drain') out.drains.push({ x: p.x, y: p.y, w: p.w, h: p.h, prop: p });
      if (p.type === 'shooter') out.shooters.push({ prop: p, ms: 0 });
    });
    return out;
  },

  // 잉크 병의 계정 저장 이름: "구간id:병id" (레벨 툴이 병마다 id 를 붙임. 없으면 구간 안 순서)
  bottleKey: function (lv, p, i) { return lv.id + ':' + (p.id || 'inkup' + i); },

  groundTopAt: function (lv, x) { return G.LevelCheck.groundTopAt(lv, x); }
};
