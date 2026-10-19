"""Render the complete 81.80 m² technical panel from the owner PDF.

Usage: python3 scripts/catalog/fit_block_b_type03_plan.py SOURCE.pdf
Requires PyMuPDF. No geometry is generated or redrawn.
"""
import argparse
import hashlib
from pathlib import Path
import fitz

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
source = fitz.open(args.source)
page_index = 35
if '81.80' not in source[page_index].get_text():
    raise ValueError('Expected the 81.80 m² apartment on PDF page 36')
output = fitz.open()
page = output.new_page(width=1290, height=1680)
# Left panel of the landscape sheet, including the full technical plan,
# heading and location diagram. Fit the entire panel instead of cutting a
# fixed-width strip from a height-scaled landscape sheet.
page.show_pdf_page(fitz.Rect(18, 18, 1272, 1662), source, page_index,
                   clip=fitz.Rect(55, 15, 488, 581), keep_proportion=True)
pixels = page.get_pixmap(alpha=False)
for relative in (
    'public/layouts/block_b/catalog/block_b_typical_type_03_81_80m2_2d.png',
    'public/layouts/block_b/typical/type_03_81_80m2/2d_technical_plan.png',
):
    pixels.save(root / relative)
print('Source SHA-256:', hashlib.sha256(args.source.read_bytes()).hexdigest())
print('Rendered complete technical panel: 1290 × 1680')
