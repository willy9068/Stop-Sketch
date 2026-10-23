# 스톱 앤 스케치 — AI 사운드 프롬프트 (ComfyUI)

> 작성 2026-10-22 (사용자 요청). **2026-10-23: 효과음을 모두 빼고 배경 음악 1곡만 씀 (사용자 결정, 아래 8-2).** 이미지 문서(`스톱앤스케치_AI이미지_프롬프트_ComfyUI.md`)와 같은 방식으로, **ComfyUI 에서 배경 음악 1곡 + 효과음 22개**를 뽑아 데모에 넣기 위한 문서입니다.
> 게임 쪽 사운드 장치는 이미 들어가 있습니다 (`stopsketch_swarm/src/sound.js`). **파일을 `stopsketch/assets/sound/` 에 이름대로 넣으면 바로 소리가 납니다.** 없는 소리는 그냥 안 납니다.
> 데모 전용이라 라이선스는 크게 따지지 않기로 함 (사용자 결정 2026-10-22). 정식 개발 때는 모델·서비스 조건을 다시 확인.

## 0. 정한 것 (사용자 결정 2026-10-22, grill me)

| 항목 | 결정 |
|---|---|
| 배경 음악 | **1곡 반복** (모든 스테이지 같은 곡) |
| 시간 정지 중 | 배경 음악이 **먹먹하게 작아짐** (높은 소리를 깎고 음량 약 55%). 재생하면 원래대로 |
| 무리 소리 | 같은 효과음이 몰리면 **간격(0.08초)을 두고 차례로, 한 번마다 음을 조금씩 올림** ("톡톡톡"). 작은 물방울은 조금 작고 높게 |
| 끄기 | **M 키 + 위 막대 스피커 아이콘** (켬/끔 저장). 음량 기본값은 UI 툴(`musicVolume` 0.45 · `sfxVolume` 0.8) |
| 효과음 범위 | 게임 사건 **전부 22개** (아래 표의 우선순위 ★ → ☆ → ○ 순서로 뽑으면 됨) |
| 지우개 소리 | 문지르는 소리 반복, **주인공과 가까울수록 커짐** (1000px 밖은 0, 200px 안은 최대). 정지 중엔 멈춤 |
| Esc 일시 정지 | 모든 소리 멈춤 (풀면 이어서) — Claude가 임시로 정한 것 |

## 1. 소리 방향 (아트 스타일에 맞춤)

- 그림이 **손그림 스케치북 + 둥글둥글한 물방울**이라, 소리도 **가볍고 귀엽고 짧게**. 무겁거나 사실적인 소리(폭발, 비명, 금속 충돌)는 피함
- 재료 느낌: **종이·연필·고무 지우개·물방울·유리 잉크병·나무 선반**. 물감 5색은 성격이 귀로도 구분되게
  - 검정 = 담백한 "톡" / 빨강 = 탄력 있는 "뿅" / 파랑 = 바람 "슝" / 초록 = 거품 "보글" / 노랑 = 지우개 "쓱"
- 악기(배경 음악·짧은 음악): 마림바·글로켄슈필(철금)·피치카토 현·우쿨렐레·가벼운 피아노·톡톡 튀는 퍼커션. 장조, 느긋하지만 통통 튀는 리듬
- **무리로 여러 번 겹쳐도 거슬리지 않아야** 함 → 효과음은 앞이 바로 시작(어택이 빠름)하고 꼬리(잔향)가 짧게. 게임이 음을 올려 연달아 내므로 **음정이 뚜렷한 소리**가 좋음
- 목소리·가사 없음

## 2. ComfyUI 준비

> 노드 이름·기본값은 ComfyUI 버전마다 조금 다를 수 있습니다. 가장 쉬운 방법은 ComfyUI 메뉴의 **템플릿(Browse Templates) → Audio** 에서 해당 예제를 열고 아래 값만 바꾸는 것입니다.

