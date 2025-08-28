// Placeholder service worker to prevent 404 errors
// This is a minimal service worker that does nothing

self.addEventListener('install', function(event) {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  // Let the browser handle all requests normally
  return;
});