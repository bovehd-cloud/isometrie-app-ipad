const CACHE_NAME='isometrie-app-shell-v2';

// Die Kern-Dateien müssen vollständig vorhanden sein, damit die App auch ohne
// Verbindung starten kann. Zusätzliche Medien werden danach einzeln versucht,
// damit ein fehlendes Logo oder Icon die Offline-App nicht komplett verhindert.
const CORE_SHELL=['./','./index.html','./symbol-data.js','./permanent-symbols.js','./pdf-lib.min.js','./xlsx.full.min.js','./projektliste.txt','./manifest.webmanifest'];
const OPTIONAL_SHELL=['./app-icon-180.png','./app-icon-192.png','./app-icon-512.png','./rohrtec-logo-dark.png','./rohrtec-logo-hell.png'];

async function cacheOptionalFiles(cache){
  await Promise.all(OPTIONAL_SHELL.map(async file=>{
    try{const response=await fetch(file,{cache:'reload'});if(response.ok)await cache.put(file,response);}
    catch(error){console.warn('Optionale Offline-Datei konnte nicht gespeichert werden:',file,error);}
  }));
}
async function notifyClientsOfflineReady(){
  const windows=await self.clients.matchAll({type:'window'});
  windows.forEach(client=>client.postMessage({type:'ISOMETRIE_OFFLINE_READY',cacheName:CACHE_NAME}));
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(CORE_SHELL);
    await cacheOptionalFiles(cache);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
    await notifyClientsOfflineReady();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='CHECK_ISOMETRIE_OFFLINE_READY')event.source?.postMessage({type:'ISOMETRIE_OFFLINE_READY',cacheName:CACHE_NAME});
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
