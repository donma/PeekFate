/**
 * 隱私管理模組
 * 處理用戶資料儲存，預設不儲存客戶資料
 * 只有勾選「記住」才寫入 localStorage
 * localStorage key: fortunePwaUserProfile
 */

class PrivacyManager {
  constructor() {
    this.storageKey = 'fortunePwaUserProfile';
  }

  /**
   * 判斷是否應該記住用戶
   * @param {boolean} rememberChecked - 是否勾選「記住」選項
   * @returns {boolean} 是否應該記住用戶
   */
  shouldRememberUser(rememberChecked) {
    return rememberChecked === true;
  }

  /**
   * 保存用戶資料到 localStorage
   * @param {Object} profile - 用戶資料對象
   * @param {boolean} remember - 是否勾選「記住」
   * @returns {boolean} 是否保存成功
   */
  saveUserProfile(profile, remember = false) {
    try {
      if (!this.shouldRememberUser(remember)) {
        return false;
      }

      if (!profile || typeof profile !== 'object') {
        return false;
      }

      const profileData = JSON.stringify(profile);
      localStorage.setItem(this.storageKey, profileData);
      return true;
    } catch (error) {
      console.error('保存用戶資料失敗:', error.message);
      return false;
    }
  }

  /**
   * 從 localStorage 載入用戶資料
   * @returns {Object|null} 用戶資料對象，若無則返回 null
   */
  loadUserProfile() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      
      if (!storedData) {
        return null;
      }

      const profile = JSON.parse(storedData);
      return profile;
    } catch (error) {
      console.error('載入用戶資料失敗:', error.message);
      return null;
    }
  }

  /**
   * 清除 localStorage 中的用戶資料
   * @returns {boolean} 是否清除成功
   */
  clearUserProfile() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('清除用戶資料失敗:', error.message);
      return false;
    }
  }

  /**
   * 判斷是否已儲存用戶資料
   * @returns {boolean} 是否已儲存資料
   */
  isProfileStored() {
    try {
      return localStorage.getItem(this.storageKey) !== null;
    } catch (error) {
      console.error('檢查儲存資料失敗:', error.message);
      return false;
    }
  }
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrivacyManager;
}

// 全域實例
if (typeof window !== 'undefined') {
  window.PrivacyManager = PrivacyManager;
}
