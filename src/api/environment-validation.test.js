import {expect,it} from 'vitest';
import {resolveEnvironment} from './environment-validation.js';
const good={VITE_COMMERCIAL_TEST:'true',VITE_API_URL:'https://tozon-crm-commercial-test-api.onrender.com/api',VITE_SUPABASE_URL:'https://yaolkwbnhnacxxjpgiyu.supabase.co',VITE_SUPABASE_ANON_KEY:'sb_publishable_example'};
it('accepts only the isolated test endpoints and a public key',()=>{expect(resolveEnvironment(good).apiUrl).toBe(good.VITE_API_URL);});
it('rejects missing configuration and production backend/database fallbacks',()=>{
 expect(()=>resolveEnvironment({})).toThrow();
 expect(()=>resolveEnvironment({...good,VITE_API_URL:'https://tozon-backend.onrender.com/api'})).toThrow();
 expect(()=>resolveEnvironment({...good,VITE_SUPABASE_URL:'https://yeslzrrcwgcqfxhgbrqk.supabase.co'})).toThrow();
 expect(()=>resolveEnvironment({...good,VITE_SUPABASE_ANON_KEY:'sb_secret_example'})).toThrow();
 const key='eyJ.'+Buffer.from(JSON.stringify({role:'service_role',ref:'yaolkwbnhnacxxjpgiyu'})).toString('base64url')+'.signature';
 expect(()=>resolveEnvironment({...good,VITE_SUPABASE_ANON_KEY:key})).toThrow();
});
