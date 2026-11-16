import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {startAppUpdates} from './appUpdates';
const current='a'.repeat(32),next='b'.repeat(32);let stop;
const manifest=(id=next,extra={})=>({ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify({schema:1,id,...extra})});
const shell=(id=next)=>({ok:true,headers:new Headers({'content-type':'text/html'}),text:async()=>`<!doctype html><meta name="crm-build-id" content="${id}">`});
const serve=(id=next)=>fetch.mockImplementation(url=>Promise.resolve(new URL(url).pathname==='/index.html'?shell(id):manifest(id)));
const settle=async()=>{await vi.advanceTimersByTimeAsync(1);};
beforeEach(()=>{
 vi.useFakeTimers();document.head.innerHTML=`<meta name="crm-build-id" content="${current}">`;document.body.innerHTML='<input aria-label="Черновик" value="Несохранённый текст">';
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 vi.stubGlobal('fetch',vi.fn());serve();
});
afterEach(()=>{stop?.();stop=undefined;window.history.replaceState({},'','/');vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('checks only public same-origin version data and preserves the active draft',async()=>{
 const input=document.querySelector('input');input.focus();stop=startAppUpdates();await settle();
 const [url,options]=fetch.mock.calls[0];expect(new URL(url).pathname).toBe('/crm-version.json');expect(new URL(url).origin).toBe(window.location.origin);
 expect(options).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});
 expect(fetch.mock.calls.map(([url])=>new URL(url).pathname)).toEqual(['/crm-version.json','/index.html']);
 for(const [url,options] of fetch.mock.calls){expect(new URL(url).origin).toBe(window.location.origin);expect(options.credentials).toBe('omit');expect(options.redirect).toBe('error');}
 expect(document.querySelector('[role="status"]').textContent).toContain('Сохраните введённые данные');
 expect(document.activeElement).toBe(input);expect(input.value).toBe('Несохранённый текст');
 const href=new URL(document.querySelector('aside a').href);expect(href.origin).toBe(window.location.origin);expect(href.searchParams.has('_crm_reload')).toBe(true);
});
it('does not show current, invalid, rewritten or failed manifests',async()=>{
 for(const response of [manifest(current),manifest('https://untrusted.example'),manifest(next,{schema:2}),{ok:false}, {ok:true,headers:new Headers({'content-type':'text/html'})}]){
  fetch.mockResolvedValueOnce(response);stop=startAppUpdates();await settle();expect(document.querySelector('aside')).toBeNull();stop();
 }
 fetch.mockRejectedValueOnce(new Error('offline'));stop=startAppUpdates();await settle();expect(document.querySelector('aside')).toBeNull();
});
it('offers a later action without repeatedly interrupting the same version',async()=>{
 stop=startAppUpdates();await settle();document.querySelector('aside button').click();expect(document.querySelector('aside')).toBeNull();
 await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).toBeNull();
 serve('c'.repeat(32));await vi.advanceTimersByTimeAsync(60000);expect(document.querySelectorAll('aside')).toHaveLength(1);
});
it('skips hidden/offline tabs and prevents concurrent or late responses',async()=>{
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');stop=startAppUpdates();await settle();expect(fetch).not.toHaveBeenCalled();stop();
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.spyOn(navigator,'onLine','get').mockReturnValue(false);stop=startAppUpdates();await settle();expect(fetch).not.toHaveBeenCalled();stop();
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);let resolve;fetch.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));stop=startAppUpdates();document.dispatchEvent(new Event('visibilitychange'));expect(fetch).toHaveBeenCalledTimes(1);
 const signal=fetch.mock.calls[0][1].signal;stop();expect(signal.aborted).toBe(true);resolve(manifest());await settle();expect(document.querySelector('aside')).toBeNull();
});
it('refreshes service-worker code without using the HTTP cache',async()=>{
 const register=vi.fn().mockResolvedValue({});Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register}});
 stop=startAppUpdates();window.dispatchEvent(new Event('load'));await settle();expect(register).toHaveBeenCalledWith('/sw.js',{updateViaCache:'none'});
 delete navigator.serviceWorker;
});
it('does not offer an unconfirmed edge mismatch and removes a notice when the current release is confirmed',async()=>{
 fetch.mockImplementation(url=>Promise.resolve(new URL(url).pathname==='/index.html'?shell(current):manifest(next)));
 stop=startAppUpdates();await settle();expect(document.querySelector('aside')).toBeNull();
 serve(next);await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).not.toBeNull();
 serve(current);await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).toBeNull();expect(document.querySelector('input').value).toBe('Несохранённый текст');
 fetch.mockImplementation(url=>Promise.resolve(new URL(url).pathname==='/index.html'?shell('c'.repeat(32)):manifest(next)));await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).toBeNull();
});
it('dismisses the newest confirmed version without replacing the focused notice or losing the working route',async()=>{
 stop=startAppUpdates();await settle();const notice=document.querySelector('aside'),button=notice.querySelector('button');button.focus();
 serve('c'.repeat(32));await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).toBe(notice);expect(document.activeElement).toBe(button);
 window.history.pushState({},'','/projects/3?tab=plans');const link=notice.querySelector('a');link.addEventListener('click',e=>e.preventDefault());link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));expect(new URL(link.href).pathname).toBe('/projects/3');expect(new URL(link.href).searchParams.get('tab')).toBe('plans');
 button.click();await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).toBeNull();
 serve('d'.repeat(32));await vi.advanceTimersByTimeAsync(60000);expect(document.querySelector('aside')).not.toBeNull();
});
it('ignores invalid, oversized or contradictory HTML without executing markup',async()=>{
 for(const html of ['<html>No build metadata</html>',`<meta name="crm-build-id" content="${next}"><meta name="crm-build-id" content="${current}">`,'x'.repeat(65537),`<meta data-name="crm-build-id" content="${next}">`]){
  fetch.mockImplementation(url=>Promise.resolve(new URL(url).pathname==='/index.html'?{...shell(),text:async()=>html}:manifest()));stop=startAppUpdates();await settle();expect(document.querySelector('aside')).toBeNull();stop();
 }
});
it('keeps independent module-failure alerts and never removes or replaces an active draft or project selection',async()=>{
 const alert=document.createElement('aside');alert.id='tozon-update-notice';alert.setAttribute('role','alert');alert.textContent='Module failed';document.body.append(alert);
 const select=document.createElement('select');select.innerHTML='<option value="plaza">Plaza</option><option value="tower" selected>Tower</option>';document.body.append(select);
 stop=startAppUpdates();await settle();serve(current);await vi.advanceTimersByTimeAsync(60000);stop();expect(alert.isConnected).toBe(true);expect(alert.textContent).toBe('Module failed');expect(select.value).toBe('tower');expect(document.querySelector('input').value).toBe('Несохранённый текст');
});
it('rejects a late HTML response after the shared timeout has aborted the check',async()=>{
 let resolve;fetch.mockImplementation(url=>new URL(url).pathname==='/index.html'?new Promise(r=>{resolve=r;}):Promise.resolve(manifest()));stop=startAppUpdates();await settle();expect(resolve).toBeTypeOf('function');
 const signal=fetch.mock.calls[1][1].signal;await vi.advanceTimersByTimeAsync(10000);expect(signal.aborted).toBe(true);resolve(shell());await settle();expect(document.querySelector('aside')).toBeNull();
});
