import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {startAppUpdates} from './appUpdates';
const current='a'.repeat(32),next='b'.repeat(32);let stop;
const manifest=(id=next,extra={})=>({ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify({schema:1,id,...extra})});
const settle=async()=>{await vi.advanceTimersByTimeAsync(1);};
beforeEach(()=>{
 vi.useFakeTimers();document.head.innerHTML=`<meta name="crm-build-id" content="${current}">`;document.body.innerHTML='<input aria-label="Черновик" value="Несохранённый текст">';
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(manifest()));
});
afterEach(()=>{stop?.();stop=undefined;vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('checks only public same-origin version data and preserves the active draft',async()=>{
 const input=document.querySelector('input');input.focus();stop=startAppUpdates();await settle();
 const [url,options]=fetch.mock.calls[0];expect(new URL(url).pathname).toBe('/crm-version.json');expect(new URL(url).origin).toBe(window.location.origin);
 expect(options).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});
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
 fetch.mockResolvedValue(manifest('c'.repeat(32)));await vi.advanceTimersByTimeAsync(60000);expect(document.querySelectorAll('aside')).toHaveLength(1);
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