| 용도 | 모델 | 시작 템플릿 | 핵심 노드 |
|---|---|---|---|
| **효과음** (22개) | **Stable Audio Open 1.0** (`stable-audio-open-1.0.safetensors` + 텍스트 인코더 `t5_base.safetensors`) | Audio → Stable Audio | 체크포인트 불러오기 → CLIP 불러오기(type: stable_audio, t5_base) → 텍스트 인코드(긍정·부정) → **EmptyLatentAudio(초)** → KSampler → VAE Decode Audio → **Save Audio (MP3 또는 Opus)** |
| **배경 음악** (1곡) | **ACE-Step v1 3.5B** (`ace_step_v1_3.5b.safetensors`) | Audio → ACE-Step | **TextEncodeAceStepAudio**(tags = 장르·악기·분위기, lyrics = `[instrumental]`) → **EmptyAceStepLatentAudio(초)** → KSampler → VAE Decode Audio → Save Audio |
| (대안) 배경 음악 | Stable Audio Open 으로 30~45초 반복 구간 | Audio → Stable Audio | 최대 약 47초. "seamless loop" 를 프롬프트에 넣고 후처리에서 이음새 다듬기 |

- **시드 고정**: 마음에 드는 결과의 시드를 7장 표에 적고, 비슷한 소리 묶음(정지·재생 / 별·아이템)은 **같은 시드에서 프롬프트만 바꿔** 뽑으면 한 세트처럼 들림 (이미지 문서와 같은 방식)
- 효과음은 **한 번에 4~8개 후보**(배치 크기)를 뽑아 듣고 고르기. 효과음 길이(초)는 아래 표의 "뽑는 길이"로 두고, 남는 뒤쪽 무음은 후처리에서 자름
- 저장 형식: **MP3(128kbps) 또는 Opus(ogg)**. 기본 Save Audio(FLAC)로 저장해도 게임은 읽지만 제출본이 무거워짐 (빌드가 1MB 넘는 파일을 알려 줌)

## 3. 스타일 블록 (모든 효과음 프롬프트 앞에 붙임)

```
(효과음 앞)  cute cartoon game sound effect for a hand-drawn sketchbook puzzle game, soft and playful,
            clean, dry, close-up, short with a quick attack and very short tail, high quality, mono
(효과음 부정) music, melody, chords, voice, speech, vocals, singing, long reverb, echo, background noise,
            hum, hiss, distortion, clipping, harsh, metallic clang, explosion, gunshot, scream, low quality
(배경 음악 부정 — ACE-Step 은 tags 에 넣지 말고 아래 "피할 것"을 tags 에서 빼는 방식)
            vocals, lyrics, heavy drums, distorted guitar, dark, aggressive, epic orchestra, EDM drop
```

## 4. 파일 목록 (stopsketch/assets/sound/ · 파일 이름 = 게임이 찾는 이름)

> 확장자는 `.mp3` · `.ogg` · `.wav` · `.flac` 중 아무거나 (게임은 이 순서로 찾음). **이름은 표와 똑같이.**
> 우선: ★ 꼭 (핵심 장면) · ☆ 있으면 좋음 · ○ 나중. 음량·음 흔들림은 `stopsketch_swarm/src/data.js` 의 `sound.sfx` 에서 Claude가 맞춤

