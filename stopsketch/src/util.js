// 공용 도구: 시드 난수, 버전 있는 저장
var G = G || {};

// mulberry32 — 같은 시드면 같은 수열
G.makeRng = function (seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// 계정 저장. localStorage가 막혀 있어도(사생활 보호 모드 등) 게임은 돌아가게 한다
//   inkBonus: 잉크 병으로 늘어난 최대량(영구) / bottles: 먹은 잉크 병 { "구간id:병id": true }
//   records: 구간별 기록 { 구간id: { stars(최고), bestMs, clears, tries } }
G.Save = {
  blank: function () {
    return { v: G.DATA.version, timeMode: G.DATA.defaultTimeMode, stats: {}, inkBonus: 0, bottles: {}, records: {} };
  },

  // 빠진 칸을 채운다 (예전 저장에는 inkBonus 등이 없음)
  fill: function (s) {
    var b = this.blank();
    for (var k in b) if (s[k] === undefined) s[k] = b[k];
    return s;
  },

  load: function () {
    var S = G.DATA.save;
    try {
      var raw = localStorage.getItem(S.key);
      if (!raw) {                                  // 이름을 바꾸기 전 저장이 있으면 옮겨 온다
        for (var i = 0; i < S.oldKeys.length && !raw; i++) raw = localStorage.getItem(S.oldKeys[i]);
      }
      if (!raw) return this.blank();
      var s = JSON.parse(raw);
      return s && s.v === G.DATA.version ? this.fill(s) : this.blank();
    } catch (e) { return this.blank(); }
  },
  write: function (s) {
    try { localStorage.setItem(G.DATA.save.key, JSON.stringify(s)); } catch (e) { /* 무시 */ }
  }
};
