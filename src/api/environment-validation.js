export function resolveEnvironment(env) {
 if(env.VITE_COMMERCIAL_TEST!=='true')throw new Error('COMMERCIAL_BUILD_CONFIRMATION_REQUIRED');
 const apiUrl=env.VITE_API_URL?.replace(/\/$/,'');
 if(!/^https:\/\/tozon-crm-commercial-test-api(?:-[a-z0-9]+)?\.onrender\.com\/api$/.test(apiUrl||''))throw new Error('ISOLATED_API_URL_REQUIRED');
 if(env.VITE_SUPABASE_URL!=='https://yaolkwbnhnacxxjpgiyu.supabase.co')throw new Error('ISOLATED_SUPABASE_URL_REQUIRED');
 const key=env.VITE_SUPABASE_ANON_KEY;
 if(!key || key.startsWith('sb_secret_'))throw new Error('PUBLIC_SUPABASE_KEY_REQUIRED');
 if(key.startsWith('eyJ')) {
  let claims;try{claims=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw new Error('INVALID_PUBLIC_SUPABASE_KEY');}
  if(claims.role!=='anon'||claims.ref!=='yaolkwbnhnacxxjpgiyu')throw new Error('INVALID_PUBLIC_SUPABASE_KEY');
 }else if(!key.startsWith('sb_publishable_'))throw new Error('PUBLIC_SUPABASE_KEY_REQUIRED');
 return {apiUrl,supabaseUrl:env.VITE_SUPABASE_URL,supabaseKey:key};
}
