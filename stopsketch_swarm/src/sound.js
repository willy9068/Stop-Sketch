// 사운드 (사용자 결정 2026-10-22, grill me): 배경 음악 1곡 반복 + 효과음. 게임 계산(game.js 등)은 건드리지 않고,
//   매 프레임 게임 상태가 바뀐 것을 보고(watch) 소리를 낸다 → node 시뮬레이션에는 영향 없음.
//   - 시간 정지 중엔 배경 음악이 먹먹하게(낮은 소리만 통과 + 작게), 재생하면 원래대로
//   - 같은 효과음이 무리로 몰리면 간격을 두고 차례로, 음을 조금씩 올림 (작은 물방울은 작고 높게)
//   - 지우개가 문지르는 소리는 주인공과 가까울수록 커짐. Esc 일시 정지 중엔 모든 소리 멈춤
//   - M 키·위 막대 스피커로 켬/끔 (저장). 소리 파일이 없으면 그 소리만 안 남
//   파일: 제출본은 G.EMBED_AUDIO(내장), 개발본은 stopsketch/assets/sound/<이름>.(mp3|ogg|wav|flac)
var G = G || {};

G.Sound = (function () {
  var S = null, ctx = null, buffers = {}, muted = false, master = null, musicBus = null, musicFilter = null, sfxBus = null;
  var music = null, loops = {}, bursts = {}, prev = null, seenFx = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  var duckUntil = 0;

  // 같은 소리가 몰릴 때 언제·어떤 음으로 낼지 (화면과 무관한 계산 → test.js 에서 시험)
  //   st: {next, n, last} 그 소리의 상태. now·gap ms. 돌려줌: {at(ms), pitch} 또는 null(너무 많이 밀림)
  function plan(st, now, B) {
    if (now - st.last > B.gapMs * 3 && st.next <= now) st.n = 0;   // 한동안 조용했으면 음 높이 처음부터
    var at = Math.max(now, st.next);
    if ((at - now) / B.gapMs >= B.maxQueue) return null;
    st.next = at + B.gapMs; st.last = at; st.n += 1;
    return { at: at, pitch: Math.min(B.pitchMax, 1 + (st.n - 1) * B.pitchStep) };
  }

  function vol(kind) { var v = G.TS && G.TS(kind === 'music' ? 'musicVolume' : 'sfxVolume'); return v == null ? (kind === 'music' ? 0.45 : 0.8) : +v; }

  function init() {
    S = G.DATA.sound;
    try { muted = localStorage.getItem(G.DATA.save.soundKey) === 'off'; } catch (e) { /* 무시 */ }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000;
    musicBus = ctx.createGain(); musicBus.gain.value = vol('music');
    musicFilter.connect(musicBus); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol('sfx'); sfxBus.connect(master);
    Object.keys(S.sfx).concat([S.bgm]).forEach(load);
  }

  function decode(name, arr) {
    ctx.decodeAudioData(arr, function (buf) { buffers[name] = buf; if (name === S.bgm) startMusic(); }, function () { /* 못 읽는 파일은 무시 */ });
  }
  function load(name) {
    var emb = G.EMBED_AUDIO && G.EMBED_AUDIO[name];
    if (emb) {                                     // data:audio/...;base64,....
      var bin = atob(emb.slice(emb.indexOf(',') + 1)), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      decode(name, arr.buffer);
      return;
    }
    if (G.SINGLE_FILE) return;                     // 제출본은 외부 파일을 읽지 않는다
    (function tryExt(k) {                          // 개발본: 확장자를 차례로
      if (k >= S.exts.length) return;
      var x = new XMLHttpRequest();
      x.open('GET', S.dir + name + '.' + S.exts[k]); x.responseType = 'arraybuffer';
      x.onload = function () { if (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength)) decode(name, x.response); else tryExt(k + 1); };
      x.onerror = function () { tryExt(k + 1); };
      x.send();
    })(0);
  }

  // 브라우저는 사용자가 누르기 전에는 소리를 막음 → 첫 클릭·키에서 깨움
  function unlock() { if (ctx && ctx.state === 'suspended' && !pausedNow) ctx.resume(); }

  function startMusic() {
    if (!ctx || music || !buffers[S.bgm]) return;
    music = ctx.createBufferSource(); music.buffer = buffers[S.bgm]; music.loop = true;
    music.connect(musicFilter); music.start();
  }

  // 효과음 하나. opt: {vol, pitch, at(ms 뒤)}
  function play(name, opt) {
    if (!ctx || !buffers[name] || muted) return;
    var def = S.sfx[name] || [1, 0], o = opt || {};
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[name];
    src.playbackRate.value = (o.pitch || 1) * (1 + (Math.random() * 2 - 1) * def[1]);
    g.gain.value = def[0] * (o.vol == null ? 1 : o.vol);
    src.connect(g); g.connect(sfxBus);
    src.start(ctx.currentTime + Math.max(0, (o.at || 0) / 1000));
  }
  // 몰리는 소리: 간격을 두고 차례로 + 음을 조금씩 올림
  function burst(name, small) {
    if (!ctx) return;
    var st = bursts[name] || (bursts[name] = { next: 0, n: 0, last: -1e9 }), now = performance.now();
    var p = plan(st, now, S.burst);
    if (!p) return;
    play(name, { at: p.at - now, pitch: p.pitch * (small ? S.small.pitch : 1), vol: small ? S.small.vol : 1 });
  }
  // 반복 소리(그리기·지우개): 켜고 끄고 음량
  function loop(name, v) {
    if (!ctx) return;
    var L = loops[name];
    if (v <= 0.001 || muted || !buffers[name]) {
      if (L) { L.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); if (L.idle++ > 30) { try { L.src.stop(); } catch (e) { /* 무시 */ } delete loops[name]; } }
      return;
    }
    if (!L) {
      L = loops[name] = { src: ctx.createBufferSource(), g: ctx.createGain(), idle: 0 };
      L.src.buffer = buffers[name]; L.src.loop = true; L.g.gain.value = 0;
      L.src.connect(L.g); L.g.connect(sfxBus); L.src.start();
    }
    L.idle = 0;
    L.g.gain.setTargetAtTime(v * (S.sfx[name] || [1])[0], ctx.currentTime, 0.05);
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(G.DATA.save.soundKey, m ? 'off' : 'on'); } catch (e) { /* 무시 */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.03);
  }
  function toggle() { setMuted(!muted); return !muted; }

  // ── 게임 상태 보기 ──
  function snap(game) {
    var awake = 0, got = { star: 0, item: 0 }, modes = [];
    game.level.sleepers.forEach(function (s) { if (s.state !== 'sleep') awake++; });
    game.level.items.forEach(function (it) { if (it.got && !it.owned) got[it.kind === 'star' ? 'star' : 'item']++; });
    game.drops.forEach(function (d) { modes.push(d.mode); });
    return { game: game, attempt: game.attempt, status: game.status, stopped: game.stopped, color: game.color, awake: awake, star: got.star, item: got.item,
             lost: game.lost, projs: game.projs.slice(), lines: game.lines.length, drops: game.drops.slice(), modes: modes };
  }

  var pausedNow = false;
  function watch(game) {
    if (!ctx) return;
    // Esc 일시 정지: 소리 전체 멈춤 (풀면 이어서)
    if (game.paused !== pausedNow) { pausedNow = game.paused; if (pausedNow) ctx.suspend(); else ctx.resume(); }
    if (pausedNow) return;
    var now = ctx.currentTime, M = S.stopMuffle;
    // 정지 중 먹먹하게 + 결과 음악 동안 낮춤
    var duck = performance.now() < duckUntil ? S.jingleDuck : 1;
    musicFilter.frequency.setTargetAtTime(game.stopped ? M.freq : 20000, now, M.ms / 3000);
    musicBus.gain.setTargetAtTime(vol('music') * (game.stopped ? M.gain : 1) * duck, now, M.ms / 3000);
    sfxBus.gain.setTargetAtTime(vol('sfx'), now, 0.05);

    var p = prev, c = snap(game);
    prev = c;
    if (!p || p.game !== game || p.attempt !== c.attempt) return;   // 새 판·다시 하기: 비교하지 않음

    if (!p.stopped && c.stopped) play('sfx_stop');
    if (p.stopped && !c.stopped && c.status === 'run') play('sfx_resume');
    if (p.color !== c.color && c.status !== 'ready') play('sfx_color');
    if (c.awake > p.awake) for (var w = 0; w < c.awake - p.awake; w++) burst('sfx_wake');
    if (c.star > p.star) play('sfx_star');
    if (c.item > p.item) play('sfx_item');
    if (c.lost > p.lost) for (var l = 0; l < c.lost - p.lost; l++) burst('sfx_lost', true);
    c.drops.forEach(function (d, i) { if (p.drops[i] === d && p.modes[i] === 'join' && d.mode === 'line') burst('sfx_join', !d.hero); });
    // 새 투사체: 주인공과 멀수록 작게
    var hx = game.hero.body ? game.hero.body.position.x : game.eraserX;
    c.projs.forEach(function (q) { if (p.projs.indexOf(q) < 0) { var dv = 1 - Math.min(1, Math.abs(q.x - hx) / 1400); if (dv > 0.05) play('sfx_shoot', { vol: dv }); } });
    // 효과(fx): 튕김·가속·빨아들이기·지우기·흡수·막힘
    game.fx.forEach(function (f) {
      if (!seenFx || seenFx.has(f)) return;
      seenFx.add(f);
      if (f.type === 'bounce') burst('sfx_bounce', f.small);
      else if (f.type === 'boost') burst('sfx_boost', f.small);
      else if (f.type === 'suck') play('sfx_suck');
      else if (f.type === 'cut') play('sfx_erase');
      else if (f.type === 'absorb') burst('sfx_plop');
      else if (f.type === 'block') burst('sfx_block');
    });
    // 선: 초록이 떠오르기 시작 · 떨어지던 선이 닿음
    game.lines.forEach(function (ln) {
      if (!ln.body) return;
      var vy = ln.body.velocity.y;
      if (ln.color === 'green' && ln.rising && !ln._sndRise) { ln._sndRise = true; play('sfx_rise'); }
      if (ln.color !== 'green') {
        if (ln._sndVy > 2.5 && vy < 0.6) play('sfx_land', { vol: Math.min(1, ln._sndVy / 8) });
        ln._sndVy = vy;
      }
    });
    // 끝: 클리어·실패
    if (p.status === 'run' && c.status === 'clear') { play('sfx_clear'); duckUntil = performance.now() + 2500; }
    if (p.status === 'run' && c.status === 'fail') { play('sfx_lost'); play('sfx_fail', { at: 250 }); duckUntil = performance.now() + 2500; }

    // 반복 소리: 그리는 동안 · 지우개가 가까울수록
    loop('sfx_draw', game.stroke && !game.stopped ? 1 : (game.stroke ? 0.8 : 0));
    var E = S.eraser, ed = hx - game.eraserX, lv = game.level.data;
    var ev = game.status === 'run' && !game.stopped && !lv.noEraser && game.runMs >= lv.eraser.delayMs ? Math.max(0, Math.min(1, (E.far - ed) / (E.far - E.near))) * E.vol : 0;
    loop('sfx_eraser', ev);
  }

  return {
    init: function () { if (typeof window !== 'undefined' && !ctx) init(); },
    unlock: unlock, watch: watch, toggle: toggle, isMuted: function () { return muted; },
    click: function () { play('sfx_click'); }, plan: plan,
    // 확인용 (디버그·브라우저 점검): 불러온 소리, 상태, 정지 필터, 반복 소리 음량
    info: function () {
      var lp = {};
      Object.keys(loops).forEach(function (k) { lp[k] = +loops[k].g.gain.value.toFixed(2); });
      return { state: ctx && ctx.state, loaded: Object.keys(buffers), muted: muted, music: !!music,
               filterHz: musicFilter && Math.round(musicFilter.frequency.value), musicGain: musicBus && +musicBus.gain.value.toFixed(2), loops: lp };
    }
  };
})();
