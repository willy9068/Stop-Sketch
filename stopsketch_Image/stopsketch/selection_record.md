# stopsketch 선택 기록표 (제출 리소스용 · 자동 검수 기반 임시 선택)

> '고른 이유'와 '직접 고친 내용'은 작성자가 직접 채워 주세요. 모델: FLUX.1 schnell fp8 (Apache-2.0, huggingface Comfy-Org/flux1-schnell) — 상업 이용 가능 여부와 확인 날짜는 직접 확인·기록 필요. 1차 최종본 중 교체된 것은 v1_replaced/ 에 보관.

| 파일 | 모델 | 시드 | 뽑은 수(누적) | 선택 원본 | 후처리 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| key_art.png | flux1-schnell-fp8 | 7006 | 16 | candidates/key_art_s5_c3.png | 리사이즈 1920x1080 |  |
| bg_a.png | flux1-schnell-fp8 | 7010 | 16 | candidates/bg_a_c1.png | 구름만 분리해 종이 바탕만 좌우 이음매 처리(구름 복제 방지), 리사이즈 1920x1080 | 2차 수정: 별·얼룩 없는 구름 2개 배경. 이음매 확인 완료(아래 영역 밝기 편차 0.14) |
| bg_b.png | flux1-schnell-fp8 | 7511 | 16 | candidates/bg_b_c2.png | 왼쪽 12%(빨간 여백선) 잘라냄, 좌우 이음매 처리(교차 혼합), 리사이즈 1920x1080 | 2차 수정: 제본 구멍은 없으나 빨간 여백선이 나와서 왼쪽 12%를 잘라냄. 줄만 있는 노트, 좌우 이음매 처리 |
| char_idle.png | flux1-schnell-fp8 | 7000 | 12 | candidates/char_idle_c2.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 |  |
| char_run.png | flux1-schnell-fp8 | 7000 | 4 | candidates/char_run_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 |  |
| char_jump.png | flux1-schnell-fp8 | 7000 | 4 | candidates/char_jump_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 | 문서 결정으로 사용 안 함(1차 최종본 유지, 게임에서 미사용) |
| char_erased.png | flux1-schnell-fp8 | 7000 | 4 | candidates/char_erased_c1.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 |  |
| eraser_edge.png | flux1-schnell-fp8 | 7004 | 4 | candidates/eraser_edge_c2.png | 리사이즈 512x1080 |  |
| ink_red.png | flux1-schnell-fp8 | 7100 | 16 | candidates/ink_red_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 192x256 |  |
| ink_blue.png | flux1-schnell-fp8 | 7100 | 4 | candidates/ink_blue_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 192x256 |  |
| ink_green.png | flux1-schnell-fp8 | 7100 | 4 | candidates/ink_green_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 192x256 |  |
| ink_select.png | flux1-schnell-fp8 | 7101 | 4 | candidates/ink_select_c2.png | 흰 배경 색 따기(속 빈 형태 유지)+가장자리 색 보정, 리사이즈 224x288 |  |
| ui_shelf.png | flux1-schnell-fp8 | 7200 | 4 | candidates/ui_shelf_c1.png | rembg(u2net)+가장자리 색 보정, 리사이즈 1280x160 |  |
| ui_gauge_frame.png | flux1-schnell-fp8 | 7012 | 12 | candidates/ui_gauge_frame_c3.png | 흰 배경 색 따기(안쪽 투명), 칸 가득 늘림, 리사이즈 512x64 | 2차 수정: 안쪽 투명. 반사광(흰색)도 함께 사라짐 |
| ui_stop_on.png | flux1-schnell-fp8 | 7202 | 4 | candidates/ui_stop_on_c1.png | rembg(u2net)+가장자리 색 보정, 리사이즈 96x96 | 꺼짐(off)은 코드에서 흐리게 처리 |
| ui_panel.png | flux1-schnell-fp8 | 7013 | 8 | candidates/ui_panel_c4.png | 바깥 흰 배경만 제거, 안쪽을 종이색(#F3E9D2)으로 채움, 리사이즈 640x400 | 2차 수정: 닫힌 외곽선 + 안쪽 종이색(#F3E9D2) |
| star_empty.png | flux1-schnell-fp8 | 7300 | 4 | candidates/star_empty_c4.png | 흰 배경 색 따기(속 빈 형태 유지)+가장자리 색 보정, 리사이즈 128x128 |  |
| star_full.png | flux1-schnell-fp8 | 7300 | 4 | candidates/star_full_c3.png | rembg(u2net)+가장자리 색 보정, 리사이즈 128x128 |  |
| obs_wall.png | flux1-schnell-fp8 | 7400 | 4 | candidates/obs_wall_c4.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 | 예비(입체 상자라 prop_wall로 교체 권장) |
| obs_gap.png | flux1-schnell-fp8 | 7401 | 8 | candidates/obs_gap_c3.png | 흰 배경 색 따기(속 빈 형태 유지)+가장자리 색 보정, 리사이즈 256x128 |  |
| obs_shooter.png | flux1-schnell-fp8 | 7402 | 4 | candidates/obs_shooter_c2.png | rembg(u2net)+가장자리 색 보정, 리사이즈 256x256 |  |
| proj.png | flux1-schnell-fp8 | 7403 | 4 | candidates/proj_c2.png | rembg(u2net)+가장자리 색 보정, 리사이즈 96x96 |  |
| tut_hand.png | flux1-schnell-fp8 | 7500 | 4 | candidates/tut_hand_c2.png | rembg(u2net)+가장자리 색 보정, 리사이즈 128x128 |  |
| fx_chain.png | flux1-schnell-fp8 | 7600 | 8 | candidates/fx_chain_c1.png | 흰 배경 색 따기(속 빈 형태 유지)+가장자리 색 보정, 리사이즈 256x256 |  |
| bg_plain.png | flux1-schnell-fp8 | 7040 | 4 | candidates/bg_plain_c4.png | 좌우 이음매 처리(교차 혼합), 리사이즈 1920x1080 | 장식 없는 종이(후보 4번만 비어 있었고 나머지는 낙서가 가득 나옴), 좌우 이음매 처리 |
| ground_top.png | flux1-schnell-fp8 | 7920 | 8 | candidates/ground_top_c1.png | 왼쪽 절반을 좌우 대칭으로 이어 이음매 제거, 흰 배경 색 따기, 리사이즈 512x96 | 굵은 윗선 + 옅은 종이 띠가 투명으로 사라짐. 왼쪽 절반을 대칭으로 이어 좌우 이음매 제거(대칭 반복 느낌 있음) |
| ground_fill.png | flux1-schnell-fp8 | 7521 | 8 | candidates/ground_fill_c4.png | 사방 이음매 처리, 리사이즈 256x256 | 매우 옅은 베이지(문서의 '옅은 빗금'은 약해서 사실상 무늬 없음). 사방 이음매 처리 |
| prop_wall.png | flux1-schnell-fp8 | 7022 | 4 | candidates/prop_wall_c1.png | 바깥 흰 배경만 제거(안쪽 불투명), 안쪽 흰색을 종이색으로, 칸 가득 늘림, 리사이즈 256x256 | 정면 2D 벽돌 무늬. 안쪽 흰색을 종이색으로, 칸 가득 늘림. 9분할 테두리 폭은 직접 확인 필요(약 40px 기준) |
| prop_platform.png | flux1-schnell-fp8 | 7023 | 4 | candidates/prop_platform_c4.png | 바깥 흰 배경만 제거(안쪽 불투명), 안쪽 흰색을 종이색으로, 칸 가득 늘림, 리사이즈 256x64 | 얇은 나무판. 칸 가득 늘림, 테두리 폭은 직접 확인 필요(약 24px 기준) |
| char_fall.png | flux1-schnell-fp8 | 8700 | 16 | candidates/char_fall_c2.png | rembg, 리사이즈 256x256 | 옅은 청록 몸 + 놀란 눈·입. 'char_idle'과 달리 약간 기울어진 옆모습. 표정 묘사를 3차례 바꿔 재생성 |
| goal_flag.png | flux1-schnell-fp8 | 7024 | 4 | candidates/goal_flag_c1.png | 바깥 흰 배경 제거, 기둥을 왼쪽 20% 지점·바닥에 맞춤, 리사이즈 256x256 | 문서의 '별 표시'는 안 나옴. 기둥 왼쪽 20%·바닥 정렬 |
| deco_cloud_1.png | flux1-schnell-fp8 | 7030 | 4 | candidates/deco_cloud_1_c2.png | 흰 배경 색 따기(안쪽 투명), 리사이즈 512x320 | 둥근 구름, 안쪽 투명 |
| deco_cloud_2.png | flux1-schnell-fp8 | 7031 | 4 | candidates/deco_cloud_2_c3.png | 흰 배경 색 따기(안쪽 투명), 리사이즈 512x320 | 길고 납작한 구름, 안쪽 투명 |
| deco_cloud_3.png | flux1-schnell-fp8 | 7032 | 4 | candidates/deco_cloud_3_c4.png | 흰 배경 색 따기(안쪽 투명), 리사이즈 512x320 | 작고 몽글한 구름, 안쪽 투명 |
| fx_star_pop.png | flux1-schnell-fp8 | 7541 | 8 | candidates/fx_star_pop_c4.png | 흰 배경 색 따기, 리사이즈 256x256 | 노란 별 고리(문서의 '빈 중심 주위 반짝') |
| fx_land.png | flux1-schnell-fp8 | 7942 | 12 | candidates/fx_land_c1.png | 바깥 흰 배경만 제거(먼지 안쪽 불투명), 리사이즈 256x128 | 먼지 3개. 바닥선이 나오지 않도록 문구를 바꿔 재생성 |
