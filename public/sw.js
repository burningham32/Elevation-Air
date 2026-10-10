const BASE=new URL('./',self.location.href).pathname;
const PREFIX='elevation-air:'+BASE+':';
const CACHE=PREFIX+'v7';
const PRECACHE = [];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll([BASE,BASE+'icon.svg',BASE+'manifest.webmanifest',BASE+'elevation-air-logo.png',BASE+'apple-touch-icon.png',...PRECACHE.map(f=>BASE+f)])));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&!url.pathname.startsWith(BASE+'src/')&&!url.pathname.startsWith(BASE+'@')){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));
    }
    return response;
  }).catch(()=>caches.open(CACHE).then(c=>c.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?c.match(BASE):Response.error())))));
});
