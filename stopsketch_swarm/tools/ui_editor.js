// UI·글자 툴 (사용자 요청 2026-10-21: 게임에 나오는 UI와 텍스트를 직접 고칠 수 있게)
// src/uitext.js 의 글자(text)·모양(style)을 고치고 게임과 같은 그리기 함수(G.UI.render)로 바로 미리 본 뒤 uitext.js 로 저장한다.
var G = G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('view'), ctx = cv.getContext('2d');
  G.Assets.load();

  var ORIG = JSON.parse(JSON.stringify(G.UITEXT));   // 이 화면을 열 때 내용 (↺ 처음대로)
  var S = { scene: 'run', game: null, dirty: false, fileHandle: null };

  // 장면: 어떤 글자가 어디서 나오는지 보기 위한 게임 상태
  var SCENES = [
    ['ready', '출발 전'], ['run', '달리는 중'], ['stop', '정지 중'], ['pause', '일시 정지 (Esc)'], ['toast', '알림 문구'],
    ['clear', '클리어 결과'], ['fail', '실패 결과']
  ];
  // 글자 묶음: 이름 앞부분 → [제목, 장면]
  var GROUPS = [
    ['hud', '위 막대', 'run'], ['shelf', '아래 물감 선반', 'run'], ['ink', '물감 이름', 'run'], ['stop', '정지 화면', 'stop'], ['pause', '일시 정지 창 (Esc)', 'pause'],
    ['ready', '출발 전 화면', 'ready'], ['skip', '스킵 버튼 (지금 꺼짐: data.js goalEnter.skip)', 'run'], ['result', '결과 창', 'clear'], ['fail', '실패 이유 (결과 창 제목)', 'fail'],
    ['toast', '알림 문구 (화면 가운데 빨간 글자)', 'toast']
  ];
  var LABEL = {
    'hud.ink': '잉크 글자', 'hud.inkInf': '잉크 무제한일 때', 'hud.stop': '정지 글자', 'hud.stopInf': '정지 무제한일 때',
    'hud.home': '도착한 물방울', 'hud.lineInfo': '대열 정보 (대열 켬)', 'hud.walkInfo': '물방울 정보 (대열 끔)', 'hud.stage': '오른쪽 스테이지 정보',
    'hud.lineLen': '주인공 머리 위 대열 수',
    'skip.button': '스킵 버튼', 'shelf.locked': '못 쓰는 색', 'shelf.help': '선반 옆 조작 안내',
    'stop.banner': '정지 중 안내', 'ready.title': '출발 안내', 'ready.help': '조작 안내',
    'result.clear': '클리어 제목', 'result.stars': '별', 'result.purity': '정화', 'result.time': '시간', 'result.best': '최고 기록 (시간 뒤에 붙음)',
    'result.failInfo': '실패 때 물방울', 'result.retry': '다시 하기 버튼', 'result.next': '다음 스테이지 버튼',
    'pause.title': '일시 정지 제목', 'pause.resume': '계속하기 버튼', 'pause.retry': '다시 하기 버튼',
    'fail.fall': '떨어짐', 'fail.erased': '지우개에 지워짐', 'fail.spike': '가시', 'fail.shot': '투사체에 맞음',
    'toast.noStops': '정지 횟수 없음', 'toast.inkLocked': '못 쓰는 색을 고름', 'toast.stopUp': '정지 +1 획득', 'toast.inkUp': '잉크 병 획득',
    'toast.heroHome': '주인공 도착', 'toast.short': '선이 너무 짧음', 'toast.noCrystal': '노랑: 지울 선 없음', 'toast.noSuck': '빨아들일 선 없음',
    'toast.noInk': '잉크 없음', 'toast.soundOn': '소리 켬', 'toast.soundOff': '소리 끔', 'toast.test': '레벨 툴 테스트 시작',
    'ink.black': '검정', 'ink.red': '빨강', 'ink.blue': '파랑', 'ink.green': '초록', 'ink.yellow': '노랑'
  };
  var STYLE = [   // [이름, 설명, 장면]
    ['font', '글꼴 (CSS 글꼴 이름)', 'run'], ['textColor', '글자 색', 'run'],
    ['hudH', '위 막대 높이', 'run'], ['hudBg', '위 막대 바탕색', 'run'], ['hudLabelSize', '위 막대 "잉크·정지" 크기', 'run'],
    ['hudValueSize', '잉크 숫자 크기', 'run'], ['hudHomeSize', '도착 물방울 크기', 'run'], ['hudSmallSize', '위 막대 작은 글자 크기', 'run'],
    ['inkX', '잉크 x 위치', 'run'], ['inkGaugeW', '잉크 막대 길이', 'run'], ['stopX', '정지 x 위치', 'run'], ['lineLenSize', '머리 위 대열 수 크기', 'run'],
    ['skipY', '스킵 버튼 y (꺼짐)', 'run'], ['skipW', '스킵 버튼 폭 (꺼짐)', 'run'], ['skipSize', '스킵 버튼 글자 크기 (꺼짐)', 'run'],
    ['shelfNameSize', '선반 옆 색 이름 크기', 'run'], ['shelfHelpSize', '선반 옆 안내 크기', 'run'],
    ['stopBannerY', '정지 안내 y', 'stop'], ['stopBannerSize', '정지 안내 크기', 'stop'], ['stopColor', '정지 테두리·안내 색', 'stop'],
    ['msgY', '알림 문구 y', 'toast'], ['msgSize', '알림 문구 크기', 'toast'], ['msgColor', '알림 문구 색', 'toast'],
    ['readyY', '출발 안내 y', 'ready'], ['readyTitleSize', '출발 안내 크기', 'ready'], ['readyHelpSize', '조작 안내 크기', 'ready'],
    ['resultTitleSize', '결과 제목 크기', 'clear'], ['clearColor', '클리어 제목 색', 'clear'], ['failColor', '실패 제목 색', 'fail'],
    ['resultSize', '결과 글자 크기', 'clear'], ['resultRetrySize', '결과 버튼 글자 크기', 'clear'],
    ['resultBtnW', '결과 버튼 폭', 'clear'], ['resultBtnH', '결과 버튼 높이', 'clear'],
    ['retryBtnX', '다시 하기 버튼 x (왼쪽)', 'clear'], ['retryBtnY', '다시 하기 버튼 y (위)', 'clear'],
    ['nextBtnX', '다음 스테이지 버튼 x (왼쪽)', 'clear'], ['nextBtnY', '다음 스테이지 버튼 y (위)', 'clear'],
    ['retryAloneX', '마지막 스테이지 클리어: 다시 하기 x', 'clear'], ['retryAloneY', '마지막 스테이지 클리어: 다시 하기 y', 'clear'],
    ['failRetryX', '실패: 다시 하기 x', 'fail'], ['failRetryY', '실패: 다시 하기 y', 'fail'],
    ['resultPanelW', '클리어 결과 창 바탕 폭', 'clear'], ['resultPanelH', '클리어 결과 창 바탕 높이', 'clear'],
    ['failPanelW', '실패 결과 창 바탕 폭', 'fail'], ['failPanelH', '실패 결과 창 바탕 높이', 'fail'],
    // 결과 창 안 (사용자 요청 2026-10-21: 미리보기에서 끌어 옮기기). 글자 x = 가운데, y = 글자 바닥선 / 그림·막대 = 왼쪽 위 / 별 줄 = 가운데
    ['cTitleX', '클리어: 제목 x', 'clear'], ['cTitleY', '클리어: 제목 y', 'clear'],
    ['cStarsTextX', '클리어: "별 n/3" x', 'clear'], ['cStarsTextY', '클리어: "별 n/3" y', 'clear'],
    ['cStarsX', '클리어: 별 그림 줄 가운데 x', 'clear'], ['cStarsY', '클리어: 별 그림 줄 가운데 y', 'clear'],
    ['cStarSize', '클리어: 별 그림 크기', 'clear'], ['cStarGap', '클리어: 별 간격', 'clear'],
    ['cFaceX', '클리어: 물방울 그림 x (왼쪽)', 'clear'], ['cFaceY', '클리어: 물방울 그림 y (위)', 'clear'], ['cFaceSize', '클리어: 물방울 그림 크기', 'clear'],
    ['cBarX', '클리어: 정화 막대 x (왼쪽)', 'clear'], ['cBarY', '클리어: 정화 막대 y (위)', 'clear'],
    ['cBarW', '클리어: 정화 막대 길이', 'clear'], ['cBarH', '클리어: 정화 막대 두께', 'clear'],
    ['cPurityX', '클리어: 정화 글자 x', 'clear'], ['cPurityY', '클리어: 정화 글자 y', 'clear'],
    ['cTimeX', '클리어: 시간·최고 기록 x', 'clear'], ['cTimeY', '클리어: 시간·최고 기록 y', 'clear'],
    ['fTitleX', '실패: 제목(이유) x', 'fail'], ['fTitleY', '실패: 제목(이유) y', 'fail'],
    ['fFaceX', '실패: 물방울 그림 x (왼쪽)', 'fail'], ['fFaceY', '실패: 물방울 그림 y (위)', 'fail'], ['fFaceSize', '실패: 물방울 그림 크기', 'fail'],
    ['fInfoX', '실패: 물방울 도착 글자 x', 'fail'], ['fInfoY', '실패: 물방울 도착 글자 y', 'fail'],
    ['fTimeX', '실패: 시간 x', 'fail'], ['fTimeY', '실패: 시간 y', 'fail'],
    ['resultBtnBg', '결과 버튼 바탕색', 'clear'], ['resultBtnHot', '결과 버튼 마우스 올렸을 때 색', 'clear'],
    // 일시 정지 창 (사용자 결정 2026-10-21). 버튼 크기·글자는 결과 버튼과 같음
    ['pausePanelW', '일시 정지 창 바탕 폭', 'pause'], ['pausePanelH', '일시 정지 창 바탕 높이', 'pause'],
    ['pauseTitleX', '일시 정지: 제목 x', 'pause'], ['pauseTitleY', '일시 정지: 제목 y', 'pause'], ['pauseColor', '일시 정지 제목 색', 'pause'],
    ['pauseResumeX', '계속하기 버튼 x (왼쪽)', 'pause'], ['pauseResumeY', '계속하기 버튼 y (위)', 'pause'],
    ['pauseRetryX', '일시 정지: 다시 하기 x (왼쪽)', 'pause'], ['pauseRetryY', '일시 정지: 다시 하기 y (위)', 'pause'],
    // 스테이지 목록 버튼 (2차 데모, 2026-10-23)
    ['menuRetryX', '클리어: 스테이지 목록 버튼 x (왼쪽)', 'clear'], ['menuRetryY', '클리어: 스테이지 목록 버튼 y (위)', 'clear'],
    ['failMenuX', '실패: 스테이지 목록 버튼 x', 'fail'], ['failMenuY', '실패: 스테이지 목록 버튼 y', 'fail'],
    ['pauseMenuX', '일시 정지: 스테이지 목록 x', 'pause'], ['pauseMenuY', '일시 정지: 스테이지 목록 y', 'pause'],
    // 시작·월드·스테이지 화면 (2차 데모, 2026-10-23) — 이 툴에서는 미리보기 없이 숫자만 (게임에서 확인)
    ['titleY', '시작 화면: 제목 y', 'run'], ['titleSize', '시작 화면: 제목 크기', 'run'], ['titleLogoW', '시작 화면: 제목 그림 폭', 'run'],
    ['titleSubY', '시작 화면: 부제 y', 'run'], ['titleSubSize', '시작 화면: 부제 크기', 'run'], ['titleStartY', '시작 화면: 시작 버튼 y', 'run'],
    ['menuBtnW', '메뉴 버튼 폭', 'run'], ['menuBtnH', '메뉴 버튼 높이', 'run'], ['menuBtnSize', '메뉴 버튼 글자 크기', 'run'], ['menuSmallSize', '메뉴 작은 글자 크기', 'run'],
    ['menuTitleY', '월드·스테이지 화면 제목 y', 'run'], ['menuTitleSize', '월드·스테이지 화면 제목 크기', 'run'],
    ['menuBackX', '뒤로 버튼 x', 'run'], ['menuBackY', '뒤로 버튼 y', 'run'], ['menuBackW', '뒤로 버튼 폭', 'run'], ['menuBackH', '뒤로 버튼 높이', 'run'],
    ['worldCardY', '월드 카드 y (위)', 'run'], ['worldCardW', '월드 카드 폭', 'run'], ['worldCardH', '월드 카드 높이', 'run'], ['worldCardGap', '월드 카드 간격', 'run'],
    ['worldNameSize', '월드 이름 크기', 'run'], ['worldDescSize', '월드 설명·별 글자 크기', 'run'],
    ['stageTileY', '스테이지 칸 y (위)', 'run'], ['stageTileSize', '스테이지 칸 크기', 'run'], ['stageTileGap', '스테이지 칸 간격', 'run'], ['stageNumSize', '스테이지 번호 크기', 'run'],
    // 사운드 (사용자 결정 2026-10-22): 0 ~ 1
    ['musicVolume', '배경 음악 음량 (0~1)', 'run'], ['sfxVolume', '효과음 음량 (0~1)', 'run']
  ];

  // ---------- 미리보기 게임 ----------
  function stageData() { return G.LEVELS.filter(function (l) { return !l.test; })[0] || G.LEVELS[0]; }
  function steps(g, n) { for (var i = 0; i < n && g.status === 'run'; i++) G.Game.update(g, G.DATA.loop.stepMs); }
  function makeScene(scene) {
    var g = G.Game.create('A', stageData(), { inkBonus: 0, bottles: {}, records: {} });
    G.UI.resetCamera();
    g.hasNext = true;
    if (scene !== 'ready') { G.Game.start(g); steps(g, 100); }
    if (scene === 'stop') G.Game.toggleStop(g);
    if (scene === 'pause') G.Game.pause(g);
    if (scene === 'skip') g.heroHome = true;
    if (scene === 'clear') {
      g.rescued = Math.ceil(g.total * 0.6); g.heroIn = true;
      g.starKeys = g.level.items.filter(function (it) { return it.kind === 'star'; }).slice(0, 2).map(function (it) { return it.key; });
      g.best = { stars: 2, bestPurity: 0.8 };
      G.Game.finish(g, 'clear', '');
    }
    if (scene === 'fail') G.Game.finish(g, 'fail', '');
    S.game = g; S.scene = scene;
    buildScenes();
  }
  // 글자가 바뀌어도 바로 보이게 매번 다시 넣는 것들
  function liveText(g) {
    if (S.scene === 'fail') g.failReason = G.T('fail.' + (S.failKey || 'erased'));
    if (S.scene === 'toast') {
      var keys = Object.keys(G.UITEXT.text).filter(function (k) { return k.indexOf('toast.') === 0; });
      g.messages = keys.map(function (k) { return { text: G.T(k, { ink: G.DATA.inks.red.name, n: 1, name: g.level.data.name }), ms: 1e9 }; });
    } else g.messages = [];
  }
  function frame() {
    if (S.game) {
      liveText(S.game);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      G.UI.render(ctx, S.game, { showBoxes: false });
      drawHover();
    }
    requestAnimationFrame(frame);
  }

  function buildScenes() {
    $('scenes').innerHTML = '미리보기 장면: ' + SCENES.map(function (s) {
      return '<button data-scene="' + s[0] + '"' + (S.scene === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>';
    }).join('');
  }
  $('scenes').addEventListener('click', function (e) { var s = e.target.getAttribute('data-scene'); if (s) makeScene(s); });

  // ---------- 왼쪽 칸 ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  // 글자 칸 높이: 줄 수만큼 (긴 한 줄은 2줄 높이)
  function rowsFor(v) { var s = String(v); return Math.max(s.split('\n').length, s.length > 34 ? 2 : 1); }
  function isColor(v) { return typeof v === 'string' && /^(#|rgb)/.test(v); }
  function row(kind, key, label, scene) {
    var cur = G.UITEXT[kind][key], org = ORIG[kind][key], changed = JSON.stringify(cur) !== JSON.stringify(org);
    var id = kind + ':' + key, input;
    if (typeof org === 'number') input = '<input type="number" data-k="' + id + '" value="' + cur + '">';
    else if (kind === 'text') input = '<textarea rows="' + rowsFor(cur) + '" data-k="' + id + '">' + esc(cur) + '</textarea>';   // 엔터 = 줄바꿈 (사용자 요청 2026-10-21)
    else input = '<input data-k="' + id + '" value="' + esc(cur) + '">';
    return '<div class="f' + (changed ? ' changed' : '') + '" data-scene="' + scene + '" data-fail="' + (key.indexOf('fail.') === 0 ? key.slice(5) : '') + '">' +
      '<label>' + esc(label) + (isColor(cur) ? '<span class="sw" style="background:' + esc(cur) + '"></span>' : '') + '<small>' + esc(key) + '</small></label>' +
      input + '<button data-reset="' + id + '" title="처음대로">↺</button></div>';
  }
  function buildSide() {
    var h = '', keys = Object.keys(G.UITEXT.text);
    GROUPS.forEach(function (gr) {
      var list = keys.filter(function (k) { return k.split('.')[0] === gr[0]; });
      if (!list.length) return;
      h += '<div class="sec">' + gr[1] + '</div>';
      list.forEach(function (k) { h += row('text', k, LABEL[k] || k, gr[2]); });
    });
    h += '<div class="sec">모양 <small>크기·위치 px, 색</small></div>';
    STYLE.forEach(function (s) { if (G.UITEXT.style[s[0]] != null) h += row('style', s[0], s[1], s[2]); });
    $('side').innerHTML = h;
  }

  function setValue(id, raw) {
    var p = id.split(':'), kind = p[0], key = p[1], org = ORIG[kind][key];
    var v = typeof org === 'number' ? +raw : raw;
    if (typeof org === 'number' && isNaN(v)) return;
    G.UITEXT[kind][key] = v;
    G.applyUiText();
    S.dirty = true; status();
  }
  $('side').addEventListener('input', function (e) {
    var id = e.target.getAttribute('data-k');
    if (!id) return;
    setValue(id, e.target.value);
    var f = e.target.closest('.f'), p = id.split(':');
    f.classList.toggle('changed', JSON.stringify(G.UITEXT[p[0]][p[1]]) !== JSON.stringify(ORIG[p[0]][p[1]]));
    var sw = f.querySelector('.sw'); if (sw) sw.style.background = e.target.value;
    if (e.target.tagName === 'TEXTAREA') e.target.rows = rowsFor(e.target.value);
  });
  $('side').addEventListener('focusin', function (e) {   // 고치는 글자가 나오는 장면으로
    var f = e.target.closest('.f');
    if (!f) return;
    var sc = f.getAttribute('data-scene'), fk = f.getAttribute('data-fail');
    if (fk) S.failKey = fk;
    if (sc && sc !== S.scene) makeScene(sc);
  });
  $('side').addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-reset');
    if (!id) return;
    var p = id.split(':');
    G.UITEXT[p[0]][p[1]] = JSON.parse(JSON.stringify(ORIG[p[0]][p[1]]));
    G.applyUiText();
    S.dirty = true; status(); buildSide();
  });

  // ---------- 저장 · 불러오기 ----------
  function fileText() {
    function block(o) {
      return '{\n' + Object.keys(o).map(function (k) { return '    ' + JSON.stringify(k) + ': ' + JSON.stringify(o[k]); }).join(',\n') + '\n  }';
    }
    return '// 게임 화면 글자·UI 모양 (사용자 요청 2026-10-21: 게임에 나오는 UI와 텍스트를 직접 고칠 수 있게).\n' +
      '// tools/ui_editor.html 로 고쳐서 이 파일로 저장한다 (직접 고쳐도 됨). data.js 다음에 불러온다. 쓰는 함수(G.T 등)는 util.js\n' +
      '//   text: 화면에 나오는 글자. {이름} 자리에 숫자·이름이 들어감 (지우면 그 값이 안 나옴)\n' +
      '//   style: 글자 크기(px)·색·위치(게임 화면 1280×720 기준 px)\n' +
      'var G = G || {};\n\nG.UITEXT = {\n  text: ' + block(G.UITEXT.text) + ',\n  style: ' + block(G.UITEXT.style) + '\n};\n';
  }

  var LAST_KEY = 'stopsketch.uieditor.lastSave';
  function showLastSave() {
    var info = null;
    try { info = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) { /* 무시 */ }
    $('lastSave').textContent = info ? '최근 저장: ' + info.name + ' · ' + info.when + (info.how === 'download' ? ' (내려받기 폴더)' : '')
      : '최근 저장: 없음 (처음 저장할 때 stopsketch_swarm/src/uitext.js 를 고르세요)';
  }
  function noteSaved(name, how) {
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var when = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    try { localStorage.setItem(LAST_KEY, JSON.stringify({ name: name, when: when, how: how })); } catch (e) { /* 무시 */ }
    showLastSave();
  }
  function status(msg) {
    $('status').textContent = msg || (S.dirty ? '저장 안 됨' : '');
    $('status').className = S.dirty && !msg ? 'dirty' : '';
  }

  async function save(asNew) {
    var text = fileText();
    try {
      if (window.showSaveFilePicker) {
        if (!S.fileHandle || asNew) {
          S.fileHandle = await window.showSaveFilePicker({ id: 'stopsketch-uitext', suggestedName: 'uitext.js', types: [{ description: 'uitext.js', accept: { 'text/javascript': ['.js'] } }] });
        }
        if (S.fileHandle.queryPermission && (await S.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted' &&
            (await S.fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('저장 권한이 없어요');
        var w = await S.fileHandle.createWritable();
        await w.write(text); await w.close();
        S.dirty = false; status('저장함'); noteSaved(S.fileHandle.name, 'file');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      alert('저장 실패: ' + (err && err.message) + '\n저장 위치를 다시 골라 주세요.');
      S.fileHandle = null;
      return;
    }
    var a = document.createElement('a');            // 파일 저장 창을 못 쓰는 브라우저: 내려받기
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    a.download = 'uitext.js'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    S.dirty = false; status('내려받음 → stopsketch_swarm/src/uitext.js 에 덮어쓰세요'); noteSaved('uitext.js', 'download');
  }

  // 불러오기: uitext.js 의 G.UITEXT = {...} 부분을 읽음. 없는 칸은 지금 값 그대로
  $('file').addEventListener('change', function () {
    var f = this.files[0];
    if (!f) return;
    f.text().then(function (txt) {
      try {
        var o = JSON.parse(txt.slice(txt.indexOf('{', txt.indexOf('G.UITEXT')), txt.lastIndexOf('}') + 1).replace(/^\s*(text|style):/gm, '"$1":'));
        ['text', 'style'].forEach(function (k) { if (o[k]) for (var key in o[k]) G.UITEXT[k][key] = o[k][key]; });
        G.applyUiText(); S.dirty = true; S.fileHandle = null; buildSide(); status('불러옴: ' + f.name);
      } catch (err) { alert('불러오기 실패: ' + err.message); }
    });
    this.value = '';
  });

  document.querySelector('header').addEventListener('click', function (e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-act');
    if (a === 'save') save();
    else if (a === 'saveAs') save(true);
    else if (a === 'load') $('file').click();
    else if (a === 'resetAll' && confirm('모든 칸을 이 화면을 열 때 내용으로 되돌릴까요?')) {
      G.UITEXT.text = JSON.parse(JSON.stringify(ORIG.text)); G.UITEXT.style = JSON.parse(JSON.stringify(ORIG.style));
      G.applyUiText(); S.dirty = true; status(); buildSide();
    }
  });
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // 미리보기에서 결과 창 버튼을 끌어 옮기기 (사용자 요청 2026-10-21: 다시 하기·다음 스테이지 위치 조절). 마우스를 올리면 강조색
  function viewPt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1280 / r.width, y: (e.clientY - r.top) * 720 / r.height }; }
  //   버튼마다 자기 칸에 저장 (클리어·마지막 스테이지·실패의 다시 하기는 따로). 버튼 밖 바탕을 끌면 바탕 크기 (가운데 기준)
  cv.addEventListener('mousedown', function (e) {
    var p = viewPt(e), lay = S.game && G.UI.resultLayout(S.game);
    if (!lay) return;
    var b = hitPart(lay, p), st = G.UITEXT.style;   // 버튼 → 결과 창 안의 것(물방울 그림·별·글자·막대) 순서로
    if (b) S.btnDrag = { kx: b.keys[0], ky: b.keys[1], p: p, x: st[b.keys[0]], y: st[b.keys[1]] };
    else {
      var r = lay.panel;
      if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return;
      var f = S.game.status === 'fail', kw = f ? 'failPanelW' : 'resultPanelW', kh = f ? 'failPanelH' : 'resultPanelH';
      S.btnDrag = { size: true, kx: kw, ky: kh, p: p, x: st[kw], y: st[kh], sx: p.x < 640 ? -1 : 1, sy: p.y < 360 ? -1 : 1 };
    }
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    var p = viewPt(e);
    G.UI.hover(p.x, p.y); S.hoverPt = p;
    var d = S.btnDrag;
    if (!d) return;
    if (d.size) {                                   // 바탕 크기: 가운데에서 멀어지는 쪽으로 끌면 커짐
      G.UITEXT.style[d.kx] = Math.max(100, Math.round(d.x + (p.x - d.p.x) * 2 * d.sx));
      G.UITEXT.style[d.ky] = Math.max(100, Math.round(d.y + (p.y - d.p.y) * 2 * d.sy));
    } else {
      G.UITEXT.style[d.kx] = Math.round(d.x + p.x - d.p.x);
      G.UITEXT.style[d.ky] = Math.round(d.y + p.y - d.p.y);
    }
    S.dirty = true; status();
  });
  window.addEventListener('mouseup', function () { if (S.btnDrag) { S.btnDrag = null; buildSide(); } });
  function inR(p, q) { return p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h; }
  function hitPart(lay, p) {
    var b = lay.btns.filter(function (q) { return inR(p, q); })[0];
    if (b) return b;
    var parts = lay.parts.filter(function (q) { return inR(p, q); });
    return parts[parts.length - 1] || null;          // 나중에 그린(위에 있는) 것 먼저
  }
  // 미리보기: 마우스를 올린 것에 점선 상자 (끌 수 있는 것 표시)
  function drawHover() {
    var lay = S.game && G.UI.resultLayout(S.game), hp = S.hoverPt;
    if (!lay || !hp) return;
    var q = S.btnDrag && !S.btnDrag.size ? null : hitPart(lay, hp);
    if (!q) return;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = '#1F6FE0';
    ctx.strokeRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6); ctx.restore();
  }

  G.UIEditor = S; S.fileText = fileText;   // 디버그용
  showLastSave();
  buildSide();
  makeScene('run');
  requestAnimationFrame(frame);
})();
