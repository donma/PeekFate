/**
 * 計分引擎
 * 處理計分相關計算，包含八字、易經、奇門、平衡分數計算
 * @version 1.0.0
 * @author FastFate
 */

class ScoringEngine {
  /**
   * 基礎分數
   * @type {number}
   */
  static BASE_SCORE = 60;

  /**
   * 分數範圍限制
   * @type {Object}
   */
  static SCORE_LIMITS = {
    min: 0,
    max: 100,
    bazi: { max: 25, min: -25 },
    iching: { max: 20, min: -20 },
    qimen: { max: 35, min: -35 },
    balance: { max: 10, min: -10 }
  };

  /**
   * 創建計分引擎實例
   */
  constructor() {
    /** @type {Object|null} 計分規則數據 */
    this.scoreRules = null;
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
      const scoreRules = await this._fetchJSON('../../data/interpretation/score-rules.json');
      this.scoreRules = scoreRules;
      this.loaded = true;
      this.loadError = null;
      return true;
    } catch (error) {
      this.loadError = `計分引擎數據載入失敗: ${error.message}`;
      console.error(this.loadError);
      this._loadFallbackData();
      return false;
    }
  }

  /**
   * 計算總分
   * 基礎分50分 + 八字分(±25) + 易經分(±20) + 奇門分(±35) + 平衡分(±10)
   * @param {number} baziScore - 八字分數 (-25 ~ 25)
   * @param {number} ichingScore - 易經分數 (-20 ~ 20)
   * @param {number} qimenScore - 奇門分數 (-35 ~ 35)
   * @param {number} balanceScore - 平衡分數 (-10 ~ 10)
   * @returns {Object} { totalScore, level, color, description, breakdown }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateTotalScore(15, 10, 20, 5)
   * // => { totalScore: 100, level: '大吉', color: '#2F7D32', ... }
   */
  calculateTotalScore(baziScore, ichingScore, qimenScore, balanceScore) {
    this._ensureLoaded();

    const validatedBazi = this._clampScore(baziScore, ScoringEngine.SCORE_LIMITS.bazi.min, ScoringEngine.SCORE_LIMITS.bazi.max);
    const validatedIching = this._clampScore(ichingScore, ScoringEngine.SCORE_LIMITS.iching.min, ScoringEngine.SCORE_LIMITS.iching.max);
    const validatedQimen = this._clampScore(qimenScore, ScoringEngine.SCORE_LIMITS.qimen.min, ScoringEngine.SCORE_LIMITS.qimen.max);
    const validatedBalance = this._clampScore(balanceScore, ScoringEngine.SCORE_LIMITS.balance.min, ScoringEngine.SCORE_LIMITS.balance.max);

    const rawTotal = ScoringEngine.BASE_SCORE + validatedBazi + validatedIching + validatedQimen + validatedBalance;
    const totalScore = this._clampScore(rawTotal, ScoringEngine.SCORE_LIMITS.min, ScoringEngine.SCORE_LIMITS.max);

    const levelInfo = this.getScoreLevel(totalScore);

    return {
      totalScore: Math.round(totalScore),
      level: levelInfo.level,
      color: levelInfo.color,
      description: levelInfo.description,
      breakdown: {
        baseScore: ScoringEngine.BASE_SCORE,
        baziScore: validatedBazi,
        ichingScore: validatedIching,
        qimenScore: validatedQimen,
        balanceScore: validatedBalance
      }
    };
  }

  /**
   * 計算八字分數
   * 基於十神、大運、納音等因素計算
   * @param {Object} baziResult - 八字計算結果
   * @returns {Object} { score, details, maxPositive, maxNegative }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateBaziScore(baziResult)
   * // => { score: 15, details: {...}, maxPositive: 25, maxNegative: -25 }
   */
  calculateBaziScore(baziResult) {
    this._ensureLoaded();

    if (!baziResult || typeof baziResult !== 'object') {
      throw new Error('無效的八字結果對象');
    }

    const rules = this.scoreRules.baziScores;
    let totalScore = 0;
    const details = {
      tenGodsScore: 0,
      dayunScore: 0,
      nayinScore: 0,
      breakdown: []
    };

    // 十神計分
    if (baziResult.tenGods) {
      for (const [position, tenGod] of Object.entries(baziResult.tenGods)) {
        if (tenGod && tenGod.name && rules.tenGods[tenGod.name] !== undefined) {
          const godScore = rules.tenGods[tenGod.name];
          details.tenGodsScore += godScore;
          details.breakdown.push({
            type: 'tenGod',
            position,
            name: tenGod.name,
            score: godScore
          });
        }
      }
    }

    // 大運加分（如有）
    if (baziResult.dayun) {
      const dayunScore = baziResult.dayun.isFavorable ? rules.dayunBonus.favorable : rules.dayunBonus.unfavorable;
      details.dayunScore = dayunScore;
      details.breakdown.push({
        type: 'dayun',
        isFavorable: baziResult.dayun.isFavorable,
        score: dayunScore
      });
    }

    // 納音加分
    if (baziResult.nayinMatch !== undefined) {
      const nayinScore = baziResult.nayinMatch ? rules.nayinBonus.match : rules.nayinBonus.conflict;
      details.nayinScore = nayinScore;
      details.breakdown.push({
        type: 'nayin',
        match: baziResult.nayinMatch,
        score: nayinScore
      });
    }

    totalScore = details.tenGodsScore + details.dayunScore + details.nayinScore;
    totalScore = this._clampScore(totalScore, rules.maxNegative, rules.maxPositive);

    return {
      score: Math.round(totalScore),
      details,
      maxPositive: rules.maxPositive,
      maxNegative: rules.maxNegative
    };
  }

  /**
   * 計算易經分數
   * 基於卦象、爻變等因素計算
   * @param {Object} hexagramResult - 易經計算結果
   * @returns {Object} { score, details, maxPositive, maxNegative }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateIchingScore(hexagramResult)
   * // => { score: 10, details: {...}, maxPositive: 20, maxNegative: -20 }
   */
  calculateIchingScore(hexagramResult) {
    this._ensureLoaded();

    if (!hexagramResult || typeof hexagramResult !== 'object') {
      throw new Error('無效的易經結果對象');
    }

    const rules = this.scoreRules.ichingScores;
    let totalScore = 0;
    const details = {
      hexagramScore: 0,
      yaoChangeScore: 0,
      breakdown: []
    };

    // 卦象計分
    if (hexagramResult.hexagram && hexagramResult.hexagram.name) {
      const hexagramName = hexagramResult.hexagram.name;
      if (rules.hexagram[hexagramName] !== undefined) {
        details.hexagramScore = rules.hexagram[hexagramName];
        details.breakdown.push({
          type: 'hexagram',
          name: hexagramName,
          score: details.hexagramScore
        });
      }
    }

    // 爻變計分
    if (hexagramResult.yaoChanges && Array.isArray(hexagramResult.yaoChanges)) {
      hexagramResult.yaoChanges.forEach(change => {
        const changeScore = change.isPositive ? rules.yaoChange.positive : rules.yaoChange.negative;
        details.yaoChangeScore += changeScore;
        details.breakdown.push({
          type: 'yaoChange',
          line: change.line,
          isPositive: change.isPositive,
          score: changeScore
        });
      });
    }

    totalScore = details.hexagramScore + details.yaoChangeScore;
    totalScore = this._clampScore(totalScore, rules.maxNegative, rules.maxPositive);

    return {
      score: Math.round(totalScore),
      details,
      maxPositive: rules.maxPositive,
      maxNegative: rules.maxNegative
    };
  }

  /**
   * 計算奇門分數
   * 基於八門、九星、八神、宮位等因素計算
   * @param {Object} qimenResult - 奇門計算結果
   * @returns {Object} { score, details, maxPositive, maxNegative }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateQimenScore(qimenResult)
   * // => { score: 20, details: {...}, maxPositive: 35, maxNegative: -35 }
   */
  calculateQimenScore(qimenResult) {
    this._ensureLoaded();

    if (!qimenResult || typeof qimenResult !== 'object') {
      throw new Error('無效的奇門結果對象');
    }

    const rules = this.scoreRules.qimenScores;
    let totalScore = 0;
    const details = {
      doorScore: 0,
      starScore: 0,
      godScore: 0,
      palaceScore: 0,
      breakdown: []
    };

    // 八門計分
    if (qimenResult.door && qimenResult.door.name) {
      if (rules.doors[qimenResult.door.name] !== undefined) {
        details.doorScore = rules.doors[qimenResult.door.name];
        details.breakdown.push({
          type: 'door',
          name: qimenResult.door.name,
          score: details.doorScore
        });
      }
    }

    // 九星計分
    if (qimenResult.star && qimenResult.star.name) {
      if (rules.stars[qimenResult.star.name] !== undefined) {
        details.starScore = rules.stars[qimenResult.star.name];
        details.breakdown.push({
          type: 'star',
          name: qimenResult.star.name,
          score: details.starScore
        });
      }
    }

    // 八神計分
    if (qimenResult.god && qimenResult.god.name) {
      if (rules.gods[qimenResult.god.name] !== undefined) {
        details.godScore = rules.gods[qimenResult.god.name];
        details.breakdown.push({
          type: 'god',
          name: qimenResult.god.name,
          score: details.godScore
        });
      }
    }

    // 宮位關係計分
    if (qimenResult.palaceRelation) {
      const palaceScore = qimenResult.palaceRelation.isMatch ? rules.palaceRelation.match : rules.palaceRelation.conflict;
      details.palaceScore = palaceScore;
      details.breakdown.push({
        type: 'palaceRelation',
        isMatch: qimenResult.palaceRelation.isMatch,
        score: palaceScore
      });
    }

    totalScore = details.doorScore + details.starScore + details.godScore + details.palaceScore;
    totalScore = this._clampScore(totalScore, rules.maxNegative, rules.maxPositive);

    return {
      score: Math.round(totalScore),
      details,
      maxPositive: rules.maxPositive,
      maxNegative: rules.maxNegative
    };
  }

  /**
   * 計算平衡分數
   * 基於五行平衡、陰陽平衡等因素計算
   * @param {Object} baziResult - 八字計算結果
   * @param {Object} ichingResult - 易經計算結果
   * @param {Object} qimenResult - 奇門計算結果
   * @returns {Object} { score, details, maxPositive, maxNegative }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateBalanceScore(baziResult, ichingResult, qimenResult)
   * // => { score: 5, details: {...}, maxPositive: 10, maxNegative: -10 }
   */
  calculateBalanceScore(baziResult, ichingResult, qimenResult) {
    this._ensureLoaded();

    const rules = this.scoreRules.balanceScores;
    let totalScore = 0;
    const details = {
      fiveElementsScore: 0,
      yinyangScore: 0,
      breakdown: []
    };

    // 五行平衡計分
    const elementBalance = this._analyzeFiveElementsBalance(baziResult, ichingResult, qimenResult);
    if (elementBalance) {
      for (const [element, status] of Object.entries(elementBalance)) {
        if (rules.fiveElements[element] && rules.fiveElements[element][status] !== undefined) {
          const elementScore = rules.fiveElements[element][status];
          details.fiveElementsScore += elementScore;
          details.breakdown.push({
            type: 'fiveElements',
            element,
            status,
            score: elementScore
          });
        }
      }
    }

    // 陰陽平衡計分
    const yinyangBalance = this._analyzeYinyangBalance(baziResult);
    if (yinyangBalance && rules.yinyangBalance[yinyangBalance] !== undefined) {
      details.yinyangScore = rules.yinyangBalance[yinyangBalance];
      details.breakdown.push({
        type: 'yinyang',
        status: yinyangBalance,
        score: details.yinyangScore
      });
    }

    totalScore = details.fiveElementsScore + details.yinyangScore;
    totalScore = this._clampScore(totalScore, rules.maxNegative, rules.maxPositive);

    return {
      score: Math.round(totalScore),
      details,
      maxPositive: rules.maxPositive,
      maxNegative: rules.maxNegative
    };
  }

  /**
   * 獲取吉凶等級
   * @param {number} score - 分數 (0-100)
   * @returns {Object} { level, color, description, min, max }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.getScoreLevel(85)
   * // => { level: '大吉', color: '#2F7D32', description: '諸事順遂，大吉大利', ... }
   */
  getScoreLevel(score) {
    this._ensureLoaded();

    const validatedScore = this._clampScore(score, ScoringEngine.SCORE_LIMITS.min, ScoringEngine.SCORE_LIMITS.max);
    const scoreRanges = this.scoreRules.scoreRanges;

    for (const [level, range] of Object.entries(scoreRanges)) {
      if (validatedScore >= range.min && validatedScore <= range.max) {
        return {
          level,
          color: range.color,
          description: range.description,
          min: range.min,
          max: range.max
        };
      }
    }

    // 默認返回平
    return {
      level: '平',
      color: '#9A6A1F',
      description: '平穩無波，維持現狀為宜',
      min: 45,
      max: 54
    };
  }

  /**
   * 獲取分數顏色
   * @param {number} score - 分數 (0-100)
   * @returns {string} 顏色代碼
   * @example
   * engine.getScoreColor(85) // => '#2F7D32'
   */
  getScoreColor(score) {
    const levelInfo = this.getScoreLevel(score);
    return levelInfo.color;
  }

  /**
   * 獲取所有分數等級信息
   * @returns {Object} 所有等級配置
   */
  getAllScoreLevels() {
    this._ensureLoaded();
    return this.scoreRules ? this.scoreRules.scoreRanges : {};
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
    this.scoreRules = {
      baseScore: 60,
      baziScores: {
        maxPositive: 25,
        maxNegative: -25,
        tenGods: {
          '正官': 10, '七殺': -4, '正財': 10, '偏財': 8,
          '食神': 8, '傷官': -2, '正印': 7, '偏印': 4,
          '比肩': 3, '劫財': -1
        },
        dayunBonus: { favorable: 5, unfavorable: -5 },
        nayinBonus: { match: 3, conflict: -3 }
      },
      ichingScores: {
        maxPositive: 20,
        maxNegative: -20,
        hexagram: {
          '乾': 12, '坤': 10, '屯': 4, '蒙': 0, '需': 8, '訟': -4,
          '師': 6, '比': 7, '小畜': 5, '履': 6, '泰': 12, '否': -8,
          '同人': 9, '大有': 10, '謙': 8, '豫': 7, '隨': 6, '蠱': -2,
          '臨': 8, '觀': 7, '噬嗑': 4, '賁': 5, '剝': -6, '復': 9,
          '无妄': 7, '大畜': 8, '頤': 6, '大過': -3, '坎': -5, '離': 8,
          '咸': 10, '恒': 7, '遯': -1, '大壯': 8, '晉': 9, '明夷': -4,
          '家人': 7, '睽': -1, '蹇': -3, '解': 6, '損': -2, '益': 8,
          '夬': 5, '姤': 0, '萃': 7, '升': 8, '困': -5, '井': 5,
          '革': 6, '鼎': 7, '震': 4, '艮': 0, '漸': 7, '歸妹': -1,
          '豐': 9, '旅': 4, '巽': 5, '兌': 7, '渙': 1, '節': 6,
          '中孚': 8, '小過': -1, '既濟': 10, '未濟': 0
        },
        yaoChange: { positive: 3, negative: -3 }
      },
      qimenScores: {
        maxPositive: 35,
        maxNegative: -35,
        doors: {
          '開門': 12, '休門': 10, '生門': 11, '傷門': -5,
          '杜門': -3, '景門': 5, '死門': -8, '驚門': -4
        },
        stars: {
          '天蓬': -4, '天芮': -3, '天沖': 6, '天輔': 9,
          '天禽': 8, '天心': 10, '天柱': -1, '天任': 7, '天英': 4
        },
        gods: {
          '值符': 10, '騰蛇': -2, '太陰': 7, '六合': 8,
          '白虎': -5, '玄武': -3, '九地': 5, '九天': 6
        },
        palaceRelation: { match: 5, conflict: -5 }
      },
      balanceScores: {
        maxPositive: 10,
        maxNegative: -10,
        fiveElements: {
          wood: { excess: -4, balanced: 3, deficient: -2 },
          fire: { excess: -4, balanced: 3, deficient: -2 },
          earth: { excess: -4, balanced: 3, deficient: -2 },
          metal: { excess: -4, balanced: 3, deficient: -2 },
          water: { excess: -4, balanced: 3, deficient: -2 }
        },
        yinyangBalance: {
          balanced: 5,
          slightImbalance: -2,
          severeImbalance: -6
        }
      },
      scoreRanges: {
        '大吉': { min: 85, max: 100, color: '#2F7D32', description: '諸事順遂，大吉大利' },
        '吉': { min: 70, max: 84, color: '#2F7D32', description: '順利吉祥，宜積極行動' },
        '小吉': { min: 55, max: 69, color: '#2F7D32', description: '較為順利，可適度進取' },
        '平': { min: 45, max: 54, color: '#9A6A1F', description: '平穩無波，維持現狀為宜' },
        '小凶': { min: 30, max: 44, color: '#A32828', description: '略有阻礙，謹慎行事' },
        '凶': { min: 0, max: 29, color: '#A32828', description: '諸事不順，宜靜不宜動' }
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
   * 限制分數在指定範圍內
   * @private
   * @param {number} score - 原始分數
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 限制後的分數
   */
  _clampScore(score, min, max) {
    if (typeof score !== 'number' || isNaN(score)) {
      return 0;
    }
    return Math.min(Math.max(score, min), max);
  }

  /**
   * 分析五行平衡狀態
   * @private
   * @param {Object} baziResult - 八字結果
   * @param {Object} ichingResult - 易經結果
   * @param {Object} qimenResult - 奇門結果
   * @returns {Object|null} 五行平衡狀態
   */
  _analyzeFiveElementsBalance(baziResult, ichingResult, qimenResult) {
    if (!baziResult) return null;

    const elementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const elementMap = {
      '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
      '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
      '壬': 'water', '癸': 'water',
      '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
      '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
      '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
    };

    // 統計八字中的五行
    if (baziResult.year) {
      if (elementMap[baziResult.year.stem]) elementCount[elementMap[baziResult.year.stem]]++;
      if (elementMap[baziResult.year.branch]) elementCount[elementMap[baziResult.year.branch]]++;
    }
    if (baziResult.month) {
      if (elementMap[baziResult.month.stem]) elementCount[elementMap[baziResult.month.stem]]++;
      if (elementMap[baziResult.month.branch]) elementCount[elementMap[baziResult.month.branch]]++;
    }
    if (baziResult.day) {
      if (elementMap[baziResult.day.stem]) elementCount[elementMap[baziResult.day.stem]]++;
      if (elementMap[baziResult.day.branch]) elementCount[elementMap[baziResult.day.branch]]++;
    }
    if (baziResult.hour && !baziResult.hour.isUnknown) {
      if (elementMap[baziResult.hour.stem]) elementCount[elementMap[baziResult.hour.stem]]++;
      if (elementMap[baziResult.hour.branch]) elementCount[elementMap[baziResult.hour.branch]]++;
    }

    // 判斷每個五行的狀態
    const result = {};
    const totalCount = Object.values(elementCount).reduce((sum, count) => sum + count, 0);
    const avgCount = totalCount / 5;

    for (const [element, count] of Object.entries(elementCount)) {
      if (count === 0) {
        result[element] = 'deficient';
      } else if (count > avgCount * 1.5) {
        result[element] = 'excess';
      } else {
        result[element] = 'balanced';
      }
    }

    return result;
  }

  /**
   * 分析陰陽平衡狀態
   * @private
   * @param {Object} baziResult - 八字結果
   * @returns {string|null} 陰陽平衡狀態
   */
  _analyzeYinyangBalance(baziResult) {
    if (!baziResult) return null;

    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    let yangCount = 0;
    let totalCount = 0;

    const pillars = ['year', 'month', 'day', 'hour'];
    for (const pillar of pillars) {
      if (baziResult[pillar] && baziResult[pillar].stem && !baziResult[pillar].isUnknown) {
        totalCount++;
        if (yangStems.includes(baziResult[pillar].stem)) {
          yangCount++;
        }
      }
    }

    if (totalCount === 0) return null;

    const yinCount = totalCount - yangCount;
    const diff = Math.abs(yangCount - yinCount);

    if (diff === 0 || diff === 1) {
      return 'balanced';
    } else if (diff === 2) {
      return 'slightImbalance';
    } else {
      return 'severeImbalance';
    }
  }

  /**
   * 格式化分數顯示
   * @param {number} score - 分數
   * @returns {string} 格式化後的分數（帶正負號）
   */
  formatScore(score) {
    if (typeof score !== 'number' || isNaN(score)) return '0';
    return score >= 0 ? `+${score}` : `${score}`;
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScoringEngine;
}

// 瀏覽器環境全局導出
if (typeof window !== 'undefined') {
  window.ScoringEngine = ScoringEngine;
}
