"""Build the stylized Earth map from the user's 59-earth.zip textures.

The resulting asset is bundled with the game. To regenerate, run:
    python tools/make_game_map.py /path/to/59-earth.zip
"""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_dilation, binary_erosion, gaussian_filter

if len(sys.argv) != 2:
    raise SystemExit("Usage: python tools/make_game_map.py /path/to/59-earth.zip")

WIDTH, HEIGHT = 2048, 1024
source = Path(sys.argv[1])
with ZipFile(source) as earth:
    with Image.open(BytesIO(earth.read("textures/earth land ocean mask.png"))) as original:
        land_alpha = np.asarray(original.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS), dtype=np.float32) / 255
    with Image.open(BytesIO(earth.read("textures/earth albedo.jpg"))) as original:
        # Throw out photographic detail while retaining broad climate bands.
        broad = original.convert("RGB").resize((128, 64), Image.Resampling.BOX)
        broad = broad.filter(ImageFilter.GaussianBlur(2.2))
        albedo = np.asarray(broad.resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC), dtype=np.float32) / 255

land = land_alpha > .5
height, width = land.shape
latitude = np.linspace(90, -90, height, dtype=np.float32)[:, None]
r, g, b = albedo.transpose(2, 0, 1)
brightness = .3 * r + .59 * g + .11 * b
vegetation = np.clip((g - r + .07) * 4.4, 0, 1)
arid = np.clip((r - g + .025) * 3.5, 0, 1)
snow = np.clip((brightness - .72) * 2.8, 0, 1) * np.clip((np.abs(latitude) - 51) / 30, 0, 1)

# Broad topographic lighting makes the land read as raised, while the real mask
# keeps every coast exactly where it belongs. It deliberately loses satellite
# detail so the UI reads as a fantasy-game world map at phone scale.
low = gaussian_filter(brightness, 21)
grain = gaussian_filter(np.random.default_rng(42).normal(size=(height // 32, width // 32)).astype(np.float32), 2)
grain = np.asarray(Image.fromarray(grain).resize((width, height), Image.Resampling.BICUBIC), dtype=np.float32)
grain = grain / (np.std(grain) + 1e-5)
terrain = low
gy, gx = np.gradient(terrain)
light = np.clip(.94 + (-gx * 8 - gy * 12), .78, 1.13)
light = np.round(light * 10) / 10  # large soft elevation facets

ocean = np.empty((height, width, 3), dtype=np.float32)
ocean[:] = [11, 32, 58]
ocean += np.clip(np.sin(latitude * .053), -1, 1)[..., None] * np.array([3, 7, 9], dtype=np.float32)
ocean += grain[..., None] * .35
warm = np.array([172, 126, 91], dtype=np.float32)
green = np.array([69, 132, 113], dtype=np.float32)
rock = np.array([112, 154, 148], dtype=np.float32)
land_color = green[None, None, :] * (1 - arid[..., None]) + warm[None, None, :] * arid[..., None]
land_color = land_color * (1 - vegetation[..., None] * .16) + rock[None, None, :] * vegetation[..., None] * .16
land_color = land_color * (1 - snow[..., None]) + np.array([202, 218, 218]) * snow[..., None]
land_color *= light[..., None]
land_color = np.round(land_color / 16) * 16  # deliberate painted palette

shadow = gaussian_filter(np.roll(land_alpha, shift=(8, 5), axis=(0, 1)), 6)
ocean -= (shadow * (1 - land_alpha))[..., None] * 10
glow = gaussian_filter(land_alpha, 5) * (1 - land_alpha)
ocean += glow[..., None] * np.array([19, 69, 77], dtype=np.float32)

coast = binary_dilation(land, iterations=2) & ~land
inner_coast = land & ~binary_erosion(land, iterations=2)
result = ocean * (1 - land_alpha[..., None]) + land_color * land_alpha[..., None]
result[coast] = result[coast] * .4 + np.array([89, 202, 202]) * .6
result[inner_coast] = result[inner_coast] * .72 + np.array([244, 201, 128]) * .28

output = Path(__file__).resolve().parents[1] / "www/assets/earth-game-map.webp"
Image.fromarray(np.uint8(np.clip(result, 0, 255)), "RGB").save(output, "WEBP", quality=84, method=6)
print(f"Wrote {output} ({output.stat().st_size} bytes)")
