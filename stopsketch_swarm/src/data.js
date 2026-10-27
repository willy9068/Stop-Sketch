// 스톱 앤 스케치 — 물방울 무리 시험판 (2026-10-20). 모든 수치는 이 파일 한 곳에 모은다.
// 기존 데모(stopsketch/)와 따로 돌아간다. 이미지는 기존 데모의 stopsketch/assets 를 같이 쓴다.
// 단위: 거리 px, 시간은 따로 적지 않으면 ms. 속도는 "1스텝(1/60초)당 px".
var G = G || {};

G.DATA = {
  version: 1,
  seed: 20261020,

  view: { w: 1280, h: 720 },

  loop: { stepMs: 1000 / 60, maxStepsPerFrame: 5 },

  physics: {
    gravityY: 1,           // Matter.js 기본 중력 배율
    failY: 1100            // 가장 낮은 땅 600 기준, 이 아래로 떨어지면 죽음 (가장 낮은 땅에 맞춰 함께 내려감)
  },

  // 물방울 (사용자 결정 2026-10-20): 주인공 1 + 길 위·우리 안에 잠든 작은 물방울. 모두 레밍즈처럼 자동으로 걷고 벽에서 뒤로 돎
  //   작은 물방울은 크기만 다름. 물방울끼리는 서로 통과
  drop: {
    heroRadius: 22,
    smallRadius: 13,
    runSpeed: 5.2,         // 걷는 속도 기본값 (스텝당 px). 스테이지마다 levels.js drops.heroSpeed / smallSpeed 로 바꿈 (레벨 툴)
    collide: false,        // 물방울끼리 부딪히는가 기본값 (사용자 결정 2026-10-20: 서로 통과). 스테이지마다 drops.collide 로 켬 (레벨 툴)
    accel: 0.12,           // 바닥에 있을 때 목표 속도로 다가가는 비율
    climbAccel: 0.5,       // 오르막·턱에서 바닥 면을 따라가는 속도를 맞추는 비율 (크면 멈칫 없이 타고 오름)
    groundCheck: 0.45,     // 접촉점이 중심보다 반지름 × 이 값 이상 아래면 "바닥"
    stepUp: 16,            // 이 높이 이하의 턱은 넘어감 (작은 물방울은 반지름 비율로 줄이되 stepUpMin 보다 작지 않게)
    stepUpMin: 12,         //   쓰러진 배치된 선(두께 10)을 작은 물방울도 넘어가게
    // 낮은 턱 살짝 점프 (사용자 요청 2026-10-23: 애매하게 낮은 턱에서 억울하게 되돌아가지 않게)
    //   stepUp 보다 높고 up 이하인 턱(작은 물방울은 반지름 비율로 줄이되 minUp 보다 작지 않게) 앞에서는 되돌아서지 않고 그 높이 + extra 만큼 뛰어 넘음
    //   위가 막혀 있으면(천장·더 높은 벽) 뛰지 않고 되돌아섬. cdMs: 뛴 뒤 이만큼은 벽 판정으로 되돌아서지 않음. probe: 앞을 살피는 거리 px
    //   clear: 턱 위가 비었는지 앞 옆면부터 반지름 × 이만큼 훑음
    //   (사용자 결정 2026-10-25: 실수로 평지보다 살짝 높게 그린 선에서 되돌아가지 않게 하는 정도만. up 30 → 22, minUp 20 → 16)
    hop: { up: 22, minUp: 16, extra: 6, cdMs: 400, probe: 4, clear: 1.5 },
    turnCooldownMs: 250,
    wakeReach: 1.4,        // 잠든 물방울과 걷는 물방울 중심 거리가 (두 반지름 합 × 이 값) 안이면 깨어나 합류
    pinchMs: 120,          // 위·아래로 이만큼 끼어 있으면 가까운 옆으로 밀어냄 (끼여서 죽지 않음, 사용자 결정 2026-10-20)
    density: 0.0006,       // 선보다 훨씬 가볍게 (선이 물방울에 거의 밀리지 않게)
    // 오르막 속도 (사용자 결정 2026-10-21): 10도 이하 그대로 · 20도 이하 75% · 30도 이하 50%. 31도 이상은 스스로 오르는 힘이 없음 →
    //   중력에 더해 (각도 − 30)/10 × steepDrag 만큼 스텝마다 더 느려져 결국 미끄러져 내려옴 → 미끄러지기 시작하면 반대 방향으로 감 (파랑 가속·빨강 튕김 등 도움이 있어야 넘음)
    //   내리막은 그대로. 바닥으로 보는 각도는 약 63도까지(groundCheck), 그보다 가파르면 벽처럼 되돌아섬(주인공 약 74도·작은 물방울 약 86도)
    //   boostBonus: 파랑 가속 중에는 비탈을 이 각도만큼 완만하게 침 (35도 → 10도처럼). 60도 넘으면 가속해도 못 오름
    //   minEdge: 밟은 면의 모서리가 이보다 짧으면 비탈이 아니라 턱·모서리로 봄 (선의 둥근 끝에서 멈추지 않게)
    slope: { steps: [[10, 1], [20, 0.75], [30, 0.5]], steepDrag: 0.03, boostBonus: 25, minEdge: 20 },
    // 대열 (사용자 결정 2026-10-20): 주인공이 깨운 물방울은 오리 새끼처럼 주인공이 지나간 길(발자국)을 그대로 따라옴.
    //   주인공이 지나간 뒤 생긴 물리 영향(새로 그린 선·떨어지는 선에 밀림, 발밑 바닥이 사라짐)을 받으면 이탈 → 혼자 걷기.
    //   혼자 걷는 물방울이 주인공에 닿으면 다시 대열 끝에 붙음. 켬/끔·간격은 스테이지마다 drops.follow / drops.gap (레벨 툴)
    follow: {
      on: true,
      gap: 32,             // 대열 간격 (발자국 길이 px)
      catchUp: 0.25,       // 자리가 앞으로 당겨질 때 따라붙는 비율 (스텝당)
      breakDist: 12,       // 한 스텝에 이만큼 밀리면 바로 이탈
      nudgeDist: 3,        //   이만큼 밀린 상태가
      nudgeSteps: 6,       //   이 스텝 동안 이어지면 이탈 (떨어지는 선에 천천히 밀릴 때)
      unsupportedSteps: 12,// 주인공은 바닥에 있었는데 대열 물방울 발밑에 바닥이 이 스텝 동안 없으면 이탈 (다리가 떨어짐)
      supportTol: 16,       //   발밑 바닥 찾는 거리 (반지름 + 이 값)
      wakeMs: 500,         // 깨어나는 모션 (기지개·흔들기)
      hopMs: 400,          // 대열 끝자리로 통 튀어 붙는 시간
      hopHeight: 70,
      rejoinReach: 1.15,   // 혼자 걷는 물방울과 주인공 중심 거리가 (두 반지름 합 × 이 값) 안이면 다시 합류
      rejoinCdMs: 600,     //   단, 바닥에 선 채로, 이탈하고 이만큼 지난 뒤에만 (사용자 요청 2026-10-20: 다리를 지우면 공중에서 다시 붙어 따라가던 문제)
      // 발밑 바닥이 사라지면 이탈하지 않고 대열에 남은 채 떨어짐 (사용자 결정 2026-10-21, grill me): 실제 물리로 낙하(옆 속도 유지) →
      //   착지하면 그 자리에서 기다리다, 대열 자기 자리가 바닥 있는 곳이 되면 통 튀어 복귀. 떨어지는 도중 옆으로 부딪히거나 빨강에 튕기면 이탈
      fallPush: 1.2,       // 떨어지는 중 한 스텝에 옆 속도가 이만큼 바뀌면 = 옆으로 부딪힘 → 이탈
      fallUp: 0.6,         // 떨어지는 중 한 스텝에 위로 이만큼 밀리면(중력 반대) → 이탈
      returnHop: { msPerPx: 1.5, maxMs: 1000, hPerPx: 0.3, maxH: 260 }   // 자리로 복귀 폴짝: 가까우면 hopMs·hopHeight, 멀수록 길고 높게
    }
  },

  // 잉크병에 들어가기 (사용자 요청 2026-10-20): 닿은 순서대로 병 앞에 줄 서고, 맨 앞부터 gapMs 마다 하나씩 enterMs 동안 입구로 뛰어듦.
  //   병은 들어간 만큼 jarFadePerSec 속도로 서서히 밝아짐
  // 치트키 (사용자 요청 2026-10-27): ` 키로 켜고 끔. 제출본에서 막으려면 enabled: false
  cheat: { enabled: true },

  goalEnter: { gapMs: 420, enterMs: 650, hopHeight: 70, endScale: 0.35, spacing: 26, slide: 0.15, jarFadePerSec: 0.35, resultDelayMs: 1000,   // resultDelayMs: 병이 다 밝아진 뒤 결과 창까지 (사용자 요청 2026-10-20)
    jarCurve: 0.5,
    skip: false },     // 주인공 도착 뒤 Enter·버튼으로 끝내기 (사용자 결정 2026-10-21: 끔. 대신 주인공이 도착하면 이탈한 물방울은 죽은 것으로 → 대열이 다 들어가면 결과 창)   // 정화 색 비율 = 정화 정도 ^ jarCurve (1 이면 그대로, 작을수록 적게 들어가도 많이 밝아짐. 사용자 요청 2026-10-21: 0.5 → 정화 50% 면 색 71%)

  // 물들기 (사용자 결정 2026-10-20): 색 선(노랑 제외, 검정 포함)을 밟고 있으면 물방울이 그 색으로 점차 물듦(다른 색이면 섞이며 넘어감).
  //   내려와도 holdMs 동안 유지, 그 뒤 fadeMs 에 걸쳐 원래 하늘색으로. 잉크병 색에는 섞이지 않음 (사용자 요청 2026-10-21: 섞는 기능 뺌)
  tint: {
    colors: { black: [96, 92, 106], red: [232, 70, 60], blue: [50, 118, 232], green: [64, 178, 86] },   // 검정은 진한 회색까지
    inMs: 1200, holdMs: 6000, fadeMs: 3000,
    touchColors: ['red']   // 닿자마자 튕겨 나가는 색: 한 번 닿으면 떨어져도 inMs 동안 계속 물듦 (사용자 요청 2026-10-20)
  },

  stop: { perSection: 3 }, // 스테이지당 정지 횟수 (levels.js stops 로 바꿈)
  stopUp: 1,               // 정지 +1 아이템 하나당 (그 스테이지에서만)

  // 시간 정지: A 완전 정지만 (사용자 결정 2026-10-19). 키는 스페이스 바 (사용자 결정 2026-10-20)
  timeModes: { A: { name: 'A. 완전 정지', scale: 0, limitMs: 0, activateOnStrokeEnd: false } },
  defaultTimeMode: 'A',

  // 잉크 (사용자 결정 2026-10-20): 선은 사라지지 않고, 우클릭으로 빨아들이면 전부 돌려받음. 웅덩이 없음
  ink: {
    max: 2000,             // 스테이지 기본 잉크 (levels.js ink 로 바꿈)
    upAmount: 300,         // 잉크 병 하나당 기본값 (병마다 amount 로 바꿈, 레벨 툴). 이 스테이지에서만 최대량·남은 양이 늘어남 (사용자 결정 2026-10-22: 영구 → 스테이지 한정)
    sampleDist: 8,
    minStrokeLen: 30,
    maxStrokeLen: 700,
    smoothPasses: 2,
    thickness: 9,          // 선 두께 (물리 바디도 같은 두께). 기본값 — 실제 값은 levels.js G.LEVEL_SETTINGS.inkThickness (레벨 툴 "게임 전체", 사용자 요청 2026-10-25)
    thicknessMin: 4, thicknessMax: 20,   // 레벨 툴에서 고를 수 있는 범위
    friction: 0.4,         // 떨어지는 선끼리·땅과의 마찰 (선이 미끄러져 내려가지 않게)
    density: 0.006,        // 선 밀도 (물방울보다 훨씬 무거움 → 걷는 물방울이 밀어도 거의 안 움직임)
    suckReach: 36,         // 우클릭한 곳에서 화면 기준 이 거리(px) 안의 선을 빨아들임. 줌 아웃하면 세계 거리로는 더 넓어짐 (사용자 요청 2026-10-20: 18 → 36)
    yellowCost: 0.5,       // 노랑은 길이당 잉크를 이 비율만 씀 (돌려받을 수 없으니 절반, 사용자 요청 2026-10-20)
    yellowCut: 14,         // 노랑으로 칠한 폭의 절반: 이 안에 든 배치된 선 부분이 지워짐 (사용자 결정 2026-10-20: 자르기 → 칠한 부분 지우기)
    simplifyTol: 3         // 선 점 줄이기 허용 오차 (물리 조각을 길게 → 떨어질 때 안정)
  },

  // 물감 5색 (사용자 결정 2026-10-20). 키 1~5, 아래 병 순서. 모든 선은 떨어짐(초록 예외: 천천히 떠오름)
  inks: {
    order: ['black', 'blue', 'red', 'green', 'yellow'],   // 1 검정 · 2 파랑 · 3 빨강 · 4 초록 · 5 노랑 = 월드 순서 (사용자 결정 2026-10-23, 그 전: 검·빨·파·초·노)
    black:  { name: '검정 · 기본' },
    red:    { name: '빨강 · 튕김' },
    blue:   { name: '파랑 · 가속' },
    yellow: { name: '노랑 · 지우기' },
    green:  { name: '초록 · 떠오름' }
  },
  // 색 효과 세기 기본값 (levels.js fx 로 스테이지마다 바꿈, 레벨 툴에서 조절)
  //   bounce: 빨강 튕김 속도(15 ≈ 400px) / boostPct·boostMs: 파랑 / riseSpeed: 초록이 올라가는 속도(스텝당 px)
  inkFx: { bounce: 15, boostPct: 190, boostMs: 1200, riseSpeed: 1.2 },
  bounceCdMs: 250,
  // 빨강 옆으로 튕김 (사용자 결정 2026-10-22, grill me): 닿은 빨강 부분이 이 각도(도)보다 서 있으면 부딪힌 쪽으로 튕기고, 걷는 방향도 튕긴 쪽으로 바뀜
  //   (주인공·혼자 걷는 물방울. 대열 물방울은 주인공 발자국을 따라감). 이보다 눕힌 빨강은 지금처럼 위로 튕기고 가던 방향 그대로
  redSideDeg: 60,
  greenTopY: -300,         // 초록이 아무것에도 안 닿으면 여기(월드 y)에서 멈춤

  // 발사기 투사체 (사용자 결정 2026-10-22): 발사기마다 색(검정·빨강·파랑·초록)이 있고, 같은 색으로 그린 선에 닿으면 막혀 사라짐.
  //   다른 색 선은 통과. 땅·벽·발판·가시·배치된 선에도 막힘. 선은 그대로 (투사체만 사라짐)
  //   주인공이 맞으면 실패, 작은 물방울이 맞으면 그 물방울을 잃음. 직선으로 날고(중력 없음) 게임 시간으로 움직여 정지 중엔 멈춤
  projectile: { radius: 13, lifeMs: 7000, hitK: 0.8 },   // hitK: 물방울과 맞았다고 보는 거리 = 물방울 반지름 + 투사체 반지름 × 이 값
  shooterColors: ['black', 'red', 'blue', 'green'],

  // 지우개 (사용자 결정 2026-10-20): 출발 delay 뒤 화면 밖 왼쪽에서 따라옴. 정지 중엔 멈춤
  //   speed: 이동 속도(스텝당 px) — 주인공 속도와 따로 (사용자 요청 2026-10-23). 예전 스테이지의 pct(주인공 속도의 %)는 불러올 때 speed 로 바꿈
  eraser: { speed: 1, delayMs: 3000, startBack: 700 },

  colors: {
    paper: '#F3E9D2',
    outline: '#2B2118',
    ground: '#C9B48A',
    player: '#CDEFF7',
    ink: '#2B2118',
    black: '#2B2118', red: '#E0312B', blue: '#1F6FE0', yellow: '#F2B807', green: '#1FA655',
    crystal: '#1B1A24',
    star: '#F5C518',
    stopTint: 'rgba(31,111,224,0.10)',
    jarDark: [24, 20, 30], jarClear: [205, 239, 247]   // 검은 잉크병 → 정화 100% 면 물방울 기본색(player)과 같은 연한 하늘색 (사용자 요청 2026-10-21)
  },

  level: {
    groundDepth: 400,      // 땅 높이 기본값 (땅마다 h 로 바꿈, 레벨 툴 아래 손잡이. 사용자 결정 2026-10-20)
    pickup: 0.45,          // 아이템 크기 × 이 값 + 물방울 반지름 안이면 획득
    starsPerStage: 3      // 수집 별 (사용자 결정 2026-10-20: 평가 = 별 n/3 + 정화 %, 시간·시도 조건은 없앰)
  },

  // 가시에 찔리는 범위 (사용자 요청 2026-10-23: 그림보다 작게). 가시 상자에서 위쪽(가시 끝 쪽) top×높이, 양옆 side×높이를 뺀 안쪽.
  //   물방울은 가시 상자와 부딪히지 않고 이 범위에 들어가면 찔림. 그린 선은 지금처럼 가시 상자 위에 얹힘 → 선을 밟는 물방울은 안전
  //   (가시 그림 obs_spike 는 위 12% 가 투명하고 원뿔이라 끝 쪽 30% 가량이 대부분 빈 곳)
  //   rK: 물방울 몸 대신 반지름 × rK 크기의 원으로 판정 (가시 그림 높이에 걸친 선을 밟아도 안전하게)
  spikeHit: { top: 0.35, side: 0.3, rK: 0.6 },

  // 프랍. 벽·발판·가시·배치된 선은 왼쪽 위 x,y + w,h. 물방울·아이템·장식은 가운데
  props: {
    wall:     { name: '벽',   solid: true, box: true, w: 60, h: 150, color: '#B8A47C',
                imgs: [['prop_wall', 'nine'], ['obs_wall', 'stack']] },
    platform: { name: '발판', solid: true, box: true, w: 220, h: 28, color: '#B8A47C',
                imgs: [['prop_platform', 'nine']] },
    // 배치된 선: 검은 다이아몬드처럼 광이 나는 막대. 고정. 노랑으로 자르면 양 끝이 붙은 조각은 남고 가운데 조각은 떨어짐
    //   하나 = 길이(w) 100 × 두께(h) 10, 늘리면 양 끝 모양은 그대로 가운데가 늘어남. angle(도)로 가운데 기준 회전 (사용자 결정 2026-10-20)
    crystal:  { name: '배치된 선', solid: true, box: true, w: 100, h: 10, pin: 'both', color: '#1B1A24', imgs: [['prop_crystal', 'nine']] },
    spike:    { name: '가시', solid: true, box: true, w: 120, h: 30, color: '#6B6470', imgs: [['obs_spike', 'tile']] },
    star:     { name: '별', collect: true, size: 56, imgs: [['star_full', 'fit']] },   // 수집 별: 스테이지당 3개, 주인공이 닿으면 획득 (사용자 결정 2026-10-20)
    drop:     { name: '잠든 물방울', size: 30 },                                  // 닿으면 합류
    stopup:   { name: '정지 +1', collect: true, size: 56, imgs: [['item_stop', 'fit']] },
    inkup:    { name: '잉크 병', collect: true, size: 60, imgs: [['item_ink', 'fit']] },
    // 발사기 (사용자 결정 2026-10-22): 단단한 상자. aim = 쏘는 방향(도, 0 = 오른쪽, 90 = 아래, 180 = 왼쪽), periodMs 간격, speed 스텝당 px,
    //   firstMs 첫 발(출발 뒤 게임 시간), color 투사체 색. 상자는 돌리지 않음 (그림만 쏘는 방향으로 돌림)
    shooter:  { name: '발사기', solid: true, box: true, w: 70, h: 70, color: '#5B5560', aim: 180, periodMs: 2000, speed: 5, firstMs: 1000, shot: 'black',
                imgs: [['obs_shooter', 'fit']] },
    deco:     { name: '장식', size: 180, img: 'deco_cloud_1' },
    // 점선 힌트 "여기에 그려 보세요" (2차 데모 첫 판 안내, 사용자 결정 2026-10-23): 부딪히지 않는 그림. 배치된 선처럼 길이(w)·두께(h)·각도, ink = 색
    hint:     { name: '점선 힌트', box: true, w: 200, h: 8, ink: 'black' },
    text:     { name: '글자', size: 20, text: '안내 문구' }
  },

  art: {
    dir: '../../stopsketch/assets/',
    images: [
      'bg_a', 'bg_b', 'bg_plain',
      'char_idle', 'char_run', 'char_jump', 'char_fall', 'char_erased', 'char_goal', 'drop_sleep',
      'ground_top', 'ground_fill',
      'prop_wall', 'obs_wall', 'prop_platform', 'prop_crystal', 'obs_spike', 'item_stop', 'item_ink',
      'deco_cloud_1', 'deco_cloud_2', 'deco_cloud_3',
      'ui_stop_on', 'ui_gauge_frame', 'ui_panel', 'fx_star_pop', 'fx_land', 'star_full', 'star_empty',
      'start_hole', 'goal_jar_empty', 'ink_black', 'ink_red', 'ink_blue', 'ink_yellow', 'ink_green', 'ink_select', 'ui_shelf',
      'fx_bounce', 'fx_boost', 'fx_absorb', 'eraser_edge', 'ui_arrow', 'goal_jar_dark',
      'eraser_body', 'eraser_crumb_1', 'eraser_crumb_2', 'eraser_crumb_3', 'eraser_smudge', 'fx_erase_puff',
      'obs_shooter', 'proj', 'fx_block', 'proj_white', 'fx_proj_pop',  // proj_white·fx_proj_pop: 7차 이미지 요청 (흰색으로 그려 코드가 투사체 색을 입힘)
      // 8차 이미지 요청 (2차 데모, 이미지 문서 16장): 월드 배경 · 시작 화면 · 월드 카드 · 스테이지 칸 · 버튼 · 안내 그림. 없으면 코드 모양
      'bg_w1', 'bg_w2', 'bg_w3', 'bg_w4', 'bg_w5', 'bg_w6', 'title_bg', 'title_logo',
      'world_card', 'world_icon_1', 'world_icon_2', 'world_icon_3', 'world_icon_4', 'world_icon_5', 'world_icon_6',
      'ui_lock', 'stage_tile', 'stage_tile_boss', 'ui_button', 'ui_back', 'fx_unlock',
      'tut_w1', 'tut_w2', 'tut_w3', 'tut_w4', 'tut_w5',
      // 9차 이미지 요청 (이미지 문서 17장, 2026-10-27): 월드 선택 배경, 스테이지 선택 배경(월드마다, 플레이 배경 bg_wN 과 따로). 없으면 전처럼
      'bg_worlds', 'bg_stage_w1', 'bg_stage_w2', 'bg_stage_w3', 'bg_stage_w4', 'bg_stage_w5', 'bg_stage_w6',
      // 낙서 없는 플레이 배경 (사용자 요청 2026-10-27, stopsketch_Image/bg_collection_round10/play_no_doodle) — 레벨 툴 배경에서 고름
      'bg_w1_clean', 'bg_w2_clean', 'bg_w3_clean', 'bg_w4_clean', 'bg_w5_clean', 'bg_w6_clean',
      // 장식 스티커 32개 (사용자 요청 2026-10-27, bg_collection_round10/doodle_sheets 에서 비슷한 것을 빼고 골라 자름)
      'stk_pencil', 'stk_pencil_blue', 'stk_crayon', 'stk_brush', 'stk_ruler', 'stk_eraser', 'stk_ink_bottle', 'stk_cookie_palette', 'stk_ladder', 'stk_bridge', 'stk_arrow_up', 'stk_plane', 'stk_spiral', 'stk_spring', 'stk_trampoline', 'stk_grass', 'stk_balloon', 'stk_sprout_balloon', 'stk_crystal', 'stk_star', 'stk_heart_red', 'stk_heart_yellow', 'stk_crit_black', 'stk_crit_blue', 'stk_crit_red', 'stk_crit_green', 'stk_crit_yellow', 'stk_drop_friend', 'stk_drop_brush', 'stk_drop_flag', 'stk_blue_friend', 'stk_red_friend'
    ],
    backgrounds: { world: '월드 배경 (월드마다)', bg_a: '종이 + 구름', bg_b: '줄 노트', bg_plain: '빈 종이', none: '단색 종이',
                   bg_w1: '월드 1 모눈종이', bg_w2: '월드 2 줄 노트', bg_w3: '월드 3 여백 줄', bg_w4: '월드 4 방안지', bg_w5: '월드 5 크라프트지', bg_w6: '월드 6 수채화지',
                   bg_w1_clean: '월드 1 모눈종이 (낙서 없음)', bg_w2_clean: '월드 2 줄 노트 (낙서 없음)', bg_w3_clean: '월드 3 여백 줄 (낙서 없음)',
                   bg_w4_clean: '월드 4 방안지 (낙서 없음)', bg_w5_clean: '월드 5 크라프트지 (낙서 없음)', bg_w6_clean: '월드 6 수채화지 (낙서 없음)' },
    // 장식 그림 (레벨 툴 "꾸미기 → 장식 그림"에서 그림을 골라 놓음). decoNames = 레벨 툴에 보이는 이름
    decos: ['deco_cloud_1', 'deco_cloud_2', 'deco_cloud_3',
      'stk_pencil', 'stk_pencil_blue', 'stk_crayon', 'stk_brush', 'stk_ruler', 'stk_eraser', 'stk_ink_bottle', 'stk_cookie_palette', 'stk_ladder', 'stk_bridge', 'stk_arrow_up', 'stk_plane', 'stk_spiral', 'stk_spring', 'stk_trampoline', 'stk_grass', 'stk_balloon', 'stk_sprout_balloon', 'stk_crystal', 'stk_star', 'stk_heart_red', 'stk_heart_yellow', 'stk_crit_black', 'stk_crit_blue', 'stk_crit_red', 'stk_crit_green', 'stk_crit_yellow', 'stk_drop_friend', 'stk_drop_brush', 'stk_drop_flag', 'stk_blue_friend', 'stk_red_friend'],
    decoNames: { deco_cloud_1: '구름 1', deco_cloud_2: '구름 2', deco_cloud_3: '구름 3', stk_pencil: '연필', stk_pencil_blue: '파란 색연필', stk_crayon: '크레용', stk_brush: '붓', stk_ruler: '자', stk_eraser: '지우개', stk_ink_bottle: '잉크병', stk_cookie_palette: '팔레트', stk_ladder: '사다리', stk_bridge: '다리', stk_arrow_up: '화살표', stk_plane: '종이비행기', stk_spiral: '소용돌이', stk_spring: '용수철', stk_trampoline: '트램펄린', stk_grass: '풀', stk_balloon: '풍선', stk_sprout_balloon: '새싹 풍선', stk_crystal: '결정', stk_star: '별', stk_heart_red: '빨간 하트', stk_heart_yellow: '노란 하트', stk_crit_black: '검정 물방울', stk_crit_blue: '파랑 물방울', stk_crit_red: '빨강 물방울', stk_crit_green: '초록 물방울', stk_crit_yellow: '노랑 물방울', stk_drop_friend: '흰 물방울', stk_drop_brush: '붓 든 물방울', stk_drop_flag: '깃발 물방울', stk_blue_friend: '파란 친구', stk_red_friend: '빨간 친구' },
    charSize: 3.2,
    charFace: { char_run: -1 },  // 그림이 바라보는 방향 (-1 = 왼쪽). 진행 방향에 맞춰 뒤집음 (사용자 요청 2026-10-20)
    walk: { stride: 1.6, bob: 0.16, sway: 0.09, lean: 0.06, squash: 0.08 },  // 코드 걷기: 걸음 길이(반지름 배)·튀는 높이(반지름 배)·기울기(rad)·앞으로 숙임·눌림
    airVy: 1.5,
    projTint: { black: '#6E6878' },   // 투사체 그림(proj_white)에 곱하는 색. 검정은 그대로 곱하면 얼굴이 안 보여 진한 회색 (2026-10-22)
    bgParallax: 0.5,
    groundTop: { h: 48, up: 14 },
    groundTint: null,
    slices: { prop_wall: { src: 14, dst: 5 }, prop_platform: { src: 8, dst: 3.5 }, prop_crystal: { src: 12, dst: 5 } },
    fx: { starPopMs: 450, landMs: 350, landVy: 6, inkMs: 400 },
    // 지우개 연출 (사용자 요청 2026-10-20, 6차 이미지): 본체가 가장자리에서 위아래로 문지르며 다가오고, 가루가 튀고, 지나간 자리는 흰 종이 + 문지른 자국 띠
    //   bodyH: 본체 높이(화면 높이 비율) · rubMs: 한 번 문지르는 시간 · rubAmp: 위아래 폭(화면 높이 비율) · crumbMs: 가루 나오는 간격
    //   crumb: 가루 크기 [최소, 최대] · crumbLife: 가루 수명 · smudgeW: 경계 띠 폭 · puffMs: 지워질 때 효과 시간
    eraser: { bodyH: 0.55, rubMs: 420, rubAmp: 0.22, crumbMs: 70, crumb: [12, 22], crumbLife: 1300, smudgeW: 120, puffMs: 600 },
    wallCrop: [5, 32, 247, 193],
    // 월드 카드 (8차 이미지 적용, Claude 2026-10-24): world_card.png 는 위아래가 투명한 가로 카드라 세로 칸(uitext worldCardW×H)에 맞춘다
    //   cardCrop = 실제 카드가 있는 영역 [x, y, 폭, 높이] (이미지를 바꾸면 다시 잼) · cardEnds = 늘리지 않는 위(테이프)·아래 높이(원본 px), 가운데만 늘림
    cardCrop: [2, 75, 380, 329], cardEnds: [70, 40],
    unlockFx: { ms: 1200, size: 1.6 },   // fx_unlock: 새 월드가 처음 열린 걸 월드 선택 화면에서 볼 때 카드 위에 퍼지는 효과 (시간, 카드 폭의 배)
    panelHull: null,
    startHole: { size: 190, up: 70 },
    crystal: { left: 90, right: 16 },  // prop_crystal.png 왼쪽·오른쪽 뾰족한 끝 폭(원본 px, 그림이 비대칭). 가운데는 반복
    goalJar: { w: 170, h: 198, mouth: 0.5 },   // 검은 잉크병: 왼쪽 끝 ≈ 도착 x. 물방울이 이 통 안(가로)에 들어오면 흡수
    shelf: { h: 84, slot: 66, x: 12, bottle: 58 },
    // 카메라 (사용자 결정 2026-10-21): 주인공과 대열만 따라감. 이탈한 물방울 때문에 줌 아웃하지 않음 → 화면 밖이면 가장자리 화살표, 보고 싶으면 휠로 직접 줌 아웃
    //   (2026-10-20 "무리가 다 보이게 자동 줌 아웃" 을 바꿈). 휠이 우선, manualMs 동안 휠을 안 쓰면 기본 줌으로
    //   baseZoom: 기본 줌 · topY: 화면 위 끝 기본값(월드 y) · bottomPad: 화면 아래 끝 기본값 = 가장 낮은 땅 윗면 + 이 값
    //   셋 다 스테이지마다 levels.js camera {zoom, top, bottom} 로 바꿈 (레벨 툴, 사용자 요청 2026-10-21)
    camera: { baseZoom: 1, topY: -400, bottomPad: 120, minZoom: 0.5, maxZoom: 1.3, margin: 160, manualMs: 3000, ease: 0.06, zoomOutEase: 0.08, zoomInEase: 0.012 }   // zoomInEase: 천천히 줌 인 (약 3초, 사용자 요청 2026-10-20)
  },

  // 사운드 (사용자 결정 2026-10-22, grill me): 배경 음악 1곡 반복 + 효과음 22개. 파일은 stopsketch/assets/sound/<이름>.(mp3|ogg|wav|flac),
  //   없는 소리는 그냥 안 남 (사운드 문서: 스톱앤스케치_사운드_프롬프트_ComfyUI.md). 음량 기본값은 uitext.js musicVolume·sfxVolume (UI 툴)
  //   stopMuffle: 시간 정지 중 배경 음악을 먹먹하게(높은 소리를 깎는 필터 freq Hz, 음량 배율 gain, 바뀌는 시간 ms)
  //   burst: 같은 효과음이 짧은 시간에 여러 번(무리) — gapMs 간격으로 차례로, 한 번마다 음을 pitchStep 씩 올림(최대 pitchMax), maxQueue 개까지
  //   small: 작은 물방울 소리는 음량 × vol, 음 × pitch / eraser: 주인공과 지우개 거리 near 이하면 최대 vol, far 이상이면 0
  sound: {
    dir: '../../stopsketch/assets/sound/', exts: ['mp3', 'ogg', 'wav', 'flac'],
    bgm: 'bgm_main',
    useSfx: true,                                    // 효과음 켬 (사용자 2026-10-23: 효과음 22개를 다시 넣음. 10/23 오전엔 배경 음악만이었음)
    stopMuffle: { freq: 650, gain: 0.55, ms: 250 },
    burst: { gapMs: 80, pitchStep: 0.05, pitchMax: 1.5, maxQueue: 12 },
    small: { vol: 0.6, pitch: 1.18 },
    eraser: { near: 200, far: 1000, vol: 0.7 },
    // 발사기 쏘는 소리·투사체 터지는 소리: 주인공과의 거리(px) near 이하면 다 들리고, far 이상이면 아예 안 들림 (사용자 요청 2026-10-23: 가까이 가야만 들리게)
    shooter: { near: 300, far: 650 },
    jingleDuck: 0.35,                                // 클리어·실패 음악이 나오는 동안 배경 음악 음량 배율
    // 이름: [음량 0~1, 음 높이 흔들림(±), 반복(loop)]. 우선순위 ★ 꼭 · ☆ 있으면 좋음 · ○ 나중 (사운드 문서 표와 같음)
    sfx: {
      sfx_stop: [0.9, 0], sfx_resume: [0.9, 0], sfx_draw: [0.9, 0, true], sfx_bounce: [0.8, 0.05], sfx_boost: [0.7, 0.04],
      sfx_rise: [0.7, 0], sfx_erase: [0.8, 0.03], sfx_suck: [0.8, 0.03], sfx_plop: [0.8, 0.06], sfx_lost: [0.8, 0.04],
      sfx_clear: [0.9, 0], sfx_fail: [0.9, 0],
      sfx_land: [0.6, 0.08], sfx_wake: [0.7, 0.05], sfx_join: [0.6, 0.06], sfx_star: [0.8, 0], sfx_item: [0.8, 0],
      sfx_shoot: [0.6, 0.05], sfx_block: [0.7, 0.05], sfx_eraser: [0.6, 0, true],
      sfx_color: [0.5, 0], sfx_click: [0.6, 0]
    }
  },

  // 월드 (사용자 결정 2026-10-23, 업무가이드 11-9): 색이 하나씩 열림. 스테이지는 levels.js 의 world(1~6)·order(1~) 로 묶음
  //   inks: 이 월드에서 쓸 수 있는 물감 (지금까지 열린 색 모두) — 새 스테이지 기본값, 스테이지마다 levels.js inks 로 바꿈
  //   color: 월드 색 (카드 테두리·스테이지 칸), bg: 월드 배경 그림 (스테이지 bg 가 'world' 면 이것), 없으면 bg_plain
  //   이름·설명 글자는 uitext.js world.N.name / world.N.desc (UI 툴)
  //   tint (4일차, Claude 2026-10-23): 월드 색 입히기 — paper = 배경 그림(bg_wN)이 없을 때 종이에 곱하는 색,
  //   ground = 땅·벽·발판 그림에 곱하는 색, a = 그 세기(0~1). 곱하기라 밝은 곳은 그 색, 어두운 테두리는 그대로
  worlds: [
    { id: 1, color: '#2B2118', inks: ['black'], bg: 'bg_w1', tint: { paper: '#ECEAE6', ground: '#9C9A96', a: 0.45 } },
    { id: 2, color: '#1F6FE0', inks: ['black', 'blue'], bg: 'bg_w2', tint: { paper: '#E3EDF9', ground: '#8FB4E8', a: 0.4 } },
    { id: 3, color: '#E0312B', inks: ['black', 'blue', 'red'], bg: 'bg_w3', tint: { paper: '#F9E6E1', ground: '#E8A196', a: 0.4 } },
    { id: 4, color: '#1FA655', inks: ['black', 'blue', 'red', 'green'], bg: 'bg_w4', tint: { paper: '#E5F3E2', ground: '#9ED2A0', a: 0.4 } },
    { id: 5, color: '#F2B807', inks: ['black', 'blue', 'red', 'green', 'yellow'], bg: 'bg_w5', tint: { paper: '#F1E1BE', ground: '#E3C46C', a: 0.45 } },
    { id: 6, color: '#8A5BD6', inks: ['black', 'blue', 'red', 'green', 'yellow'], bg: 'bg_w6', tint: { paper: '#F1EAF8', ground: '#C3AEE6', a: 0.35 } }
  ],

  save: {
    soundKey: 'stopsketch.swarm.sound.v1',          // 소리 켬/끔 (M 키·위 막대 스피커)
    key: 'stopsketch.swarm.save.v1', oldKeys: [],
    editorDraftKey: 'stopsketch.swarm.editor.draft.v1', oldEditorDraftKeys: []
  }
};
