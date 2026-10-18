(() => {
  const root = document.getElementById('root');
  const startup = document.getElementById('tozon-startup');
  const message = document.getElementById('tozon-startup-message');
  const reload = document.getElementById('tozon-startup-reload');
  const recoveryUrl = new URL(window.location.href);
  recoveryUrl.searchParams.set('_crm_reload', String(Date.now()));
  reload.href = recoveryUrl.href;
  const showFailure = () => {
    if (!startup.isConnected) return;
    message.textContent = 'Не удалось завершить загрузку. Проверьте интернет и обновите приложение.';
    reload.hidden = false;
  };
  const timer = window.setTimeout(showFailure, 15000);
  const observer = new MutationObserver(() => {
    if (!startup.isConnected) { window.clearTimeout(timer); observer.disconnect(); }
  });
  observer.observe(root, {childList: true});
  window.addEventListener('error', event => {
    if (event.target?.tagName === 'SCRIPT' || event instanceof ErrorEvent) showFailure();
  }, true);
  window.addEventListener('unhandledrejection', showFailure);
  window.addEventListener('vite:preloadError', event => {
    event.preventDefault();
    if (startup.isConnected) { showFailure(); return; }
    // Never reload a working form automatically: let the manager finish first.
    if (document.getElementById('tozon-update-notice')) return;
    const notice = document.createElement('aside');
    notice.id = 'tozon-update-notice';
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;z-index:9999;padding:18px;background:white;color:#172554;border:1px solid #93c5fd;border-radius:12px;font:16px system-ui';
    notice.textContent = 'Доступна новая версия CRM. Сохраните введённые данные и обновите приложение. ';
    const link = document.createElement('a');
    link.href = recoveryUrl.href;
    link.textContent = 'Обновить приложение';
    notice.appendChild(link);
    document.body.appendChild(notice);
  });
})();
