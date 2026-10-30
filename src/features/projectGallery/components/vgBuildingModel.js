// Schematic only: footprints follow the two wings of the supplied V/Г floor drawing.
// Vertical storey spacing is illustrative; it is not a facade or a height specification.
const project = ([x, y], level) => [380 + x * .85 - y * .45, 500 + x * .2 + y * .3 - level * 38];
const points = list => list.map(point => point.join(',')).join(' ');
const wings = [
  { id: 6, name: 'Блок В', label: { x: 36, y: 25 }, footprint: [[170,110],[400,110],[400,290],[430,290],[430,550],[170,550]], front: [[170,550],[430,550],[430,290],[400,290],[400,110]], color: '#93c5fd' },
  { id: 7, name: 'Блок Г', label: { x: 59, y: 30 }, footprint: [[440,290],[810,290],[810,550],[440,550]], front: [[440,550],[810,550],[810,290]], color: '#a5b4fc' }
];
export const vgBlocks = wings.map(wing => ({ ...wing, projectId: 4,
  points: points([project(wing.front[0], 10), ...wing.footprint.slice(0,2).map(point => project(point, 10)), ...wing.front.map(point => project(point, 0)).reverse()]),
  floorRegions: Array.from({ length: 10 }, (_, i) => ({ floor: 10 - i, points: points([...wing.front.map(point => project(point, 10-i)), ...wing.front.map(point => project(point, 9-i)).reverse()]) }))
}));
const shapes = wings.map((wing, index) => {
  const model = vgBlocks[index];
  return model.floorRegions.map(region => `<polygon points="${region.points}" fill="${wing.color}" stroke="#334155" stroke-width="1.4"/>`).join('') +
    `<polygon points="${points(wing.footprint.map(point => project(point,10)))}" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>`;
}).join('');
export const vgSchematic = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1024"><rect width="1280" height="1024" fill="#142033"/><ellipse cx="610" cy="800" rx="420" ry="110" fill="#0f172a"/>${shapes}<text x="640" y="930" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="24">Схема корпусов · не фасадная визуализация</text></svg>`);
export const vgMedia = { id: 'vg-schematic', project_id: 4, category: 'MASTERPLAN', title: 'ТОЗОН ПЛАЗА — 2 · Блоки В и Г', description: 'Интерактивная схема для выбора блока и этажа. Контуры крыльев основаны на исходном плане; высота показана условно. Планировки открываются из проектных чертежей.', url: vgSchematic, storage_path: 'local/vg-schematic', is_active: true };
