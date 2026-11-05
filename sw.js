// Generado por scripts/build-personal.mjs. Guarda la app en el teléfono para abrirla sin internet.
const VERSION = 'jp-715ae651ea91';
const FILES = ["./","GUIA.md","apps-script/Codigo.gs","css/app.css","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","js/api.js","js/app.js","js/charts.js","js/core/app.js","js/core/finance.js","js/core/schema.js","js/core/seed.js","js/i18n.js","js/local/engine.js","js/local/sheets.js","js/local/store.js","js/local/ui.js","js/mode.js","js/nav.js","js/store.js","js/theme.js","js/ui.js","js/vendor/sql-wasm.LICENSE","js/vendor/sql-wasm.js","js/vendor/sql-wasm.wasm","js/views/accounts.js","js/views/auth.js","js/views/budget.js","js/views/calendar.js","js/views/common.js","js/views/data.js","js/views/goals.js","js/views/home.js","js/views/more.js","js/views/people.js","js/views/reports.js","js/views/transactions.js","js/views/txform.js","manifest.webmanifest"];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
