/**
 * 表單控制模組
 * 處理表單輸入、驗證、提交與清除
 * 配合 index.html 中的 #birthForm 結構
 * @version 1.0.0
 */

class FormController {
  constructor() {
    this.form = null;
    this.birthDateInput = null;
    this.birthTimeInput = null;
    this.hourSelect = null;
    this.unknownTimeCheckbox = null;
    this.rememberCheckbox = null;
    this.genderRadios = null;
    this.onSubmitCallback = null;
    this.privacyManager = null;

    this.hourMap = {
      zi: { time: '23:00', branch: '子', range: '23:00-01:00' },
      chou: { time: '02:00', branch: '丑', range: '01:00-03:00' },
      yin: { time: '04:00', branch: '寅', range: '03:00-05:00' },
      mao: { time: '06:00', branch: '卯', range: '05:00-07:00' },
      chen: { time: '08:00', branch: '辰', range: '07:00-09:00' },
      si: { time: '10:00', branch: '巳', range: '09:00-11:00' },
      wu: { time: '12:00', branch: '午', range: '11:00-13:00' },
      wei: { time: '14:00', branch: '未', range: '13:00-15:00' },
      shen: { time: '16:00', branch: '申', range: '15:00-17:00' },
      you: { time: '18:00', branch: '酉', range: '17:00-19:00' },
      xu: { time: '20:00', branch: '戌', range: '19:00-21:00' },
      hai: { time: '22:00', branch: '亥', range: '21:00-23:00' }
    };

    this.dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    this.timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    this.minYear = 1900;
  }

  /**
   * 初始化表單控制器
   * 綁定 DOM 元素與事件監聽
   * @param {Object} options - 配置選項
   * @param {Function} options.onSubmit - 提交回調函數
   * @param {Object} options.privacyManager - 隱私管理實例
   * @returns {boolean} 初始化是否成功
   */
  init(options = {}) {
    try {
      this.form = document.getElementById('birthForm');
      this.birthDateInput = document.getElementById('birthDate');
      this.birthTimeInput = document.getElementById('birthTime');
      this.hourSelect = document.getElementById('birthHour');
      this.unknownTimeCheckbox = document.getElementById('unknownTime');
      this.rememberCheckbox = document.getElementById('rememberMe');
      this.genderRadios = document.querySelectorAll('input[name="gender"]');

      if (!this.form) {
        console.error('找不到表單元素 #birthForm');
        return false;
      }

      if (options.onSubmit && typeof options.onSubmit === 'function') {
        this.onSubmitCallback = options.onSubmit;
      }

      if (options.privacyManager) {
        this.privacyManager = options.privacyManager;
      }

      this._bindEvents();
      this._loadSavedProfile();

      console.log('表單控制器初始化完成');
      return true;
    } catch (error) {
      console.error('表單控制器初始化失敗:', error);
      return false;
    }
  }

