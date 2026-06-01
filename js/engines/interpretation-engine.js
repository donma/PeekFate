/**
 * 解釋引擎
 * 處理解釋相關計算，根據八字、易經、奇門結果生成事件、建議與警告
 * @version 1.0.0
 * @author FastFate
 */

class InterpretationEngine {
  /**
   * 最大可能事件數量
   * @type {number}
   */
  static MAX_EVENTS = 4;

  /**
   * 最大建議數量
   * @type {number}
   */
  static MAX_ADVICE = 3;

  /**
   * 最大警告數量
   * @type {number}
   */
  static MAX_WARNINGS = 3;

  /**
   * 風險等級映射
   * @type {Object}
   */
  static RISK_LEVELS = {
    low: ['正財', '正官', '正印', '食神', '比肩'],
    medium: ['偏財', '偏印', '傷官'],
    high: ['七殺', '劫財']
  };

  /**
   * 創建解釋引擎實例
   */
  constructor() {
    /** @type {Object|null} 事件模板數據 */
    this.eventTemplates = null;
    /** @type {Object|null} 建議模板數據 */
    this.adviceTemplates = null;
    /** @type {Object|null} 風險模板數據 */
    this.riskTemplates = null;
    /** @type {boolean} 數據是否已載入 */
    this.loaded = false;
    /** @type {string|null} 載入錯誤信息 */
    this.loadError = null;
  }

  /**
   * 載入 JSON 數據文件
   * @returns {Promise<boolean>} 是否載入成功
   */
  async loadData() {
    try {
      const [eventTemplates, adviceTemplates, riskTemplates] = await Promise.all([
        this._fetchJSON('data/interpretation/event-templates.json'),
        this._fetchJSON('data/interpretation/advice-templates.json'),
        this._fetchJSON('data/interpretation/risk-templates.json')
      ]);

      this.eventTemplates = eventTemplates;
      this.adviceTemplates = adviceTemplates;
      this.riskTemplates = riskTemplates;
      this.loaded = true;
      this.loadError = null;
      return true;
    } catch (error) {
      this.loadError = `解釋引擎數據載入失敗: ${error.message}`;
      console.error(this.loadError);
      this._loadFallbackData();
      return false;
    }
  }

  /**
   * 構建時辰解釋
   * 整合事件、建議、警告與系統摘要，生成完整的時辰解讀
   * @param {Object} context - 時辰上下文對象
   * @param {string} context.tenGod - 十神名稱
   * @param {string} context.door - 八門名稱
   * @param {string} context.star - 九星名稱
   * @param {string} context.god - 八神名稱
   * @param {string} context.hexagram - 卦象名稱
   * @param {number} context.score - 總分
   * @param {string} context.level - 吉凶等級
   * @param {Object} context.bazi - 八字結果
   * @param {Object} context.iching - 易經結果
   * @param {Object} context.qimen - 奇門結果
   * @returns {Object} 完整的時辰解釋
   * @throws {Error} 參數無效時拋出錯誤
   */
  buildHourReading(context) {
    this._ensureLoaded();

    if (!context || typeof context !== 'object') {
      throw new Error('無效的時辰上下文對象');
    }

    const riskLevel = this._assessRiskLevel(context);
    const enrichedContext = { ...context, risk: riskLevel };

    const possibleEvents = this.selectPossibleEvents(enrichedContext);
    const advice = this.selectAdvice(enrichedContext);
    const warnings = this.selectWarnings(enrichedContext);
    const systemSummaries = this.mergeSystemSummaries(
      context.bazi,
      context.iching,
      context.qimen
    );

    const headline = this._generateHeadline(enrichedContext, possibleEvents);

    return {
      headline,
      possibleEvents,
      suitable: this._extractSuitable(advice),
      avoid: this._extractAvoid(advice, warnings),
      advice: this._formatAdviceText(advice),
      warnings,
      riskLevel,
      systemSummaries
    };
  }

  /**
   * 合併系統摘要
   * 將八字、易經、奇門三個系統的摘要整合
   * @param {Object} bazi - 八字計算結果
   * @param {Object} iching - 易經計算結果
   * @param {Object} qimen - 奇門計算結果
   * @returns {Object} 合併後的系統摘要
   */
  mergeSystemSummaries(bazi, iching, qimen) {
    const summaries = {
      bazi: null,
      iching: null,
      qimen: null,
      combined: ''
    };

    if (bazi) {
      summaries.bazi = this._buildBaziSummary(bazi);
    }

    if (iching) {
      summaries.iching = this._buildIchingSummary(iching);
    }

    if (qimen) {
      summaries.qimen = this._buildQimenSummary(qimen);
    }

    summaries.combined = this._combineSummaries(summaries);

    return summaries;
  }

