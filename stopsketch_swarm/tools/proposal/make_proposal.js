// 스톱 앤 스케치 제안서 PPT 만들기
//   2026-10-22 처음 만듦 (grill me: 길목 대장간 제안서의 카드·번호 동그라미 구성 + 스케치북 톤, 구역·발표 노트 없음)
//   2026-10-23 사용자가 PowerPoint 로 고친 제안서를 기준 양식으로 함 (사용자 결정) — 업무가이드_통합.md 5-6 "스톱 앤 스케치 제안서 양식"
//     8장: 표지 → 개요 → 레퍼런스 게임 → 시장 → 진행 흐름 → 핵심 재미 네 가지 → 데모 스테이지 3개 → 개발 현황과 앞으로 필요한 것
//     (데모 시연은 발표 뒤 실제 게임으로. 물감 5색·무리 장과 시연 안내 장은 뺌)
// 사용: (이 폴더에서) npm install  →  node make_proposal.js [출력 경로]
//   기본 출력은 D:\stopsketch\스톱앤스케치_제안서_생성.pptx — 사용자가 고친 스톱앤스케치_제안서.pptx 를 덮어쓰지 않음
const path = require('path');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SHOT = (n) => path.join(ROOT, '데모제출', '2_대표이미지', n);
const IMG = (n) => path.join(__dirname, 'images', n);          // 사용자가 직접 찍어 넣은 표지·개요 그림 (2026-10-23 수정본에서 꺼냄)
const OUT = process.argv[2] || path.join(ROOT, '스톱앤스케치_제안서_생성.pptx');
const TODAY = new Date().toISOString().slice(0, 10);

const F = { head: 'Batang', body: 'Malgun Gothic' };
const C = {
  bg: 'FFFFFF', paper: 'FAF6EC', line: 'D8C8A4', text: '2B2118', muted: '7B6B57',
  black: '2B2118', red: 'E0312B', blue: '1F6FE0', green: '1FA655', yellow: 'C99A00', sky: '7FC8DC'
};
const W = 13.333, H = 7.5, M = 0.6;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = '스톱 앤 스케치 (가제) 신규 개발 제안';
pres.theme = { headFontFace: F.head, bodyFontFace: F.body };

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: C.bg },
  objects: [
    { text: { text: '스톱 앤 스케치 (가제) · 신규 개발 제안', options: { x: M, y: H - 0.42, w: 6, h: 0.3, fontFace: F.body, fontSize: 9, color: C.muted, margin: 0 } } },
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.32, w: W - 2 * M, h: 0.75, fontFace: F.head, fontSize: 28, bold: true, color: C.text, align: 'left', valign: 'middle', margin: 0 }, text: '' } }
  ],
  slideNumber: { x: W - M - 0.5, y: H - 0.42, w: 0.5, h: 0.3, fontFace: F.body, fontSize: 9, color: C.muted, align: 'right' }
});

// ── 그리기 도우미 ──
function card(s, x, y, w, h, opt) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: (opt && opt.fill) || C.paper },
    line: { color: (opt && opt.line) || C.line, width: (opt && opt.lineW) || 1 } });
}
function num(s, x, y, n, color, d) {
  d = d || 0.42;
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color } });
  s.addText(String(n), { x, y, w: d, h: d, fontFace: F.body, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
function t(s, text, o) {
  s.addText(text, Object.assign({ fontFace: F.body, fontSize: 14, color: C.text, margin: 0, valign: 'top', isTextBox: true }, o));
}
// 16:9 그림 + 테두리 (+ 짧은 장면 설명: "실제 데모 화면 ·" 같은 앞말 없이)
function shot(s, file, x, y, w, caption) {
  const h = w * 9 / 16;
  s.addImage({ path: file, x, y, w, h });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { type: 'none' }, line: { color: C.line, width: 1 } });
  if (caption) t(s, caption, { x, y: y + h + 0.06, w, h: 0.28, fontSize: 10, color: C.muted });
  return h;
}
function content(title) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  s.addText(title, { placeholder: 'title' });
  return s;
}

