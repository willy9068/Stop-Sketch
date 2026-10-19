// 스톱 앤 스케치 (가제, 구 잉크 런) — 모든 수치는 이 파일 한 곳에 모은다.
// 단위: 거리 px, 시간은 따로 적지 않으면 ms. 속도는 "1스텝(1/60초)당 px".
var G = G || {};

G.DATA = {
  version: 1,
  seed: 20261019,

  // 캐릭터를 오른쪽으로 갈 때 화면 30%, 왼쪽으로 갈 때 70% 지점에 둔다 (가는 쪽을 넓게 보여 줌)
  view: { w: 1280, h: 720, playerScreenX: 0.3, playerScreenXBack: 0.7 },

  loop: { stepMs: 1000 / 60, maxStepsPerFrame: 5 },

  physics: {
    gravityY: 1,           // Matter.js 기본 중력 배율
    failY: 1100            // 땅 높이 600 기준, 이 아래로 떨어지면 실패 (가장 낮은 땅에 맞춰 함께 내려감)
  },

  player: {
    radius: 22,
    runSpeed: 5.2,         // 목표 달리기 속도 (스텝당 px, 약 312px/초)
    accel: 0.12,           // 바닥에 있을 때 목표 속도로 다가가는 비율 (0~1)
                           // 점프는 없음 (사용자 결정 2026-10-19: 그림으로만 조작)
    groundCheck: 0.45,     // 접촉점이 몸 중심보다 반지름 × 이 값 이상 아래면 "바닥", 그보다 위면 "벽"
                           //   → 약 63°보다 가파른 선은 벽으로 취급
    stepUp: 16,            // 이 높이(px) 이하의 턱은 벽이 아니라 넘어가는 턱 (선 끝과 바닥 이음매 등)
    turnCooldownMs: 250,   // 벽에 부딪혀 뒤로 돈 뒤 다시 돌 수 있기까지 (떨림 방지)
    stuckMs: 3500          // 이 시간 동안 거의 안 움직이면 "막혔다" 안내
  },

  stop: {
    perSection: 3          // 구간당 정지 횟수
  },

  // 시간 정지 방식 (사용자 결정 2026-10-19: A 완전 정지로 확정 — 지우개 추격·실시간 그리기 등 압박 장치가 많아서).
  // B·C 는 비교용으로만 남김 (Q/W/E 키, 저장하지 않음 → 열 때마다 A). scale = 정지 중 시간 배율
  timeModes: {
    A: { name: 'A. 완전 정지', scale: 0, limitMs: 0, activateOnStrokeEnd: false },
    B: { name: 'B. 슬로 모션', scale: 0.3, limitMs: 0, activateOnStrokeEnd: true },
    C: { name: 'C. 정지 + 3초 제한', scale: 0, limitMs: 3000, activateOnStrokeEnd: false }
  },
  defaultTimeMode: 'A',

  // 잉크 (사용자 결정 2026-10-19): 모든 색이 같은 잉크를 씀 / 발판 선이 사라지면 그만큼 돌려받음 /
  // 잉크 병을 먹으면 최대량이 계정에 영구히 늘어남 / 잉크 웅덩이에 닿아 있으면 줄어듦
  ink: {
    max: 1800,             // 구간 기본 잉크 최대량 (선 길이 px). 구간마다 levels.js 의 ink 로 바꿀 수 있음
    upAmount: 300,         // 잉크 병 하나당 최대량 증가 (계정에 저장, 영구)
    drainPerSec: 400,      // 잉크 웅덩이에 닿아 있는 동안 초당 줄어드는 양
    sampleDist: 8,         // 마우스 점을 이 거리마다 하나씩 기록
    minStrokeLen: 30,      // 이보다 짧은 선은 취소하고 잉크를 돌려준다
    maxStrokeLen: 700,     // 한 번에 그릴 수 있는 최대 길이 (한 번에 잉크 전부 쓰기 방지)
    smoothPasses: 2,       // 평활화 횟수
    lifeMs: 5000,          // 선이 발판이 된 뒤 사라지기까지 (게임 시간: 완전 정지 중에는 줄지 않음, 슬로 모션은 천천히)
    fadeMs: 1200,          // 사라지기 전 이 시간 동안 점점 흐려짐 (경고)
    thickness: 8,          // 선 두께 (물리 바디도 같은 두께)
    friction: 0            // 선 표면 마찰 (캐릭터는 속도를 직접 제어)
  },

  // 색 잉크 (사용자 결정 2026-10-19): 3색 모두 데모에 넣음. 고르기: 아래 병 클릭 / 마우스 휠 / 키 1·2·3
  //   빨강 = 밟으면 선과 수직 방향으로 튕김, 파랑 = 밟는 동안·내린 뒤 잠시 빨라짐, 초록 = 보통 발판 + 투사체를 막음
  //   (빨강·파랑 선은 투사체가 그냥 지나감). 구간마다 쓸 수 있는 색은 levels.js 의 inks
  inks: {
    order: ['red', 'blue', 'green'],                        // 키 1/2/3, 아래 병 순서
    red:   { name: '빨강 · 튕김' },
    blue:  { name: '파랑 · 가속' },
    green: { name: '초록 · 막기' }
  },
  // 색 효과 세기 기본값. 구간마다 levels.js 의 fx 로 바꿈 (레벨 툴 "구간 설정 → 색 효과 세기")
  //   bounce: 빨강에서 튕기는 속도 (스텝당 px, 15 ≈ 약 400px 높이) / boostPct: 파랑 위 달리기 속도 % / boostMs: 파랑에서 내린 뒤 빠른 상태 유지
  inkFx: { bounce: 15, boostPct: 190, boostMs: 1200 },
  bounceCdMs: 250,         // 한 번 튕긴 뒤 다시 튕길 수 있기까지 (같은 선에서 두 번 튕김 방지)

  // 투사체 (발사기 프랍이 쏨). 직선으로 날아가고 중력 없음. 초록 선·땅·벽에 닿으면 사라지고, 캐릭터에 닿으면 실패
  projectile: { radius: 13, lifeMs: 7000 },

  // 색 (아트 문서 1-1 팔레트와 같은 값)
  colors: {
    paper: '#F3E9D2',
    outline: '#2B2118',
    ground: '#C9B48A',
    player: '#7FD0E8',
    ink: '#2B2118',
    inkPending: 'rgba(43,33,24,0.45)',
    red: '#E0312B', blue: '#1F6FE0', green: '#1FA655',
    star: '#F5C518',
    stopTint: 'rgba(31,111,224,0.10)',
    goal: '#1FA655'
  },

  // 구간(레벨) 배치는 src/levels.js (tools/level_editor.html 로 편집)
  level: {
    groundDepth: 400,      // 땅 블록 두께 (아래로)
    starsPerLevel: 3,      // 권장 별 개수 (레벨 툴 검사용)
    starPickup: 0.45,      // 별·잉크 병 크기 × 이 값 + 캐릭터 반지름 안에 들어오면 획득
    // 클리어 평가 기본 조건 (구간마다 levels.js 의 rate 로 바꿈). 만족한 조건 수 = 별 0~3
    rate: { timeSec: 60, allStars: true, maxTries: 3 }
  },

  // 프랍 종류. 위치 x,y 는 벽·발판은 왼쪽 위, 별·장식·글자는 가운데(글자는 왼쪽 기준선)
  // imgs: [이미지 이름, 그리는 방식] 순서대로 있는 것을 쓴다. 방식: nine(9분할 늘이기) / stack(세로로 쌓기) / fit(비율 유지)
  props: {
    wall:     { name: '벽',   solid: true, box: true, w: 60, h: 150, color: '#B8A47C',
                imgs: [['prop_wall', 'nine'], ['obs_wall', 'stack']] },
    platform: { name: '발판', solid: true, box: true, w: 220, h: 28, color: '#B8A47C',
                imgs: [['prop_platform', 'nine']] },
    star:     { name: '별',   collect: true, size: 56, imgs: [['star_full', 'fit']] },        // 점수용 수집품 (클리어 조건)
    inkup:    { name: '잉크 병', collect: true, size: 60, imgs: [['item_ink', 'fit']] },     // 성장용: 먹으면 잉크 최대량 영구 증가
    drain:    { name: '잉크 웅덩이', box: true, w: 160, h: 14, color: '#3B2A4A',              // 닿아 있으면 잉크가 줄어듦 (충돌 없음)
                imgs: [['prop_drain', 'nine']] },
    // 발사기: 정해진 간격으로 angle(도, 0=오른쪽 90=아래 180=왼쪽) 방향으로 투사체를 쏨. 몸체는 벽처럼 단단함
    shooter:  { name: '발사기', solid: true, box: true, w: 70, h: 70, color: '#5B5560',
                angle: 180, periodMs: 2000, speed: 5, imgs: [['obs_shooter', 'fit']] },
    deco:     { name: '장식', size: 180, img: 'deco_cloud_1' },     // 충돌 없음, 그림만
    text:     { name: '글자', size: 20, text: '안내 문구' }          // 충돌 없음
  },

  // 이미지: stopsketch/assets/<이름>.png 가 있으면 자동으로 쓰고, 없으면 색 블록으로 그린다.
  // 이름은 스톱앤스케치_AI이미지_프롬프트_ComfyUI.md 파일명과 같다.
  // (개발본에서 아직 없는 이미지는 콘솔에 404로 남지만 게임에는 영향 없음. 제출본에는 있는 것만 들어감)
  art: {
    dir: '../assets/',
    images: [
      'bg_a', 'bg_b', 'bg_plain',
      'char_idle', 'char_run', 'char_jump', 'char_fall', 'char_erased',
      'ground_top', 'ground_fill',
      'prop_wall', 'obs_wall', 'prop_platform', 'star_full', 'item_ink', 'prop_drain',   // goal_flag 은 물감 통으로 바뀌어 안 씀
      'deco_cloud_1', 'deco_cloud_2', 'deco_cloud_3',
      'ui_stop_on', 'ui_gauge_frame', 'ui_panel', 'fx_star_pop', 'fx_land',
      // 4차 (아직 없으면 코드로 그린 임시 모양): 시작 구멍, 도착 물감 통(빈/찬), 색 잉크 병, 선반, 발사기·투사체, 색 효과, 도착 캐릭터
      'start_hole', 'goal_jar_empty', 'goal_jar_full', 'ink_red', 'ink_blue', 'ink_green', 'ink_select', 'ui_shelf',
      'obs_shooter', 'proj', 'fx_bounce', 'fx_boost', 'fx_block', 'char_goal', 'star_empty'
    ],
    backgrounds: { bg_a: '종이 + 구름', bg_b: '줄 노트', bg_plain: '빈 종이', none: '단색 종이' },
    decos: ['deco_cloud_1', 'deco_cloud_2', 'deco_cloud_3'],
    charSize: 3.2,         // 캐릭터 이미지 한 변 = 반지름 × 이 값 (물방울 몸통 폭이 이미지의 약 62% → 충돌 원 지름과 맞춤)
    airVy: 1.5,            // 공중에서 세로 속도가 이보다 크면 튀어 오름(char_jump) / 떨어짐(char_fall) 그림
    bgParallax: 0.5,       // 배경이 카메라보다 느리게 움직이는 비율
    groundTop: { h: 48, up: 14 },   // ground_top 띠 높이와 땅 윗면 위로 올라오는 정도
    // ground_fill 위에 덧입히는 색 (2차 ground_fill 이 거의 흰색이라 틈과 구분이 안 돼서 임시 보정. 진한 땅 무늬로 바꾸면 null)
    groundTint: null,      // 4차 ground_fill 이 충분히 진해서 덧칠 끔 (예전: 'rgba(201,180,138,0.55)')
    // 9분할 이미지의 테두리 폭: 원본 px(src) → 화면 px(dst). dst/src 가 무늬 배율 (가운데는 이 배율로 반복)
    //   prop_wall: 256px 벽돌 한 장이 약 91px로 보임 / prop_platform: 높이 64px 나무판이 기본 높이 28px에 꼭 맞음
    slices: { prop_wall: { src: 14, dst: 5 }, prop_platform: { src: 8, dst: 3.5 }, prop_drain: { src: 16, dst: 6 } },
    fx: { starPopMs: 450, landMs: 350, landVy: 6, inkMs: 400 },   // inkMs: 튕김·가속·막기 효과 시간
    startHole: { size: 190, up: 70 },   // 시작 구멍: 한 변 크기, 가운데가 땅 윗면에서 올라간 높이 (캐릭터 뒤에 그림)
    goalJar: { w: 150, h: 170, fillMs: 900 },  // 도착 물감 통 크기 (왼쪽 끝 = 도착 x, 바닥 = 땅). 도착하면 fillMs 동안 차오름, 그 뒤 결과 쪽지
    shelf: { h: 84, slot: 74, x: 16, bottle: 64 },   // 아래 잉크 병 선반 (화면 왼쪽 아래)   // 별 반짝·착지 먼지 시간, 이 세로 속도 이상으로 떨어져 닿으면 먼지
    wallCrop: [5, 32, 247, 193],  // obs_wall.png 에서 실제 돌이 있는 영역 [x, y, 폭, 높이] (이미지를 바꾸면 다시 잼)
    // ui_panel.png 안쪽이 투명할 때만 이 외곽 다각형대로 종이색을 먼저 깐다. 2차 이미지는 안쪽이 불투명해서 필요 없음(null)
    panelHull: null
  },

  // 계정 저장 (이 브라우저의 localStorage). oldKeys 는 이름을 바꾸기 전 저장을 한 번 옮겨 오기 위한 것
  save: {
    key: 'stopsketch.save.v1', oldKeys: ['inkrun.save.v1'],
    editorDraftKey: 'stopsketch.editor.draft.v1', oldEditorDraftKeys: ['inkrun.editor.draft.v1']
  }
};
