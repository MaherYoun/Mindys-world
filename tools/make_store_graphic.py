"""Draw the Mindy's World store feature graphic from original shapes and type."""

from math import cos, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUT = Path(__file__).resolve().parents[1] / "store-assets" / "feature-graphic-1024x500.png"
S = 2
W, H = 1024 * S, 500 * S


def xy(points):
    return [(round(x * S), round(y * S)) for x, y in points]


def ellipse(box, fill, outline=None, width=1, layer=None):
    d = ImageDraw.Draw(layer or canvas, "RGBA")
    d.ellipse(tuple(round(v * S) for v in box), fill=fill, outline=outline, width=width * S)


canvas = Image.new("RGB", (W, H), "#101c32")
d = ImageDraw.Draw(canvas)
for y in range(H):
    t = y / H
    d.line((0, y, W, y), fill=(round(11 + t * 28), round(28 + t * 18), round(49 + t * 18)))

glow = Image.new("RGBA", (W, H))
ellipse((18, -86, 552, 520), (68, 215, 218, 27), layer=glow)
ellipse((166, 15, 595, 444), (239, 157, 79, 26), layer=glow)
canvas = Image.alpha_composite(canvas.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(72 * S)))
d = ImageDraw.Draw(canvas, "RGBA")

for n in range(50):
    x = (n * 137 + 17) % 1024
    y = (n * 79 + 19) % 500
    r = 1 if n % 5 else 2
    d.ellipse((S * (x - r), S * (y - r), S * (x + r), S * (y + r)), fill=(185, 235, 228, 54))

# Sunflower over an illuminated little world, drawn for this listing.
ellipse((87, 58, 439, 410), (11, 43, 66, 255), (104, 216, 217, 119), 2)
ellipse((103, 74, 423, 394), (42, 100, 112, 180))
ellipse((126, 97, 400, 371), (28, 65, 81, 190), (150, 235, 222, 112), 1)

# Globe meridians and a tilted futuristic orbit.
for inset in (33, 88):
    d.arc((S * (87 + inset), S * 58, S * (439 - inset), S * 410), 82, 278, fill=(156, 238, 226, 91), width=2 * S)
for y in (153, 234, 314):
    d.arc((S * 88, S * (y - 38), S * 438, S * (y + 38)), 0, 180, fill=(164, 233, 223, 62), width=2 * S)
d.arc((S * 52, S * 114, S * 471, S * 346), 12, 328, fill=(255, 201, 135, 204), width=3 * S)
ellipse((398, 110, 409, 121), (255, 225, 153, 255))

cx, cy = 261, 234
petal = Image.new("RGBA", (W, H))
pd = ImageDraw.Draw(petal, "RGBA")
for n in range(12):
    a = 2 * pi * n / 12
    px, py = cx + 82 * cos(a), cy + 82 * sin(a)
    blade = Image.new("RGBA", (W, H))
    bd = ImageDraw.Draw(blade, "RGBA")
    bd.ellipse(tuple(round(v * S) for v in (px - 24, py - 57, px + 24, py + 57)), fill=(255, 185 + n % 3 * 11, 89, 245))
    blade = blade.rotate(-(n * 30 + 90), center=(round(px * S), round(py * S)), resample=Image.Resampling.BICUBIC)
    petal.alpha_composite(blade)
canvas.alpha_composite(petal)
ellipse((cx - 58, cy - 58, cx + 58, cy + 58), (95, 48, 50, 255), (255, 222, 138, 255), 5)
for row in range(-4, 5):
    for col in range(-4, 5):
        x = cx + col * 12 + (row % 2) * 6
        y = cy + row * 11
        if (x - cx) ** 2 + (y - cy) ** 2 < 48 ** 2:
            ellipse((x - 2, y - 2, x + 2, y + 2), (255, 192, 103, 255))

draw = ImageDraw.Draw(canvas, "RGBA")
serif = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
title = ImageFont.truetype(serif, 61 * S)
subtitle = ImageFont.truetype(sans, 21 * S)
label = ImageFont.truetype(sans, 13 * S)
draw.text((484 * S, 145 * S), "Mindy’s", font=title, fill=(255, 239, 209, 255), stroke_width=0)
draw.text((484 * S, 217 * S), "World", font=title, fill=(255, 204, 135, 255), stroke_width=0)
draw.line((486 * S, 315 * S, 897 * S, 315 * S), fill=(115, 221, 215, 135), width=2 * S)
draw.text((487 * S, 337 * S), "A little guild. A wide world.", font=subtitle, fill=(213, 229, 225, 255))
draw.text((487 * S, 397 * S), "WANDER  •  GROW  •  RETURN", font=label, fill=(247, 194, 130, 255))

OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.convert("RGB").resize((1024, 500), Image.Resampling.LANCZOS).save(OUT, optimize=True)
print(OUT)