// ── 1. 표지 ──
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  const iw = 7.6, ih = iw * 9 / 16, ix = W - iw - 0.35, iy = (H - ih) / 2;
  s.addImage({ path: IMG('cover.png'), x: ix, y: iy, w: iw, h: ih });
  t(s, '신규 개발 제안 · HTML5 플레이어블 데모', { x: M, y: 1.3, w: 5, h: 0.35, fontSize: 12, color: C.blue, bold: true });
  t(s, '스톱 앤 스케치', { x: M, y: 1.75, w: 5.2, h: 1.0, fontFace: F.head, fontSize: 44, bold: true });
  t(s, 'Stop & Sketch (가제)', { x: M, y: 2.75, w: 5, h: 0.4, fontFace: F.head, fontSize: 16, italic: true, color: C.muted });
  t(s, '멈추고, 그리고,\n모두 데려가자.', { x: M, y: 3.5, w: 5, h: 1.1, fontFace: F.head, fontSize: 22 });
  t(s, '물리 그리기 퍼즐 액션 · 물방울 무리 이끌기\n웹 데모 스테이지 3개 · ' + TODAY, { x: M, y: 5.2, w: 5, h: 0.7, fontSize: 12, color: C.muted });
}

// ── 2. 개요 ──
{
  const s = content('개요');
  card(s, M, 1.3, W - 2 * M, 0.95);
  t(s, 'HIGH CONCEPT', { x: M + 0.3, y: 1.42, w: 3, h: 0.25, fontSize: 10, bold: true, color: C.blue });
  t(s, '시간을 멈추고 색 물감으로 길을 그려, 스스로 걷는 물방울 무리를 검은 잉크병까지 데려간다.', { x: M + 0.3, y: 1.7, w: W - 2 * M - 0.6, h: 0.4, fontFace: F.head, fontSize: 18 });
  const rows = [
    ['장르', '물리 그리기 퍼즐 액션 (2D 횡스크롤)'],
    ['플레이어', '그림으로 길을 만든다. 물방울은 스스로 걷고 벽에 도달하면 뒤로 돈다.'],
    ['목표', '주인공이 깨운 작은 물방울들을 최대한 많이 검은 잉크병에 데려가 정화한다.'],
    ['조작', '드래그 = 그리기 / 스페이스 = 시간 정지 / 우클릭 = 선 빨아들이기 / 1~5 = 물감'],
    ['플랫폼', 'PC 웹 (HTML 한 파일, 설치 없음)']
  ];
  s.addTable(rows.map(r => [
    { text: r[0], options: { bold: true, color: C.blue, fontSize: 12, fill: { color: C.paper } } },
    { text: r[1], options: { fontSize: 12, color: C.text } }
  ]), { x: M, y: 2.55, w: 6.6, colW: [1.2, 5.4], rowH: 0.6, fontFace: F.body, valign: 'middle', border: { type: 'solid', pt: 0.75, color: C.line }, margin: [0.04, 0.1, 0.04, 0.1] });
  shot(s, IMG('overview.png'), 7.55, 2.55, 5.18, '시간을 멈추고(파란 테두리) 빨간 선을 그리는 장면');
}

// ── 3. 레퍼런스 게임 ──
{
  const s = content('레퍼런스 게임');
  const head = ['', '커비 슈퍼 레인보우\n(Wii, 2015)', 'Lineguard\n(웹, 2026 공개)', '맥스 앤 더 매직 마커\n(PC, 2010)', '스톱 앤 스케치'];
  const rows = [
    ['캐릭터', '자동 이동 1명', '자동 달리기 1명', '직접 조종 1명', '자동 이동 n명 (주인공 + 따라오는 물방울)'],
    ['시간', '그리는 동안 흐름 (실시간)', '그리는 동안 느려짐', '완전히 멈춤 (횟수 제한 없음)', '완전히 멈춤 · 스테이지당 횟수 제한'],
    ['선·물감', '1종, 곧 사라짐', '5종 물리 성질, 몇 초 지속', '1종, 그린 물체에 중력, 회수', '5색 물리 성질 · 떨어지는 물체 · 빨아들여 회수'],
    ['결과', '도착 · 수집품(코인)', '도착 · 도달 거리', '도착 · 수집품(검은색 구) · 시간', '도착 · 물방울 수 · 별']
  ];
  const cell = (v, last) => ({ text: v, options: { fontSize: 11, color: C.text, bold: last, fill: { color: last ? 'EAF3FD' : 'FFFFFF' } } });
  const data = [head.map((h, i) => ({ text: h, options: { bold: true, fontSize: 11, color: i === 4 ? 'FFFFFF' : C.text, fill: { color: i === 4 ? C.blue : C.paper }, align: 'center' } }))]
    .concat(rows.map(r => r.map((v, i) => i === 0 ? { text: v, options: { bold: true, fontSize: 11, color: C.blue, fill: { color: C.paper } } } : cell(v, i === 4))));
  s.addTable(data, { x: M, y: 1.35, w: W - 2 * M, colW: [1.25, 2.45, 2.45, 2.45, 3.53], rowH: [0.62, 0.68, 0.68, 0.68, 0.68], fontFace: F.body, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line }, margin: [0.04, 0.1, 0.04, 0.1] });
  card(s, M, 5.0, W - 2 * M, 1.3, { fill: 'FFFFFF', line: C.blue, lineW: 1.5 });
  t(s, '차별성', { x: M + 0.3, y: 5.15, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.blue });
  t(s, [
    { text: '"그린 대로 움직인다"는 익숙한 재미 위에 ', options: {} },
    { text: '완전히 멈출 수 있는 횟수', options: { bold: true } }, { text: '와 ', options: {} },
    { text: '색마다 다른 물리 성질', options: { bold: true } }, { text: '을 얹고, 한 마리가 아니라 ', options: {} },
    { text: '따라오는 물방울들', options: { bold: true } }, { text: '을 데려감. 멈춘 순간 어떤 색을 어디에 그릴지가 곧 물방울들의 운명이 된다.', options: {} }
  ], { x: M + 0.3, y: 5.48, w: W - 2 * M - 0.6, h: 0.7, fontSize: 14 });
}

