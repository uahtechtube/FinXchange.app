// FinXchange Service Worker for PWA functionality
const CACHE_NAME = 'finxchange-v1.0.0';
const STATIC_CACHE = 'finxchange-static-v1';
const DYNAMIC_CACHE = 'finxchange-dynamic-v1';
const API_CACHE = 'finxchange-api-v1';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  // Add other critical files
];

// API endpoints that can be cached
const CACHEABLE_API_ENDPOINTS = [
  '/api/auth/me',
  '/api/wallet',
  '/api/virtual-account',
  '/api/banks',
  '/api/beneficiaries',
  '/api/transactions',
];

// API endpoints that should never be cached
const NON_CACHEABLE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/transfer/',
  '/api/webhooks/',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('FinXchange Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('FinXchange Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // For POST/PUT/DELETE requests, handle offline queue
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleAPIRequest(request));
    }
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIGet(request));
    return;
  }

  // Handle static files and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API GET requests with caching strategy
async function handleAPIGet(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check if endpoint is cacheable
  const isCacheable = CACHEABLE_API_ENDPOINTS.some(endpoint => 
    pathname.startsWith(endpoint)
  );
  
  if (!isCacheable) {
    // Non-cacheable endpoint - network only
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Network unavailable',
        message: 'This request requires an internet connection.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Cacheable endpoint - cache first, then network
  try {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Return cached version if available and less than 5 minutes old
    if (cachedResponse) {
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      if (cacheDate) {
        const age = Date.now() - parseInt(cacheDate);
        if (age < 5 * 60 * 1000) { // 5 minutes
          console.log('Returning cached API response for:', pathname);
          return cachedResponse;
        }
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Network failed, trying cache for:', pathname);
    
    // Network failed, try cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline message
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are offline and this data is not cached.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle non-GET API requests (POST, PUT, DELETE)
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check if endpoint should never be cached or queued
  const isNonCacheable = NON_CACHEABLE_ENDPOINTS.some(endpoint => 
    pathname.startsWith(endpoint)
  );
  
  try {
    // Try network first
    const response = await fetch(request);
    return response;
    
  } catch (error) {
    console.log('Network failed for API request:', pathname);
    
    // For transfer endpoints, add to offline queue
    if (pathname.startsWith('/api/transfer/') && !isNonCacheable) {
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      
      // Store in IndexedDB for offline processing
      await storeOfflineTransaction({
        endpoint: pathname,
        method: request.method,
        body: body,
        timestamp: Date.now(),
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Transaction queued for processing when back online.',
        offline: true,
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For other endpoints, return error
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: 'This request requires an internet connection.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Network failed for static request, trying cache');
    
    // Network failed, try cache again
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FinXchange - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Inter, sans-serif; 
            margin: 0; 
            padding: 20px; 
            text-align: center;
            background: linear-gradient(135deg, hsl(221 83% 53%) 0%, hsl(24 95% 53%) 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 400px;
          }
          .icon { font-size: 4rem; margin-bottom: 20px; }
          h1 { margin: 0 0 10px 0; }
          p { margin: 10px 0; opacity: 0.9; }
          button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            margin-top: 20px;
            font-size: 16px;
          }
          button:hover { background: rgba(255, 255, 255, 0.3); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>You're Offline</h1>
          <p>FinXchange is not available right now. Please check your internet connection.</p>
          <p>Your queued transactions will be processed when you're back online.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Store offline transaction in IndexedDB
async function storeOfflineTransaction(transaction) {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    
    await store.add({
      ...transaction,
      id: `sw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    
    console.log('Stored offline transaction:', transaction.endpoint);
  } catch (error) {
    console.error('Failed to store offline transaction:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FinXchangeOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const store = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Handle background sync for offline transactions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'process-offline-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

// Process queued offline transactions
async function processOfflineQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(['offlineQueue'], 'readonly');
    const store = tx.objectStore('offlineQueue');
    const transactions = await store.getAll();
    
    for (const transaction of transactions) {
      try {
        const response = await fetch(transaction.endpoint, {
          method: transaction.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction.body),
          credentials: 'include',
        });
        
        if (response.ok) {
          // Remove successful transaction from queue
          const deleteTx = db.transaction(['offlineQueue'], 'readwrite');
          const deleteStore = deleteTx.objectStore('offlineQueue');
          await deleteStore.delete(transaction.id);
          
          console.log('Processed offline transaction:', transaction.id);
        }
      } catch (error) {
        console.error('Failed to process offline transaction:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: 'You have new activity in your FinXchange account',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open FinXchange',
        icon: '/icons/icon-192x192.png'
      }
    ],
    requireInteraction: true,
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('FinXchange', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_API_RESPONSE') {
    const { endpoint, data, expiry } = event.data;
    cacheAPIResponse(endpoint, data, expiry);
  }
});

// Cache API response manually
async function cacheAPIResponse(endpoint, data, expiry = 5) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'sw-cache-date': Date.now().toString(),
        'sw-cache-expiry': (Date.now() + expiry * 60 * 1000).toString(),
      }
    });
    
    await cache.put(endpoint, response);
    console.log('Manually cached API response for:', endpoint);
  } catch (error) {
    console.error('Failed to manually cache API response:', error);
  }
}

console.log('FinXchange Service Worker loaded');