| # | 우선 | 파일 이름 | 뽑는 길이 → 최종 | 게임에서 나는 때 | 만들 때 주의 |
|---|---|---|---|---|---|
| S1 | ★ ✅ | `bgm_main` | 60~90초 | 출발부터 계속 반복. 정지 중엔 먹먹하게 | **처음과 끝이 이어지게**(반복 이음새). 장조, 90~110 BPM. 효과음이 위에 얹혀도 묻히지 않게 중음역은 비우고 가볍게 |
| S2 | ★ | `sfx_stop` | 1초 → 0.5초 | 스페이스로 **시간 정지** | 시간이 "멈추는" 느낌: 아래로 내려가는 짧은 글리산도 + 째깍. S3 과 **같은 시드** |
| S3 | ★ | `sfx_resume` | 1초 → 0.5초 | 다시 스페이스로 **재생** | S2 의 반대: 위로 올라가며 풀리는 소리 |
| S4 | ★ | `sfx_draw` | 3초 → 2초 (반복) | **선을 긋는 동안** 계속 반복 | 연필·크레용이 종이를 사각사각. **이음새 없이 반복**되게, 음정 없음, 작게 |
| S5 | ★ | `sfx_bounce` | 1초 → 0.3초 | **빨강에 튕김** (무리면 톡톡톡 음이 올라감) | 탄력 있는 "뿅", 고무공·스프링. **음정이 뚜렷하게** |
| S6 | ★ | `sfx_boost` | 1초 → 0.5초 | **파랑에서 빨라짐** | 짧은 바람 "슝" 위로 올라가는 느낌 |
| S7 | ★ | `sfx_rise` | 2초 → 1초 | **초록이 떠오르기 시작** | 물속 거품이 보글보글 올라가는 소리 |
| S8 | ★ | `sfx_erase` | 1초 → 0.5초 | **노랑으로 결정 막대를 지움** | 지우개로 "쓱쓱" + 유리·결정이 톡 깨지는 작은 소리 |
| S9 | ★ | `sfx_suck` | 1초 → 0.6초 | **우클릭으로 선을 빨아들임** | 빨대로 "쭈욱" 빨아들이는 짧은 소리, 끝이 위로 |
| S10 | ★ | `sfx_plop` | 1초 → 0.4초 | 물방울이 **검은 잉크병에 퐁당** (줄지어 들어감) | 작은 물방울이 병 속 잉크에 "퐁". 음정이 있어 연달아 올라가면 귀여움 |
| S11 | ★ | `sfx_lost` | 1초 → 0.6초 | 물방울을 **잃음**(지우개·가시·떨어짐), 주인공 실패 때도 | 슬프지 않게 짧은 "뿌우" 내려가는 소리 + 사라짐 |
| S12 | ★ | `sfx_clear` | 5초 → 3초 | **클리어** 결과 (배경 음악은 잠시 작아짐) | 밝은 짧은 음악(징글): 마림바·철금 상행 + 마지막 반짝 |
| S13 | ★ | `sfx_fail` | 4초 → 2.5초 | **실패** 결과 | 짧고 귀여운 "아이고" 하행 징글, 무겁지 않게 |
| S14 | ☆ | `sfx_land` | 1초 → 0.25초 | 떨어지던 **선이 땅·벽에 닿음** (세게 닿을수록 큼) | 나무 막대가 종이 위에 "톡" 떨어지는 소리, 둔하고 짧게 |
| S15 | ☆ | `sfx_wake` | 1초 → 0.5초 | **잠든 물방울이 깨어남** | 하품 대신 짧은 "뾰롱" + 반짝 |
| S16 | ☆ | `sfx_join` | 1초 → 0.2초 | 물방울이 **대열에 붙음**(통 튀어 착지) | 아주 짧은 "톡", 무리로 연달아 나도 괜찮게 |
| S17 | ☆ | `sfx_star` | 2초 → 0.8초 | **별을 주움** | 반짝이는 상행 철금 2~3음 |
| S18 | ☆ | `sfx_item` | 2초 → 0.8초 | **정지 +1 · 잉크 병**을 주움 | S17 과 같은 시드로, 조금 더 낮고 "획득" 느낌 |
| S19 | ☆ | `sfx_shoot` | 1초 → 0.3초 | **발사기가 쏨** (주인공과 멀면 작게) | 장난감 대포 "퐁", 위협적이지 않게 |
| S20 | ☆ | `sfx_block` | 1초 → 0.4초 | 투사체가 **같은 색 선에 막혀 터짐** | 물감 방울이 "팍" 튀는 소리 |
| S21 | ☆ | `sfx_eraser` | 3초 → 2초 (반복) | **지우개가 문지르며 다가옴** (가까울수록 큼) | 큰 고무 지우개가 종이를 박박 문지르는 소리, **이음새 없이 반복**, 음정 없음 |
| S22 | ○ | `sfx_color` | 1초 → 0.15초 | **물감 색을 바꿈** (1~5·병 클릭) | 작은 유리병이 "딸깍" |
| S23 | ○ | `sfx_click` | 1초 → 0.15초 | 결과·일시 정지 창 **버튼** | 종이 버튼 "톡" |

