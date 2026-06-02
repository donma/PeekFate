/**
 * 服務工作者 (Service Worker)
 * 速窺運勢 - 八字、易經與奇門遁甲的每日時辰推演工具
 *
 * 功能：
 * 1. 快取應用程式資源以支援離線使用
 * 2. 處理資源更新策略
 * 3. 管理快取版本控制
 *
 * 快取策略：
 * - HTML: Network First（優先網路，失敗回退快取）
 * - CSS/JS/JSON/Icons: Stale While Revalidate（快取優先，背景更新）
 * - 非 GET 請求: 不處理
 * - 外站資源: 不快取
 */

'use strict';

// ============================================
// 快取配置
// ============================================

/** 快取名稱（更新版本時需更改） */
const CACHE_NAME = 'su-kui-yun-shi-v35';

/** 需要預先快取的資源清單 */
const CACHE_URLS = [
  // 主要頁面
  './',
  './index.html',

  // 樣式表
  './css/app.css',

  // 主要腳本
  './js/app.js',
  './js/app-optimized.js',
  './js/main.js',
  './js/performance-monitor.js',
  './js/privacy.js',
  './js/pwa-install.js',

  // 引擎腳本
  './js/engines/bazi-engine.js',
  './js/engines/date-engine.js',
  './js/engines/ganzhi-engine.js',
  './js/engines/iching-engine.js',
  './js/engines/interpretation-engine.js',
  './js/engines/qimen-engine.js',
  './js/engines/scoring-engine.js',

  // UI 腳本
  './js/ui/form-controller.js',
  './js/ui/fourteen-day-renderer.js',
  './js/ui/hour-card-renderer.js',
  './js/ui/result-renderer.js',

  // 核心資料
  './data/core/stems.json',
  './data/core/branches.json',
  './data/core/elements.json',
  './data/core/ganzhi-60.json',
  './data/core/twelve-hours.json',
  './data/core/solar-terms.json',

  // 八字資料
  './data/bazi/ten-gods.json',
  './data/bazi/hidden-stems.json',
  './data/bazi/branch-relations.json',
  './data/bazi/nayin.json',
  './data/bazi/bazi-rules.json',
  './data/bazi/bazi-templates.json',

  // 易經資料
  './data/iching/trigrams.json',
  './data/iching/hexagrams.json',
  './data/iching/lines.json',
  './data/iching/hexagram-relations.json',
  './data/iching/change-map.json',
  './data/iching/iching-templates.json',

  // 奇門遁甲資料
  './data/qimen/palaces.json',
  './data/qimen/doors.json',
  './data/qimen/stars.json',
  './data/qimen/gods.json',
  './data/qimen/yin-yang-dun.json',
  './data/qimen/ju-rules.json',
  './data/qimen/xunshou.json',
  './data/qimen/zhifu-zhishi.json',
  './data/qimen/qimen-patterns.json',
  './data/qimen/qimen-templates.json',

  // 解釋模板資料
  './data/interpretation/score-rules.json',
  './data/interpretation/event-templates.json',
  './data/interpretation/advice-templates.json',
  './data/interpretation/risk-templates.json',

  // PWA 設定
  './manifest.json',

  // 圖示
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// ============================================
// 安裝事件處理
// ============================================

/**
 * 處理 Service Worker 安裝事件
 * 預先快取所有必要資源
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安裝中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 開始快取資源');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] 所有資源快取完成');
        // 跳過等待，立即啟用
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] 快取資源失敗:', error);
        // 即使部分資源快取失敗，也繼續安裝
        // 這確保應用程式至少能部分離線運作
      })
  );
});

// ============================================
// 啟用事件處理
// ============================================

/**
 * 處理 Service Worker 啟用事件
 * 清除舊版本快取，確保資源更新
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 啟用中...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 選擇不屬於當前版本的快取
              return cacheName.startsWith('ku-tian-ming-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[Service Worker] 清除舊快取:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] 啟用完成');
        // 立即接管所有客戶端
        return self.clients.claim();
      })
  );
});

// ============================================
// 請求事件處理
// ============================================

/**
 * 處理所有網路請求
 * 根據資源類型應用不同的快取策略
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理 GET 請求
  if (request.method !== 'GET') {
    return;
  }

  // 不快取外站資源
  if (url.origin !== self.location.origin) {
    return;
  }

  // 根據資源類型選擇快取策略
  const strategy = getCacheStrategy(url.pathname);

  switch (strategy) {
    case 'network-first':
      event.respondWith(networkFirst(request));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      // 未知資源使用網路優先策略
      event.respondWith(networkFirst(request));
  }
});

// ============================================
// 快取策略函數
// ============================================

/**
 * 根據資源路徑決定快取策略
 * @param {string} pathname - 資源路徑
 * @returns {string} 快取策略名稱
 */
function getCacheStrategy(pathname) {
  // HTML 檔案使用 Network First
  if (pathname.endsWith('.html') || pathname.endsWith('/') || pathname === '') {
    return 'network-first';
  }

  // CSS、JS、JSON、圖片使用 Stale While Revalidate
  if (
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return 'stale-while-revalidate';
  }

  return 'network-first';
}

/**
 * Network First 策略
 * 優先使用網路，失敗時回退到快取
 * 適用於 HTML 檔案，確保內容更新
 *
 * @param {Request} request - 網路請求
 * @returns {Promise<Response>} 回應
 */
async function networkFirst(request) {
  try {
    // 嘗試從網路獲取
    const networkResponse = await fetch(request);

    // 如果成功，更新快取
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // 網路失敗，嘗試從快取獲取
    console.log('[Service Worker] 網路請求失敗，回退到快取:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 如果快取也沒有，返回離線頁面或錯誤
    return createOfflineResponse(request);
  }
}

/**
 * Stale While Revalidate 策略
 * 優先返回快取內容，同時在背景更新快取
 * 適用於不常變動的資源（CSS、JS、JSON、圖片）
 *
 * @param {Request} request - 網路請求
 * @returns {Promise<Response>} 回應
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // 在背景發起網路請求更新快取
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // 更新快取
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[Service Worker] 背景更新失敗:', request.url, error);
      // 背景更新失敗不影響使用者體驗
    });

  // 如果有快取，立即返回；否則等待網路回應
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    return await fetchPromise;
  } catch (error) {
    return createOfflineResponse(request);
  }
}

/**
 * 創建離線回應
 * 當資源無法從網路或快取獲取時，提供適當的回應
 *
 * @param {Request} request - 原始請求
 * @returns {Response} 離線回應
 */
function createOfflineResponse(request) {
  const url = new URL(request.url);
  const acceptHeader = request.headers.get('Accept') || '';

  // 如果請求 HTML 頁面，返回簡單的離線提示
  if (acceptHeader.includes('text/html')) {
    const offlineHtml = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>速窺運勢 - 離線模式</title>
        <style>
          body {
            font-family: "Noto Serif TC", "Noto Sans TC", serif;
            background-color: #F7EFE1;
            color: #2B2118;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .offline-container {
            text-align: center;
            max-width: 400px;
            padding: 40px;
            background: #FFF9ED;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          h1 {
            color: #8B1E1E;
            font-size: 24px;
            margin-bottom: 16px;
          }
          p {
            color: #6F5B46;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          button {
            background: #8B1E1E;
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-family: inherit;
          }
          button:hover {
            background: #6B1515;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <h1>離線模式</h1>
          <p>目前無法連接到網路。<br>請檢查您的網路連線後重試。</p>
          <button onclick="window.location.reload()">重新載入</button>
        </div>
      </body>
      </html>
    `;

    return new Response(offlineHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 對於 JSON 請求，返回空物件
  if (acceptHeader.includes('application/json') || url.pathname.endsWith('.json')) {
    return new Response('{}', {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 對於其他資源，返回 503 錯誤
  return new Response('Service Unavailable', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ============================================
// 訊息處理
// ============================================

/**
 * 處理來自客戶端的訊息
 * 可用於控制快取更新或其他操作
 */
self.addEventListener('message', (event) => {
  const { data } = event;

  if (data && data.type === 'SKIP_WAITING') {
    // 跳過等待，立即啟用新版本
    self.skipWaiting();
  }

  if (data && data.type === 'CLEAR_CACHE') {
    // 清除所有快取
    caches.delete(CACHE_NAME).then(() => {
      console.log('[Service Worker] 快取已清除');
    });
  }
});

/**
 * 處理推送到使用者的通知（未來擴展用）
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '您有新的時辰運勢',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || './'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '速窺運勢', options)
    );
  }
});

/**
 * 處理通知點擊事件
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});

// ============================================
// 錯誤處理
// ============================================

/**
 * 全域錯誤處理
 */
self.addEventListener('error', (event) => {
  console.error('[Service Worker] 發生錯誤:', event.error);
});

/**
 * 未處理的 Promise 拒絕
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] 未處理的 Promise 拒絕:', event.reason);
});

// ============================================
// 工具函數
// ============================================

/**
 * 檢查 URL 是否為應用程式內部資源
 * @param {string} url - 要檢查的 URL
 * @returns {boolean} 是否為內部資源
 */
function isInternalResource(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin === self.location.origin;
  } catch {
    return false;
  }
}

/**
 * 檢查資源是否應該被快取
 * @param {string} pathname - 資源路徑
 * @returns {boolean} 是否應該快取
 */
function shouldCache(pathname) {
  // 不快取非必要資源
  const excludedPatterns = [
    /\/tests\//,
    /\.map$/,
    /\.md$/,
    /\.txt$/
  ];

  return !excludedPatterns.some(pattern => pattern.test(pathname));
}

/**
 * 獲取快取狀態資訊
 * @returns {Promise<Object>} 快取狀態
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();

  return {
    cacheName: CACHE_NAME,
    cachedResources: keys.length,
    allCacheNames: cacheNames
  };
}

// 初始化完成
console.log('[Service Worker] 已載入，版本:', CACHE_NAME);
