/**
 * 易經引擎
 * 處理易經計算，包含卦象查詢、變卦、互卦、錯卦、綜卦等功能
 * @version 1.0.0
 * @author FastFate
 */

class IChingEngine {
  /**
   * 八卦列表（三爻二進制）
   * @type {Object}
   */
  static TRIGRAM_BINARY = {
    '111': '乾', '110': '兌', '101': '離', '100': '震',
    '011': '巽', '010': '坎', '001': '艮', '000': '坤'
  };

  /**
   * 地支序號對應（用於時辰卦計算）
   * @type {string[]}
   */
  static BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * 五行生剋關係
   * @type {Object}
   */
  static ELEMENT_RELATIONS = {
    wood:  { generates: 'fire',  overcomes: 'earth', generatedBy: 'water', overcomeBy: 'metal' },
    fire:  { generates: 'earth', overcomes: 'metal', generatedBy: 'wood',  overcomeBy: 'water' },
    earth: { generates: 'metal', overcomes: 'water', generatedBy: 'fire',  overcomeBy: 'wood' },
    metal: { generates: 'water', overcomes: 'wood',  generatedBy: 'earth', overcomeBy: 'fire' },
    water: { generates: 'wood',  overcomes: 'fire',  generatedBy: 'metal', overcomeBy: 'earth' }
  };

  /**
   * 創建易經引擎實例
   */
  constructor() {
    /** @type {Array|null} 六十四卦數據 */
    this.hexagrams = null;
    /** @type {Object|null} 爻辭數據 */
    this.lines = null;
    /** @type {Object|null} 變卦路徑數據 */
    this.changeMap = null;
    /** @type {Object|null} 八卦數據 */
    this.trigrams = null;
    /** @type {Object|null} 卦象關係數據 */
    this.hexagramRelations = null;
    /** @type {boolean} 數據是否已載入 */
    this.loaded = false;
    /** @type {string|null} 載入錯誤信息 */
    this.loadError = null;
    /** @type {Map|null} 二進制索引映射 */
    this._binaryIndex = null;
  }

  /**
   * 載入所有 JSON 數據文件
   * @returns {Promise<boolean>} 是否載入成功
   */
  async loadData() {
    try {
      const [hexagrams, linesData, changeMap, trigrams, hexagramRelations] = await Promise.all([
        this._fetchJSON('../../data/iching/hexagrams.json'),
        this._fetchJSON('../../data/iching/lines.json'),
        this._fetchJSON('../../data/iching/change-map.json'),
        this._fetchJSON('../../data/iching/trigrams.json'),
        this._fetchJSON('../../data/iching/hexagram-relations.json')
      ]);

      this.hexagrams = hexagrams;
      this.lines = linesData.lines;
      this.changeMap = changeMap.hexagrams;
      this.trigrams = trigrams;
      this.hexagramRelations = hexagramRelations;

      // 建立二進制索引
      this._binaryIndex = new Map();
      for (const hex of this.hexagrams) {
        this._binaryIndex.set(hex.binary, hex.id);
      }

      this.loaded = true;
      this.loadError = null;
      return true;
    } catch (error) {
      this.loaded = false;
      this.loadError = `易經數據載入失敗: ${error.message}`;
      console.error(this.loadError, error);
      return false;
    }
  }

  /**
   * 確保數據已載入
   * @private
   */
  _ensureLoaded() {
    if (!this.loaded) {
      throw new Error('易經引擎數據未載入，請先調用 loadData()');
    }
  }

  /**
   * 請求 JSON 數據
   * @private
   * @param {string} url - JSON 文件路徑
   * @returns {Promise<Object>}
   */
  async _fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 根據二進制獲取卦象
   * @param {string} binary - 六爻二進制字符串（初爻到上爻，如 "111111"）
   * @returns {Object} 卦象數據
   */
  getHexagramByBinary(binary) {
    this._ensureLoaded();

    if (!binary || typeof binary !== 'string' || binary.length !== 6) {
      throw new Error(`無效的二進制格式: ${binary}，應為6位字符串`);
    }

    if (!/^[01]{6}$/.test(binary)) {
      throw new Error(`二進制只能包含 0 和 1: ${binary}`);
    }

    const id = this._binaryIndex.get(binary);
    if (!id) {
      throw new Error(`找不到對應二進制 ${binary} 的卦象`);
    }

    return this.getHexagramById(id);
  }

