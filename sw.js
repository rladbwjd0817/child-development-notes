const C="baldalnote-v1";
const A=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim());});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.pathname.indexOf("/api/")>-1 || u.pathname.indexOf("/.netlify/")>-1) return; // AI 호출은 캐시 안 함
  if(e.request.method!=="GET") return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
