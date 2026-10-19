// 화면 그리기 (캔버스). 이미지가 없으면 색 블록으로 그린다. 땅·프랍은 props.js 를 레벨 툴과 함께 쓴다.
var G = G || {};

G.UI = (function () {
  var C = G.DATA.colors, V = G.DATA.view;
  var cam = { x: 0, y: 0, frac: V.playerScreenX };
  var specks = null;

  function makeSpecks() {
    var rnd = G.makeRng(G.DATA.seed), out = [];
    for (var i = 0; i < 160; i++) out.push({ x: rnd() * 4000, y: rnd() * 720, r: 1 + rnd() * 2 });
    return out;
  }

  function updateCamera(game) {
    var p = game.player.body.position;
    var tf = game.player.dir > 0 ? V.playerScreenX : V.playerScreenXBack;
    if (G.Game.scale(game) > 0) cam.frac += (tf - cam.frac) * 0.04;   // 뒤로 돌면 천천히 가는 쪽을 넓게
    cam.x = p.x - V.w * cam.frac;
    var ty = Math.min(0, p.y - 320);              // 높이 올라가면 따라 올라감
    if (p.y > 700) ty = cam.y;                    // 떨어질 때는 따라가지 않음
    cam.y += (ty - cam.y) * 0.1;
  }

  function toWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

  function poly(ctx, verts) {
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (var i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
  }

  function path(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  // 화면 크기 w×h 에 배경 그리기. name: 구간의 bg (levels.js), camX: 카메라 x (레벨 툴도 사용)
  function drawBackground(ctx, name, camX, w, h) {
    w = w || V.w; h = h || V.h;
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);
    var bg = name && name !== 'none' && G.Assets.get(name);
    if (bg) {                                     // 화면 높이에 맞춰 가로로 이어 붙인다
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

  // 시작 구멍: 스케치북을 뚫고 나온 구멍 (사용자 결정 2026-10-19). 캐릭터 뒤에 그림. 이미지 없으면 코드로 찢긴 구멍
  function drawStart(ctx, sx, gy) {
    if (gy == null) return;
    var A = G.DATA.art.startHole, s = A.size, cx = sx, cy = gy - A.up;
    var img = G.Assets.get('start_hole');
    if (img) { ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s); return; }
    var rnd = G.makeRng(7), n = 18, i, a, rr;
    ctx.save();
    ctx.beginPath();                               // 찢긴 종이 가장자리 (흰 종이 뒷면)
    for (i = 0; i <= n; i++) {
      a = i / n * 6.283; rr = s * (0.42 + rnd() * 0.08);
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
    }
    ctx.closePath(); ctx.fillStyle = '#FFFDF6'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.beginPath();                               // 안쪽 어두운 구멍
    for (i = 0; i <= n; i++) {
      a = i / n * 6.283; rr = s * (0.30 + rnd() * 0.06);
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
    }
    ctx.closePath(); ctx.fillStyle = '#1E1A22'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;   // 소용돌이 몇 줄
    for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, s * 0.07 * i, i, i + 3.6); ctx.stroke(); }
    ctx.restore();
  }

  // 도착 물감 통 (사용자 결정 2026-10-19): 비어 있다가 도착하면 차오름. fill 0~1. 왼쪽 끝 ≈ 도착 x, 바닥 = 땅 윗면
  //   goal_jar_empty / goal_jar_full 이미지가 있으면 빈 통 위에 찬 통을 아래부터 fill 만큼 잘라 겹침
  function drawGoal(ctx, gx, gy, fill) {
    if (gy == null) return;
    var J = G.DATA.art.goalJar, x = gx - 10, y = gy - J.h, w = J.w, h = J.h;
    fill = Math.max(0, Math.min(1, fill || 0));
    var empty = G.Assets.get('goal_jar_empty'), full = G.Assets.get('goal_jar_full');
    if (empty) {
      ctx.drawImage(empty, x, y, w, h);
      if (full && fill > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * (1 - fill), w, h * fill); ctx.clip();
        ctx.drawImage(full, x, y, w, h); ctx.restore();
      }
      return;
    }
    var bx = x + w * 0.1, bw = w * 0.8, by = y + h * 0.18, bh = h * 0.82;   // 통 몸체
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 22); else ctx.rect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    if (fill > 0) {                                // 물감: 세 색이 층층이 차오름
      ctx.save(); ctx.clip();
      var top = by + bh * (1 - fill * 0.92), band = (by + bh - top) / 3;
      [C.green, C.blue, C.red].forEach(function (c, i) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(bx, top + band * i + 6);
        ctx.quadraticCurveTo(bx + bw / 2, top + band * i - 8, bx + bw, top + band * i + 6);
        ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
    }
    ctx.beginPath();                               // 물감 칠하며 바뀐 경로 대신 통 몸체 외곽선을 다시
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 22); else ctx.rect(bx, by, bw, bh);
    ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.fillStyle = '#C9A26B';                       // 넓은 입구 테두리
    ctx.fillRect(x + w * 0.04, y + h * 0.1, w * 0.92, h * 0.1); ctx.strokeRect(x + w * 0.04, y + h * 0.1, w * 0.92, h * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + 12, by + 18, 8, bh * 0.5);   // 유리 반사
    ctx.restore();
  }

  // 도착한 뒤 지난 시간 → 물감 통 채움 정도 (1 넘으면 다 참)
  function goalFill(game) {
    if (game.status !== 'clear' || !game.finishedAt) return 0;
    return (Date.now() - game.finishedAt) / G.DATA.art.goalJar.fillMs;
  }

  function drawWorld(ctx, game, debug) {
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    var lv = game.level.data;
    // 장식·글자 (뒤) → 땅 → 잉크 웅덩이 → 단단한 프랍 → 깃발 → 별·잉크 병
    lv.props.forEach(function (p) { if (p.type === 'deco' || p.type === 'text') G.Props.draw(ctx, p); });
    lv.ground.forEach(function (g) { G.Props.drawGround(ctx, g); });
    lv.props.forEach(function (p) { if (p.type === 'drain') G.Props.draw(ctx, p); });
    lv.props.forEach(function (p) { var d = G.Props.def(p.type); if (d && d.solid) G.Props.draw(ctx, p); });
    drawStart(ctx, lv.start.x, G.Level.groundTopAt(lv, lv.start.x));
    drawGoal(ctx, lv.goal.x, G.Level.groundTopAt(lv, lv.goal.x), goalFill(game));
    game.level.stars.forEach(function (s) {
      if (!s.got) { G.Props.draw(ctx, s.prop); return; }
      var t = (game.timeMs - s.gotMs) / 300;      // 먹으면 0.3초 동안 커지며 사라짐
      if (t >= 1) return;
      ctx.save(); ctx.globalAlpha = 1 - t;
      ctx.translate(s.prop.x, s.prop.y - t * 30); ctx.scale(1 + t * 0.6, 1 + t * 0.6); ctx.translate(-s.prop.x, -s.prop.y);
      G.Props.draw(ctx, s.prop); ctx.restore();
    });
    game.level.bottles.forEach(function (b) {
      if (b.owned) {                              // 계정에 이미 있는 병: 흐린 자국만 (다시 먹을 수 없음)
        ctx.save(); ctx.globalAlpha = 0.2; G.Props.draw(ctx, b.prop); ctx.restore();
        return;
      }
      if (!b.got) { G.Props.draw(ctx, b.prop); return; }
      var t = (game.timeMs - b.gotMs) / 300;
      if (t >= 1) return;
      ctx.save(); ctx.globalAlpha = 1 - t;
      ctx.translate(b.prop.x, b.prop.y - t * 30); ctx.scale(1 + t * 0.6, 1 + t * 0.6); ctx.translate(-b.prop.x, -b.prop.y);
      G.Props.draw(ctx, b.prop); ctx.restore();
    });

    // 선 (재생 전 선은 흐리게 점선)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var ink = G.DATA.ink;
    game.lines.forEach(function (ln) {
      ctx.globalAlpha = ln.active ? G.Rules.lineAlpha(ln.ageMs, ink.lifeMs, ink.fadeMs) : 0.5;
      drawInkLine(ctx, ln.pts, ln.color, !ln.active);
    });
    ctx.globalAlpha = 1;
    if (game.stroke && game.stroke.pts.length > 1) {
      ctx.globalAlpha = 0.6; drawInkLine(ctx, game.stroke.pts, game.stroke.color, true); ctx.globalAlpha = 1;
    }
    drawProjectiles(ctx, game);

    drawPlayer(ctx, game.player);
    drawFx(ctx, game);

    if (debug.showBoxes) {
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#ff00cc';
      G.Physics.allBodies(game.engine).forEach(function (b) { poly(ctx, b.vertices); ctx.stroke(); });
    }
    ctx.restore();
  }

  // 색 잉크 선: 색 + 색각 보조 무늬 (빨강=작은 동그라미, 파랑=진행 방향 화살, 초록=가로지르는 눈금). pending 이면 점선
  function drawInkLine(ctx, pts, color, pending) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = G.DATA.ink.thickness; ctx.strokeStyle = C[color] || C.ink;
    ctx.setLineDash(pending ? [14, 10] : []);
    path(ctx, pts); ctx.stroke();
    ctx.setLineDash([]);
    if (pending) return;
    var gap = color === 'green' ? 14 : 22, acc = gap / 2;
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
        else { ctx.moveTo(x - uy * 3, y + ux * 3); ctx.lineTo(x + uy * 3, y - ux * 3); ctx.stroke(); }
        acc += gap;
      }
      acc -= len;
    }
  }

  // 투사체: proj 이미지, 없으면 보라색 가시 공
  function drawProjectiles(ctx, game) {
    var r = G.DATA.projectile.radius, img = G.Assets.get('proj');
    game.projs.forEach(function (q) {
      if (img) { ctx.drawImage(img, q.x - r * 1.6, q.y - r * 1.6, r * 3.2, r * 3.2); return; }
      ctx.beginPath();
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * 6.283, rr = i % 2 ? r * 0.75 : r * 1.15;
        ctx[i ? 'lineTo' : 'moveTo'](q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fillStyle = '#5A2D6E'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = C.outline; ctx.stroke();
    });
  }

  // 튕김(fx_bounce)·가속(fx_boost)·막기(fx_block) 효과. 이미지 없으면 코드로 짧은 선 몇 개
  function drawInkFx(ctx, game, f) {
    var t = (game.timeMs - f.t) / G.DATA.art.fx.inkMs;
    if (t < 0 || t >= 1) return;
    var img = G.Assets.get('fx_' + f.type), i;
    ctx.save(); ctx.globalAlpha = 1 - t * t;
    if (img) {
      var w = f.type === 'block' ? 90 : 110, h = f.type === 'block' ? 90 : 55;
      ctx.translate(f.x, f.y); if (f.dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h * (f.type === 'block' ? 0.5 : 0.9), w, h);
      ctx.restore(); return;
    }
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    var k = 14 + t * 22;
    if (f.type === 'bounce') {
      ctx.strokeStyle = C.red;
      for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(f.x + i * 12, f.y - 4); ctx.lineTo(f.x + i * 22, f.y - 4 - k); ctx.stroke(); }
    } else if (f.type === 'boost') {
      ctx.strokeStyle = C.blue;
      for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(f.x - f.dir * (20 + k), f.y - 10 - i * 12); ctx.lineTo(f.x - f.dir * 20, f.y - 10 - i * 12); ctx.stroke(); }
    } else {
      ctx.strokeStyle = C.green;
      for (i = 0; i < 6; i++) { var a = i / 6 * 6.283; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6); ctx.lineTo(f.x + Math.cos(a) * k, f.y + Math.sin(a) * k); ctx.stroke(); }
    }
    ctx.restore();
  }

  // 짧은 효과: 별 반짝(fx_star_pop, 커지며 사라짐), 착지 먼지(fx_land, 옆으로 퍼지며 사라짐). 이미지 없으면 생략
  function drawFx(ctx, game) {
    var F = G.DATA.art.fx;
    game.fx.forEach(function (f) {
      if (f.type === 'bounce' || f.type === 'boost' || f.type === 'block') { drawInkFx(ctx, game, f); return; }
      var star = f.type === 'star', img = G.Assets.get(star ? 'fx_star_pop' : 'fx_land');
      var t = (game.timeMs - f.t) / (star ? F.starPopMs : F.landMs);
      if (!img || t < 0 || t >= 1) return;
      ctx.save();
      ctx.globalAlpha = 1 - t * t;
      if (star) { var s = 70 + t * 70; ctx.drawImage(img, f.x - s / 2, f.y - s / 2, s, s); }
      else { var w = 70 + t * 50, h = w / 2; ctx.drawImage(img, f.x - w / 2, f.y - h * 0.75, w, h); }
      ctx.restore();
    });
  }

  // 상태별 캐릭터 그림: 공중에서 올라가면 char_jump, 떨어지면 char_fall, 달리면 char_run, 아니면 char_idle
  function playerImage(pl) {
    var v = pl.body.velocity, A = G.DATA.art, get = G.Assets.get.bind(G.Assets);
    if (!pl.grounded && v.y < -A.airVy) return get('char_jump') || get('char_idle');
    if (!pl.grounded && v.y > A.airVy) return get('char_fall') || get('char_idle');
    return (Math.abs(v.x) > 1 && get('char_run')) || get('char_idle');
  }

  function drawPlayer(ctx, pl) {
    var b = pl.body, r = G.DATA.player.radius, v = b.velocity;
    var stretch = Math.max(-0.25, Math.min(0.25, -v.y * 0.03));   // 위로 갈 때 늘어남, 떨어질 때 눌림
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.scale((1 - stretch * 0.6) * pl.dir, 1 + stretch);     // dir -1 이면 좌우 반전 (눈이 가는 쪽)
    var img = playerImage(pl);
    if (img) {                                    // 이미지 바닥을 몸 바닥에 맞춘다
      var s = r * G.DATA.art.charSize;
      ctx.drawImage(img, -s / 2, r - s, s, s);
      ctx.restore();
      return;
    }
    ctx.beginPath();                                            // 물방울: 원 + 위쪽 뾰족
    ctx.moveTo(0, -r * 1.45);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.6, r, 0);
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.6, 0, -r * 1.45);
    ctx.fillStyle = C.player; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.fillStyle = C.outline;
    ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.2, 3.5, 0, 6.283); ctx.arc(r * 0.6, -r * 0.2, 3.5, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function drawHUD(ctx, game) {
    var D = G.DATA;
    ctx.fillStyle = 'rgba(243,233,210,0.92)';
    ctx.fillRect(0, 0, V.w, 56);
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(V.w, 56); ctx.stroke();

    ctx.fillStyle = C.outline; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('잉크', 20, 35);
    var gx = 70, gw = 320, ratio = Math.max(0, game.ink / game.inkMax);
    var frame = G.Assets.get('ui_gauge_frame');
    if (frame) {                                  // 유리관 이미지 (안쪽 투명) → 채움을 먼저, 틀을 위에
      ctx.fillStyle = ratio > 0 ? 'rgba(43,33,24,0.85)' : '#999';
      ctx.fillRect(gx + 4, 15, (gw - 8) * ratio, 26);
      ctx.drawImage(frame, gx - 6, 7, gw + 12, 44);
    } else {
      ctx.strokeRect(gx, 18, gw, 22);
      ctx.fillStyle = ratio > 0 ? C.ink : '#999';
      ctx.fillRect(gx + 2, 20, (gw - 4) * ratio, 18);
    }
    ctx.fillStyle = game.draining ? C.red : C.outline; ctx.font = '15px sans-serif';   // 웅덩이에서 줄어드는 중이면 빨강
    ctx.fillText(Math.round(game.ink) + ' / ' + game.inkMax, gx + gw + 10, 35);

    // 정지 횟수 아이콘
    ctx.fillStyle = C.outline; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('정지', 520, 35);
    var stopImg = G.Assets.get('ui_stop_on');
    for (var i = 0; i < game.stops.max; i++) {
      var on = i < game.stops.left, cx = 580 + i * 36;
      if (stopImg) {                              // 쓴 정지는 흐리게
        ctx.globalAlpha = on ? 1 : 0.22;
        ctx.drawImage(stopImg, cx - 17, 11, 34, 34);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.beginPath(); ctx.arc(cx, 29, 13, 0, 6.283);
      ctx.fillStyle = on ? C.star : 'rgba(43,33,24,0.12)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = on ? C.outline : 'rgba(43,33,24,0.35)'; ctx.stroke();
      ctx.fillStyle = on ? C.outline : 'rgba(43,33,24,0.35)';
      ctx.fillRect(cx - 5, 22, 3.5, 14); ctx.fillRect(cx + 1.5, 22, 3.5, 14);
    }
    if (game.stops.left === 0) {
      ctx.fillStyle = C.red; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('남은 정지 없음', 580 + game.stops.max * 36, 35);
    }

    // 별
    var total = game.level.stars.length;
    for (var k = 0; k < total; k++) {
      ctx.save(); ctx.globalAlpha = game.level.stars[k].got ? 1 : 0.25;
      G.Props.draw(ctx, { type: 'star', x: 790 + k * 30, y: 28, size: 28 });
      ctx.restore();
    }

    ctx.fillStyle = C.outline; ctx.font = '15px sans-serif';
    ctx.textAlign = 'right';
    var lv = game.level.data;
    var prog = Math.max(0, Math.min(1, (game.player.body.position.x - lv.start.x) / (lv.goal.x - lv.start.x)));
    var sec = (game.timeMs / 1000).toFixed(1);
    ctx.fillText(lv.name + '  ·  ' + game.mode.name.slice(0, 1) + '  ·  ' + game.attempt + '번째  ·  ' + sec + '/' + lv.rate.timeSec + '초  ·  ' + Math.round(prog * 100) + '%', V.w - 20, 35);
    ctx.textAlign = 'left';
  }

  // 아래 잉크 병 선반 (사용자 결정 2026-10-19: 병 클릭 / 휠 / 1·2·3 으로 색 고르기). 이 구간에서 못 쓰는 색은 흐리게 "잠김"
  function shelfSlots() {
    var S = G.DATA.art.shelf;
    return G.DATA.inks.order.map(function (c, i) {
      return { color: c, key: i + 1, x: S.x + i * S.slot, y: V.h - S.h, w: S.slot - 8, h: S.h };
    });
  }
  // 화면 좌표(sx, sy)가 병 위면 그 색, 아니면 null
  function inkAt(sx, sy) {
    var hit = null;
    shelfSlots().forEach(function (b) { if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) hit = b.color; });
    return hit;
  }

  function drawShelf(ctx, game) {
    var S = G.DATA.art.shelf, slots = shelfSlots(), allowed = game.level.data.inks;
    var shelfW = S.x * 2 + slots.length * S.slot - 8, shelfImg = G.Assets.get('ui_shelf');
    if (shelfImg) ctx.drawImage(shelfImg, 0, V.h - 30, shelfW + 10, 30);
    else {
      ctx.fillStyle = '#B07A45'; ctx.fillRect(4, V.h - 16, shelfW, 12);
      ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5; ctx.strokeRect(4, V.h - 16, shelfW, 12);
    }
    var sel = G.Assets.get('ink_select');
    slots.forEach(function (b) {
      var on = allowed.indexOf(b.color) >= 0, picked = game.color === b.color;
      var img = G.Assets.get('ink_' + b.color), bw = S.bottle * 0.75, bh = S.bottle;
      var cx = b.x + b.w / 2, by = V.h - 16 - bh;
      if (picked) {                                // 고른 병: 뾰족한 외곽선 (색각 보조: 색이 아니라 모양으로도 구분)
        if (sel) ctx.drawImage(sel, cx - bw * 0.75, by - 10, bw * 1.5, bh + 20);
        else {
          ctx.beginPath();
          for (var i = 0; i < 20; i++) {
            var a = i / 20 * 6.283, rr = i % 2 ? 0.86 : 1;
            ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * bw * 0.85 * rr, by + bh / 2 + Math.sin(a) * bh * 0.62 * rr);
          }
          ctx.closePath(); ctx.fillStyle = 'rgba(245,197,24,0.35)'; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
        }
      }
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.25;
      if (img) ctx.drawImage(img, cx - bw / 2, by, bw, bh);
      else {
        ctx.fillStyle = C[b.color]; ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - bw / 2, by + bh * 0.25, bw, bh * 0.75, 8); else ctx.rect(cx - bw / 2, by + bh * 0.25, bw, bh * 0.75);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#C9A26B'; ctx.fillRect(cx - bw * 0.2, by + bh * 0.08, bw * 0.4, bh * 0.17); ctx.strokeRect(cx - bw * 0.2, by + bh * 0.08, bw * 0.4, bh * 0.17);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;   // 병 라벨 무늬 (선 무늬와 같음)
        var ly = by + bh * 0.62;
        ctx.beginPath();
        if (b.color === 'red') { ctx.arc(cx - 7, ly, 3, 0, 6.283); ctx.arc(cx + 7, ly, 3, 0, 6.283); ctx.fill(); }
        else if (b.color === 'blue') { ctx.moveTo(cx - 8, ly - 7); ctx.lineTo(cx + 4, ly); ctx.lineTo(cx - 8, ly + 7); ctx.stroke(); }
        else { for (var j = -1; j <= 1; j++) { ctx.moveTo(cx + j * 7, ly - 7); ctx.lineTo(cx + j * 7, ly + 7); } ctx.stroke(); }
      }
      ctx.restore();
      ctx.fillStyle = on ? C.outline : 'rgba(43,33,24,0.35)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(on ? String(b.key) : '잠김', cx, by - 4);
      ctx.textAlign = 'left';
    });
    var cur = G.DATA.inks[game.color];
    ctx.fillStyle = C.outline; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(cur ? cur.name : '', shelfW + 14, V.h - 40);
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillText('병 클릭 · 휠 · 1/2/3', shelfW + 14, V.h - 20);
  }

  function drawStopOverlay(ctx, game) {
    if (!game.stopped) return;
    ctx.fillStyle = C.stopTint;
    ctx.fillRect(0, 56, V.w, V.h - 56);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 6;
    ctx.strokeRect(3, 59, V.w - 6, V.h - 62);
    ctx.fillStyle = C.blue; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    var label = game.mode.scale > 0 ? '슬로 모션' : '정지';
    ctx.fillText(label + ' 중 — 드래그로 선 그리기 · Shift/우클릭으로 재생', V.w / 2, 92);
    if (game.mode.limitMs > 0) {
      var left = Math.max(0, 1 - game.stoppedMs / game.mode.limitMs), bw = 400;
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
      ctx.strokeRect(V.w / 2 - bw / 2, 104, bw, 12);
      ctx.fillRect(V.w / 2 - bw / 2, 104, bw * left, 12);
      ctx.fillText(((game.mode.limitMs - game.stoppedMs) / 1000).toFixed(1) + '초', V.w / 2 + bw / 2 + 40, 116);
    }
    ctx.textAlign = 'left';
  }

  function drawMessages(ctx, game) {
    ctx.textAlign = 'center'; ctx.font = 'bold 22px sans-serif';
    game.messages.forEach(function (m, i) {
      ctx.globalAlpha = Math.min(1, m.ms / 400);
      ctx.fillStyle = C.red;
      ctx.fillText(m.text, V.w / 2, 160 + i * 30);
    });
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  function drawResult(ctx, game) {
    if (game.status === 'run') return;
    if (game.status === 'ready') {
      ctx.textAlign = 'center'; ctx.fillStyle = C.outline; ctx.font = 'bold 28px sans-serif';
      ctx.fillText('클릭 또는 Space: 출발', V.w / 2, 250);
      ctx.font = '17px sans-serif';
      ctx.fillText('R: 처음부터 · 병 클릭·휠·1/2/3: 색 고르기 · D: 디버그', V.w / 2, 285);
      ctx.textAlign = 'left';
      return;
    }
    if (game.status === 'clear' && goalFill(game) < 1.15) return;   // 물감 통이 다 차오른 뒤 결과 쪽지
    ctx.fillStyle = 'rgba(43,33,24,0.35)';
    ctx.fillRect(0, 0, V.w, V.h);
    var clear = game.status === 'clear' && game.result;
    var w = 520, h = clear ? 330 : 250, x = (V.w - w) / 2, y = (V.h - h) / 2;
    var panel = G.Assets.get('ui_panel');
    if (panel) {                                  // 종이 쪽지 (안쪽이 투명 → 종이색을 먼저 깐다)
      var px = x - 40, py = y - 30, pw = w + 80, ph = h + 60;
      var sx = pw / panel.width, sy = ph / panel.height, hull = G.DATA.art.panelHull;
      if (hull) {                                 // 안쪽이 투명한 쪽지 이미지일 때만
        ctx.beginPath();
        hull.forEach(function (p, i) { ctx[i ? 'lineTo' : 'moveTo'](px + p[0] * sx, py + p[1] * sy); });
        ctx.closePath(); ctx.fillStyle = C.paper; ctx.fill();
      }
      ctx.drawImage(panel, px, py, pw, ph);
    } else {
      ctx.fillStyle = C.paper; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = C.outline; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
    }
    var erased = game.status === 'fail' && G.Assets.get('char_erased');
    if (erased) ctx.drawImage(erased, x + 66, y + 22, 80, 80);
    ctx.textAlign = 'center'; ctx.fillStyle = game.status === 'clear' ? C.green : C.red;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(game.status === 'clear' ? '도착!' : game.failReason, V.w / 2, y + 70);
    ctx.fillStyle = C.outline;
    if (clear) {                                  // 평가: 만족한 조건 수만큼 별 (사용자 결정 2026-10-19)
      for (var k = 0; k < 3; k++) {                // 얻은 별은 채운 별, 못 얻은 별은 빈 별 (조건 0개면 빈 별 3개 = 0개 획득)
        var sx0 = V.w / 2 + (k - 1) * 56, sy0 = y + 112;
        if (k < game.result.stars) G.Props.draw(ctx, { type: 'star', x: sx0, y: sy0, size: 50 });
        else {
          G.Props.drawStarShape(ctx, sx0, sy0, 25);
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(43,33,24,0.35)'; ctx.stroke();
        }
      }
      ctx.font = '18px sans-serif'; ctx.fillStyle = C.outline;
      game.result.checks.forEach(function (c, i) {
        ctx.fillStyle = c.ok ? C.green : 'rgba(43,33,24,0.45)';
        ctx.fillText((c.ok ? '✓ ' : '✗ ') + c.label, V.w / 2, y + 162 + i * 26);
      });
      ctx.fillStyle = C.outline; ctx.font = '15px sans-serif';
      var best = game.best ? ' · 최고 기록 별 ' + game.best.stars + '개 · ' + (game.best.bestMs / 1000).toFixed(1) + '초' : '';
      ctx.fillText((game.timeMs / 1000).toFixed(1) + '초' + best, V.w / 2, y + 252);
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillText('수집 별 ' + G.Game.starsGot(game) + ' / ' + game.level.stars.length + ' · ' + game.attempt + '번째 시도', V.w / 2, y + 125);
      ctx.fillText((game.timeMs / 1000).toFixed(1) + '초 · ' + game.mode.name, V.w / 2, y + 158);
    }
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = C.outline;
    ctx.fillText('R 또는 클릭: 다시 하기' + (game.status === 'clear' && game.hasNext ? ' · N: 다음 구간' : ''), V.w / 2, y + h - (clear ? 42 : 30));
    ctx.textAlign = 'left';
  }

  function render(ctx, game, debug) {
    updateCamera(game);
    drawBackground(ctx, game.level.data.bg, cam.x);
    drawWorld(ctx, game, debug);
    drawStopOverlay(ctx, game);
    drawHUD(ctx, game);
    drawShelf(ctx, game);
    drawMessages(ctx, game);
    drawResult(ctx, game);
  }

  return { render: render, toWorld: toWorld, cam: cam, drawBackground: drawBackground, drawGoal: drawGoal, drawStart: drawStart,
           inkAt: inkAt, drawInkLine: drawInkLine };
})();
