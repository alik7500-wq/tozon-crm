// @vitest-environment node
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {it, expect} from 'vitest';
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../../public/startup-recovery.js', import.meta.url), 'utf8');
function start() {
  const dom = new JSDOM(html, {url:'https://example.com/projects/3?tab=chess#parking', runScripts:'outside-only'});
  dom.window.eval(script);
  return dom;
}
it('keeps a visible startup message while application modules load', () => {
  const dom=start();
  expect(dom.window.document.getElementById('tozon-startup-message').textContent).toContain('Загрузка');
  expect(dom.window.document.getElementById('tozon-startup-reload').hidden).toBe(true);
  dom.window.close();
});
it('offers a fresh URL on failed module loading, preserving route and browser data', () => {
  const dom=start(), w=dom.window;
  w.localStorage.setItem('existing-session','keep');
  w.dispatchEvent(new w.ErrorEvent('error', {message:'Failed to fetch dynamically imported module'}));
  const link=w.document.getElementById('tozon-startup-reload');
  expect(link.hidden).toBe(false);
  const url=new URL(link.href);
  expect(url.pathname).toBe('/projects/3');
  expect(url.searchParams.get('tab')).toBe('chess');
  expect(url.searchParams.has('_crm_reload')).toBe(true);
  expect(url.hash).toBe('#parking');
  expect(w.localStorage.getItem('existing-session')).toBe('keep');
  dom.window.close();
});
it('does not overwrite or automatically reload an already running form', () => {
  const dom=start(), w=dom.window;
  w.document.getElementById('root').innerHTML='<input value="Несохранённая сделка">';
  w.dispatchEvent(new w.Event('vite:preloadError',{cancelable:true}));
  w.dispatchEvent(new w.Event('vite:preloadError',{cancelable:true}));
  expect(w.document.querySelector('input').value).toBe('Несохранённая сделка');
  expect(w.document.querySelectorAll('#tozon-update-notice')).toHaveLength(1);
  expect(w.location.search).toBe('?tab=chess');
  dom.window.close();
});
