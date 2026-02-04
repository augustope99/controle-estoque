const CACHE_NAME = 'estoque-app-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/dados_template.csv',
  '/icon.svg'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{ if(k!==CACHE_NAME) return caches.delete(k); }))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  // handle same-origin assets with cache-first
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(cached=>cached || fetch(e.request).then(res=>{ const copy = res.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request, copy)); return res; }).catch(()=>caches.match('/index.html'))));
  }
});