## 5. 프롬프트 (효과음은 앞에 3장 스타일 블록을 붙임)

```
(bgm_main — ACE-Step tags)
  instrumental, cheerful casual puzzle game music, hand-drawn sketchbook mood, marimba, glockenspiel,
  pizzicato strings, ukulele, light percussion, bouncy, playful, warm, major key, 100 bpm, seamless loop
  (lyrics: [instrumental] · 길이 75초)
(bgm_main — Stable Audio 로 할 때)
  seamless looping background music for a cute hand-drawn puzzle game, marimba and glockenspiel melody,
  pizzicato strings, soft light percussion, bouncy and playful, major key, 100 BPM, no vocals

(sfx_stop)    a magical time-freeze sound, quick descending glissando ending in a soft tick of a clock, short
(sfx_resume)  a magical time-resume sound, quick ascending glissando releasing into a light sparkle, short
(sfx_draw)    a pencil and crayon scribbling on paper, continuous soft scratching, seamless loop, no pitch
(sfx_bounce)  a springy rubber ball bounce, bright cartoon boing with a clear pitch, very short
(sfx_boost)   a quick whoosh of air rising in pitch, cartoon speed dash, short
(sfx_rise)    soft bubbles rising in water, gentle bubbling blub blub, light and airy
(sfx_erase)   a rubber eraser rubbing quickly on paper followed by a tiny glass crystal crack, short
(sfx_suck)    a short straw slurp sucking up liquid, rising pitch at the end, cartoon
(sfx_plop)    a small water droplet plopping into a jar of ink, clear pitched plop, very short
(sfx_lost)    a soft cartoon deflating poof with a descending tone, gentle, not sad, short
(sfx_clear)   a short happy victory jingle, ascending marimba and glockenspiel notes ending with a sparkle, major key
(sfx_fail)    a short cute failure jingle, descending marimba notes, oops, light and playful, not dramatic
(sfx_land)    a small wooden stick dropping onto paper, dull soft tap, very short
(sfx_wake)    a tiny creature waking up, short rising bloop with a little twinkle
(sfx_join)    a tiny soft pop tap, very short, clear pitch
(sfx_star)    a bright sparkling pickup sound, three ascending glockenspiel notes, short
(sfx_item)    a pleasant item pickup sound, two ascending bell notes with a soft shimmer, short
(sfx_shoot)   a small toy cannon firing, soft pop with a puff of air, short, not threatening
(sfx_block)   a paint blob splatting against a surface, wet splat, short
(sfx_eraser)  a big rubber eraser scrubbing hard on paper, continuous rough rubbing, seamless loop, no pitch
(sfx_color)   a small glass ink bottle clink, tiny and clean, very short
(sfx_click)   a soft paper button tap, tiny click, very short
```
- 같은 시드로 묶어 뽑기: `sfx_stop`↔`sfx_resume`, `sfx_star`↔`sfx_item`, `sfx_draw`↔`sfx_eraser`(크기만 다르게), `sfx_clear`↔`sfx_fail`
- 결과가 너무 길게 울리면 부정 프롬프트에 `long reverb, echo` 가 있는지 확인하고, 긍정 쪽에 `dry, very short` 를 한 번 더

## 6. 후처리 (Audacity 등 무료 편집기면 충분)

