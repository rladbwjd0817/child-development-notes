const C="baldalnote-v2";
const A=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.pathname.indexOf("/api/")>-1 || u.pathname.indexOf("/.netlify/")>-1) return; // AI 호출은 캐시 안 함
  if(e.request.method!=="GET") return;
  if(e.request.mode==="navigate" || u.pathname.endsWith("/index.html") || u.pathname==="/"){
    e.respondWith(
      fetch(e.request).then(r=>{
        caches.open(C).then(c=>c.put(e.request,r.clone()));
        return r;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
