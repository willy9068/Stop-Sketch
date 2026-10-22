# 스톱 앤 스케치 (가제, 구 잉크 런) — 아트 스타일 · 이미지 목록 · AI 이미지 프롬프트 (ComfyUI용)

> 2026-10-19 · 가제와 목록은 임시입니다. 프롬프트는 영어로 썼습니다(대부분의 모델이 영어에서 안정적).
> 저는 이미지를 직접 만들 수 없고 ComfyUI도 실행해 보지 못했습니다. **결과가 어떻게 나오는지는 확인하지 못했으니** 첫날 3장 시험(0-1)으로 먼저 확인하세요.
> 아트 방향의 기준은 `업무가이드_통합.md` 11장입니다.

---

## 0. 먼저 읽을 것

### 0-1. 사용 순서
1. 1장 **스타일 블록**을 모든 프롬프트 앞에 한 글자도 바꾸지 말고 붙입니다.
2. **먼저 3장만** 만듭니다: ① 캐릭터 정면 ② 베이지 종이 배경 ③ 빨강 잉크 병. 세 장이 한 게임처럼 보이면 나머지를 진행합니다. 안 맞으면 모델·LoRA·스타일 참조부터 바꿉니다.
3. 항목당 4장 이상 뽑아 **직접 고르고**, 고른 이유와 고친 내용을 7장 기록표에 씁니다.
4. 데모에서는 이미지가 없어도 색 블록으로 돌아가게 해 두었으니(첫날 계획), 이미지가 늦어져도 개발은 막히지 않습니다.

### 0-2. ComfyUI를 써도 되는가
**쓰셔도 됩니다. 단, 아래 세 가지를 지켜야 합니다.**
- **기각 위험 (가장 중요):** 가이드라인상 AI만 쓰고 작성자의 기획 의도·수정·검증이 확인되지 않으면 기각될 수 있습니다. 모델 이름, 프롬프트, 고른 이유, 손본 내용(자르기·색 보정·직접 그린 부분)을 7장 기록표와 일일 히스토리에 남기세요.
- **사내 규정:** AI 생성 이미지 사용이 허용되는지, 로컬 모델도 되는지 확인이 필요합니다. 규정 문서에는 도구별 허용 여부가 없어 **저는 확인하지 못했습니다.**
- **모델 라이선스:** ComfyUI는 실행 도구이고, 라이선스는 **쓰는 체크포인트(모델)/LoRA마다** 다릅니다. 상업 이용 가능 여부를 모델 페이지에서 직접 확인하고 모델 이름·버전·확인 날짜를 기록하세요. 데모는 사내 평가용이지만 정식 개발로 가면 다시 확인해야 합니다.
- 기존 작품·캐릭터·작가 이름을 프롬프트에 넣지 않습니다. 이 문서에도 넣지 않았습니다. (고양이와 스프, 커비 등은 **분위기만 참고**하고 이름으로 부르지 않음)

### 0-3. 이 프로젝트에서 AI가 약한 부분 (미리 알아둘 것)
- **같은 캐릭터를 여러 동작으로 일관되게** 뽑기가 어렵습니다. → 달리기 프레임 대신 **정지 이미지 1~3장 + 코드로 찌그러짐/늘어남(squash & stretch)** 을 권장합니다. 물방울 형태라 이 방식이 잘 맞습니다.
- **잉크 선(플레이어가 그리는 선)은 AI가 아니라 코드로 그립니다.** 색 3종은 data.js의 색상값 + 약간의 번짐 효과로 처리합니다.
- **투명 배경**은 모델이 직접 만들기 어렵습니다. 단색(흰색 또는 밝은 회색) 배경으로 뽑고 배경 제거(rembg 계열 노드 등)를 쓰거나 직접 지웁니다.
- **글자**는 AI가 못 씁니다. UI 글자는 폰트로 넣습니다.

---

## 1. 아트 스타일 정리 (지금까지 확정한 것)

| 항목 | 내용 |
|---|---|
| 세계관 | 스케치북 속 세계. 종이 위에 그려진 낙서 |
| 서사 | 뒤에서 지우개(공백)가 지워 온다 |
| 캐릭터 | 물방울 낙서 생물. **2026-10-19 더 동글동글하고 귀엽게 바꾸기로** (찹쌀떡처럼 둥근 몸 + 머리 위 작은 물방울 꼭지, 11장) |
| 배경 | 연한 베이지 종이. 소품 최소(거의 없음) |
| 선/잉크/캐릭터/아이템 | 진하고 채도 높은 굵은 선, 단순한 색 면 |
| UI | PC용 가로 16:9. 상단 한 줄 HUD + 하단 나무 선반 위 잉크 병. 선택된 잉크는 **뾰족한 외곽선(모양)** 으로도 구분 |
| 분위기 | 따뜻하고 귀여운 낙서, 단 지워지는 위기감이 있음 |
| 금지 | 모바일 세로 UI, 3D 렌더, 사진, 화려한 배경 묘사, 글자 |

### 1-1. 색 팔레트 (data.js에도 같은 값 사용)
| 용도 | 색 | HEX (시작값, 보고 조정) |
|---|---|---|
| 배경 종이 | 연한 베이지 | #F3E9D2 |
| 외곽선 | 진한 먹색(갈색 기운) | #2B2118 |
| 빨강 잉크 (튕김) | 진한 빨강 | #E0312B |
| 파랑 잉크 (가속) | 진한 파랑 | #1F6FE0 |
| 초록 잉크 (막기) | 진한 초록 | #1FA655 |
| 캐릭터 | 물방울 색 (잉크와 구분되는 색) | #7FD0E8 → 시험 후 결정 |
| 지우개/공백 | 종이보다 밝은 흰색 + 연한 회색 가장자리 | #FFFFFF |
| 수집품 별 | 노랑 | #F5C518 |
※ 캐릭터를 파랑 계열로 하면 파랑 잉크와 헷갈립니다. 색각 보조를 위해 **잉크는 선 모양/무늬(빨강=물결, 파랑=화살, 초록=격자 등)** 도 함께 쓸 계획입니다.

---

## 2. 스타일 블록 (모든 프롬프트 앞에 복사)

```
STYLE: 2D game asset, hand-drawn doodle on a sketchbook page, thick dark brown
ink outlines of uniform weight, flat saturated color fills with slight marker
texture, simple shapes, cute and warm mood, light beige paper background
(#F3E9D2), no shading gradients, no text, no watermark
```

### 공통 네거티브 프롬프트
```
text, letters, watermark, logo, signature, UI frame, 3d render, photo, realistic,
anime, detailed background, gradient shading, glossy, neon, blurry, extra limbs,
thin sketchy lines, grayscale, dark background
```

### ComfyUI 설정 요령 (확인 못 한 부분은 표시)
- 모델: 상업 이용이 가능한 체크포인트를 고릅니다. **[라이선스 직접 확인 필요]**
- 해상도: 정사각 에셋은 1024×1024 → 후처리로 축소. 배경은 1920×1080 비율(예: 1344×768 생성 후 업스케일).
- **시드 고정**: 같은 캐릭터의 다른 포즈는 시드를 고정하고 묘사만 바꿉니다. 완벽히 일치하지는 않습니다.
- **스타일 참조**: 처음 고른 캐릭터를 이후 생성의 참조 이미지로 넣는 방식(IP-Adapter 계열 노드 등)이 있으나, **어떤 노드·모델이 가능한지는 설치 환경에 따라 다르니 직접 확인**하세요.
- 같은 프롬프트로 최소 4장(배치 4) 뽑고 고릅니다.
- 워크플로 JSON을 저장해 `assets/` 에 함께 보관합니다 (제출 리소스: 생성 기록).

---

## 3. 이미지 목록과 파일 규격 (총 약 30장, 최소 구성 18장)

우선순위: ★=첫날~둘째 날 필요 / ☆=셋째 날 / ○=여유 있을 때
상태(2026-10-19 2차): ✅ 게임에 적용됨 / ✏️ 수정 필요 / 🆕 새로 필요 / — 안 씀 (자세한 이유와 프롬프트는 **8장**)

