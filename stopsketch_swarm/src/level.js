// 스테이지 만들기: levels.js 의 스테이지 데이터를 정적 물리 바디로 바꾼다
//   잠든 물방울(drop)은 깨어날 때까지 몸체가 없다 (그림만). 배치된 선(crystal)은 노랑으로 자를 수 있게 따로 목록을 둔다
var G = G || {};

G.Level = {
  build: function (engine, raw, account) {
    var P = G.Physics, lv = G.LevelCheck.normalize(raw), depth = G.DATA.level.groundDepth;
    var owned = (account && account.bottles) || {};
    var out = { data: lv, goalX: lv.goal.x, sleepers: [], items: [], crystals: [], statics: [] };
    lv.ground.forEach(function (g) {
      out.statics.push(P.add(engine, P.staticRect((g.x0 + g.x1) / 2, g.top + depth / 2, g.x1 - g.x0, depth)));
    });
    var nBottle = 0, nStar = 0;
    lv.props.forEach(function (p) {
      if (p.type === 'crystal') {                  // 자를 수 있게 복사본으로 (원본 데이터는 그대로)
        var c = { x: p.x, y: p.y, w: p.w, h: p.h, pin: p.pin || 'both', body: null };
        c.body = P.add(engine, P.staticRect(c.x + c.w / 2, c.y + c.h / 2, c.w, c.h, { label: 'crystal' }));
        out.crystals.push(c);
        return;
      }
      var b = G.Props.build(engine, p);
      if (b) out.statics.push(b);
      if (p.type === 'drop') out.sleepers.push({ prop: p, x: p.x, y: p.y, state: 'sleep' });
      if (p.type === 'stopup') out.items.push({ prop: p, kind: 'stopup', got: false });
      if (p.type === 'star') out.items.push({ prop: p, kind: 'star', key: 'star' + nStar++, got: false });   // 다시 하면 다시 나타남 (클리어해야 기록)
      if (p.type === 'inkup') {
        var key = lv.id + ':' + (p.id || 'inkup' + nBottle++);
        out.items.push({ prop: p, kind: 'inkup', key: key, got: !!owned[key], owned: !!owned[key] });
      }
    });
    return out;
  },

  groundTopAt: function (lv, x) { return G.LevelCheck.groundTopAt(lv, x); }
};
