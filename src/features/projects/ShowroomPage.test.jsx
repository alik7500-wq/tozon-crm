import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {ShowroomPage} from './ShowroomPage';
import {api} from '../../api/client';
import {projectGalleryApi} from '../projectGallery/services/projectGalleryApi';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:{role:'SALES_MANAGER'}})}));
vi.mock('../activity/ActivityTracking',()=>({useActivityTracking:()=>{}}));
vi.mock('../../components/ImageUpload',()=>({default:()=>null}));
vi.mock('../projectGallery/services/projectGalleryApi',()=>({projectGalleryApi:{getProjectMedia:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
const map='https://res.cloudinary.com/r3pnvm9s/image/upload/v1787392389/tozon-crm/euh4vu4ocbgschzszw3p.png';
const image={id:37,title:'TOZON PLAZA с высоты',url:'/aerial.jpg',category:'MASTERPLAN',storage_path:'projects/3/media/20261029/img_9690.jpg'};
function setup(){
 api.get.mockImplementation(async path=>{
  if(path==='/projects')return {data:{projects:[{id:3,name:'TOZON PLAZA'},{id:4,name:'TOZON PLAZA — 2'}]}};
  if(path==='/visual-maps/projects/3')return {data:{maps:[{id:3,title:'Генплан',kind:'GENPLAN',image_path:map,hotspots:[{label:'Блок А',target_building_id:4,x_pct:70,y_pct:50,width_pct:10,height_pct:5},{label:'Блок Б',target_building_id:3,x_pct:80,y_pct:60,width_pct:10,height_pct:5}]}]}};
  if(path==='/visual-maps/projects/4')return {data:{maps:[]}};
  if(path.endsWith('/chessboard'))return {data:{chessboard:[]}};
  throw Error(path);
 });
 projectGalleryApi.getProjectMedia.mockResolvedValue([image]);
 render(<MemoryRouter initialEntries={['/projects/showroom']}><Routes><Route path="/projects/showroom" element={<ShowroomPage/>}/><Route path="/projects" element={<p>Список объектов</p>}/></Routes></MemoryRouter>);
}
async function measure(alt){const img=await screen.findByAltText(alt);Object.defineProperty(img,'naturalWidth',{value:792});Object.defineProperty(img,'naturalHeight',{value:709});fireEvent.load(img);}
it.each([['Блок А',4],['Блок Б',3]])('opens fullscreen genplan then %s facade and only the clicked floor plan',async(name,id)=>{
 setup();await measure('Генплан');
 expect(screen.getByRole('main',{name:'Шоурум'})).toBeTruthy();
 expect(screen.queryByText('Редактировать разметку')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`Выделить ${name}`}));
 await screen.findByText('1 / 1');
 expect(screen.queryByAltText(`Типовая планировка ${name}, этажи 2–9`)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`Показать информацию: ${name}`}));
 expect(screen.getByRole('complementary',{name:'Информация о выбранном блоке'})).toBeTruthy();
 expect(screen.queryByText('Открыть типовую планировку')).toBeNull();
 const floor=screen.getByRole('button',{name:`${name}, 5 этаж`,exact:true});
 fireEvent.mouseEnter(floor);
 expect(screen.getByRole('heading',{name:`${name} · 5 этаж`})).toBeTruthy();
 fireEvent.click(floor);
 expect(screen.getByTitle(`Планировка ${name}, 5 этаж`).getAttribute('src')).toContain(name === 'Блок А' || name === 'Блок Б' ? '/layouts/showroom/ab-typical.pdf' : '/layouts/showroom/vg-typical.pdf');
 fireEvent.keyDown(window,{key:'Escape'});
 expect(screen.queryByTitle(`Планировка ${name}, 5 этаж`)).toBeNull();
 fireEvent.click(screen.getByTitle('Закрыть (Esc)'));
 expect(screen.getByAltText('Генплан')).toBeTruthy();
 fireEvent.click(screen.getByText('Выйти из шоурума'));expect(screen.getByText('Список объектов')).toBeTruthy();
});
it.each(['Блок В','Блок Г'])('keeps the same floor-only navigation for %s in its own project',async name=>{
 setup();await measure('Генплан');
 fireEvent.change(screen.getByLabelText('Жилой комплекс шоурума'),{target:{value:'4'}});
 await measure('Генплан · Блоки В и Г');
 fireEvent.click(screen.getByRole('button',{name:`Выделить ${name}`}));
 await screen.findByText('1 / 1');
 expect(api.get).toHaveBeenCalledWith('/inventory/projects/4/chessboard');
 fireEvent.click(within(screen.getByLabelText('Блоки объекта')).getByRole('button',{name,exact:true}));
 expect(screen.queryByAltText(`Типовая планировка ${name}, этажи 2–9`)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`${name}, 5 этаж`,exact:true}));
 expect(screen.getByTitle(`Планировка ${name}, 5 этаж`).getAttribute('src')).toContain(name === 'Блок А' || name === 'Блок Б' ? '/layouts/showroom/ab-typical.pdf' : '/layouts/showroom/vg-typical.pdf');
});
