import React from 'react';
import {describe,it,expect,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {InstagramMessageContent} from '../InstagramMessageContent';
afterEach(cleanup);
const cdn='https://scontent.cdninstagram.com/example';
describe('Instagram rich content display',()=>{
 it('renders emoji and symbols as ordinary text',()=>{
  render(<InstagramMessageContent message={{text_content:'Салом 😊👍❤️ © № 1'}}/>);expect(screen.getByText('Салом 😊👍❤️ © № 1')).toBeTruthy();
 });
 it('renders text together with a photograph',()=>{
  render(<InstagramMessageContent message={{text_content:'Photo caption',attachments:[{type:'image',url:cdn}]}}/>);
  expect(screen.getByText('Photo caption')).toBeTruthy();expect(screen.getByRole('img').getAttribute('src')).toBe(cdn);
 });
 it('renders audio and video controls without autoplay',()=>{
  const {container}=render(<InstagramMessageContent message={{attachments:[{type:'audio',url:cdn},{type:'video',url:cdn}]}}/>);
  for(const tag of ['audio','video']){const e=container.querySelector(tag);expect(e.hasAttribute('controls')).toBe(true);expect(e.hasAttribute('autoplay')).toBe(false);expect(e.getAttribute('preload')).toBe('none');}
 });
 it('shows a useful fallback for an expired media URL',()=>{
  render(<InstagramMessageContent message={{attachments:[{type:'image',url:cdn}]}}/>);fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Фото / GIF: файл недоступен или срок ссылки истёк.')).toBeTruthy();expect(screen.queryByRole('img')).toBeNull();expect(screen.getByRole('link',{name:'Открыть Instagram'})).toBeTruthy();
 });
 it('displays shares, stories and grouped reactions',()=>{
  render(<InstagramMessageContent message={{shares:[{type:'share',url:'https://www.instagram.com/p/test/',title:'Publication'},{type:'story',url:null}],reactions:[{emoji:'love',count:2}]}}/>);
  expect(screen.getByRole('link',{name:'Открыть материал'}).getAttribute('rel')).toBe('noopener noreferrer');expect(screen.getByText('История Instagram')).toBeTruthy();expect(screen.getByText('❤️ × 2')).toBeTruthy();
 });
 it('does not load executable or foreign media URLs',()=>{
  const {container}=render(<InstagramMessageContent message={{attachments:[{type:'image',url:'javascript:alert(1)'},{type:'audio',url:'https://evil.example/audio'}],shares:[{url:'javascript:alert(1)'}]}}/>);
  expect(container.querySelector('img,audio,video')).toBeNull();expect(screen.queryByRole('link',{name:'Открыть материал'})).toBeNull();
 });
 it('explains unavailable or unsupported API content instead of claiming empty message',()=>{
  render(<InstagramMessageContent message={{unsupported:true}}/>);expect(screen.getByText('Этот тип сообщения не поддерживается API Instagram.')).toBeTruthy();expect(screen.queryByText('Сообщение без текста')).toBeNull();
 });
});