  /**
   * 選擇可能事件
   * 根據上下文條件匹配事件模板
   * @param {Object} context - 時辰上下文對象
   * @returns {Array<string>} 可能事件列表
   */
  selectPossibleEvents(context) {
    this._ensureLoaded();

    if (!this.eventTemplates) return [];

    const matchedEvents = [];
    const categories = [
      'wealthEvents',
      'careerEvents',
      'relationshipEvents',
      'healthEvents',
      'travelEvents',
      'generalEvents'
    ];

    for (const category of categories) {
      const templates = this.eventTemplates[category];
      if (!templates) continue;

      for (const [, template] of Object.entries(templates)) {
        if (this._matchConditions(template.conditions, context)) {
          matchedEvents.push(...template.events);
        }
      }
    }

    return this._shuffleAndLimit(matchedEvents, InterpretationEngine.MAX_EVENTS);
  }

  /**
   * 選擇建議
   * 根據上下文條件匹配建議模板
   * @param {Object} context - 時辰上下文對象
   * @returns {Array<Object>} 建議列表
   */
  selectAdvice(context) {
    this._ensureLoaded();

    if (!this.adviceTemplates) return [];

    const matchedAdvice = [];
    const categories = [
      'wealthAdvice',
      'careerAdvice',
      'relationshipAdvice',
      'healthAdvice',
      'travelAdvice',
      'generalAdvice'
    ];

    for (const category of categories) {
      const templates = this.adviceTemplates[category];
      if (!templates) continue;

      for (const [key, template] of Object.entries(templates)) {
        if (this._matchConditions(template.conditions, context)) {
          matchedAdvice.push({
            key,
            category,
            advice: template.advice,
            positive: template.positive,
            negative: template.negative
          });
        }
      }
    }

    return this._prioritizeAndLimit(matchedAdvice, InterpretationEngine.MAX_ADVICE);
  }

  /**
   * 選擇警告
   * 根據上下文條件匹配風險模板
   * @param {Object} context - 時辰上下文對象
   * @returns {Array<Object>} 警告列表
   */
  selectWarnings(context) {
    this._ensureLoaded();

    if (!this.riskTemplates) return [];

    const matchedWarnings = [];
    const categories = [
      'wealthRisks',
      'careerRisks',
      'relationshipRisks',
      'healthRisks',
      'travelRisks',
      'generalRisks'
    ];

    for (const category of categories) {
      const templates = this.riskTemplates[category];
      if (!templates) continue;

      for (const [, template] of Object.entries(templates)) {
        if (this._matchConditions(template.conditions, context)) {
          matchedWarnings.push({
            category,
            warning: template.warning,
            prevention: template.prevention || []
          });
        }
      }
    }

    return this._prioritizeAndLimit(matchedWarnings, InterpretationEngine.MAX_WARNINGS);
  }

  /**
   * 檢查數據是否已載入
   * @returns {boolean} 是否已載入
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * 獲取載入錯誤信息
   * @returns {string|null} 錯誤信息
   */
  getLoadError() {
    return this.loadError;
  }

  // ==================== 私有方法 ====================

  /**
   * 確保數據已載入
   * @private
   * @throws {Error} 數據未載入時拋出錯誤
   */
  _ensureLoaded() {
    if (!this.loaded && !this.loadError) {
      this._loadFallbackData();
    }
  }

  /**
   * 載入備用數據（同步）
   * @private
   */
  _loadFallbackData() {
    this.eventTemplates = {
      generalEvents: {
        general_lucky: {
          conditions: ['tenGod:正官', 'star:天禽', 'door:開門'],
          events: ['整體運勢順利，容易遇到好事情。']
        }
      }
    };
    this.adviceTemplates = {
      generalAdvice: {
        positive_period: {
          conditions: ['risk:low'],
          advice: '運勢良好，適合積極行動。',
          positive: '適合主動出擊。',
          negative: '避免驕傲自滿。'
        }
      }
    };
    this.riskTemplates = {
      generalRisks: {
        general_warning: {
          conditions: ['tenGod:七殺', 'door:驚門'],
          warning: '需謹慎行事，避免衝動。',
          prevention: ['保持冷靜', '避免衝突']
        }
      }
    };
    this.loaded = true;
  }