// ── 4. 시장 ──
{
  const s = content('시장 : 선을 그리고 물리로 움직이는 게임은 꾸준히 팔렸다');
  const stats = [
    ['약 130만 장', '커비 캔버스 커스 + 후속', '1편 약 72만 · 후속 약 58만 (추정)', C.red],
    ['350만 장', 'Drawn to Life 시리즈', '그린 것이 게임 속 물체가 되는 플랫포머', C.blue],
    ['66만 다운로드', 'Draw a Stickman: EPIC', '출시 한 달 (개발사 발표)', C.green],
    ['55.7만 평가', 'Love Balls', 'App Store 평가 수 · "선을 그리면 물리로"', C.yellow]
  ];
  stats.forEach((st, i) => {
    const x = M + (i % 2) * 3.3, y = 1.35 + Math.floor(i / 2) * 2.45;
    card(s, x, y, 3.1, 2.25);
    t(s, st[0], { x: x + 0.25, y: y + 0.35, w: 2.7, h: 0.7, fontFace: F.head, fontSize: 28, bold: true, color: st[3] });
    t(s, st[1], { x: x + 0.25, y: y + 1.2, w: 2.7, h: 0.35, fontSize: 13, bold: true });
    t(s, st[2], { x: x + 0.25, y: y + 1.6, w: 2.7, h: 0.5, fontSize: 11, color: C.muted });
  });
  const rx = M + 6.75, rw = W - M - rx;
  card(s, rx, 1.35, rw, 1.95, { fill: 'FFFFFF', line: C.blue, lineW: 1.5 });
  t(s, '전략', { x: rx + 0.3, y: 1.5, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.blue });
  t(s, '"그린 대로 움직인다"는 장면은 설명 없이 바로 통하고, 숏폼으로 퍼지기 좋다. 여기에 멈춤 · 색 성질 · 무리를 얹어 짧은 판을 반복하는 PC 캐주얼 퍼즐로 간다.', { x: rx + 0.3, y: 1.88, w: rw - 0.6, h: 1.3, fontSize: 13 });
  card(s, rx, 3.5, rw, 2.7);
  t(s, '한계와 대응', { x: rx + 0.3, y: 3.65, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.red });
  t(s, [
    { text: '큰 성과는 2005~2012년 작품과 닌텐도 IP·모바일 시장의 것', options: { bullet: true, breakLine: true } },
    { text: '최근 PC·웹 신작(Draw · Inkrunner · Lineguard)은 평가는 좋지만 규모가 작음', options: { bullet: true, breakLine: true } },
    { text: '최근작들의 약점은 단조로움 → 짧은 스테이지마다 새로운 색과 장치들을 조합', options: { bullet: true } }
  ], { x: rx + 0.3, y: 4.03, w: rw - 0.6, h: 2.0, fontSize: 13, paraSpaceAfter: 6 });
}

