// 시작 화면 → 월드 선택 → 스테이지 선택 (사용자 결정 2026-10-23, 업무가이드 11-9: 클릭하는 판, 월드 → 번호 칸 구조)
//   그림(이미지 문서 16장)이 있으면 그림으로, 없으면 코드로 그린 임시 모양. 글자는 uitext.js (UI 툴), 위치·크기도 uitext.js style
//   열림: 스테이지를 깨면 다음 스테이지, 월드 마지막을 깨면 다음 월드 (rules.js worldUnlocked / stageUnlocked)
var G = G || {};

G.Menu = (function () {
  var V = G.DATA.view, C = G.DATA.colors, R = G.Rules, hoverPt = null, btns = [], t0 = Date.now();

  function S(k) { return G.TS(k); }
  function img(n) { return G.Assets.get(n); }
  function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  function hot(b) { return hoverPt && inside(b, hoverPt.x, hoverPt.y); }
  function worldOf(id) { return G.DATA.worlds.filter(function (w) { return w.id === id; })[0]; }
  function starsOf(lv) { return lv.props.filter(function (p) { return p.type === 'star'; }).length || G.DATA.level.starsPerStage; }
  function unlockedW(app, w) { return app.unlockAll || R.worldUnlocked(app.levels, app.account.records, w); }
  function unlockedS(app, lv) { return app.unlockAll || R.stageUnlocked(app.levels, app.account.records, lv); }

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function text(ctx, s, x, y, size, color, bold, align) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + S('font');
    ctx.fillStyle = color || S('textColor'); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    String(s).split('\n').forEach(function (l, i) { ctx.fillText(l, x, y + i * size * 1.25); });
  }
  // 9분할 없이 늘려 그리는 버튼 (ui_button 이 있으면 양 끝을 살려 세 조각으로)
  //   b.icon 이 있고 그 그림도 있으면 글자 앞에 그림 (뒤로 가기 ui_back — 이때 글자의 ← 는 뺌)
  function drawButton(ctx, b) {
    var im = img('ui_button'), h = hot(b), ic = b.icon && img(b.icon), label = b.label, size = b.size || S('menuBtnSize'), tx = b.x + b.w / 2;
    ctx.save();
    if (h) { ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(1.04, 1.04); ctx.translate(-b.x - b.w / 2, -b.y - b.h / 2); }
    if (im) {
      var e = Math.min(im.width / 3, im.height * 0.5), eh = b.h * e / im.height;
      ctx.drawImage(im, 0, 0, e, im.height, b.x, b.y, eh, b.h);
      ctx.drawImage(im, e, 0, im.width - 2 * e, im.height, b.x + eh, b.y, b.w - 2 * eh, b.h);
      ctx.drawImage(im, im.width - e, 0, e, im.height, b.x + b.w - eh, b.y, eh, b.h);
    } else {
      rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = h ? S('resultBtnHot') : S('resultBtnBg'); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
    }
    if (ic) {
      label = label.replace(/^←\s*/, '');
      ctx.font = 'bold ' + size + 'px ' + S('font');
      var is = b.h * 0.62, tw = ctx.measureText(label).width, x0 = b.x + (b.w - is - 6 - tw) / 2;
      ctx.drawImage(ic, x0, b.y + (b.h - is) / 2, is, is);
      tx = x0 + is + 6 + tw / 2;
    }
    text(ctx, label, tx, b.y + b.h / 2, size, null, true);
    ctx.restore();
  }
  // 월드 카드 그림: 실제 카드 영역(data.js art.cardCrop)만 잘라 위(테이프)·아래는 비율대로, 가운데만 늘려 세로 칸에 맞춤
  function drawCard(ctx, im, b) {
    var A = G.DATA.art, c = A.cardCrop || [0, 0, im.width, im.height], e = A.cardEnds || [0, 0], k = b.w / c[2], top = e[0] * k, bot = e[1] * k;
    ctx.drawImage(im, c[0], c[1], c[2], e[0], b.x, b.y, b.w, top);
    ctx.drawImage(im, c[0], c[1] + e[0], c[2], c[3] - e[0] - e[1], b.x, b.y + top, b.w, b.h - top - bot);
    ctx.drawImage(im, c[0], c[1] + c[3] - e[1], c[2], e[1], b.x, b.y + b.h - bot, b.w, bot);
  }
  // 새 월드 열림 효과 (fx_unlock, 이미지 문서 16장): 월드 색으로 물들여 카드 아이콘 위에서 커지며 사라짐. 그림이 없으면 안 그림
  var bursts = {}, burstCv = {};
  function unlockFxImage(color) {
    var im = img('fx_unlock');
    if (!im) return null;
    if (burstCv[color] && burstCv[color].src === im) return burstCv[color].cv;
    var cv = document.createElement('canvas'), x = cv.getContext('2d');
    cv.width = im.width; cv.height = im.height;
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, cv.width, cv.height);
    burstCv[color] = { src: im, cv: cv };
    return cv;
  }
  function drawBurst(ctx, b) {
    var w = b.world, start = bursts[w.id], F = G.DATA.art.unlockFx;
    if (!start) return;
    var p = (Date.now() - start) / F.ms;
    if (p >= 1) { delete bursts[w.id]; return; }
    var fx = unlockFxImage(w.color), s = b.w * F.size * (0.55 + 0.45 * Math.sqrt(p)), cx = b.x + b.w / 2, cy = b.y + b.h * 0.36;
    if (!fx) return;
    ctx.save(); ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    ctx.drawImage(fx, cx - s / 2, cy - s / 2, s, s); ctx.restore();
  }
  function drawLock(ctx, cx, cy, s) {
    var im = img('ui_lock');
    if (im) { ctx.drawImage(im, cx - s / 2, cy - s / 2, s, s); return; }
    ctx.save(); ctx.lineWidth = Math.max(3, s * 0.08); ctx.strokeStyle = C.outline; ctx.fillStyle = '#C9C2B8';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.22, Math.PI, 0); ctx.stroke();
    rr(ctx, cx - s * 0.32, cy - s * 0.12, s * 0.64, s * 0.5, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.outline; ctx.beginPath(); ctx.arc(cx, cy + s * 0.08, s * 0.07, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function drawStar(ctx, x, y, r, on) {
    var im = img(on ? 'star_full' : 'star_empty');
    if (im) { ctx.drawImage(im, x - r, y - r, r * 2, r * 2); return; }
    ctx.save(); ctx.beginPath();
    for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = on ? C.star : 'rgba(43,33,24,0.12)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke(); ctx.restore();
  }
  function inkDot(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
  }
  // 월드 아이콘: 그림이 없으면 월드 색 물감 방울 (월드 6 은 다섯 색)
  function drawWorldIcon(ctx, w, cx, cy, s) {
    var im = img('world_icon_' + w.id);
    if (im) { ctx.drawImage(im, cx - s / 2, cy - s / 2, s, s); return; }
    if (w.id === 6) {
      w.inks.forEach(function (c, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / w.inks.length; inkDot(ctx, cx + Math.cos(a) * s * 0.26, cy + Math.sin(a) * s * 0.26, s * 0.13, C[c]); });
      return;
    }
    ctx.save(); ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.38);
    ctx.bezierCurveTo(cx + s * 0.3, cy - s * 0.02, cx + s * 0.3, cy + s * 0.34, cx, cy + s * 0.34);
    ctx.bezierCurveTo(cx - s * 0.3, cy + s * 0.34, cx - s * 0.3, cy - s * 0.02, cx, cy - s * 0.38);
    ctx.fillStyle = w.color; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(cx - s * 0.09, cy + s * 0.06, s * 0.05, s * 0.09, -0.4, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function paperBg(ctx, name) {
    var bg = name && img(name);
    if (bg) { ctx.drawImage(bg, 0, 0, V.w, V.h); return; }
    G.UI.drawBackground(ctx, 'bg_plain', (Date.now() - t0) * 0.02);
  }
  function backButton() {
    return { act: 'back', x: S('menuBackX'), y: S('menuBackY'), w: S('menuBackW'), h: S('menuBackH'), label: G.T('menu.back'), size: S('menuSmallSize'), icon: 'ui_back' };
  }

  // ---- 화면 셋 ----
  function drawTitle(ctx, app) {
    paperBg(ctx, 'title_bg');
    var logo = img('title_logo'), ty = S('titleY');
    if (logo) { var lw = S('titleLogoW'), lh = lw * logo.height / logo.width; ctx.drawImage(logo, V.w / 2 - lw / 2, ty - lh / 2, lw, lh); }
    else {
      ctx.save(); ctx.lineJoin = 'round'; ctx.font = 'bold ' + S('titleSize') + 'px ' + S('font'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 10; ctx.strokeStyle = '#FFFDF6'; ctx.strokeText(G.T('title.name'), V.w / 2, ty);
      ctx.fillStyle = S('textColor'); ctx.fillText(G.T('title.name'), V.w / 2, ty); ctx.restore();
      // 제목 아래 다섯 색 물감 줄
      var cols = ['black', 'blue', 'red', 'green', 'yellow'], lw2 = 90;
      cols.forEach(function (c, i) {
        ctx.save(); ctx.strokeStyle = C[c]; ctx.lineWidth = 9; ctx.lineCap = 'round';
        var x0 = V.w / 2 - (cols.length * lw2) / 2 + i * lw2 + 8, y0 = ty + S('titleSize') * 0.62 + Math.sin(i * 1.7) * 4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + lw2 / 2, y0 + (i % 2 ? 8 : -8), x0 + lw2 - 16, y0); ctx.stroke(); ctx.restore();
      });
    }
    text(ctx, G.T('title.sub'), V.w / 2, S('titleSubY'), S('titleSubSize'), null, false);
    btns = [{ act: 'start', x: V.w / 2 - S('menuBtnW') / 2, y: S('titleStartY'), w: S('menuBtnW'), h: S('menuBtnH'), label: G.T('title.start') }];
    btns.forEach(function (b) { drawButton(ctx, b); });
    text(ctx, G.T('title.help'), V.w / 2, S('titleStartY') + S('menuBtnH') + 30, S('menuSmallSize'), 'rgba(43,33,24,0.6)');
  }

  function cardRects() {
    var n = G.DATA.worlds.length, w = S('worldCardW'), h = S('worldCardH'), gap = S('worldCardGap'), x0 = (V.w - (n * w + (n - 1) * gap)) / 2;
    return G.DATA.worlds.map(function (wd, i) { return { act: 'world:' + wd.id, x: x0 + i * (w + gap), y: S('worldCardY'), w: w, h: h, world: wd }; });
  }
  function drawWorlds(ctx, app) {
    paperBg(ctx, 'bg_plain');
    text(ctx, G.T('worlds.title'), V.w / 2, S('menuTitleY'), S('menuTitleSize'), null, true);
    btns = [backButton()];
    cardRects().forEach(function (b) {
      var w = b.world, open = unlockedW(app, w.id), list = R.worldStages(app.levels, w.id), h = open && hot(b);
      ctx.save();
      var tilt = ((w.id * 37) % 7 - 3) * 0.006;
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(tilt); if (h) ctx.scale(1.05, 1.05); ctx.translate(-b.x - b.w / 2, -b.y - b.h / 2);
      var card = img('world_card');
      if (card) drawCard(ctx, card, b);
      else {
        rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.fillStyle = '#FFFDF6'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
        ctx.fillStyle = 'rgba(255,233,168,0.85)'; ctx.fillRect(b.x + b.w / 2 - 34, b.y - 10, 68, 22);   // 테이프
      }
      ctx.fillStyle = w.color; ctx.fillRect(b.x + 14, b.y + (card ? 34 : 14), b.w - 28, 8);   // 월드 색 띠 (카드 그림이면 테이프 아래)
      drawWorldIcon(ctx, w, b.x + b.w / 2, b.y + b.h * 0.36, b.w * 0.62);
      text(ctx, G.T('world.' + w.id + '.name'), b.x + b.w / 2, b.y + b.h * 0.66, S('worldNameSize'), null, true);
      text(ctx, G.T('world.' + w.id + '.desc'), b.x + b.w / 2, b.y + b.h * 0.76, S('worldDescSize'), 'rgba(43,33,24,0.7)');
      var st = R.worldStars(app.levels, app.account.records, w.id, starsOf);
      drawStar(ctx, b.x + b.w / 2 - 34, b.y + b.h * 0.89, 11, st.got > 0);
      text(ctx, G.T('worlds.stars', { got: st.got, total: st.total, n: list.length }), b.x + b.w / 2 + 10, b.y + b.h * 0.89, S('worldDescSize'), null, true);
      if (!open) {
        rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.fillStyle = 'rgba(120,112,104,0.55)'; ctx.fill();
        drawLock(ctx, b.x + b.w / 2, b.y + b.h * 0.42, b.w * 0.42);
      }
      ctx.restore();
      btns.push(b);
      // 처음 열린 월드(월드 1 제외)를 이 화면에서 처음 보면 열림 효과 한 번 (본 것은 계정 worldSeen 에 저장, ?unlock 확인 모드는 제외)
      var seen = app.account.worldSeen || (app.account.worldSeen = {});
      if (open && w.id > 1 && !app.unlockAll && !seen[w.id]) { seen[w.id] = true; bursts[w.id] = Date.now(); if (app.persist) app.persist(); }
    });
    btns.forEach(function (b) { if (b.world) drawBurst(ctx, b); });
    drawButton(ctx, btns[0]);
    var hb = btns.filter(function (b) { return b.world && hot(b); })[0];
    if (hb && !unlockedW(app, hb.world.id)) text(ctx, G.T('worlds.locked'), V.w / 2, S('worldCardY') + S('worldCardH') + 46, S('menuSmallSize'), C.outline);
  }

  function tileRects(app) {
    var list = R.worldStages(app.levels, app.menuWorld), s = S('stageTileSize'), gap = S('stageTileGap'), x0 = (V.w - (list.length * s + (list.length - 1) * gap)) / 2;
    return list.map(function (lv, i) { return { act: 'stage:' + lv.id, x: x0 + i * (s + gap), y: S('stageTileY'), w: s, h: s, lv: lv, n: i + 1, last: i === list.length - 1 && list.length > 1 }; });
  }
  function drawStages(ctx, app) {
    var w = worldOf(app.menuWorld);
    paperBg(ctx, w.bg && img(w.bg) ? w.bg : 'bg_plain');
    if (!img(w.bg) && w.tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = w.tint.paper; ctx.fillRect(0, 0, V.w, V.h); ctx.restore(); }   // 월드 배경 그림이 없으면 종이에 월드 색
    text(ctx, G.T('stages.title', { n: w.id, name: G.T('world.' + w.id + '.name') }), V.w / 2, S('menuTitleY'), S('menuTitleSize'), null, true);
    // 쓸 수 있는 물감
    var iy = S('menuTitleY') + 58, gapI = 44, ix = V.w / 2 - ((w.inks.length - 1) * gapI) / 2 + 60;
    text(ctx, G.T('stages.inks'), ix - 80, iy, S('menuSmallSize'), null, false, 'right');
    w.inks.forEach(function (c, i) { inkDot(ctx, ix + i * gapI - 40, iy, 13, C[c]); });
    btns = [backButton()];
    tileRects(app).forEach(function (b) {
      var open = unlockedS(app, b.lv), rec = app.account.records[b.lv.id], h = open && hot(b), cx = b.x + b.w / 2;
      ctx.save();
      ctx.translate(cx, b.y + b.h / 2); ctx.rotate(((b.n * 53) % 5 - 2) * 0.012); if (h) ctx.scale(1.07, 1.07); ctx.translate(-cx, -b.y - b.h / 2);
      var tile = img(b.last ? 'stage_tile_boss' : 'stage_tile') || (b.last && img('stage_tile'));
      if (tile) ctx.drawImage(tile, b.x, b.y, b.w, b.h);
      else {
        rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fillStyle = '#FFFDF6'; ctx.fill();
        ctx.lineWidth = b.last ? 6 : 4; ctx.strokeStyle = b.last ? w.color : C.outline; ctx.stroke();
        ctx.fillStyle = 'rgba(43,33,24,0.08)'; ctx.beginPath(); ctx.moveTo(b.x + b.w - 30, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h - 30); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.fill();
      }
      text(ctx, w.id + '-' + b.n, cx, b.y + b.h * 0.42, S('stageNumSize'), b.last ? w.color : null, true);
      if (b.last) text(ctx, G.T('stages.boss'), cx, b.y + b.h * 0.16, S('worldDescSize'), w.color, true);
      var total = starsOf(b.lv), got = rec ? Math.min(total, rec.stars || 0) : 0, sr = 13, ts = tile ? G.DATA.art.tileStars : { y: 0.74, dx: 0 };   // 그림 칸이면 접힌 귀퉁이를 피해서
      for (var k = 0; k < total; k++) drawStar(ctx, cx + b.w * ts.dx + (k - (total - 1) / 2) * (sr * 2.3), b.y + b.h * ts.y, sr, k < got);
      if (rec && rec.clears) text(ctx, G.T('stages.purity', { purity: Math.round((rec.bestPurity || 0) * 100) }), cx, b.y + b.h + 22, S('worldDescSize'), 'rgba(43,33,24,0.7)');
      if (!open) { rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fillStyle = 'rgba(120,112,104,0.55)'; ctx.fill(); drawLock(ctx, cx, b.y + b.h / 2, b.w * 0.5); }
      ctx.restore();
      btns.push(b);
    });
    drawButton(ctx, btns[0]);
    var hb = btns.filter(function (b) { return b.lv && hot(b); })[0];
    if (hb) text(ctx, unlockedS(app, hb.lv) ? hb.lv.name : G.T('stages.locked'), V.w / 2, S('stageTileY') + S('stageTileSize') + 70, S('menuSmallSize'), C.outline);
  }

  function render(ctx, app) {
    if (app.scene === 'title') drawTitle(ctx, app);
    else if (app.scene === 'worlds') drawWorlds(ctx, app);
    else drawStages(ctx, app);
    if (app.unlockAll) text(ctx, G.T('menu.unlockAll'), V.w - 16, V.h - 18, S('worldDescSize'), C.outline, false, 'right');
  }

  // 누른 것: 'start' · 'back' · 'world:N' · 'stage:id' (잠긴 것은 null)
  function click(app, x, y) {
    var hit = null;
    btns.forEach(function (b) { if (inside(b, x, y)) hit = b; });
    if (!hit) return null;
    if (hit.world && !unlockedW(app, hit.world.id)) return null;
    if (hit.lv && !unlockedS(app, hit.lv)) return null;
    return hit.act;
  }
  function hover(x, y) { hoverPt = { x: x, y: y }; }

  return { render: render, click: click, hover: hover, worldOf: worldOf };
})();
