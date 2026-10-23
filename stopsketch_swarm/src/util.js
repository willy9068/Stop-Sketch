// 공용 도구: 시드 난수, 버전 있는 저장, 화면 글자(uitext.js) 가져오기
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
//   records: 스테이지별 기록 { id: { starKeys{별key:true}, stars(모은 별 수), bestPurity(0~1), bestMs, clears, tries } }
//   tutSeen: 본 월드 안내 카드 { 월드 번호: true } (2차 데모, 2026-10-23)
G.Save = {
  blank: function () {
    return { v: G.DATA.version, timeMode: G.DATA.defaultTimeMode, stats: {}, inkBonus: 0, bottles: {}, records: {}, tutSeen: {} };
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

// ---- 화면 글자·UI 모양 (uitext.js, 사용자 요청 2026-10-21) ----
// 글자 가져오기: G.T('hud.home', { rescued: 3, total: 5 }). 없는 이름이면 이름 그대로
G.T = function (key, vars) {
  var t = G.UITEXT.text[key];
  if (t == null) return key;
  return String(t).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : ''; });
};
G.TS = function (key) { return G.UITEXT.style[key]; };
G.TF = function (size, bold) { return (bold ? 'bold ' : '') + G.UITEXT.style[size] + 'px ' + G.UITEXT.style.font; };

// 물감 이름은 data.js inks 에도 넣어 둠 (레벨 툴·검사가 같이 씀)
G.applyUiText = function () {
  if (!G.DATA || !G.DATA.inks) return;
  G.DATA.inks.order.forEach(function (c) { var t = G.UITEXT.text['ink.' + c]; if (t != null && G.DATA.inks[c]) G.DATA.inks[c].name = t; });
};
G.applyUiText();
