/**
 * 干支引擎
 * 處理干支相關計算，包含天干、地支、六十甲子、納音、五行等功能
 * @version 1.0.0
 * @author FastFate
 */

class GanzhiEngine {
  /**
   * 天干列表
   * @type {string[]}
   */
  static STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

  /**
   * 地支列表
   * @type {string[]}
   */
  static BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * 五行名稱映射
   * @type {Object}
   */
  static ELEMENT_NAMES = {
    wood: '木',
    fire: '火',
    earth: '土',
    metal: '金',
    water: '水'
  };

  /**
   * 五行相生關係
   * @type {Object}
   */
  static ELEMENT_GENERATE = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood'
  };

  /**
   * 五行相剋關係
   * @type {Object}
   */
  static ELEMENT_CONTROL = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood'
  };

  /**
   * 創建干支引擎實例
   */
  constructor() {
    /** @type {Object|null} 天干數據 */
    this.stems = null;
    /** @type {Object|null} 地支數據 */
    this.branches = null;
    /** @type {Array|null} 六十甲子數據 */
    this.ganzhi60 = null;
    /** @type {Object|null} 納音數據 */
    this.nayin = null;
    /** @type {Object|null} 藏干數據 */
    this.hiddenStems = null;
    /** @type {Object|null} 五行數據 */
    this.elements = null;
    /** @type {boolean} 數據是否已載入 */
    this.loaded = false;
    /** @type {string|null} 載入錯誤信息 */
    this.loadError = null;
  }

  /**
   * 載入所有 JSON 數據文件
   * @returns {Promise<boolean>} 是否載入成功
   */
  async loadData() {
    try {
      const [stems, branches, ganzhi60, nayin, hiddenStems, elements] = await Promise.all([
        this._fetchJSON('../../data/core/stems.json'),
        this._fetchJSON('../../data/core/branches.json'),
        this._fetchJSON('../../data/core/ganzhi-60.json'),
        this._fetchJSON('../../data/bazi/nayin.json'),
        this._fetchJSON('../../data/bazi/hidden-stems.json'),
        this._fetchJSON('../../data/core/elements.json')
      ]);

      this.stems = stems;
      this.branches = branches;
      this.ganzhi60 = ganzhi60;
      this.nayin = nayin;
      this.hiddenStems = hiddenStems;
      this.elements = elements;
      this.loaded = true;
      this.loadError = null;

      return true;
    } catch (error) {
      this.loadError = `數據載入失敗: ${error.message}`;
      console.error(this.loadError);
      return false;
    }
  }

  /**
   * 獲取指定索引的天干
   * @param {number} index - 天干索引 (1-10 或 0-9)
   * @returns {string} 天干名稱
   * @throws {Error} 索引無效時拋出錯誤
   * @example
   * engine.getStemByIndex(1) // => '甲'
   * engine.getStemByIndex(10) // => '癸'
   */
  getStemByIndex(index) {
    this._ensureLoaded();

    const normalizedIndex = this._normalizeIndex(index, 10);

    if (this.stems) {
      const stemEntry = Object.entries(this.stems).find(([_, data]) => data.index === normalizedIndex + 1);
      if (stemEntry) return stemEntry[0];
    }

    return GanzhiEngine.STEMS[normalizedIndex];
  }

  /**
   * 獲取指定索引的地支
   * @param {number} index - 地支索引 (1-12 或 0-11)
   * @returns {string} 地支名稱
   * @throws {Error} 索引無效時拋出錯誤
   * @example
   * engine.getBranchByIndex(1) // => '子'
   * engine.getBranchByIndex(12) // => '亥'
   */
  getBranchByIndex(index) {
    this._ensureLoaded();

    const normalizedIndex = this._normalizeIndex(index, 12);

    if (this.branches) {
      const branchEntry = Object.entries(this.branches).find(([_, data]) => data.index === normalizedIndex + 1);
      if (branchEntry) return branchEntry[0];
    }

    return GanzhiEngine.BRANCHES[normalizedIndex];
  }

  /**
   * 獲取指定索引的干支組合
   * @param {number} index - 干支索引 (1-60 或 0-59)
   * @returns {Object} 干支對象 { name, stem, branch, nayin }
   * @throws {Error} 索引無效時拋出錯誤
   * @example
   * engine.getGanzhiByIndex(1) // => { name: '甲子', stem: '甲', branch: '子', nayin: '海中金' }
   */
  getGanzhiByIndex(index) {
    this._ensureLoaded();

    if (index < 1 || index > 60) {
      throw new Error(`干支索引必須在 1-60 之間，收到: ${index}`);
    }

    if (this.ganzhi60) {
      const ganzhi = this.ganzhi60.find(g => g.index === index);
      if (ganzhi) return { ...ganzhi };
    }

    // 備用計算
    const stemIndex = (index - 1) % 10;
    const branchIndex = (index - 1) % 12;
    const stem = GanzhiEngine.STEMS[stemIndex];
    const branch = GanzhiEngine.BRANCHES[branchIndex];

    return {
      index,
      name: stem + branch,
      stem,
      branch,
      nayin: this.getNayin(stem, branch)
    };
  }

  /**
   * 根據天干地支獲取干支索引
   * @param {string} stem - 天干名稱
   * @param {string} branch - 地支名稱
   * @returns {number} 干支索引 (1-60)
   * @throws {Error} 無效的天干地支組合時拋出錯誤
   * @example
   * engine.getGanzhiIndex('甲', '子') // => 1
   * engine.getGanzhiIndex('癸', '亥') // => 60
   */
  getGanzhiIndex(stem, branch) {
    this._ensureLoaded();

    this._validateStem(stem);
    this._validateBranch(branch);

    // 檢查組合是否有效（天干地支陰陽必須一致）
    const stemData = this._getStemData(stem);
    const branchData = this._getBranchData(branch);

    if (stemData && branchData && stemData.yinYang !== branchData.yinYang) {
      throw new Error(`無效的干支組合: ${stem}${branch}（陰陽不匹配）`);
    }

    if (this.ganzhi60) {
      const ganzhi = this.ganzhi60.find(g => g.stem === stem && g.branch === branch);
      if (ganzhi) return ganzhi.index;
    }

    // 備用計算
    const stemIndex = GanzhiEngine.STEMS.indexOf(stem);
    const branchIndex = GanzhiEngine.BRANCHES.indexOf(branch);

    // 使用中國餘數定理計算六十甲子索引
    for (let i = 0; i < 60; i++) {
      if (i % 10 === stemIndex && i % 12 === branchIndex) {
        return i + 1;
      }
    }

    throw new Error(`無法計算干支索引: ${stem}${branch}`);
  }

  /**
   * 獲取納音
   * @param {string} stem - 天干名稱
   * @param {string} branch - 地支名稱
   * @returns {string} 納音名稱
   * @throws {Error} 無效的天干地支時拋出錯誤
   * @example
   * engine.getNayin('甲', '子') // => '海中金'
   */
  getNayin(stem, branch) {
    this._ensureLoaded();

    this._validateStem(stem);
    this._validateBranch(branch);

    const ganzhiName = stem + branch;

    if (this.nayin && this.nayin[ganzhiName]) {
      return this.nayin[ganzhiName];
    }

    // 備用：從六十甲子數據中查找
    if (this.ganzhi60) {
      const ganzhi = this.ganzhi60.find(g => g.stem === stem && g.branch === branch);
      if (ganzhi) return ganzhi.nayin;
    }

    throw new Error(`無法獲取納音: ${ganzhiName}`);
  }

  /**
   * 獲取天干五行
   * @param {string} stem - 天干名稱
   * @returns {Object} 五行信息 { element, name, yinYang, label, image }
   * @throws {Error} 無效的天干時拋出錯誤
   * @example
   * engine.getStemElement('甲') // => { element: 'wood', name: '木', yinYang: 'yang', ... }
   */
  getStemElement(stem) {
    this._ensureLoaded();

    this._validateStem(stem);

    if (this.stems && this.stems[stem]) {
      const data = this.stems[stem];
      return {
        element: data.element,
        name: GanzhiEngine.ELEMENT_NAMES[data.element],
        yinYang: data.yinYang,
        label: data.label,
        image: data.image
      };
    }

    // 備用計算
    const stemIndex = GanzhiEngine.STEMS.indexOf(stem);
    const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
    const element = elements[stemIndex];

    return {
      element,
      name: GanzhiEngine.ELEMENT_NAMES[element],
      yinYang: stemIndex % 2 === 0 ? 'yang' : 'yin'
    };
  }

  /**
   * 獲取地支五行
   * @param {string} branch - 地支名稱
   * @returns {Object} 五行信息 { element, name, yinYang, zodiac, month, hourRange }
   * @throws {Error} 無效的地支時拋出錯誤
   * @example
   * engine.getBranchElement('子') // => { element: 'water', name: '水', yinYang: 'yang', zodiac: '鼠', ... }
   */
  getBranchElement(branch) {
    this._ensureLoaded();

    this._validateBranch(branch);

    if (this.branches && this.branches[branch]) {
      const data = this.branches[branch];
      return {
        element: data.element,
        name: GanzhiEngine.ELEMENT_NAMES[data.element],
        yinYang: data.yinYang,
        zodiac: data.zodiac,
        month: data.month,
        hourRange: data.hourRange
      };
    }

    // 備用計算
    const branchIndex = GanzhiEngine.BRANCHES.indexOf(branch);
    const elements = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
    const element = elements[branchIndex];
    const zodiacs = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

    return {
      element,
      name: GanzhiEngine.ELEMENT_NAMES[element],
      yinYang: branchIndex % 2 === 0 ? 'yang' : 'yin',
      zodiac: zodiacs[branchIndex]
    };
  }

  /**
   * 獲取地支藏干
   * @param {string} branch - 地支名稱
   * @returns {string[]} 藏干列表
   * @throws {Error} 無效的地支時拋出錯誤
   * @example
   * engine.getHiddenStems('丑') // => ['己', '癸', '辛']
   */
  getHiddenStems(branch) {
    this._ensureLoaded();

    this._validateBranch(branch);

    if (this.hiddenStems && this.hiddenStems[branch]) {
      return [...this.hiddenStems[branch]];
    }

    // 備用：從地支數據中獲取
    if (this.branches && this.branches[branch]) {
      return [...this.branches[branch].hiddenStems];
    }

    // 默認藏干數據
    const defaultHiddenStems = {
      '子': ['癸'],
      '丑': ['己', '癸', '辛'],
      '寅': ['甲', '丙', '戊'],
      '卯': ['乙'],
      '辰': ['戊', '乙', '癸'],
      '巳': ['丙', '戊', '庚'],
      '午': ['丁', '己'],
      '未': ['己', '丁', '乙'],
      '申': ['庚', '壬', '戊'],
      '酉': ['辛'],
      '戌': ['戊', '辛', '丁'],
      '亥': ['壬', '甲']
    };

    return [...defaultHiddenStems[branch]];
  }

  /**
   * 獲取天干詳細信息
   * @param {string} stem - 天干名稱
   * @returns {Object} 天干詳細信息
   * @throws {Error} 無效的天干時拋出錯誤
   */
  getStemInfo(stem) {
    this._ensureLoaded();
    this._validateStem(stem);

    if (this.stems && this.stems[stem]) {
      return { name: stem, ...this.stems[stem] };
    }

    const stemIndex = GanzhiEngine.STEMS.indexOf(stem);
    const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
    const labels = ['陽木', '陰木', '陽火', '陰火', '陽土', '陰土', '陽金', '陰金', '陽水', '陰水'];
    const images = [
      '大樹、棟樑、直上之木', '花草、藤蔓、柔木',
      '太陽、光明、外放之火', '燈火、爐火、細緻之火',
      '高山、城牆、厚重之土', '田園、土壤、包容之土',
      '刀劍、礦石、剛硬之金', '珠玉、首飾、精緻之金',
      '江海、大河、奔流之水', '雨露、霧氣、細密之水'
    ];

    return {
      name: stem,
      index: stemIndex + 1,
      element: elements[stemIndex],
      yinYang: stemIndex % 2 === 0 ? 'yang' : 'yin',
      label: labels[stemIndex],
      image: images[stemIndex]
    };
  }

  /**
   * 獲取地支詳細信息
   * @param {string} branch - 地支名稱
   * @returns {Object} 地支詳細信息
   * @throws {Error} 無效的地支時拋出錯誤
   */
  getBranchInfo(branch) {
    this._ensureLoaded();
    this._validateBranch(branch);

    if (this.branches && this.branches[branch]) {
      return { name: branch, ...this.branches[branch] };
    }

    const branchIndex = GanzhiEngine.BRANCHES.indexOf(branch);
    const elements = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
    const zodiacs = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
    const months = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const hourRanges = [
      '23:00-00:59', '01:00-02:59', '03:00-04:59', '05:00-06:59',
      '07:00-08:59', '09:00-10:59', '11:00-12:59', '13:00-14:59',
      '15:00-16:59', '17:00-18:59', '19:00-20:59', '21:00-22:59'
    ];

    return {
      name: branch,
      index: branchIndex + 1,
      element: elements[branchIndex],
      yinYang: branchIndex % 2 === 0 ? 'yang' : 'yin',
      zodiac: zodiacs[branchIndex],
      month: months[branchIndex],
      hourRange: hourRanges[branchIndex],
      hiddenStems: this.getHiddenStems(branch)
    };
  }

  /**
   * 判斷兩個天干的五行關係
   * @param {string} stem1 - 第一個天干
   * @param {string} stem2 - 第二個天干
   * @returns {Object} 關係信息 { relation, description }
   */
  getStemRelation(stem1, stem2) {
    const elem1 = this.getStemElement(stem1);
    const elem2 = this.getStemElement(stem2);

    return this._getElementRelation(elem1.element, elem2.element);
  }

  /**
   * 判斷兩個地支的五行關係
   * @param {string} branch1 - 第一個地支
   * @param {string} branch2 - 第二個地支
   * @returns {Object} 關係信息 { relation, description }
   */
  getBranchRelation(branch1, branch2) {
    const elem1 = this.getBranchElement(branch1);
    const elem2 = this.getBranchElement(branch2);

    return this._getElementRelation(elem1.element, elem2.element);
  }

  /**
   * 獲取六十甲子完整列表
   * @returns {Array} 六十甲子數組
   */
  getAllGanzhi() {
    this._ensureLoaded();

    if (this.ganzhi60) {
      return this.ganzhi60.map(g => ({ ...g }));
    }

    // 備用生成
    const result = [];
    for (let i = 1; i <= 60; i++) {
      result.push(this.getGanzhiByIndex(i));
    }
    return result;
  }

  /**
   * 獲取所有天干列表
   * @returns {string[]} 天干數組
   */
  getAllStems() {
    return [...GanzhiEngine.STEMS];
  }

  /**
   * 獲取所有地支列表
   * @returns {string[]} 地支數組
   */
  getAllBranches() {
    return [...GanzhiEngine.BRANCHES];
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
    // 如果沒有使用異步載入，使用同步備用數據
    if (!this.loaded && !this.loadError) {
      this._loadFallbackData();
    }
  }

  /**
   * 載入備用數據（同步）
   * @private
   */
  _loadFallbackData() {
    this.stems = {};
    GanzhiEngine.STEMS.forEach((stem, index) => {
      const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
      const labels = ['陽木', '陰木', '陽火', '陰火', '陽土', '陰土', '陽金', '陰金', '陽水', '陰水'];
      const images = [
        '大樹、棟樑、直上之木', '花草、藤蔓、柔木',
        '太陽、光明、外放之火', '燈火、爐火、細緻之火',
        '高山、城牆、厚重之土', '田園、土壤、包容之土',
        '刀劍、礦石、剛硬之金', '珠玉、首飾、精緻之金',
        '江海、大河、奔流之水', '雨露、霧氣、細密之水'
      ];
      this.stems[stem] = {
        index: index + 1,
        element: elements[index],
        yinYang: index % 2 === 0 ? 'yang' : 'yin',
        label: labels[index],
        image: images[index]
      };
    });

    this.branches = {};
    const branchElements = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
    const zodiacs = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
    const months = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const hourRanges = [
      '23:00-00:59', '01:00-02:59', '03:00-04:59', '05:00-06:59',
      '07:00-08:59', '09:00-10:59', '11:00-12:59', '13:00-14:59',
      '15:00-16:59', '17:00-18:59', '19:00-20:59', '21:00-22:59'
    ];
    const defaultHiddenStems = {
      '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
      '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'],
      '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
      '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
    };

    GanzhiEngine.BRANCHES.forEach((branch, index) => {
      this.branches[branch] = {
        index: index + 1,
        element: branchElements[index],
        yinYang: index % 2 === 0 ? 'yang' : 'yin',
        zodiac: zodiacs[index],
        month: months[index],
        hourRange: hourRanges[index],
        hiddenStems: defaultHiddenStems[branch]
      };
    });

    this.hiddenStems = defaultHiddenStems;
    this.ganzhi60 = null;
    this.nayin = null;
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
   * 標準化索引（支持 0-9 和 1-10 兩種格式）
   * @private
   * @param {number} index - 輸入索引
   * @param {number} max - 最大值
   * @returns {number} 標準化後的索引 (0-based)
   */
  _normalizeIndex(index, max) {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new Error(`索引必須是整數，收到: ${index}`);
    }

    // 支持 1-based 和 0-based 兩種格式
    if (index >= 1 && index <= max) {
      return index - 1;
    }
    if (index >= 0 && index < max) {
      return index;
    }

    throw new Error(`索引必須在 0-${max - 1} 或 1-${max} 之間，收到: ${index}`);
  }

  /**
   * 驗證天干是否有效
   * @private
   * @param {string} stem - 天干名稱
   * @throws {Error} 無效的天干時拋出錯誤
   */
  _validateStem(stem) {
    if (!stem || typeof stem !== 'string') {
      throw new Error(`天干必須是非空字符串，收到: ${stem}`);
    }
    if (!GanzhiEngine.STEMS.includes(stem)) {
      throw new Error(`無效的天干: ${stem}，有效值為: ${GanzhiEngine.STEMS.join(', ')}`);
    }
  }

  /**
   * 驗證地支是否有效
   * @private
   * @param {string} branch - 地支名稱
   * @throws {Error} 無效的地支時拋出錯誤
   */
  _validateBranch(branch) {
    if (!branch || typeof branch !== 'string') {
      throw new Error(`地支必須是非空字符串，收到: ${branch}`);
    }
    if (!GanzhiEngine.BRANCHES.includes(branch)) {
      throw new Error(`無效的地支: ${branch}，有效值為: ${GanzhiEngine.BRANCHES.join(', ')}`);
    }
  }

  /**
   * 獲取天干數據
   * @private
   * @param {string} stem - 天干名稱
   * @returns {Object|null} 天干數據
   */
  _getStemData(stem) {
    if (this.stems && this.stems[stem]) {
      return this.stems[stem];
    }
    return null;
  }

  /**
   * 獲取地支數據
   * @private
   * @param {string} branch - 地支名稱
   * @returns {Object|null} 地支數據
   */
  _getBranchData(branch) {
    if (this.branches && this.branches[branch]) {
      return this.branches[branch];
    }
    return null;
  }

  /**
   * 獲取五行關係
   * @private
   * @param {string} elem1 - 第一個五行
   * @param {string} elem2 - 第二個五行
   * @returns {Object} 關係信息
   */
  _getElementRelation(elem1, elem2) {
    if (elem1 === elem2) {
      return { relation: 'same', description: '比和' };
    }
    if (GanzhiEngine.ELEMENT_GENERATE[elem1] === elem2) {
      return { relation: 'generate', description: `${GanzhiEngine.ELEMENT_NAMES[elem1]}生${GanzhiEngine.ELEMENT_NAMES[elem2]}` };
    }
    if (GanzhiEngine.ELEMENT_GENERATE[elem2] === elem1) {
      return { relation: 'generated', description: `${GanzhiEngine.ELEMENT_NAMES[elem2]}生${GanzhiEngine.ELEMENT_NAMES[elem1]}` };
    }
    if (GanzhiEngine.ELEMENT_CONTROL[elem1] === elem2) {
      return { relation: 'control', description: `${GanzhiEngine.ELEMENT_NAMES[elem1]}剋${GanzhiEngine.ELEMENT_NAMES[elem2]}` };
    }
    if (GanzhiEngine.ELEMENT_CONTROL[elem2] === elem1) {
      return { relation: 'controlled', description: `${GanzhiEngine.ELEMENT_NAMES[elem2]}剋${GanzhiEngine.ELEMENT_NAMES[elem1]}` };
    }

    return { relation: 'unknown', description: '未知關係' };
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GanzhiEngine;
}

// 瀏覽器環境全局導出
if (typeof window !== 'undefined') {
  window.GanzhiEngine = GanzhiEngine;
}
