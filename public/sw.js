self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Foundation: deliberadamente no cacheamos respuestas todavía.
// Definiremos una estrategia offline sólo después de clasificar qué datos pueden quedar obsoletos.
