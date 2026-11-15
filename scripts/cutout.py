"""초상화 배경 제거: 테두리에 닿아 있는 어두운 단색 배경만 투명하게 만든다.
사용법: python3 scripts/cutout.py portraits/이름.webp [...]   (파일을 덮어씀)
배경색은 이미지 가장자리의 중앙값으로 잡고, 그 색과 tol 이내이면서 가장자리와 이어진 픽셀만 지운다.
캐릭터 안쪽의 어두운 옷·머리는 가장자리와 이어져 있지 않으면 남는다."""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def cutout(path, tol=12):
    im = Image.open(path).convert('RGBA')
    rgb = np.asarray(im.convert('RGB')).astype(int)
    old_a = np.asarray(im)[..., 3]
    h, w, _ = rgb.shape
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)
    cand = (np.abs(rgb - bg).max(axis=2) <= tol) | (old_a < 10)
    seen = np.zeros((h, w), bool)
    q = deque()
    for y in range(h):
        for x in range(w):
            if (y in (0, h - 1) or x in (0, w - 1)) and cand[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGB').convert('RGBA'); out.putalpha(alpha)
    return out

if __name__ == '__main__':
    for p in sys.argv[1:]:
        cutout(p).save(p, quality=90, method=6)
        print('cut', p)