  /**
   * 根據卦序獲取卦象
   * @param {number} id - 卦序（1-64）
   * @returns {Object} 卦象數據
   */
  getHexagramById(id) {
    this._ensureLoaded();

    if (!id || id < 1 || id > 64) {
      throw new Error(`無效的卦序: ${id}，應為 1-64`);
    }

    const hexagram = this.hexagrams.find(h => h.id === id);
    if (!hexagram) {
      throw new Error(`找不到卦序 ${id} 的卦象數據`);
    }

    const relation = this.hexagramRelations[String(id)] || {};

    return {
      ...hexagram,
      nuclear: relation.nuclear || null,
      opposite: relation.opposite || null,
      reverse: relation.reverse || null,
      pair: relation.pair || null
    };
  }

  /**
   * 根據卦名獲取卦象
   * @param {string} name - 卦名（如 "乾為天"）
   * @returns {Object|null} 卦象數據或 null
   */
  getHexagramByName(name) {
    this._ensureLoaded();

    const hexagram = this.hexagrams.find(h => h.name === name);
    if (!hexagram) return null;

    return this.getHexagramById(hexagram.id);
  }

  /**
   * 解析上卦和下卦
   * @param {string} binary - 六爻二進制
   * @returns {Object} { upper, lower, upperTrigram, lowerTrigram }
   */
  parseTrigrams(binary) {
    this._ensureLoaded();

    const lowerBinary = binary.substring(0, 3); // 初爻到三爻
    const upperBinary = binary.substring(3, 6); // 四爻到上爻

    const lowerTrigram = IChingEngine.TRIGRAM_BINARY[lowerBinary];
    const upperTrigram = IChingEngine.TRIGRAM_BINARY[upperBinary];

    if (!lowerTrigram || !upperTrigram) {
      throw new Error(`無法解析二進制 ${binary} 的卦象`);
    }

    return {
      upper: upperBinary,
      lower: lowerBinary,
      upperTrigram,
      lowerTrigram,
      upperData: this.trigrams[upperTrigram],
      lowerData: this.trigrams[lowerTrigram]
    };
  }

  /**
   * 獲取變卦
   * @param {number} hexagramId - 原卦序號
   * @param {number[]} movingLines - 動爻位置數組（1-6）
   * @returns {Object} { original, changed, movingLines }
   */
  getChangedHexagram(hexagramId, movingLines) {
    this._ensureLoaded();

    if (!hexagramId || hexagramId < 1 || hexagramId > 64) {
      throw new Error(`無效的卦序: ${hexagramId}`);
    }

    if (!Array.isArray(movingLines) || movingLines.length === 0) {
      throw new Error('動爻數組不能為空');
    }

    for (const line of movingLines) {
      if (line < 1 || line > 6) {
        throw new Error(`動爻位置 ${line} 無效，應為 1-6`);
      }
    }

    // 排序動爻
    const sortedLines = [...movingLines].sort((a, b) => a - b);
    const movingLinesKey = sortedLines.join(',');

    // 從 change-map 查找
    const hexChangeData = this.changeMap[String(hexagramId)];
    if (!hexChangeData) {
      throw new Error(`找不到卦序 ${hexagramId} 的變卦數據`);
    }

    const changePath = hexChangeData.changePaths[movingLinesKey];
    if (!changePath) {
      throw new Error(`找不到卦序 ${hexagramId} 動爻 ${movingLinesKey} 的變卦路徑`);
    }

    const original = this.getHexagramById(hexagramId);
    const changed = this.getHexagramById(changePath.resultHexagram);

    // 獲取動爻的爻辭
    const movingLineTexts = sortedLines.map(lineNum => {
      const lineData = this.lines.find(
        l => l.hexagramId === hexagramId && l.line === lineNum
      );
      return lineData || { text: `第${lineNum}爻`, line: lineNum };
    });

    return {
      original,
      changed,
      movingLines: sortedLines,
      movingLineTexts
    };
  }