// ── 5. 진행 흐름 ──
{
  const s = content('진행 흐름');
  const steps = [
    ['멈추고 그리기', '01_시간정지_색골라그리기.png', '스페이스로 멈추고 색을 골라 그린다. 재생하면 선에 물리법칙이 적용 된다', '"어디에 어떻게 그릴까"', C.blue],
    ['함께 움직이면서 별을 획득', '06_줄지어_튕겨올라_공중물방울_깨우기.png', '잠든 물방울들을 깨워서 합류 시키고 별을 획득하러 같이 이동한다', '"퍼즐을 풀어 별을 획득"', C.red],
    ['검은 잉크병에 데려가기', '07_검은잉크병_정화.png', '주인공이 도착하면 물방울들이 차례로 뛰어들고 병이 정화돼서 맑아진다', '"몇 마리나 왔지"', C.green],
    ['결과 · 재도전', '08_결과창_별3_정화100.png', '결과 : 별 n/3, 정화 n%.\n별 3개와 정화 100%를 목표로 다시 도전한다.', '"한 번 더"', C.yellow]
  ];
  const cw = (W - 2 * M - 3 * 0.25) / 4;
  steps.forEach((st, i) => {
    const x = M + i * (cw + 0.25), y = 1.5;
    num(s, x, y, i + 1, st[4], 0.36);
    t(s, st[0], { x: x + 0.45, y: y + 0.02, w: cw - 0.45, h: 0.34, fontSize: 14, bold: true });
    const h = shot(s, SHOT(st[1]), x, y + 0.5, cw);
    t(s, st[2], { x, y: y + 0.6 + h, w: cw, h: 0.75, fontSize: 13 });
    card(s, x, y + 1.45 + h, cw, 0.6);
    t(s, st[3], { x, y: y + 1.45 + h, w: cw, h: 0.6, fontSize: 13, fontFace: F.head, align: 'center', valign: 'middle', color: C.muted });
  });
}

// ── 6. 핵심 재미 네 가지 ──
{
  const s = content('핵심 재미 네 가지');
  const items = [
    ['어디서 멈출까', '시간을 완전히 멈출 수 있는 횟수가 정해져 있다. 진행하다 멈춰서 설계하는 전략.', C.blue],
    ['색마다 다른 성질', '검정 다리 · 빨강 튕김 · 파랑 가속 · 초록 엘리베이터 · 노랑 지우개. 상황에 맞는 성질을 골라 쓴다', C.red],
    ['그린 선의 물리 반응', '선은 떨어지고 걸쳐진다. "어디에 걸쳐야 버틸까"를 생각하고, 다 쓴 선은 빨아들여 다시 쓴다', C.green],
    ['무리를 지키는 긴장', '주인공만 도착해도 클리어 하지만 많이 데려갈수록 잉크병이 맑아지고 클리어 보상이 늘어난다', C.yellow]
  ];
  const cw = (W - 2 * M - 3 * 0.3) / 4;
  items.forEach((it, i) => {
    const x = M + i * (cw + 0.3), y = 1.45;
    card(s, x, y, cw, 3.2);
    num(s, x + 0.25, y + 0.3, i + 1, it[2]);
    t(s, it[0], { x: x + 0.25, y: y + 0.9, w: cw - 0.5, h: 0.5, fontFace: F.head, fontSize: 18, bold: true });
    t(s, it[1], { x: x + 0.25, y: y + 1.5, w: cw - 0.5, h: 1.6, fontSize: 14 });
  });
  card(s, M, 4.95, W - 2 * M, 0.95, { fill: 'FFFFFF' });
  t(s, [
    { text: '요약   ', options: { bold: true, color: C.blue } },
    { text: '멈추고, 색을 골라 그린 길로, 물방울 무리를 최대한 많이 데려간다.', options: { fontFace: F.head } }
  ], { x: M + 0.3, y: 4.95, w: W - 2 * M - 0.6, h: 0.95, fontSize: 17, valign: 'middle' });
}

// ── 7. 데모 스테이지 3개 ──
{
  const s = content('데모 스테이지 3개');
  const st = [
    ['스테이지 1', [C.black, C.red, C.blue], '검정 · 빨강 · 파랑', ['검정 다리로 틈 건너기', '빨강으로 튕겨 벽 넘기', '가시 구덩이를 선으로 덮기', '파랑으로 가파른 비탈 오르기'], '작은 물방울 6 · 별 3'],
    ['스테이지 2', [C.black, C.green, C.yellow], '검정 · 초록 · 노랑', ['초록 엘리베이터로 구덩이 탈출', '노랑으로 결정 막대 지우기', 'U자 초록 컵으로 공중 별', '되돌아오지 못하게 막는 턱'], '작은 물방울 6 · 별 3'],
    ['스테이지 3', [C.black, C.red, C.blue, C.green, C.yellow], '5색 모두', ['발사기 3개를 같은 색으로 막기', '파랑 + 빨강으로 절벽 뛰기', '떨어지며 물방울 · 정지 +1 줍기', '아래 통로 · 공중 물방울'], '작은 물방울 10 · 별 3']
  ];
  const cw = (W - 2 * M - 2 * 0.35) / 3;
  st.forEach((c, i) => {
    const x = M + i * (cw + 0.35), y = 1.4;
    card(s, x, y, cw, 3.75);
    num(s, x + 0.3, y + 0.3, i + 1, C.text);
    t(s, c[0], { x: x + 0.85, y: y + 0.3, w: cw - 1.1, h: 0.42, fontFace: F.head, fontSize: 20, bold: true, valign: 'middle' });
    c[1].forEach((col, k) => s.addShape(pres.shapes.OVAL, { x: x + 0.3 + k * 0.32, y: y + 1.0, w: 0.24, h: 0.24, fill: { color: col }, line: { color: col } }));
    t(s, c[2], { x: x + 0.3 + c[1].length * 0.32 + 0.1, y: y + 0.98, w: 2.5, h: 0.3, fontSize: 12, color: C.muted });
    t(s, c[3].map((v, k) => ({ text: v, options: { bullet: true, breakLine: k < c[3].length - 1 } })), { x: x + 0.3, y: y + 1.5, w: cw - 0.6, h: 1.65, fontSize: 14, paraSpaceAfter: 6 });
    t(s, c[4], { x: x + 0.3, y: y + 3.2, w: cw - 0.6, h: 0.35, fontSize: 12, bold: true, color: C.blue });
  });
}

