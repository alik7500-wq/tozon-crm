"""Render clipped vector PDF excerpts. Does not alter CRM or infer architecture."""
import json,pathlib,fitz,cairosvg,xml.etree.ElementTree as ET,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
SRC=ROOT.parent/'sources'
OUT=ROOT/'public/layouts/block_a/catalog'
# Vertices are in the 2x rendered Block A viewport, tracing shared wall centerlines.
T={
 2:[(678,325),(1008,325),(1008,655),(562,655),(562,414),(678,414)],
 3:[(397,44),(1008,44),(1008,327),(680,327),(680,415),(458,415),(458,335),(397,335)],
 4:[(54,44),(397,44),(397,335),(458,335),(458,655),(54,655)],
 5:[(54,650),(458,650),(458,980),(54,980)],
 6:[(54,980),(458,980),(458,1305),(54,1305)],
 7:[(54,1300),(458,1300),(458,1220),(680,1220),(680,1305),(915,1305),(915,1515),(54,1515)],
 8:[(565,980),(1008,980),(1008,1310),(680,1310),(680,1220),(565,1220)]}
P={
 31:[(494,210),(729,210),(729,445),(414,445),(414,278),(494,278)],
 30:[(298,8),(728,8),(728,210),(494,210),(494,278),(340,278),(340,210),(298,210)],
 29:[(48,8),(300,8),(300,210),(340,210),(340,445),(48,445)],
 28:[(48,438),(340,438),(340,680),(48,680)],
 27:[(48,675),(340,675),(340,850),(490,850),(490,1053),(48,1053)],
 26:[(414,675),(728,675),(728,1053),(490,1053),(490,850),(414,850)]}
manifest=json.loads((ROOT/'docs/catalog/block_a_preparation.json').read_text())
byid={x['id']:x for x in manifest['layouts']}
OUT.mkdir(parents=True,exist_ok=True); records=[]
for group,polygroup,pattern in [('typical',T,'*16.10*.pdf'),('penthouse',P,'*04*.pdf')]:
 source=next(SRC.rglob(pattern));doc=fitz.open(source);p=doc[0]
 svg=p.get_svg_image(matrix=fitz.Matrix(2,2));svgroot=ET.fromstring(svg)
 ox=p.rect.width*.14*2;oy=p.rect.height*.15*2
 for lid,points in polygroup.items():
  original_points=points
  # Orthogonal polygon offset retains full shared wall thickness at crop edges.
  area2=sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))
  direction=1 if area2>0 else -1
  shifted=[]
  for i,(x,y) in enumerate(points):
   prev=points[i-1];nxt=points[(i+1)%len(points)]
   dx1=x-prev[0];dy1=y-prev[1];dx2=nxt[0]-x;dy2=nxt[1]-y
   norm1=(direction*dy1/(abs(dx1)+abs(dy1)), -direction*dx1/(abs(dx1)+abs(dy1)))
   norm2=(direction*dy2/(abs(dx2)+abs(dy2)), -direction*dx2/(abs(dx2)+abs(dy2)))
   shifted.append((x+6*(norm1[0]+norm2[0]),y+6*(norm1[1]+norm2[1])))
  points=shifted
  row=byid[lid];area=row.get('approved_area_m2',row['unit_areas'][0]);typ=row['code'].split('-')[-1]
  name=f'block_a_{group}_type_{int(typ):02}_{area:.2f}m2_2d'.replace('.', '_')
  xs=[x for x,y in points];ys=[y for x,y in points];x0=min(xs);y0=min(ys);w=max(xs)-x0;h=max(ys)-y0
  scale=min(1100/w,1330/h);tx=(1290-w*scale)/2;ty=160+(1330-h*scale)/2
  polygon=' '.join(f'{x},{y}' for x,y in points)
  # Keep original vector linework; title and official area are separate from the drawing.
  nested=svg.replace('<svg ',f'<svg x="{-ox}" y="{-oy}" ',1)
  out=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1290" height="1680" viewBox="0 0 1290 1680"><rect width="1290" height="1680" fill="white"/>
<text x="70" y="70" font-family="DejaVu Sans" font-size="30" fill="#173548">TOZON PLAZA · БЛОК А</text>
<text x="70" y="116" font-family="DejaVu Sans" font-size="28" fill="#173548">{'Типовой этаж' if group=='typical' else 'Пентхаус'} · Тип {typ} · {area:.2f} м²</text>
<defs><clipPath id="unit_clip"><polygon points="{polygon}"/></clipPath></defs>
<g transform="translate({tx},{ty}) scale({scale}) translate({-x0},{-y0})"><g clip-path="url(#unit_clip)">{nested}</g></g>
<text x="70" y="1570" font-family="DejaVu Sans" font-size="21" fill="#445965">Фрагмент утверждённого чертежа · Геометрия исходного PDF</text>
<text x="70" y="1607" font-family="DejaVu Sans" font-size="20" fill="#445965">Общая площадь: {area:.2f} м² · Высота потолков: 3,15 м</text>
<text x="70" y="1642" font-family="DejaVu Sans" font-size="18" fill="#74818b">Планировка для ознакомления · Условия передачи — по договору</text></svg>'''
  cairosvg.svg2png(bytestring=out.encode(),write_to=str(OUT/(name+'.png')))
  records.append({'layout_id':lid,'code':row['code'],'area_m2':area,'source_pdf':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'image_2d':str((OUT/(name+'.png')).relative_to(ROOT/'public')),'image_3d':None,'review_status':'DRAFT_REQUIRES_BOUNDARY_REVIEW','clip_points':points})
(ROOT/'docs/catalog/block_a_image_manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('Rendered',len(records),'2D vector excerpts')
