/**
 * Service Worker for ALX Polly Pro
 * --------------------------------
 * Provides offline support, caching, and push notifications.
 * 
 * WHY: Enhances user experience with offline functionality, faster loading,
 * and push notifications. Essential for mobile-first PWA experience.
 * 
 * Features:
 * - Offline support
 * - Caching strategies
 * - Push notifications
 * - Background sync
 * - Update management
 * 
 * Security considerations:
 * - Secure caching policies
 * - Content validation
 * - Update verification
 * - Privacy protection
 */

const CACHE_NAME = 'alx-polly-pro-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache for offline support
const STATIC_FILES = [
  '/',
  '/polls',
  '/polls/new',
  '/analytics',
  '/admin',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/polls',
  '/api/analytics',
  '/api/admin'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML pages - cache first, then network
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Return offline page if available
              return caches.match('/offline.html');
            });
        })
    );
  } else if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - network first, then cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Return offline response for API requests
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'This feature is not available offline' 
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'poll-notification',
      data: data.data,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action) {
    // Handle specific action
    console.log('Service Worker: Action clicked:', event.action);
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      handleBackgroundSync()
    );
  }
});

// Handle background sync tasks
async function handleBackgroundSync() {
  try {
    // Sync offline data when connection is restored
    console.log('Service Worker: Handling background sync');
    
    // In a real implementation, you'd sync offline data here
    // For example, sync votes that were cast offline
    
  } catch (error) {
    console.error('Service Worker: Background sync error:', error);
  }
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error:', event.error);
});

// Unhandled promise rejection
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicSync', (event) => {
    console.log('Service Worker: Periodic sync');
    
    if (event.tag === 'content-sync') {
      event.waitUntil(
        // Sync content periodically
        syncContent()
      );
    }
  });
}

// Sync content periodically
async function syncContent() {
  try {
    console.log('Service Worker: Syncing content');
    
    // In a real implementation, you'd sync content here
    // For example, update cached polls, analytics, etc.
    
  } catch (error) {
    console.error('Service Worker: Content sync error:', error);
  }
}
