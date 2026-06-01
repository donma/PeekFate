/**
 * 時辰卡片渲染器
 * 處理時辰卡片的渲染、展開/收起、吉凶顯示等功能
 */
class HourCardRenderer {
  constructor() {
    this.container = null;
    this.expandedCards = new Set();
  }

  /**
   * 初始化渲染器
   * @param {HTMLElement|string} container - 容器元素或選擇器
   */
  init(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }

    if (!this.container) {
      console.error('[HourCardRenderer] 找不到容器元素');
      return false;
    }

    this.container.classList.add('hour-cards-container');
    return true;
  }

  /**
   * 渲染多個時辰卡片
   * @param {Array} hoursData - 時辰數據數組
   */
  renderHourCards(hoursData) {
    if (!this.container) {
      console.error('[HourCardRenderer] 請先調用 init() 初始化容器');
      return;
    }

    if (!Array.isArray(hoursData) || hoursData.length === 0) {
      this.container.innerHTML = '<div class="hour-cards-empty">暫無時辰數據</div>';
      return;
    }

    this.container.innerHTML = '';
    hoursData.forEach((hourData, index) => {
      const card = this.renderHourCard(hourData, index);
      this.container.appendChild(card);
    });
  }

  /**
   * 渲染單個時辰卡片
   * @param {Object} hourData - 時辰數據
   * @param {number} index - 卡片索引
   * @returns {HTMLElement} 卡片元素
   */
  renderHourCard(hourData, index = 0) {
    const card = document.createElement('div');
    card.className = 'hour-card';
    card.dataset.index = index;

    const scoreLevel = this.getScoreLevel(hourData.score);
    const scoreColor = this.getScoreColor(hourData.score);

    card.innerHTML = `
      <div class="hour-card__header" data-index="${index}">
        <div class="hour-card__title-row">
          <div class="hour-card__name-group">
            <span class="hour-card__icon">${hourData.icon || '🕐'}</span>
            <h3 class="hour-card__name">${this.escapeHtml(hourData.name)}</h3>
          </div>
          <div class="hour-card__score-badge" style="background-color: ${scoreColor}">
            <span class="hour-card__score-value">${hourData.score || 0}</span>
            <span class="hour-card__score-label">分</span>
          </div>
        </div>
        <div class="hour-card__time-range">${this.escapeHtml(hourData.timeRange || '')}</div>
        <div class="hour-card__level-indicator">
          <span class="hour-card__level-dot" style="background-color: ${scoreColor}"></span>
          <span class="hour-card__level-text" style="color: ${scoreColor}">${scoreLevel}</span>
        </div>
        <p class="hour-card__summary">${this.escapeHtml(hourData.summary || '')}</p>
        <div class="hour-card__tags">
          ${this.renderTags(hourData.good, 'good')}
          ${this.renderTags(hourData.bad, 'bad')}
        </div>
        <div class="hour-card__toggle-hint">
          <span class="hour-card__toggle-icon">▼</span>
          <span class="hour-card__toggle-text">展開詳情</span>
        </div>
      </div>
      <div class="hour-card__details" data-index="${index}">
        ${this.renderDetails(hourData)}
      </div>
    `;

    const header = card.querySelector('.hour-card__header');
    header.addEventListener('click', () => this.toggleCardDetails(card));

    return card;
  }

  /**
   * 渲染標籤
   * @param {Array} tags - 標籤數據
   * @param {string} type - 類型 good/bad
   * @returns {string} HTML字符串
   */
  renderTags(tags, type) {
    if (!Array.isArray(tags) || tags.length === 0) return '';

    return tags.map(tag => `
      <span class="hour-card__tag hour-card__tag--${type}">
        ${type === 'good' ? '✓' : '✗'} ${this.escapeHtml(tag)}
      </span>
    `).join('');
  }

  /**
   * 渲染詳細內容
   * @param {Object} hourData - 時辰數據
   * @returns {string} HTML字符串
   */
  renderDetails(hourData) {
    const details = [];

    if (hourData.description) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title">詳細說明</h4>
          <p class="hour-card__detail-text">${this.escapeHtml(hourData.description)}</p>
        </div>
      `);
    }

    if (Array.isArray(hourData.good) && hourData.good.length > 0) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title hour-card__detail-title--good">✓ 適合事項</h4>
          <ul class="hour-card__detail-list">
            ${hourData.good.map(item => `<li class="hour-card__detail-item hour-card__detail-item--good">${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `);
    }

    if (Array.isArray(hourData.bad) && hourData.bad.length > 0) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title hour-card__detail-title--bad">✗ 避免事項</h4>
          <ul class="hour-card__detail-list">
            ${hourData.bad.map(item => `<li class="hour-card__detail-item hour-card__detail-item--bad">${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `);
    }

    if (hourData.taboo) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title hour-card__detail-title--taboo">⚠ 禁忌</h4>
          <p class="hour-card__detail-text hour-card__detail-text--taboo">${this.escapeHtml(hourData.taboo)}</p>
        </div>
      `);
    }

    if (hourData.direction) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title">吉利方位</h4>
          <p class="hour-card__detail-text">${this.escapeHtml(hourData.direction)}</p>
        </div>
      `);
    }

    if (hourData.element) {
      details.push(`
        <div class="hour-card__detail-section">
          <h4 class="hour-card__detail-title">五行属性</h4>
          <p class="hour-card__detail-text">${this.escapeHtml(hourData.element)}</p>
        </div>
      `);
    }

    return details.length > 0
      ? details.join('')
      : '<div class="hour-card__detail-section"><p class="hour-card__detail-text">暫無詳細資訊</p></div>';
  }

  /**
   * 展開/收起卡片詳細
   * @param {HTMLElement} cardElement - 卡片元素
   */
  toggleCardDetails(cardElement) {
    const details = cardElement.querySelector('.hour-card__details');
    const toggleIcon = cardElement.querySelector('.hour-card__toggle-icon');
    const toggleText = cardElement.querySelector('.hour-card__toggle-text');
    const index = cardElement.dataset.index;

    if (!details) return;

    const isExpanded = details.classList.contains('hour-card__details--expanded');

    if (isExpanded) {
      details.classList.remove('hour-card__details--expanded');
      cardElement.classList.remove('hour-card--expanded');
      toggleIcon.textContent = '▼';
      toggleText.textContent = '展開詳情';
      this.expandedCards.delete(index);
    } else {
      details.classList.add('hour-card__details--expanded');
      cardElement.classList.add('hour-card--expanded');
      toggleIcon.textContent = '▲';
      toggleText.textContent = '收起詳情';
      this.expandedCards.add(index);
    }
  }

  /**
   * 獲取吉凶等級
   * @param {number} score - 分數 (0-100)
   * @returns {string} 等級文字
   */
  getScoreLevel(score) {
    if (typeof score !== 'number' || isNaN(score)) return '未知';
    if (score >= 90) return '大吉';
    if (score >= 80) return '吉';
    if (score >= 70) return '小吉';
    if (score >= 60) return '平';
    if (score >= 50) return '小凶';
    if (score >= 40) return '凶';
    return '大凶';
  }

  /**
   * 獲取分數顏色
   * @param {number} score - 分數 (0-100)
   * @returns {string} 顏色值
   */
  getScoreColor(score) {
    if (typeof score !== 'number' || isNaN(score)) return '#9e9e9e';
    if (score >= 90) return '#2e7d32';
    if (score >= 80) return '#4caf50';
    if (score >= 70) return '#8bc34a';
    if (score >= 60) return '#ffc107';
    if (score >= 50) return '#ff9800';
    if (score >= 40) return '#ff5722';
    return '#d32f2f';
  }

  /**
   * HTML轉義防止XSS
   * @param {string} text - 原始文本
   * @returns {string} 轉義後的文本
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 展開所有卡片
   */
  expandAll() {
    const cards = this.container.querySelectorAll('.hour-card');
    cards.forEach(card => {
      const details = card.querySelector('.hour-card__details');
      const toggleIcon = card.querySelector('.hour-card__toggle-icon');
      const toggleText = card.querySelector('.hour-card__toggle-text');
      if (details && !details.classList.contains('hour-card__details--expanded')) {
        details.classList.add('hour-card__details--expanded');
        card.classList.add('hour-card--expanded');
        toggleIcon.textContent = '▲';
        toggleText.textContent = '收起詳情';
      }
    });
  }

  /**
   * 收起所有卡片
   */
  collapseAll() {
    const cards = this.container.querySelectorAll('.hour-card');
    cards.forEach(card => {
      const details = card.querySelector('.hour-card__details');
      const toggleIcon = card.querySelector('.hour-card__toggle-icon');
      const toggleText = card.querySelector('.hour-card__toggle-text');
      if (details && details.classList.contains('hour-card__details--expanded')) {
        details.classList.remove('hour-card__details--expanded');
        card.classList.remove('hour-card--expanded');
        toggleIcon.textContent = '▼';
        toggleText.textContent = '展開詳情';
      }
    });
  }

  /**
   * 清空容器
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
      this.expandedCards.clear();
    }
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HourCardRenderer;
}