// ── 8. 개발 현황과 앞으로 필요한 것 ──
{
  const s = content('개발 현황과 앞으로 필요한 것');
  card(s, M, 1.35, 6.2, 5.0);
  t(s, '데모 4일 (2026-10-19 ~ 22)', { x: M + 0.3, y: 1.5, w: 5.6, h: 0.32, fontSize: 13, bold: true, color: C.blue });
  const tl = [
    ['10-19', '한 마리 버전: 자동 달리기 · 선 물리 · 완전 정지 · 색 3종 · 레벨 툴'],
    ['10-20', '물방울 무리 방식으로 전환: 떨어지는 선 · 빨아들이기 · 5색 · 대열 · 정화'],
    ['10-21', '레벨 툴 확장 · UI 글자 툴 · 비탈 규칙 · 일시 정지 · 스테이지 1·2 제작'],
    ['10-22', '발사기(색 투사체) · 스테이지 3 제작 · 플레이 테스트']
  ];
  s.addShape(pres.shapes.LINE, { x: M + 0.52, y: 2.15, w: 0, h: 3.6, line: { color: C.line, width: 2 } });
  tl.forEach((r, i) => {
    const y = 2.0 + i * 1.0;
    s.addShape(pres.shapes.OVAL, { x: M + 0.4, y: y + 0.05, w: 0.24, h: 0.24, fill: { color: i === tl.length - 1 ? C.blue : 'FFFFFF' }, line: { color: C.blue, width: 1.5 } });
    t(s, r[0], { x: M + 0.85, y, w: 0.8, h: 0.32, fontSize: 12, bold: true });
    t(s, r[1], { x: M + 1.65, y, w: 4.4, h: 0.8, fontSize: 12 });
  });
  const rx = M + 6.5, rw = W - M - rx;
  card(s, rx, 1.35, rw, 2.35, { fill: 'FFFFFF', line: C.blue, lineW: 1.5 });
  t(s, '필요한 인력 (가안)', { x: rx + 0.3, y: 1.5, w: rw - 0.6, h: 0.32, fontSize: 13, bold: true, color: C.blue });
  const ppl = [['기획 · 레벨', '퍼즐 스테이지 설계를 겸함'], ['클라이언트', '물리 · 무리 이동 · 레벨 툴'], ['아트 · UI', '손그림 아트 · 연출']];
  ppl.forEach((p, i) => {
    const y = 1.95 + i * 0.55;
    num(s, rx + 0.3, y, i + 1, [C.red, C.blue, C.green][i], 0.36);
    t(s, [{ text: p[0], options: { bold: true } }, { text: '   ' + p[1], options: { color: C.muted, fontSize: 11 } }], { x: rx + 0.8, y: y + 0.02, w: rw - 1.1, h: 0.36, fontSize: 13, valign: 'middle' });
  });
  card(s, rx, 3.95, rw, 2.4);
  t(s, '다음 단계: 스테이지 · 장치 늘리기', { x: rx + 0.3, y: 4.1, w: rw - 0.6, h: 0.32, fontSize: 13, bold: true, color: C.green });
  t(s, [
    { text: '레벨 툴로 스테이지를 늘리고, 색 조합 퍼즐을 다양하게', options: { bullet: true, breakLine: true } },
    { text: '새 장치 검토: 체크포인트 · 새 프랍 · 색 투사체 변형', options: { bullet: true } }
  ], { x: rx + 0.3, y: 4.5, w: rw - 0.6, h: 1.7, fontSize: 13, paraSpaceAfter: 6 });
}

pres.writeFile({ fileName: OUT }).then(f => console.log('저장:', f));