| 할 일 | 기준 |
|---|---|
| 앞뒤 무음 자르기 | 효과음은 **소리가 바로 시작**하게 (앞 무음 0.01초 이하). 길이는 4장 "최종" 정도 |
| 끝 처리 | 끝을 0.03~0.1초 짧게 페이드 아웃 (뚝 끊기는 소리 방지) |
| 반복 소리 (`bgm_main` · `sfx_draw` · `sfx_eraser`) | 끝과 처음이 이어지게 자르고, 이음새에서 "틱" 소리가 나지 않는지 반복 재생으로 확인 |
| 크기 맞추기 | 최대 -1dB 로 정규화. 효과음끼리 크기가 비슷하게 (게임 쪽 음량은 Claude가 `data.js sound.sfx` 에서 맞춤) |
| 형식 | 효과음 **모노**, 배경 음악 스테레오. **MP3 128kbps 또는 OGG** |
| 용량 목표 | 배경 음악 1.5MB 이하, 효과음 하나 50KB 안팎 → 제출본 약 1MB → 3MB 정도 |

## 7. 게임에 넣는 법

1. 고른 파일을 이름대로 `D:\stopsketch\stopsketch\assets\sound\` 에 넣음 (폴더가 없으면 만듦)
2. 개발본(`stopsketch_swarm/src/index.html`)을 새로 고침 → 한 번 클릭해 출발하면 소리가 남 (브라우저는 클릭 전 소리를 막음)
3. 제출본 다시 만들기: `python stopsketch_swarm/tools/build_single.py` → "소리 N개 내장 / 없는 소리" 가 출력됨
4. 크기·음량이 어색하면 Claude에게: "sfx_bounce 가 너무 커" → `data.js sound.sfx` 값 조정. 배경 음악·효과음 전체 크기는 UI 툴(`tools/ui_editor.html`)의 `musicVolume` · `sfxVolume`
5. 확인할 것: M 키·스피커로 꺼지는지, 스페이스로 정지하면 음악이 먹먹해지는지, 대열이 튕길 때 "톡톡톡" 음이 올라가는지

## 8. 판단 기준 (고를 때)

- 무리로 10번 연달아 나도 귀가 피곤하지 않은가 (짧고, 날카롭지 않음)
- 음을 올려 연달아 냈을 때 어색하지 않은가 (`sfx_bounce` · `sfx_plop` · `sfx_join` · `sfx_wake`)
- 빨강·파랑·초록·노랑 소리가 눈을 감고도 구분되는가
- 정지(S2)와 재생(S3)이 한 쌍으로 들리는가
- 배경 음악 위에서 효과음이 묻히지 않는가, 배경 음악이 1분 넘게 반복돼도 질리지 않는가
- 그림(손그림 스케치북)과 어울리는가 — 너무 사실적이거나 전자음이면 다시

## 8-1. 적용 결과 (2026-10-22, 사용자가 만든 소리 23개)

> 23개 모두 이름대로 들어옴 (mp3 128kbps, 효과음 모노 · 배경 음악 스테레오 44.1kHz). 제출본에 모두 내장, 제출본 약 1MB → **2.56MB**.

| 점검 | 결과 |
|---|---|
| 길이 | 4장 "최종"과 거의 같음 (배경 음악 55.3초, 효과음 0.10~3.21초) |
| 최대 음량 | 모두 -0.3 ~ -2.2dB (정규화 잘 됨) |
| 앞 무음 | 0~27ms (바로 시작함) |
| 반복 이음새 | 배경 음악: 처음·끝 크기가 비슷하고(-18.7 / -19.6dB) 이어짐 좋음 → 그대로 / `sfx_draw`: 끝 약 20ms 가 작아지는 짧은 페이드 / `sfx_eraser`: 좋음 → **코드에서 반복 구간의 앞뒤 작은 부분을 자동으로 건너뜀** (draw 앞 25ms·뒤 55ms, eraser 앞뒤 10ms) |
| 크기 차이 | `sfx_draw` 가 평균 -27dB 로 다른 효과음(-13~-20dB)보다 작음 → 게임 음량 0.5 → **0.9** (`data.js sound.sfx`) |
| 게임에서 | 제출본에서 데모 3 정석 루트를 진행하며 셈: 별 3 · 정화 100% 클리어 동안 효과음 17종이 사건에 맞춰 남 (깨어남 10 · 합류 10 · 퐁당 11 · 별 3 · 아이템 2 · 정지/재생 5 · 튕김 7 · 가속 2 · 떠오름 1 · 지우기 1 · 빨아들이기 2 · 발사 32 · 막힘 18 · 지우개 · 클리어). 따로 그리기·선 착지·잃음·실패·버튼 클릭 확인 → **23개 모두 남** |
| 귀로 들어 볼 것 (사용자) | 무리로 연달아 날 때 거슬리지 않는지(`sfx_shoot` 이 데모 3에서 32번), 정지 중 먹먹함, 효과음과 배경 음악의 크기 균형 |

## 8-2. 효과음 빼고 배경 음악만 (사용자 결정 2026-10-23)

> 사용자가 효과음 22개를 모두 지우고 새 배경 음악(`bgm_main.mp3`)만 남김. 게임은 `data.js sound.useSfx: false` 로 효과음을 찾지 않음 (다시 쓰려면 true + 파일을 넣음. 효과음 장치·목록·이 문서의 효과음 장은 그대로 둠)

| 점검 (새 배경 음악) | 결과 |
|---|---|
| 형식 | mp3 160kbps, 48kHz 스테레오, 2.0MB (제출본 약 1MB → **3.7MB**) |
| 길이 | 85.8초 |
| 크기 | 평균 -14.4dB (이전 곡보다 약 4dB 큼), 최대 +0.1dB (0을 아주 조금 넘음 — 게임은 음량 0.45로 줄여 내므로 문제없음) |
| 반복 | 처음 약 0.1초 조용, **끝 약 1초가 페이드아웃**(-27 → -50dB) → 게임이 조용한 앞 0.095초·뒤 약 0.8초를 건너뛰고 0.095~84.99초를 반복. 긴 공백은 없지만 끝이 작아지다가 처음으로 돌아가므로 이음새가 들릴 수 있음 (완전히 자연스럽게 하려면 페이드아웃 없이 다시 내보내기) |
| 게임에서 | 제출본·개발본 모두 배경 음악 하나만 불러옴(효과음 요청 없음, 외부 요청 0, 콘솔 오류 없음), 정지 중 660Hz·음량 0.45→0.25 로 먹먹해지고 재생하면 원래대로, M 키·스피커로 끔 |

## 9. 선택 기록표 (제출 리소스 + "본인 경험 및 의견" 근거)

| 파일 | 모델 | 시드 | 프롬프트에서 바꾼 점 | 후보 수 | 고른 이유 | 후처리 | 날짜 |
|---|---|---|---|---|---|---|---|
| bgm_main | ACE-Step | | | | | | |
| sfx_stop | Stable Audio Open | | | | | | |
| sfx_resume | Stable Audio Open | | | | | | |
| … | | | | | | | |

> 이미지와 같이, AI가 만든 후보를 **직접 듣고 고르고 다듬은 기록**이 평가에서 "본인의 판단" 근거가 됩니다. 시드·고른 이유는 짧게라도 남겨 주세요.

## 8-3. 효과음 다시 넣음 (사용자 2026-10-23 오후)

> 사용자가 효과음 22개를 새로 만들어 `stopsketch/assets/sound/` 에 넣음 → `data.js sound.useSfx: true` 로 다시 켬.
> 점검(Claude): 22개 모두 이름이 4장 표와 같고 읽힘. 모두 모노, 길이 0.14~1.9초, 최고 음량 약 -1.5dB 로 맞춰져 있고 앞 무음 5ms 이하.
> 반복 소리(`sfx_draw`·`sfx_eraser`)는 끝 15ms 를 건너뛰고 반복. 실제 플레이(데모 3 풀이·시험 스테이지·데모 1)에서 22개 모두 한 번 이상 나는 것 확인.
> 평균 음량은 `sfx_wake` 가 가장 큼(약 -10dB), `sfx_eraser`·`sfx_click` 이 가장 작음(약 -23~24dB) — 들어 보고 크기가 안 맞으면 `data.js sound.sfx` 의 음량 값으로 조절.