  /**
   * 獲取 JSON 數據
   * @private
   * @param {string} url - JSON 文件路徑
   * @returns {Promise<Object>} 解析後的 JSON 對象
   */
  async _fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 評估風險等級
   * @private
   * @param {Object} context - 時辰上下文對象
   * @returns {string} 風險等級 (low/medium/high)
   */
  _assessRiskLevel(context) {
    const tenGod = context.tenGod || '';
    const door = context.door || '';
    const star = context.star || '';

    const negativeDoors = ['死門', '驚門', '傷門'];
    const negativeStars = ['天蓬', '天芮', '天柱'];

    let riskScore = 0;

    if (InterpretationEngine.RISK_LEVELS.high.includes(tenGod)) {
      riskScore += 2;
    } else if (InterpretationEngine.RISK_LEVELS.medium.includes(tenGod)) {
      riskScore += 1;
    }

    if (negativeDoors.includes(door)) {
      riskScore += 2;
    }

    if (negativeStars.includes(star)) {
      riskScore += 1;
    }

    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  /**
   * 匹配條件
   * @private
   * @param {Array<string>} conditions - 條件列表
   * @param {Object} context - 上下文對象
   * @returns {boolean} 是否匹配
   */
  _matchConditions(conditions, context) {
    if (!conditions || !Array.isArray(conditions)) return false;

    return conditions.every(condition => {
      const [key, value] = condition.split(':');

      switch (key) {
        case 'tenGod':
          return context.tenGod === value;
        case 'door':
          return context.door === value;
        case 'star':
          return context.star === value;
        case 'god':
          return context.god === value;
        case 'risk':
          if (value === 'not_high') return context.risk !== 'high';
          return context.risk === value;
        case 'gender':
          return context.gender === value;
        default:
          return false;
      }
    });
  }

  /**
   * 生成標題
   * @private
   * @param {Object} context - 上下文對象
   * @param {Array<string>} events - 事件列表
   * @returns {string} 標題文本
   */
  _generateHeadline(context, events) {
    if (events.length > 0) {
      return events[0];
    }

    const score = context.score || 50;
    const level = context.level || '平';

    const headlines = {
      '大吉': '諸事順遂，大吉大利',
      '吉': '順利吉祥，宜積極行動',
      '小吉': '較為順利，可適度進取',
      '平': '平穩無波，維持現狀為宜',
      '小凶': '略有阻礙，謹慎行事',
      '凶': '諸事不順，宜靜不宜動'
    };

    return headlines[level] || '平穩無波，維持現狀為宜';
  }

  /**
   * 提取適合事項
   * @private
   * @param {Array<Object>} adviceList - 建議列表
   * @returns {Array<string>} 適合事項列表
   */
  _extractSuitable(adviceList) {
    const suitable = [];

    for (const advice of adviceList) {
      if (advice.positive) {
        suitable.push(advice.positive);
      }
    }

    return suitable.slice(0, InterpretationEngine.MAX_ADVICE);
  }

  /**
   * 提取避免事項
   * @private
   * @param {Array<Object>} adviceList - 建議列表
   * @param {Array<Object>} warnings - 警告列表
   * @returns {Array<string>} 避免事項列表
   */
  _extractAvoid(adviceList, warnings) {
    const avoid = [];

    for (const advice of adviceList) {
      if (advice.negative) {
        avoid.push(advice.negative);
      }
    }

    for (const warning of warnings) {
      if (warning.prevention && warning.prevention.length > 0) {
        avoid.push(...warning.prevention.slice(0, 2));
      }
    }

    return [...new Set(avoid)].slice(0, InterpretationEngine.MAX_ADVICE);
  }

  /**
   * 格式化建議文本
   * @private
   * @param {Array<Object>} adviceList - 建議列表
   * @returns {string} 格式化後的建議文本
   */
  _formatAdviceText(adviceList) {
    if (adviceList.length === 0) {
      return '保持平常心，按部就班行事。';
    }

    return adviceList
      .map(a => a.advice)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ');
  }

  /**
   * 隨機選擇並限制數量
   * @private
   * @param {Array} items - 項目列表
   * @param {number} max - 最大數量
   * @returns {Array} 限制後的列表
   */
  _shuffleAndLimit(items, max) {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, max);
  }

