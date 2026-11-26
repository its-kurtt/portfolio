"""Create delivery copies without changing composition; preserve original renders."""
from pathlib import Path
from PIL import Image

media = Path(__file__).resolve().parents[1] / "public" / "work" / "shards"
for name in ("equipment-pod", "rock-creature"):
    with Image.open(media / f"{name}.png") as original:
        original.convert("RGB").save(media / f"{name}.webp", quality=86, method=6)