| # | 구분 | 파일명 | 크기 | 배경 | 우선 |
|---|---|---|---|---|---|
| 1 | 대표 이미지 | key_art.png | 1920×1080 | 있음 | ☆ |
| 2 | 구간 배경 A (기본 종이) | bg_a.png | 1920×1080 (가로로 이어붙일 수 있게) | 있음 | ★ ✏️ 별 빼고 구름만, 얼룩 노이즈 (8-1) |
| 3 | 구간 배경 B (줄 노트/격자 변형) | bg_b.png | 1920×1080 | 있음 | ○ ✏️ 이음매 (8-1) |
| 4 | 캐릭터 기본 | char_idle.png | 256×256 | 투명 | ★ ✅ |
| 5 | 캐릭터 달리기 포즈 (늘어남) | char_run.png | 256×256 | 투명 | ☆ ✅ |
| 6 | 캐릭터 튀어 오름 (점프 키는 없지만 경사로·튕김으로 위로 뜰 때) | char_jump.png | 256×256 | 투명 | ☆ ✅ |
| 7 | 캐릭터 지워지는 모습 | char_erased.png | 256×256 | 투명 | ○ ✅ 실패 쪽지 |
| 8 | 지우개 추격 (가장자리 조각) | eraser_edge.png | 512×1080 | 투명 | ☆ |
| 9~11 | 잉크 병 빨강/파랑/초록 | ink_red/blue/green.png | 192×256 | 투명 | ★ |
| 12 | 병 선택 외곽선(뾰족) | ink_select.png | 224×288 | 투명 | ☆ |
| 13 | 하단 나무 선반 | ui_shelf.png | 1280×160 | 투명 | ☆ |
| 14 | 잉크 게이지 틀 | ui_gauge_frame.png | 512×64 | 투명 | ☆ ✅ (✏️ 안쪽 투명 권장, 8-1) |
| 15 | 정지 횟수 아이콘 (시계/일시정지, 켜짐·꺼짐) | ui_stop_on/off.png | 96×96 | 투명 | ★ ✅ on만 (off는 코드로 흐리게) |
| 16 | 점수 패널(종이 쪽지) | ui_panel.png | 640×400 | 투명 | ☆ ✅ (✏️ 안쪽 불투명 권장, 8-1) |
| 17~19 | 별 빈/채움/반짝 | star_empty/full.png | 128×128 | 투명 | ☆ ✅ star_full (수집품·HUD) |
| 20 | 장애물: 벽 블록 | obs_wall.png | 256×256 | 투명 | ★ ✏️ 입체라 늘리면 어색 → **prop_wall(2D)** 로 교체 (8-2) |
| 21 | 장애물: 틈 가장자리 | obs_gap.png | 256×128 | 투명 | ★ |
| 22 | 투사체 발사기 | obs_shooter.png | 256×256 | 투명 | ☆ |
| 23 | 투사체 | proj.png | 96×96 | 투명 | ☆ |
| 24 | 튜토리얼 손 커서 | tut_hand.png | 128×128 | 투명 | ○ |
| 25 | 튜토리얼 점선 안내 | 코드로 그림 | | | |
| 26 | 연쇄 성공 효과 (낙서 반짝) | fx_chain.png | 256×256 | 투명 | ○ |
| 27 | 땅 윗면 띠 (가로 이음매 없음) | ground_top.png | 512×96 | 투명 | ★ 🆕 |
| 28 | 땅 속 무늬 (사방 이음매 없음) | ground_fill.png | 256×256 | 있음 | ★ 🆕 |
| 29 | 벽 (2D 정면, 9분할 늘이기용) | prop_wall.png | 256×256 | 투명 | ★ 🆕 |
| 30 | 캐릭터 떨어짐 | char_fall.png | 256×256 | 투명 | ★ 🆕 |
| 31 | 공중 발판 (2D, 9분할 가로형) | prop_platform.png | 256×64 | 투명 | ☆ 🆕 |
| 32 | 도착 깃발 | goal_flag.png | 256×256 | 투명 | ☆ 🆕 |
| 33~35 | 구름 장식 (레벨 툴로 배치) | deco_cloud_1~3.png | 512×320 | 투명 | ☆ 🆕 |
| 36 | 빈 종이 배경 (장식 없음) | bg_plain.png | 1920×1080 | 있음 | ☆ 🆕 |
| 37 | 별 먹을 때 반짝 | fx_star_pop.png | 256×256 | 투명 | ○ 🆕 |
| 38 | 착지 먼지 | fx_land.png | 256×128 | 투명 | ○ 🆕 |
| 39 | 잉크 병 (성장용 아이템) | item_ink.png | 256×256 | 투명 | ★ (10장) |
| 40 | 잉크 웅덩이 (9분할 가로형) | prop_drain.png | 256×64 | 투명 | ★ (10장) |
| 41 | 캐릭터 도착 (기뻐함) | char_goal.png | 256×256 | 투명 | ○ 🆕 (11장) |
| 42~44 | 색 효과: 튕김 / 가속 / 막기 | fx_bounce / fx_boost / fx_block.png | 256×128, 256×128, 256×256 | 투명 | ☆ 🆕 (11장) |
| 45 | 시작 구멍 (스케치북을 뚫고 나온 구멍) | start_hole.png | 512×512 | 투명 | ★ 🆕 (12장) |
| 46~47 | 도착 물감 통 (빈 / 찬) | goal_jar_empty / goal_jar_full.png | 384×448 | 투명 | ★ 🆕 (12장) — 도착 깃발 #32 대신 |

※ **#4~7, #30 캐릭터는 2026-10-19 더 동글동글한 모습으로 다시 그립니다 (11-1).**

※ 플레이어가 그리는 선, 게이지 채움, 점선은 **코드로** 처리합니다.

---

## 4. 프롬프트 (각각 앞에 2장 스타일 블록을 붙임)

> 형식: `[스타일 블록] + 아래 본문`. 투명 배경이 필요한 것은 `on a plain white background, isolated, single object`를 쓰고 후처리로 배경을 제거합니다.

### 4-1. 대표 이미지 (#1) — 정지 → 그리기 → 연쇄 장면
```
wide scene, a small blob-shaped doodle creature (teardrop body, two dot eyes, tiny
smile) running on a curved ink line toward the right, a thick red ink spring-shaped
line below it and a blue arrow-shaped boost line ahead, a green barrier line
blocking a small flying projectile, on the left a big white eraser sweep erasing
the beige paper background into blank white, sketchbook page, dynamic composition,
plenty of empty beige space
```
메모: UI(게이지·병 선반)는 이미지에 AI로 넣지 말고 완성 화면 캡처에 합성하면 "UI/UX 포함" 우대 조건에 맞춥니다.

### 4-2. 구간 배경 A (#2)
```
empty sketchbook page seen from the side, plain light beige paper with very faint
paper grain, a few tiny pencil doodles near the edges only (a small star, a
scribbled cloud), large empty center area, horizontal seamless composition
```
네거티브에 `objects in center, trees, buildings, detailed scenery` 추가.

### 4-3. 구간 배경 B (#3)
```
light beige notebook paper with faint pale blue ruled lines and a pale red margin
line, very low contrast, empty, horizontal composition
```

### 4-4. 캐릭터 기본 (#4)
> **2026-10-19: 캐릭터를 더 동글동글하게 바꾸기로 해서 이 프롬프트(4-4, 4-5) 대신 11-1의 새 프롬프트를 씁니다.** 아래는 1차 기록용으로 남겨 둡니다.
```
cute teardrop-shaped doodle creature, round body with a pointed top, two black dot
eyes, tiny curved smile, small stubby feet, bright cyan-blue body with thick dark
brown outline, front view, centered, on a plain white background, isolated
```
- 이름 후보는 교체 가능. 마음에 안 들면 "droplet" 대신 "bean/ink-blob"으로 바꿔 시험.

### 4-5. 달리기 / 점프 / 지워짐 (#5~7)
```
(char_run)   same teardrop doodle creature, leaning forward, body stretched
             horizontally, speed lines, side view facing right, plain white background
(char_jump)  same teardrop doodle creature, body stretched vertically, feet tucked,
             side view facing right, plain white background
(char_erased) same teardrop doodle creature, half of the body faded into blank white
              with a soft eraser smudge edge, worried expression, plain white background
```
메모: 일관성이 안 맞으면 #4 한 장 + 코드의 찌그러짐 연출로 대체합니다.

### 4-6. 지우개 추격 (#8)
```
vertical edge of a giant white eraser sweep, left side pure white blank area, right
side torn rubbery eraser crumbs and faint gray smudge edge fading into beige paper,
on transparent-looking plain background
```
(코드로 흰색 영역 + 가장자리 파티클을 그리는 방법도 같이 시험)

### 4-7. 잉크 병 (#9~11)
```
a small glass ink bottle with a cork, thick dark brown outline, filled with
saturated [RED / BLUE / GREEN] ink, a doodle drop symbol on the label
[RED: wavy spring symbol / BLUE: arrow symbol / GREEN: shield-grid symbol],
front view, plain white background, isolated
```
→ 색 단어와 기호만 바꿔 3번 뽑습니다. 시드 고정.

### 4-8. 선택 외곽선 (#12)
```
spiky starburst outline frame shaped like a rounded rectangle with sharp triangular
spikes around the border, thick dark brown line, empty inside, plain white background
```

### 4-9. 나무 선반 / 게이지 틀 / 패널 (#13, 14, 16)
```
(shelf)  a long thin wooden shelf plank seen from the front, warm brown wood with
         thick dark outline, simple wood grain doodle, horizontal, plain white background
(gauge)  an empty long rounded bar frame like a glass tube, thick dark outline,
         plain white background
(panel)  a small torn notebook paper note with taped corners, blank, thick dark
         outline, plain white background
```

### 4-10. 정지 아이콘 / 별 (#15, 17~19)
```
(stop)   a simple doodle stopwatch icon with pause bars, thick outline, [yellow] fill,
         plain white background
(star_empty) an empty star outline, thick dark brown line, no fill
(star_full)  the same star filled bright yellow with a small sparkle
```

