// 시작 화면 → 월드 선택 → 스테이지 선택 (사용자 결정 2026-10-23, 업무가이드 11-9: 클릭하는 판, 월드 → 번호 칸 구조)
//   그림(이미지 문서 16장)이 있으면 그림으로, 없으면 코드로 그린 임시 모양. 글자는 uitext.js (UI 툴), 위치·크기도 uitext.js style
//   그린 것마다 자리(parts)를 남겨 UI 툴 미리보기에서 끌어 옮기고 휠로 크기를 바꿈 (사용자 요청 2026-10-27)
//   열림: 스테이지를 깨면 다음 스테이지, 월드 마지막을 깨면 다음 월드 (rules.js worldUnlocked / stageUnlocked)
var G = G || {};

G.Menu = (function () {
  var V = G.DATA.view, C = G.DATA.colors, R = G.Rules, hoverPt = null, btns = [], parts = [], t0 = Date.now();

  function S(k) { return G.TS(k); }
  function img(n) { return G.Assets.get(n); }
  function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  function hot(b) { return hoverPt && inside(b, hoverPt.x, hoverPt.y); }
  function worldOf(id) { return G.DATA.worlds.filter(function (w) { return w.id === id; })[0]; }
  function starsOf(lv) { return lv.props.filter(function (p) { return p.type === 'star'; }).length || G.DATA.level.starsPerStage; }
  function unlockedW(app, w) { return app.unlockAll || R.worldUnlocked(app.levels, app.account.records, w); }
  function unlockedS(app, lv) { return app.unlockAll || R.stageUnlocked(app.levels, app.account.records, lv); }

  // UI 툴이 끌 수 있는 자리: 위치 값 둘(kx, ky)과 휠로 바꿀 크기 값들(size)
  function mark(kx, ky, x, y, w, h, size) { parts.push({ keys: [kx, ky], x: x, y: y, w: w, h: h, size: size || [] }); }
  function markText(ctx, kx, ky, s, x, y, size, bold, align, sk) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + S('font');
    var ls = String(s).split('\n'), w = Math.max.apply(null, ls.map(function (l) { return ctx.measureText(l).width; })), h = size * (1 + (ls.length - 1) * 1.25);
    var x0 = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
    mark(kx, ky, x0, y - size / 2, w, h, sk);
  }
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
    var b = { act: 'back', x: S('menuBackX'), y: S('menuBackY'), w: S('menuBackW'), h: S('menuBackH'), label: G.T('menu.back'), size: S('menuBackSize'), icon: 'ui_back' };
    mark('menuBackX', 'menuBackY', b.x, b.y, b.w, b.h, ['menuBackW', 'menuBackH', 'menuBackSize']);
    return b;
  }

  // ---- 화면 셋 ----
  function drawTitle(ctx, app) {
    paperBg(ctx, 'title_bg');
    var logo = img('title_logo'), tx = S('titleX'), ty = S('titleY');
    if (logo) {
      var lw = S('titleLogoW'), lh = lw * logo.height / logo.width;
      ctx.drawImage(logo, tx - lw / 2, ty - lh / 2, lw, lh);
      mark('titleX', 'titleY', tx - lw / 2, ty - lh / 2, lw, lh, ['titleLogoW']);
    } else {
      markText(ctx, 'titleX', 'titleY', G.T('title.name'), tx, ty, S('titleSize'), true, 'center', ['titleSize']);
      ctx.save(); ctx.lineJoin = 'round'; ctx.font = 'bold ' + S('titleSize') + 'px ' + S('font'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 10; ctx.strokeStyle = '#FFFDF6'; ctx.strokeText(G.T('title.name'), tx, ty);
      ctx.fillStyle = S('textColor'); ctx.fillText(G.T('title.name'), tx, ty); ctx.restore();
      // 제목 아래 다섯 색 물감 줄
      var cols = ['black', 'blue', 'red', 'green', 'yellow'], lw2 = 90;
      cols.forEach(function (c, i) {
        ctx.save(); ctx.strokeStyle = C[c]; ctx.lineWidth = 9; ctx.lineCap = 'round';
        var x0 = tx - (cols.length * lw2) / 2 + i * lw2 + 8, y0 = ty + S('titleSize') * 0.62 + Math.sin(i * 1.7) * 4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + lw2 / 2, y0 + (i % 2 ? 8 : -8), x0 + lw2 - 16, y0); ctx.stroke(); ctx.restore();
      });
    }
    text(ctx, G.T('title.sub'), S('titleSubX'), S('titleSubY'), S('titleSubSize'), null, false);
    markText(ctx, 'titleSubX', 'titleSubY', G.T('title.sub'), S('titleSubX'), S('titleSubY'), S('titleSubSize'), false, 'center', ['titleSubSize']);
    btns = [{ act: 'start', x: S('titleStartX') - S('menuBtnW') / 2, y: S('titleStartY'), w: S('menuBtnW'), h: S('menuBtnH'), label: G.T('title.start') }];   // titleStartX = 버튼 가운데
    btns.forEach(function (b) { drawButton(ctx, b); mark('titleStartX', 'titleStartY', b.x, b.y, b.w, b.h, ['menuBtnW', 'menuBtnH', 'menuBtnSize']); });
    text(ctx, G.T('title.help'), S('titleHelpX'), S('titleHelpY'), S('titleHelpSize'), 'rgba(43,33,24,0.6)');
    markText(ctx, 'titleHelpX', 'titleHelpY', G.T('title.help'), S('titleHelpX'), S('titleHelpY'), S('titleHelpSize'), false, 'center', ['titleHelpSize']);
  }

  function cardRects() {
    var n = G.DATA.worlds.length, w = S('worldCardW'), h = S('worldCardH'), gap = S('worldCardGap'), x0 = S('worldCardsX') - (n * w + (n - 1) * gap) / 2;   // worldCardsX = 카드 줄 가운데
    return G.DATA.worlds.map(function (wd, i) { return { act: 'world:' + wd.id, x: x0 + i * (w + gap), y: S('worldCardY'), w: w, h: h, world: wd }; });
  }
  function drawWorlds(ctx, app) {
    paperBg(ctx, 'bg_plain');
    text(ctx, G.T('worlds.title'), S('worldsTitleX'), S('worldsTitleY'), S('menuTitleSize'), null, true);
    markText(ctx, 'worldsTitleX', 'worldsTitleY', G.T('worlds.title'), S('worldsTitleX'), S('worldsTitleY'), S('menuTitleSize'), true, 'center', ['menuTitleSize']);
    btns = [backButton()];
    cardRects().forEach(function (b) {
      var cx = b.x + b.w / 2;
      mark('worldCardsX', 'worldCardY', b.x, b.y, b.w, b.h, ['worldCardW', 'worldCardH']);
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
      // 카드 안의 것: 카드 가운데·위에서 떨어진 거리(px). 여섯 카드가 같은 값을 씀
      var is = S('worldIconSize'), ix = cx + S('worldIconDX'), iy = b.y + S('worldIconY');
      drawWorldIcon(ctx, w, ix, iy, is);
      mark('worldIconDX', 'worldIconY', ix - is / 2, iy - is / 2, is, is, ['worldIconSize']);
      var nm = G.T('world.' + w.id + '.name'), ds = G.T('world.' + w.id + '.desc');
      text(ctx, nm, cx + S('worldNameDX'), b.y + S('worldNameY'), S('worldNameSize'), null, true);
      markText(ctx, 'worldNameDX', 'worldNameY', nm, cx + S('worldNameDX'), b.y + S('worldNameY'), S('worldNameSize'), true, 'center', ['worldNameSize']);
      text(ctx, ds, cx + S('worldDescDX'), b.y + S('worldDescY'), S('worldDescSize'), 'rgba(43,33,24,0.7)');
      markText(ctx, 'worldDescDX', 'worldDescY', ds, cx + S('worldDescDX'), b.y + S('worldDescY'), S('worldDescSize'), false, 'center', ['worldDescSize']);
      var st = R.worldStars(app.levels, app.account.records, w.id, starsOf), sx = cx + S('worldStarsDX'), sy = b.y + S('worldStarsY'), sr = S('worldStarSize') / 2;
      var stx = G.T('worlds.stars', { got: st.got, total: st.total, n: list.length }), sts = S('worldStarsSize');
      drawStar(ctx, sx - 34, sy, sr, st.got > 0);
      text(ctx, stx, sx + 10, sy, sts, null, true);
      ctx.font = 'bold ' + sts + 'px ' + S('font');
      var stw = ctx.measureText(stx).width, sh = Math.max(sr * 2, sts);
      mark('worldStarsDX', 'worldStarsY', sx - 34 - sr, sy - sh / 2, 44 + sr + stw / 2, sh, ['worldStarSize', 'worldStarsSize']);
      if (!open) {
        rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.fillStyle = 'rgba(120,112,104,0.55)'; ctx.fill();
        var ls = S('worldLockSize'), lx = cx + S('worldLockDX'), ly = b.y + S('worldLockY');
        drawLock(ctx, lx, ly, ls);
        mark('worldLockDX', 'worldLockY', lx - ls / 2, ly - ls / 2, ls, ls, ['worldLockSize']);
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
    if ((hb && !unlockedW(app, hb.world.id)) || app.showHints) {   // showHints: UI 툴 미리보기에서 늘 보이게
      text(ctx, G.T('worlds.locked'), S('worldsHintX'), S('worldsHintY'), S('menuSmallSize'), C.outline);
      markText(ctx, 'worldsHintX', 'worldsHintY', G.T('worlds.locked'), S('worldsHintX'), S('worldsHintY'), S('menuSmallSize'), false, 'center', ['menuSmallSize']);
    }
  }

  function tileRects(app) {
    var list = R.worldStages(app.levels, app.menuWorld), s = S('stageTileSize'), gap = S('stageTileGap'), x0 = S('stageTilesX') - (list.length * s + (list.length - 1) * gap) / 2;   // stageTilesX = 칸 줄 가운데
    return list.map(function (lv, i) { return { act: 'stage:' + lv.id, x: x0 + i * (s + gap), y: S('stageTileY'), w: s, h: s, lv: lv, n: i + 1, last: i === list.length - 1 && list.length > 1 }; });
  }
  function drawStages(ctx, app) {
    var w = worldOf(app.menuWorld);
    paperBg(ctx, w.bg && img(w.bg) ? w.bg : 'bg_plain');
    if (!img(w.bg) && w.tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = w.tint.paper; ctx.fillRect(0, 0, V.w, V.h); ctx.restore(); }   // 월드 배경 그림이 없으면 종이에 월드 색
    var tt = G.T('stages.title', { n: w.id, name: G.T('world.' + w.id + '.name') });
    text(ctx, tt, S('stagesTitleX'), S('stagesTitleY'), S('menuTitleSize'), null, true);
    markText(ctx, 'stagesTitleX', 'stagesTitleY', tt, S('stagesTitleX'), S('stagesTitleY'), S('menuTitleSize'), true, 'center', ['menuTitleSize']);
    // 쓸 수 있는 물감: stagesInksX = 물감 방울 줄 가운데, 글자는 첫 방울 왼쪽
    var iy = S('stagesInksY'), gapI = S('stagesInkGap'), ir = S('stagesInkSize') / 2, ix = S('stagesInksX') - ((w.inks.length - 1) * gapI) / 2, ts = S('menuSmallSize');
    text(ctx, G.T('stages.inks'), ix - ir - 27, iy, ts, null, false, 'right');
    w.inks.forEach(function (c, i) { inkDot(ctx, ix + i * gapI, iy, ir, C[c]); });
    ctx.font = ts + 'px ' + S('font');
    var lx = ix - ir - 27 - ctx.measureText(G.T('stages.inks')).width, ih = Math.max(ir * 2, ts);
    mark('stagesInksX', 'stagesInksY', lx, iy - ih / 2, ix + (w.inks.length - 1) * gapI + ir - lx, ih, ['stagesInkSize', 'stagesInkGap']);
    btns = [backButton()];
    tileRects(app).forEach(function (b) {
      var open = unlockedS(app, b.lv), rec = app.account.records[b.lv.id], h = open && hot(b), cx = b.x + b.w / 2;
      mark('stageTilesX', 'stageTileY', b.x, b.y, b.w, b.h, ['stageTileSize']);
      ctx.save();
      ctx.translate(cx, b.y + b.h / 2); ctx.rotate(((b.n * 53) % 5 - 2) * 0.012); if (h) ctx.scale(1.07, 1.07); ctx.translate(-cx, -b.y - b.h / 2);
      var tile = img(b.last ? 'stage_tile_boss' : 'stage_tile') || (b.last && img('stage_tile'));
      if (tile) ctx.drawImage(tile, b.x, b.y, b.w, b.h);
      else {
        rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fillStyle = '#FFFDF6'; ctx.fill();
        ctx.lineWidth = b.last ? 6 : 4; ctx.strokeStyle = b.last ? w.color : C.outline; ctx.stroke();
        ctx.fillStyle = 'rgba(43,33,24,0.08)'; ctx.beginPath(); ctx.moveTo(b.x + b.w - 30, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h - 30); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.fill();
      }
      // 칸 안의 것: 칸 가운데·위에서 떨어진 거리(px). 모든 칸이 같은 값을 씀
      var num = w.id + '-' + b.n;
      text(ctx, num, cx + S('stageNumDX'), b.y + S('stageNumY'), S('stageNumSize'), b.last ? w.color : null, true);
      markText(ctx, 'stageNumDX', 'stageNumY', num, cx + S('stageNumDX'), b.y + S('stageNumY'), S('stageNumSize'), true, 'center', ['stageNumSize']);
      if (b.last) {
        text(ctx, G.T('stages.boss'), cx + S('stageBossDX'), b.y + S('stageBossY'), S('stageBossSize'), w.color, true);
        markText(ctx, 'stageBossDX', 'stageBossY', G.T('stages.boss'), cx + S('stageBossDX'), b.y + S('stageBossY'), S('stageBossSize'), true, 'center', ['stageBossSize']);
      }
      // 별 줄 (그림 칸의 오른쪽 아래 접힌 귀퉁이를 피해서 조금 왼쪽 위)
      var total = starsOf(b.lv), got = rec ? Math.min(total, rec.stars || 0) : 0, sr = S('stageStarSize') / 2, sg = S('stageStarGap'), scx = cx + S('stageStarsDX'), scy = b.y + S('stageStarsY');
      for (var k = 0; k < total; k++) drawStar(ctx, scx + (k - (total - 1) / 2) * sg, scy, sr, k < got);
      mark('stageStarsDX', 'stageStarsY', scx - (total - 1) / 2 * sg - sr, scy - sr, (total - 1) * sg + sr * 2, sr * 2, ['stageStarSize', 'stageStarGap']);
      if (rec && rec.clears) {
        var pt = G.T('stages.purity', { purity: Math.round((rec.bestPurity || 0) * 100) });
        text(ctx, pt, cx + S('stagePurityDX'), b.y + S('stagePurityY'), S('stagePuritySize'), 'rgba(43,33,24,0.7)');
        markText(ctx, 'stagePurityDX', 'stagePurityY', pt, cx + S('stagePurityDX'), b.y + S('stagePurityY'), S('stagePuritySize'), false, 'center', ['stagePuritySize']);
      }
      if (!open) {
        rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fillStyle = 'rgba(120,112,104,0.55)'; ctx.fill();
        var ks = S('stageLockSize'), kx = cx + S('stageLockDX'), ky = b.y + S('stageLockY');
        drawLock(ctx, kx, ky, ks);
        mark('stageLockDX', 'stageLockY', kx - ks / 2, ky - ks / 2, ks, ks, ['stageLockSize']);
      }
      ctx.restore();
      btns.push(b);
    });
    drawButton(ctx, btns[0]);
    var hb = btns.filter(function (b) { return b.lv && hot(b); })[0];
    var hint = hb ? (unlockedS(app, hb.lv) ? hb.lv.name : G.T('stages.locked')) : app.showHints ? G.T('stages.locked') : null;   // 마우스를 올린 칸의 이름 또는 잠김 안내
    if (hint) {
      text(ctx, hint, S('stagesHintX'), S('stagesHintY'), S('menuSmallSize'), C.outline);
      markText(ctx, 'stagesHintX', 'stagesHintY', hint, S('stagesHintX'), S('stagesHintY'), S('menuSmallSize'), false, 'center', ['menuSmallSize']);
    }
  }

  function render(ctx, app) {
    parts = [];
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

  // UI 툴: 마지막으로 그린 화면의 끌 수 있는 자리 (나중에 그린 것이 뒤)
  function layout() { return parts; }

  return { render: render, click: click, hover: hover, worldOf: worldOf, layout: layout };
})();
