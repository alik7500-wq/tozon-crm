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

describe('wheel zoom', () => {
  const open = () => {render(<App/>); fireEvent.click(screen.getByText('Открыть')); return screen.getByTestId('apartment-image-viewport');};
  it('zooms in and out with the wheel and prevents browser scrolling', () => {
    const viewport = open();
    const wheel = new WheelEvent('wheel', {deltaY: -100, bubbles: true, cancelable: true});
    fireEvent(viewport, wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByText('122%')).toBeTruthy();
    fireEvent.wheel(viewport, {deltaY: 100});
    expect(screen.getByText('100%')).toBeTruthy();
  });
  it('limits zoom to 100–600 percent even for large wheel deltas', () => {
    const viewport = open();
    fireEvent.wheel(viewport, {deltaY: -10000});
    expect(screen.getByText('600%')).toBeTruthy();
    fireEvent.wheel(viewport, {deltaY: 10000});
    expect(screen.getByText('100%')).toBeTruthy();
  });
  it('resets zoom when switching images and with the reset control', () => {
    const viewport = open();
    fireEvent.wheel(viewport, {deltaY: -100});
    fireEvent.click(screen.getByText('Следующее →'));
    expect(screen.getByText('100%')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Увеличить'));
    expect(screen.getByText('120%')).toBeTruthy();
    fireEvent.click(screen.getByText('Сбросить'));
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
