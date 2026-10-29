// Minimal service worker so the site is installable and can be packaged for Play.
// It does no caching: every request still goes to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
