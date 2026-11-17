"""프로필 카드용 WebP의 잔 노이즈를 약하게 정리한다."""

import sys
from pathlib import Path

from PIL import Image, ImageFilter


def process(path: Path) -> None:
    source = Image.open(path).convert("RGBA")
    alpha = source.getchannel("A")
    smoothed = source.convert("RGB").filter(ImageFilter.GaussianBlur(0.25))
    smoothed.putalpha(alpha)
    smoothed.save(path, "WEBP", quality=95, method=6)


directory = Path(sys.argv[1] if len(sys.argv) > 1 else "_site/img/card")
files = sorted(directory.glob("*.webp"))
for file in files:
    process(file)

print(f"profile cards processed: {len(files)}")