### 4-11. 장애물 / 투사체 (#20~23)
```
(wall)    a doodle stone block scribbled with hatching, gray-brown fill, thick outline
(gap)     the torn edge of a paper hole, ragged white-gray edge, seen from the side
(shooter) a small doodle cannon with a round mouth, dark gray, thick outline
(proj)    a small spiky doodle ball, dark purple with angry eyes, thick outline
```
각 항목 `plain white background, isolated`.

### 4-12. 튜토리얼 손 / 효과 (#24, 26)
```
(hand)  a cartoon hand cursor pointing, white glove style, thick dark outline
(fx)    a burst of colorful doodle sparkles and small stars, thick lines, plain white background
```

---

## 5. 후처리
1. 배경 제거(투명 PNG) → 가장자리 흰 테두리 확인
2. 크기 맞춤 후 **WebP 변환**(단일 HTML 용량 때문, 길목 대장간은 93장 42MB → 3MB)
3. 선 굵기·색이 튀는 이미지는 색 보정(채도 올리기, 외곽선 색 통일)으로 맞춤
4. 파일명은 3장 표 그대로. 원본(PNG)은 `assets/original/`에 보관

## 5-1. 게임에 넣는 법 (2026-10-19 장치 추가)
- 배경을 지운 PNG를 `stopsketch/assets/<3장 파일명>.png` 로 저장 → 개발본 새로고침하면 바로 반영, 없으면 색 블록
- 지금 게임이 쓰는 것 (2차 기준): `bg_a`·`bg_b`(구간별 배경), `char_idle`·`char_run`·`char_jump`(튀어 오름)·`char_erased`, `obs_wall`(임시), `star_full`, `ui_stop_on`·`ui_gauge_frame`·`ui_panel`
- 넣으면 바로 쓰이는 자리가 준비된 것 (아직 파일 없음): `bg_plain`, `char_fall`, `ground_top`, `ground_fill`, `prop_wall`, `prop_platform`, `goal_flag`, `deco_cloud_1~3` → 8장
- **점프를 없앴으므로(사용자 결정 2026-10-19) `char_jump`(#6)는 만들지 않아도 됩니다.**
- 캐릭터는 오른쪽을 보는 모습으로 (왼쪽은 코드가 반전)
- 2026-10-19 1차 적용: `stopsketch_Image` 최종본에서 8장(bg_a, char_idle, char_run, char_erased, obs_wall, ui_stop_on, ui_gauge_frame, ui_panel). 스크린샷 `stopsketch/docs/screenshots/`. 이미지별 맞춤 처리는 `stopsketch/DEVLOG.md`
- 게임에 넣어 보고 보인 점: bg_a 아래쪽 별 낙서가 바닥 위 아이템(수집품 별)처럼 보임 / 배경에 옅은 네모 얼룩(생성 노이즈) / 게이지 틀은 안쪽 불투명, 결과 쪽지는 안쪽 투명이라 코드로 보정
- 제출본: `python tools/build_single.py` 가 WebP로 줄여 내장. 자세한 순서는 `stopsketch/README.md` "이미지 넣기"

## 6. 판단 기준 (선택할 때)
- 작은 크기(256px 이하)에서도 형태가 읽히는가
- 외곽선 굵기가 다른 이미지와 비슷한가
- 베이지 배경 위에서 캐릭터·잉크·장애물이 구분되는가 (특히 캐릭터색 vs 파랑 잉크)
- 색각 보조 기호(물결/화살/격자)가 보이는가

## 7. 선택 기록표 (제출 리소스 + "본인 경험 및 의견" 근거)
| 파일 | 모델/LoRA(버전·라이선스 확인일) | 프롬프트 수정 | 시드 | 뽑은 수 | 고른 이유 | 직접 고친 내용 |
|---|---|---|---|---|---|---|
| char_idle | | | | | | |
| bg_a | | | | | | |
| ink_red | | | | | | |
(이후 행 추가)

---

## 8. 2차 이미지 요청 (2026-10-19, 1차 이미지를 게임·레벨 툴에 넣어 본 뒤)

> 근거: 1차 이미지 8장을 게임에 넣고 찍은 화면(`stopsketch/docs/screenshots/`)과 사용자 피드백(별 빼고 구름만 / 땅 이미지 필요 / 벽을 2D로 / 튀어 오름·낙하 이미지 필요).
> 레벨 툴(`stopsketch/tools/level_editor.html`)로 벽·발판·장식을 **자유로운 크기로 배치**하게 되었으므로, 늘려도 어색하지 않은 **2D 정면 + 9분할** 형태가 중요해졌습니다.
> 모든 프롬프트 앞에 2장 스타일 블록을 그대로 붙입니다.

### 8-0. 9분할(nine-slice)이란 — 벽·발판 이미지를 만들 때 지킬 것
게임은 이미지를 **가장자리 띠(모서리 4 + 변 4)는 그대로, 가운데·변은 같은 배율로 반복해서** 원하는 크기로 그립니다 (2026-10-19 3차에 늘리기 → 반복으로 바꿈). 그래서:
- **정면 2D**로, 원근·그림자·입체 옆면이 없어야 합니다 (지금 `obs_wall`은 입체 상자라 이어 쌓으면 상자 탑처럼 보임).
- **테두리 굵기가 네 변 모두 같아야** 합니다. 테두리는 이미지 가장자리에서 안쪽으로 약 40px(벽) / 24px(발판) 안에 들어오게.
- **가운데 무늬는 고르게** (가운데만 늘어나도 티가 안 나게: 균일한 빗금, 종이 결 등). 큰 그림·글자·얼룩 금지.
- 테두리 폭이 다르게 나오면 `data.js`의 `art.slices` 숫자만 맞추면 됩니다 (Claude에게 요청).

### 8-1. 수정할 이미지

| 파일 | 게임에 넣어 보니 | 수정 방향 | 우선 |
|---|---|---|---|
| `bg_a` | 아래쪽 **별 낙서가 수집품 별처럼 보임** (스크린샷 1·2·5) / 전체에 옅은 **네모 얼룩**(생성 노이즈) | 별 없이 **구름만**, 얼룩 없는 깨끗한 종이. ※ 게임용 사본(`stopsketch/assets/bg_a.png`)은 Claude가 별만 지워 둠(임시, 원본은 `stopsketch_Image`에 그대로). 다시 뽑으면 덮어쓰기 | ★ |
| `obs_wall` | 입체 돌 상자라 벽을 길게 늘리면 **상자를 쌓은 탑**처럼 보임 (스크린샷 4·7) | 새 파일 **`prop_wall`**(8-2)로 교체. `obs_wall`은 예비로 둠(없을 때 자동 대체) | ★ |
| `bg_b` | 왼쪽 링 구멍·빨간 여백선이 가로로 이어 붙일 때 **반복**됨 | 링 구멍·여백선 없이 **줄만 있는** 노트 (좌우 이음매 없음) | ○ |
| `ui_gauge_frame` | 유리관 **안쪽이 불투명한 흰색**이라 잉크 채움이 가려짐 → 코드로 틀 위에 채움을 그려 보정 중 | 관 안쪽을 **투명**하게 (외곽선과 반사광만) | ○ |
| `ui_panel` | 쪽지 **안쪽이 투명**하고 외곽선 일부가 **끊겨 있음** → 코드로 외곽 다각형을 계산해 종이색을 깔아 보정 중 | 안쪽을 **불투명한 종이색**으로, 외곽선은 **닫힌 선**으로 | ○ |
| `char_idle` 외 캐릭터 | 문제 없음. 왼쪽으로 갈 때는 코드가 좌우 반전 | 새 캐릭터 그림도 **오른쪽을 보는** 모습으로 통일 | — |

수정 프롬프트

```
(bg_a 다시)  empty sketchbook page seen flat, plain light beige paper (#F3E9D2) with very
             faint even paper grain, only two or three small hand-drawn cloud doodles in
             the upper area, nothing in the lower half, no stars, no stains, no blotches,
             horizontal seamless composition
(bg_b 다시)  light beige notebook paper with faint pale blue horizontal ruled lines only,
             no margin line, no binder holes, very low contrast, empty, seamless left-right
```
네거티브에 `star, stain, blotch, smudge, texture noise, margin line, binder holes` 추가.

```
(ui_gauge_frame 다시)  an empty long rounded glass tube frame, thick dark brown outline,
                       small white highlight on top, the inside of the tube is empty and
                       transparent, horizontal, plain white background
(ui_panel 다시)        a small torn notebook paper note slightly tilted, solid light beige
                       paper filling the inside, closed continuous thick dark outline, taped
                       corners, blank, plain white background
```
※ 배경 제거 후 ui_gauge_frame은 관 안쪽 흰색도 지워야 합니다(배경 제거가 안쪽까지 지우는지 확인).

### 8-2. 새로 필요한 이미지

| # | 파일 | 크기 | 쓰이는 곳 (코드 준비 완료) | 만들 때 주의 | 우선 |
|---|---|---|---|---|---|
| 27 | `ground_top.png` | 512×96, 투명 | 모든 땅의 윗면을 따라 가로로 반복 (띠 높이 48px로 줄여 씀) | **좌우 이음매 없음**. 위쪽 1/3에 진한 연필·마커 윗선, 그 아래는 종이 찢긴 결이 투명으로 사라지게 | ★ |
| 28 | `ground_fill.png` | 256×256 | 땅 속을 채우는 무늬 (반복) | **사방 이음매 없음**. 지금 황토색(#C9B48A)보다 종이와 어울리는 따뜻한 베이지·옅은 빗금. 대비 낮게 | ★ |
| 29 | `prop_wall.png` | 256×256, 투명 | 벽 프랍 (레벨 툴에서 아무 크기로 늘림) | 8-0 9분할 규칙. 두꺼운 먹색 테두리 + 고른 빗금/돌 결 | ★ |
| 30 | `char_fall.png` | 256×256, 투명 | 떨어질 때 (세로 속도 아래로) | char_idle과 같은 캐릭터, **몸이 위아래로 살짝 늘어나고 놀란 얼굴**, 발끝이 아래, 오른쪽 보기 | ★ |
| 31 | `prop_platform.png` | 256×64, 투명 | 공중 발판 프랍 | 9분할 가로형(테두리 24px 안쪽). 얇은 나무판·종이 띠 | ☆ |
| 32 | `goal_flag.png` | 256×256, 투명 | 도착 깃발 (이미지 바닥 = 땅 윗면, 기둥은 왼쪽 20% 지점) | 기둥 아래 끝이 이미지 맨 아래에 닿게 | ☆ |
| 33~35 | `deco_cloud_1~3.png` | 512×320, 투명 | 레벨 툴 **장식** 도구로 원하는 곳에 배치 | 구름 하나씩 따로, 모양 다르게. bg_a의 구름 낙서와 같은 선 느낌 | ☆ |
| 36 | `bg_plain.png` | 1920×1080 | 장식 없는 배경 (구름은 deco로 직접 배치) | 낙서·얼룩 없이 종이 결만, 좌우 이음매 없음 | ☆ |
| 37 | `fx_star_pop.png` | 256×256, 투명 | 별 먹을 때 반짝 (지금은 별이 커지며 사라지는 코드 효과) | 노란 낙서 반짝임 | ○ |
| 38 | `fx_land.png` | 256×128, 투명 | 높은 곳에서 떨어져 착지할 때 먼지 | 작은 낙서 먼지 구름 2~3개 | ○ |

※ **배경 방식 제안:** 구름을 배경에 그려 넣는 대신 `bg_plain` + `deco_cloud`를 레벨 툴로 배치하면, 구간마다 구름 위치를 바꿀 수 있고 같은 배경이 반복돼 보이는 문제도 줄어듭니다. 두 방식 모두 지원하니 bg_a 수정본과 비교해서 고르세요.
※ 착지 순간 납작해지는 모습은 **코드(squash)** 로 처리하므로 따로 그리지 않아도 됩니다.

새 이미지 프롬프트

```
(ground_top)    a horizontal strip of the top edge of torn sketchbook paper, a thick dark
                brown hand-drawn ink line along the top with a slightly wobbly marker
                texture, soft torn paper fibers below fading out, seamless tileable left to
                right, side view, plain white background
(ground_fill)   seamless tileable texture of warm light beige paper cross-section with very
                faint diagonal pencil hatching, low contrast, flat, no objects
(prop_wall)     a flat 2D front view of a doodle stone wall tile, square, thick dark brown
                outline of uniform weight around all four edges, evenly spaced simple
                hatching and a few brick lines inside, no perspective, no side faces, no
                shadow, centered, plain white background
(char_fall)     same teardrop doodle creature, falling down, body slightly stretched
                vertically, surprised round eyes and small open mouth, tiny feet pointing
                down, side view facing right, plain white background
(prop_platform) a flat 2D front view of a thin doodle wooden plank, long horizontal shape,
                thick dark brown outline of uniform weight, simple wood grain lines inside,
                no perspective, plain white background
(goal_flag)     a doodle goal flag on a thin pole, pole on the left standing on the bottom
                edge, green triangular flag waving to the right with a small star mark,
                thick dark outline, plain white background
(deco_cloud)    a single hand-drawn cloud doodle outline, orange-brown marker line, empty
                inside, [variation: round / long flat / small puffy], plain white background
(bg_plain)      empty sketchbook page, plain light beige paper (#F3E9D2) with very faint even
                paper grain, nothing drawn, seamless left to right
(fx_star_pop)   a burst of small yellow doodle sparkles and tiny stars around an empty
                center, thick lines, plain white background
(fx_land)       two or three small doodle dust puffs on the ground, light gray-brown, thick
                outline, side view, plain white background
```
- prop_wall·prop_platform 네거티브에 `3d, perspective, isometric, cube, side face, shadow, bevel` 추가.
- ground_top·ground_fill·bg_plain은 생성 후 **좌우를 이어 붙여 보고**(가로로 두 장 나란히) 이음매가 보이면 다시 뽑거나 직접 다듬기.

### 8-3. 넣는 방법 (요약)
1. 배경 제거 → 위 파일명으로 `stopsketch/assets/`에 저장 (원본은 `assets/original/` 또는 `stopsketch_Image`)
2. 게임·레벨 툴을 새로고침하면 바로 반영 (없는 이미지는 색 블록 그대로)
3. 9분할 테두리 폭·캐릭터 크기 등이 안 맞으면 `stopsketch/src/data.js` 의 `art` 값을 조정 (Claude에게 스크린샷과 함께 요청)
4. 제출본: `python tools/build_single.py` → "이미지 n장 내장" 확인
5. 7장 기록표에 고른 이유·직접 고친 내용 기록

---

## 9. 2차 이미지 게임 적용 결과와 남은 수정 (2026-10-19)

> 2차 최종본(`stopsketch_Image/stopsketch`)의 바뀐 4장 + 새 12장을 게임에 넣고 구간 1을 끝까지 플레이해 확인했습니다. 스크린샷 `stopsketch/docs/screenshots/v2_*`.

### 9-1. 잘 맞은 것 (그대로 사용)
`prop_wall`(2D 벽돌, 반복 방식으로 어떤 크기든 자연스러움) · `goal_flag` · `fx_star_pop` · `fx_land` · `ui_panel`(안쪽 불투명) · `ui_gauge_frame`(안쪽 투명) · `bg_b` · `bg_plain` · `ground_top`

### 9-2. 수정할 것

| 우선 | 파일 | 게임에서 보인 문제 | 수정 방향 | 지금 임시 처리 |
|---|---|---|---|---|
| ★ | `ground_fill` | **거의 흰색**이라 땅과 틈(빈 곳)이 구분되지 않음 (v2_3 왼쪽). 흰색은 "지워진 곳" 색이라 콘셉트와도 겹침 | 종이 배경보다 **확실히 진한** 따뜻한 베이지(대략 #D9C7A0~#C9B48A) + 옅은 빗금. 배경과 명도 차가 눈에 띄게 | 코드로 베이지 덧칠(`art.groundTint`) + 땅 끝 세로선 |
| ★ | `bg_a` | 구름을 지운 자리에 **옅은 회색 얼룩**이 남음 (v2_2 위 가운데, v2_8 오른쪽 위, v2_6 왼쪽 위) | 얼룩 없이 다시. 또는 `bg_plain` + `deco_cloud` 배치로 대체 (구간 설정 → 배경을 bg_plain으로) | 없음 |
| ☆ | `char_fall` | 다른 캐릭터와 **그림체가 다름**: 기울어진 몸, 꼬부라진 머리 끝, 청록 발, 다른 얼굴선 (v2_4) | char_idle과 같은 비율·뾰족한 머리 끝·발 모양 유지, 표정만 놀람으로. char_idle을 참조 이미지로 넣어 생성 권장 | 그대로 사용 |
| ○ | `deco_cloud_1~3` | 주황색이 다른 선(먹색·갈색)보다 **밝고 진함**, bg_a 구름(갈색 기운)과 색이 다름 (v2_9) | 선 색을 bg_a 구름처럼 갈색 쪽(대략 #B5652B)으로, 굵기 조금 가늘게 | 그대로 사용 |
| ○ | `prop_platform` | 나무 옹이가 **같은 간격으로 반복**되어 보임 (v2_9) | 옹이 없는 고른 나무결 | 그대로 사용 |
| ○ | `ground_top` | 좌우 대칭으로 이어 붙여 512px마다 같은 모양이 반복 (가까이 보면 보임) | 이음매 없이 다시 뽑거나, 길이 1024px로 | 그대로 사용 |

수정 프롬프트

```
(ground_fill 다시) seamless tileable texture of warm medium beige paper cross-section
                   (#D9C7A0), clearly darker than light beige background paper, faint
                   diagonal pencil hatching, low contrast, flat, no objects
(char_fall 다시)   [char_idle 을 참조 이미지로] same teardrop doodle creature as reference,
                   same proportions and pointed top, falling down, body slightly stretched
                   vertically, surprised round eyes and small open mouth, same small feet,
                   facing right, plain white background
(deco_cloud 다시)  a single hand-drawn cloud doodle outline, warm brown marker line
                   (#B5652B), medium-thin line, empty inside, [round / long flat / small puffy],
                   plain white background
(prop_platform 다시) a flat 2D front view of a thin doodle wooden plank, long horizontal shape,
                   thick dark brown outline of uniform weight, even straight wood grain lines,
                   no knots, no perspective, plain white background
```
- ground_fill은 넣은 뒤 `stopsketch/src/data.js` 의 `groundTint` 를 `null` 로 바꿔 덧칠을 끕니다 (Claude에게 요청).

### 9-3. 기록 정리
- `selection_record.md` 의 char_jump 비고가 "게임에서 미사용"으로 되어 있지만, 현재 게임은 **위로 튀어 오를 때 char_jump를 사용**합니다 (3장 #6). 비고를 고쳐 주세요.
- 7장/선택 기록표의 "고른 이유"와 "직접 고친 내용"은 작성자가 채워야 합니다 (기각 기준 대응).

---

## 10. 3차 이미지 요청 (2026-10-19, 잉크 시스템 결정 후)

> 사용자 결정: 잉크 병(성장용, 먹으면 최대량 영구 증가)과 잉크 웅덩이(닿으면 잉크 감소)를 추가. 지금은 코드로 그린 임시 모양(먹색 병 + "+", 검보라 납작한 웅덩이)으로 동작합니다. 파일을 `stopsketch/assets/`에 넣으면 바로 바뀝니다.

| 파일 | 크기 | 쓰이는 곳 | 만들 때 주의 | 우선 |
|---|---|---|---|---|
| `item_ink.png` | 256×256, 투명 | 잉크 병 (성장용 아이템) | **별(점수용)과 확실히 달라 보이게**. 색 잉크 3종(빨강·파랑·초록)과도 헷갈리지 않게 먹색·보라 계열 + 반짝임. 위로 화살표나 "+" 느낌 | ★ |
| `prop_drain.png` | 256×64, 투명 | 잉크 웅덩이 (9분할 가로형, 테두리 약 16px) | 땅 위에 납작하게 깔린 검보라 잉크 얼룩, 위에서 본 것이 아니라 옆에서 본 납작한 모양, 가운데 무늬 고르게 | ★ |

```
(item_ink)   a small round glass ink bottle filled with deep purple-black ink, a sparkle
             and a tiny upward arrow doodle on the label, cork stopper, thick dark brown
             outline, flat colors, front view, plain white background, isolated
(prop_drain) a flat 2D side view of a thin puddle of spilled dark purple-black ink lying
             on the ground, long horizontal shape, glossy highlight line on top, thick
             dark outline of uniform weight, no perspective, plain white background
```
- prop_drain 네거티브에 `3d, perspective, top-down, splash` 추가.

---

## 11. 4차 이미지 요청 (2026-10-19, 캐릭터 다시 그리기 + 다음 기능용)

> 사용자 요청: 캐릭터가 **더 동글동글하고 귀여웠으면** 좋겠음.
> 지금 캐릭터(`char_idle`)는 위가 길고 뾰족한 물방울이라 몸이 세로로 길고, 화면에서 작게 보면 "물방울 아이콘"에 가깝습니다. 아래 방향으로 바꿉니다.
> 모든 프롬프트 앞에 2장 스타일 블록을 그대로 붙입니다.

### 11-1. 캐릭터 다시 그리기

**바꾸는 방향**

| 항목 | 지금 | 바꿀 모습 |
|---|---|---|
| 몸 모양 | 세로로 긴 물방울, 위가 길게 뾰족 | **거의 동그란 찹쌀떡 몸** (폭:높이 ≈ 1:0.9~1), 머리 위에 **작게 말린 물방울 꼭지** 하나만 남김 → 물방울 정체성은 유지 |
| 눈 | 작은 점 눈 | **작고 동그란 까만 눈 + 아주 작은 흰 반짝임 점**, 눈 사이를 넓게, 얼굴은 몸 아래쪽 절반에 (2026-10-19 "치이카와 그림 느낌"으로 수정 — 큰 눈보다 작은 눈이 이 느낌에 맞음) |
| 입·볼 | `·ω·` 입, 분홍 볼 | 작은 입 유지, 볼은 **분홍 타원 + 짧은 빗금 2~3줄** |
| 발 | 가늘고 짧은 막대 발 | **작고 통통한 둥근 발** 두 개 (몸 아래에 반쯤 묻힌 콩 모양) |
| 팔 | 없음 | 없음 (작게 보이면 지저분해짐) |
| 색 | 연한 하늘색 | **아주 연한 하늘색 유지 (사용자 결정 2026-10-19)** #CDEFF7 정도, 파랑 잉크보다 훨씬 옅게 |
| 외곽선 | 갈색 굵은 선 | **캐릭터만 조금 가늘고 부드러운 먹색 손그림 선** (살짝 떨리는 연필·펜 선). 다른 이미지보다 약간 가늘어도 됨 — 아래 주의 참고 |

**캐릭터 색 (사용자 결정 2026-10-19):** ① 아주 연한 하늘색 유지 (#CDEFF7 정도). 파랑 잉크(#1F6FE0)와는 진하기로 구분하고, 파랑 선에는 화살 무늬가 있어 색각 보조도 됨.

**그림 느낌 (사용자 결정 2026-10-19): "치이카와 그림 느낌"** — 0-2 규칙대로 **작품·작가 이름은 프롬프트에 넣지 않고**, 그 느낌을 이루는 특징만 풀어 씁니다:
- 아주 단순한 형태, 군더더기 없는 작은 얼굴 (작은 까만 눈 + 작은 입 + 분홍 볼 빗금)
- 부드럽고 살짝 떨리는 손그림 선, 연한 파스텔 색, 그림자 없음
- 작고 통통해서 "지켜 주고 싶은" 느낌 (몸에 비해 얼굴 부품이 작고 아래쪽에 모임)
- ⚠ 특정 캐릭터와 **너무 닮게** 나오면 쓰지 않습니다 (기각·저작권 위험). 물방울 꼭지와 하늘색 몸으로 우리 캐릭터만의 모습을 유지하세요.
- ⚠ 스타일 블록(2장)은 "굵고 균일한 외곽선"이라 이 느낌과 조금 부딪힙니다. 캐릭터 프롬프트에서는 아래처럼 선을 "medium-thin soft" 로 덮어쓰고, 다른 이미지와 너무 달라 보이면 선 굵기만 다시 맞춥니다.

**만드는 순서 (일관성)**
1. `char_idle` 을 먼저 뽑아 고릅니다 (8장 이상 뽑기 권장).
2. 고른 `char_idle` 을 **참조 이미지**(IP-Adapter 계열 등, 설치 환경에서 확인)로 넣고 나머지 포즈를 뽑습니다. 시드도 고정.
3. 포즈가 잘 안 맞으면 `char_idle` 한 장만 쓰고 코드의 찌그러짐·늘어남(squash & stretch)으로 대신해도 됩니다 (코드 쪽은 Claude가 처리).

**프롬프트**
```
(char_idle)   a tiny very round chubby doodle creature shaped like a soft mochi, almost
              circular plump body slightly wider at the bottom, a small curled water-droplet
              tip on top of the head, very simple minimal face placed low on the body: two
              small round black eyes with a tiny white sparkle, set wide apart, a tiny soft
              mouth, pink oval blush cheeks with two or three short diagonal hatch lines,
              two tiny round stubby feet half hidden under the body, no arms,
              very pale sky blue body (#CDEFF7), medium-thin soft dark brown hand-drawn
              line with a slight wobble, flat pastel colors, no shading, gentle and
              lovable mood, facing slightly right, full body, centered, plain white
              background, isolated
(char_run)    [char_idle 참조] same round mochi doodle creature as reference, same droplet
              tip and face, running to the right, body leaning forward and squashed a
              little wider, tiny feet in a running step, two or three short speed lines
              behind, plain white background
(char_jump)   [char_idle 참조] same creature, bouncing upward, body stretched a little
              taller like a jelly, feet tucked, happy open-mouth smile, facing right,
              plain white background
(char_fall)   [char_idle 참조] same creature, falling down, body slightly stretched
              vertically, surprised round eyes and small "o" mouth, droplet tip bent up,
              feet pointing down, facing right, plain white background
(char_erased) [char_idle 참조] same creature, the left half fading into blank white with a
              soft eraser smudge edge and a few eraser crumbs, worried teary eyes,
              plain white background
(char_goal)   [char_idle 참조] same creature, cheering happily with eyes closed in joy
              (^ ^), body slightly squashed, a few small doodle sparkles around,
              facing front, plain white background
```
네거티브에 `long body, tall teardrop, pointed head, thin legs, arms, hands, human, anime, big sparkly eyes, realistic eyes, detailed, thick heavy outline, shading` 추가.

**고를 때 기준**
- 64px 정도로 줄여 봐도 눈·볼·물방울 꼭지가 읽히는가 (게임에서 캐릭터는 화면 높이의 약 6%)
- **몸이 원에 가까운가**: 게임의 충돌체가 원이라, 몸이 둥글수록 땅·선에 닿는 모습이 자연스러움
- 6장 모두 같은 캐릭터로 보이는가 (꼭지 모양·눈 간격·외곽선 굵기)
- 캐릭터가 이미지의 가운데, 발끝이 이미지 아래쪽 약 90% 지점 (지금 이미지와 같은 배치면 크기 조정 없이 바로 교체됨)
- 몸 폭이 지금(이미지 폭의 약 62%)과 많이 다르면 `data.js` 의 `art.charSize` 를 맞춰야 함 (Claude에게 요청)

**파일:** `char_idle`·`char_run`·`char_jump`·`char_fall`·`char_erased` 는 같은 이름으로 덮어쓰기(256×256, 투명, 오른쪽 보기). `char_goal` 은 새 파일 — 도착 쪽지에 쓰이도록 코드 추가 필요 (Claude).

### 11-2. 다음 기능(색 잉크 · 지우개 · 투사체)에 필요한 이미지 정리

> 3장 표에 이미 있지만 아직 안 만든 것 + 이번에 새로 필요한 것을 한곳에 모았습니다. **색 잉크·지우개·투사체를 데모에 넣을지에 따라 필요 여부가 달라지므로**, 아래 "다음 기능 전 결정할 것"을 정한 뒤 뽑는 것을 권합니다.
> 상태: 🆕 새로 추가 / 📋 3장 표에 이미 있음(아직 없음) / ⏳ 10장에서 요청했고 아직 없음

| 우선 | 파일 | 크기 | 쓰이는 곳 | 상태 |
|---|---|---|---|---|
| ★ | `char_idle` 외 캐릭터 5장 | 256×256, 투명 | 11-1 | 다시 그리기 |
| ★ | `item_ink.png` | 256×256, 투명 | 잉크 병(성장용) — 지금 코드로 그린 임시 모양 | ⏳ (10장) |
| ★ | `prop_drain.png` | 256×64, 투명 | 잉크 웅덩이 — 지금 코드로 그린 임시 모양 | ⏳ (10장) |
| ★ | `ink_red/blue/green.png` | 192×256, 투명 | 색 잉크 선택 버튼 (하단 선반 또는 HUD) | 📋 #9~11 |
| ☆ | `ink_select.png` | 224×288, 투명 | 고른 색 표시 (뾰족한 외곽선) | 📋 #12 |
| ☆ | `ui_shelf.png` | 1280×160, 투명 | 잉크 병을 올려 두는 하단 선반 (선반 방식으로 정하면) | 📋 #13 |
| ☆ | `fx_bounce.png` | 256×128, 투명 | 빨강 선에서 튕길 때 순간 효과 | 🆕 |
| ☆ | `fx_boost.png` | 256×128, 투명 | 파랑 선에서 빨라질 때 꼬리 효과 | 🆕 |
| ☆ | `eraser_edge.png` | 512×1080, 투명 | 지우개 추격 가장자리 (지우개를 넣으면) | 📋 #8 |
| ☆ | `obs_shooter.png` / `proj.png` | 256×256 / 96×96, 투명 | 투사체 발사기·투사체 (초록 잉크를 넣으면) | 📋 #22·23 |
| ○ | `fx_block.png` | 256×256, 투명 | 초록 선이 투사체를 막을 때 터지는 효과 | 🆕 |
| ○ | `char_goal.png` | 256×256, 투명 | 도착 쪽지의 기뻐하는 캐릭터 (실패 쪽지에 char_erased 를 쓰는 것과 짝) | 🆕 (11-1) |
| ○ | `star_empty.png` | 128×128, 투명 | 결과 쪽지의 못 얻은 별 — 지금은 코드로 빈 별 윤곽선을 그림. 손그림 느낌을 맞추고 싶을 때만 | 📋 #17 |
| ○ | `tut_hand.png` | 128×128, 투명 | 첫 구간 "여기에 선을 그어 보세요" 안내 손 | 📋 #24 |
| ○ | `key_art.png` | 1920×1080 | 대표 이미지 (제출 문서 첫 장). **새 캐릭터로 다시 구성** | 📋 #1 |

새 이미지 프롬프트
```
(ink_red / ink_blue / ink_green)
             a small round glass ink bottle with a cork, thick dark brown outline, filled
             with saturated [RED / BLUE / GREEN] ink, the label shows a simple doodle symbol
             [RED: wavy spring / BLUE: arrow pointing right / GREEN: shield with grid],
             flat colors, front view, plain white background, isolated
             → item_ink(성장용, 먹색·보라 + 위 화살표)와 병 모양을 다르게: 색 잉크는 "네모 병", item_ink는 "둥근 병"
(fx_bounce)  a springy doodle impact burst, three short curved red marker lines spreading
             upward from a point, small zigzag spring mark, thick lines, plain white background
(fx_boost)   a horizontal doodle speed trail, three blue marker streaks with small arrow
             tips pointing right, thick lines, plain white background
(fx_block)   a small doodle shield-shaped burst, green marker lines in a grid pattern
             cracking outward, a few broken purple fragments, thick lines, plain white background
(eraser_edge) vertical edge of a giant white eraser sweep, left side pure white, right side
             rubbery eraser crumbs and faint gray smudge fading out, plain white background
(obs_shooter) a small round doodle cannon facing left, dark gray body, thick dark outline,
             flat 2D side view, plain white background
(proj)       a small spiky doodle ball, dark purple, tiny angry eyes, thick outline, plain
             white background
(char_goal)  → 11-1 프롬프트
```
- 색 잉크 병 3장은 **시드를 고정하고 색 단어·기호만 바꿔** 뽑습니다.
- `fx_*` 는 작게(화면에서 60~120px) 보이므로 선을 굵게, 개수를 적게.

### 11-3. 이번에 만들지 않아도 되는 것
- 플레이어가 그리는 선과 색별 무늬(물결·화살·격자) → **코드로 그림**
- 정지 아이콘 꺼짐(`ui_stop_off`) → 코드로 흐리게 처리 중
- 시간 정지 중 화면 효과(종이가 살짝 어두워짐 등) → 코드
- 튜토리얼 점선 안내 → 코드

---

## 12. 시작 지점 · 도착 지점 그림 (2026-10-19 사용자 결정)

> 참고 이미지(사용자 제공): 스케치북 종이를 **뚫고 나온 구멍**에서 캐릭터가 나오는 시작 지점 / 큰 **잉크 병**에 닿으면 끝나는 도착 지점.
> 결정: **시작 = 스케치북을 뚫고 나온 구멍** (참고 이미지처럼), **도착 = 큰 물감 통**. 처음엔 **비어 있다가**, 캐릭터가 도착하면 **물감이 차오름**.
> 게임에는 이미 **코드로 그린 임시 모양**(찢긴 구멍, 유리 통에 세 색 물감이 차오름)이 들어가 있고, 아래 파일을 `stopsketch/assets/`에 넣으면 바로 바뀝니다. (도착 깃발 `goal_flag` 은 더 이상 쓰지 않음)

| 우선 | 파일 | 크기 | 쓰이는 곳 | 만들 때 주의 |
|---|---|---|---|---|
| ★ | `start_hole.png` | 512×512, 투명 | 시작 위치 뒤 (캐릭터가 그 앞에 섬). 게임에서 약 190px, 가운데가 땅 윗면에서 70px 위 | 정면에서 본 **찢어진 종이 구멍**. 바깥은 종이가 안쪽으로 말려 들어간 흰 가장자리, 안쪽은 **어두운 소용돌이 구멍**. 구멍 바깥(종이)은 투명 |
| ★ | `goal_jar_empty.png` | 384×448, 투명 | 도착 위치 (왼쪽 끝 ≈ 도착 x, 바닥 = 땅). 게임에서 150×170px | 큰 유리 **물감 통**, 입구가 넓고 **안이 비어 있음**. 통 바닥이 이미지 맨 아래에 닿게 |
| ★ | `goal_jar_full.png` | 384×448, 투명 | 도착하면 빈 통 위에 **아래부터 잘라 겹쳐 차오르게** 보여 줌 | **empty 와 같은 통을 같은 위치·크기**로, 안에 물감이 가득 (빨강·파랑·초록이 섞여 소용돌이). 두 장이 겹쳤을 때 통 모양이 어긋나지 않아야 함 |

만드는 순서: `goal_jar_full` 을 먼저 고르고, 그 이미지를 참조로 넣어(또는 같은 시드로) `goal_jar_empty` 를 뽑습니다. 겹쳐 봐서 통 테두리가 어긋나면 이미지 편집 툴로 물감만 지워 empty 를 만드는 것이 가장 확실합니다.

```
(start_hole)      a torn hole ripped through a sketchbook paper page, seen from the front,
                  ragged white paper edges curling inward around the hole, the inside of the
                  hole is a deep dark navy-black space with a faint swirl, thick dark brown
                  outline, flat colors, centered, the paper around the hole fades out,
                  plain white background, isolated
(goal_jar_full)   a big round glass paint jar with a wide open mouth and a thick rim, filled
                  to the top with swirling saturated red, blue and green paint, a few paint
                  drips on the rim, thick dark brown outline, flat colors, front view, the
                  bottom of the jar touches the bottom edge of the image, plain white
                  background, isolated
(goal_jar_empty)  [goal_jar_full 참조] the same big round glass paint jar, same shape, size and
                  position as the reference, completely empty and clean inside, transparent
                  glass with one white highlight, thick dark brown outline, front view,
                  plain white background, isolated
```
- 네거티브에 `text, label, letters, brand` 추가 (참고 이미지의 "INK" 같은 글자는 넣지 않음 — 글자는 AI가 못 씀).
- start_hole 은 배경 제거할 때 **구멍 안쪽의 어두운 부분은 지우지 않게** 주의 (구멍 바깥 흰 배경만).
- 넣은 뒤 크기·위치가 어색하면 `stopsketch/src/data.js` 의 `art.startHole`(size, up), `art.goalJar`(w, h, fillMs) 를 조정 (Claude에게 요청).

### 12-1. 색 잉크·발사기 그림 (지금은 코드로 그린 임시 모양)
11-2 표의 `ink_red/blue/green`, `ink_select`, `ui_shelf`, `obs_shooter`, `proj`, `fx_bounce/boost/block` 은 **게임에 자리가 준비됨** (2026-10-19 색 잉크 구현). 파일만 넣으면 바뀝니다.
- `obs_shooter`: 게임에서 70×70px 상자 안에 비율 유지로 그림. **포구가 왼쪽**을 보게 (각도를 바꿔도 그림은 회전하지 않음 — 회전이 필요하면 Claude에게 요청)
- `ui_shelf`: 화면 왼쪽 아래 병 3개 아래에 깔리는 나무 선반 (게임에서 약 240×30px로 줄여 씀). 1280×160으로 뽑아도 가로로 늘려 씀
- 3장 전체 표에 #45~47 (start_hole, goal_jar_empty, goal_jar_full) 추가

---

## 13. 5차 이미지 요청 — 물방울 무리 시험판 (2026-10-20)

> 새 폴더 `stopsketch_swarm/`(물방울 무리 시험판)에 필요한 이미지입니다. 기존 데모와 **같은 이미지 폴더**(`stopsketch/assets/`)를 씁니다.
> 지금은 모두 **코드로 그린 임시 모양**으로 동작하고, 파일을 넣으면 바로 바뀝니다. 모든 프롬프트 앞에 2장 스타일 블록을 붙입니다.
> 작은 물방울은 주인공 그림(char_*)을 작게 줄여 씁니다. 따로 그리지 않아도 됩니다.

| 우선 | 파일 | 크기 | 쓰이는 곳 | 만들 때 주의 |
|---|---|---|---|---|
| ★ | `prop_crystal.png` | 256×32, 투명 | **배치된 선**: 검은 다이아몬드처럼 광이 나는 막대 (사용자 결정). 길이·방향 자유 → 9분할 가로형, 테두리 약 12px | 가로로 긴 결정 막대, 양 끝이 살짝 뾰족, 짙은 남색·검정 면에 **비스듬한 흰 광택 줄**. 가운데 무늬는 고르게 (반복됨). 세로 막대는 코드가 돌려 씀 |
| ★ | `drop_sleep.png` | 256×256, 투명 | **잠든 물방울** (닿으면 깨어남) | char_idle과 같은 캐릭터, **눈을 감고 쿨쿨**, 몸이 살짝 납작, 머리 위 작은 "z" 없이(코드가 그림). 발끝 위치·크기는 char_idle과 같게 |
| ★ | `obs_spike.png` | 128×64, 투명 | **가시 함정** (닿으면 죽음). 가로로 반복 | 회색·검보라 삼각 가시 2~3개가 바닥에 붙은 모양, **좌우 이음매 없음**, 아래 끝이 이미지 맨 아래 |
| ★ | `ink_black.png` / `ink_yellow.png` | 192×256, 투명 | 아래 병 선반의 **검정·노랑 물감 병** (키 1, 4) | 기존 ink_red/blue/green과 **같은 병 모양·같은 시드**, 라벨 기호: 검정 = 빈 동그라미(기본), 노랑 = **X(지우기)** |
| ☆ | `item_stop.png` | 256×256, 투명 | **정지 +1 아이템** (그 스테이지에서만) | 노란 탁상시계·스톱워치에 작은 **"+"** 반짝임. 별·잉크 병과 확실히 다르게 |
| ☆ | `fx_absorb.png` | 256×256, 투명 | 물방울이 **검은 잉크병에 흡수**될 때 병 입구 위 효과 | 하늘색 물방울 튀김 + 작은 반짝임이 아래(병 안)로 빨려 드는 모양 |
| ○ | `ui_arrow.png` | 64×64, 투명 | **화면 밖 물방울** 위치를 가리키는 가장자리 화살표 (오른쪽을 가리키게, 코드가 돌림) | 하늘색 둥근 삼각 화살표, 굵은 외곽선. 주인공용은 코드가 노랗게 바꾸지 않으니 한 장만 |
| ○ | `goal_jar_dark.png` (선택) | 384×448, 투명 | 검은 잉크병 — 지금은 `goal_jar_empty` 뒤에 코드로 검정→하늘색 잉크를 칠함. 따로 그리고 싶을 때만 | goal_jar_empty와 같은 통에 **검은 잉크가 가득** |

```
(prop_crystal)  a long horizontal crystal bar like a polished black diamond, faceted dark
                navy-black surface with a few diagonal white glossy highlight stripes, slightly
                pointed ends, thick dark outline of uniform weight, flat 2D side view, no
                perspective, even repeating pattern in the middle, plain white background
(drop_sleep)    [char_idle 참조] the same round mochi doodle creature as reference, sleeping
                peacefully with closed curved eyes, body slightly squashed and relaxed, small
                drool-free smile, same size and position as reference, plain white background
(obs_spike)     a row of three simple doodle floor spikes, gray-purple triangles with thick dark
                outline, attached to the bottom edge, seamless tileable left to right, flat 2D
                side view, plain white background
(ink_black / ink_yellow)
                [ink_red 참조, 같은 시드] the same small glass ink bottle with a cork, filled with
                saturated [BLACK / YELLOW] ink, the label shows a simple doodle symbol
                [BLACK: empty circle / YELLOW: X mark], flat colors, front view, plain white background
(item_stop)     a small yellow doodle stopwatch with a tiny "+" sparkle next to it, thick dark
                outline, flat colors, front view, plain white background, isolated
(fx_absorb)     a small splash of light sky blue water droplets and tiny sparkles being sucked
                downward into a point, thick lines, plain white background
(ui_arrow)      a rounded sky blue doodle triangle arrow pointing right, thick dark outline,
                flat, plain white background
(goal_jar_dark) [goal_jar_full 참조] the same big round glass jar, same shape and position,
                filled to the top with thick dark black ink, a few dark drips on the rim,
                plain white background
```
- 네거티브에 `text, letters, numbers` 추가 (item_stop 의 "+" 는 기호라 괜찮지만 숫자는 넣지 않음 — "+1" 글자는 코드가 씀)
- prop_crystal 은 9분할로 늘리므로 **가운데 무늬가 반복돼도 어색하지 않게**. 넣은 뒤 테두리 폭이 안 맞으면 `stopsketch_swarm/src/data.js` 의 `art.slices.prop_crystal` 조정 (Claude에게 요청)
- 3장 전체 표에 #48~55 추가 (아래)

| # | 구분 | 파일명 | 크기 | 배경 | 우선 |
|---|---|---|---|---|---|
| 48 | 배치된 선 (검은 다이아몬드) | prop_crystal.png | 256×32 | 투명 | ★ 무리 시험판 |
| 49 | 잠든 물방울 | drop_sleep.png | 256×256 | 투명 | ★ 무리 시험판 |
| 50 | 가시 함정 | obs_spike.png | 128×64 | 투명 | ★ 무리 시험판 |
| 51~52 | 검정·노랑 물감 병 | ink_black / ink_yellow.png | 192×256 | 투명 | ★ 무리 시험판 |
| 53 | 정지 +1 아이템 | item_stop.png | 256×256 | 투명 | ☆ 무리 시험판 |
| 54 | 흡수 효과 | fx_absorb.png | 256×256 | 투명 | ☆ 무리 시험판 |
| 55 | 화면 밖 화살표 | ui_arrow.png | 64×64 | 투명 | ○ 무리 시험판 |

## 14. 6차 이미지 요청 — 지우개 연출 (2026-10-20, 사용자 요청)

> 지금 지우개는 `eraser_edge.png`(세로로 긴 가장자리) 한 장이라 **벽이 밀려오는 느낌**입니다 (사용자 의견 2026-10-20).
> **진짜 지우개가 종이를 문지르며 다가오고, 지나간 자리는 하얗게 지워지는** 연출로 바꿉니다. 모든 프롬프트 앞에 2장 스타일 블록을 붙입니다.
> 파일을 `stopsketch/assets/` 에 넣으면 Claude가 코드로 연결합니다(아래 "코드로 할 연출"). 지금은 기존 그림으로 동작합니다.

| 우선 | 파일 | 크기 | 쓰이는 곳 | 만들 때 주의 |
|---|---|---|---|---|
| ★ | `eraser_body.png` | 512×768, 투명 | **지우개 본체**. 화면 왼쪽 가장자리에서 위아래로 문지르며 오른쪽으로 다가옴 | 큰 직사각형 고무 지우개를 **옆에서 본 모습, 오른쪽으로 살짝 기울어짐**. 아래·오른쪽 모서리가 닳아 둥글고, 위쪽 절반은 종이 덮개(띠)에 싸여 있음. 몸통은 연한 분홍 또는 흰색, 덮개는 하늘색이나 노랑. **글자·로고·상표 없음**. 굵은 외곽선, 평면 2D |
| ★ | `eraser_crumb_1.png` ~ `_3.png` | 128×128, 투명 (3장) | **지우개 가루**. 문지를 때 오른쪽으로 튀어 나가 떨어짐 (코드가 여러 개를 흩뿌림) | 지우개와 같은 색의 작은 **말린 고무 부스러기**, 모양만 조금씩 다르게(가늘게 말린 것·뭉친 것·부서진 것). 한 장에 하나씩 가운데 |
| ☆ | `eraser_smudge.png` | 256×1024, 투명, **위아래 이음매 없음** | **지운 자리 경계 띠**. 지우개 바로 뒤에 세로로 반복해서, 지워진 흰 종이와 아직 안 지운 종이 사이를 이어 줌 | **왼쪽 끝은 완전 흰색(불투명)**, 오른쪽으로 갈수록 투명해지며 연한 회색 **문지른 자국·남은 연필 흔적**이 가로로 몇 줄. 위아래로 반복해도 끊기지 않게 |
| ○ | `fx_erase_puff.png` | 256×256, 투명 | 물방울·선이 **지우개에 지워지는 순간** 퍼지는 효과 | 지우개 가루와 하얀 먼지가 둥글게 퍼지는 모양, 가운데는 비어 있음 |

```
(eraser_body)    a big rectangular rubber eraser seen from the side, tilted slightly to the
                 right, its bottom-right corner worn round from rubbing, the upper half wrapped
                 in a simple paper sleeve band, soft pink rubber body with a light blue sleeve,
                 no text, no logo, thick dark outline, flat 2D doodle, plain white background
(eraser_crumb)   a single small curled crumb of pink rubber eraser dust, [VARIATION: thin curl /
                 small lump / broken flake], thick dark outline, flat colors, centered,
                 plain white background, isolated
(eraser_smudge)  a vertical strip of paper where the left edge is clean pure white and toward the
                 right it fades into faint gray horizontal rubbing marks and leftover pencil
                 smudges, soft and light, seamless tileable top to bottom, plain background
(fx_erase_puff)  a small round puff of white dust and pink eraser crumbs bursting outward,
                 empty center, thick doodle lines, plain white background
```
- 네거티브에 `text, letters, logo, brand, label` 추가 (실제 문구용품 상표처럼 보이지 않게)
- 지우개 가루 3장은 **시드를 고정하고 VARIATION 단어만 바꿔** 뽑습니다
- `eraser_smudge` 는 왼쪽이 불투명 흰색이어야 지워진 쪽과 이어집니다. 배경 제거 때 **왼쪽 흰 부분까지 지워지지 않게** 주의 (투명으로 바뀌면 Claude에게 말해 주세요, 코드로 흰색을 채울 수 있음)
- 기존 `eraser_edge.png` 는 새 그림이 들어오면 쓰지 않습니다 (지우개 그림이 없을 때만 대신 씀)

**코드로 할 연출 (이미지를 넣은 뒤 Claude가 연결)**
| 연출 | 방법 |
|---|---|
| 문지르기 | 지우개 본체를 지우개 위치(가장자리)에서 위아래로 빠르게 흔들고 살짝 기울기를 바꿈. 화면 높이가 크면 본체를 위아래로 2개 |
| 가루 | 문지를 때마다 가루 그림을 오른쪽으로 튀어 나가게 하고 중력으로 떨어뜨림 (정지 중엔 멈춤) |
| 지운 자리 | 지우개 왼쪽은 흰 종이로 덮고, 경계에 `eraser_smudge` 띠를 세로로 반복 |
| 지워질 때 | 물방울·선이 지워지는 자리에 `fx_erase_puff` + 물방울은 `char_erased` 로 잠깐 바뀐 뒤 사라짐 |

| # | 구분 | 파일명 | 크기 | 배경 | 우선 |
|---|---|---|---|---|---|
| 56 | 지우개 본체 | eraser_body.png | 512×768 | 투명 | ★ 지우개 연출 ✅ |
| 57~59 | 지우개 가루 3종 | eraser_crumb_1~3.png | 128×128 | 투명 | ★ 지우개 연출 ✅ |
| 60 | 지운 자리 경계 띠 | eraser_smudge.png | 256×1024 | 투명(왼쪽 흰색) | ☆ 지우개 연출 ✅ |
| 61 | 지워지는 순간 효과 | fx_erase_puff.png | 256×256 | 투명 | ○ 지우개 연출 ✅ |

> 6차 이미지 6장 적용 완료 (2026-10-20). 문지르는 속도·크기는 `stopsketch_swarm/src/data.js` 의 `art.eraser`

## 15. 7차 이미지 요청 — 색 투사체 발사기 (2026-10-22)

> 무리 데모에 **발사기**를 넣었습니다 (사용자 결정 2026-10-22). 투사체에 **색(검정·빨강·파랑·초록)** 이 있고 같은 색으로 그린 선에만 막힙니다.
> 지금은 예전 그림으로 동작합니다: `obs_shooter`(대포) 그대로, `proj`(보라 가시 공)는 코드가 회색으로 바꾼 뒤 색을 입히고, 터질 때는 `fx_block`(예전 "초록 방패" 그림).
> 아래 그림은 **흰색·연회색으로** 그리면 코드가 투사체 색을 곱해서 입힙니다. 파일을 `stopsketch/assets/` 에 넣으면 바로 바뀝니다(코드 연결 완료). 모든 프롬프트 앞에 2장 스타일 블록을 붙입니다.

| 우선 | 파일 | 크기 | 쓰이는 곳 | 만들 때 주의 |
|---|---|---|---|---|
| ★ | `proj_white.png` | 128×128, 투명 | **투사체** (코드가 검정·빨강·파랑·초록으로 물들임) | 기존 `proj`와 같은 **둥근 가시 공 + 찡그린 얼굴**, 몸은 **흰색~아주 연한 회색**(색을 곱하므로 밝을수록 색이 선명), 외곽선·얼굴만 진하게. 아래 그림자 없이 공만 |
| ★ | `fx_proj_pop.png` | 256×256, 투명 | 투사체가 **선·벽에 막히거나 물방울에 맞아 터질 때** (코드가 투사체 색으로 물들임) | 흰색 물감 방울이 사방으로 **튀며 터지는** 모양, 작은 가시 조각 몇 개. 가운데 비어 있게. **방패·격자 없음** (예전 fx_block 은 초록이 막던 시절 그림) |
| ○ | `obs_shooter.png` (선택, 다시 그리기) | 256×256, 투명 | 발사기 몸통. 지금 그림을 그대로 써도 됨 | **포구가 왼쪽**(코드가 쏘는 방향으로 돌리고, 오른쪽을 볼 땐 좌우를 뒤집음). 몸통 가운데에 **둥근 빈 자리**(코드가 투사체 색 동그라미를 그림)가 있으면 더 자연스러움 |

```
(proj_white)   [proj 참조] the same round spiky doodle ball with a small grumpy face, body
               colored pure white to very light gray, dark thick outline and dark face only,
               no shadow, centered, plain background
(fx_proj_pop)  a small burst of white paint splashes and a few tiny spike fragments flying
               outward in all directions, empty center, no shield, no grid, thick dark doodle
               outline, plain background
(obs_shooter)  [obs_shooter 참조] the same small round doodle cannon on two wheels, barrel
               pointing left, a plain empty round badge on the side of the body, thick dark
               outline, flat 2D side view, plain white background
```
- 네거티브에 `colored, purple, green, shield, grid, text` 추가 (흰색이어야 코드가 네 가지 색을 깨끗하게 입힘)
- 배경 제거 때 **흰 몸이 같이 지워지지 않게** 주의 (배경을 연한 단색으로 뽑고 지우는 것을 권장)
- `item_ink.png`(보라 잉크 병 + 위 화살표)는 지금 그대로 씀. 잉크 병은 이제 **이 스테이지에서만** 늘어나므로 그림은 바꿀 필요 없음

| # | 구분 | 파일명 | 크기 | 배경 | 우선 |
|---|---|---|---|---|---|
| 62 | 투사체 (흰색, 코드가 색 입힘) | proj_white.png | 128×128 | 투명 | ★ 발사기 |
| 63 | 투사체 터짐 (흰색, 코드가 색 입힘) | fx_proj_pop.png | 256×256 | 투명 | ★ 발사기 |
| 64 | 발사기 다시 그리기 (선택) | obs_shooter.png | 256×256 | 투명 | ○ 발사기 |
