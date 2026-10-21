# 스톱 앤 스케치 (가제, 구 잉크 런) — Claude 작업 안내

자동으로 달리는 물방울 낙서 생물을 위해 시간을 멈추고 색 잉크로 선을 그려 길을 만드는 2D 물리 그리기 액션 데모 (HTML5, 사내 평가용).

## 새 세션 시작할 때
1. `stopsketch/DEVLOG.md` 의 **"다음 할 일 (새 세션은 여기부터)"** 와 **"사용자에게 물을 것"** 을 먼저 읽는다. 가장 최근 일차 섹션이 지금 상태다.
2. 결정의 기준 문서: `업무가이드_통합.md` 11장(확정 내용), `스톱앤스케치_게임개요_초안.md`, 이미지는 `스톱앤스케치_AI이미지_프롬프트_ComfyUI.md` (가장 뒤 장이 최신 요청).

## 작업 규칙 (사용자 요청)
- **답변은 한국어로.**
- **수정할 때마다 기록한다**: 사용자 결정은 "(사용자 결정 날짜)" 로, Claude가 임시로 정한 것은 "Claude가 임시로 정한 것" 표에. `DEVLOG.md` 와 관련 문서(README, 개요 초안, 업무가이드, 이미지 문서)를 함께 고친다. "다음 할 일" 도 늘 최신으로.
- **수정할 때마다 GitHub에 올린다**: https://github.com/willy9068/Stop-Sketch (main). 저장소 루트 = `D:\stopsketch`. 커밋 메시지는 한국어.
- 이미지 프롬프트에 기존 작품·캐릭터·작가 이름을 넣지 않는다 (느낌은 특징으로 풀어 씀).

## 구조
- **정식 데모 = 무리 버전 `stopsketch_swarm/` (사용자 결정 2026-10-20).** 제출본 `stopsketch_swarm/dist/stopsketch_swarm_demo.html`, 스테이지는 데모 1~3 (테스트용 스테이지는 `test: true` 로 게임에서 숨김)
- **두 갈래 (2026-10-20):** `stopsketch/` = 기존 데모(한 마리 + 색 3종, 이제 참고용) / `stopsketch_swarm/` = **물방울 무리판**(주인공 + 작은 물방울, 떨어지는 선, 물감 5색, 검은 잉크병 정화). 서로 코드가 따로이고 이미지는 `stopsketch/assets` 를 같이 씀. 기록(DEVLOG)은 `stopsketch/DEVLOG.md` 하나에 함께
- 용어 (사용자 결정 2026-10-20): **스테이지** = 시작 → 도착 한 판, **구간** = 스테이지를 이루는 부분(이동·퍼즐·아이템 구간). 기존 데모 코드·문서의 "구간"은 스테이지를 뜻함
- `stopsketch/src/` 개발본 (일반 `<script>` 순서 로딩). 모든 수치는 `data.js`, 구간은 `levels.js`(레벨 툴이 저장)
- 무리판 `stopsketch_swarm/tools/ui_editor.html` + `ui_editor.js` = UI·글자 툴 (게임 화면 글자·크기·색·위치 → `src/uitext.js`, 사용자 요청 2026-10-21). 게임 글자는 코드에 직접 쓰지 말고 `uitext.js` + `G.T()`
- `stopsketch/tools/level_editor.html` + `editor.js` 레벨 툴, `test.js` 순수 계산 테스트, `sim.js` 물리 시뮬레이션, `build_single.py` 제출본 빌드
- `stopsketch/assets/` 게임이 쓰는 이미지(파일명 = 이미지 문서 3장 표). 없으면 코드로 그린 임시 모양
- `stopsketch_Image/` 사용자가 만든 원본 이미지

## 고친 뒤 확인 순서 (고친 폴더에서)
```
node stopsketch/tools/test.js
node stopsketch/tools/sim.js
PYTHONIOENCODING=utf-8 python stopsketch/tools/build_single.py
```
무리 시험판은 `stopsketch_swarm/tools/` 의 같은 이름 파일. 브라우저는 `.claude/launch.json` 의 `stopsketch-swarm` (주소 `/stopsketch_swarm/src/index.html`)
- 브라우저 확인: `.claude/launch.json` 의 `stopsketch-dev` (주소 `/src/index.html`, `/dist/stopsketch_demo.html`, `/tools/level_editor.html`). 예전 js가 캐시되므로 고친 파일은 강력 새로고침
- 미리보기 탭이 백그라운드면 게임 루프가 거의 안 돌아감 → `G.Game.update(G.app.game, 1000/60)` 를 직접 반복 호출해 확인. 페이지 자체 루프가 끼어들면 `window.requestAnimationFrame = () => 0` 으로 멈추고 확인
- 제출본은 외부 요청 0이어야 함
