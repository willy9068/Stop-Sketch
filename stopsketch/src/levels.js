// 스톱 앤 스케치 구간(레벨) 데이터 — tools/level_editor.html 로 편집해서 이 파일로 저장한다 (직접 고쳐도 됨)
// ground: 땅 {x0, x1, top}  /  props: 벽·발판 {type, x, y(왼쪽 위), w, h}, 별·장식 {type, x, y(가운데), size}, 글자 {type, x, y, size, text}
var G = G || {};

G.LEVELS = [
  {
    "id": "s1",
    "name": "구간 1 · 연습",
    "bg": "bg_a",
    "ink": 2500,
    "stops": 3,
    "rate": {"timeSec":60,"allStars":true,"maxTries":3},
    "inks": ["green"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200},
    "start": {"x":-100},
    "goal": {"x":5300},
    "ground": [
      {"x0":-400,"x1":1300,"top":600},
      {"x0":1460,"x1":2300,"top":600},
      {"x0":2680,"x1":3700,"top":600},
      {"x0":4020,"x1":5600,"top":500}
    ],
    "props": [
      {"type":"wall","x":-400,"y":300,"w":40,"h":300},
      {"type":"wall","x":3250,"y":380,"w":80,"h":220},
      {"type":"star","x":1380,"y":501,"size":56},
      {"type":"star","x":3290,"y":330,"size":56},
      {"type":"star","x":4720,"y":280,"size":56},
      {"type":"text","x":-10,"y":320,"size":20,"text":"마우스 드래그: 선 그리기 (달리는 중에도 가능)"},
      {"type":"text","x":-10,"y":350,"size":20,"text":"Shift 또는 우클릭: 시간 정지 → 멈춘 채 여유 있게 그리기"},
      {"type":"text","x":1040,"y":400,"size":20,"text":"작은 틈은 짧은 선 하나로!"},
      {"type":"text","x":2110,"y":390,"size":20,"text":"큰 틈은 선으로 다리를"},
      {"type":"text","x":2890,"y":290,"size":20,"text":"높은 벽은 경사로를 (막히면 뒤로 돌아요)"},
      {"type":"star","x":2490,"y":470,"size":56},
      {"type":"text","x":1040,"y":370,"size":20,"text":"Shift 또는 우클릭: 시간 정지"},
      {"type":"text","x":2110,"y":360,"size":20,"text":"Shift 또는 우클릭: 시간 정지"}
    ]
  },
  {
    "id": "s2",
    "name": "구간 2 · 빨강 튕김",
    "bg": "bg_plain",
    "ink": 1500,
    "stops": 3,
    "rate": {"timeSec":40,"allStars":true,"maxTries":3},
    "inks": ["red","green"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200},
    "start": {"x":-100},
    "goal": {"x":4700},
    "ground": [
      {"x0":-400,"x1":1500,"top":600},
      {"x0":1500,"x1":3000,"top":330},
      {"x0":3300,"x1":5000,"top":330}
    ],
    "props": [
      {"type":"wall","x":-400,"y":300,"w":40,"h":300},
      {"type":"wall","x":4000,"y":60,"w":60,"h":270},
      {"type":"star","x":1350,"y":220,"size":56},
      {"type":"star","x":3130,"y":-60,"size":56},
      {"type":"star","x":3900,"y":-70,"size":56},
      {"type":"deco","x":700,"y":160,"size":180,"img":"deco_cloud_1"},
      {"type":"deco","x":2600,"y":120,"size":180,"img":"deco_cloud_2"},
      {"type":"text","x":-10,"y":320,"size":20,"text":"새 잉크: 빨강 (키 1 · 휠 · 아래 병 클릭)"},
      {"type":"text","x":-10,"y":350,"size":20,"text":"빨간 선을 밟으면 선과 수직으로 튕겨요"},
      {"type":"text","x":900,"y":400,"size":20,"text":"절벽 앞 바닥에 짧은 빨간 선"},
      {"type":"text","x":2560,"y":160,"size":20,"text":"틈 바로 앞에서 튕기면 건널 수 있어요"},
      {"type":"text","x":3500,"y":120,"size":20,"text":"높은 벽은 경사로보다 빨강이 잉크가 적게 들어요"}
    ]
  },
  {
    "id": "s3",
    "name": "구간 3 · 파랑 가속",
    "bg": "bg_b",
    "ink": 1800,
    "stops": 3,
    "rate": {"timeSec":40,"allStars":true,"maxTries":3},
    "inks": ["red","blue","green"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200},
    "start": {"x":-100},
    "goal": {"x":4300},
    "ground": [
      {"x0":-400,"x1":1700,"top":600},
      {"x0":2380,"x1":4600,"top":600}
    ],
    "props": [
      {"type":"wall","x":-400,"y":300,"w":40,"h":300},
      {"type":"drain","x":2900,"y":586,"w":600,"h":14},
      {"type":"star","x":800,"y":570,"size":56},
      {"type":"star","x":1990,"y":180,"size":56},
      {"type":"star","x":3200,"y":540,"size":56},
      {"type":"text","x":-10,"y":320,"size":20,"text":"새 잉크: 파랑 (키 2) — 밟는 동안·내린 뒤 잠시 빨라져요"},
      {"type":"text","x":1000,"y":380,"size":20,"text":"넓은 틈: 파랑으로 빨라진 뒤 빨강으로 튕기면 멀리 날아요"},
      {"type":"text","x":2700,"y":400,"size":20,"text":"잉크 웅덩이는 빨리 지나가면 덜 잃어요"}
    ]
  },
  {
    "id": "s4",
    "name": "구간 4 · 초록 막기",
    "bg": "bg_a",
    "ink": 2000,
    "stops": 3,
    "rate": {"timeSec":50,"allStars":true,"maxTries":3},
    "inks": ["red","blue","green"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200},
    "start": {"x":-100},
    "goal": {"x":5200},
    "ground": [
      {"x0":-400,"x1":2300,"top":600},
      {"x0":2300,"x1":3400,"top":350},
      {"x0":4200,"x1":5500,"top":350}
    ],
    "props": [
      {"type":"wall","x":-400,"y":300,"w":40,"h":300},
      {"type":"shooter","x":1400,"y":250,"w":70,"h":70,"angle":135,"periodMs":1500,"speed":6},
      {"type":"shooter","x":3250,"y":40,"w":70,"h":70,"angle":145,"periodMs":1800,"speed":6},
      {"type":"star","x":1000,"y":560,"size":56},
      {"type":"star","x":2900,"y":310,"size":56},
      {"type":"star","x":3800,"y":-60,"size":56},
      {"type":"text","x":-10,"y":320,"size":20,"text":"새 잉크: 초록 (키 3) — 보통 발판이면서 투사체를 막아요"},
      {"type":"text","x":-10,"y":350,"size":20,"text":"빨강·파랑 선은 투사체가 그냥 지나가요"},
      {"type":"text","x":700,"y":400,"size":20,"text":"발사기 아래를 지날 때 머리 위에 초록 지붕을"},
      {"type":"text","x":2350,"y":200,"size":20,"text":"세 색을 모두 써 보세요"}
    ]
  }
];
