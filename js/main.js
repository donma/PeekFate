/**
 * 優化後的入口文件
 * 使用延遲載入和並行處理來提升性能
 */

const APP_VERSION = 'v42';
console.log(`⚡ 速窺運勢 v${APP_VERSION}`);

// 檢查是否有舊版快取需要清除
async function checkStaleCache() {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    const staleKeys = keys.filter(k => !k.includes(APP_VERSION) && k.includes('su-kui'));
    if (staleKeys.length > 0) {
      await Promise.all(staleKeys.map(k => caches.delete(k)));
      console.log(`已清除 ${staleKeys.length} 個舊版快取`, staleKeys);
    }
  } catch (e) {
    // ignore
  }
}
checkStaleCache();

const perfMonitor = new PerformanceMonitor();

async function loadCritical() {
  perfMonitor.start('critical-load');
  
  try {
    const app = new App();
    await app.init();
    perfMonitor.end('critical-load');
    console.log(`關鍵資源載入完成: ${perfMonitor.getDuration('critical-load').toFixed(2)}ms`);
    return app;
  } catch (error) {
    console.error('關鍵資源載入失敗:', error);
    throw error;
  }
}

function loadNonCritical() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      perfMonitor.start('non-critical-load');
      loadPWAInstall();
      loadAnalytics();
      perfMonitor.end('non-critical-load');
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      loadPWAInstall();
      loadAnalytics();
    }, 1000);
  }
}

function loadPWAInstall() {
  const script = document.createElement('script');
  script.src = 'js/pwa-install.js';
  script.async = true;
  document.head.appendChild(script);
}

function loadAnalytics() {
  // 預留統計代碼位置
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadCritical();
    loadNonCritical();
  });
} else {
  loadCritical();
  loadNonCritical();
}