  /**
   * 綁定所有表單事件
   * @private
   */
  _bindEvents() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => this.handleClear());
    }

    if (this.unknownTimeCheckbox) {
      this.unknownTimeCheckbox.addEventListener('change', () => this.handleUnknownTime());
    }

    if (this.birthTimeInput && this.hourSelect) {
      this.birthTimeInput.addEventListener('input', () => {
        if (this.birthTimeInput.value) {
          this.hourSelect.value = '';
        }
      });

      this.hourSelect.addEventListener('change', () => {
        if (this.hourSelect.value) {
          this.birthTimeInput.value = '';
        }
      });
    }

    if (this.birthDateInput) {
      this.birthDateInput.addEventListener('blur', () => {
        const value = this.birthDateInput.value;
        if (value) {
          const result = this.validateBirthDate(value);
          if (!result.valid) {
            this._showFieldError(this.birthDateInput, result.message);
          } else {
            this._clearFieldError(this.birthDateInput);
          }
        }
      });
    }
  }

  /**
   * 驗證生日格式
   * @param {string} date - 生日字串 (yyyy-mm-dd)
   * @returns {Object} { valid: boolean, message?: string }
   */
  validateBirthDate(date) {
    if (!date || typeof date !== 'string' || date.trim() === '') {
      return { valid: false, message: '請先輸入西元生日。' };
    }

    const trimmed = date.trim();

    if (!this.dateRegex.test(trimmed)) {
      return { valid: false, message: '生日格式不正確，請使用 yyyy-mm-dd。' };
    }

    const parts = trimmed.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (year < this.minYear) {
      return { valid: false, message: `生日年份需在 ${this.minYear} 年之後。` };
    }

    const now = new Date();
    if (year > now.getFullYear()) {
      return { valid: false, message: '生日不能是未來的日期。' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, message: '月份需在 01 至 12 之間。' };
    }

    const dateObj = new Date(trimmed);
    if (isNaN(dateObj.getTime())) {
      return { valid: false, message: '生日日期無效，請確認輸入。' };
    }

    if (dateObj.getFullYear() !== year ||
        dateObj.getMonth() + 1 !== month ||
        dateObj.getDate() !== day) {
      return { valid: false, message: '生日日期無效，請確認年月日是否正確。' };
    }

    if (dateObj > now) {
      return { valid: false, message: '生日不能是未來的日期。' };
    }

    return { valid: true };
  }

  /**
   * 驗證出生時間格式
   * @param {string} time - 時間字串 (HH:mm)
   * @returns {Object} { valid: boolean, message?: string }
   */
  validateBirthTime(time) {
    if (!time || typeof time !== 'string' || time.trim() === '') {
      return { valid: true, nullable: true };
    }

    const trimmed = time.trim();

    if (!this.timeRegex.test(trimmed)) {
      return { valid: false, message: '出生時間格式不正確，請使用 HH:mm（例如 14:30）。' };
    }

    return { valid: true };
  }

  /**
   * 驗證時辰選擇
   * @param {string} hourValue - 時辰下拉選單的值
   * @returns {Object} { valid: boolean, message?: string }
   */
  validateHourSelect(hourValue) {
    if (!hourValue || typeof hourValue !== 'string' || hourValue.trim() === '') {
      return { valid: true, nullable: true };
    }

    if (!this.hourMap[hourValue]) {
      return { valid: false, message: '請選擇有效的時辰。' };
    }

    return { valid: true };
  }

  /**
   * 收集並驗證表單數據
   * @returns {Object} { valid: boolean, data?: Object, message?: string }
   */
  getFormData() {
    const birthDate = this.birthDateInput?.value || '';
    const birthTime = this.birthTimeInput?.value || '';
    const birthHour = this.hourSelect?.value || '';
    const unknownTime = this.unknownTimeCheckbox?.checked || false;
    const rememberMe = this.rememberCheckbox?.checked || false;
    let gender = null;
    if (this.genderRadios) {
      for (const radio of this.genderRadios) {
        if (radio.checked) { gender = radio.value; break; }
      }
    }

    const dateValidation = this.validateBirthDate(birthDate);
    if (!dateValidation.valid) {
      return { valid: false, message: dateValidation.message };
    }

    const timeValidation = this.validateBirthTime(birthTime);
    if (!timeValidation.valid) {
      return { valid: false, message: timeValidation.message };
    }

    const hourValidation = this.validateHourSelect(birthHour);
    if (!hourValidation.valid) {
      return { valid: false, message: hourValidation.message };
    }

    let resolvedTime = null;
    if (!unknownTime) {
      if (birthTime) {
        resolvedTime = birthTime;
      } else if (birthHour && this.hourMap[birthHour]) {
        resolvedTime = this.hourMap[birthHour].time;
      }
    }

    return {
      valid: true,
      data: {
        birthDate: birthDate.trim(),
        birthTime: resolvedTime,
        birthHour: birthHour || null,
        unknownTime,
        rememberMe,
        gender,
        hasTimeInfo: !unknownTime && resolvedTime !== null
      }
    };
  }

  /**
   * 處理表單提交
   * 執行驗證、收集數據、調用回調
   */
  handleSubmit() {
    try {
      const result = this.getFormData();

      if (!result.valid) {
        this._showError(result.message);
        return;
      }

      const formData = result.data;

      this._handleRememberMe(formData);

      if (this.onSubmitCallback) {
        this.onSubmitCallback(formData);
      }
    } catch (error) {
      console.error('表單提交處理錯誤:', error);
      this._showError('提交過程發生錯誤，請稍後再試。');
    }
  }

  /**
   * 處理清除資料
   * 重設表單、清除錯誤提示、移除 localStorage
   */
  handleClear() {
    try {
      if (this.form) {
        this.form.reset();
      }

      this._clearAllFieldErrors();

      if (this.birthTimeInput) {
        this.birthTimeInput.disabled = false;
      }
      if (this.hourSelect) {
        this.hourSelect.disabled = false;
      }

      this._clearSavedProfile();

      this._hideError();

      const resultSection = document.getElementById('resultSection');
      if (resultSection) {
        resultSection.style.display = 'none';
      }

      if (this.birthDateInput) {
        this.birthDateInput.focus();
      }
    } catch (error) {
      console.error('清除資料錯誤:', error);
    }
  }

  /**
   * 處理「不知道出生時間」選項
   * 勾選時禁用時間輸入與時辰下拉
   */
  handleUnknownTime() {
    const isChecked = this.unknownTimeCheckbox?.checked || false;

    if (this.birthTimeInput) {
      this.birthTimeInput.disabled = isChecked;
      if (isChecked) {
        this.birthTimeInput.value = '';
      }
    }

    if (this.hourSelect) {
      this.hourSelect.disabled = isChecked;
      if (isChecked) {
        this.hourSelect.value = '';
      }
    }

    this._clearFieldError(this.birthTimeInput);
    this._clearFieldError(this.hourSelect);
  }

  /**
   * 處理「記住我」邏輯
   * 勾選時寫入 localStorage，未勾選時移除
   * @param {Object} formData - 表單數據
   * @private
   */
  _handleRememberMe(formData) {
    try {
      if (formData.rememberMe) {
        const profile = {
          birthDate: formData.birthDate,
          birthTime: formData.birthTime,
          birthHour: formData.birthHour,
          unknownTime: formData.unknownTime,
          gender: formData.gender
        };

        if (this.privacyManager) {
          this.privacyManager.saveUserProfile(profile, true);
        } else {
          localStorage.setItem('fortunePwaUserProfile', JSON.stringify(profile));
        }
      } else {
        this._clearSavedProfile();
      }
    } catch (error) {
      console.warn('處理記住我功能失敗:', error);
    }
  }

  /**
   * 從 localStorage 載入已儲存的用戶資料
   * @private
   */
  _loadSavedProfile() {
    try {
      let profile = null;

      if (this.privacyManager) {
        profile = this.privacyManager.loadUserProfile();
      } else {
        const stored = localStorage.getItem('fortunePwaUserProfile');
        if (stored) {
          profile = JSON.parse(stored);
        }
      }

      if (!profile) return;

      if (this.birthDateInput && profile.birthDate) {
        this.birthDateInput.value = profile.birthDate;
      }

      if (profile.unknownTime) {
        if (this.unknownTimeCheckbox) {
          this.unknownTimeCheckbox.checked = true;
          this.handleUnknownTime();
        }
      } else {
        if (this.birthTimeInput && profile.birthTime) {
          this.birthTimeInput.value = profile.birthTime;
        }
        if (this.hourSelect && profile.birthHour) {
          this.hourSelect.value = profile.birthHour;
        }
      }

      if (profile.gender && this.genderRadios) {
        for (const radio of this.genderRadios) {
          if (radio.value === profile.gender) {
            radio.checked = true;
            break;
          }
        }
      }

      if (this.rememberCheckbox) {
        this.rememberCheckbox.checked = true;
      }
    } catch (error) {
      console.warn('載入已儲存資料失敗:', error);
    }
  }

  /**
   * 清除 localStorage 中的用戶資料
   * @private
   */
  _clearSavedProfile() {
    try {
      if (this.privacyManager) {
        this.privacyManager.clearUserProfile();
      } else {
        localStorage.removeItem('fortunePwaUserProfile');
      }
    } catch (error) {
      console.warn('清除儲存資料失敗:', error);
    }
  }

  /**
   * 顯示欄位錯誤提示
   * @param {HTMLElement} field - 表單欄位元素
   * @param {string} message - 錯誤訊息
   * @private
   */
  _showFieldError(field, message) {
    if (!field) return;

    this._clearFieldError(field);

    field.classList.add('field-error');

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error-message';
    errorEl.textContent = message;

    const parent = field.closest('.form-group');
    if (parent) {
      parent.appendChild(errorEl);
    }
  }

  /**
   * 清除指定欄位的錯誤提示
   * @param {HTMLElement} field - 表單欄位元素
   * @private
   */
  _clearFieldError(field) {
    if (!field) return;

    field.classList.remove('field-error');

    const parent = field.closest('.form-group');
    if (parent) {
      const existing = parent.querySelector('.field-error-message');
      if (existing) {
        existing.remove();
      }
    }
  }

  /**
   * 清除所有欄位的錯誤提示
   * @private
   */
  _clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
      el.classList.remove('field-error');
    });
    document.querySelectorAll('.field-error-message').forEach(el => {
      el.remove();
    });
  }

  /**
   * 顯示全域錯誤訊息
   * @param {string} message - 錯誤訊息
   * @private
   */
  _showError(message) {
    this._hideError();

    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'errorMessage';
      errorDiv.className = 'error-message';

      const main = document.querySelector('.main-content') || document.body;
      const firstSection = main.querySelector('section');
      if (firstSection) {
        main.insertBefore(errorDiv, firstSection);
      } else {
        main.insertBefore(errorDiv, main.firstChild);
      }
    }

    errorDiv.innerHTML = `
      <p>${this._escapeHtml(message)}</p>
      <button type="button" class="btn btn-secondary" id="btnCloseError">關閉</button>
    `;
    errorDiv.style.display = 'block';

    const closeBtn = document.getElementById('btnCloseError');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._hideError());
    }

    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * 隱藏全域錯誤訊息
   * @private
   */
  _hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  /**
   * HTML 轉義，防止 XSS
   * @param {string} text - 原始文字
   * @returns {string} 轉義後的文字
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  /**
   * 取得時辰資訊
   * @param {string} hourKey - 時辰 key（如 zi, chou...）
   * @returns {Object|null} 時辰資訊物件
   */
  getHourInfo(hourKey) {
    return this.hourMap[hourKey] || null;
  }

  /**
   * 由時間推算對應時辰
   * @param {string} time - HH:mm 格式時間
   * @returns {string|null} 時辰 key
   */
  getHourKeyFromTime(time) {
    if (!time || typeof time !== 'string') return null;

    const parts = time.split(':');
    if (parts.length !== 2) return null;

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (isNaN(hour) || isNaN(minute)) return null;

    const totalMinutes = hour * 60 + minute;

    if (totalMinutes >= 23 * 60 || totalMinutes < 1 * 60) return 'zi';
    if (totalMinutes >= 1 * 60 && totalMinutes < 3 * 60) return 'chou';
    if (totalMinutes >= 3 * 60 && totalMinutes < 5 * 60) return 'yin';
    if (totalMinutes >= 5 * 60 && totalMinutes < 7 * 60) return 'mao';
    if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60) return 'chen';
    if (totalMinutes >= 9 * 60 && totalMinutes < 11 * 60) return 'si';
    if (totalMinutes >= 11 * 60 && totalMinutes < 13 * 60) return 'wu';
    if (totalMinutes >= 13 * 60 && totalMinutes < 15 * 60) return 'wei';
    if (totalMinutes >= 15 * 60 && totalMinutes < 17 * 60) return 'shen';
    if (totalMinutes >= 17 * 60 && totalMinutes < 19 * 60) return 'you';
    if (totalMinutes >= 19 * 60 && totalMinutes < 21 * 60) return 'xu';
    if (totalMinutes >= 21 * 60 && totalMinutes < 23 * 60) return 'hai';

    return null;
  }

  /**
   * 設置提交回調
   * @param {Function} callback - 提交時的回調函數
   */
  setOnSubmit(callback) {
    if (typeof callback === 'function') {
      this.onSubmitCallback = callback;
    }
  }

  /**
   * 設置隱私管理器
   * @param {Object} privacyManager - PrivacyManager 實例
   */
  setPrivacyManager(privacyManager) {
    this.privacyManager = privacyManager;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormController;
}

if (typeof window !== 'undefined') {
  window.FormController = FormController;
}
