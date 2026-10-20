// 화면 그리기 — 물방울 무리 시험판 (사용자 결정 2026-10-20). 이미지가 없으면 코드로 그린 임시 모양.
//   카메라: 걷는 물방울이 다 보이게 자동 줌(최소 minZoom), 마우스 휠이 우선이고 잠시 뒤 자동으로 돌아옴.
//   화면 밖 물방울은 가장자리 화살표. 지우개(왼쪽 흰 영역), 검은 잉크병 정화, 아래 5색 병 선반, 스킵 버튼
var G = G || {};

G.UI = (function () {
  var C = G.DATA.colors, V = G.DATA.view;
  var cam = { x: 0, y: 0, z: 1, manualZ: null, manualMs: 0, inited: false };
  var specks = null;

  function makeSpecks() {
    var rnd = G.makeRng(G.DATA.seed), out = [];
    for (var i = 0; i < 160; i++) out.push({ x: rnd() * 4000, y: rnd() * 720, r: 1 + rnd() * 2 });
    return out;
  }

  // ---- 카메라 ----
  function focusBox(game) {
    var list = G.Game.walking(game), box = null;
    if (!list.length) {                            // 아무도 안 걸으면 잉크병 쪽
      var gx = game.level.goalX, gy = game.level.data.goal.y;
      return { x0: gx - 200, x1: gx + 300, y0: gy - 200, y1: gy, hx: gx, hy: gy - 30 };
    }
    list.forEach(function (d) {
      var p = d.body.position;
      if (!box) box = { x0: p.x, x1: p.x, y0: p.y, y1: p.y };
      box.x0 = Math.min(box.x0, p.x); box.x1 = Math.max(box.x1, p.x);
      box.y0 = Math.min(box.y0, p.y); box.y1 = Math.max(box.y1, p.y);
    });
    var lead = game.hero.state === 'walk' ? game.hero : list[0];
    box.hx = lead.body.position.x; box.hy = lead.body.position.y;
    box.x0 = Math.max(box.x0, game.eraserX);         // 왼쪽은 지우개까지만 (사용자 결정 2026-10-20)
    return box;
  }

  function updateCamera(game, realMs) {
    if (game.status === 'fail' && cam.inited) return;   // 실패하면 그 자리에서 멈춤
    var A = G.DATA.art.camera, box = focusBox(game);
    if (cam.manualMs > 0 && G.Game.scale(game) > 0) cam.manualMs -= realMs || 16;
    if (cam.manualMs <= 0) cam.manualZ = null;
    var tz = cam.manualZ != null ? cam.manualZ : G.Rules.fitZoom(box, V, A);
    // 줌 아웃은 빠르게(물방울을 놓치지 않게), 줌 인은 천천히 (사용자 요청 2026-10-20: 다시 모일 때 화면이 확 바뀌지 않게). 휠 줌은 바로
    var k = cam.manualZ != null ? A.zoomOutEase : (tz > cam.z ? A.zoomInEase : A.zoomOutEase);
    cam.z += (tz - cam.z) * (cam.inited ? Math.min(1, k * (realMs || 16) / 16.7) : 1);
    var vw = V.w / cam.z, vh = V.h / cam.z;
    // 무리 가운데를 보되, 주인공(앞장선 물방울)이 화면 밖으로 나가지 않게 (가운데 ↔ 주인공 중심이 툭 바뀌지 않고 이어짐)
    var room = Math.max(0, vw / 2 - A.margin);
    var cx = Math.max(box.hx - room, Math.min(box.hx + room, (box.x0 + box.x1) / 2));
    var cy = (box.y0 + box.y1) / 2;
    var lowest = game.failY - G.DATA.physics.failY + 600;            // 이 스테이지의 가장 낮은 땅 (우물 바닥 등)
    var tx = cx - vw / 2, ty = Math.min(cy - vh * 0.72, lowest + 120 - vh);   // 땅이 화면 아래쪽에 오게, 가장 낮은 땅 아래로는 안 내려감
    if (!cam.inited) { cam.x = tx; cam.y = ty; cam.inited = true; }
    cam.x += (tx - cam.x) * A.ease * 2;
    cam.y += (ty - cam.y) * A.ease;
  }

  // 휠: 사용자 결정 2026-10-20 — 카메라 줌 (휠이 우선, manualMs 동안 쓰지 않으면 자동으로)
  function wheel(dy) {
    var A = G.DATA.art.camera;
    var z = (cam.manualZ != null ? cam.manualZ : cam.z) * (dy > 0 ? 0.9 : 1.1);
    cam.manualZ = Math.max(A.minZoom, Math.min(A.maxZoom, z));
    cam.manualMs = A.manualMs;
  }
  function resetCamera() { cam.inited = false; cam.manualZ = null; cam.manualMs = 0; }

  function toWorld(sx, sy) { return { x: sx / cam.z + cam.x, y: sy / cam.z + cam.y }; }
  function toScreen(wx, wy) { return { x: (wx - cam.x) * cam.z, y: (wy - cam.y) * cam.z }; }

  function poly(ctx, verts) {
    ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y);
    for (var i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
  }
  function path(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  // 배경 (레벨 툴도 사용)
  function drawBackground(ctx, name, camX, w, h) {
    w = w || V.w; h = h || V.h;
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);
    var bg = name && name !== 'none' && G.Assets.get(name);
    if (bg) {
      var bw = bg.width * h / bg.height;
      var off = ((camX * G.DATA.art.bgParallax) % bw + bw) % bw;
      for (var x = -off; x < w; x += bw) ctx.drawImage(bg, x, 0, bw, h);
      return;
    }
    if (!specks) specks = makeSpecks();
    ctx.fillStyle = 'rgba(43,33,24,0.08)';
    var off2 = ((camX * 0.5) % 4000 + 4000) % 4000;
    for (var i = 0; i < specks.length; i++) {
      var s = specks[i], sx = s.x - off2;
      if (sx < -10) sx += 4000;
      if (sx > w + 10) continue;
      ctx.beginPath(); ctx.arc(sx, s.y * h / V.h, s.r, 0, 6.283); ctx.fill();
    }
  }

  // 시작 구멍 (스케치북을 뚫고 나온 구멍)
  function drawStart(ctx, sx, gy) {
    if (gy == null) return;
    var A = G.DATA.art.startHole, s = A.size, cx = sx, cy = gy - A.up;
    var img = G.Assets.get('start_hole');
    if (img) { ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s); return; }
    var rnd = G.makeRng(7), n = 18, i, a, rr;
    ctx.save();
    ctx.beginPath();
    for (i = 0; i <= n; i++) { a = i / n * 6.283; rr = s * (0.42 + rnd() * 0.08); ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92); }
    ctx.closePath(); ctx.fillStyle = '#FFFDF6'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.beginPath();
    for (i = 0; i <= n; i++) { a = i / n * 6.283; rr = s * (0.30 + rnd() * 0.06); ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92); }
    ctx.closePath(); ctx.fillStyle = '#1E1A22'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }

  // 도착: 검은 잉크병. purity 0~1 만큼 병 전체가 검정 → 하늘색으로 섞여 감 (사용자 결정 2026-10-20)
  //   빈 통 이미지(goal_jar_empty, 안쪽 투명) 뒤에 잉크를 칠하고 통을 위에 그림
  //   clearCol: 정화됐을 때 색 (들어간 물방울 색의 평균). 없으면 하늘색
  function drawGoal(ctx, gx, gy, purity, clearCol) {
    if (gy == null) return;
    var J = G.DATA.art.goalJar, x = gx - 10, y = gy - J.h, w = J.w, h = J.h;
    var bx = x + w * 0.12, bw = w * 0.76, by = y + h * 0.2, bh = h * 0.78;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 26); else ctx.rect(bx, by, bw, bh);
    ctx.fillStyle = mix(C.jarDark, clearCol || C.jarClear, Math.max(0, Math.min(1, purity || 0)));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx + 12, by + 14, 8, bh * 0.55);
    var empty = G.Assets.get('goal_jar_empty'), dark = G.Assets.get('goal_jar_dark');
    if (empty) ctx.drawImage(empty, x, y, w, h);
    if (dark && empty) {                           // 검은 잉크병 이미지가 정화된 만큼 옅어짐 (아래 하늘색 잉크가 드러남)
      ctx.globalAlpha = 1 - Math.max(0, Math.min(1, purity || 0));
      ctx.drawImage(dark, x, y, w, h);
      ctx.globalAlpha = 1;
    }
    else {
      ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = '#C9A26B';
      ctx.fillRect(x + w * 0.06, y + h * 0.1, w * 0.88, h * 0.1); ctx.strokeRect(x + w * 0.06, y + h * 0.1, w * 0.88, h * 0.1);
    }
    ctx.restore();
  }

  // 지우개 (사용자 요청 2026-10-20: 벽이 아니라 진짜 지우개가 문지르며 다가오게). 그림이 없으면 예전 eraser_edge / 점선
  //   본체는 게임 시간(정지 중엔 멈춤)으로 위아래로 문지르고, 가루는 화면에만 있는 효과(물리 없음)
  var crumbs = [], lastRun = 0, crumbAcc = 0;
  function drawEraser(ctx, game) {
    var E = G.DATA.art.eraser, ex = game.eraserX, top = cam.y - 50, vh = V.h / cam.z, bottom = cam.y + vh + 50;
    var body = G.Assets.get('eraser_body'), smudge = G.Assets.get('eraser_smudge');
    var dt = game.runMs - lastRun; lastRun = game.runMs;
    if (dt < 0 || dt > 200) { dt = 0; crumbs = []; }          // 새 판이거나 오래 멈췄다 돌아오면 가루 비움
    if (ex < cam.x - 300) { crumbs = []; return; }
    // 지운 자리: 흰 종이
    ctx.fillStyle = '#FFFFFF';
    if (ex > cam.x - 10) ctx.fillRect(cam.x - 10, top, ex - cam.x + 10, bottom - top);
    if (!body) {                                    // 그림이 없을 때: 예전 가장자리 그림
      var img = G.Assets.get('eraser_edge');
      if (img) { var eh = bottom - top, ew = img.width * eh / img.height * 0.6; ctx.drawImage(img, ex - ew * 0.75, top, ew, eh); }
      else { ctx.strokeStyle = 'rgba(43,33,24,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(ex, top); ctx.lineTo(ex, bottom); ctx.stroke(); ctx.setLineDash([]); }
      return;
    }
    // 경계 띠: 왼쪽 흰색이 지운 자리와 이어지고 오른쪽으로 문지른 자국이 옅어짐. 세로로 반복
    if (smudge) {
      var sw = E.smudgeW, sh = smudge.height * sw / smudge.width, sx = ex - sw * 0.35;
      for (var y = Math.floor(top / sh) * sh; y < bottom; y += sh) ctx.drawImage(smudge, sx, y, sw, sh);
    }
    // 본체: 닳은 아래 모서리가 경계 앞 땅(없으면 화면 아래쪽)까지 내려왔다 올라가며 문지름
    var bh = vh * E.bodyH, bw = body.width * bh / body.height, ph = game.runMs / E.rubMs * Math.PI * 2;
    var gTop = G.Level.groundTopAt(game.level.data, ex + 30), base = gTop == null ? cam.y + vh * 0.8 : Math.min(gTop, cam.y + vh * 0.95);
    var cornerY = base - Math.abs(Math.sin(ph)) * vh * E.rubAmp * 2, tilt = Math.sin(ph * 2) * 0.05;
    // 가루: 문지르는 동안 경계에서 오른쪽 위로 튀어 나가 떨어짐 (게임 시간 기준)
    var parts = [G.Assets.get('eraser_crumb_1'), G.Assets.get('eraser_crumb_2'), G.Assets.get('eraser_crumb_3')].filter(Boolean);
    if (parts.length && dt > 0) {
      crumbAcc += dt;
      while (crumbAcc >= E.crumbMs) {
        crumbAcc -= E.crumbMs;
        var rnd = Math.random;
        crumbs.push({ x: ex + 6, y: cornerY - rnd() * 30, vx: 1.5 + rnd() * 3.5, vy: -2 - rnd() * 3, a: rnd() * 6.28, va: (rnd() - 0.5) * 0.3,
          s: E.crumb[0] + rnd() * (E.crumb[1] - E.crumb[0]), img: parts[Math.floor(rnd() * parts.length)], life: E.crumbLife });
      }
    }
    var k = dt / 16.7;
    crumbs = crumbs.filter(function (c) {
      c.life -= dt; c.x += c.vx * k; c.y += c.vy * k; c.vy += 0.25 * k; c.vx *= Math.pow(0.98, k); c.a += c.va * k;
      return c.life > 0;
    });
    ctx.save();
    ctx.translate(ex, cornerY); ctx.rotate(tilt);
    ctx.drawImage(body, -bw * 0.97, -bh * 0.85, bw, bh);   // 그림 오른쪽 아래(닳은 모서리)가 경계에
    ctx.restore();
    crumbs.forEach(function (c) {
      ctx.save(); ctx.globalAlpha = Math.min(1, c.life / 400); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.drawImage(c.img, -c.s / 2, -c.s / 2, c.s, c.s); ctx.restore();
    });
  }

  // 물감 선 + 색각 보조 무늬 (검정=없음, 빨강=점, 파랑=화살, 노랑=X, 초록=위 화살)
  function drawInkLine(ctx, pts, color, pending) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = color === 'yellow' ? G.DATA.ink.yellowCut * 2 : G.DATA.ink.thickness;   // 노랑은 지우는 폭 그대로 (칠한 부분이 지워짐)
    ctx.strokeStyle = C[color] || C.ink;
    ctx.setLineDash(pending ? [14, 10] : []);
    path(ctx, pts); ctx.stroke();
    ctx.setLineDash([]);
    if (pending || color === 'black') return;
    var gap = 22, acc = gap / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
      if (!len) continue;
      var ux = dx / len, uy = dy / len;
      while (acc <= len) {
        var x = a.x + ux * acc, y = a.y + uy * acc;
        ctx.beginPath();
        if (color === 'red') { ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); }
        else if (color === 'blue') { ctx.moveTo(x - ux * 3 - uy * 3, y - uy * 3 + ux * 3); ctx.lineTo(x + ux * 2, y + uy * 2); ctx.lineTo(x - ux * 3 + uy * 3, y - uy * 3 - ux * 3); ctx.stroke(); }
        else if (color === 'yellow') { ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke(); }
        else { ctx.moveTo(x - 3, y + 2); ctx.lineTo(x, y - 3); ctx.lineTo(x + 3, y + 2); ctx.stroke(); }
        acc += gap;
      }
      acc -= len;
    }
  }

  // 물방울 그림: 주인공·작은 물방울 같은 그림, 크기만 다름. 대열·붙는 중인 물방울은 위치를 직접 옮기므로 옮긴 거리로 속도를 봄
  function dropVel(d) { return (d.mode === 'line' || d.mode === 'join') && d.vel ? d.vel : d.body.velocity; }
  // 그림 이름을 고름 (없으면 char_idle). 그림마다 바라보는 방향이 달라 art.charFace 로 진행 방향에 맞춰 뒤집음 (사용자 요청 2026-10-20)
  function dropImageName(d) {
    var v = dropVel(d), A = G.DATA.art, get = G.Assets.get.bind(G.Assets), n;
    if (!d.grounded && v.y < -A.airVy) n = 'char_jump';
    else if (!d.grounded && v.y > A.airVy) n = 'char_fall';
    else n = Math.abs(v.x) > 0.5 ? 'char_run' : 'char_idle';
    return get(n) ? n : 'char_idle';
  }
  // 물든 그림 (사용자 결정 2026-10-20): 그림 위에 물든 색을 곱하기로 칠하고 그림 모양으로 잘라 냄 (테두리는 어두운 채로)
  var tintCv = null;
  function tinted(img, d) {
    var a = d.tc ? (d.ta || 0) : 0;
    if (a <= 0.01 || typeof document === 'undefined') return img;
    if (!tintCv) tintCv = document.createElement('canvas');
    var w = img.width, h = img.height, x = tintCv.getContext('2d');
    if (tintCv.width !== w || tintCv.height !== h) { tintCv.width = w; tintCv.height = h; }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h);
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = a * 0.9;
    x.fillStyle = 'rgb(' + d.tc.map(Math.round).join(',') + ')'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-over';
    return tintCv;
  }
  function tintFill(d) {
    var a = d.tc ? (d.ta || 0) : 0;
    return a > 0.01 ? mix(C.jarClear, d.tc, a) : C.player;
  }

  // 걷기 (사용자 요청 2026-10-20: 코드로 걷는 모습): 움직인 거리만큼 걸음 위상이 돌고, 걸음마다 통통 튀고(bob)·좌우로 기울고(sway)·
  //   발이 닿을 때 눌림(squash). 빠르면 걸음이 빨라짐. 수치는 data.js art.walk
  function walkPose(d) {
    var W = G.DATA.art.walk, p = d.body.position, moved = d.lastDraw ? Math.abs(p.x - d.lastDraw.x) : 0;
    d.lastDraw = { x: p.x, y: p.y };
    var walking = d.grounded && moved > 0.2;
    if (walking) d.walkPhase = ((d.walkPhase || 0) + moved / (d.r * W.stride) * Math.PI) % (Math.PI * 2);
    d.walkAmt = Math.max(0, Math.min(1, (d.walkAmt || 0) + (walking ? 0.15 : -0.1)));   // 멈추면 부드럽게 가라앉음
    var ph = d.walkPhase || 0, a = d.walkAmt;
    return {
      bob: -Math.abs(Math.sin(ph)) * d.r * W.bob * a,
      sway: Math.sin(ph) * W.sway * a + W.lean * a * d.dir,
      squash: (1 - Math.abs(Math.sin(ph))) * W.squash * a
    };
  }

  // 잉크병 앞에 줄 선 물방울(제자리에서 통통) + 입구로 뛰어드는 물방울(작아지며 회전)
  function drawGoalDrops(ctx, game) {
    var get = G.Assets.get.bind(G.Assets), A = G.DATA.art;
    function one(d, x, y, sc, rot, name) {
      var img = get(name) || get('char_idle'), r = d.r * sc, face = (A.charFace && A.charFace[name]) || 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(face, 1);
      if (img) { var s = r * A.charSize; ctx.drawImage(tinted(img, d), -s / 2, r - s, s, s); }
      else { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fillStyle = tintFill(d); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.outline; ctx.stroke(); }
      ctx.restore();
    }
    game.goalQueue.forEach(function (d, k) {
      var hop = Math.abs(Math.sin(game.timeMs / 180 + k)) * d.r * 0.15;
      one(d, d.qx, d.qy - hop, 1, 0, 'char_idle');
    });
    game.entering.forEach(function (d) {
      var p = G.Game.enterPose(game, d);
      one(d, p.x, p.y, p.scale, p.u * 0.8, p.u < 0.5 ? 'char_jump' : 'char_fall');
    });
  }

  // lineLen: 주인공이면 머리 위에 대열 길이 "×N" (사용자 결정 2026-10-20)
  function drawDrop(ctx, d, lineLen) {
    var b = d.body, r = d.r, v = dropVel(d), A = G.DATA.art;
    var stretch = Math.max(-0.25, Math.min(0.25, -v.y * 0.03));
    var pose = walkPose(d), name = dropImageName(d), img = G.Assets.get(name);
    ctx.save();
    ctx.translate(b.position.x, b.position.y + pose.bob);
    ctx.translate(0, r); ctx.rotate(pose.sway); ctx.translate(0, -r);   // 발밑을 축으로 기움
    if (d.join && d.join.t < d.join.wake) {        // 깨어나는 모션: 기지개(위로 늘었다 줄기) + 좌우 흔들기
      var k = d.join.t / d.join.wake;
      ctx.translate(0, r); ctx.rotate(Math.sin(k * Math.PI * 4) * 0.22 * (1 - k)); ctx.translate(0, -r);
      stretch = Math.sin(k * Math.PI) * 0.25;
    }
    stretch -= pose.squash;
    var face = (A.charFace && A.charFace[name]) || 1;   // 그림이 왼쪽을 보면 -1
    ctx.translate(0, r); ctx.scale((1 - stretch * 0.6) * d.dir * face, 1 + stretch); ctx.translate(0, -r);
    if (img) { var s = r * G.DATA.art.charSize; ctx.drawImage(tinted(img, d), -s / 2, r - s, s, s); }
    else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fillStyle = tintFill(d); ctx.fill();
      ctx.lineWidth = d.hero ? 4 : 2.5; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = C.outline;
      ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.2, r * 0.15, 0, 6.283); ctx.arc(r * 0.6, -r * 0.2, r * 0.15, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    if (d.hero) {                                  // 주인공 표시: 머리 위 작은 왕관 점
      ctx.fillStyle = C.star; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.position.x, b.position.y - r * 2.2, 5, 0, 6.283); ctx.fill(); ctx.stroke();
      if (lineLen) {
        ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,253,246,0.95)';
        ctx.strokeText('×' + lineLen, b.position.x, b.position.y - r * 2.2 - 12);
        ctx.fillStyle = C.outline; ctx.fillText('×' + lineLen, b.position.x, b.position.y - r * 2.2 - 12);
        ctx.textAlign = 'left';
      }
    }
  }

  function drawWorld(ctx, game, debug) {
    ctx.save();
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    var lv = game.level.data;
    lv.props.forEach(function (p) { if (p.type === 'deco' || p.type === 'text') G.Props.draw(ctx, p); });
    G.Props.drawGrounds(ctx, lv.ground);
    lv.props.forEach(function (p) { var d = G.Props.def(p.type); if (d && d.solid && p.type !== 'crystal') G.Props.draw(ctx, p); });
    game.level.crystals.forEach(function (c) { G.Props.drawCrystal(ctx, c); });
    game.fallen.forEach(function (f) {             // 잘려 떨어진 배치된 선 조각
      ctx.save(); ctx.translate(f.body.position.x, f.body.position.y); ctx.rotate(f.body.angle);
      G.Props.drawCrystal(ctx, { x: -f.w / 2, y: -f.h / 2, w: f.w, h: f.h }); ctx.restore();
    });
    drawStart(ctx, lv.start.x, lv.start.y);
    drawGoal(ctx, lv.goal.x, lv.goal.y, jarShown, G.Game.jarColor(game));
    game.level.items.forEach(function (it) {
      if (it.owned) { ctx.save(); ctx.globalAlpha = 0.2; G.Props.draw(ctx, it.prop); ctx.restore(); return; }
      if (!it.got) G.Props.draw(ctx, it.prop);
    });
    game.level.sleepers.forEach(function (sl) { if (sl.state === 'sleep') G.Props.drawSleeper(ctx, sl.x, sl.y, G.DATA.drop.smallRadius); });

    game.lines.forEach(function (ln) {
      ctx.globalAlpha = ln.active ? 1 : 0.5;
      drawInkLine(ctx, G.Draw.worldPts(ln), ln.color, !ln.active);
    });
    ctx.globalAlpha = 1;
    if (game.stroke && game.stroke.pts.length > 1) {
      ctx.globalAlpha = 0.6; drawInkLine(ctx, game.stroke.pts, game.stroke.color, true); ctx.globalAlpha = 1;
    }
    G.Game.walking(game).forEach(function (d) { if (!d.hero) drawDrop(ctx, d); });
    if (game.hero.state === 'walk') drawDrop(ctx, game.hero, game.level.data.drops.follow ? game.line.length : 0);
    drawGoalDrops(ctx, game);
    drawEraser(ctx, game);
    drawFx(ctx, game);                             // 지워지는 순간 효과가 흰 종이 위에 보이게 지우개 다음에

    if (debug.showBoxes) {
      ctx.lineWidth = 1.5 / cam.z; ctx.strokeStyle = '#ff00cc';
      G.Physics.allBodies(game.engine).forEach(function (b) {
        (b.parts.length > 1 ? b.parts.slice(1) : [b]).forEach(function (q) { poly(ctx, q.vertices); ctx.stroke(); });
      });
    }
    ctx.restore();
  }

  // 효과: 별 반짝(깨어남·아이템), 착지 먼지, 튕김·가속, 흡수, 빨아들임·자름
  function drawFx(ctx, game) {
    var F = G.DATA.art.fx;
    game.fx.forEach(function (f) {
      var t, img, k, i;
      if (f.type === 'suck' || f.type === 'cut') {
        t = (game.timeMs - f.t) / 350;
        if (t < 0 || t >= 1) return;
        ctx.save(); ctx.globalAlpha = 1 - t; ctx.setLineDash([4, 6]);
        ctx.lineWidth = (f.type === 'cut' ? G.DATA.ink.yellowCut * 2 : G.DATA.ink.thickness) * (1 - t); ctx.strokeStyle = f.type === 'cut' ? C.yellow : (C[f.color] || C.ink);
        path(ctx, f.pts); ctx.stroke(); ctx.restore();
        return;
      }
      if (f.type === 'erasePuff') {                 // 지우개에 지워지는 순간 (화면 시간): 가루 퍼짐 + 물방울은 지워진 얼굴이 흐려짐
        t = (Date.now() - f.real) / G.DATA.art.eraser.puffMs;
        if (t < 0 || t >= 1) return;
        img = G.Assets.get('fx_erase_puff');
        ctx.save();
        if (!f.line) {
          var face = G.Assets.get('char_erased');
          if (face) { var fs = f.r * G.DATA.art.charSize; ctx.globalAlpha = 1 - t; ctx.drawImage(face, f.x - fs / 2, f.y + f.r - fs, fs, fs); }
        }
        k = f.r * (3 + t * 3);
        ctx.globalAlpha = 1 - t * t;
        if (img) ctx.drawImage(img, f.x - k / 2, f.y - k / 2, k, k);
        else { ctx.strokeStyle = 'rgba(43,33,24,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, k / 2, 0, 6.283); ctx.stroke(); }
        ctx.restore();
        return;
      }
      if (f.type === 'absorb') {
        var lv = game.level.data, gy = lv.goal.y;
        t = (game.timeMs - f.t) / 500;
        img = G.Assets.get('fx_absorb');
        if (t < 0 || t >= 1) return;
        ctx.save(); ctx.globalAlpha = 1 - t;
        if (img) { k = 90 + t * 50; ctx.drawImage(img, f.x - k / 2, gy - G.DATA.art.goalJar.h * 0.8 - k / 2, k, k); }
        else { ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, gy - 120, 20 + t * 40, 0, 6.283); ctx.stroke(); }
        ctx.restore();
        return;
      }
      if (f.type === 'bounce' || f.type === 'boost') {
        t = (game.timeMs - f.t) / F.inkMs;
        if (t < 0 || t >= 1) return;
        img = G.Assets.get('fx_' + f.type);
        ctx.save(); ctx.globalAlpha = 1 - t * t;
        if (img) { ctx.translate(f.x, f.y); if (f.dir < 0) ctx.scale(-1, 1); ctx.drawImage(img, -45, -40, 90, 45); ctx.restore(); return; }
        ctx.lineWidth = 3; ctx.lineCap = 'round'; k = 10 + t * 18;
        ctx.strokeStyle = f.type === 'bounce' ? C.red : C.blue;
        for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(f.x + i * 9, f.y - 4); ctx.lineTo(f.x + i * 16, f.y - 4 - k); ctx.stroke(); }
        ctx.restore();
        return;
      }
      var star = f.type === 'star';
      img = G.Assets.get(star ? 'fx_star_pop' : 'fx_land');
      t = (game.timeMs - f.t) / (star ? F.starPopMs : F.landMs);
      if (!img || t < 0 || t >= 1) return;
      ctx.save(); ctx.globalAlpha = 1 - t * t;
      if (star) { var s = 60 + t * 60; ctx.drawImage(img, f.x - s / 2, f.y - s / 2, s, s); }
      else { var w = 70 + t * 50, h = w / 2; ctx.drawImage(img, f.x - w / 2, f.y - h * 0.75, w, h); }
      ctx.restore();
    });
  }

  // 화면 밖 물방울: 가장자리 화살표 (사용자 결정 2026-10-20). 주인공은 노란 화살표
  function drawArrows(ctx, game) {
    var img = G.Assets.get('ui_arrow'), pad = 26, top = 70, bottom = V.h - 96;
    G.Game.walking(game).forEach(function (d) {
      var p = toScreen(d.body.position.x, d.body.position.y);
      if (p.x >= 0 && p.x <= V.w && p.y >= 56 && p.y <= V.h) return;
      var cx = Math.max(pad, Math.min(V.w - pad, p.x)), cy = Math.max(top, Math.min(bottom, p.y));
      var a = Math.atan2(p.y - cy, p.x - cx), s = d.hero ? 18 : 12;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      if (img) ctx.drawImage(img, -s, -s, s * 2, s * 2);
      else {
        ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.75); ctx.lineTo(-s * 0.7, s * 0.75); ctx.closePath();
        ctx.fillStyle = d.hero ? C.star : C.player; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawHUD(ctx, game) {
    ctx.fillStyle = 'rgba(243,233,210,0.92)';
    ctx.fillRect(0, 0, V.w, 56);
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(V.w, 56); ctx.stroke();

    ctx.fillStyle = C.outline; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('잉크', 20, 35);
    var gx = 70, gw = 260, ratio = Math.max(0, game.ink / game.inkMax);
    var frame = G.Assets.get('ui_gauge_frame');
    ctx.fillStyle = ratio > 0 ? 'rgba(43,33,24,0.85)' : '#999';
    if (frame) { ctx.fillRect(gx + 4, 15, (gw - 8) * ratio, 26); ctx.drawImage(frame, gx - 6, 7, gw + 12, 44); }
    else { ctx.strokeRect(gx, 18, gw, 22); ctx.fillRect(gx + 2, 20, (gw - 4) * ratio, 18); }
    ctx.fillStyle = C.outline; ctx.font = '15px sans-serif';
    ctx.fillText(Math.round(game.ink) + ' / ' + game.inkMax, gx + gw + 10, 35);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('정지', 440, 35);
    var stopImg = G.Assets.get('ui_stop_on');
    for (var i = 0; i < game.stops.max; i++) {
      var on = i < game.stops.left, cx = 500 + i * 34;
      if (stopImg) { ctx.globalAlpha = on ? 1 : 0.22; ctx.drawImage(stopImg, cx - 16, 12, 32, 32); ctx.globalAlpha = 1; continue; }
      ctx.beginPath(); ctx.arc(cx, 29, 12, 0, 6.283);
      ctx.fillStyle = on ? C.star : 'rgba(43,33,24,0.12)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
    }

    // 물방울: 걷는 수 · 도착 · 잠든 수 / 정화
    var walking = G.Game.walking(game).length, sleeping = game.level.sleepers.filter(function (s) { return s.state === 'sleep'; }).length;
    var px = 510 + Math.max(3, game.stops.max) * 34;
    ctx.fillStyle = C.outline; ctx.font = 'bold 17px sans-serif';
    ctx.fillText('물방울 ' + game.rescued + '/' + game.total + ' 도착', px, 30);
    ctx.font = '13px sans-serif';
    if (game.level.data.drops.follow) {           // 대열 · 이탈(혼자 걷는 중) · 잠듦 · 잃음 (사용자 결정 2026-10-20)
      var alone = G.Game.walking(game).filter(function (d) { return d.mode === 'free'; }).length;
      ctx.fillText('대열 ' + game.line.length + ' · 이탈 ' + alone + ' · 잠듦 ' + sleeping + ' · 잃음 ' + game.lost, px, 48);
    } else ctx.fillText('걷는 중 ' + walking + ' · 잠듦 ' + sleeping + ' · 잃음 ' + game.lost, px, 48);

    // 오른쪽: 이번 판에 주운 별 (사용자 결정 2026-10-20) + 스테이지 이름·시간·정화
    var lv = game.level.data, sx = V.w - 22 - 26 * Math.max(0, game.starsTotal - 1);
    for (var k = 0; k < game.starsTotal; k++) drawStarIcon(ctx, sx + k * 26 - 4, 20, 11, k < game.starKeys.length);
    ctx.textAlign = 'right'; ctx.font = '13px sans-serif';
    ctx.fillText(lv.name + '  ·  ' + game.attempt + '번째  ·  ' + (game.timeMs / 1000).toFixed(1) + '초  ·  정화 ' +
      Math.round(G.Game.purity(game) * 100) + '%', V.w - 20, 48);
    ctx.textAlign = 'left';
  }

  // 스킵 버튼: 주인공이 도착하면 화면 위 가운데 (사용자 결정 2026-10-20)
  var skipRect = { x: V.w / 2 - 230, y: 66, w: 460, h: 44 };
  function drawSkip(ctx, game) {
    if (!G.Game.canSkip(game)) return;
    var r = skipRect, all = game.total + 1;          // 끝내면: 들어간 + 줄 선(곧 들어갈) 물방울
    var purity = game.rescued + (game.heroIn ? 1 : 0) + game.goalQueue.length + game.entering.length;
    ctx.fillStyle = 'rgba(255,253,246,0.95)'; ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 10); else ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.outline; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('남은 물방울 기다리지 않고 끝내기 (Enter)  ·  정화 ' + purity + '/' + all, V.w / 2, r.y + 28);
    ctx.textAlign = 'left';
  }
  function skipAt(sx, sy) { var r = skipRect; return sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h; }

  // 아래 5색 병 선반 (병 클릭 / 숫자 키 1~5)
  function shelfSlots() {
    var S = G.DATA.art.shelf;
    return G.DATA.inks.order.map(function (c, i) {
      return { color: c, key: i + 1, x: S.x + i * S.slot, y: V.h - S.h, w: S.slot - 6, h: S.h };
    });
  }
  function inkAt(sx, sy) {
    var hit = null;
    shelfSlots().forEach(function (b) { if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) hit = b.color; });
    return hit;
  }
  function drawShelf(ctx, game) {
    var S = G.DATA.art.shelf, slots = shelfSlots(), allowed = game.level.data.inks;
    var shelfW = S.x * 2 + slots.length * S.slot - 6, shelfImg = G.Assets.get('ui_shelf');
    if (shelfImg) ctx.drawImage(shelfImg, 0, V.h - 30, shelfW + 10, 30);
    else { ctx.fillStyle = '#B07A45'; ctx.fillRect(4, V.h - 16, shelfW, 12); ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5; ctx.strokeRect(4, V.h - 16, shelfW, 12); }
    var sel = G.Assets.get('ink_select');
    slots.forEach(function (b) {
      var on = allowed.indexOf(b.color) >= 0, picked = game.color === b.color;
      var img = G.Assets.get('ink_' + b.color), bw = S.bottle * 0.75, bh = S.bottle;
      var cx = b.x + b.w / 2, by = V.h - 16 - bh;
      if (picked) {
        if (sel) ctx.drawImage(sel, cx - bw * 0.75, by - 10, bw * 1.5, bh + 20);
        else { ctx.fillStyle = 'rgba(245,197,24,0.4)'; ctx.fillRect(cx - bw * 0.7, by - 6, bw * 1.4, bh + 8); }
      }
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.25;
      if (img) ctx.drawImage(img, cx - bw / 2, by, bw, bh);
      else {
        ctx.fillStyle = C[b.color]; ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - bw / 2, by + bh * 0.25, bw, bh * 0.75, 8); else ctx.rect(cx - bw / 2, by + bh * 0.25, bw, bh * 0.75);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#C9A26B'; ctx.fillRect(cx - bw * 0.2, by + bh * 0.08, bw * 0.4, bh * 0.17); ctx.strokeRect(cx - bw * 0.2, by + bh * 0.08, bw * 0.4, bh * 0.17);
      }
      ctx.restore();
      ctx.fillStyle = on ? C.outline : 'rgba(43,33,24,0.35)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(on ? String(b.key) : '잠김', cx, by - 4);
      ctx.textAlign = 'left';
    });
    var cur = G.DATA.inks[game.color];
    ctx.fillStyle = C.outline; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(cur ? cur.name : '', shelfW + 12, V.h - 40);
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillText('병 클릭 · 1~5 · 우클릭: 선 빨아들이기 · 휠: 줌', shelfW + 12, V.h - 20);
  }

  function drawStopOverlay(ctx, game) {
    if (!game.stopped) return;
    ctx.fillStyle = C.stopTint;
    ctx.fillRect(0, 56, V.w, V.h - 56);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 6;
    ctx.strokeRect(3, 59, V.w - 6, V.h - 62);
    ctx.fillStyle = C.blue; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('정지 중 — 드래그로 그리기 · 스페이스로 재생하면 선이 떨어져요', V.w / 2, 140);
    ctx.textAlign = 'left';
  }

  function drawMessages(ctx, game) {
    ctx.textAlign = 'center'; ctx.font = 'bold 22px sans-serif';
    game.messages.forEach(function (m, i) {
      ctx.globalAlpha = Math.min(1, m.ms / 400);
      ctx.fillStyle = C.red;
      ctx.fillText(m.text, V.w / 2, 180 + i * 30);
    });
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // 별 하나 (on = 주움). 그림이 있으면 그림, 없으면 도형
  function drawStarIcon(ctx, x, y, r, on) {
    var img = G.Assets.get(on ? 'star_full' : 'star_empty');
    if (img) { ctx.drawImage(img, x - r, y - r, r * 2, r * 2); return; }
    G.Props.drawStarShape(ctx, x, y, r);
    if (on) { ctx.fillStyle = C.star; ctx.fill(); }
    ctx.lineWidth = 2; ctx.strokeStyle = on ? C.outline : 'rgba(43,33,24,0.35)'; ctx.stroke();
  }

  // 클리어 결과 창은 잉크병이 다 밝아진 뒤 resultDelayMs 더 기다렸다가 (사용자 요청 2026-10-20: 정화되는 모습을 1초 더)
  var jarDoneAt = 0;
  function resultReady(game) {
    if (game.status !== 'clear') return true;
    if (jarShown < G.Game.purity(game) - 1e-6) { jarDoneAt = 0; return false; }
    if (!jarDoneAt) jarDoneAt = Date.now();
    return Date.now() - jarDoneAt >= G.DATA.goalEnter.resultDelayMs;
  }

  function drawResult(ctx, game) {
    if (game.status === 'run') return;
    if (game.status === 'ready') {
      ctx.textAlign = 'center'; ctx.fillStyle = C.outline; ctx.font = 'bold 28px sans-serif';
      ctx.fillText('클릭 또는 스페이스: 출발', V.w / 2, 250);
      ctx.font = '17px sans-serif';
      ctx.fillText('드래그: 그리기 · 스페이스: 시간 정지 · 우클릭: 선 빨아들이기 · 1~5·병 클릭: 색 · 휠: 줌 · R: 처음부터', V.w / 2, 285);
      ctx.textAlign = 'left';
      return;
    }
    if (!resultReady(game)) return;
    ctx.fillStyle = 'rgba(43,33,24,0.35)';
    ctx.fillRect(0, 0, V.w, V.h);
    var clear = game.status === 'clear' && game.result;
    var w = 560, h = clear ? 340 : 250, x = (V.w - w) / 2, y = (V.h - h) / 2;
    var panel = G.Assets.get('ui_panel');
    if (panel) ctx.drawImage(panel, x - 40, y - 30, w + 80, h + 60);
    else { ctx.fillStyle = C.paper; ctx.fillRect(x, y, w, h); ctx.strokeStyle = C.outline; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h); }
    var face = G.Assets.get(game.status === 'fail' ? 'char_erased' : 'char_goal');
    if (face && !clear) ctx.drawImage(face, x + 28, y + 6, 136, 136);
    ctx.textAlign = 'center'; ctx.fillStyle = game.status === 'clear' ? C.green : C.red;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(game.status === 'clear' ? '정화!' : game.failReason, V.w / 2, y + 70);
    ctx.fillStyle = C.outline;
    if (clear) {                                   // 별 n/3 과 정화 % 를 따로 (사용자 결정 2026-10-20)
      var r = game.result, best = game.best;
      ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = C.outline;
      ctx.fillText('별 ' + r.stars + ' / ' + r.starsTotal, V.w / 2, y + 102);
      for (var k = 0; k < r.starsTotal; k++) drawStarIcon(ctx, V.w / 2 + (k - (r.starsTotal - 1) / 2) * 56, y + 136, 25, k < r.stars);
      // 정화 막대
      var bw = 300, bx = V.w / 2 - bw / 2, by = y + 186;
      ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = C.outline;
      // 캐릭터: 정화 막대 왼쪽 위 꼭지점 위에 앉음 (사용자 요청 2026-10-20: 136 → 170). 정화 글자는 캐릭터를 비켜 오른쪽으로
      var fs = 170;
      if (face) ctx.drawImage(face, bx - fs / 2 + 4, by - fs * 0.93, fs, fs);
      ctx.fillText('정화 ' + Math.round(r.purity * 100) + '%  (물방울 ' + r.inJar + ' / ' + r.all + ')', bx + 80 + (bw - 80) / 2, by - 8);
      ctx.fillStyle = 'rgba(43,33,24,0.12)'; ctx.fillRect(bx, by, bw, 14);
      ctx.fillStyle = mix(C.jarDark, G.Game.jarColor(game), r.purity); ctx.fillRect(bx, by, bw * r.purity, 14);
      ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.strokeRect(bx, by, bw, 14);
      ctx.fillStyle = C.outline; ctx.font = '15px sans-serif';
      ctx.fillText((r.timeMs / 1000).toFixed(1) + '초' + (best ? '  ·  최고 기록: 별 ' + (best.stars || 0) + '/' + r.starsTotal +
        ' · 정화 ' + Math.round((best.bestPurity || 0) * 100) + '%' : ''), V.w / 2, y + 236);
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillText('물방울 ' + game.rescued + '/' + game.total + ' 도착 · ' + game.attempt + '번째 시도', V.w / 2, y + 125);
      ctx.fillText((game.timeMs / 1000).toFixed(1) + '초', V.w / 2, y + 158);
    }
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = C.outline;
    ctx.fillText('R 또는 클릭: 다시 하기' + (game.status === 'clear' && game.hasNext ? ' · N: 다음 스테이지' : ''), V.w / 2, y + h - (clear ? 74 : 30));   // 사용자 요청 2026-10-20: 조금 위로
    ctx.textAlign = 'left';
  }

  // 잉크병 밝기: 들어간 물방울 수(정화)를 향해 서서히 (사용자 요청 2026-10-20: 갑자기 밝아지지 않게). 새 시도면 바로 어둡게
  var jarShown = 0;
  function updateJar(game, dt) {
    var target = G.Game.purity(game), step = G.DATA.goalEnter.jarFadePerSec * dt / 1000;
    if (target < jarShown) jarShown = target;
    else jarShown = Math.min(target, jarShown + step);
  }

  var lastT = 0;
  function render(ctx, game, debug) {
    var now = Date.now(), dt = lastT ? Math.min(100, now - lastT) : 16;
    lastT = now;
    updateCamera(game, dt);
    updateJar(game, dt);
    drawBackground(ctx, game.level.data.bg, cam.x);
    drawWorld(ctx, game, debug);
    drawArrows(ctx, game);
    drawStopOverlay(ctx, game);
    drawHUD(ctx, game);
    drawSkip(ctx, game);
    drawShelf(ctx, game);
    drawMessages(ctx, game);
    drawResult(ctx, game);
  }

  return { render: render, toWorld: toWorld, toScreen: toScreen, cam: cam, wheel: wheel, resetCamera: resetCamera,
           drawBackground: drawBackground, drawGoal: drawGoal, drawStart: drawStart,
           inkAt: inkAt, skipAt: skipAt, drawInkLine: drawInkLine };
})();
