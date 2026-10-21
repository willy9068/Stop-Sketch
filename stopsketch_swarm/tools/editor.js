// 스톱 앤 스케치 레벨 툴: 땅·벽·발판·별·장식·글자 배치, 크기 조절, 배경 지정, 검사, 테스트 플레이, levels.js 저장
// 게임과 같은 그리기 함수(src/props.js)를 써서 보이는 모습이 게임과 같다.
var G = G || {};

(function () {
  var D = G.DATA, LC = G.LevelCheck, P = G.Props;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('view'), ctx = cv.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d');
  G.Assets.load();

  // ---------- 상태 ----------
  var S = {
    levels: JSON.parse(JSON.stringify(G.LEVELS)).map(LC.normalize),
    cur: 0,
    sel: null,              // {kind: 'prop'|'ground'|'start'|'goal', i}
    tool: 'select',
    view: { x: -100, y: -150, zoom: 0.5 },
    drag: null,
    undo: [], redo: [],
    dirty: false,
    fileHandle: null,
    decoImg: D.art.decos[0],
    mouse: { x: 0, y: 0, sx: 0, sy: 0 },
    spaceDown: false
  };
  var TOOLS = [
    ['select', '선택', 'V'], ['ground', '땅', 'G'], ['wall', '벽', 'W'], ['platform', '발판', 'P'],
    ['drop', '물방울', 'B'], ['spike', '가시', 'K'], ['crystal', '배치된 선', 'L'], ['star', '별', 'S'], ['stopup', '정지 +1', 'Z'], ['inkup', '잉크 병', 'I'], ['segment', '구간 경계', 'J'],
    ['deco', '장식', 'C'], ['text', '글자', 'T']
  ];
  var GRID = 10, HANDLE = 7;

  function lv() { return S.levels[S.cur]; }
  function snap(v) { return $('snap').checked && !S.altDown ? Math.round(v / GRID) * GRID : Math.round(v); }
  function toWorld(sx, sy) { return { x: sx / S.view.zoom + S.view.x, y: sy / S.view.zoom + S.view.y }; }
  function toScreen(wx, wy) { return { x: (wx - S.view.x) * S.view.zoom, y: (wy - S.view.y) * S.view.zoom }; }

  // ---------- 되돌리기 · 변경 표시 · 임시 저장 ----------
  function snapshot() { return JSON.stringify({ levels: S.levels, cur: S.cur }); }
  function pushUndo() {
    S.undo.push(snapshot());
    if (S.undo.length > 150) S.undo.shift();
    S.redo.length = 0;
  }
  function restore(snap) {
    var o = JSON.parse(snap);
    S.levels = o.levels; S.cur = Math.min(o.cur, S.levels.length - 1); S.sel = null; S.multi = [];
    changed();
  }
  function undo() { if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); }
  function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); }

  var draftTimer = null;
  function changed(keepForms) {
    S.dirty = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try { localStorage.setItem(D.save.editorDraftKey, JSON.stringify(S.levels)); } catch (e) { /* 무시 */ }
    }, 300);
    refreshAll(keepForms);
  }

  // ---------- 선택 대상 ----------
  // kind: prop / ground / start / goal / seg / camTop·camBot (게임 화면 위 끝·아래 끝 선, 사용자 요청 2026-10-21)
  function objOf(sel) {
    if (!sel) return null;
    var l = lv();
    if (sel.kind === 'prop') return l.props[sel.i] || null;
    if (sel.kind === 'ground') return l.ground[sel.i] || null;
    if (sel.kind === 'start') return l.start;
    if (sel.kind === 'goal') return l.goal;
    if (sel.kind === 'seg') return (l.segments || [])[sel.i] || null;
    if (sel.kind === 'camTop' || sel.kind === 'camBot') return l.camera;
    return null;
  }
  function selObj() { return objOf(S.sel); }

  // 여러 개 선택 (사용자 요청 2026-10-21: Ctrl+클릭으로 더하고 빼서 한꺼번에 옮기기). S.sel 은 그중 마지막으로 누른 것(오른쪽 칸에 보임)
  //   S.sel 이 목록에 없으면(다른 방법으로 선택이 바뀜) S.sel 하나만
  function sameSel(a, b) { return a && b && a.kind === b.kind && a.i === b.i; }
  function inMulti(sel) { return (S.multi || []).some(function (m) { return sameSel(m, sel); }); }
  function selList() {
    if (!S.sel) return [];
    return S.multi && S.multi.length > 1 && inMulti(S.sel) ? S.multi : [S.sel];
  }

  // 하나를 (원래 자리 q 에서) dx, dy 만큼 옮김
  function moveObj(sel, o, q, dx, dy) {
    if (sel.kind === 'start' || sel.kind === 'goal') { o.x = snap(q.x + dx); o.y = snap(q.y + dy); }   // 위아래로도 (사용자 결정 2026-10-20)
    else if (sel.kind === 'seg') o.x = snap(q.x + dx);
    else if (sel.kind === 'camTop') o.top = Math.min(snap(q.top + dy), o.bottom - 100);
    else if (sel.kind === 'camBot') o.bottom = Math.max(snap(q.bottom + dy), o.top + 100);
    else if (sel.kind === 'ground') { var w0 = q.x1 - q.x0; o.x0 = snap(q.x0 + dx); o.x1 = o.x0 + w0; o.top = snap(q.top + dy); }
    else { o.x = snap(q.x + dx); o.y = snap(q.y + dy); }
  }

  // 구간 경계 이름표 사각형 (화면 위쪽에 보이는 보라색 글자 자리, 월드 좌표). 사용자 요청 2026-10-20: 툴에서 위치·글자 바꾸기
  function segRect(i) {
    var sg = lv().segments[i], z = S.view.zoom, a = toWorld(0, 0);
    ctx.save(); ctx.font = 'bold 13px sans-serif'; var tw = ctx.measureText('▶ ' + sg.name).width; ctx.restore();
    return { x: sg.x - 4 / z, y: a.y + 20 / z, w: (tw + 14) / z, h: 20 / z };
  }

  // 선택 대상의 사각형 (월드 좌표)
  function selRect(sel) {
    var l = lv(), top;
    if (!sel) return null;
    if (sel.kind === 'prop') return P.rect(l.props[sel.i]);
    if (sel.kind === 'ground') { var g = l.ground[sel.i], gs = LC.groundShape(g), gt = Math.min(gs.l, gs.r); return { x: g.x0, y: gt, w: g.x1 - g.x0, h: gs.b - gt }; }
    if (sel.kind === 'start') { top = l.start.y; return { x: l.start.x - 28, y: top - 72, w: 56, h: 72 }; }
    if (sel.kind === 'goal') { top = l.goal.y; return { x: l.goal.x - 12, y: top - D.art.goalJar.h, w: D.art.goalJar.w, h: D.art.goalJar.h }; }
    if (sel.kind === 'seg') return (l.segments || [])[sel.i] ? segRect(sel.i) : null;
    if (sel.kind === 'camTop' || sel.kind === 'camBot') return camLabelRect(sel.kind);
    return null;
  }

  // 손잡이 목록: 이름과 월드 좌표
  function handles() {
    var s = S.sel, o = selObj();
    if (!o || s.kind === 'start' || s.kind === 'goal' || s.kind === 'seg' || s.kind === 'camTop' || s.kind === 'camBot' || selList().length > 1) return [];
    var r = selRect(s), mx = r.x + r.w / 2, my = r.y + r.h / 2, out = [];
    if (o.type === 'crystal') {                      // 배치된 선: 양 끝(길이)·위(두께)·회전 (사용자 결정 2026-10-20)
      var ce = crystalEnds(o), up = { x: Math.sin(ce.a), y: -Math.cos(ce.a) }, rr = o.h / 2 + 26 / S.view.zoom;
      return [['cw', ce.s.x, ce.s.y], ['ce', ce.e.x, ce.e.y], ['ct', ce.c.x + up.x * o.h / 2, ce.c.y + up.y * o.h / 2], ['rot', ce.c.x + up.x * rr, ce.c.y + up.y * rr]];
    }
    var z = S.view.zoom;
    if (s.kind === 'ground') {                       // 땅: 양옆(폭)·위(윗면)·아래(높이)·동그란 위 손잡이(경사, 사용자 요청 2026-10-21)
      var gs = LC.groundShape(o), cx = (o.x0 + o.x1) / 2, ga = (o.angle || 0) * Math.PI / 180, gr = 34 / z;
      return [['w', o.x0, (gs.l + gs.b) / 2], ['e', o.x1, (gs.r + gs.b) / 2], ['n', cx, o.top], ['s', cx, gs.b],
              ['rot', cx + Math.sin(ga) * gr, o.top - Math.cos(ga) * gr]];
    }
    // 그 밖의 물건: 돌린 만큼 손잡이도 돌림 + 동그란 회전 손잡이 (사용자 요청 2026-10-21: 모든 물건 회전)
    var d = P.def(o.type), c = P.pivot(o), a = (o.angle || 0) * Math.PI / 180;
    if (d.box) {
      out = [['nw', r.x, r.y], ['n', mx, r.y], ['ne', r.x + r.w, r.y], ['e', r.x + r.w, my],
             ['se', r.x + r.w, r.y + r.h], ['s', mx, r.y + r.h], ['sw', r.x, r.y + r.h], ['w', r.x, my]];
    } else out = [['size', r.x + r.w, r.y + r.h]];
    out.push(['rot', mx, r.y - 26 / z]);
    return out.map(function (h) { var q = rotPt({ x: h[1], y: h[2] }, c, a); return [h[0], q.x, q.y]; });
  }
  // 점 p 를 c 기준으로 a(라디안)만큼 돌림
  function rotPt(p, c, a) {
    if (!a) return { x: p.x, y: p.y };
    var dx = p.x - c.x, dy = p.y - c.y, cs = Math.cos(a), sn = Math.sin(a);
    return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
  }

  // ---------- 그리기 ----------
  function drawWorldBg() {
    var l = lv(), img = l.bg !== 'none' && G.Assets.get(l.bg);
    var a = toWorld(0, 0), b = toWorld(cv.width, cv.height);
    ctx.fillStyle = D.colors.paper;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    // 배경은 게임 화면 위 끝 ~ 아래 끝 사이에만 (사용자 요청 2026-10-21: 범위를 늘리고 줄이면 배경도 같이). 높이에 맞춘 크기로 이어 붙임
    var top = l.camera.top, bh = l.camera.bottom - l.camera.top;
    if (!img) return;                                // 단색 종이면 배경 그림 없음
    var bw = img.width * bh / img.height;
    for (var x = Math.floor(a.x / bw) * bw; x < b.x; x += bw) ctx.drawImage(img, x, top, bw, bh);
  }

  function drawGrid() {
    if (!$('grid').checked) return;
    var a = toWorld(0, 0), b = toWorld(cv.width, cv.height), step = S.view.zoom < 0.35 ? 200 : 100;
    ctx.lineWidth = 1 / S.view.zoom;
    ctx.strokeStyle = 'rgba(43,33,24,0.07)';
    ctx.beginPath();
    for (var x = Math.floor(a.x / step) * step; x < b.x; x += step) { ctx.moveTo(x, a.y); ctx.lineTo(x, b.y); }
    for (var y = Math.floor(a.y / step) * step; y < b.y; y += step) { ctx.moveTo(a.x, y); ctx.lineTo(b.x, y); }
    ctx.stroke();
  }

  function drawStart(l) {
    var top = l.start.y, r = D.drop.heroRadius;
    if (top == null) top = 600;
    G.UI.drawStart(ctx, l.start.x, top);           // 시작 구멍 (게임과 같은 그림)
    var img = G.Assets.get('char_idle'), s = r * D.art.charSize;
    if (img) ctx.drawImage(img, l.start.x - s / 2, top - s, s, s);
    else {
      ctx.beginPath(); ctx.arc(l.start.x, top - r, r, 0, 6.283);
      ctx.fillStyle = D.colors.player; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.colors.outline; ctx.stroke();
    }
    label('시작', l.start.x - 14, top - D.art.startHole.up - D.art.startHole.size / 2 - 8, '#1F6FE0');
  }

  function label(text, x, y, color) {
    ctx.save();
    ctx.font = 'bold ' + (13 / S.view.zoom) + 'px sans-serif';
    ctx.fillStyle = color || D.colors.outline;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 게임 화면 위 끝·아래 끝 이름표 사각형 (화면 왼쪽, 월드 좌표). 이름표나 빈 곳의 선을 끌면 옮겨짐 (사용자 요청 2026-10-21)
  function camLabelRect(kind) {
    var l = lv(), z = S.view.zoom, a = toWorld(0, 0), y = kind === 'camTop' ? l.camera.top : l.camera.bottom;
    return { x: a.x + 6 / z, y: y - 20 / z, w: 150 / z, h: 24 / z };
  }
  // 시작할 때 게임 화면 (기본 줌, 게임 카메라와 같은 계산: 주인공이 화면 높이 72% 쯤, 위·아래 끝 안)
  function startFrame(l) {
    var cz = Math.max(D.art.camera.minZoom, Math.min(D.art.camera.maxZoom, l.camera.zoom)), vw = D.view.w / cz, vh = D.view.h / cz;
    var hy = l.start.y - D.drop.heroRadius, ty = Math.min(hy - vh * 0.72, l.camera.bottom - vh);
    ty = l.camera.bottom - l.camera.top >= vh ? Math.max(ty, l.camera.top) : l.camera.bottom - vh;
    return { x: l.start.x - vw / 2, y: ty, w: vw, h: vh, z: cz };
  }

  function drawGapsAndGuides(l) {
    var a = toWorld(0, 0), b = toWorld(cv.width, cv.height), z = S.view.zoom, cam = l.camera;
    // 게임 화면 위·아래 끝: 카메라가 이 밖은 보여 주지 않음 (스테이지 설정 → 카메라, 사용자 요청 2026-10-21)
    ['camTop', 'camBot'].forEach(function (k) {
      var y = k === 'camTop' ? cam.top : cam.bottom, on = S.sel && S.sel.kind === k;
      ctx.save();
      ctx.setLineDash([12 / z, 8 / z]);
      ctx.lineWidth = (on ? 3 : 1.5) / z; ctx.strokeStyle = on ? '#1F6FE0' : 'rgba(31,111,224,0.5)';
      ctx.beginPath(); ctx.moveTo(a.x, y); ctx.lineTo(b.x, y); ctx.stroke();
      var r = camLabelRect(k);
      ctx.setLineDash([]); ctx.fillStyle = on ? '#1F6FE0' : 'rgba(231,238,249,0.95)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      label((k === 'camTop' ? '▲ 게임 화면 위 끝 ' : '▼ 게임 화면 아래 끝 ') + y, r.x + 5 / z, r.y + 16 / z, on ? '#fff' : 'rgba(31,111,224,0.9)');
    });
    // 시작할 때 화면 (기본 줌)
    var sf = startFrame(l);
    ctx.save();
    ctx.setLineDash([4 / z, 6 / z]); ctx.lineWidth = 1.5 / z; ctx.strokeStyle = 'rgba(31,166,85,0.6)';
    ctx.strokeRect(sf.x, sf.y, sf.w, sf.h);
    ctx.restore();
    label('시작 화면 (줌 ' + sf.z + ')', sf.x + 6 / z, sf.y + sf.h - 8 / z, 'rgba(31,166,85,0.9)');
    // 그림으로 건너야 하는 틈
    LC.gaps(l).forEach(function (g) {
      ctx.fillStyle = 'rgba(224,49,43,0.10)';
      ctx.fillRect(g.x0, cam.top, g.w, cam.bottom - cam.top);
      label('틈 ' + g.w + (g.dy ? (g.dy < 0 ? ' ↑' : ' ↓') + Math.abs(g.dy) : ''), g.x0 + 4, cam.bottom - 40 / z, '#c0392b');
    });
    LC.blockingWalls(l).forEach(function (w) { label('막는 벽 ' + w.h, w.x, w.y - 8 / S.view.zoom, '#c0392b'); });
  }

  // 구간 경계 (사용자 결정 2026-10-20: 스테이지는 구간으로 이루어짐 — 설계 용어, 게임 규칙에는 영향 없음)
  function drawSegments(l) {
    var a = toWorld(0, 0), b = toWorld(0, cv.height);
    (l.segments || []).forEach(function (sg) {
      ctx.save();
      ctx.setLineDash([10 / S.view.zoom, 6 / S.view.zoom]); ctx.lineWidth = 2 / S.view.zoom; ctx.strokeStyle = 'rgba(122,61,170,0.6)';
      ctx.beginPath(); ctx.moveTo(sg.x, a.y); ctx.lineTo(sg.x, b.y); ctx.stroke();
      ctx.restore();
      label('▶ ' + sg.name, sg.x + 2 / S.view.zoom, a.y + 34 / S.view.zoom, '#7A3DAA');
    });
  }

  function render() {
    var l = lv(), z = S.view.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(z, 0, 0, z, -S.view.x * z, -S.view.y * z);
    drawWorldBg();
    drawGrid();
    drawGapsAndGuides(l);
    l.props.forEach(function (p) { if (p.type === 'deco' || p.type === 'text') P.draw(ctx, p, { editor: true }); });
    P.drawGrounds(ctx, l.ground);
    l.props.forEach(function (p) { var d = P.def(p.type); if (d && d.solid) P.draw(ctx, p, { editor: true }); });
    l.props.forEach(function (p) {                   // 배치된 선: 못 박힌 끝(빨간 점) — 노랑으로 지워 나뉘면 박힌 끝이 있는 조각만 남음
      if (p.type !== 'crystal') return;
      var pin = p.pin || 'both', k = 3.5 / S.view.zoom, e = crystalEnds(p);
      ctx.fillStyle = '#E0312B';
      if (pin === 'both' || pin === 'start') ctx.fillRect(e.s.x - k, e.s.y - k, k * 2, k * 2);
      if (pin === 'both' || pin === 'end') ctx.fillRect(e.e.x - k, e.e.y - k, k * 2, k * 2);
    });
    drawSegments(l);
    G.UI.drawGoal(ctx, l.goal.x, l.goal.y);
    label('도착', l.goal.x + 4, l.goal.y - D.art.goalJar.h - 8, '#1FA655');
    l.props.forEach(function (p) { if (p.type === 'drop' || p.type === 'star' || p.type === 'stopup' || p.type === 'inkup') P.draw(ctx, p, { editor: true }); });
    drawStart(l);

    // 땅 만들기 중
    if (S.drag && S.drag.mode === 'newGround') {
      var dg = S.drag;
      ctx.fillStyle = 'rgba(31,111,224,0.25)';
      ctx.fillRect(Math.min(dg.x0, dg.x1), dg.top, Math.abs(dg.x1 - dg.x0), 60);
    }

    // 여러 개 선택: 나머지도 점선 상자로 (Ctrl+클릭)
    var list = selList();
    if (list.length > 1) {
      ctx.save(); ctx.lineWidth = 2 / z; ctx.strokeStyle = 'rgba(31,111,224,0.8)'; ctx.setLineDash([6 / z, 4 / z]);
      list.forEach(function (sl) { var rr = sameSel(sl, S.sel) ? null : selRect(sl); if (rr) ctx.strokeRect(rr.x, rr.y, rr.w, rr.h); });
      ctx.restore();
    }
    // Ctrl+드래그 상자 선택 중
    if (S.drag && S.drag.mode === 'box') {
      var bx = S.drag;
      ctx.save(); ctx.fillStyle = 'rgba(31,111,224,0.08)'; ctx.strokeStyle = '#1F6FE0'; ctx.lineWidth = 1 / z; ctx.setLineDash([4 / z, 3 / z]);
      ctx.fillRect(Math.min(bx.x0, bx.x1), Math.min(bx.y0, bx.y1), Math.abs(bx.x1 - bx.x0), Math.abs(bx.y1 - bx.y0));
      ctx.strokeRect(Math.min(bx.x0, bx.x1), Math.min(bx.y0, bx.y1), Math.abs(bx.x1 - bx.x0), Math.abs(bx.y1 - bx.y0));
      ctx.restore();
    }

    // 선택 표시
    var r = selRect(S.sel), so = selObj();
    if (r) {
      ctx.save();
      ctx.lineWidth = 2 / z; ctx.strokeStyle = '#1F6FE0'; ctx.setLineDash([6 / z, 4 / z]);
      if (so && so.type === 'crystal') {               // 돌린 상자 + 회전 손잡이까지 선
        ctx.translate(so.x + so.w / 2, so.y + so.h / 2); ctx.rotate((so.angle || 0) * Math.PI / 180);
        ctx.strokeRect(-so.w / 2, -so.h / 2, so.w, so.h);
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(0, -so.h / 2); ctx.lineTo(0, -so.h / 2 - 26 / z); ctx.stroke();
      } else if (so && S.sel.kind === 'ground' && so.angle) {   // 비탈 땅: 사다리꼴 테두리
        var ss = LC.groundShape(so);
        ctx.beginPath(); ctx.moveTo(so.x0, ss.l); ctx.lineTo(so.x1, ss.r); ctx.lineTo(so.x1, ss.b); ctx.lineTo(so.x0, ss.b); ctx.closePath(); ctx.stroke();
      } else if (so && S.sel.kind === 'prop' && so.angle) {      // 돌린 물건: 돌린 상자
        var pc = P.pivot(so);
        ctx.translate(pc.x, pc.y); ctx.rotate(so.angle * Math.PI / 180); ctx.strokeRect(r.x - pc.x, r.y - pc.y, r.w, r.h);
      } else ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1F6FE0'; ctx.lineWidth = 2 / z;
      handles().forEach(function (h) {
        var s = HANDLE / z;
        ctx.fillRect(h[1] - s, h[2] - s, s * 2, s * 2); ctx.strokeRect(h[1] - s, h[2] - s, s * 2, s * 2);
      });
    }

    // 위쪽 눈금 (화면 좌표)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(243,233,210,0.9)'; ctx.fillRect(0, 0, cv.width, 18);
    ctx.fillStyle = D.colors.outline; ctx.font = '11px sans-serif';
    var a = toWorld(0, 0), b = toWorld(cv.width, 0), step = z < 0.35 ? 1000 : 500;
    for (var x = Math.floor(a.x / step) * step; x < b.x; x += step) {
      var sx = toScreen(x, 0).x;
      ctx.fillRect(sx, 12, 1, 6); ctx.fillText(x, sx + 3, 12);
    }
    ctx.fillText('x ' + Math.round(S.mouse.x) + '  y ' + Math.round(S.mouse.y), cv.width - 110, 12);
    renderMini();
  }

  function levelSpan(l) {
    var x0 = Math.min(l.start.x, l.goal.x), x1 = Math.max(l.start.x, l.goal.x);
    l.ground.forEach(function (g) { x0 = Math.min(x0, g.x0); x1 = Math.max(x1, g.x1); });
    l.props.forEach(function (p) { var r = P.rect(p); x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x + r.w); });
    return { x0: x0 - 300, x1: x1 + 300 };
  }

  function renderMini() {
    var l = lv(), w = mini.width = mini.clientWidth, h = mini.height = 70, sp = levelSpan(l);
    var k = w / (sp.x1 - sp.x0), ky = h / 1100, oy = -200;
    var X = function (x) { return (x - sp.x0) * k; }, Y = function (y) { return (y - oy) * ky; };
    mctx.fillStyle = '#f7f1e3'; mctx.fillRect(0, 0, w, h);
    mctx.fillStyle = '#C9B48A';
    l.ground.forEach(function (g) { mctx.fillRect(X(g.x0), Y(g.top), (g.x1 - g.x0) * k, h); });
    l.props.forEach(function (p) {
      var r = P.rect(p), d = P.def(p.type);
      mctx.fillStyle = p.type === 'star' ? '#F5C518' : d && d.solid ? '#7a6a4c' : 'rgba(43,33,24,0.15)';
      mctx.fillRect(X(r.x), Y(r.y), Math.max(2, r.w * k), Math.max(2, r.h * ky));
    });
    mctx.fillStyle = '#1F6FE0'; mctx.fillRect(X(l.start.x) - 1, 0, 3, h);
    mctx.fillStyle = '#1FA655'; mctx.fillRect(X(l.goal.x) - 1, 0, 3, h);
    var a = toWorld(0, 0), b = toWorld(cv.width, cv.height);
    mctx.strokeStyle = '#E0312B'; mctx.lineWidth = 2;
    mctx.strokeRect(X(a.x), Y(a.y), (b.x - a.x) * k, (b.y - a.y) * ky);
    mini._map = { sp: sp, k: k };
  }

  // ---------- 찾기 ----------
  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

  // 배치된 선: 가운데·양 끝(시작 = 돌리기 전 왼쪽)·각도(라디안)
  function crystalEnds(p) {
    var a = (p.angle || 0) * Math.PI / 180, c = { x: p.x + p.w / 2, y: p.y + p.h / 2 }, ux = Math.cos(a), uy = Math.sin(a);
    return { c: c, a: a, ux: ux, uy: uy, s: { x: c.x - ux * p.w / 2, y: c.y - uy * p.w / 2 }, e: { x: c.x + ux * p.w / 2, y: c.y + uy * p.w / 2 } };
  }
  function hitProp(w, p) {
    if (p.type !== 'crystal') return inRect(p.angle ? rotPt(w, P.pivot(p), -p.angle * Math.PI / 180) : w, P.rect(p));   // 돌린 물건은 돌리기 전 자리로 옮겨 봄
    var ce = crystalEnds(p), dx = w.x - ce.c.x, dy = w.y - ce.c.y;
    var lx = dx * ce.ux + dy * ce.uy, ly = -dx * ce.uy + dy * ce.ux;
    return Math.abs(lx) <= p.w / 2 + 3 / S.view.zoom && Math.abs(ly) <= Math.max(p.h / 2, 6 / S.view.zoom);
  }
  // 배치된 선 손잡이: cw/ce = 시작·끝 (반대쪽 끝은 그대로, 길이만), ct = 두께(가운데 기준), rot = 회전 (격자 맞춤이면 15도 단위)
  function resizeCrystal(o, q, h, dx, dy) {
    var ce = crystalEnds(q), along = dx * ce.ux + dy * ce.uy, L = q.w, c = { x: ce.c.x, y: ce.c.y };
    if (h === 'ce' || h === 'cw') {
      var nl = Math.max(10, snap(L + (h === 'ce' ? along : -along))), sh = (nl - L) / 2 * (h === 'ce' ? 1 : -1);
      c = { x: ce.c.x + ce.ux * sh, y: ce.c.y + ce.uy * sh }; o.w = nl;
    } else if (h === 'ct') {
      var upd = dx * Math.sin(ce.a) - dy * Math.cos(ce.a);
      o.h = Math.max(4, Math.round(q.h + upd * 2));
    } else if (h === 'rot') {
      var m = S.mouse, deg = Math.atan2(m.y - ce.c.y, m.x - ce.c.x) * 180 / Math.PI + 90;
      if ($('snap').checked && !S.altDown) deg = Math.round(deg / 15) * 15; else deg = Math.round(deg);
      o.angle = ((deg % 360) + 360) % 360;
    }
    o.x = c.x - o.w / 2; o.y = c.y - o.h / 2;
  }

  function hitTest(w) {
    var l = lv(), i, segs = l.segments || [];
    for (i = segs.length - 1; i >= 0; i--) if (inRect(w, segRect(i))) return { kind: 'seg', i: i };   // 구간 이름표가 가장 먼저
    if (inRect(w, camLabelRect('camTop'))) return { kind: 'camTop' };   // 게임 화면 위·아래 끝 이름표
    if (inRect(w, camLabelRect('camBot'))) return { kind: 'camBot' };
    if (inRect(w, selRect({ kind: 'start' }))) return { kind: 'start' };
    if (inRect(w, selRect({ kind: 'goal' }))) return { kind: 'goal' };
    var order = [function (p) { return p.type === 'drop' || p.type === 'star' || p.type === 'stopup' || p.type === 'inkup'; }, function (p) { var d = P.def(p.type); return d && d.solid; },
                 function (p) { return p.type === 'text' || p.type === 'deco'; }];
    for (var o = 0; o < order.length; o++) {
      for (i = l.props.length - 1; i >= 0; i--) {
        if (order[o](l.props[i]) && hitProp(w, l.props[i])) return { kind: 'prop', i: i };
      }
    }
    for (i = l.ground.length - 1; i >= 0; i--) {
      var g = l.ground[i];
      if (w.x >= g.x0 && w.x <= g.x1 && w.y >= LC.topOf(g, w.x) - 6 && w.y <= LC.groundShape(g).b) return { kind: 'ground', i: i };
    }
    for (i = segs.length - 1; i >= 0; i--) if (Math.abs(w.x - segs[i].x) <= 5 / S.view.zoom) return { kind: 'seg', i: i };   // 빈 곳의 보라 점선
    if (Math.abs(w.y - l.camera.top) <= 5 / S.view.zoom) return { kind: 'camTop' };              // 빈 곳의 파란 점선
    if (Math.abs(w.y - l.camera.bottom) <= 5 / S.view.zoom) return { kind: 'camBot' };
    return null;
  }

  function hitHandle(sx, sy) {
    var hs = handles();
    for (var i = 0; i < hs.length; i++) {
      var p = toScreen(hs[i][1], hs[i][2]);
      if (Math.abs(p.x - sx) <= HANDLE + 3 && Math.abs(p.y - sy) <= HANDLE + 3) return hs[i][0];
    }
    return null;
  }

  // 잉크 병 id: 계정에 "구간id:병id" 로 저장되므로 구간 안에서 겹치지 않게
  function newBottleId() {
    var used = {}, n = 1;
    lv().props.forEach(function (p) { if (p.type === 'inkup' && p.id) used[p.id] = 1; });
    while (used['b' + n]) n++;
    return 'b' + n;
  }

  // ---------- 놓기 ----------
  function place(tool, w) {
    var l = lv(), d = D.props[tool], p;
    pushUndo();
    if (tool === 'wall') {
      var top = LC.groundTopAt(l, w.x);
      p = { type: 'wall', x: snap(w.x - d.w / 2), y: top != null ? top - d.h : snap(w.y - d.h / 2), w: d.w, h: d.h };
    } else if (tool === 'platform') p = { type: 'platform', x: snap(w.x - d.w / 2), y: snap(w.y - d.h / 2), w: d.w, h: d.h };
    else if (tool === 'drop') {                      // 잠든 물방울: 클릭한 곳 땅 위에 놓임
      var td = LC.groundTopAt(l, w.x);
      p = { type: 'drop', x: snap(w.x), y: td != null ? td - D.drop.smallRadius : snap(w.y) };
    }
    else if (tool === 'spike') {                     // 가시: 클릭한 곳 땅 위에 깔림
      var ts = LC.groundTopAt(l, w.x);
      p = { type: 'spike', x: snap(w.x - d.w / 2), y: ts != null ? ts - d.h : snap(w.y - d.h / 2), w: d.w, h: d.h };
    }
    else if (tool === 'crystal') p = { type: 'crystal', x: snap(w.x - d.w / 2), y: snap(w.y - d.h / 2), w: d.w, h: d.h, angle: 0, pin: d.pin };
    else if (tool === 'stopup') p = { type: 'stopup', x: snap(w.x), y: snap(w.y), size: d.size };
    else if (tool === 'star') p = { type: 'star', x: snap(w.x), y: snap(w.y), size: d.size };
    else if (tool === 'segment') {                   // 구간 경계: 클릭한 x 에 새 경계, 이름은 오른쪽 "선택" 칸에서
      l.segments = l.segments || [];
      l.segments.push({ x: snap(w.x), name: '새 구간' });
      S.sel = { kind: 'seg', i: l.segments.length - 1 };
      changed();
      setTimeout(function () { var t = $('f_name'); if (t) { t.focus(); t.select(); } }, 0);
      return;
    }
    else if (tool === 'inkup') p = { type: 'inkup', id: newBottleId(), x: snap(w.x), y: snap(w.y), size: d.size };
    else if (tool === 'deco') p = { type: 'deco', x: snap(w.x), y: snap(w.y), size: d.size, img: S.decoImg };
    else if (tool === 'text') p = { type: 'text', x: snap(w.x), y: snap(w.y), size: d.size, text: d.text };
    l.props.push(p);
    S.sel = { kind: 'prop', i: l.props.length - 1 };
    changed();
    if (tool === 'text') setTimeout(function () { var t = $('f_text'); if (t) { t.focus(); t.select(); } }, 0);
  }

  // ---------- 마우스 ----------
  function mousePos(e) {
    var r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, w = toWorld(sx, sy);
    S.mouse = { x: w.x, y: w.y, sx: sx, sy: sy };
    return S.mouse;
  }

  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('mousedown', function (e) {
    var m = mousePos(e);
    e.preventDefault();                              // 캔버스 클릭이 입력칸 포커스를 빼앗지 않게
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    S.altDown = e.altKey;
    if (e.button === 2 || e.button === 1 || (e.button === 0 && S.spaceDown)) {
      S.drag = { mode: 'pan', sx: m.sx, sy: m.sy, vx: S.view.x, vy: S.view.y };
      return;
    }
    if (e.button !== 0) return;
    if (S.tool === 'ground') {
      S.drag = { mode: 'newGround', x0: snap(m.x), x1: snap(m.x), top: snap(m.y), keep: e.shiftKey };
      return;
    }
    if (S.tool !== 'select') {
      place(S.tool, m);
      if (!e.shiftKey) setTool('select');
      return;
    }
    var ctrl = e.ctrlKey || e.metaKey;
    var h = !ctrl && S.sel && hitHandle(m.sx, m.sy);
    if (h) {
      pushUndo();
      S.drag = { mode: 'resize', h: h, start: { x: m.x, y: m.y }, orig: JSON.parse(JSON.stringify(selObj())) };
      return;
    }
    var hit = hitTest(m);
    if (ctrl) {                                      // Ctrl+클릭: 선택에 더하기/빼기, Ctrl+빈 곳 드래그: 상자로 더하기 (사용자 요청 2026-10-21)
      if (!hit) { S.drag = { mode: 'box', x0: m.x, y0: m.y, x1: m.x, y1: m.y }; return; }
      var cur = selList().slice();
      if (inMultiList(cur, hit)) {
        cur = cur.filter(function (x) { return !sameSel(x, hit); });
        S.multi = cur; S.sel = cur[cur.length - 1] || null;
        refreshAll(); return;
      }
      cur.push(hit); S.multi = cur; S.sel = hit;
    } else if (!(hit && selList().length > 1 && inMulti(hit))) { S.sel = hit; S.multi = hit ? [hit] : []; }
    else S.sel = hit;                                // 여러 개 선택 중 그중 하나를 누르면 모두 함께 끌기
    if (hit) {
      pushUndo();
      S.drag = { mode: 'move', start: { x: m.x, y: m.y }, moved: false,
        items: selList().map(function (sl) { return { sel: sl, orig: JSON.parse(JSON.stringify(objOf(sl))) }; }) };
    }
    refreshAll();
  });
  function inMultiList(list, sel) { return list.some(function (x) { return sameSel(x, sel); }); }

  // 상자 안(조금이라도 겹치면)의 것들: 물건·땅·시작·도착
  function boxSelect(bx) {
    var l = lv(), r = { x: Math.min(bx.x0, bx.x1), y: Math.min(bx.y0, bx.y1), w: Math.abs(bx.x1 - bx.x0), h: Math.abs(bx.y1 - bx.y0) }, out = [];
    function hitR(a) { return a && a.x < r.x + r.w && r.x < a.x + a.w && a.y < r.y + r.h && r.y < a.y + a.h; }
    l.props.forEach(function (p, i) { if (hitR(selRect({ kind: 'prop', i: i }))) out.push({ kind: 'prop', i: i }); });
    l.ground.forEach(function (g, i) { if (hitR(selRect({ kind: 'ground', i: i }))) out.push({ kind: 'ground', i: i }); });
    ['start', 'goal'].forEach(function (k) { if (hitR(selRect({ kind: k }))) out.push({ kind: k }); });
    return out;
  }

  window.addEventListener('mousemove', function (e) {
    var m = mousePos(e), dr = S.drag;
    S.altDown = e.altKey;
    if (!dr) { updateCursor(m); render(); return; }
    if (dr.mode === 'pan') {
      S.view.x = dr.vx - (m.sx - dr.sx) / S.view.zoom;
      S.view.y = dr.vy - (m.sy - dr.sy) / S.view.zoom;
      S.mouse = toWorld(m.sx, m.sy); S.mouse.sx = m.sx; S.mouse.sy = m.sy;
      render(); return;
    }
    if (dr.mode === 'newGround') { dr.x1 = snap(m.x); render(); return; }
    if (dr.mode === 'box') { dr.x1 = m.x; dr.y1 = m.y; render(); return; }
    var o = selObj(), dx = m.x - dr.start.x, dy = m.y - dr.start.y, q = dr.orig;
    if (!o) return;
    if (dr.mode === 'move') {                        // 여러 개 선택이면 모두 같은 만큼
      dr.moved = true;
      dr.items.forEach(function (it) { var ob = objOf(it.sel); if (ob) moveObj(it.sel, ob, it.orig, dx, dy); });
    } else if (dr.mode === 'resize') resize(o, q, dr.h, dx, dy);
    changed(true);
  });

  // 회전 손잡이: 중심 c 에서 마우스 쪽이 "위"가 되게. 격자 맞춤이면 땅 5도·물건 15도 단위 (Alt = 1도). 땅 경사는 ±60도까지
  function setAngle(o, c, ground) {
    var m = S.mouse, deg = Math.atan2(m.y - c.y, m.x - c.x) * 180 / Math.PI + 90, step = ground ? 5 : 15;
    deg = $('snap').checked && !S.altDown ? Math.round(deg / step) * step : Math.round(deg);
    deg = ((deg % 360) + 540) % 360 - 180;
    if (ground) deg = Math.max(-60, Math.min(60, deg));
    if (deg) o.angle = deg; else delete o.angle;
  }

  function resize(o, q, h, dx, dy) {
    if (S.sel.kind === 'ground') {
      if (h === 'rot') { setAngle(o, { x: (q.x0 + q.x1) / 2, y: q.top }, true); return; }   // 경사 (사용자 요청 2026-10-21)
      var qs = LC.groundShape(q), tn = Math.tan((q.angle || 0) * Math.PI / 180);
      if (h === 'w') { o.x0 = Math.min(snap(q.x0 + dx), o.x1 - 20); if (tn) o.top = Math.round(qs.r - tn * (o.x1 - o.x0) / 2); }   // 비탈이면 반대쪽 끝 높이는 그대로
      if (h === 'e') { o.x1 = Math.max(snap(q.x1 + dx), o.x0 + 20); if (tn) o.top = Math.round(qs.l + tn * (o.x1 - o.x0) / 2); }
      var qh = q.h || D.level.groundDepth;           // 위 손잡이: 아랫면은 그대로 두고 윗면만 / 아래 손잡이: 높이 (사용자 요청 2026-10-20)
      if (h === 'n') { o.top = Math.min(snap(q.top + dy), q.top + qh - 20); o.h = q.top + qh - o.top; }
      if (h === 's') o.h = Math.max(20, snap(q.top + qh + dy) - q.top);
      return;
    }
    if (o.type === 'crystal') { resizeCrystal(o, q, h, dx, dy); return; }
    if (h === 'rot') { setAngle(o, P.pivot(q), false); return; }   // 모든 물건 회전 (사용자 요청 2026-10-21)
    if (q.angle && P.def(o.type).box) {              // 돌린 상자: 끄는 거리를 돌리기 전 방향으로 바꿔 크기를 바꾸고, 가운데를 다시 돌려 놓음
      var a = q.angle * Math.PI / 180, c0 = { x: q.x + q.w / 2, y: q.y + q.h / 2 }, lp = rotPt({ x: c0.x + dx, y: c0.y + dy }, c0, -a);
      var lx = lp.x - c0.x, ly = lp.y - c0.y, ax0 = q.x, ay0 = q.y, ax1 = q.x + q.w, ay1 = q.y + q.h;
      if (h.indexOf('w') >= 0) ax0 = Math.min(Math.round(q.x + lx), ax1 - 10);
      if (h.indexOf('e') >= 0) ax1 = Math.max(Math.round(ax1 + lx), ax0 + 10);
      if (h.indexOf('n') >= 0) ay0 = Math.min(Math.round(q.y + ly), ay1 - 10);
      if (h.indexOf('s') >= 0) ay1 = Math.max(Math.round(ay1 + ly), ay0 + 10);
      var nc = rotPt({ x: (ax0 + ax1) / 2, y: (ay0 + ay1) / 2 }, c0, a);
      o.w = ax1 - ax0; o.h = ay1 - ay0; o.x = Math.round(nc.x - o.w / 2); o.y = Math.round(nc.y - o.h / 2);
      return;
    }
    if (h === 'size') {
      var min = o.type === 'text' ? 10 : 16;
      o.size = Math.max(min, Math.round(q.size + (o.type === 'text' ? dx / 8 : (dx + dy) / 2) * 2));
      return;
    }
    var x0 = q.x, y0 = q.y, x1 = q.x + q.w, y1 = q.y + q.h;
    if (h.indexOf('w') >= 0) x0 = Math.min(snap(q.x + dx), x1 - 10);
    if (h.indexOf('e') >= 0) x1 = Math.max(snap(x1 + dx), x0 + 10);
    if (h.indexOf('n') >= 0) y0 = Math.min(snap(q.y + dy), y1 - 10);
    if (h.indexOf('s') >= 0) y1 = Math.max(snap(y1 + dy), y0 + 10);
    o.x = x0; o.y = y0; o.w = x1 - x0; o.h = y1 - y0;
  }

  window.addEventListener('mouseup', function () {
    var dr = S.drag;
    S.drag = null;
    if (!dr) return;
    if (dr.mode === 'newGround') {
      var x0 = Math.min(dr.x0, dr.x1), x1 = Math.max(dr.x0, dr.x1);
      if (x1 - x0 < 20) x1 = x0 + 400;               // 그냥 클릭하면 400px 땅
      pushUndo();
      lv().ground.push({ x0: x0, x1: x1, top: dr.top, h: D.level.groundDepth });
      S.sel = { kind: 'ground', i: lv().ground.length - 1 };
      if (!dr.keep) setTool('select');
      changed();
    } else if (dr.mode === 'box') {
      var cur = selList().slice();
      boxSelect(dr).forEach(function (sl) { if (!inMultiList(cur, sl)) cur.push(sl); });
      S.multi = cur; S.sel = cur[cur.length - 1] || null;
      refreshAll();
    } else if (dr.mode === 'move' && !dr.moved) {
      S.undo.pop();                                  // 클릭만 하고 안 움직였으면 되돌리기 기록 취소
      refreshAll();
    } else if (dr.mode !== 'pan') refreshAll();
  });

  function updateCursor(m) {
    if (S.tool !== 'select') { cv.style.cursor = 'crosshair'; return; }
    var h = S.sel && hitHandle(m.sx, m.sy);
    var map = { rot: 'grab', cw: 'ew-resize', ce: 'ew-resize', ct: 'ns-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', size: 'nwse-resize' };
    cv.style.cursor = h ? map[h] : hitTest(m) ? 'move' : 'default';
  }

  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var m = mousePos(e);
    // 휠 = 마우스 위치 기준 줌, Shift+휠 = 가로 이동 (사용자 결정 2026-10-20). 화면 이동은 우클릭·가운데·스페이스 드래그
    if (e.shiftKey) S.view.x += (e.deltaY || e.deltaX) / S.view.zoom;
    else if (e.deltaY) {
      var before = toWorld(m.sx, m.sy);
      setZoom(S.view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      S.view.x = before.x - m.sx / S.view.zoom; S.view.y = before.y - m.sy / S.view.zoom;
    }
    render();
  }, { passive: false });

  function setZoom(z) {
    S.view.zoom = Math.max(0.15, Math.min(2, z));
    $('zoomLbl').textContent = Math.round(S.view.zoom * 100) + '%';
  }

  mini.addEventListener('mousedown', function (e) {
    function go(ev) {
      var r = mini.getBoundingClientRect(), mp = mini._map;
      var wx = (ev.clientX - r.left) / mp.k + mp.sp.x0;
      S.view.x = wx - cv.width / 2 / S.view.zoom;
      render();
    }
    go(e);
    var mv = function (ev) { go(ev); }, up = function () { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  });

  // ---------- 키보드 ----------
  function typing() { var t = document.activeElement; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }

  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); return; }
    if (e.key === 'F5') { e.preventDefault(); play(); return; }
    if (typing()) return;
    if (e.code === 'Space') { S.spaceDown = true; cv.style.cursor = 'grab'; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); duplicate(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSel(); return; }
    if (e.key === 'Escape') { S.sel = null; S.multi = []; setTool('select'); refreshAll(); return; }
    if (e.key === 'Home') { S.view.x = lv().start.x - 300; render(); return; }
    if (e.key === 'End') { S.view.x = lv().goal.x - cv.width / S.view.zoom + 300; render(); return; }
    if ((k === 'q' || k === 'e') && S.sel && !e.ctrlKey && !e.metaKey) { e.preventDefault(); rotateSel(k === 'q' ? -1 : 1, e.shiftKey); return; }
    if (e.key.indexOf('Arrow') === 0 && S.sel) { e.preventDefault(); nudge(e.key, e.shiftKey ? 10 : 1); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    TOOLS.forEach(function (t) { if (k === t[2].toLowerCase()) setTool(t[0]); });
  });
  window.addEventListener('keyup', function (e) { if (e.code === 'Space') { S.spaceDown = false; cv.style.cursor = 'default'; } });

  // Q/E: 선택한 것 돌리기 (땅 5도·물건 15도, Shift = 1도). 여러 개 선택이면 각자 제자리에서
  function rotateSel(dir, fine) {
    var list = selList().filter(function (sl) { return sl.kind === 'prop' || sl.kind === 'ground'; });
    if (!list.length) return;
    pushUndo();
    list.forEach(function (sl) {
      var o = objOf(sl), ground = sl.kind === 'ground', step = fine ? 1 : ground ? 5 : 15;
      var v = (o.angle || 0) + dir * step;
      if (o.type === 'crystal') { o.angle = ((v % 360) + 360) % 360; return; }
      v = ground ? Math.max(-60, Math.min(60, v)) : ((v % 360) + 540) % 360 - 180;
      if (v) o.angle = v; else delete o.angle;
    });
    changed();
  }

  function nudge(key, n) {
    var dx = key === 'ArrowLeft' ? -n : key === 'ArrowRight' ? n : 0, dy = key === 'ArrowUp' ? -n : key === 'ArrowDown' ? n : 0;
    if (!selObj()) return;
    pushUndo();
    selList().forEach(function (sl) {                // 여러 개 선택이면 모두
      var o = objOf(sl);
      if (!o) return;
      if (sl.kind === 'ground') { o.x0 += dx; o.x1 += dx; o.top += dy; }
      else if (sl.kind === 'seg') o.x += dx;
      else if (sl.kind === 'camTop') o.top += dy;
      else if (sl.kind === 'camBot') o.bottom += dy;
      else { o.x += dx; o.y += dy; }
    });
    changed();
  }

  function duplicate() {
    var o = selObj();
    if (!o || S.sel.kind === 'start' || S.sel.kind === 'goal') return;
    pushUndo();
    var c = JSON.parse(JSON.stringify(o));
    if (S.sel.kind === 'seg') { c.x += 400; lv().segments.push(c); S.sel = { kind: 'seg', i: lv().segments.length - 1 }; changed(); return; }
    if (S.sel.kind === 'ground') { var w = c.x1 - c.x0; c.x0 = o.x1 + 200; c.x1 = c.x0 + w; lv().ground.push(c); S.sel = { kind: 'ground', i: lv().ground.length - 1 }; }
    else { c.x += 40; c.y -= 40; lv().props.push(c); S.sel = { kind: 'prop', i: lv().props.length - 1 }; }
    changed();
  }

  // 여러 개 선택이면 모두 지움 (시작·도착·화면 끝 선은 못 지움). 번호가 밀리지 않게 뒤에서부터
  function removeSel() {
    var list = selList().filter(function (sl) { return sl.kind === 'prop' || sl.kind === 'ground' || sl.kind === 'seg'; });
    if (!list.length) return;
    pushUndo();
    list.slice().sort(function (a, b) { return b.i - a.i; }).forEach(function (sl) {
      (sl.kind === 'ground' ? lv().ground : sl.kind === 'seg' ? lv().segments : lv().props).splice(sl.i, 1);
    });
    S.sel = null; S.multi = [];
    changed();
  }

  function reorder(dir) {
    if (!S.sel || S.sel.kind !== 'prop') return;
    var arr = lv().props, i = S.sel.i, j = dir === 'front' ? arr.length - 1 : 0;
    pushUndo();
    var p = arr.splice(i, 1)[0];
    arr.splice(j, 0, p);
    S.sel.i = j;
    changed();
  }

  // ---------- 화면 왼쪽 도구 ----------
  function setTool(t) { S.tool = t; buildTools(); updateCursor(S.mouse); }
  function buildTools() {
    $('tools').innerHTML = TOOLS.map(function (t) {
      return '<button data-tool="' + t[0] + '"' + (S.tool === t[0] ? ' class="on"' : '') + '>' + t[1] + '<small>' + t[2] + '</small></button>';
    }).join('');
  }
  $('tools').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setTool(b.getAttribute('data-tool'));
  });

  // ---------- 오른쪽 패널 ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function num(id, label, v) { return '<div class="f"><label>' + label + '</label><input type="number" id="' + id + '" value="' + v + '"></div>'; }
  function opts(list, cur) {
    return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  }

  function buildLevelForm() {
    var l = lv(), bgs = Object.keys(D.art.backgrounds).map(function (k) { return [k, D.art.backgrounds[k] + ' (' + k + ')']; });
    function sec(t, sub) { return '<div class="sec">' + t + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
    function hint(t) { return '<div class="hint">' + t + '</div>'; }
    function check(id, label, on, text) {
      return '<div class="f"><label>' + label + '</label><label><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '>' + text + '</label></div>';
    }
    $('lvForm').innerHTML =
      '<div class="f"><label>이름</label><input id="l_name" value="' + esc(l.name) + '"></div>' +
      '<div class="f"><label>id</label><input id="l_id" value="' + esc(l.id) + '"></div>' +
      '<div class="f"><label>테스트용</label><label><input type="checkbox" id="l_test"' + (l.test ? ' checked' : '') + '>게임·제출본에서 숨김</label></div>' +
      '<div class="f"><label>배경</label><select id="l_bg">' + opts(bgs, l.bg) + '</select></div>' +
      num('l_ink', '잉크', l.ink) + check('l_infInk', '잉크 무제한', l.infInk, '켜면 잉크가 줄지 않음') +
      num('l_stops', '정지 횟수', l.stops) + check('l_infStops', '정지 무제한', l.infStops, '켜면 정지 횟수가 줄지 않음') +
      num('l_start', '시작 x', l.start.x) + num('l_goal', '도착 x', l.goal.x) +
      sec('카메라', '사용자 요청 2026-10-21') +
      '<div class="f"><label>기본 줌</label><input type="number" id="c_zoom" step="0.05" value="' + l.camera.zoom + '"></div>' +
      hint('1 = 화면 1280×720 그대로, 작을수록 넓게 보임 (' + D.art.camera.minZoom + ' ~ ' + D.art.camera.maxZoom + '). 휠 줌은 잠시 뒤 이 값으로 돌아옴') +
      num('c_top', '화면 위 끝 y', l.camera.top) + num('c_bottom', '화면 아래 끝 y', l.camera.bottom) +
      hint('카메라가 두 파란 점선 밖은 안 보여 줌. 화면의 파란 이름표·점선을 끌어도 됨. 초록 점선 = 시작할 때 화면') +
      sec('평가', '별 n/3 + 정화 %') + hint('별: 주인공이 닿아야 획득, 스테이지당 ' + D.level.starsPerStage + '개 (왼쪽 도구 "별"). 정화: 잉크병에 들어간 물방울 비율') +
      sec('쓸 수 있는 색', '게임 키 1~5') +
      '<div class="f"><label></label><div>' +
      D.inks.order.map(function (c) {
        return '<label class="opt"><input type="checkbox" id="k_' + c + '"' + (l.inks.indexOf(c) >= 0 ? ' checked' : '') + '>' + D.inks[c].name + '</label>';
      }).join('') + '</div></div>' +
      sec('색 효과 세기') +
      num('fx_bounce', '빨강 튕김', l.fx.bounce) + hint('15 ≈ 약 400px 높이') +
      num('fx_boostPct', '파랑 속도 %', l.fx.boostPct) + num('fx_boostMs', '파랑 유지 ms', l.fx.boostMs) +
      num('fx_riseSpeed', '초록 떠오름', l.fx.riseSpeed) + hint('스텝당 px (1.2 ≈ 초당 72px)') +
      sec('물방울', '속도는 스텝당 px, 5.2 ≈ 초당 312px') +
      num('d_heroSpeed', '주인공 속도', l.drops.heroSpeed) + num('d_smallSpeed', '작은 물방울 속도', l.drops.smallSpeed) +
      hint('소수 첫째 자리까지. 대열을 켜면 작은 물방울 속도는 이탈해 혼자 걸을 때만 씀') +
      check('d_collide', '서로 충돌', l.drops.collide, '물방울끼리 부딪힘') +
      hint('끄면 서로 통과(기본). 켜면 부딪혀 뒤로 돌거나 위에 올라탐') +
      check('d_follow', '대열', l.drops.follow, '주인공 발자국을 따라옴') +
      num('d_gap', '대열 간격', l.drops.gap) + hint('발자국 길이 px') +
      sec('지우개') +
      num('e_pct', '속도 % (주인공)', l.eraser.pct) + num('e_delayMs', '출발 ms', l.eraser.delayMs) +
      sec('구간 경계', '설계 표시만, "x:이름" 한 줄에 하나') +
      '<div class="f"><label>경계</label><textarea id="l_segments" rows="5">' +
      esc((l.segments || []).map(function (sg) { return sg.x + ':' + sg.name; }).join('\n')) + '</textarea></div>';
    $('lvSel').innerHTML = S.levels.map(function (x, i) { return '<option value="' + i + '"' + (i === S.cur ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(x.name) + '</option>'; }).join('');
  }

  function buildSelForm() {
    var o = selObj(), s = S.sel, h = '', many = selList().length;
    if (!o) { $('selForm').innerHTML = '없음 (클릭해서 선택 · Ctrl+클릭으로 여러 개)'; return; }
    if (many > 1) {                                  // 여러 개 선택 (사용자 요청 2026-10-21)
      $('selForm').innerHTML = '<b>' + many + '개 선택</b><div class="hint" style="margin-left:0">끌면 모두 함께 옮겨짐 · 방향키 1px(Shift 10px) · Ctrl+클릭으로 더하기/빼기 · Ctrl+빈 곳 드래그로 상자 선택 · Esc 해제</div>' +
        '<div class="row"><button data-act="del">모두 삭제 (Delete)</button></div>';
      return;
    }
    if (s.kind === 'camTop' || s.kind === 'camBot') {
      h = '<b>' + (s.kind === 'camTop' ? '게임 화면 위 끝' : '게임 화면 아래 끝') + '</b>' +
          num('f_camy', 'y', s.kind === 'camTop' ? o.top : o.bottom) +
          '<div class="hint" style="margin-left:0">카메라가 이 선 ' + (s.kind === 'camTop' ? '위' : '아래') + '는 보여 주지 않아요. 끌어서 옮기기 · 방향키 1px(Shift 10px)</div>';
      $('selForm').innerHTML = h;
      return;
    }
    if (s.kind === 'seg') {
      h = '<b>구간 경계</b>' + num('f_x', 'x', o.x) +
          '<div class="f"><label>이름</label><input id="f_name" value="' + esc(o.name) + '"></div>' +
          '<div>이 x부터 다음 경계까지가 이 구간. 끌어서 옮기기 · 방향키 1px(Shift 10px) · 설계 표시만(게임 규칙에는 영향 없음)</div>' +
          '<div class="row"><button data-act="dup">복제 (Ctrl+D)</button></div>';
    } else if (s.kind === 'start' || s.kind === 'goal') {
      h = '<b>' + (s.kind === 'start' ? '시작 위치' : '도착 위치') + '</b>' + num('f_x', 'x', o.x) + num('f_y', s.kind === 'start' ? 'y (발밑)' : 'y (병 바닥)', o.y) +
          '<div class="hint">끌어서 옮기기 (위아래도). 놓은 자리 그대로 — 공중이면 ' + (s.kind === 'start' ? '주인공이 떨어져요' : '잉크병이 떠 있어요') + '</div>';
    } else if (s.kind === 'ground') {
      h = '<b>땅</b>' + num('f_x0', '왼쪽 x', o.x0) + num('f_x1', '오른쪽 x', o.x1) + num('f_top', '윗면 y (가운데)', o.top) + num('f_h', '높이', o.h || D.level.groundDepth) +
          num('f_angle', '경사 (도)', o.angle || 0) + '<div class="hint">+ = 오른쪽이 낮음(내리막), − = 오른쪽이 높음(오르막). 윗면 가운데 기준, 아랫면은 평평. 동그란 위 손잡이를 끌어도 됨 (5도씩, Alt = 1도), Q/E 키</div>' +
          '<div>폭 ' + (o.x1 - o.x0) + '</div>';
    } else {
      var d = P.def(o.type);
      h = '<b>' + d.name + '</b>';
      if (o.type === 'crystal') {                    // 사용자 결정 2026-10-20: 회전·길이·두께, "붙은 끝" → "못 박힌 끝"
        h += num('f_cx', '가운데 x', Math.round(o.x + o.w / 2)) + num('f_cy', '가운데 y', Math.round(o.y + o.h / 2)) +
             num('f_w', '길이', o.w) + num('f_h', '두께', o.h) + num('f_angle', '각도 (도)', o.angle || 0);
        h += '<div class="hint">양 끝 손잡이 = 길이, 위 손잡이 = 두께, 동그란 위 손잡이 = 회전 (격자 맞춤이면 15도씩)</div>';
        h += '<div class="f"><label>못 박힌 끝</label><select id="f_pin">' + opts([['both', '양쪽'], ['start', '시작 끝 (0도일 때 왼쪽)'], ['end', '끝 (0도일 때 오른쪽)'], ['none', '없음']], o.pin || 'both') + '</select></div>';
        h += '<div class="hint">빨간 점 = 벽·땅에 박힌 끝. 노랑으로 칠해 지우면 선이 나뉘는데, 박힌 끝이 있는 조각은 제자리에 남고 나머지는 떨어져요</div>';
      } else if (d.box) {
        h += '<div class="f"><label>종류</label><select id="f_type">' + opts([['wall', '벽'], ['platform', '발판'], ['spike', '가시']], o.type) + '</select></div>';
        h += num('f_x', 'x (왼쪽)', o.x) + num('f_y', 'y (위)', o.y) + num('f_w', '폭', o.w) + num('f_h', '높이', o.h) + num('f_angle', '각도 (도)', o.angle || 0);
      } else {
        h += num('f_x', 'x', o.x) + num('f_y', 'y', o.y) + num('f_size', o.type === 'text' ? '글자 크기' : '크기', o.size || d.size) + num('f_angle', '각도 (도)', o.angle || 0);
      }
      if (o.type === 'deco') {
        var list = D.art.decos.map(function (n) { return [n, n + (G.Assets.get(n) ? '' : ' (그림 없음)')]; });
        if (D.art.decos.indexOf(o.img) < 0) list.push([o.img, o.img]);
        h += '<div class="f"><label>그림</label><select id="f_img">' + opts(list, o.img) + '</select></div>';
      }
      if (o.type === 'text') h += '<div class="f"><label>문구</label><textarea id="f_text" rows="2">' + esc(o.text) + '</textarea></div>';
      h += '<div class="row"><button data-act="dup">복제 (Ctrl+D)</button><button data-act="front">맨 앞</button><button data-act="back">맨 뒤</button></div>';
    }
    if (s.kind !== 'start' && s.kind !== 'goal') h += '<div class="row"><button data-act="del">삭제 (Delete)</button></div>';
    $('selForm').innerHTML = h;
  }

  function buildChecks() {
    $('checks').innerHTML = LC.check(lv()).map(function (w) {
      return '<div class="' + w.lv + '">' + ({ error: '오류', warn: '주의', info: '정보' })[w.lv] + ' · ' + esc(w.msg) + '</div>';
    }).join('');
  }

  // 입력칸 → 데이터
  document.addEventListener('change', function (e) { applyInput(e.target, true); });
  document.addEventListener('input', function (e) { if (e.target.id === 'f_text' || e.target.id === 'l_name' || e.target.id === 'f_name') applyInput(e.target, false); });

  var inputUndoArmed = true;
  function applyInput(t, isChange) {
    var id = t.id, v = t.type === 'number' ? Math.round(+t.value) : t.value, l = lv(), o = selObj();
    if (!id || (t.type === 'number' && isNaN(v))) return;
    if (id === 'lvSel') { S.cur = +v; S.sel = null; refreshAll(); fitView(); return; }
    if (id === 'snap' || id === 'grid') { render(); return; }
    if (id === 'file') return;
    if (inputUndoArmed) { pushUndo(); inputUndoArmed = false; }
    if (isChange) inputUndoArmed = true;
    if (id === 'l_test') l.test = t.checked || undefined;
    else if (id === 'l_infInk') l.infInk = t.checked || undefined;        // 무제한 (사용자 요청 2026-10-21)
    else if (id === 'l_infStops') l.infStops = t.checked || undefined;
    else if (id === 'c_zoom') l.camera.zoom = Math.max(D.art.camera.minZoom, Math.min(D.art.camera.maxZoom, Math.round(+t.value * 100) / 100 || D.art.camera.baseZoom));
    else if (id === 'c_top') l.camera.top = Math.min(v, l.camera.bottom - 100);
    else if (id === 'c_bottom') l.camera.bottom = Math.max(v, l.camera.top + 100);
    else if (id === 'f_camy' && S.sel) { if (S.sel.kind === 'camTop') l.camera.top = Math.min(v, l.camera.bottom - 100); else l.camera.bottom = Math.max(v, l.camera.top + 100); }
    else if (id === 'l_name') l.name = v; else if (id === 'l_id') l.id = v; else if (id === 'l_bg') l.bg = v;
    else if (id === 'l_ink') l.ink = v; else if (id === 'l_stops') l.stops = v;
    else if (id === 'l_start') l.start.x = v; else if (id === 'l_goal') l.goal.x = v;
    else if (id === 'e_pct') l.eraser.pct = v; else if (id === 'e_delayMs') l.eraser.delayMs = v;
    else if (id === 'd_heroSpeed' || id === 'd_smallSpeed') l.drops[id.slice(2)] = Math.max(0.1, Math.round(+t.value * 10) / 10);
    else if (id === 'd_collide') l.drops.collide = t.checked;
    else if (id === 'd_follow') l.drops.follow = t.checked;
    else if (id === 'd_gap') l.drops.gap = Math.max(10, v);
    else if (id === 'l_segments') {
      l.segments = String(v).split('\n').map(function (line) {
        var m = /^\s*(-?\d+)\s*:\s*(.*)$/.exec(line); return m ? { x: +m[1], name: m[2].trim() } : null;
      }).filter(Boolean).sort(function (a, b) { return a.x - b.x; });
    }
    else if (id.indexOf('k_') === 0) {             // 쓸 수 있는 색 (순서는 1/2/3 순서로 유지)
      var c = id.slice(2), on = t.checked;
      l.inks = D.inks.order.filter(function (k) { return k === c ? on : l.inks.indexOf(k) >= 0; });
    }
    else if (id.indexOf('fx_') === 0) l.fx[id.slice(3)] = id === 'fx_riseSpeed' ? Math.round(+t.value * 10) / 10 : v;
    else if (o) {
      var f = id.slice(2);
      if (f === 'type') { o.type = v; }
      else if (f === 'img' || f === 'text' || f === 'pin') o[f] = v;
      else if (f === 'h' && S.sel.kind === 'ground') o.h = Math.max(20, v);
      else if (f === 'angle' && o.type !== 'crystal') {   // 회전·경사 (사용자 요청 2026-10-21). 0 이면 저장 안 함
        var av = S.sel.kind === 'ground' ? Math.max(-60, Math.min(60, v)) : ((v % 360) + 540) % 360 - 180;
        if (av) o.angle = av; else delete o.angle;
      }
      else if (o.type === 'crystal' && (f === 'cx' || f === 'cy' || f === 'w' || f === 'h' || f === 'angle')) {   // 가운데를 유지하며
        var ccx = o.x + o.w / 2, ccy = o.y + o.h / 2;
        if (f === 'cx') ccx = v; else if (f === 'cy') ccy = v;
        else if (f === 'w') o.w = Math.max(10, v); else if (f === 'h') o.h = Math.max(4, v);
        else o.angle = ((v % 360) + 360) % 360;
        o.x = ccx - o.w / 2; o.y = ccy - o.h / 2;
      }
      else o[f] = v;
    }
    changed(!isChange || id === 'f_text' || id === 'l_name' || id === 'f_name');
  }

  // ---------- 상단 버튼 ----------
  document.querySelector('header').addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-act');
    if (a) act(a);
  });
  $('selForm').addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-act');
    if (a === 'del') removeSel(); else if (a === 'dup') duplicate(); else if (a === 'front' || a === 'back') reorder(a);
  });

  function newLevel() {
    return LC.normalize({
      id: 'w' + (S.levels.length + 1), name: '스테이지 ' + (S.levels.length + 1), bg: 'bg_a',
      start: { x: 200 }, goal: { x: 2200 },
      ground: [{ x0: -400, x1: 2600, top: 600 }],
      props: [{ type: 'wall', x: -160, y: 300, w: 40, h: 300 }, { type: 'drop', x: 800, y: 587 }]
    });
  }

  function act(a) {
    if (a === 'undo') undo();
    else if (a === 'redo') redo();
    else if (a === 'zoomIn') { setZoom(S.view.zoom * 1.25); render(); }
    else if (a === 'zoomOut') { setZoom(S.view.zoom / 1.25); render(); }
    else if (a === 'play') play();
    else if (a === 'save') save();
    else if (a === 'saveAs') save(true);
    else if (a === 'load') $('file').click();
    else if (a === 'lvNew') { pushUndo(); S.levels.push(newLevel()); S.cur = S.levels.length - 1; S.sel = null; changed(); fitView(); }
    else if (a === 'lvDup') {
      pushUndo();
      var c = JSON.parse(JSON.stringify(lv())); c.id += '_copy'; c.name += ' (복사)';
      S.levels.splice(S.cur + 1, 0, c); S.cur += 1; S.sel = null; changed();
    } else if (a === 'lvDel') {
      if (S.levels.length < 2) { alert('스테이지가 하나뿐이라 지울 수 없어요'); return; }
      if (!confirm('"' + lv().name + '" 스테이지를 지울까요? (되돌리기로 복구 가능)')) return;
      pushUndo(); S.levels.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); S.sel = null; changed();
    } else if (a === 'lvUp' || a === 'lvDown') {
      var j = S.cur + (a === 'lvUp' ? -1 : 1);
      if (j < 0 || j >= S.levels.length) return;
      pushUndo(); var t = S.levels[j]; S.levels[j] = S.levels[S.cur]; S.levels[S.cur] = t; S.cur = j; changed();
    }
  }

  // ---------- 저장 · 불러오기 · 테스트 플레이 ----------
  function levelsText() {
    var body = S.levels.map(function (l) {
      var lines = ['  {'];
      ['id', 'name', 'test', 'bg', 'ink', 'infInk', 'stops', 'infStops', 'inks', 'fx', 'drops', 'eraser', 'camera', 'segments', 'start', 'goal'].forEach(function (k) {
        if ((k === 'test' || k === 'infInk' || k === 'infStops') && !l[k]) return;   // 테스트용·무제한 표시는 켰을 때만
        var v = k === 'segments' ? (l.segments || []).slice().sort(function (a, b) { return a.x - b.x; }) : l[k];   // 구간 경계는 x 순서로 저장
        lines.push('    ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',');
      });
      lines.push('    "ground": [\n' + l.ground.map(function (g) { return '      ' + JSON.stringify(g); }).join(',\n') + '\n    ],');
      lines.push('    "props": [\n' + l.props.map(function (p) { return '      ' + JSON.stringify(p); }).join(',\n') + '\n    ]');
      lines.push('  }');
      return lines.join('\n');
    }).join(',\n');
    return '// 스톱 앤 스케치 — 물방울 무리 시험판 스테이지 데이터. tools/level_editor.html 로 편집해서 이 파일로 저장한다 (직접 고쳐도 됨)\n' +
      '// ground: 땅 {x0, x1, top}  /  props: 벽·발판 {type, x, y(왼쪽 위), w, h}, 별·장식 {type, x, y(가운데), size}, 글자 {type, x, y, size, text}\n' +
      'var G = G || {};\n\nG.LEVELS = [\n' + body + '\n];\n';
  }

  // ---- 최근 저장 위치 기억 ----
  // 브라우저는 보안상 폴더 경로를 알려주지 않는다. 대신 ① 저장한 파일 자체(핸들)를 IndexedDB에 기억해 다음에 열어도
  // 같은 파일에 바로 저장하고, ② 저장 창은 지난번 폴더에서 열리게 하고(id), ③ 파일 이름·시각을 화면에 보여 준다.
  var IDB = { db: 'stopsketch-swarm-editor', store: 'handles', key: 'levels' };
  function idb(mode, fn) {
    return new Promise(function (ok, fail) {
      var req = indexedDB.open(IDB.db, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(IDB.store); };
      req.onerror = function () { fail(req.error); };
      req.onsuccess = function () {
        var tx = req.result.transaction(IDB.store, mode), r = fn(tx.objectStore(IDB.store));
        tx.oncomplete = function () { ok(r && r.result); };
        tx.onerror = function () { fail(tx.error); };
      };
    });
  }
  function rememberHandle(h) { return idb('readwrite', function (st) { return st.put(h, IDB.key); }).catch(function () {}); }
  function recallHandle() { return idb('readonly', function (st) { return st.get(IDB.key); }).catch(function () { return null; }); }

  var LAST_KEY = 'stopsketch.editor.lastSave';
  function showLastSave() {
    var info = null;
    try { info = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) { /* 무시 */ }
    var el = $('lastSave');
    if (!info) { el.textContent = '최근 저장: 없음 (처음 저장할 때 stopsketch_swarm/src/levels.js 를 고르세요)'; return; }
    el.textContent = '최근 저장: ' + info.name + ' · ' + info.when + (info.how === 'download' ? ' (내려받기 폴더)' : S.fileHandle ? ' → 저장하면 이 파일에 덮어씀' : '');
    el.title = info.how === 'download'
      ? '내려받기 폴더에 저장됨. stopsketch_swarm/src/levels.js 로 옮겨 덮어쓰세요.'
      : '저장 창은 지난번 폴더에서 열립니다. (브라우저는 보안상 폴더 전체 경로를 알려주지 않아 파일 이름만 표시)';
  }
  function noteSaved(name, how) {
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var when = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    try { localStorage.setItem(LAST_KEY, JSON.stringify({ name: name, when: when, how: how })); } catch (e) { /* 무시 */ }
    showLastSave();
  }

  async function writable(h) {
    if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('저장 권한이 없어요');
    }
    return h.createWritable();
  }

  // asNew: true 면 저장 창을 띄워 새 위치를 고른다 ("다른 곳에 저장")
  async function save(asNew) {
    var text = levelsText();
    try {
      if (window.showSaveFilePicker) {
        if (!S.fileHandle || asNew) {
          var opts = { id: 'stopsketch-levels', suggestedName: 'levels.js', types: [{ description: 'levels.js', accept: { 'text/javascript': ['.js'] } }] };
          if (S.fileHandle) opts.startIn = S.fileHandle;
          S.fileHandle = await window.showSaveFilePicker(opts);
          rememberHandle(S.fileHandle);
        }
        var w = await writable(S.fileHandle);
        await w.write(text); await w.close();
        markSaved('저장함');
        noteSaved(S.fileHandle.name, 'file');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      alert('저장 실패: ' + (err && err.message) + '\n저장 위치를 다시 골라 주세요.');
      S.fileHandle = null;
      return;
    }
    var a = document.createElement('a');                 // 파일 저장 창을 못 쓰는 브라우저: 내려받기
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    a.download = 'levels.js'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    markSaved('내려받음 → stopsketch_swarm/src/levels.js 에 덮어쓰세요');
    noteSaved('levels.js', 'download');
  }

  function markSaved(msg) {
    S.dirty = false;
    try { localStorage.removeItem(D.save.editorDraftKey); } catch (e) { /* 무시 */ }
    $('status').textContent = msg; $('status').className = '';
  }

  $('file').addEventListener('change', function () {
    var f = this.files[0];
    if (!f) return;
    f.text().then(function (txt) {
      try {
        var s = txt.indexOf('['), e = txt.lastIndexOf(']');
        var arr = JSON.parse(txt.slice(s, e + 1));
        if (!Array.isArray(arr) || !arr.length) throw new Error('스테이지 목록이 비어 있음');
        pushUndo();
        S.levels = arr.map(LC.normalize); S.cur = 0; S.sel = null; S.fileHandle = null;
        changed(); fitView();
        $('status').textContent = '불러옴: ' + f.name;
      } catch (err) { alert('불러오기 실패: ' + err.message); }
    });
    this.value = '';
  });

  function play() {
    var errs = LC.check(lv()).filter(function (w) { return w.lv === 'error'; });
    if (errs.length && !confirm('오류가 있어요:\n' + errs.map(function (w) { return '· ' + w.msg; }).join('\n') + '\n\n그래도 테스트할까요?')) return;
    window.open('../src/index.html#test=' + encodeURIComponent(JSON.stringify(lv())), 'stopsketch_test');
  }

  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- 화면 맞춤 · 갱신 ----------
  function fitView() {
    var h = cv.height || 600;
    setZoom(Math.max(0.2, Math.min(1, h / 1000)));
    S.view.y = -150;
    S.view.x = lv().start.x - 300;
    render();
  }

  function refreshAll(keepForms) {
    if (!keepForms) { buildLevelForm(); buildSelForm(); }
    else syncSelNumbers();
    buildChecks();
    $('status').textContent = S.dirty ? '저장 안 됨' : $('status').textContent;
    $('status').className = S.dirty ? 'dirty' : '';
    render();
  }

  // 끌어서 옮기는 중에는 입력칸 숫자만 갱신 (패널을 다시 만들면 깜빡임)
  function syncSelNumbers() {
    var o = selObj();
    if (!o) return;
    ['x', 'y', 'w', 'h', 'size', 'x0', 'x1', 'top', 'angle'].forEach(function (k) {
      var el = $('f_' + k);
      if (el && document.activeElement !== el && o[k] != null) el.value = o[k];
    });
    ['c_top', 'c_bottom'].forEach(function (id) {   // 화면 끝 선을 끄는 중
      var el = $(id);
      if (el && document.activeElement !== el) el.value = lv().camera[id.slice(2)];
    });
    var cy = $('f_camy');
    if (cy && document.activeElement !== cy && S.sel) cy.value = S.sel.kind === 'camTop' ? lv().camera.top : lv().camera.bottom;
    var bf = $('l_start'), gf = $('l_goal');
    if (bf && document.activeElement !== bf) bf.value = lv().start.x;
    if (gf && document.activeElement !== gf) gf.value = lv().goal.x;
  }

  function resizeCanvas() {
    var r = $('wrap').getBoundingClientRect();
    cv.width = Math.max(100, Math.floor(r.width)); cv.height = Math.max(100, Math.floor(r.height));
    render();
  }
  window.addEventListener('resize', resizeCanvas);

  // 이미지가 늦게 불러와져도 다시 그리기
  var imgWait = setInterval(function () { render(); }, 500);
  setTimeout(function () { clearInterval(imgWait); }, 5000);

  // 저장 안 된 이전 편집 복구
  try {
    var draft = localStorage.getItem(D.save.editorDraftKey);
    for (var di = 0; !draft && di < D.save.oldEditorDraftKeys.length; di++) draft = localStorage.getItem(D.save.oldEditorDraftKeys[di]);
    if (draft && draft !== JSON.stringify(S.levels) &&
        confirm('저장하지 않은 이전 편집이 있어요. 불러올까요?\n(취소하면 levels.js 내용으로 시작)')) {
      S.levels = JSON.parse(draft).map(LC.normalize);
      S.dirty = true;
    }
  } catch (e) { /* 무시 */ }

  G.Editor = S;   // 디버그용
  S.levelsText = levelsText;
  showLastSave();
  recallHandle().then(function (h) { if (h) { S.fileHandle = h; showLastSave(); } });
  buildTools();
  resizeCanvas();
  fitView();
  refreshAll();
})();
