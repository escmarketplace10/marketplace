# -*- coding: utf-8 -*-
"""Membuat logo Kantinku + ikon launcher Android."""
import os, math
from PIL import Image, ImageDraw

ORANGE = (249, 115, 22, 255)   # #F97316
WHITE = (255, 255, 255, 255)
SS = 4  # supersample

def draw_master(size, rounded):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        r = int(S * 0.22)
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=ORANGE)
    else:
        d.rectangle([0, 0, S, S], fill=ORANGE)

    cx = S / 2
    # Mangkuk (setengah elips bawah), berpusat di tengah kanvas
    bowl_w = S * 0.56
    eh = S * 0.21           # setengah tinggi elips
    bowl_cy = S * 0.585     # garis bibir mangkuk
    bbox = [cx - bowl_w / 2, bowl_cy - eh, cx + bowl_w / 2, bowl_cy + eh]
    d.pieslice(bbox, start=0, end=180, fill=WHITE)
    # Garis alas / piring di bawah mangkuk
    base_w = S * 0.66
    base_y = bowl_cy + eh + S * 0.045
    bh = S * 0.05
    d.rounded_rectangle([cx - base_w / 2, base_y, cx + base_w / 2, base_y + bh],
                        radius=bh / 2, fill=WHITE)
    # Uap (3 garis lengkung) tepat di atas mangkuk
    steam_w = max(2, int(S * 0.022))
    for off in (-S * 0.16, 0, S * 0.16):
        pts = []
        for t in range(0, 101, 4):
            tt = t / 100.0
            y = S * 0.23 + tt * (S * 0.27)
            x = cx + off + math.sin(tt * math.pi * 2) * (S * 0.05)
            pts.append((x, y))
        d.line(pts, fill=WHITE, width=steam_w, joint="curve")

    return img.resize((size, size), Image.LANCZOS)

OUT_ASSETS = r"D:/POS ESC/mobile/assets"
OUT_RES = r"D:/POS ESC/mobile/android/app/src/main/res"
os.makedirs(OUT_ASSETS, exist_ok=True)

# Logo in-app (rounded, transparan di luar)
logo = draw_master(512, rounded=True)
logo.save(os.path.join(OUT_ASSETS, "logo.png"))
print("Saved assets/logo.png")

# Ikon launcher (square penuh)
master = draw_master(512, rounded=False)
densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for name, px in densities.items():
    folder = os.path.join(OUT_RES, f"mipmap-{name}")
    os.makedirs(folder, exist_ok=True)
    icon = master.resize((px, px), Image.LANCZOS)
    icon.save(os.path.join(folder, "ic_launcher.png"))
    print(f"Saved mipmap-{name}/ic_launcher.png ({px}px)")

print("DONE")
