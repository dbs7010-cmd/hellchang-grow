#!/usr/bin/env python3
"""Derive reference crops from the locked Danbaek MASTER CANON.

This script does not redesign art. It only crops sections from
`danbaek_growth_system_canon.webp` for implementation/reference use.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "danbaek_growth_system_canon.webp"
img = Image.open(SRC).convert("RGBA")

crops = {
    "growth_overview.png": (6, 18, 489, 156),
    "bodypart_growth_grid.png": (6, 155, 489, 294),
    "sp_distribution_and_formula.png": (6, 294, 489, 602),
    "animation_reference.png": (6, 602, 331, 748),
    "balance_guide.png": (332, 602, 489, 748),
}
for name, box in crops.items():
    img.crop(box).save(HERE / name)

x_edges = [7, 55, 103, 151, 199, 247, 295, 343, 391, 439, 488]
for i in range(10):
    img.crop((x_edges[i], 27, x_edges[i + 1], 155)).save(
        HERE / f"stage_{i + 1:02d}_canon_crop.png"
    )

print("Derived CANON reference crops without redesigning the source art.")
