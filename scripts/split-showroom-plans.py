"""Extract reviewed block regions from the eight supplied PDF sheets.
Coordinates use the 1100px-wide review renders. Content remains vector PDF.
Run with PyMuPDF installed: python scripts/split-showroom-plans.py
"""
from pathlib import Path
import fitz
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/layouts/showroom'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
# Each entry is a union of rectangles; stepped edges retain protruding rooms.
REGIONS = {
 ('a','parking'): [(110,140,175,990),(175,140,630,966)],
 ('b','parking'): [(110,935,175,1490),(175,967,1020,1490)],
 ('a','commercial'): [(80,200,175,945),(175,200,610,917),(610,500,655,690)],
 ('b','commercial'): [(80,895,175,1440),(175,917,1030,1440)],
 ('a','typical'): [(70,245,580,938),(580,245,640,838)],
 ('b','typical'): [(580,838,1040,938),(70,938,1040,1390)],
 ('a','penthouse'): [(55,140,150,950),(150,140,635,925),(635,140,705,835)],
 ('b','penthouse'): [(635,840,1085,926),(55,890,150,1470),(150,926,1085,1470)],
 ('v','parking'): [(105,85,534,700)],
 ('g','parking'): [(534,305,1055,735)],
 ('v','commercial'): [(120,85,557,700)],
 ('g','commercial'): [(557,290,1010,700)],
 ('v','typical'): [(75,90,499,715),(499,140,545,175),(499,240,545,275),(499,335,520,351)],
 ('g','typical'): [(525,285,980,352),(499,352,980,715)],
 ('v','penthouse'): [(120,65,554,715)],
 ('g','penthouse'): [(554,315,1050,715)],
}
BLOCKS={'a':'А','b':'Б','v':'В','g':'Г'}
KINDS={'parking':'Парковка · этаж −1','commercial':'Коммерческий этаж · этаж 1','typical':'Типовые этажи · 2–9','penthouse':'Пентхаус · этаж 10'}
manifest=[]
for (block,kind), regions in REGIONS.items():
    source=f"{'ab' if block in ('a','b') else 'vg'}-{kind}.pdf"
    original=fitz.open(ASSETS/source)
    # Match the orientation used for visual review before applying clipping.
    original[0].remove_rotation()
    scale=original[0].rect.width/1100
    clips=[fitz.Rect(*(n*scale for n in coords)) for coords in regions]
    bounds=fitz.Rect(min(c.x0 for c in clips),min(c.y0 for c in clips),max(c.x1 for c in clips),max(c.y1 for c in clips))
    result=fitz.open()
    page=result.new_page(width=bounds.width+48,height=bounds.height+90)
    page.insert_font(fontname='ReviewSans',fontfile=FONT)
    page.insert_text((24,24),f'Блок {BLOCKS[block]} · {KINDS[kind]}',fontname='ReviewSans',fontsize=12,color=(.08,.12,.2))
    page.draw_line((24,34),(page.rect.width-24,34),color=(.7,.75,.82),width=.6)
    for clip in clips:
        destination=fitz.Rect(24+clip.x0-bounds.x0,44+clip.y0-bounds.y0,24+clip.x1-bounds.x0,44+clip.y1-bounds.y0)
        page.show_pdf_page(destination,original,0,clip=clip,keep_proportion=False)
    page.insert_text((24,page.rect.height-16),'Фрагмент исходного проектного чертежа.',fontname='ReviewSans',fontsize=8,color=(.35,.4,.45))
    result.set_metadata({'title':f'Блок {BLOCKS[block]} — {KINDS[kind]}','subject':f'Фрагмент исходного листа {source}'})
    result.subset_fonts()
    filename=f'block-{block}-{kind}.pdf'
    result.save(ASSETS/filename,garbage=4,deflate=True)
    manifest.append({'file':filename,'source':source,'block':BLOCKS[block],'kind':kind,'regions_1100px':regions,'sha256':hashlib.sha256((ASSETS/filename).read_bytes()).hexdigest()})
(ASSETS/'blocks.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Created {len(manifest)} block sheets')