  /**
   * 獲取互卦
   * 互卦：取原卦二三四爻為下卦，三四五爻為上卦
   * @param {number} hexagramId - 原卦序號
   * @returns {Object} { original, nuclear }
   */
  getNuclearHexagram(hexagramId) {
    this._ensureLoaded();

    const original = this.getHexagramById(hexagramId);
    const nuclearId = this.hexagramRelations[String(hexagramId)]?.nuclear;

    if (!nuclearId) {
      throw new Error(`找不到卦序 ${hexagramId} 的互卦數據`);
    }

    const nuclear = this.getHexagramById(nuclearId);

    // 計算互卦的二進制（驗證）
    const binary = original.binary;
    const nuclearLower = binary[1] + binary[2] + binary[3]; // 二三四爻
    const nuclearUpper = binary[2] + binary[3] + binary[4]; // 三四五爻
    const nuclearBinary = nuclearLower + nuclearUpper;

    return {
      original,
      nuclear,
      nuclearBinary
    };
  }

  /**
   * 獲取錯卦
   * 錯卦：將原卦每個爻陰陽互換
   * @param {number} hexagramId - 原卦序號
   * @returns {Object} { original, opposite }
   */
  getOppositeHexagram(hexagramId) {
    this._ensureLoaded();

    const original = this.getHexagramById(hexagramId);
    const oppositeId = this.hexagramRelations[String(hexagramId)]?.opposite;

    if (!oppositeId) {
      throw new Error(`找不到卦序 ${hexagramId} 的錯卦數據`);
    }

    const opposite = this.getHexagramById(oppositeId);

    // 計算錯卦的二進制（驗證）
    const oppositeBinary = original.binary.split('').map(b => b === '1' ? '0' : '1').join('');

    return {
      original,
      opposite,
      oppositeBinary
    };
  }

  /**
   * 獲取綜卦
   * 綜卦：將原卦上下顛倒（爻序反轉）
   * @param {number} hexagramId - 原卦序號
   * @returns {Object} { original, reverse }
   */
  getReverseHexagram(hexagramId) {
    this._ensureLoaded();

    const original = this.getHexagramById(hexagramId);
    const reverseId = this.hexagramRelations[String(hexagramId)]?.reverse;

    if (!reverseId) {
      throw new Error(`找不到卦序 ${hexagramId} 的綜卦數據`);
    }

    const reverse = this.getHexagramById(reverseId);

    // 計算綜卦的二進制（驗證）
    const reverseBinary = original.binary.split('').reverse().join('');

    return {
      original,
      reverse,
      reverseBinary
    };
  }

  /**
   * 推算時辰卦象
   * 使用梅花易數時間起卦法：
   * 上卦 = (年數 + 月數 + 日數) % 8
   * 下卦 = (年數 + 月數 + 日數 + 時辰數) % 8
   * 動爻 = (年數 + 月數 + 日數 + 時辰數) % 6
   * @param {Date} date - 日期對象
   * @param {string} hourBranch - 時辰地支（如 "子", "丑" 等）
   * @param {Object} [userBazi] - 用戶八字數據（可選，用於個性化）
   * @returns {Object} 卦象結果
   */
  deriveHourHexagram(date, hourBranch, userBazi = null) {
    this._ensureLoaded();

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('無效的日期');
    }

    const branchIndex = IChingEngine.BRANCHES.indexOf(hourBranch);
    if (branchIndex === -1) {
      throw new Error(`無效的時辰地支: ${hourBranch}`);
    }

