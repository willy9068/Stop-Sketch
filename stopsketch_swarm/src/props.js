// 땅·프랍 그리기와 물리 바디 만들기. 게임(ui.js)과 레벨 툴(tools/editor.js)이 같은 함수를 써서 보이는 모습이 같다.
var G = G || {};

G.Props = (function () {
  function def(type) { return G.DATA.props[type]; }

  // 화면에서 차지하는 사각형 (선택·충돌 검사용)
  function rect(p) {
    var d = def(p.type);
    if (d && d.box) return { x: p.x, y: p.y, w: p.w, h: p.h };
    if (p.type === 'text') {
      var s = p.size || d.size, w = (p.text || '').length * s * 0.95;
      return { x: p.x, y: p.y - s, w: Math.max(w, s), h: s * 1.3 };
    }
    var size = p.size || (d && d.size) || 40;
    return { x: p.x - size / 2, y: p.y - size / 2, w: size, h: size };
  }

  // 원본 조각(sx,sy,sw,sh)을 화면 칸(dx,dy,dw,dh)에 한 조각 크기(tw,th)로 반복해서 채운다. 끝은 잘라서
  function tile(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, tw, th) {
    for (var y = 0; y < dh - 0.01; y += th) {
      var hh = Math.min(th, dh - y), fh = hh / th;
      for (var x = 0; x < dw - 0.01; x += tw) {
        var ww = Math.min(tw, dw - x), fw = ww / tw;
        ctx.drawImage(img, sx, sy, sw * fw, sh * fh, dx + x, dy + y, ww, hh);
      }
    }
  }

  // 이미지를 방식에 맞춰 x,y,w,h 에 그린다
  function drawImg(ctx, name, mode, img, x, y, w, h) {
    var A = G.DATA.art;
    if (mode === 'nine') {
      // 9분할: 테두리(모서리·변)는 원본 비율 그대로, 가운데·변은 늘리지 않고 같은 크기로 반복 (벽돌 무늬가 찌그러지지 않게)
      var sl = A.slices[name] || { src: 32, dst: 16 }, s = sl.src, k = sl.dst / sl.src;
      var d = Math.min(sl.dst, w / 2, h / 2), iw = img.width, ih = img.height;
      var sx = [0, s, iw - s, iw], dx = [x, x + d, x + w - d, x + w];
      var sy = [0, s, ih - s, ih], dy = [y, y + d, y + h - d, y + h];
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
        var dw = dx[i + 1] - dx[i], dh = dy[j + 1] - dy[j], sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j];
        if (dw <= 0 || dh <= 0) continue;
        tile(ctx, img, sx[i], sy[j], sw, sh, dx[i], dy[j], dw, dh, i === 1 ? sw * k : dw, j === 1 ? sh * k : dh);
      }
    } else if (mode === 'stack') {               // 폭에 맞춰 위에서부터 세로로 쌓기 (입체 돌 블록용)
      var cr = A.wallCrop, th = w * cr[3] / cr[2];
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      for (var yy = y; yy < y + h; yy += th) ctx.drawImage(img, cr[0], cr[1], cr[2], cr[3], x, yy, w, th);
      ctx.restore();
    } else if (mode === 'tile') {                 // 높이에 맞춰 가로로 반복 (가시)
      var tw = img.width * h / img.height;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      for (var xx = x; xx < x + w; xx += tw) ctx.drawImage(img, xx, y, tw, h);
      ctx.restore();
    } else {                                      // fit: 비율 유지, 가운데
      var k = Math.min(w / img.width, h / img.height), fw = img.width * k, fh = img.height * k;
      ctx.drawImage(img, x + (w - fw) / 2, y + (h - fh) / 2, fw, fh);
    }
  }

  // 목록에서 있는 이미지 하나를 골라 그린다. 없으면 false
  function drawFirst(ctx, list, r) {
    for (var i = 0; i < (list || []).length; i++) {
      var img = G.Assets.get(list[i][0]);
      if (img) { drawImg(ctx, list[i][0], list[i][1], img, r.x, r.y, r.w, r.h); return true; }
    }
    return false;
  }

  function drawStarShape(ctx, cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  // 배치된 선: 검은 다이아몬드처럼 광이 나는 막대 (사용자 결정 2026-10-20). 이미지(prop_crystal)가 있으면 9분할
  //   r = { x, y, w(길이), h(두께), angle(도) } — 가운데 기준으로 돌려 그림. 양 끝은 그대로, 가운데는 반복하지 않고 늘림 (사용자 결정 2026-10-20: 하나로 보이게)
  function drawCrystal(ctx, r) {
    var img = G.Assets.get('prop_crystal'), len = r.w, th = r.h;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    if (r.angle) ctx.rotate(r.angle * Math.PI / 180);
    var x0 = -len / 2, y0 = -th / 2;
    if (img) {
      var A = G.DATA.art.crystal, k = th / img.height, f = Math.min(1, len / ((A.left + A.right) * k));   // 아주 짧으면 끝을 줄임
      var eL = A.left * k * f, eR = A.right * k * f, mid = img.width - A.left - A.right;
      ctx.drawImage(img, 0, 0, A.left, img.height, x0, y0, eL, th);
      ctx.drawImage(img, img.width - A.right, 0, A.right, img.height, x0 + len - eR, y0, eR, th);
      if (len - eL - eR > 0.5) ctx.drawImage(img, A.left, 0, mid, img.height, x0 + eL - 0.3, y0, len - eL - eR + 0.6, th);
      ctx.restore();
      return;
    }
    var C = G.DATA.colors, t = th;
    ctx.beginPath();                               // 양 끝이 뾰족한 결정 모양
    ctx.moveTo(x0, 0); ctx.lineTo(x0 + t * 0.6, y0); ctx.lineTo(x0 + len - t * 0.6, y0); ctx.lineTo(x0 + len, 0); ctx.lineTo(x0 + len - t * 0.6, y0 + t); ctx.lineTo(x0 + t * 0.6, y0 + t);
    ctx.closePath();
    var gr = ctx.createLinearGradient(0, y0, 0, y0 + t);
    gr.addColorStop(0, '#4A4560'); gr.addColorStop(0.45, C.crystal); gr.addColorStop(1, '#0B0A10');
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#08070C'; ctx.stroke();
    ctx.clip();                                    // 비스듬한 광 줄무늬
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(2, t * 0.18);
    for (var q = t; q < len; q += 46) { ctx.beginPath(); ctx.moveTo(x0 + q, y0 + t); ctx.lineTo(x0 + q + t * 0.8, y0); ctx.stroke(); }
    ctx.restore();
  }

  // 잠든 물방울 (그림 drop_sleep, 없으면 작은 캐릭터를 흐리게 + 감은 눈 "z")
  function drawSleeper(ctx, x, y, r) {
    var C = G.DATA.colors, img = G.Assets.get('drop_sleep') || G.Assets.get('char_idle'), s = r * G.DATA.art.charSize;
    ctx.save();
    if (img) {
      if (!G.Assets.get('drop_sleep')) ctx.globalAlpha = 0.6;
      ctx.drawImage(img, x - s / 2, y + r - s, s, s);
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = C.player; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = C.outline; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.outline; ctx.font = 'bold ' + Math.round(r * 0.9) + 'px sans-serif';
    ctx.fillText('z', x + r * 0.7, y - r * 1.1);
    ctx.restore();
  }

  // 돌린 물건의 회전 중심: 상자는 가운데, 글자는 글자 상자 가운데, 나머지(별·물방울·장식…)는 x,y (사용자 요청 2026-10-21: 모든 물건 회전)
  function pivot(p) {
    var d = def(p.type), r = rect(p);
    return (d && d.box) || p.type === 'text' ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : { x: p.x, y: p.y };
  }

  // 발사기 (사용자 결정 2026-10-22): 그림(obs_shooter, 포구가 왼쪽)을 쏘는 방향(aim)으로 돌림. 오른쪽 반이면 좌우를 뒤집어 바퀴가 아래로.
  //   몸통 가운데에 투사체 색 동그라미. 그림이 없으면 회색 상자 + 포구
  function drawShooter(ctx, p) {
    var d = def('shooter'), C = G.DATA.colors, img = G.Assets.get('obs_shooter'), a = (p.aim != null ? p.aim : d.aim) * Math.PI / 180;
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2, col = C[p.shot || d.shot] || C.ink, right = Math.cos(a) > 1e-6;
    ctx.save();
    ctx.translate(cx, cy);
    if (img) {
      if (right) { ctx.rotate(a); ctx.scale(-1, 1); } else ctx.rotate(a - Math.PI);
      var k = Math.min(p.w / img.width, p.h / img.height) * 1.25, iw = img.width * k, ih = img.height * k;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      ctx.beginPath(); ctx.arc(iw * 0.1, -ih * 0.06, Math.min(iw, ih) * 0.13, 0, 6.283);
    } else {
      ctx.fillStyle = d.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.rotate(a);
      var mr = Math.min(p.w, p.h) * 0.22;
      ctx.fillStyle = '#1E1A22'; ctx.fillRect(0, -mr, Math.max(p.w, p.h) * 0.55, mr * 2); ctx.strokeRect(0, -mr, Math.max(p.w, p.h) * 0.55, mr * 2);
      ctx.beginPath(); ctx.arc(0, 0, Math.min(p.w, p.h) * 0.16, 0, 6.283);
    }
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.restore();
  }

  // 가시에 찔리는 범위 (사용자 요청 2026-10-23): 가운데 cx,cy · 돌린 각 a(라디안) · 가시 기준 안쪽 상자 x0~x1, y0~y1 (가시 끝 쪽 = 위)
  function spikeHit(p) {
    var H = G.DATA.spikeHit, top = p.h * H.top, side = Math.min(p.h * H.side, p.w * 0.25);
    return { cx: p.x + p.w / 2, cy: p.y + p.h / 2, a: (p.angle || 0) * Math.PI / 180,
             x0: -p.w / 2 + side, x1: p.w / 2 - side, y0: -p.h / 2 + top, y1: p.h / 2 };
  }
  // 원(x, y, r)이 찔리는 범위에 닿는가
  function inSpike(s, x, y, r) {
    var c = Math.cos(-s.a), sn = Math.sin(-s.a), dx = x - s.cx, dy = y - s.cy;
    var lx = dx * c - dy * sn, ly = dx * sn + dy * c;
    var qx = Math.max(s.x0, Math.min(s.x1, lx)) - lx, qy = Math.max(s.y0, Math.min(s.y1, ly)) - ly;
    return qx * qx + qy * qy < r * r;
  }

  // opts: { editor: true } 이면 그림이 없는 장식도 자리 표시. angle(도)이 있으면 돌려서 그림 (배치된 선은 자기 방식)
  function draw(ctx, p, opts) {
    if (p.type === 'shooter') { drawShooter(ctx, p); return; }   // 상자는 안 돌리고 그림만 쏘는 방향으로
    if (!p.angle || p.type === 'crystal') { drawRaw(ctx, p, opts); return; }
    var c = pivot(p);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(p.angle * Math.PI / 180); ctx.translate(-c.x, -c.y);
    drawRaw(ctx, p, opts);
    ctx.restore();
  }
  function drawRaw(ctx, p, opts) {
    var d = def(p.type), C = G.DATA.colors, r = rect(p);
    if (!d) return;
    if (p.type === 'text') {
      ctx.fillStyle = 'rgba(43,33,24,0.55)';
      ctx.font = (p.size || d.size) + 'px sans-serif';
      ctx.fillText(p.text || '', p.x, p.y);
      return;
    }
    if (p.type === 'deco') {
      var img = G.Assets.get(p.img || d.img);
      if (img) drawImg(ctx, p.img, 'fit', img, r.x, r.y, r.w, r.h);
      else if (opts && opts.editor) {
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(43,33,24,0.4)'; ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(43,33,24,0.5)'; ctx.font = '13px sans-serif';
        ctx.fillText((p.img || d.img) + ' (그림 없음)', r.x + 6, r.y + 18);
      }
      return;
    }
    if (p.type === 'crystal') { drawCrystal(ctx, p); return; }   // 돌린 막대 (사용자 결정 2026-10-20)
    if (drawFirst(ctx, d.imgs, r)) return;
    if (p.type === 'inkup') {                    // 그림이 없을 때: 먹색 잉크 병 + "+"
      var bw = r.w * 0.5, bh = r.h * 0.62, bx = p.x - bw / 2, by = p.y - bh / 2 + r.h * 0.08;
      ctx.fillStyle = C.ink; ctx.strokeStyle = C.outline; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#C9A26B'; ctx.fillRect(p.x - bw * 0.25, by - r.h * 0.18, bw * 0.5, r.h * 0.18);
      ctx.strokeRect(p.x - bw * 0.25, by - r.h * 0.18, bw * 0.5, r.h * 0.18);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(r.w * 0.36) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('+', p.x, by + bh * 0.68); ctx.textAlign = 'left';
      return;
    }
    if (p.type === 'drain') {                    // 그림이 없을 때: 검보라 웅덩이
      ctx.fillStyle = d.color; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2); else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(r.x + r.w * 0.15, r.y + 3, r.w * 0.2, 2);
      return;
    }
    if (p.type === 'spike') {                    // 그림이 없을 때: 회색 삼각형 가시 줄
      var n = Math.max(1, Math.round(r.w / 24)), sw = r.w / n;
      ctx.fillStyle = d.color; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var k = 0; k < n; k++) { ctx.moveTo(r.x + k * sw, r.y + r.h); ctx.lineTo(r.x + k * sw + sw / 2, r.y); ctx.lineTo(r.x + (k + 1) * sw, r.y + r.h); }
      ctx.fill(); ctx.stroke();
      return;
    }
    if (p.type === 'drop') { drawSleeper(ctx, p.x, p.y, G.DATA.drop.smallRadius); return; }
    if (p.type === 'stopup') {                   // 그림이 없을 때: 노란 시계 + "+1"
      var rr = r.w * 0.38;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fillStyle = C.star; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = C.outline; ctx.font = 'bold ' + Math.round(rr * 0.9) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('+1', p.x, p.y + rr * 0.32); ctx.textAlign = 'left';
      return;
    }
    if (p.type === 'star') {
      drawStarShape(ctx, p.x, p.y, r.w / 2);
      ctx.fillStyle = C.star; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C.outline; ctx.stroke();
      return;
    }
    ctx.fillStyle = d.color || C.ground; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  // 땅: 속은 ground_fill 무늬(없으면 색), 윗면은 ground_top 띠(없으면 굵은 선)
  var patterns = {};
  // 땅 여러 개를 한꺼번에 (사용자 요청 2026-10-20: 겹치거나 맞붙인 땅의 이음새가 안 보이게)
  //   1) 채우기 전부 → 2) 세로 테두리는 바깥쪽이 빈 곳인 부분만 → 3) 윗면 그림은 더 높은 땅 속에 묻힌 부분을 빼고, 세계 좌표에 맞춰 이어 붙임
  function drawGrounds(ctx, list) {
    var C = G.DATA.colors, A = G.DATA.art, LC = G.LevelCheck;
    var sh = list.map(function (g) { return LC.groundShape(g); });   // 비탈이면 윗면이 기운 사다리꼴 (사용자 요청 2026-10-21)
    function S(g) { return sh[list.indexOf(g)]; }
    function poly(g) { var s = S(g); ctx.moveTo(g.x0, s.l); ctx.lineTo(g.x1, s.r); ctx.lineTo(g.x1, s.b); ctx.lineTo(g.x0, s.b); ctx.closePath(); }
    var fill = G.Assets.get('ground_fill'), top = G.Assets.get('ground_top');
    if (fill) {
      if (!patterns.fill) patterns.fill = ctx.createPattern(fill, 'repeat');
      ctx.fillStyle = patterns.fill;
    } else ctx.fillStyle = C.ground;
    ctx.beginPath(); list.forEach(poly); ctx.fill();
    if (fill && A.groundTint) { ctx.fillStyle = A.groundTint; ctx.beginPath(); list.forEach(poly); ctx.fill(); }

    // 구간 [a, b] 에서 빼야 할 구간들을 뺀 나머지
    function minus(a, b, cuts) {
      var out = [[a, b]];
      cuts.forEach(function (c) {
        var next = [];
        out.forEach(function (s) {
          if (c[1] <= s[0] || c[0] >= s[1]) { next.push(s); return; }
          if (c[0] > s[0]) next.push([s[0], c[0]]);
          if (c[1] < s[1]) next.push([c[1], s[1]]);
        });
        out = next;
      });
      return out.filter(function (s) { return s[1] - s[0] > 0.5; });
    }
    var eps = 1.5;
    ctx.lineWidth = top ? 3 : 4; ctx.strokeStyle = C.outline;
    ctx.beginPath();
    list.forEach(function (g) {                   // 세로 테두리: 바로 바깥(ox)에 다른 땅이 있는 높이는 숨김
      var s = S(g);
      [[g.x0, g.x0 - eps, s.l], [g.x1, g.x1 + eps, s.r]].forEach(function (e) {
        var cuts = list.filter(function (h) { return h !== g && h.x0 <= e[1] && e[1] <= h.x1; })
          .map(function (h) { return [LC.topOf(h, e[1]), S(h).b]; });
        minus(e[2], s.b, cuts).forEach(function (sp) { ctx.moveTo(e[0], sp[0]); ctx.lineTo(e[0], sp[1]); });
      });
    });
    list.forEach(function (g) {                   // 아랫면: 바로 아래에 다른 땅이 있는 폭은 숨김 (공중 땅의 밑면)
      var by = S(g).b, cuts = list.filter(function (h) { var hs = S(h); return h !== g && Math.min(hs.l, hs.r) <= by + eps && by + eps <= hs.b; })
        .map(function (h) { return [h.x0, h.x1]; });
      minus(g.x0, g.x1, cuts).forEach(function (sp) { ctx.moveTo(sp[0], by); ctx.lineTo(sp[1], by); });
    });
    ctx.stroke();

    list.forEach(function (g) {
      var s = S(g);
      if (g.angle) {                              // 비탈: 윗면 그림을 기울여 이어 붙임 (가리는 땅 계산은 안 함)
        var dx = g.x1 - g.x0, dy = s.r - s.l, L = Math.sqrt(dx * dx + dy * dy);
        ctx.save(); ctx.translate(g.x0, s.l); ctx.rotate(Math.atan2(dy, dx));
        if (top) {
          var th0 = A.groundTop.h, tw0 = top.width * th0 / top.height;
          ctx.beginPath(); ctx.rect(0, -A.groundTop.up - 2, L, th0 + 4); ctx.clip();
          for (var x0 = 0; x0 < L; x0 += tw0) ctx.drawImage(top, x0, -A.groundTop.up, tw0, th0);
        } else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke(); }
        ctx.restore();
        return;
      }
      // 평평한 윗면: 더 높은 땅의 채우기 속에 있는 부분은 빼고 그림
      var cuts = list.filter(function (h) { var hs = S(h); return h !== g && Math.min(hs.l, hs.r) < g.top - 1 && g.top < hs.b; })
        .map(function (h) { return [h.x0, h.x1]; });
      var spans = minus(g.x0, g.x1, cuts);
      if (top) {
        var th = A.groundTop.h, tw = top.width * th / top.height, y = g.top - A.groundTop.up;
        spans.forEach(function (sp) {
          ctx.save();
          ctx.beginPath(); ctx.rect(sp[0], y - 2, sp[1] - sp[0], th + 4); ctx.clip();
          for (var x = Math.floor(sp[0] / tw) * tw; x < sp[1]; x += tw) ctx.drawImage(top, x, y, tw, th);   // 세계 좌표 기준 → 맞붙여도 무늬가 이어짐
          ctx.restore();
        });
      } else {
        ctx.beginPath();
        spans.forEach(function (sp) { ctx.moveTo(sp[0], g.top); ctx.lineTo(sp[1], g.top); });
        ctx.stroke();
      }
    });
  }
  function drawGround(ctx, g) { drawGrounds(ctx, [g]); }

  // 물리: 단단한 프랍만 정적 사각형으로
  function build(engine, p) {
    var d = def(p.type);
    if (!d || !d.solid) return null;
    if (p.type === 'crystal') return null;          // 배치된 선은 level.js 가 따로 만듦 (자를 수 있게)
    var ang = p.type === 'shooter' ? 0 : (p.angle || 0) * Math.PI / 180;   // 발사기는 상자를 돌리지 않음 (쏘는 방향은 aim)
    return G.Physics.add(engine, G.Physics.staticRect(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, { label: p.type, angle: ang }));   // 가운데 기준 회전
  }

  return { def: def, rect: rect, pivot: pivot, draw: draw, drawGround: drawGround, drawGrounds: drawGrounds, build: build, drawStarShape: drawStarShape,
           drawCrystal: drawCrystal, drawSleeper: drawSleeper, drawShooter: drawShooter, spikeHit: spikeHit, inSpike: inSpike };
})();