  /**
   * 按優先級排序並限制數量
   * @private
   * @param {Array} items - 項目列表
   * @param {number} max - 最大數量
   * @returns {Array} 限制後的列表
   */
  _prioritizeAndLimit(items, max) {
    return items.slice(0, max);
  }

  /**
   * 構建八字摘要
   * @private
   * @param {Object} bazi - 八字結果
   * @returns {Object} 八字摘要
   */
  _buildBaziSummary(bazi) {
    if (!bazi) return null;

    const summary = {
      system: '八字',
      pillars: {},
      tenGod: null,
      dayMaster: null,
      note: ''
    };

    if (bazi.year) {
      summary.pillars.year = `${bazi.year.stem}${bazi.year.branch}`;
    }
    if (bazi.month) {
      summary.pillars.month = `${bazi.month.stem}${bazi.month.branch}`;
    }
    if (bazi.day) {
      summary.pillars.day = `${bazi.day.stem}${bazi.day.branch}`;
      summary.dayMaster = bazi.day.stem;
    }
    if (bazi.hour && !bazi.hour.isUnknown) {
      summary.pillars.hour = `${bazi.hour.stem}${bazi.hour.branch}`;
    } else {
      summary.note = '未輸入出生時間，時柱為估算';
    }

    if (bazi.tenGods && bazi.tenGods.hour) {
      summary.tenGod = bazi.tenGods.hour.name;
    }

    return summary;
  }

  /**
   * 構建易經摘要
   * @private
   * @param {Object} iching - 易經結果
   * @returns {Object} 易經摘要
   */
  _buildIchingSummary(iching) {
    if (!iching) return null;

    const summary = {
      system: '易經',
      hexagram: null,
      changedHexagram: null,
      keywords: []
    };

    if (iching.hexagram) {
      summary.hexagram = {
        name: iching.hexagram.name,
        judgment: iching.hexagram.judgment
      };
      summary.keywords = iching.hexagram.keywords || [];
    }

    if (iching.changedHexagram) {
      summary.changedHexagram = {
        name: iching.changedHexagram.name
      };
    }

    return summary;
  }

  /**
   * 構建奇門摘要
   * @private
   * @param {Object} qimen - 奇門結果
   * @returns {Object} 奇門摘要
   */
  _buildQimenSummary(qimen) {
    if (!qimen) return null;

    const summary = {
      system: '奇門遁甲',
      yinYangDun: qimen.yinYangDun,
      ju: qimen.ju,
      door: null,
      star: null,
      god: null,
      patterns: []
    };

    if (qimen.door) {
      summary.door = qimen.door.name || qimen.door;
    }

    if (qimen.star) {
      summary.star = qimen.star.name || qimen.star;
    }

    if (qimen.god) {
      summary.god = qimen.god.name || qimen.god;
    }

    if (qimen.patterns && Array.isArray(qimen.patterns)) {
      summary.patterns = qimen.patterns;
    }

    return summary;
  }

  /**
   * 合併摘要文本
   * @private
   * @param {Object} summaries - 系統摘要對象
   * @returns {string} 合併後的摘要文本
   */
  _combineSummaries(summaries) {
    const parts = [];

    if (summaries.bazi) {
      const pillars = Object.values(summaries.bazi.pillars).join(' ');
      parts.push(`八字：${pillars}`);
      if (summaries.bazi.tenGod) {
        parts.push(`時柱十神為${summaries.bazi.tenGod}`);
      }
    }

    if (summaries.iching && summaries.iching.hexagram) {
      parts.push(`易經：${summaries.iching.hexagram.name}`);
    }

    if (summaries.qimen) {
      const qimenParts = [];
      if (summaries.qimen.door) qimenParts.push(summaries.qimen.door);
      if (summaries.qimen.star) qimenParts.push(summaries.qimen.star);
      if (summaries.qimen.god) qimenParts.push(summaries.qimen.god);
      if (qimenParts.length > 0) {
        parts.push(`奇門：${qimenParts.join('、')}`);
      }
    }

    return parts.join('。') + '。';
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterpretationEngine;
}

// 瀏覽器環境全局導出
if (typeof window !== 'undefined') {
  window.InterpretationEngine = InterpretationEngine;
}

