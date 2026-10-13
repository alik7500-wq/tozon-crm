self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Financial and personal data always come directly from the server.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TOZON CRM</title><body style="font:18px system-ui;padding:32px"><h1>Нет подключения к интернету</h1><p>Для работы с TOZON CRM восстановите подключение.</p><button onclick="location.reload()">Повторить</button></body></html>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});
