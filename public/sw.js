self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Financial and personal data always come directly from the server.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Refresh the small HTML shell through both browser and CDN caches.
  // The visible address and the versioned asset cache remain unchanged.
  url.searchParams.set('_crm_shell', String(Date.now()));
  event.respondWith(fetch(url.href, {cache: 'no-store', credentials: 'same-origin'}).catch(() => new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TOZON CRM</title><body style="font:18px system-ui;padding:32px"><h1>Нет подключения к интернету</h1><p>Для работы с TOZON CRM восстановите подключение.</p><button onclick="location.reload()">Повторить</button></body></html>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});
