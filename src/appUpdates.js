const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);

function shellBuildId(html){
 if(typeof html!=='string'||html.length>65536)return null;
 const ids=[];
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  if(!/\sname\s*=\s*(["'])crm-build-id\1/i.test(tag))continue;
  const content=tag.match(/\scontent\s*=\s*(["'])([a-f0-9]{32})\1/i)?.[2];
  if(!validId(content))return null;ids.push(content);
 }
 return ids.length===1?ids[0]:null;
}

export function startAppUpdates(){
 const currentId=document.querySelector('meta[name="crm-build-id"]')?.content;
 if(!validId(currentId))return ()=>{};
 let active=true,controller=null,dismissedId=null,notice=null,noticeId=null;
 const registerWorker=()=>{
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
 };
 function removeNotice(){notice?.remove();notice=null;noticeId=null;}
 function updateUrl(){const url=new URL(window.location.href);url.searchParams.set('_crm_reload',String(Date.now()));return url.href;}
 function showUpdate(id){
  if(id===dismissedId){removeNotice();return;}
  if(notice?.isConnected){noticeId=id;notice.dataset.crmVersion=id;return;}
  if(document.getElementById('tozon-update-notice'))return; // Do not replace a startup/module-load failure notice.
  notice=document.createElement('aside');noticeId=id;notice.dataset.crmVersion=id;notice.id='tozon-update-notice';notice.setAttribute('role','status');
  notice.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;z-index:9999;padding:18px;background:white;color:#172554;border:1px solid #93c5fd;border-radius:12px;font:16px system-ui;box-shadow:0 4px 18px #0002';
  const text=document.createElement('p');text.style.margin='0 0 12px';text.textContent='Доступна новая версия CRM. Сохраните введённые данные перед обновлением.';
  const link=document.createElement('a');link.href=updateUrl();link.textContent='Обновить приложение';link.style.cssText='display:inline-block;color:#1d4ed8;font-weight:600;margin-right:20px';
  link.addEventListener('click',()=>{link.href=updateUrl();});
  const later=document.createElement('button');later.type='button';later.textContent='Позже';later.style.cssText='border:0;background:transparent;color:#475569;cursor:pointer;font:inherit';
  later.addEventListener('click',()=>{dismissedId=noticeId;removeNotice();});
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
   if(!active||request.signal.aborted||version.schema!==1||!validId(version.id))return;
   if(version.id===currentId){removeNotice();return;}
   // HTML and JSON can reach different CDN edges during a release. Confirm
   // both public files agree before offering a reload; never touch API/session data.
   const shellUrl=new URL('/index.html',window.location.origin);shellUrl.searchParams.set('_crm_version_check',String(Date.now()));
   const shell=await fetch(shellUrl.href,{cache:'no-store',credentials:'omit',redirect:'error',signal:request.signal});
   if(!shell.ok||!shell.headers.get('content-type')?.includes('text/html'))return;
   const servedId=shellBuildId(await shell.text());
   if(!active||request.signal.aborted||!servedId)return;
   if(servedId===currentId||servedId!==version.id){removeNotice();return;}
   showUpdate(version.id);
  }catch{/* Offline/rewrite/timeout must not interrupt an active form. */}
  finally{window.clearTimeout(timeout);if(controller===request)controller=null;}
 }
 if(document.readyState==='complete')registerWorker();else window.addEventListener('load',registerWorker,{once:true});
 document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
 const timer=window.setInterval(check,60000);void check();
 return ()=>{active=false;controller?.abort();removeNotice();window.clearInterval(timer);window.removeEventListener('load',registerWorker);document.removeEventListener('visibilitychange',check);window.removeEventListener('online',check);};
}
