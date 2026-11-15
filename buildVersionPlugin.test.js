import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {it,expect,vi} from 'vitest';
import {buildVersionPlugin} from './buildVersionPlugin.mjs';
it('emits one matching HTML/manifest identifier for each build',()=>{
 const plugin=buildVersionPlugin(),meta=plugin.transformIndexHtml()[0],emitFile=vi.fn();plugin.generateBundle.call({emitFile});
 const file=emitFile.mock.calls[0][0];expect(file.fileName).toBe('crm-version.json');expect(JSON.parse(file.source)).toEqual({schema:1,id:meta.attrs.content});
 expect(meta.attrs.content).toMatch(/^[a-f0-9]{32}$/);expect(buildVersionPlugin().transformIndexHtml()[0].attrs.content).not.toBe(meta.attrs.content);
});
it('bypasses only navigation HTTP cache and does not intercept API data',async()=>{
 const listeners={},fetch=vi.fn().mockResolvedValue(new Response('new shell')),self={addEventListener:(name,handler)=>{listeners[name]=handler;}};
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self,fetch,Response});
 const apiResponse=vi.fn();listeners.fetch({request:{mode:'cors',url:'/api/private'},respondWith:apiResponse});expect(apiResponse).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 let result;const request={mode:'navigate'};listeners.fetch({request,respondWith:value=>{result=value;}});expect(await (await result).text()).toBe('new shell');expect(fetch).toHaveBeenCalledWith(request,{cache:'no-store'});
 fetch.mockRejectedValueOnce(new Error('offline'));listeners.fetch({request,respondWith:value=>{result=value;}});expect(await (await result).text()).toContain('Нет подключения к интернету');
});
