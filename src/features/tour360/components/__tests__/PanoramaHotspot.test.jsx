import React from 'react';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { PanoramaHotspot } from '../PanoramaHotspot';
vi.mock('@react-three/drei',()=>({Html:({children})=><div>{children}</div>}));
afterEach(cleanup);
describe('production hotspot labels',()=>{
 it('shows the label returned by the production API',()=>{
  render(<PanoramaHotspot hotspot={{id:67,hotspot_type:'NAVIGATION',label:'В кухню',target_panorama_id:58}} onClick={()=>{}}/>);
  expect(screen.getByRole('button',{name:'В кухню'})).toBeDefined();
 });
});
