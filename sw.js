// Service worker mínimo — existe só pra satisfazer o critério de "app instalável" do Android/Chrome.
// Não faz cache nem funciona offline; o app continua buscando dados normalmente pela internet.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  // Deixa passar todas as requisições normalmente (sem cache/offline).
});