    // 梅花易數起卦法（固定公式）
    // 使用農曆數值（此處簡化為使用公曆數值的固定映射）
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 年數取後兩位（固定公式）
    const yearNum = year % 100;

    // 上卦 = (年 + 月 + 日) % 8，餘數為0則取8（坤）
    const upperRemainder = (yearNum + month + day) % 8;
    const upperNum = upperRemainder === 0 ? 8 : upperRemainder;

    // 下卦 = (年 + 月 + 日 + 時辰) % 8，餘數為0則取8（坤）
    const hourNum = branchIndex + 1; // 子=1, 丑=2, ..., 亥=12
    const lowerRemainder = (yearNum + month + day + hourNum) % 8;
    const lowerNum = lowerRemainder === 0 ? 8 : lowerRemainder;

    // 動爻 = (年 + 月 + 日 + 時辰) % 6，餘數為0則取6
    const movingRemainder = (yearNum + month + day + hourNum) % 6;
    const movingLine = movingRemainder === 0 ? 6 : movingRemainder;

    // 先天八卦數對應：乾1 兌2 離3 震4 巽5 坎6 艮7 坤8
    const NUM_TO_BINARY = {
      1: '111', 2: '110', 3: '101', 4: '100',
      5: '011', 6: '010', 7: '001', 8: '000'
    };

    const upperBinary = NUM_TO_BINARY[upperNum];
    const lowerBinary = NUM_TO_BINARY[lowerNum];
    const hexagramBinary = lowerBinary + upperBinary; // 初爻在前

    const hexagram = this.getHexagramByBinary(hexagramBinary);

    // 獲取變卦
    const changeResult = this.getChangedHexagram(hexagram.id, [movingLine]);

    // 獲取動爻爻辭
    const movingLineData = this.lines.find(
      l => l.hexagramId === hexagram.id && l.line === movingLine
    );

