import {act,renderHook,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import useWorkspaceRead from './useWorkspaceRead';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
it('preserves navigation only for the same actor and clears it on denial or actor switch',async()=>{
 let finish;api.get.mockResolvedValueOnce({data:{projects:[{id:'own'}]}});
 const r=renderHook(({version,actor})=>useWorkspaceRead('/project-workspace/projects',{},version,actor),{initialProps:{version:0,actor:10}});
 await waitFor(()=>expect(r.result.current.data).toEqual({projects:[{id:'own'}]}));
 api.get.mockImplementation(()=>new Promise((resolve,reject)=>{finish={resolve,reject};}));r.rerender({version:1,actor:10});
 expect(r.result.current.data).toEqual({projects:[{id:'own'}]});expect(r.result.current.loading).toBe(true);
 await act(async()=>finish.reject(new Error('revoked')));expect(r.result.current.data).toBeNull();expect(r.result.current.error).toBe('revoked');
 api.get.mockResolvedValueOnce({data:{projects:[{id:'own'}]}});r.rerender({version:2,actor:10});await waitFor(()=>expect(r.result.current.data).not.toBeNull());
 api.get.mockImplementation(()=>new Promise(()=>{}));r.rerender({version:3,actor:20});expect(r.result.current.data).toBeNull();r.unmount();
});
