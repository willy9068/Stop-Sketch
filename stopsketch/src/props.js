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
  function drawGround(ctx, g) {
    var C = G.DATA.colors, A = G.DATA.art, depth = G.DATA.level.groundDepth;
    var w = g.x1 - g.x0, fill = G.Assets.get('ground_fill'), top = G.Assets.get('ground_top');
    if (fill) {
      if (!patterns.fill) patterns.fill = ctx.createPattern(fill, 'repeat');
      ctx.fillStyle = patterns.fill;
    } else ctx.fillStyle = C.ground;
    ctx.fillRect(g.x0, g.top, w, depth);
    if (fill && A.groundTint) { ctx.fillStyle = A.groundTint; ctx.fillRect(g.x0, g.top, w, depth); }
    if (top) {
      ctx.lineWidth = 3; ctx.strokeStyle = C.outline;   // 땅 양 끝 세로 테두리 (틈이 틈으로 보이게)
      ctx.beginPath(); ctx.moveTo(g.x0, g.top); ctx.lineTo(g.x0, g.top + depth); ctx.moveTo(g.x1, g.top); ctx.lineTo(g.x1, g.top + depth); ctx.stroke();
      var th = A.groundTop.h, tw = top.width * th / top.height, y = g.top - A.groundTop.up;
      ctx.save();
      ctx.beginPath(); ctx.rect(g.x0, y - 2, w, th + 4); ctx.clip();
      for (var x = g.x0; x < g.x1; x += tw) ctx.drawImage(top, x, y, tw, th);
      ctx.restore();
    } else {
      ctx.lineWidth = 4; ctx.strokeStyle = C.outline;
      ctx.beginPath(); ctx.moveTo(g.x0, g.top + depth); ctx.lineTo(g.x0, g.top); ctx.lineTo(g.x1, g.top); ctx.lineTo(g.x1, g.top + depth); ctx.stroke();
    }
  }

  // 물리: 단단한 프랍만 정적 사각형으로
  function build(engine, p) {
    var d = def(p.type);
    if (!d || !d.solid) return null;
    return G.Physics.add(engine, G.Physics.staticRect(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, { label: p.type }));
  }

  return { def: def, rect: rect, draw: draw, drawGround: drawGround, build: build, drawStarShape: drawStarShape };
})();
