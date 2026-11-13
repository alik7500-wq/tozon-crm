const rawBase=import.meta.env.VITE_API_URL||'https://tozon-backend.onrender.com/api';
const base=rawBase.replace(/\/$/,'').replace(/\/api$/,'')+'/api/buyer-portal';
export async function buyerRequest(path,initData,{method='GET',body,signal}={}) {
  if (!initData) throw new Error('INVALID_TELEGRAM_AUTH');
  const response=await fetch(`${base}${path}`,{method,credentials:'omit',cache:'no-store',signal,
    headers:{'Content-Type':'application/json','X-Telegram-Init-Data':initData},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(value.message||'BUYER_SERVICE_UNAVAILABLE');
  return value.data;
}
let sdk;
export function loadTelegram() {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (sdk) return sdk;
  sdk=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://telegram.org/js/telegram-web-app.js';script.async=true;
    const timer=setTimeout(()=>{script.remove();sdk=null;reject(new Error('INVALID_TELEGRAM_AUTH'));},12000);
    script.onload=()=>{clearTimeout(timer);if(window.Telegram?.WebApp)resolve(window.Telegram.WebApp);else{sdk=null;reject(new Error('INVALID_TELEGRAM_AUTH'));}};
    script.onerror=()=>{clearTimeout(timer);script.remove();sdk=null;reject(new Error('INVALID_TELEGRAM_AUTH'));};
    document.head.appendChild(script);
  });
  return sdk;
}
