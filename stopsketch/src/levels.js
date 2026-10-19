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
  }
];
