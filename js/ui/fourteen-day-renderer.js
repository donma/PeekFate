/**
 * 14 天渲染器
 * 處理 14 天概述渲染，包含日期、星期、分數、吉凶、主題、時辰等
 * @module FourteenDayRenderer
 */

class FourteenDayRenderer {
  /**
   * 構造函數
   */
  constructor() {
    this.container = null;
    this.expandedCard = null;
    this.daysData = [];
  }

  /**
   * 初始化渲染器
   * @param {HTMLElement|string} container - 容器元素或選擇器
   * @param {Array} daysData - 14 天數據數組
   */
  init(container, daysData = []) {
    try {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }

      if (!this.container) {
        throw new Error('無法找到容器元素');
      }

      this.daysData = daysData;
      this.renderDays(daysData);
    } catch (error) {
      console.error('FourteenDayRenderer 初始化失敗:', error);
      this.renderError(error.message);
    }
  }

  /**
   * 渲染錯誤信息
   * @param {string} message - 錯誤信息
   */
  renderError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="fourteen-day-error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">載入失敗: ${message}</div>
        </div>
      `;
    }
  }

  /**
   * 渲染 14 天卡片列表
   * @param {Array} daysData - 14 天數據數組
   */
  renderDays(daysData) {
    if (!this.container) {
      console.error('容器未初始化');
      return;
    }

    if (!Array.isArray(daysData) || daysData.length === 0) {
      this.container.innerHTML = `
        <div class="fourteen-day-empty">
          <div class="empty-icon">📅</div>
          <div class="empty-message">暫無數據</div>
        </div>
      `;
      return;
    }

    const header = this.renderHeader();
    const cards = daysData.map((day, index) => this.renderDayCard(day, index)).join('');

    this.container.innerHTML = `
      <div class="fourteen-day-container">
        ${header}
        <div class="fourteen-day-grid">
          ${cards}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /**
   * 渲染標題區域
   * @returns {string} HTML 字符串
   */
  renderHeader() {
    return `
      <div class="fourteen-day-header">
        <h2 class="fourteen-day-title">14 天運勢總覽</h2>
        <div class="fourteen-day-subtitle">點擊卡片查看詳細說明</div>
      </div>
    `;
  }

  /**
   * 渲染單天卡片
   * @param {Object} dayData - 單天數據
   * @param {number} index - 索引
   * @returns {string} HTML 字符串
   */
  renderDayCard(dayData, index) {
    const {
      date = '',
      weekday = '',
      score = 0,
      fortune = '',
      theme = '',
      bestTime = '',
      riskTime = '',
      description = ''
    } = dayData;

    const scoreLevel = this.getScoreLevel(score);
    const scoreColor = this.getScoreColor(score);
    const fortuneClass = this.getFortuneClass(fortune);
    const isToday = this.isToday(date);

    return `
      <div class="fourteen-day-card ${isToday ? 'is-today' : ''}" data-index="${index}">
        <div class="card-header">
          <div class="card-date">${this.formatDate(date)}</div>
          <div class="card-weekday">${weekday}</div>
        </div>
        <div class="card-body">
          <div class="card-score" style="color: ${scoreColor}">
            <span class="score-value">${score}</span>
            <span class="score-label">分</span>
          </div>
          <div class="card-fortune ${fortuneClass}">${fortune}</div>
          <div class="card-theme">${theme}</div>
        </div>
        <div class="card-times">
          ${bestTime ? `<div class="time-item time-best"><span class="time-label">吉時</span><span class="time-value">${bestTime}</span></div>` : ''}
          ${riskTime ? `<div class="time-item time-risk"><span class="time-label">凶時</span><span class="time-value">${riskTime}</span></div>` : ''}
        </div>
        <div class="card-details">
          <div class="details-content">${description || '暫無詳細說明'}</div>
        </div>
        <div class="card-toggle">
          <span class="toggle-icon">▼</span>
        </div>
      </div>
    `;
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    if (!this.container) return;

    const cards = this.container.querySelectorAll('.fourteen-day-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        this.toggleDayDetails(card);
      });
    });
  }

  /**
   * 展開/收起卡片詳細
   * @param {HTMLElement} cardElement - 卡片元素
   */
  toggleDayDetails(cardElement) {
    if (!cardElement) return;

    const isExpanded = cardElement.classList.contains('is-expanded');

    // 收起之前展開的卡片
    if (this.expandedCard && this.expandedCard !== cardElement) {
      this.expandedCard.classList.remove('is-expanded');
    }

    // 切換當前卡片
    cardElement.classList.toggle('is-expanded');
    this.expandedCard = isExpanded ? null : cardElement;

    // 更新切換圖標
    const toggleIcon = cardElement.querySelector('.toggle-icon');
    if (toggleIcon) {
      toggleIcon.textContent = isExpanded ? '▼' : '▲';
    }
  }

  /**
   * 獲取分數等級
   * @param {number} score - 分數
   * @returns {string} 等級文字
   */
  getScoreLevel(score) {
    if (score >= 90) return '大吉';
    if (score >= 80) return '中吉';
    if (score >= 70) return '小吉';
    if (score >= 60) return '平';
    if (score >= 50) return '小凶';
    if (score >= 40) return '中凶';
    return '大凶';
  }

  /**
   * 獲取分數顏色
   * @param {number} score - 分數
   * @returns {string} 顏色代碼
   */
  getScoreColor(score) {
    if (score >= 90) return '#FF4444';
    if (score >= 80) return '#FF6B35';
    if (score >= 70) return '#FFA500';
    if (score >= 60) return '#FFD700';
    if (score >= 50) return '#9ACD32';
    if (score >= 40) return '#4682B4';
    return '#708090';
  }

  /**
   * 獲取吉凶 CSS 類名
   * @param {string} fortune - 吉凶文字
   * @returns {string} CSS 類名
   */
  getFortuneClass(fortune) {
    if (!fortune) return 'fortune-neutral';
    if (fortune.includes('吉') || fortune.includes('好')) return 'fortune-good';
    if (fortune.includes('凶') || fortune.includes('壞')) return 'fortune-bad';
    return 'fortune-neutral';
  }

  /**
   * 判斷是否為今天
   * @param {string} date - 日期字符串
   * @returns {boolean}
   */
  isToday(date) {
    if (!date) return false;
    const today = new Date();
    const dateObj = new Date(date);
    return dateObj.toDateString() === today.toDateString();
  }

  /**
   * 格式化日期
   * @param {string} date - 日期字符串
   * @returns {string} 格式化後的日期
   */
  formatDate(date) {
    if (!date) return '';
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    return `${month}/${day}`;
  }

  /**
   * 更新數據
   * @param {Array} newDaysData - 新的 14 天數據
   */
  updateData(newDaysData) {
    this.daysData = newDaysData;
    this.renderDays(newDaysData);
  }

  /**
   * 展開指定卡片
   * @param {number} index - 卡片索引
   */
  expandCard(index) {
    if (!this.container) return;
    const card = this.container.querySelector(`[data-index="${index}"]`);
    if (card) {
      this.toggleDayDetails(card);
    }
  }

  /**
   * 收起所有卡片
   */
  collapseAll() {
    if (!this.container) return;
    const expandedCards = this.container.querySelectorAll('.fourteen-day-card.is-expanded');
    expandedCards.forEach(card => {
      card.classList.remove('is-expanded');
      const toggleIcon = card.querySelector('.toggle-icon');
      if (toggleIcon) {
        toggleIcon.textContent = '▼';
      }
    });
    this.expandedCard = null;
  }

  /**
   * 獲取樣式
   * @returns {string} CSS 樣式字符串
   */
  static getStyles() {
    return `
      .fourteen-day-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 16px;
        max-width: 100%;
      }

      .fourteen-day-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .fourteen-day-title {
        font-size: 24px;
        font-weight: 700;
        color: #333;
        margin: 0 0 8px 0;
      }

      .fourteen-day-subtitle {
        font-size: 14px;
        color: #666;
      }

      .fourteen-day-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }

      .fourteen-day-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
      }

      .fourteen-day-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }

      .fourteen-day-card.is-today {
        border-color: #FF6B35;
        background: linear-gradient(135deg, #FFF5F0, #FFF);
      }

      .fourteen-day-card.is-expanded {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
      }

      .card-date {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .card-weekday {
        font-size: 14px;
        color: #666;
        background: #f5f5f5;
        padding: 4px 8px;
        border-radius: 4px;
      }

      .card-body {
        text-align: center;
        margin-bottom: 12px;
      }

      .card-score {
        margin-bottom: 8px;
      }

      .score-value {
        font-size: 36px;
        font-weight: 700;
      }

      .score-label {
        font-size: 14px;
        margin-left: 4px;
      }

      .card-fortune {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        padding: 4px 12px;
        border-radius: 20px;
        display: inline-block;
      }

      .fortune-good {
        background: #FFF0F0;
        color: #FF4444;
      }

      .fortune-bad {
        background: #F0F5FF;
        color: #4682B4;
      }

      .fortune-neutral {
        background: #F5F5F5;
        color: #666;
      }

      .card-theme {
        font-size: 14px;
        color: #666;
        line-height: 1.4;
      }

      .card-times {
        display: flex;
        justify-content: space-around;
        margin-bottom: 12px;
        padding: 8px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .time-item {
        text-align: center;
      }

      .time-label {
        display: block;
        font-size: 12px;
        color: #999;
        margin-bottom: 4px;
      }

      .time-value {
        display: block;
        font-size: 14px;
        font-weight: 500;
      }

      .time-best .time-value {
        color: #FF4444;
      }

      .time-risk .time-value {
        color: #4682B4;
      }

      .card-details {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .fourteen-day-card.is-expanded .card-details {
        max-height: 200px;
      }

      .details-content {
        padding: 12px;
        background: #f9f9f9;
        border-radius: 8px;
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }

      .card-toggle {
        text-align: center;
        padding-top: 8px;
      }

      .toggle-icon {
        font-size: 12px;
        color: #999;
      }

      .fourteen-day-error,
      .fourteen-day-empty {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      .error-icon,
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-message,
      .empty-message {
        font-size: 16px;
      }

      @media (max-width: 768px) {
        .fourteen-day-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .fourteen-day-container {
          padding: 12px;
        }

        .fourteen-day-title {
          font-size: 20px;
        }

        .score-value {
          font-size: 28px;
        }
      }

      @media (max-width: 480px) {
        .fourteen-day-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  /**
   * 注入樣式到頁面
   */
  static injectStyles() {
    if (document.getElementById('fourteen-day-styles')) return;

    const style = document.createElement('style');
    style.id = 'fourteen-day-styles';
    style.textContent = FourteenDayRenderer.getStyles();
    document.head.appendChild(style);
  }
}

// 自動注入樣式
if (typeof document !== 'undefined') {
  FourteenDayRenderer.injectStyles();
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FourteenDayRenderer;
} else if (typeof window !== 'undefined') {
  window.FourteenDayRenderer = FourteenDayRenderer;
}
