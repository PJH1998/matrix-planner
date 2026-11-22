"""픽업 배너 그림(encore.moe 원본)의 크기를 줄인다.

사용법: python scripts/process-banner-images.py <img 폴더>
  <img>/gacha/*.webp — 가챠 배경(원본 3200×1440) → 가로 1280px
  <img>/stand/*.webp — 전신 그림(원본 2048px, 투명 여백이 큼) → 그림 부분만 잘라 세로 900px 이하
  <img>/skin/*.webp  — 스킨 미리보기(전신 그림이 없을 때, 216×968) → 같은 방식
이미 줄인 파일은 그대로 둔다(다시 돌려도 같다).
"""

import sys
from pathlib import Path

from PIL import Image

GACHA_W = 1280
STAND_H = 900


def shrink_gacha(path: Path) -> None:
    img = Image.open(path)
    if img.width <= GACHA_W:
        return
    h = round(img.height * GACHA_W / img.width)
    img.convert("RGB").resize((GACHA_W, h), Image.LANCZOS).save(path, "WEBP", quality=80, method=6)


def shrink_stand(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        img = img.crop(box)
    if img.height > STAND_H:
        w = round(img.width * STAND_H / img.height)
        img = img.resize((w, STAND_H), Image.LANCZOS)
    elif not box or box == (0, 0, img.width, img.height):
        return
    img.save(path, "WEBP", quality=85, method=6)


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site/img")
    for kind, fn in (("gacha", shrink_gacha), ("stand", shrink_stand), ("skin", shrink_stand)):
        for path in sorted((root / kind).glob("*.webp")):
            fn(path)
            print(f"{kind}/{path.name}: {path.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
