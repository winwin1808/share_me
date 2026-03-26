from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: generate_macos_icon.py <input> <output>", file=sys.stderr)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    source = Image.open(input_path).convert("RGBA")

    canvas_size = 1024
    padding = 48
    corner_radius = 228

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    inner_size = canvas_size - (padding * 2)

    scale = max(inner_size / source.width, inner_size / source.height)
    scaled_size = (round(source.width * scale), round(source.height * scale))
    scaled = source.resize(scaled_size, Image.Resampling.LANCZOS)

    offset = ((canvas_size - scaled.width) // 2, (canvas_size - scaled.height) // 2)
    canvas.paste(scaled, offset, scaled)

    mask = Image.new("L", (canvas_size, canvas_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        [padding, padding, canvas_size - padding, canvas_size - padding],
        radius=corner_radius,
        fill=255,
    )

    rounded = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    rounded.paste(canvas, (0, 0), mask)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    rounded.save(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
