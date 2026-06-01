/**
 * PWA 安裝管理器
 * 處理 PWA 安裝提示，顯示低干擾安裝按鈕
 * 規格要求：
 * - 不得一進站跳大型彈窗
 * - 使用低干擾按鈕：「安裝到桌面」
 * - 只有 beforeinstallprompt 觸發時顯示
 * - 使用者點擊才 prompt
 * - 關閉後 7 天內不再顯示
 * - 已 standalone 時不顯示
 * - iOS 顯示小提示：可使用 Safari 分享按鈕加入主畫面
 */
class PwaInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.iosBanner = null;
    this.isInitialized = false;

    // 儲存鍵名
    this.STORAGE_KEY_DISMISSED = 'pwa_install_dismissed';
    this.STORAGE_KEY_DISMISSED_IOS = 'pwa_install_dismissed_ios';
    this.STORAGE_KEY_INSTALLED = 'pwa_installed';

    // 7 天 = 604800000 毫秒
    this.DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;
  }

  /**
   * 初始化 PWA 安裝管理器
   */
  init() {
    if (this.isInitialized) return;

    try {
      // 檢查是否已在 standalone 模式
      if (this.isStandalone()) {
        this.log('已處於 standalone 模式，跳過安裝提示');
        return;
      }

      // 檢查是否已標記為已安裝
      if (this.isInstalled()) {
        this.log('已標記為已安裝，跳過安裝提示');
        return;
      }

      // 檢測平台
      if (this.isIOS()) {
        this.initIOSPrompt();
      } else {
        this.initAndroidDesktopPrompt();
      }

      this.isInitialized = true;
      this.log('PwaInstallManager 初始化完成');
    } catch (error) {
      console.error('[PwaInstallManager] 初始化錯誤:', error);
    }
  }

  /**
   * 初始化 Android/Desktop 安裝提示
   */
  initAndroidDesktopPrompt() {
    // 創建安裝按鈕
    this.createInstallButton();

    // 監聽 beforeinstallprompt 事件
    window.addEventListener('beforeinstallprompt', (e) => {
      this.handleBeforeInstallPrompt(e);
    });

    // 監聽 appinstalled 事件
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });
  }

  /**
   * 初始化 iOS 安裝提示
   */
  initIOSPrompt() {
    // 檢查是否已關閉 iOS 提示且未過期
    if (this.isDismissed(this.STORAGE_KEY_DISMISSED_IOS)) {
      this.log('iOS 提示已被關閉且未過期，跳過');
      return;
    }

    this.createIOSBanner();
    this.showIOSBanner();
  }

  /**
   * 處理 beforeinstallprompt 事件
   * @param {BeforeInstallPromptEvent} e - 安裝提示事件
   */
  handleBeforeInstallPrompt(e) {
    try {
      // 阻止默認行為
      e.preventDefault();

      // 保存事件以便後續使用
      this.deferredPrompt = e;

      // 檢查是否已關閉且未過期
      if (this.isDismissed(this.STORAGE_KEY_DISMISSED)) {
        this.log('安裝提示已被關閉且未過期，跳過顯示');
        return;
      }

      // 顯示安裝按鈕
      this.showInstallButton();
      this.log('安裝提示已準備就緒');
    } catch (error) {
      console.error('[PwaInstallManager] 處理安裝提示錯誤:', error);
    }
  }

  /**
   * 處理安裝按鈕點擊
   */
  async handleInstallClick() {
    if (!this.deferredPrompt) {
      this.log('沒有可用的安裝提示');
      return;
    }

    try {
      // 顯示安裝提示
      this.deferredPrompt.prompt();

      // 等待用戶響應
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        this.log('用戶接受了安裝');
        this.markAsInstalled();
      } else {
        this.log('用戶拒絕了安裝');
        this.dismiss(this.STORAGE_KEY_DISMISSED);
      }

      // 清除保存的事件
      this.deferredPrompt = null;

      // 隱藏安裝按鈕
      this.hideInstallButton();
    } catch (error) {
      console.error('[PwaInstallManager] 處理安裝點擊錯誤:', error);
    }
  }

  /**
   * 處理應用安裝完成
   */
  handleAppInstalled() {
    try {
      this.log('應用已安裝');
      this.markAsInstalled();
      this.hideInstallButton();
      this.deferredPrompt = null;
    } catch (error) {
      console.error('[PwaInstallManager] 處理安裝完成錯誤:', error);
    }
  }

  /**
   * 創建安裝按鈕（Android/Desktop）
   */
  createInstallButton() {
    // 檢查是否已存在
    if (document.getElementById('pwa-install-btn')) return;

    const button = document.createElement('button');
    button.id = 'pwa-install-btn';
    button.textContent = '安裝到桌面';
    button.setAttribute('aria-label', '安裝應用到桌面');
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      display: none;
      transition: opacity 0.3s, transform 0.3s;
      opacity: 0;
      transform: translateY(10px);
    `;

    // 添加關閉按鈕
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      margin-left: 10px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      opacity: 0.7;
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss(this.STORAGE_KEY_DISMISSED);
      this.hideInstallButton();
    });

    button.appendChild(closeBtn);

    // 點擊處理
    button.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      this.handleInstallClick();
    });

    document.body.appendChild(button);
    this.installButton = button;
  }

  /**
   * 顯示安裝按鈕
   */
  showInstallButton() {
    if (!this.installButton) {
      this.createInstallButton();
    }

    if (this.installButton) {
      this.installButton.style.display = 'block';
      // 觸發動畫
      requestAnimationFrame(() => {
        this.installButton.style.opacity = '1';
        this.installButton.style.transform = 'translateY(0)';
      });
    }
  }

  /**
   * 隱藏安裝按鈕
   */
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.style.opacity = '0';
      this.installButton.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (this.installButton) {
          this.installButton.style.display = 'none';
        }
      }, 300);
    }
  }

  /**
   * 創建 iOS 安裝提示橫幅
   */
  createIOSBanner() {
    // 檢查是否已存在
    if (document.getElementById('pwa-ios-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-ios-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">📲</span>
          <span>可使用 Safari <strong>分享按鈕</strong> 加入主畫面</span>
        </div>
        <span id="pwa-ios-close" style="cursor: pointer; font-size: 20px; padding: 5px; opacity: 0.7;">×</span>
      </div>
    `;
    banner.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 15px 20px;
      background-color: #333;
      color: white;
      font-size: 14px;
      z-index: 9999;
      display: none;
      transition: transform 0.3s;
      transform: translateY(100%);
    `;

    // 關閉按鈕處理
    banner.querySelector('#pwa-ios-close').addEventListener('click', () => {
      this.dismiss(this.STORAGE_KEY_DISMISSED_IOS);
      this.hideIOSBanner();
    });

    document.body.appendChild(banner);
    this.iosBanner = banner;
  }

  /**
   * 顯示 iOS 提示橫幅
   */
  showIOSBanner() {
    if (!this.iosBanner) {
      this.createIOSBanner();
    }

    if (this.iosBanner) {
      this.iosBanner.style.display = 'block';
      requestAnimationFrame(() => {
        this.iosBanner.style.transform = 'translateY(0)';
      });
    }
  }

  /**
   * 隱藏 iOS 提示橫幅
   */
  hideIOSBanner() {
    if (this.iosBanner) {
      this.iosBanner.style.transform = 'translateY(100%)';
      setTimeout(() => {
        if (this.iosBanner) {
          this.iosBanner.style.display = 'none';
        }
      }, 300);
    }
  }

  /**
   * 檢查是否處於 standalone 模式
   * @returns {boolean}
   */
  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  /**
   * 檢查是否為 iOS 設備
   * @returns {boolean}
   */
  isIOS() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }

  /**
   * 檢查是否已安裝
   * @returns {boolean}
   */
  isInstalled() {
    try {
      return localStorage.getItem(this.STORAGE_KEY_INSTALLED) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * 標記為已安裝
   */
  markAsInstalled() {
    try {
      localStorage.setItem(this.STORAGE_KEY_INSTALLED, 'true');
    } catch (error) {
      console.error('[PwaInstallManager] 保存安裝狀態錯誤:', error);
    }
  }

  /**
   * 記錄關閉時間
   * @param {string} storageKey - 儲存鍵名
   */
  dismiss(storageKey) {
    try {
      const data = {
        timestamp: Date.now(),
        expiresAt: Date.now() + this.DISMISS_DURATION
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      this.log(`提示已關閉，${this.DISMISS_DURATION / 86400000} 天後可再次顯示`);
    } catch (error) {
      console.error('[PwaInstallManager] 保存關閉狀態錯誤:', error);
    }
  }

  /**
   * 檢查是否已關閉且未過期
   * @param {string} storageKey - 儲存鍵名
   * @returns {boolean}
   */
  isDismissed(storageKey) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return false;

      const data = JSON.parse(stored);
      return data.expiresAt && Date.now() < data.expiresAt;
    } catch {
      return false;
    }
  }

  /**
   * 重置所有狀態（用於測試或手動觸發）
   */
  reset() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_DISMISSED);
      localStorage.removeItem(this.STORAGE_KEY_DISMISSED_IOS);
      localStorage.removeItem(this.STORAGE_KEY_INSTALLED);
      this.deferredPrompt = null;
      this.isInitialized = false;
      this.log('所有狀態已重置');
    } catch (error) {
      console.error('[PwaInstallManager] 重置狀態錯誤:', error);
    }
  }

  /**
   * 日誌輸出
   * @param {string} message - 日誌信息
   */
  log(message) {
    console.log(`[PwaInstallManager] ${message}`);
  }
}

// 導出（支持 CommonJS 和 ES Modules）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PwaInstallManager;
}

// 自動初始化（當 DOM 準備就緒時）
if (typeof window !== 'undefined') {
  const pwaInstallManager = new PwaInstallManager();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      pwaInstallManager.init();
    });
  } else {
    pwaInstallManager.init();
  }

  // 暴露到全局作用域（可選）
  window.PwaInstallManager = PwaInstallManager;
  window.pwaInstallManager = pwaInstallManager;
}