    return {
      hexagram,
      changedHexagram: changeResult.changed,
      movingLine,
      movingLineText: movingLineData || null,
      calculation: {
        yearNum,
        month,
        day,
        hourBranch,
        hourNum,
        upperNum,
        lowerNum,
        upperBinary,
        lowerBinary,
        hexagramBinary
      }
    };
  }

  /**
   * 根據五行個性化卦象
   * 根據日主五行與卦象五行的生剋關係進行個性化分析
   * @param {Object} hexagram - 卦象數據
   * @param {string} dayMasterElement - 日主五行（wood/fire/earth/metal/water）
   * @returns {Object} 個性化分析結果
   */
  personalizeHexagramByElement(hexagram, dayMasterElement) {
    this._ensureLoaded();

    if (!hexagram || !hexagram.binary) {
      throw new Error('無效的卦象數據');
    }

    const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
    if (!validElements.includes(dayMasterElement)) {
      throw new Error(`無效的五行: ${dayMasterElement}，應為 ${validElements.join('/')}`);
    }

    const trigrams = this.parseTrigrams(hexagram.binary);
    const upperElement = trigrams.upperData.element;
    const lowerElement = trigrams.lowerData.element;

    const relations = IChingEngine.ELEMENT_RELATIONS[dayMasterElement];

    // 分析上卦與日主的關係
    const upperRelation = this._getElementRelation(dayMasterElement, upperElement);

    // 分析下卦與日主的關係
    const lowerRelation = this._getElementRelation(dayMasterElement, lowerElement);

    // 計算卦象五行強度
    const elementCounts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    elementCounts[upperElement]++;
    elementCounts[lowerElement]++;

    // 個性化建議
    const advice = this._generateElementAdvice(dayMasterElement, upperRelation, lowerRelation, hexagram);

    return {
      hexagram,
      dayMasterElement,
      upperTrigram: {
        name: trigrams.upperTrigram,
        element: upperElement,
        relation: upperRelation
      },
      lowerTrigram: {
        name: trigrams.lowerTrigram,
        element: lowerElement,
        relation: lowerRelation
      },
      elementCounts,
      advice
    };
  }

  /**
   * 獲取兩個五行之間的關係
   * @private
   * @param {string} a - 五行A
   * @param {string} b - 五行B
   * @returns {string} 關係類型
   */
  _getElementRelation(a, b) {
    if (a === b) return '比和';

    const relations = IChingEngine.ELEMENT_RELATIONS[a];
    if (relations.generates === b) return '生出';
    if (relations.generatedBy === b) return '生入';
    if (relations.overcomes === b) return '剋出';
    if (relations.overcomeBy === b) return '剋入';

    return '未知';
  }

  /**
   * 生成五行個性化建議
   * @private
   * @param {string} dayMaster - 日主五行
   * @param {string} upperRelation - 上卦關係
   * @param {string} lowerRelation - 下卦關係
   * @param {Object} hexagram - 卦象數據
   * @returns {Object} 建議
   */
  _generateElementAdvice(dayMaster, upperRelation, lowerRelation, hexagram) {
    const strengthMap = {
      '比和': 0, '生入': 1, '生出': -1, '剋入': -2, '剋出': 2
    };

    const totalStrength = strengthMap[upperRelation] + strengthMap[lowerRelation];
    let strengthLevel;
    if (totalStrength >= 2) strengthLevel = '強旺';
    else if (totalStrength >= 0) strengthLevel = '平穩';
    else if (totalStrength >= -2) strengthLevel = '偏弱';
    else strengthLevel = '衰弱';

    return {
      strengthLevel,
      totalStrength,
      summary: `日主${this._getElementName(dayMaster)}遇${hexagram.name}，卦象五行${strengthLevel}。`
    };
  }

  /**
   * 獲取五行中文名
   * @private
   * @param {string} element - 五行英文
   * @returns {string} 中文名
   */
  _getElementName(element) {
    const names = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    return names[element] || element;
  }

  /**
   * 獲取卦的爻辭
   * @param {number} hexagramId - 卦序
   * @param {number} lineNumber - 爻位（1-6）
   * @returns {Object|null} 爻辭數據
   */
  getLineText(hexagramId, lineNumber) {
    this._ensureLoaded();

    return this.lines.find(
      l => l.hexagramId === hexagramId && l.line === lineNumber
    ) || null;
  }

  /**
   * 獲取卦的所有爻辭
   * @param {number} hexagramId - 卦序
   * @returns {Array} 爻辭數組
   */
  getAllLineTexts(hexagramId) {
    this._ensureLoaded();

    return this.lines.filter(l => l.hexagramId === hexagramId);
  }

  /**
   * 根據日期獲取時辰地支
   * @param {Date} date - 日期對象
   * @returns {string} 時辰地支
   */
  getHourBranch(date) {
    const hour = date.getHours();
    // 23-1: 子, 1-3: 丑, ..., 21-23: 亥
    const branchIndex = Math.floor(((hour + 1) % 24) / 2);
    return IChingEngine.BRANCHES[branchIndex];
  }

  /**
   * 驗證二進制卦象
   * @param {string} binary - 二進制字符串
   * @returns {boolean} 是否有效
   */
  isValidBinary(binary) {
    if (!binary || typeof binary !== 'string' || binary.length !== 6) return false;
    if (!/^[01]{6}$/.test(binary)) return false;
    return this._binaryIndex ? this._binaryIndex.has(binary) : true;
  }

  /**
   * 獲取所有64卦列表
   * @returns {Array} 卦象數組
   */
  getAllHexagrams() {
    this._ensureLoaded();
    return this.hexagrams.map(h => ({
      id: h.id,
      name: h.name,
      binary: h.binary,
      judgment: h.judgment
    }));
  }

  /**
   * 獲取引擎狀態信息
   * @returns {Object} 狀態信息
   */
  getStatus() {
    return {
      loaded: this.loaded,
      loadError: this.loadError,
      hexagramCount: this.hexagrams ? this.hexagrams.length : 0,
      lineCount: this.lines ? this.lines.length : 0
    };
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IChingEngine;
}
