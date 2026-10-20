// 스톱 앤 스케치 — 물방울 무리 시험판 스테이지 (2026-10-20 Claude 초안, 플레이 후 레벨 툴로 수정 예정)
// 스테이지 = 시작 구멍 → 검은 잉크병 한 판. segments = 구간 경계 [{x, name}] (설계 용어, 게임 규칙에는 영향 없음)
// ground: 땅 {x0, x1, top}  /  props: 벽·발판·가시·배치된 선 {type, x, y(왼쪽 위), w, h}, 잠든 물방울·아이템·장식 {type, x, y(가운데), size}
var G = G || {};

G.LEVELS = [
  {
    "id": "w1",
    "name": "스테이지 1 · 물방울 모으기",
    "bg": "bg_plain",
    "ink": 1600,
    "stops": 3,
    "rate": {"timeSec":60,"rescuePct":100,"maxTries":3},
    "inks": ["black","red"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200,"riseSpeed":1.2},
    "eraser": {"pct":20,"delayMs":3000},
    "segments": [{"x":-600,"name":"이동 구간"},{"x":1200,"name":"퍼즐 구간 1 · 틈"},{"x":2050,"name":"퍼즐 구간 2 · 가시 구덩이"},{"x":2800,"name":"퍼즐 구간 3 · 절벽"},{"x":3900,"name":"도착"}],
    "start": {"x":-300},
    "goal": {"x":4300},
    "ground": [
      {"x0":-900,"x1":1400,"top":600},
      {"x0":1650,"x1":2200,"top":600},
      {"x0":2200,"x1":2400,"top":660},
      {"x0":2400,"x1":3300,"top":600},
      {"x0":3300,"x1":4700,"top":380}
    ],
    "props": [
      {"type":"wall","x":-760,"y":300,"w":40,"h":300},
      {"type":"spike","x":2200,"y":630,"w":200,"h":30},
      {"type":"drop","x":300,"y":587},
      {"type":"drop","x":800,"y":587},
      {"type":"drop","x":1900,"y":587},
      {"type":"drop","x":2800,"y":587},
      {"type":"drop","x":3700,"y":367},
      {"type":"text","x":-560,"y":300,"size":20,"text":"잠든 물방울에 닿으면 깨어나 함께 걸어요"},
      {"type":"text","x":-560,"y":330,"size":20,"text":"선은 떨어져요 — 다리는 양쪽 땅에 걸치게"},
      {"type":"text","x":-560,"y":360,"size":20,"text":"우클릭: 선 빨아들이기(잉크 돌려받음) · 스페이스: 시간 정지"},
      {"type":"text","x":1230,"y":420,"size":20,"text":"검정 선을 틈에 걸쳐서"},
      {"type":"text","x":2080,"y":420,"size":20,"text":"가시 구덩이는 선으로 덮어서"},
      {"type":"text","x":2800,"y":300,"size":20,"text":"빨강(키 2): 밟으면 튕겨요 — 절벽 앞 바닥에"},
      {"type":"deco","x":900,"y":160,"size":180,"img":"deco_cloud_1"},
      {"type":"deco","x":3000,"y":120,"size":180,"img":"deco_cloud_2"}
    ]
  },
  {
    "id": "w2",
    "name": "스테이지 2 · 다섯 색",
    "bg": "bg_a",
    "ink": 2200,
    "stops": 3,
    "rate": {"timeSec":120,"rescuePct":100,"maxTries":3},
    "inks": ["black","red","blue","yellow","green"],
    "fx": {"bounce":15,"boostPct":190,"boostMs":1200,"riseSpeed":1.2},
    "eraser": {"pct":20,"delayMs":3000},
    "segments": [{"x":-600,"name":"이동 구간"},{"x":700,"name":"퍼즐 구간 1 · 다이아몬드 우리"},{"x":1450,"name":"퍼즐 구간 2 · 우물"},{"x":2600,"name":"아이템 구간"},{"x":3300,"name":"퍼즐 구간 3 · 넓은 틈"},{"x":4500,"name":"도착"}],
    "start": {"x":-300},
    "goal": {"x":5300},
    "ground": [
      {"x0":-900,"x1":1600,"top":600},
      {"x0":1600,"x1":2120,"top":900},
      {"x0":2120,"x1":3600,"top":750},
      {"x0":3900,"x1":5700,"top":750}
    ],
    "props": [
      {"type":"wall","x":-760,"y":300,"w":40,"h":300},
      {"type":"crystal","x":900,"y":470,"w":10,"h":130,"pin":"end"},
      {"type":"crystal","x":1104,"y":470,"w":10,"h":130,"pin":"end"},
      {"type":"drop","x":950,"y":587},
      {"type":"drop","x":1005,"y":587},
      {"type":"drop","x":1060,"y":587},
      {"type":"drop","x":300,"y":587},
      {"type":"drop","x":600,"y":587},
      {"type":"drop","x":1750,"y":887},
      {"type":"drop","x":1950,"y":887},
      {"type":"drop","x":2500,"y":737},
      {"type":"drop","x":3300,"y":737},
      {"type":"drop","x":4700,"y":737},
      {"type":"stopup","x":2800,"y":695,"size":56},
      {"type":"text","x":-560,"y":300,"size":20,"text":"노랑(키 4): 그은 자리의 검은 다이아몬드 선을 끊어요"},
      {"type":"text","x":-560,"y":330,"size":20,"text":"초록(키 5): 떨어지지 않고 천천히 떠올라요"},
      {"type":"text","x":620,"y":400,"size":20,"text":"우리 양쪽 벽 아래를 노랑으로 한 번에 그어서"},
      {"type":"text","x":1650,"y":560,"size":20,"text":"우물 속 물방울은 초록으로 들어 올리고, 그 뒤 검정 다리"},
      {"type":"text","x":3350,"y":420,"size":20,"text":"파랑으로 빨라진 뒤 빨강으로 튕기면 멀리"},
      {"type":"deco","x":1300,"y":150,"size":180,"img":"deco_cloud_3"}
    ]
  }
];
