import React,{useState} from 'react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {ApartmentImageViewer} from '../components/ApartmentImageViewer';
import {useModalDismiss} from '../../../hooks/useModalDismiss';
beforeEach(()=>{HTMLDialogElement.prototype.showModal=vi.fn(function(){this.setAttribute('open','');});HTMLDialogElement.prototype.close=vi.fn(function(){this.removeAttribute('open');});});afterEach(cleanup);
const images=[{url:'https://example.com/1.png',title:'План'},{url:'https://example.com/2.png',title:'Спальня'}];
function App(){const [open,setOpen]=useState(false),[index,setIndex]=useState(0);useModalDismiss({isOpen:true,onClose:()=>{throw Error('parent closed');}});return open?<ApartmentImageViewer images={images} index={index} onNavigate={setIndex} onClose={()=>setOpen(false)}/>:<><p>Закрыто</p><button onClick={()=>setOpen(true)}>Открыть</button></>;}
describe('apartment image viewer',()=>{
it('opens a native modal above the apartment and closes only the image with Escape',()=>{render(<App/>);fireEvent.click(screen.getByText('Открыть'));expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();fireEvent.keyDown(window,{key:'Escape'});expect(screen.getByText('Закрыто')).toBeTruthy();});
it('navigates gallery and closes with the visible control',()=>{render(<App/>);fireEvent.click(screen.getByText('Открыть'));fireEvent.click(screen.getByText('Следующее →'));expect(screen.getByRole('img').getAttribute('src')).toBe(images[1].url);fireEvent.click(screen.getByLabelText('Закрыть изображение'));expect(screen.getByText('Закрыто')).toBeTruthy();});
});
