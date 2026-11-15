const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);

export function startAppUpdates(){
 const currentId=document.querySelector('meta[name="crm-build-id"]')?.content;
 if(!validId(currentId))return ()=>{};
 let active=true,controller=null,dismissedId=null;
 const registerWorker=()=>{
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
 };
 function showUpdate(id){
  if(id===dismissedId||document.getElementById('tozon-update-notice'))return;
  const notice=document.createElement('aside');notice.id='tozon-update-notice';notice.setAttribute('role','status');
  notice.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;z-index:9999;padding:18px;background:white;color:#172554;border:1px solid #93c5fd;border-radius:12px;font:16px system-ui;box-shadow:0 4px 18px #0002';
  const text=document.createElement('p');text.style.margin='0 0 12px';text.textContent='Доступна новая версия CRM. Сохраните введённые данные перед обновлением.';
  const url=new URL(window.location.href);url.searchParams.set('_crm_reload',String(Date.now()));
  const link=document.createElement('a');link.href=url.href;link.textContent='Обновить приложение';link.style.cssText='display:inline-block;color:#1d4ed8;font-weight:600;margin-right:20px';
  const later=document.createElement('button');later.type='button';later.textContent='Позже';later.style.cssText='border:0;background:transparent;color:#475569;cursor:pointer;font:inherit';
  later.addEventListener('click',()=>{dismissedId=id;notice.remove();});
  notice.append(text,link,later);document.body.appendChild(notice);
 }
 async function check(){
  if(!active||controller||document.visibilityState==='hidden'||navigator.onLine===false)return;
  const request=new AbortController();controller=request;
  const timeout=window.setTimeout(()=>request.abort(),10000);
  try{
   const url=new URL('/crm-version.json',window.location.origin);url.searchParams.set('_crm_version_check',String(Date.now()));
   const response=await fetch(url.href,{cache:'no-store',credentials:'omit',redirect:'error',signal:request.signal});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))return;
   const body=await response.text();if(body.length>1024)return;
   const version=JSON.parse(body);
   if(active&&version.schema===1&&validId(version.id)&&version.id!==currentId)showUpdate(version.id);
  }catch{/* Offline/rewrite/timeout must not interrupt an active form. */}
  finally{window.clearTimeout(timeout);if(controller===request)controller=null;}
 }
 if(document.readyState==='complete')registerWorker();else window.addEventListener('load',registerWorker,{once:true});
 document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
 const timer=window.setInterval(check,60000);void check();
 return ()=>{active=false;controller?.abort();window.clearInterval(timer);window.removeEventListener('load',registerWorker);document.removeEventListener('visibilitychange',check);window.removeEventListener('online',check);};
}
