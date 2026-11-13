// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {buyerRequest} from './buyer-api';
afterEach(()=>vi.unstubAllGlobals());
it('uses only Telegram auth, omits employee cookies, and sends no secrets in URL',async()=>{
  const fetch=vi.fn(async()=>({ok:true,json:async()=>({data:{verified:true}})}));vi.stubGlobal('fetch',fetch);
  await buyerRequest('/verify','signed-data',{method:'POST',body:{code:'123456'}});
  const [url,options]=fetch.mock.calls[0];
  expect(url).not.toContain('123456');expect(url).not.toContain('signed-data');
  expect(options.credentials).toBe('omit');expect(options.cache).toBe('no-store');
  expect(options.headers['X-Telegram-Init-Data']).toBe('signed-data');expect(options.headers.Authorization).toBeUndefined();
});
it('fails closed when outside Telegram',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  await expect(buyerRequest('/access','')).rejects.toThrow('INVALID_TELEGRAM_AUTH');expect(fetch).not.toHaveBeenCalled();
});
