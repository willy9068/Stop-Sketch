# 데모 제출 폴더 만들기 (사용자 요청 2026-10-22): D:\stopsketch\데모제출\ 에 필수 6가지를 번호 폴더로 모은다.
#   1 게임 개요 문서 · 2 대표 이미지(인게임 스크린샷, 이미 찍어 둔 것) · 3 데모 빌드(단일 HTML) · 4 소스 코드(zip) · 5 리소스(zip) · 6 데모 플레이 영상(사용자가 녹화해 넣음)
# 사용: python stopsketch_swarm/tools/make_submission.py   (먼저 build_single.py 로 제출본을 새로 만들 것)
import io, os, shutil, zipfile

TOOLS = os.path.dirname(os.path.abspath(__file__))
SWARM = os.path.dirname(TOOLS)
ROOT = os.path.dirname(SWARM)
OUT = os.path.join(ROOT, '데모제출')
SKIP_DIRS = {'__pycache__'}


def files_under(base):
    for d, dirs, names in os.walk(base):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for n in sorted(names):
            if not n.endswith('.pyc'):
                yield os.path.join(d, n)


def add(z, path):
    z.write(path, os.path.relpath(path, ROOT).replace(os.sep, '/'))


def write(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(text)


def main():
    for sub in ['1_게임개요', '3_데모빌드', '4_소스코드', '5_리소스']:   # 2_대표이미지·6_데모플레이영상은 손으로 넣는 것이라 지우지 않음
        shutil.rmtree(os.path.join(OUT, sub), ignore_errors=True)
    os.makedirs(os.path.join(OUT, '2_대표이미지'), exist_ok=True)
    os.makedirs(os.path.join(OUT, '6_데모플레이영상'), exist_ok=True)

    # 1 게임 개요 문서
    os.makedirs(os.path.join(OUT, '1_게임개요'))
    shutil.copy(os.path.join(ROOT, '스톱앤스케치_게임개요_초안.md'), os.path.join(OUT, '1_게임개요', '스톱앤스케치_게임개요.md'))
    shutil.copy(os.path.join(ROOT, '스톱앤스케치_레퍼런스_성과_조사표.md'), os.path.join(OUT, '1_게임개요', '첨부_레퍼런스_성과_조사표.md'))

    # 3 데모 빌드
    os.makedirs(os.path.join(OUT, '3_데모빌드'))
    shutil.copy(os.path.join(SWARM, 'dist', 'stopsketch_swarm_demo.html'), os.path.join(OUT, '3_데모빌드', 'stopsketch_swarm_demo.html'))

    # 4 소스 코드: 무리 데모 전체(src·tools·README) + 게임이 읽는 이미지(stopsketch/assets 의 png). 풀면 폴더 구조 그대로 실행됨
    os.makedirs(os.path.join(OUT, '4_소스코드'))
    with zipfile.ZipFile(os.path.join(OUT, '4_소스코드', 'stopsketch_소스코드.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for sub in ['src', 'tools']:
            for p in files_under(os.path.join(SWARM, sub)):
                add(z, p)
        add(z, os.path.join(SWARM, 'README.md'))
        for p in files_under(os.path.join(ROOT, 'stopsketch', 'assets')):
            if p.endswith('.png'):
                add(z, p)

    # 5 리소스: 게임 이미지 + 생성·선택 기록, 이미지 프롬프트, 수치(data.js)·화면 글자(uitext.js)·스테이지(levels.js), 설계·개발 기록
    os.makedirs(os.path.join(OUT, '5_리소스'))
    with zipfile.ZipFile(os.path.join(OUT, '5_리소스', 'stopsketch_리소스.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files_under(os.path.join(ROOT, 'stopsketch', 'assets')):
            add(z, p)
        for rel in ['스톱앤스케치_AI이미지_프롬프트_ComfyUI.md', '스톱앤스케치_레퍼런스_성과_조사표.md', '스톱앤스케치_게임개요_초안.md',
                    'stopsketch/DEVLOG.md', 'stopsketch/docs/일일히스토리.md',
                    'stopsketch_swarm/src/data.js', 'stopsketch_swarm/src/uitext.js', 'stopsketch_swarm/src/levels.js']:
            add(z, os.path.join(ROOT, rel))

    write('6_데모플레이영상/여기에_영상.txt', '데모 플레이 영상(제출본 3_데모빌드/stopsketch_swarm_demo.html 을 실제로 플레이한 화면 녹화)을 이 폴더에 넣습니다.\n'
          '핵심 장면(시간 정지 → 색 골라 그리기 → 재생 후 대열이 튕기고·떠오르고·잉크병에 들어가는 장면)이 처음 몇 초 안에 보이게.\n')
    for sub in ['1_게임개요', '2_대표이미지', '3_데모빌드', '4_소스코드', '5_리소스', '6_데모플레이영상']:
        names = sorted(os.listdir(os.path.join(OUT, sub)))
        size = sum(os.path.getsize(os.path.join(OUT, sub, n)) for n in names)
        print(sub, len(names), '개', round(size / 1024 / 1024, 2), 'MB')


if __name__ == '__main__':
    main()
