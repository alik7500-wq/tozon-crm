import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getShowroomFloorPlan} from './showroomFloorPlans';
const manifest=JSON.parse(readFileSync('public/layouts/showroom/sources.json','utf8'));
it.each([[4,'a'],[3,'b'],[6,'v'],[7,'g']])('maps all floor uses for block %s to its supplied group', (block,group)=>{
 for(const [floor,kind] of [[-1,'parking'],[1,'commercial'],[2,'typical'],[5,'typical'],[9,'typical'],[10,'penthouse']]){
  expect(getShowroomFloorPlan(block,floor).url).toBe(`/layouts/showroom/block-${group}-${kind}.pdf`);
 }
 for(const floor of [null,0,11,2.5])expect(getShowroomFloorPlan(block,floor)).toBeNull();
});
it('keeps all eight source PDF sheets intact and available',()=>{
 expect(manifest).toHaveLength(8);
 for(const source of manifest){
  const data=readFileSync(`public/layouts/showroom/${source.file}`);
  expect(data.subarray(0,5).toString()).toBe('%PDF-');
  expect(createHash('sha256').update(data).digest('hex')).toBe(source.sha256);
 }
 expect(getShowroomFloorPlan(999,5)).toBeNull();
});

it('keeps sixteen distinct block fragments with correct source references',()=>{
 const blocks=JSON.parse(readFileSync('public/layouts/showroom/blocks.json','utf8'));
 expect(blocks).toHaveLength(16);
 expect(new Set(blocks.map(b=>b.file)).size).toBe(16);
 for(const block of blocks){
  const data=readFileSync(`public/layouts/showroom/${block.file}`);
  expect(data.subarray(0,5).toString()).toBe('%PDF-');
  expect(createHash('sha256').update(data).digest('hex')).toBe(block.sha256);
  expect(block.regions_1100px.length).toBeGreaterThan(0);
  expect(block.source.startsWith(['А','Б'].includes(block.block)?'ab-':'vg-')).toBe(true);
 }
});
