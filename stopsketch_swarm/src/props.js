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
  function drawCrystal(ctx, r) {
    var img = G.Assets.get('prop_crystal');
    if (img) {                                     // 이미지(가로 막대, 양 끝 뾰족): 양 끝은 그대로, 가운데는 반복. 세로 막대는 90도 돌려 그림
      var A = G.DATA.art.crystal, hz = r.w >= r.h, len = hz ? r.w : r.h, th = hz ? r.h : r.w;
      var k = th / img.height, f = Math.min(1, len / ((A.left + A.right) * k));   // 아주 짧으면 끝을 줄임
      var eL = A.left * k * f, eR = A.right * k * f, mid = img.width - A.left - A.right;
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      if (!hz) ctx.rotate(Math.PI / 2);
      var x0 = -len / 2, y0 = -th / 2;
      ctx.drawImage(img, 0, 0, A.left, img.height, x0, y0, eL, th);
      ctx.drawImage(img, img.width - A.right, 0, A.right, img.height, x0 + len - eR, y0, eR, th);
      for (var xx = x0 + eL; xx < x0 + len - eR - 0.01; xx += mid * k) {
        var ww = Math.min(mid * k, x0 + len - eR - xx);
        ctx.drawImage(img, A.left, 0, ww / k, img.height, xx, y0, ww, th);
      }
      ctx.restore();
      return;
    }
    var C = G.DATA.colors, horiz = r.w >= r.h, t = horiz ? r.h : r.w;
    ctx.save();
    ctx.beginPath();                               // 양 끝이 뾰족한 결정 모양
    if (horiz) { ctx.moveTo(r.x, r.y + t / 2); ctx.lineTo(r.x + t * 0.6, r.y); ctx.lineTo(r.x + r.w - t * 0.6, r.y); ctx.lineTo(r.x + r.w, r.y + t / 2); ctx.lineTo(r.x + r.w - t * 0.6, r.y + t); ctx.lineTo(r.x + t * 0.6, r.y + t); }
    else { ctx.moveTo(r.x + t / 2, r.y); ctx.lineTo(r.x + t, r.y + t * 0.6); ctx.lineTo(r.x + t, r.y + r.h - t * 0.6); ctx.lineTo(r.x + t / 2, r.y + r.h); ctx.lineTo(r.x, r.y + r.h - t * 0.6); ctx.lineTo(r.x, r.y + t * 0.6); }
    ctx.closePath();
    var gr = horiz ? ctx.createLinearGradient(0, r.y, 0, r.y + r.h) : ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    gr.addColorStop(0, '#4A4560'); gr.addColorStop(0.45, C.crystal); gr.addColorStop(1, '#0B0A10');
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#08070C'; ctx.stroke();
    ctx.clip();                                    // 비스듬한 광 줄무늬
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(2, t * 0.18);
    var len = horiz ? r.w : r.h;
    for (var k = t; k < len; k += 46) {
      ctx.beginPath();
      if (horiz) { ctx.moveTo(r.x + k, r.y + t); ctx.lineTo(r.x + k + t * 0.8, r.y); }
      else { ctx.moveTo(r.x, r.y + k + t * 0.8); ctx.lineTo(r.x + t, r.y + k); }
      ctx.stroke();
    }
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

  // opts: { editor: true } 이면 그림이 없는 장식도 자리 표시
  function draw(ctx, p, opts) {
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
    if (p.type === 'crystal') { drawCrystal(ctx, r); return; }
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
    if (p.type === 'shooter') {                  // 그림이 없을 때: 회색 상자 + 쏘는 방향의 포구
      var a = (p.angle != null ? p.angle : d.angle) * Math.PI / 180, cx = p.x + p.w / 2, cy = p.y + p.h / 2, mr = Math.min(p.w, p.h) * 0.22;
      ctx.fillStyle = d.color; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.strokeRect(r.x, r.y, r.w, r.h);
      var mx = cx + Math.cos(a) * (p.w / 2 - mr * 0.4), my = cy + Math.sin(a) * (p.h / 2 - mr * 0.4);
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fillStyle = '#1E1A22'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - Math.cos(a) * mr, cy - Math.sin(a) * mr - 4, 4, 0, 6.283); ctx.fill();
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
    var C = G.DATA.colors, A = G.DATA.art, D0 = G.DATA.level.groundDepth;
    function hh(g) { return g.h || D0; }          // 땅 높이 (사용자 결정 2026-10-20: 땅마다 h)
    var fill = G.Assets.get('ground_fill'), top = G.Assets.get('ground_top');
    if (fill) {
      if (!patterns.fill) patterns.fill = ctx.createPattern(fill, 'repeat');
      ctx.fillStyle = patterns.fill;
    } else ctx.fillStyle = C.ground;
    list.forEach(function (g) { ctx.fillRect(g.x0, g.top, g.x1 - g.x0, hh(g)); });
    if (fill && A.groundTint) { ctx.fillStyle = A.groundTint; list.forEach(function (g) { ctx.fillRect(g.x0, g.top, g.x1 - g.x0, hh(g)); }); }

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
      [[g.x0, g.x0 - eps], [g.x1, g.x1 + eps]].forEach(function (e) {
        var cuts = list.filter(function (h) { return h !== g && h.x0 <= e[1] && e[1] <= h.x1; })
          .map(function (h) { return [h.top, h.top + hh(h)]; });
        minus(g.top, g.top + hh(g), cuts).forEach(function (s) { ctx.moveTo(e[0], s[0]); ctx.lineTo(e[0], s[1]); });
      });
    });
    list.forEach(function (g) {                   // 아랫면: 바로 아래에 다른 땅이 있는 폭은 숨김 (공중 땅의 밑면)
      var by = g.top + hh(g), cuts = list.filter(function (h) { return h !== g && h.top <= by + eps && by + eps <= h.top + hh(h); })
        .map(function (h) { return [h.x0, h.x1]; });
      minus(g.x0, g.x1, cuts).forEach(function (sp) { ctx.moveTo(sp[0], by); ctx.lineTo(sp[1], by); });
    });
    ctx.stroke();

    list.forEach(function (g) {                   // 윗면: 더 높은 땅의 채우기 속에 있는 부분은 빼고 그림
      var cuts = list.filter(function (h) { return h !== g && h.top < g.top - 1 && g.top < h.top + hh(h); })
        .map(function (h) { return [h.x0, h.x1]; });
      var spans = minus(g.x0, g.x1, cuts);
      if (top) {
        var th = A.groundTop.h, tw = top.width * th / top.height, y = g.top - A.groundTop.up;
        spans.forEach(function (s) {
          ctx.save();
          ctx.beginPath(); ctx.rect(s[0], y - 2, s[1] - s[0], th + 4); ctx.clip();
          for (var x = Math.floor(s[0] / tw) * tw; x < s[1]; x += tw) ctx.drawImage(top, x, y, tw, th);   // 세계 좌표 기준 → 맞붙여도 무늬가 이어짐
          ctx.restore();
        });
      } else {
        ctx.beginPath();
        spans.forEach(function (s) { ctx.moveTo(s[0], g.top); ctx.lineTo(s[1], g.top); });
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
    return G.Physics.add(engine, G.Physics.staticRect(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, { label: p.type }));
  }

  return { def: def, rect: rect, draw: draw, drawGround: drawGround, drawGrounds: drawGrounds, build: build, drawStarShape: drawStarShape,
           drawCrystal: drawCrystal, drawSleeper: drawSleeper };
})();
