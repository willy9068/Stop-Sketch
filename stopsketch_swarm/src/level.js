// 스테이지 만들기: levels.js 의 스테이지 데이터를 정적 물리 바디로 바꾼다
//   잠든 물방울(drop)은 깨어날 때까지 몸체가 없다 (그림만). 배치된 선(crystal)은 노랑으로 자를 수 있게 따로 목록을 둔다
//   발사기(shooter)는 몸체 + 다음에 쏠 게임 시간 (사용자 결정 2026-10-22)
var G = G || {};

G.Level = {
  build: function (engine, raw) {
    var P = G.Physics, lv = G.LevelCheck.normalize(raw), SD = G.DATA.props.shooter;
    var out = { data: lv, goalX: lv.goal.x, sleepers: [], items: [], crystals: [], statics: [], shooters: [] };
    lv.ground.forEach(function (g) {
      if (!g.angle) { out.statics.push(P.add(engine, P.staticRect((g.x0 + g.x1) / 2, g.top + g.h / 2, g.x1 - g.x0, g.h))); return; }
      var s = G.LevelCheck.groundShape(g);         // 비탈 땅: 윗면이 기운 사다리꼴 (사용자 요청 2026-10-21)
      out.statics.push(P.add(engine, P.staticPoly([{ x: g.x0, y: s.l }, { x: g.x1, y: s.r }, { x: g.x1, y: s.b }, { x: g.x0, y: s.b }])));
    });
    var nStar = 0;
    lv.props.forEach(function (p) {
      if (p.type === 'crystal') {                  // 자를 수 있게 복사본으로 (원본 데이터는 그대로)
        var c = { x: p.x, y: p.y, w: p.w, h: p.h, angle: p.angle || 0, pin: p.pin || 'both', body: null };
        c.body = P.add(engine, P.staticRect(c.x + c.w / 2, c.y + c.h / 2, c.w, c.h, { label: 'crystal', angle: c.angle * Math.PI / 180 }));
        out.crystals.push(c);
        return;
      }
      var b = G.Props.build(engine, p);
      if (b) out.statics.push(b);
      if (p.type === 'shooter') out.shooters.push({ prop: p, body: b, next: p.firstMs != null ? p.firstMs : SD.firstMs });
      if (p.type === 'drop') out.sleepers.push({ prop: p, x: p.x, y: p.y, state: 'sleep' });
      if (p.type === 'stopup') out.items.push({ prop: p, kind: 'stopup', got: false });
      if (p.type === 'star') out.items.push({ prop: p, kind: 'star', key: 'star' + nStar++, got: false });   // 다시 하면 다시 나타남 (클리어해야 기록)
      if (p.type === 'inkup') out.items.push({ prop: p, kind: 'inkup', got: false });   // 이 스테이지에서만 (사용자 결정 2026-10-22), 다시 하면 다시 나타남
    });
    return out;
  },

  groundTopAt: function (lv, x) { return G.LevelCheck.groundTopAt(lv, x); }
};
