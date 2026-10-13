(() => {
  let pending;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Установить TOZON CRM';
  button.setAttribute('aria-label', 'Установить TOZON CRM как приложение');
  button.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;background:#3154F5;color:white;border:0;border-radius:14px;padding:12px 18px;font:600 14px system-ui;box-shadow:0 4px 18px #0002;cursor:pointer;display:none';
  document.body.appendChild(button);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pending = event;
    if (!standalone()) button.style.display = 'block';
  });
  button.addEventListener('click', async () => {
    if (!pending) return;
    const prompt = pending;
    pending = null;
    button.style.display = 'none';
    try { await prompt.prompt(); await prompt.userChoice; } catch {}
  });
  window.addEventListener('appinstalled', () => { pending = null; button.remove(); });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
