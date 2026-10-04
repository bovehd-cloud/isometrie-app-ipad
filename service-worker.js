const CACHE_NAME='isometrie-app-shell-v1';
const APP_SHELL=['./','./index.html','./symbol-data.js','./permanent-symbols.js','./pdf-lib.min.js','./xlsx.full.min.js','./projektliste.txt','./manifest.webmanifest','./app-icon-180.png','./app-icon-192.png','./app-icon-512.png','./rohrtec-logo-dark.png','./rohrtec-logo-hell.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const requestUrl=new URL(event.request.url);
  if(requestUrl.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(!response?.ok)throw new Error(`Serverantwort ${response?.status||'unbekannt'}`);
    const copy=response.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    throw new Error('Offline-Datei nicht im App-Cache vorhanden.');
  }));
});
