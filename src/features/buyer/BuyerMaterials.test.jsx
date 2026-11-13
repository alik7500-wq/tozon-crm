// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('./buyer-api',()=>({buyerRequest:vi.fn(),buyerBlob:vi.fn()}));
vi.mock('./BuyerPanorama',()=>({default:({panorama,onNavigate})=><div data-testid="panorama">{panorama.name}<button onClick={()=>onNavigate(2)}>Next room</button><button onClick={()=>onNavigate(999)}>Foreign room</button></div>}));
import {buyerRequest,buyerBlob} from './buyer-api';
import BuyerMaterials from './BuyerMaterials';
const own={plans:[{key:'PLAN_2D'}],tour:{id:1,panoramas:[{id:1,name:'Коридор',hotspots:[]},{id:2,name:'Спальня',hotspots:[]}]},documents:[{id:'doc1',title:'Оригинал договора',language:'tj',version:1,isSignedOriginal:true}]};
beforeEach(()=>{
 vi.clearAllMocks();buyerRequest.mockResolvedValue(own);buyerBlob.mockResolvedValue(new Blob(['image'],{type:'image/png'}));
 URL.createObjectURL=vi.fn(()=>`blob:protected-${Math.random()}`);URL.revokeObjectURL=vi.fn();
});
afterEach(cleanup);
it('loads metadata only and downloads a plan only after clicking, then releases blob URLs',async()=>{
 const {unmount}=render(<BuyerMaterials dealId={1} initData="signed" language="ru"/>);
 await screen.findByText('Планировка 2D');expect(buyerBlob).not.toHaveBeenCalled();
 fireEvent.click(screen.getAllByRole('button',{name:'Открыть'})[0]);
 expect(await screen.findByAltText('Планировка 2D')).toHaveAttribute('src',expect.stringContaining('blob:protected'));
 expect(buyerBlob).toHaveBeenCalledWith('signed',{dealId:1,type:'PLAN_2D',id:undefined},expect.anything());
 unmount();expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('shows signed original metadata and exposes only a local blob after an authorized document request',async()=>{
 render(<BuyerMaterials dealId={1} initData="signed" language="ru"/>);
 await screen.findByText('Оригинал договора');expect(screen.getByText(/Подписанный оригинал/)).toBeInTheDocument();
 const item=screen.getByText('Оригинал договора').closest('li');fireEvent.click(item.querySelector('button'));
 expect(await screen.findByRole('link',{name:'Скачать'})).toHaveAttribute('href',expect.stringContaining('blob:protected'));
 expect(buyerBlob).toHaveBeenCalledWith('signed',{dealId:1,type:'DOCUMENT',id:'doc1'},expect.anything());
});
it('never follows a hotspot outside the authorized room list',async()=>{
 render(<BuyerMaterials dealId={1} initData="signed" language="ru"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Коридор'}));await screen.findByTestId('panorama');
 fireEvent.click(screen.getByRole('button',{name:'Foreign room'}));expect(buyerBlob).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Next room'}));
 await waitFor(()=>expect(buyerBlob).toHaveBeenCalledWith('signed',{dealId:1,type:'PANORAMA',id:2},expect.anything()));
});
it('explains missing plans, tour and documents in Tajik without substituting other assets',async()=>{
 buyerRequest.mockResolvedValue({plans:[],tour:null,documents:[]});
 render(<BuyerMaterials dealId={1} initData="signed" language="tj"/>);
 expect(await screen.findAllByText('Мавод ҳоло илова нашудааст.')).toHaveLength(4);expect(buyerBlob).not.toHaveBeenCalled();
});
it('shows an access error without creating a URL for denied data',async()=>{
 buyerBlob.mockRejectedValue(new Error('DENIED'));render(<BuyerMaterials dealId={1} initData="signed" language="ru"/>);
 await screen.findByText('Планировка 2D');fireEvent.click(screen.getAllByRole('button',{name:'Открыть'})[0]);
 expect(await screen.findByRole('alert')).toHaveTextContent('Материал недоступен');expect(URL.createObjectURL).not.toHaveBeenCalled();
});
