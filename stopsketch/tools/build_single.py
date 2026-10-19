#!/usr/bin/env python
"""단일 HTML 빌드: src/index.html + 모든 <script src> + 이미지를 한 파일로 합친다.

사용:  python tools/build_single.py [출력 경로]
기본 출력: dist/stopsketch_demo.html

- 길목 대장간 build_single.py 의 구조를 따라 새로 작성
- 원본(src/*, assets/*)은 건드리지 않는다. 합친 결과만 새로 만든다.
- 이미지: assets/<이름>.png 중 data.js art.images 에 있는 것만 WebP로 줄여(가로 최대 1280) base64로 넣는다.
  없는 이미지는 게임이 색 블록으로 그린다. assets/original/ 등 하위 폴더는 보지 않는다.
- 합친 뒤 외부 요청(src=, href=, fetch, import)이 남아 있지 않은지 검사한다.
필요: Python 3 + Pillow (이미지가 있을 때만)
"""
import base64, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
ASSETS = os.path.join(ROOT, 'assets')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stopsketch_demo.html')

SCRIPT_TAG = re.compile(r'<script src="([^"]+)"></script>')
MAX_W = 1280          # 게임 화면 가로
QUALITY = 80


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read()


def used_images():
    m = re.search(r"images:\s*\[([^\]]*)\]", read('data.js'))
    return re.findall(r"'([^']+)'", m.group(1)) if m else []


def encode_image(path):
    from PIL import Image
    im = Image.open(path)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=4)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    html = read('index.html')
    scripts = SCRIPT_TAG.findall(html)
    if not scripts:
        raise SystemExit('index.html 에서 <script src> 를 찾지 못했다')

    embed, missing = {}, []
    for name in used_images():
        p = os.path.join(ASSETS, name + '.png')
        if os.path.isfile(p):
            embed[name] = encode_image(p)
        else:
            missing.append(name)

    def inline(m):
        code = read(m.group(1)).replace('</script', '<\\/script')
        return '<script>\n// ' + m.group(1) + '\n' + code + '\n</script>'

    out = SCRIPT_TAG.sub(inline, html)
    boot = ('<script>\nvar G = window.G = window.G || {}; G.SINGLE_FILE = true;\nG.EMBED = '
            + json.dumps(embed, separators=(',', ':')) + ';\n</script>\n')
    out = out.replace('<script>\n// vendor/matter.min.js', boot + '<script>\n// vendor/matter.min.js', 1)

    # 외부 요청 검사 (주석 속 URL은 요청이 아니므로 태그·호출만 본다)
    bad = re.findall(r'<(?:script|link|img)[^>]+(?:src|href)=|\bfetch\(|\bimport\s*\(|^\s*import\s', out, re.M)
    if bad:
        raise SystemExit('외부 요청이 남아 있음: %r' % bad[:5])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print('이미지 %d장 내장 %s' % (len(embed), sorted(embed)))
    if missing:
        print('없는 이미지(색 블록으로 표시): %s' % missing)
    print('스크립트 %d개 → %s (%.0fKB)' % (len(scripts), OUT, os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
