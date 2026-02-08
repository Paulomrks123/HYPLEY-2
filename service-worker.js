const CACHE_NAME = 'gideao-ia-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // O bundle JavaScript gerado de index.tsx será cacheado automaticamente pelo service worker
  // assim que ele for baixado pelo navegador. Para garantir que as fontes e CSS sejam cacheados,
  // também adicionamos os URLs aqui.
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  // Adicione caminhos para seus ícones PWA aqui (ex: '/icons/icon-192x192.png')
  // Para fins de demonstração, assumimos que os ícones estarão na pasta /icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto durante a instalação.');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Falha ao adicionar URLs ao cache durante a instalação:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Importante: Clonar a requisição. Uma requisição é um stream e só pode ser consumida uma vez.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
              return response;
            }

            // Importante: Clonar a resposta. Uma resposta é um stream e só pode ser consumida uma vez.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          console.error('Service Worker: Falha na requisição de rede:', error);
          // Opcional: Retornar uma página offline personalizada em caso de falha de rede.
          // return caches.match('/offline.html');
        });
      })
    );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});