/**
 * 結果渲染模組
 * 處理推算結果頁面的所有渲染邏輯
 * 包含個人基本盤、今日/明日時辰、14天概述、系統說明與免責聲明
 * @version 1.0.0
 */

class ResultRenderer {
  constructor() {
    this.container = null;
    this.currentResult = null;
    this.expandedCards = new Set();
  }

  /**
   * 初始化渲染器
   * @param {HTMLElement|string} container - 容器元素或選擇器
   * @returns {boolean} 初始化是否成功
   */
  init(container) {
    try {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }

      if (!this.container) {
        console.error('結果渲染器：找不到容器元素');
        return false;
      }

      console.log('結果渲染器初始化完成');
      return true;
    } catch (error) {
      console.error('結果渲染器初始化失敗:', error);
      return false;
    }
  }

  /**
   * 渲染完整的推算結果
   * @param {Object} result - 完整推算結果數據
   */
  render(result) {
    if (!this.container) {
      console.error('結果渲染器未初始化');
      return;
    }

    if (!result) {
      this._renderError('無推算結果數據');
      return;
    }

    try {
      this.currentResult = result;
      this.expandedCards.clear();

      let html = '';

      html += this.renderPersonalSummary(result.bazi);
      html += this._renderDivider();
      html += this.renderDayOverview(result.today.summary, '今日總覽');
      html += this.renderHourCards(result.today.hours, '今日 12 時辰');
      html += this._renderDivider();
      html += this.renderDayOverview(result.tomorrow.summary, '明日總覽');
      html += this.renderHourCards(result.tomorrow.hours, '明日 12 時辰');
      html += this._renderDivider();
      html += this.renderFourteenDays(result.fourteenDays);
      html += this._renderDivider();
      html += this.renderSystemExplanation();
      html += this.renderDisclaimer();

      this.container.innerHTML = html;
      this._bindEvents();

      this.container.classList.add('fade-in');
    } catch (error) {
      console.error('結果渲染錯誤:', error);
      this._renderError('渲染結果時發生錯誤，請稍後再試。');
    }
  }

  /**
   * 渲染個人基本盤摘要
   * @param {Object} baziResult - 八字推算結果
   * @returns {string} HTML 字串
   */
  renderPersonalSummary(baziResult) {
    if (!baziResult) {
      return this._renderEmptyCard('個人基本盤', '無法取得八字資料');
    }

    const pillars = [];
    if (baziResult.year) {
      pillars.push({ label: '年柱', value: baziResult.year.name || '-' });
    }
    if (baziResult.month) {
      pillars.push({ label: '月柱', value: baziResult.month.name || '-' });
    }
    if (baziResult.day) {
      pillars.push({ label: '日柱', value: baziResult.day.name || '-' });
    }
    if (baziResult.hour && !baziResult.hour.isUnknown) {
      pillars.push({ label: '時柱', value: baziResult.hour.name || '-' });
    } else {
      pillars.push({ label: '時柱', value: '未知', isUnknown: true });
    }

    const dayMaster = baziResult.dayMaster || {};
    const dayMasterName = dayMaster.stem || '-';
    const dayMasterLabel = dayMaster.label || '-';
    const dayMasterElement = this._getElementName(dayMaster.element);

    const tenGods = baziResult.tenGods || {};
    const hourTenGod = tenGods.hour ? tenGods.hour.name : null;

    const branchRelations = baziResult.branchRelations || {};
    const relationsSummary = branchRelations.summary || [];

    const birthNote = baziResult.birthInfo?.note || '';

    return `
      <div class="result-card bazi-summary">
        <h3 class="card-title">
          <span class="card-title-icon">命</span>
          個人基本盤
        </h3>
        <div class="bazi-pillars">
          ${pillars.map(p => `
            <div class="pillar-item ${p.isUnknown ? 'pillar-unknown' : ''}">
              <span class="pillar-label">${p.label}</span>
              <span class="pillar-value">${p.value}</span>
            </div>
          `).join('')}
        </div>
        <div class="bazi-master">
          <div class="master-info">
            <span class="master-label">日主</span>
            <span class="master-value">${dayMasterName}</span>
            <span class="master-element">${dayMasterElement}</span>
            <span class="master-type">（${dayMasterLabel}）</span>
          </div>
          ${hourTenGod ? `
            <div class="tengod-info">
              <span class="tengod-label">時柱十神</span>
              <span class="tengod-value">${hourTenGod}</span>
            </div>
          ` : ''}
        </div>
        ${relationsSummary.length > 0 ? `
          <div class="bazi-relations">
            <span class="relations-label">地支關係</span>
            <span class="relations-value">${relationsSummary.join('、')}</span>
          </div>
        ` : ''}
        ${birthNote ? `<p class="bazi-note">${this._escapeHtml(birthNote)}</p>` : ''}
      </div>
    `;
  }

  /**
   * 渲染今日/明日總覽
   * @param {Object} summary - 日總覽數據
   * @param {string} title - 標題（今日總覽/明日總覽）
   * @returns {string} HTML 字串
   */
  renderDayOverview(summary, title) {
    if (!summary) {
      return this._renderEmptyCard(title, '無法取得總覽資料');
    }

    const levelClass = this._getLevelClass(summary.level);

    return `
      <div class="result-card day-summary">
        <h3 class="card-title">
          <span class="card-title-icon">${title.includes('今') ? '今' : '明'}</span>
          ${this._escapeHtml(title)}
        </h3>
        <div class="day-info">
          <div class="day-date-row">
            <span class="day-date">${this._escapeHtml(summary.date)}</span>
            <span class="day-weekday">${this._escapeHtml(summary.weekday)}</span>
          </div>
          <div class="day-score-row">
            <span class="day-score ${levelClass}">${summary.averageScore}分</span>
            <span class="day-level ${levelClass}">${this._escapeHtml(summary.level)}</span>
          </div>
        </div>
        <div class="day-range">
          <span>最高 ${summary.maxScore} 分</span>
          <span class="range-divider">/</span>
          <span>最低 ${summary.minScore} 分</span>
        </div>
        ${summary.bestHours && summary.bestHours.length > 0 ? `
          <div class="day-best">
            <span class="best-label">最佳時辰</span>
            <span class="best-value">${summary.bestHours.map(h => this._escapeHtml(h)).join('、')}</span>
          </div>
        ` : ''}
        ${summary.riskHours && summary.riskHours.length > 0 ? `
          <div class="day-risk">
            <span class="risk-label">注意時辰</span>
            <span class="risk-value">${summary.riskHours.map(h => this._escapeHtml(h)).join('、')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染時辰卡片區塊
   * @param {Array} hoursData - 12 時辰數據陣列
   * @param {string} title - 區塊標題
   * @returns {string} HTML 字串
   */
  renderHourCards(hoursData, title) {
    if (!hoursData || !Array.isArray(hoursData) || hoursData.length === 0) {
      return this._renderEmptyCard(title, '無法取得時辰資料');
    }

    const cards = hoursData.map((hour, index) => this._renderSingleHourCard(hour, index)).join('');

    return `
      <div class="result-card hour-section">
        <h3 class="card-title">
          <span class="card-title-icon">時</span>
          ${this._escapeHtml(title)}
        </h3>
        <div class="hour-grid">
          ${cards}
        </div>
      </div>
    `;
  }

  /**
   * 渲染單個時辰卡片
   * @param {Object} hour - 時辰數據
   * @param {number} index - 索引
   * @returns {string} HTML 字串
   * @private
   */
  _renderSingleHourCard(hour, index) {
    if (!hour) return '';

    const levelClass = this._getLevelClass(hour.level);
    const cardId = `hour-${hour.date}-${hour.hourBranch}-${index}`;

    const suitableHtml = hour.suitable && hour.suitable.length > 0
      ? `<div class="hour-suitable">
           <span class="suitable-label">適合</span>
           <span class="suitable-value">${hour.suitable.slice(0, 3).map(s => this._escapeHtml(s)).join('、')}</span>
         </div>`
      : '';

    const avoidHtml = hour.avoid && hour.avoid.length > 0
      ? `<div class="hour-avoid">
           <span class="avoid-label">避免</span>
           <span class="avoid-value">${hour.avoid.slice(0, 3).map(a => this._escapeHtml(a)).join('、')}</span>
         </div>`
      : '';

    const adviceHtml = hour.advice
      ? `<p class="hour-advice">${this._escapeHtml(hour.advice)}</p>`
      : '';

    const detailHtml = this._renderHourDetail(hour);

    return `
      <div class="hour-card ${levelClass}" data-card-id="${cardId}">
        <div class="hour-header">
          <div class="hour-name-row">
            <span class="hour-name">${this._escapeHtml(hour.hourName)}</span>
            <span class="hour-time">${this._escapeHtml(hour.timeRange)}</span>
          </div>
          <div class="hour-score-row">
            <span class="hour-score">${hour.score}分</span>
            <span class="hour-level ${levelClass}">${this._escapeHtml(hour.level)}</span>
          </div>
        </div>
        <p class="hour-headline">${this._escapeHtml(hour.headline || '')}</p>
        ${suitableHtml}
        ${avoidHtml}
        ${adviceHtml}
        <button class="btn-toggle-detail" data-target="${cardId}-detail">
          <span class="toggle-text">展開詳細</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="hour-detail" id="${cardId}-detail" style="display:none;">
          ${detailHtml}
        </div>
      </div>
    `;
  }

  /**
   * 渲染時辰詳細資訊
   * @param {Object} hour - 時辰數據
   * @returns {string} HTML 字串
   * @private
   */
  _renderHourDetail(hour) {
    const systems = hour.systems || {};
    const trace = hour.trace || [];

    let html = '';

    if (systems.bazi) {
      html += `
        <div class="detail-section">
          <h4 class="detail-title">八字分析</h4>
          <div class="detail-items">
            <div class="detail-item">
              <span class="detail-label">時柱</span>
              <span class="detail-value">${this._escapeHtml(systems.bazi.hourGanzhi || '-')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">十神</span>
              <span class="detail-value">${this._escapeHtml(systems.bazi.tenGod || '-')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">分數</span>
              <span class="detail-value ${systems.bazi.score >= 0 ? 'score-positive' : 'score-negative'}">
                ${systems.bazi.score >= 0 ? '+' : ''}${systems.bazi.score}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    if (systems.iching) {
      html += `
        <div class="detail-section">
          <h4 class="detail-title">易經分析</h4>
          <div class="detail-items">
            <div class="detail-item">
              <span class="detail-label">卦象</span>
              <span class="detail-value">${this._escapeHtml(systems.iching.hexagram || '-')}</span>
            </div>
            ${systems.iching.changedHexagram ? `
              <div class="detail-item">
                <span class="detail-label">變卦</span>
                <span class="detail-value">${this._escapeHtml(systems.iching.changedHexagram)}</span>
              </div>
            ` : ''}
            ${systems.iching.movingLine ? `
              <div class="detail-item">
                <span class="detail-label">動爻</span>
                <span class="detail-value">第${systems.iching.movingLine}爻</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">分數</span>
              <span class="detail-value ${systems.iching.score >= 0 ? 'score-positive' : 'score-negative'}">
                ${systems.iching.score >= 0 ? '+' : ''}${systems.iching.score}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    if (systems.qimen) {
      const qimenInfo = [];
      if (systems.qimen.yinYangDun) qimenInfo.push(systems.qimen.yinYangDun);
      if (systems.qimen.ju) qimenInfo.push(`${systems.qimen.ju}局`);

      html += `
        <div class="detail-section">
          <h4 class="detail-title">奇門遁甲</h4>
          <div class="detail-items">
            ${qimenInfo.length > 0 ? `
              <div class="detail-item">
                <span class="detail-label">格局</span>
                <span class="detail-value">${qimenInfo.join(' ')}</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">八門</span>
              <span class="detail-value">${this._escapeHtml(systems.qimen.door || '-')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">九星</span>
              <span class="detail-value">${this._escapeHtml(systems.qimen.star || '-')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">分數</span>
              <span class="detail-value ${systems.qimen.score >= 0 ? 'score-positive' : 'score-negative'}">
                ${systems.qimen.score >= 0 ? '+' : ''}${systems.qimen.score}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    if (trace.length > 0) {
      html += `
        <div class="detail-section trace-section">
          <h4 class="detail-title">計分來源</h4>
          <div class="trace-list">
            ${trace.map(t => `
              <div class="trace-item">
                <span class="trace-system">[${this._escapeHtml(t.system)}]</span>
                <span class="trace-rule">${this._escapeHtml(t.rule)}</span>
                <span class="trace-value">${this._escapeHtml(t.value)}</span>
                <span class="trace-score ${t.score >= 0 ? 'score-positive' : 'score-negative'}">
                  （${t.score >= 0 ? '+' : ''}${t.score}）
                </span>
                <span class="trace-reason">${this._escapeHtml(t.reason || '')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return html;
  }

  /**
   * 渲染接下來 14 天概述
   * @param {Array} daysData - 14 天數據陣列
   * @returns {string} HTML 字串
   */
  renderFourteenDays(daysData) {
    if (!daysData || !Array.isArray(daysData) || daysData.length === 0) {
      return this._renderEmptyCard('接下來 14 天概述', '無法取得 14 天資料');
    }

    const cards = daysData.map(day => this._renderSingleDayCard(day)).join('');

    return `
      <div class="result-card fourteen-section">
        <h3 class="card-title">
          <span class="card-title-icon">週</span>
          接下來 14 天概述
        </h3>
        <div class="fourteen-grid">
          ${cards}
        </div>
      </div>
    `;
  }

  /**
   * 渲染單天概述卡片
   * @param {Object} day - 單天數據
   * @returns {string} HTML 字串
   * @private
   */
  _renderSingleDayCard(day) {
    if (!day) return '';

    const levelClass = this._getLevelClass(day.level);

    return `
      <div class="fourteen-card ${levelClass}">
        <div class="fourteen-header">
          <span class="fourteen-date">${this._escapeHtml(day.date)}</span>
          <span class="fourteen-weekday">${this._escapeHtml(day.weekday)}</span>
        </div>
        <div class="fourteen-score-row">
          <span class="fourteen-score">${day.score}分</span>
          <span class="fourteen-level ${levelClass}">${this._escapeHtml(day.level)}</span>
        </div>
        <p class="fourteen-theme">${this._escapeHtml(day.theme || '')}</p>
        ${day.bestHours && day.bestHours.length > 0 ? `
          <div class="fourteen-best">
            <span class="best-label">吉時</span>
            <span class="best-value">${day.bestHours.map(h => this._escapeHtml(h)).join('、')}</span>
          </div>
        ` : ''}
        ${day.riskHours && day.riskHours.length > 0 ? `
          <div class="fourteen-risk">
            <span class="risk-label">凶時</span>
            <span class="risk-value">${day.riskHours.map(h => this._escapeHtml(h)).join('、')}</span>
          </div>
        ` : ''}
        ${day.advice ? `
          <p class="fourteen-advice">${this._escapeHtml(day.advice)}</p>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染詳細系統說明
   * @returns {string} HTML 字串
   */
  renderSystemExplanation() {
    return `
      <div class="result-card system-explanation">
        <h3 class="card-title">
          <span class="card-title-icon">解</span>
          詳細系統說明
        </h3>
        <div class="explanation-content">
          <div class="explanation-section">
            <h4 class="explanation-title">推算系統</h4>
            <p>本工具綜合運用三大傳統命術系統進行時辰推算：</p>
            <ul class="explanation-list">
              <li>
                <strong>八字命理</strong>
                <span>以出生年月日時四柱干支為基礎，分析時柱十神與五行生剋關係。</span>
              </li>
              <li>
                <strong>易經六十四卦</strong>
                <span>依據日期干支與時辰推算卦象，結合變卦、互卦等分析趨勢。</span>
              </li>
              <li>
                <strong>奇門遁甲</strong>
                <span>以時家奇門規則排盤，分析八門、九星、八神等吉凶。</span>
              </li>
            </ul>
          </div>

          <div class="explanation-section">
            <h4 class="explanation-title">計分規則</h4>
            <p>每個時辰以 50 分為基準，依據各系統規則加減分：</p>
            <ul class="explanation-list">
              <li>八字影響：最多 ±25 分</li>
              <li>易經影響：最多 ±20 分</li>
              <li>奇門影響：最多 ±35 分</li>
              <li>最終分數限制在 0-100 分之間</li>
            </ul>
          </div>

          <div class="explanation-section">
            <h4 class="explanation-title">吉凶等級</h4>
            <div class="level-table">
              <div class="level-row">
                <span class="level-badge level-daji">大吉</span>
                <span class="level-range">85-100 分</span>
              </div>
              <div class="level-row">
                <span class="level-badge level-ji">吉</span>
                <span class="level-range">70-84 分</span>
              </div>
              <div class="level-row">
                <span class="level-badge level-xiaoji">小吉</span>
                <span class="level-range">55-69 分</span>
              </div>
              <div class="level-row">
                <span class="level-badge level-ping">平</span>
                <span class="level-range">45-54 分</span>
              </div>
              <div class="level-row">
                <span class="level-badge level-xiaoxiong">小凶</span>
                <span class="level-range">30-44 分</span>
              </div>
              <div class="level-row">
                <span class="level-badge level-xiong">凶</span>
                <span class="level-range">0-29 分</span>
              </div>
            </div>
          </div>

          <div class="explanation-section">
            <h4 class="explanation-title">已知限制</h4>
            <ul class="explanation-list limitation-list">
              <li>八字流派對子時換日可能不同</li>
              <li>月柱節氣切換規則尚需人工校驗</li>
              <li>奇門遁甲流派繁多，本系統採固定時家奇門規則</li>
              <li>命術結果屬民俗文化參考</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染免責聲明
   * @returns {string} HTML 字串
   */
  renderDisclaimer() {
    return `
      <div class="result-card disclaimer-card">
        <h3 class="card-title">
          <span class="card-title-icon">告</span>
          免責聲明
        </h3>
        <div class="disclaimer-content">
          <p class="disclaimer-text">
            本工具依傳統命術規則推算，內容屬民俗文化與個人參考，不作為醫療、法律、投資、婚姻或人生重大決策保證。
          </p>
          <p class="disclaimer-text">
            子時跨日規則依本系統設定，部分派別可能不同。月柱節氣切換規則尚需人工校驗。奇門遁甲存在流派差異，本系統採固定時家奇門規則。
          </p>
          <p class="disclaimer-text">
            本工具不儲存任何個人資料，所有資訊僅保存於您的本機瀏覽器中。若您選擇「記住我」，資料將僅存於本機 localStorage。
          </p>
        </div>
      </div>
    `;
  }

  /**
   * 渲染分隔線
   * @returns {string} HTML 字串
   * @private
   */
  _renderDivider() {
    return '<div class="divider-ornament"><span>◆</span></div>';
  }

  /**
   * 渲染空卡片
   * @param {string} title - 標題
   * @param {string} message - 訊息
   * @returns {string} HTML 字串
   * @private
   */
  _renderEmptyCard(title, message) {
    return `
      <div class="result-card empty-card">
        <h3 class="card-title">${this._escapeHtml(title)}</h3>
        <p class="empty-message">${this._escapeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * 渲染錯誤訊息
   * @param {string} message - 錯誤訊息
   * @private
   */
  _renderError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="result-card error-card">
        <h3 class="card-title">發生錯誤</h3>
        <p class="error-message">${this._escapeHtml(message)}</p>
        <button class="btn btn-secondary" onclick="location.reload()">重新載入</button>
      </div>
    `;
  }

  /**
   * 綁定所有事件監聽
   * @private
   */
  _bindEvents() {
    this._bindCardToggle();
    this._bindFourteenDayCards();
  }

  /**
   * 綁定時辰卡片展開/收起事件
   * @private
   */
  _bindCardToggle() {
    const toggleButtons = this.container.querySelectorAll('.btn-toggle-detail');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const detail = document.getElementById(targetId);

        if (detail) {
          const isVisible = detail.style.display !== 'none';
          detail.style.display = isVisible ? 'none' : 'block';
          btn.querySelector('.toggle-text').textContent = isVisible ? '展開詳細' : '收起詳細';
          btn.classList.toggle('expanded', !isVisible);

          if (!isVisible) {
            this.expandedCards.add(targetId);
          } else {
            this.expandedCards.delete(targetId);
          }
        }
      });
    });
  }

  /**
   * 綁定 14 天卡片點擊事件
   * @private
   */
  _bindFourteenDayCards() {
    const dayCards = this.container.querySelectorAll('.fourteen-card');
    dayCards.forEach(card => {
      const advice = card.querySelector('.fourteen-advice');
      if (advice) {
        advice.style.display = 'none';
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const isVisible = advice.style.display !== 'none';
          advice.style.display = isVisible ? 'none' : 'block';
          card.classList.toggle('expanded', !isVisible);
        });
      }
    });
  }

  /**
   * 取得吉凶等級對應的 CSS 類別
   * @param {string} level - 吉凶等級
   * @returns {string} CSS 類別
   * @private
   */
  _getLevelClass(level) {
    const levelMap = {
      '大吉': 'level-daji',
      '吉': 'level-ji',
      '小吉': 'level-xiaoji',
      '平': 'level-ping',
      '小凶': 'level-xiaoxiong',
      '凶': 'level-xiong'
    };
    return levelMap[level] || 'level-ping';
  }

  /**
   * 取得五行中文名稱
   * @param {string} element - 五行英文名稱
   * @returns {string} 五行中文名稱
   * @private
   */
  _getElementName(element) {
    const elementMap = {
      'wood': '木',
      'fire': '火',
      'earth': '土',
      'metal': '金',
      'water': '水'
    };
    return elementMap[element] || element || '-';
  }

  /**
   * HTML 轉義，防止 XSS
   * @param {string} text - 原始文字
   * @returns {string} 轉義後的文字
   * @private
   */
  _escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * 展開所有時辰卡片
   */
  expandAllCards() {
    const details = this.container.querySelectorAll('.hour-detail');
    const buttons = this.container.querySelectorAll('.btn-toggle-detail');

    details.forEach(detail => {
      detail.style.display = 'block';
    });

    buttons.forEach(btn => {
      btn.querySelector('.toggle-text').textContent = '收起詳細';
      btn.classList.add('expanded');
    });
  }

  /**
   * 收起所有時辰卡片
   */
  collapseAllCards() {
    const details = this.container.querySelectorAll('.hour-detail');
    const buttons = this.container.querySelectorAll('.btn-toggle-detail');

    details.forEach(detail => {
      detail.style.display = 'none';
    });

    buttons.forEach(btn => {
      btn.querySelector('.toggle-text').textContent = '展開詳細';
      btn.classList.remove('expanded');
    });

    this.expandedCards.clear();
  }

  /**
   * 取得當前結果數據
   * @returns {Object|null} 當前結果
   */
  getCurrentResult() {
    return this.currentResult;
  }

  /**
   * 清除渲染內容
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentResult = null;
    this.expandedCards.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResultRenderer;
}

if (typeof window !== 'undefined') {
  window.ResultRenderer = ResultRenderer;
}
