/**
 * 八字引擎
 * 處理八字計算，包含四柱計算、十神、地支關係等功能
 * @version 1.0.0
 * @author FastFate
 */

class BaziEngine {
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
   * 月柱地支對應的節氣月份（以節氣為界）
   * 立春為正月(寅月)，驚蟄為二月(卯月)，依此類推
   * @type {Object}
   */
  static MONTH_BRANCH_BY_SOLAR_TERM = {
    '立春': '寅', '驚蟄': '卯', '清明': '辰', '立夏': '巳',
    '芒種': '午', '小暑': '未', '立秋': '申', '白露': '酉',
    '寒露': '戌', '立冬': '亥', '大雪': '子', '小寒': '丑'
  };

  /**
   * 節氣換月的順序（立春開始）
   * @type {string[]}
   */
  static SOLAR_TERM_MONTH_ORDER = [
    '小寒', '立春', '驚蟄', '清明', '立夏', '芒種',
    '小暑', '立秋', '白露', '寒露', '立冬', '大雪'
  ];

  /**
   * 時辰對應表
   * @type {Array}
   */
  static HOUR_BRANCHES = [
    { branch: '子', start: 23, end: 1, crossDay: true },
    { branch: '丑', start: 1, end: 3, crossDay: false },
    { branch: '寅', start: 3, end: 5, crossDay: false },
    { branch: '卯', start: 5, end: 7, crossDay: false },
    { branch: '辰', start: 7, end: 9, crossDay: false },
    { branch: '巳', start: 9, end: 11, crossDay: false },
    { branch: '午', start: 11, end: 13, crossDay: false },
    { branch: '未', start: 13, end: 15, crossDay: false },
    { branch: '申', start: 15, end: 17, crossDay: false },
    { branch: '酉', start: 17, end: 19, crossDay: false },
    { branch: '戌', start: 19, end: 21, crossDay: false },
    { branch: '亥', start: 21, end: 23, crossDay: false }
  ];

  /**
   * 創建八字引擎實例
   */
  constructor() {
    /** @type {Object|null} 十神數據 */
    this.tenGods = null;
    /** @type {Object|null} 地支關係數據 */
    this.branchRelations = null;
    /** @type {Object|null} 藏干數據 */
    this.hiddenStems = null;
    /** @type {Object|null} 節氣數據 */
    this.solarTerms = null;
    /** @type {GanzhiEngine|null} 干支引擎實例 */
    this.ganzhiEngine = null;
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
      const [tenGods, branchRelations, hiddenStems, solarTerms] = await Promise.all([
        this._fetchJSON('data/bazi/ten-gods.json'),
        this._fetchJSON('data/bazi/branch-relations.json'),
        this._fetchJSON('data/bazi/hidden-stems.json'),
        this._fetchJSON('data/core/solar-terms.json')
      ]);

      this.tenGods = tenGods;
      this.branchRelations = branchRelations;
      this.hiddenStems = hiddenStems;
      this.solarTerms = solarTerms;

      // 載入干支引擎
      if (typeof GanzhiEngine !== 'undefined') {
        this.ganzhiEngine = new GanzhiEngine();
        await this.ganzhiEngine.loadData();
      }

      this.loaded = true;
      this.loadError = null;

      return true;
    } catch (error) {
      this.loadError = `八字引擎數據載入失敗: ${error.message}`;
      console.error(this.loadError);
      this._loadFallbackData();
      return false;
    }
  }

  /**
   * 計算八字（四柱）
   * @param {Date|string|number} birthDate - 出生日期
   * @param {string|null} [birthTime=null] - 出生時間 (HH:mm 格式)，null 表示未知
   * @returns {Object} 八字對象
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateBazi('1990-05-15', '14:30')
   * // => { year: {...}, month: {...}, day: {...}, hour: {...}, dayMaster: {...}, ... }
   */
  calculateBazi(birthDate, birthTime = null, gender = null) {
    this._ensureLoaded();

    const date = this._ensureDate(birthDate);

    if (!this._isValidDate(date)) {
      throw new Error(`無效的出生日期: ${birthDate}`);
    }

    // 處理子時跨日：如果時間是 23:00-23:59，日期需要加一天
    let adjustedDate = new Date(date.getTime());
    let isCrossDay = false;

    if (birthTime) {
      const hour = this._parseHour(birthTime);
      if (hour >= 23) {
        // 子時跨日：日柱需要加一天
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        isCrossDay = true;
      }
    }

    // 計算四柱
    const yearPillar = this.calculateYearPillar(date);
    const monthPillar = this.calculateMonthPillar(date);
    const dayPillar = this.calculateDayPillar(adjustedDate);
    const hourPillar = birthTime
      ? this.calculateHourPillar(dayPillar.stem, birthTime)
      : this._createUnknownPillar('時');

    // 獲取日主
    const dayMaster = this.getDayMaster({ day: dayPillar });

    // 計算十神
    const tenGods = this._calculateAllTenGods(dayPillar.stem, {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar
    });

    // 計算地支關係（排除未知的地支）
    const branches = [
      yearPillar.branch,
      monthPillar.branch,
      dayPillar.branch,
      hourPillar.branch
    ].filter(b => b && b !== '?' && !b.isUnknown);
    
    const branchRels = branches.length >= 2 ? this.getBranchRelations(branches) : [];

    // 獲取藏干
    const hiddenStemsList = this._getAllHiddenStems({
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar
    });

    // 大運計算
    const dayun = gender ? this.calculateDayun(adjustedDate, gender, yearPillar, monthPillar) : null;

    // 日主旺衰（月令）
    const monthElement = this._getMonthElement(monthPillar.branch);
    const dayMasterStrength = this._getDayMasterStrength(dayMaster.element, monthPillar.branch);

    // 旬空（空亡）
    const kongWang = this._getKongWang(dayPillar);

    return {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      dayMaster,
      dayMasterStrength,
      kongWang,
      monthElement,
      tenGods,
      branchRelations: branchRels,
      hiddenStems: hiddenStemsList,
      nayinMatch: this._checkNayinMatch([yearPillar, monthPillar, dayPillar, hourPillar]),
      dayun,
      birthInfo: {
        date: this._formatDate(date),
        time: birthTime,
        isTimeKnown: birthTime !== null,
        isCrossDay,
        adjustedDate: isCrossDay ? this._formatDate(adjustedDate) : null,
        gender
      }
    };
  }

  /**
   * 計算年柱
   * 以立春為界，立春前屬於前一年
   * @param {Date|string|number} date - 出生日期
   * @returns {Object} 年柱對象 { stem, branch, name, nayin }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateYearPillar('2026-02-03') // 立春前，仍為乙巳年
   * engine.calculateYearPillar('2026-02-04') // 立春當天，為丙午年
   */
  calculateYearPillar(date) {
    this._ensureLoaded();

    const validDate = this._ensureDate(date);

    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    let year = validDate.getFullYear();

    // 檢查是否在立春之前
    const lichunDate = this._getSolarTermDate(year, '立春');
    if (validDate < lichunDate) {
      year -= 1;
    }

    // 計算年干支
    // 甲子年為公元4年，所以 (year - 4) % 60 為甲子的偏移
    const ganzhiIndex = ((year - 4) % 60 + 60) % 60;
    const stemIndex = ganzhiIndex % 10;
    const branchIndex = ganzhiIndex % 12;

    const stem = BaziEngine.STEMS[stemIndex];
    const branch = BaziEngine.BRANCHES[branchIndex];
    const name = stem + branch;
    const nayin = this._getNayin(stem, branch);

    return {
      stem,
      branch,
      name,
      nayin,
      year,
      label: '年柱'
    };
  }

  /**
   * 計算月柱
   * 以節氣為界換月
   * @param {Date|string|number} date - 出生日期
   * @returns {Object} 月柱對象 { stem, branch, name, nayin, solarTerm }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateMonthPillar('2026-05-15') // 立夏後，為巳月
   */
  calculateMonthPillar(date) {
    this._ensureLoaded();

    const validDate = this._ensureDate(date);

    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    const year = validDate.getFullYear();
    const month = validDate.getMonth() + 1;
    const day = validDate.getDate();

    // 確定月支（以節氣為界）
    const { branch: monthBranch, solarTerm } = this._getMonthBranchBySolarTerm(validDate);

    // 計算月干
    // 年干決定月干的起始（甲己之年丙作首，乙庚之年戊為頭...）
    const yearPillar = this.calculateYearPillar(validDate);
    const yearStemIndex = BaziEngine.STEMS.indexOf(yearPillar.stem);
    const monthBranchIndex = BaziEngine.BRANCHES.indexOf(monthBranch);

    // 五虎遁月：甲己年起丙寅，乙庚年起戊寅，丙辛年起庚寅，丁壬年起壬寅，戊癸年起甲寅
    const monthStemStart = [2, 4, 6, 8, 0]; // 丙、戊、庚、壬、甲的索引
    const yearStemGroup = yearStemIndex % 5;
    const monthStemIndex = (monthStemStart[yearStemGroup] + monthBranchIndex - 2 + 10) % 10; // 寅月(index 2)為起始

    const stem = BaziEngine.STEMS[monthStemIndex];
    const branch = monthBranch;
    const name = stem + branch;
    const nayin = this._getNayin(stem, branch);

    return {
      stem,
      branch,
      name,
      nayin,
      solarTerm,
      label: '月柱'
    };
  }

  /**
   * 計算日柱
   * 基於已知的基準日期計算
   * @param {Date|string|number} date - 出生日期
   * @returns {Object} 日柱對象 { stem, branch, name, nayin }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateDayPillar('2026-06-01')
   */
  calculateDayPillar(date) {
    this._ensureLoaded();

    const validDate = this._ensureDate(date);

    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    // 基準日期：1900年1月1日為甲戌日
    const baseDate = new Date(1900, 0, 1);
    const baseGanzhiIndex = 11; // 甲戌在六十甲子中的索引

    // 計算天數差
    const timeDiff = validDate.getTime() - baseDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // 計算干支索引
    const ganzhiIndex = ((daysDiff + baseGanzhiIndex - 1) % 60 + 60) % 60 + 1;
    const stemIndex = (ganzhiIndex - 1) % 10;
    const branchIndex = (ganzhiIndex - 1) % 12;

    const stem = BaziEngine.STEMS[stemIndex];
    const branch = BaziEngine.BRANCHES[branchIndex];
    const name = stem + branch;
    const nayin = this._getNayin(stem, branch);

    return {
      stem,
      branch,
      name,
      nayin,
      ganzhiIndex,
      label: '日柱'
    };
  }

  /**
   * 計算時柱
   * 根據日干和出生時間計算
   * @param {string} dayStem - 日干
   * @param {string} birthTime - 出生時間 (HH:mm 格式)
   * @returns {Object} 時柱對象 { stem, branch, name, nayin }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.calculateHourPillar('甲', '14:30') // 未時
   */
  calculateHourPillar(dayStem, birthTime) {
    this._ensureLoaded();

    this._validateStem(dayStem);

    if (!birthTime || typeof birthTime !== 'string') {
      throw new Error(`無效的出生時間: ${birthTime}`);
    }

    // 確定時支
    const hour = this._parseHour(birthTime);
    const { branch: hourBranch } = this._getHourBranch(hour);

    // 計算時干
    // 日干決定時干的起始（甲己日起甲子，乙庚日起丙子...）
    const dayStemIndex = BaziEngine.STEMS.indexOf(dayStem);
    const hourBranchIndex = BaziEngine.BRANCHES.indexOf(hourBranch);

    // 五鼠遁時：甲己日起甲子，乙庚日起丙子，丙辛日起戊子，丁壬日起庚子，戊癸日起壬子
    const hourStemStart = [0, 2, 4, 6, 8]; // 甲、丙、戊、庚、壬的索引
    const dayStemGroup = dayStemIndex % 5;
    const hourStemIndex = (hourStemStart[dayStemGroup] + hourBranchIndex) % 10;

    const stem = BaziEngine.STEMS[hourStemIndex];
    const branch = hourBranch;
    const name = stem + branch;
    const nayin = this._getNayin(stem, branch);

    return {
      stem,
      branch,
      name,
      nayin,
      label: '時柱'
    };
  }

  /**
   * 計算大運
   * 陽男陰女順排，陰男陽女逆排
   * @param {Date} date - 出生日期（已調整跨日）
   * @param {string} gender - 'male' 或 'female'
   * @param {Object} yearPillar - 年柱
   * @param {Object} monthPillar - 月柱
   * @returns {Object|null} 大運信息
   */
  calculateDayun(date, gender, yearPillar, monthPillar) {
    if (!gender || !yearPillar || !monthPillar) return null;

    // 年干陰陽判定：甲丙戊庚壬(索引0,2,4,6,8)為陽
    const yearStemIndex = BaziEngine.STEMS.indexOf(yearPillar.stem);
    const isYearYang = yearStemIndex % 2 === 0;

    // 陽男陰女順排，陰男陽女逆排
    const isForward = (isYearYang && gender === 'male') || (!isYearYang && gender === 'female');

    // 尋找最近的下一個／上一個節氣（十二節）
    const terms = ['小寒', '立春', '驚蟄', '清明', '立夏', '芒種',
                   '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];

    let targetTerm = null;
    let targetDate = null;
    let minDiff = Infinity;

    const year = date.getFullYear();
    const yearStr = year.toString();
    const yearTerms = this.solarTerms && this.solarTerms[yearStr];

    // 順排：找之後的第一個節氣；逆排：找之前的第一個節氣
    for (const termName of terms) {
      let termDateStr = null;
      if (yearTerms && yearTerms[termName]) {
        termDateStr = yearTerms[termName];
      } else {
        const approx = this._getSolarTermDate(year, termName);
        termDateStr = this._formatDate(approx);
      }
      if (!termDateStr) continue;
      const termDate = this._ensureDate(termDateStr);
      const diff = termDate.getTime() - date.getTime();
      const diffDays = diff / (1000 * 60 * 60 * 24);

      if (isForward && diffDays > 0 && diffDays < minDiff) {
        minDiff = diffDays;
        targetTerm = termName;
        targetDate = termDate;
      } else if (!isForward && diffDays < 0 && -diffDays < minDiff) {
        minDiff = -diffDays;
        targetTerm = termName;
        targetDate = termDate;
      }
    }

    // 如果沒找到 (可能跨年)，搜索前後年份
    if (!targetTerm) {
      const searchYears = isForward ? [yearStr, String(year + 1)] : [String(year - 1), yearStr];
      for (const sy of searchYears) {
        const yTerms = this.solarTerms && this.solarTerms[sy];
        if (!yTerms) continue;
        for (const termName of terms) {
          const termDateStr = yTerms[termName];
          if (!termDateStr) continue;
          const termDate = this._ensureDate(termDateStr);
          const diff = termDate.getTime() - date.getTime();
          const diffDays = diff / (1000 * 60 * 60 * 24);
          if (isForward && diffDays > 0 && diffDays < minDiff) {
            minDiff = diffDays;
            targetTerm = termName;
            targetDate = termDate;
          } else if (!isForward && diffDays < 0 && -diffDays < minDiff) {
            minDiff = -diffDays;
            targetTerm = termName;
            targetDate = termDate;
          }
        }
      }
    }

    if (!targetTerm) return null;

    // 計算起運年齡：3天 = 1年
    const totalHours = minDiff * 24;
    const startAge = Math.floor(totalHours / 72); // 72 hours = 3 days = 1 year
    const remainderHours = totalHours % 72;
    const remainderMonths = Math.floor(remainderHours / 6); // 6 hours = 1 month (0.25 day = 6h → 1 month)
    const remainderDays = Math.floor((remainderHours % 6) * 5); // 1 hour = 5 days

    const startAgeFormatted = `${startAge}歲${remainderMonths > 0 ? ` ${remainderMonths}個月` : ''}${remainderDays > 0 ? ` ${remainderDays}天` : ''}`;

    // 排大運（每十年一運，從月柱開始順/逆排）
    const monthStemIndex = BaziEngine.STEMS.indexOf(monthPillar.stem);
    const monthBranchIndex = BaziEngine.BRANCHES.indexOf(monthPillar.branch);

    const dayunPillars = [];
    const maxDayun = 8; // 最多排八步大運

    for (let i = 0; i < maxDayun; i++) {
      const step = isForward ? i + 1 : -(i + 1);
      const stemIdx = ((monthStemIndex + step) % 10 + 10) % 10;
      const branchIdx = ((monthBranchIndex + step) % 12 + 12) % 12;
      const stem = BaziEngine.STEMS[stemIdx];
      const branch = BaziEngine.BRANCHES[branchIdx];
      const name = stem + branch;
      const nayin = this._getNayin(stem, branch);

      const pillarEl = this._stemToElement(stem);
      const dayEl = this._stemToElement(monthPillar.stem);
      const isFavorable = dayEl === pillarEl;

      dayunPillars.push({
        index: i + 1,
        startAge: startAge + i * 10,
        endAge: startAge + (i + 1) * 10 - 1,
        stem,
        branch,
        name,
        nayin,
        isFavorable: isFavorable
      });
    }

    // 判斷當前大運是否有利：比和或生我為吉
    const firstPillar = dayunPillars[0];
    const dayStem = this.getDayMaster({ day: { stem: monthPillar.stem } }).element;
    const pillarEl = this._stemToElement(firstPillar.stem);
    const generateMap = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const isFavorable = dayStem === pillarEl || generateMap[pillarEl] === dayStem;

    return {
      startAge,
      startAgeFormatted,
      isForward,
      gender,
      isFavorable,
      targetTerm,
      targetDate: this._formatDate(targetDate),
      pillars: dayunPillars
    };
  }

  /**
   * 獲取日主（日干）
   * @param {Object} bazi - 八字對象（至少包含 day 柱）
   * @returns {Object} 日主信息 { stem, element, yinYang, label }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.getDayMaster({ day: { stem: '甲' } })
   * // => { stem: '甲', element: 'wood', yinYang: 'yang', label: '陽木' }
   */
  getDayMaster(bazi) {
    this._ensureLoaded();

    if (!bazi || !bazi.day || !bazi.day.stem) {
      throw new Error('無效的八字對象，缺少日柱信息');
    }

    const stem = bazi.day.stem;
    this._validateStem(stem);

    const stemIndex = BaziEngine.STEMS.indexOf(stem);
    const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
    const labels = ['陽木', '陰木', '陽火', '陰火', '陽土', '陰土', '陽金', '陰金', '陽水', '陰水'];
    const elementNames = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

    return {
      stem,
      element: elements[stemIndex],
      elementName: elementNames[elements[stemIndex]],
      yinYang: stemIndex % 2 === 0 ? 'yang' : 'yin',
      label: labels[stemIndex]
    };
  }

  /**
   * 獲取十神
   * 根據日干和目標天干計算十神關係
   * @param {string} dayStem - 日干
   * @param {string} targetStem - 目標天干
   * @returns {Object} 十神信息 { name, type, description }
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.getTenGod('甲', '乙') // => { name: '劫財', type: 'peer', ... }
   */
  getTenGod(dayStem, targetStem) {
    this._ensureLoaded();

    this._validateStem(dayStem);
    this._validateStem(targetStem);

    // 從數據中查詢
    if (this.tenGods && this.tenGods[dayStem] && this.tenGods[dayStem][targetStem]) {
      const name = this.tenGods[dayStem][targetStem];
      return {
        name,
        type: this._getTenGodType(name),
        description: this._getTenGodDescription(name)
      };
    }

    // 備用計算
    return this._calculateTenGod(dayStem, targetStem);
  }

  /**
   * 獲取地支關係
   * 分析地支之間的六合、三合、三會、六沖、三刑、六害等關係
   * @param {string[]} branches - 地支數組（最多4個）
   * @returns {Object} 地支關係對象
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.getBranchRelations(['子', '午', '卯', '酉'])
   * // => { liuHe: [], sanHe: [], sanHui: [], liuChong: [...], sanXing: [], liuHai: [] }
   */
  getBranchRelations(branches) {
    this._ensureLoaded();

    if (!Array.isArray(branches) || branches.length < 2) {
      throw new Error('地支數組必須包含至少2個地支');
    }

    // 過濾掉無效的地支值（如 '?'）
    const validBranches = branches.filter(b => b && b !== '?' && typeof b === 'string');
    
    if (validBranches.length < 2) {
      return {
        liuHe: [], sanHe: [], sanHui: [], liuChong: [], sanXing: [], liuHai: [], summary: []
      };
    }

    validBranches.forEach(branch => this._validateBranch(branch));

    const result = {
      liuHe: [],      // 六合
      sanHe: [],      // 三合
      sanHui: [],     // 三會
      liuChong: [],   // 六沖
      sanXing: [],    // 三刑
      liuHai: [],     // 六害
      summary: []
    };

    if (!this.branchRelations) {
      return result;
    }

    // 檢查六合
    this._checkLiuHe(validBranches, result);

    // 檢查三合
    this._checkSanHe(validBranches, result);

    // 檢查三會
    this._checkSanHui(validBranches, result);

    // 檢查六沖
    this._checkLiuChong(validBranches, result);

    // 檢查三刑
    this._checkSanXing(validBranches, result);

    // 檢查六害
    this._checkLiuHai(validBranches, result);

    // 生成摘要
    result.summary = this._generateRelationSummary(result);

    return result;
  }

  /**
   * 獲取藏干
   * @param {string} branch - 地支名稱
   * @returns {string[]} 藏干列表
   * @throws {Error} 參數無效時拋出錯誤
   * @example
   * engine.getHiddenStems('丑') // => ['己', '癸', '辛']
   */
  getHiddenStems(branch) {
    this._ensureLoaded();

    this._validateBranch(branch);

    if (this.hiddenStems && this.hiddenStems[branch]) {
      return [...this.hiddenStems[branch]];
    }

    // 默認藏干數據
    const defaultHiddenStems = {
      '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
      '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'],
      '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
      '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
    };

    return [...(defaultHiddenStems[branch] || [])];
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
    // 十神備用數據
    this.tenGods = {
      '甲': { '甲': '比肩', '乙': '劫財', '丙': '食神', '丁': '傷官', '戊': '偏財', '己': '正財', '庚': '七殺', '辛': '正官', '壬': '偏印', '癸': '正印' },
      '乙': { '甲': '劫財', '乙': '比肩', '丙': '傷官', '丁': '食神', '戊': '正財', '己': '偏財', '庚': '正官', '辛': '七殺', '壬': '正印', '癸': '偏印' },
      '丙': { '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫財', '戊': '食神', '己': '傷官', '庚': '偏財', '辛': '正財', '壬': '七殺', '癸': '正官' },
      '丁': { '甲': '正印', '乙': '偏印', '丙': '劫財', '丁': '比肩', '戊': '傷官', '己': '食神', '庚': '正財', '辛': '偏財', '壬': '正官', '癸': '七殺' },
      '戊': { '甲': '七殺', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫財', '庚': '食神', '辛': '傷官', '壬': '偏財', '癸': '正財' },
      '己': { '甲': '正官', '乙': '七殺', '丙': '正印', '丁': '偏印', '戊': '劫財', '己': '比肩', '庚': '傷官', '辛': '食神', '壬': '正財', '癸': '偏財' },
      '庚': { '甲': '偏財', '乙': '正財', '丙': '七殺', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫財', '壬': '食神', '癸': '傷官' },
      '辛': { '甲': '正財', '乙': '偏財', '丙': '正官', '丁': '七殺', '戊': '正印', '己': '偏印', '庚': '劫財', '辛': '比肩', '壬': '傷官', '癸': '食神' },
      '壬': { '甲': '食神', '乙': '傷官', '丙': '偏財', '丁': '正財', '戊': '七殺', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫財' },
      '癸': { '甲': '傷官', '乙': '食神', '丙': '正財', '丁': '偏財', '戊': '正官', '己': '七殺', '庚': '正印', '辛': '偏印', '壬': '劫財', '癸': '比肩' }
    };

    // 地支關係備用數據
    this.branchRelations = {
      '六合': { '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '火' },
      '三合': { '申子辰': '水', '亥卯未': '木', '寅午戌': '火', '巳酉丑': '金' },
      '三會': { '寅卯辰': '木', '巳午未': '火', '申酉戌': '金', '亥子丑': '水' },
      '六沖': { '子午': true, '丑未': true, '寅申': true, '卯酉': true, '辰戌': true, '巳亥': true },
      '三刑': { '寅巳申': '無恩之刑', '丑戌未': '恃勢之刑', '子卯': '無禮之刑', '辰辰': '自刑', '午午': '自刑', '酉酉': '自刑', '亥亥': '自刑' },
      '六害': { '子未': true, '丑午': true, '寅巳': true, '卯辰': true, '申亥': true, '酉戌': true }
    };

    // 藏干備用數據
    this.hiddenStems = {
      '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
      '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'],
      '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
      '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
    };

    // 節氣備用數據（2026年）
    this.solarTerms = {
      '2026': {
        '小寒': '2026-01-05', '立春': '2026-02-04', '驚蟄': '2026-03-05',
        '清明': '2026-04-04', '立夏': '2026-05-05', '芒種': '2026-06-05',
        '小暑': '2026-07-07', '立秋': '2026-08-07', '白露': '2026-09-07',
        '寒露': '2026-10-08', '立冬': '2026-11-07', '大雪': '2026-12-07'
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
   * 確保輸入是有效的 Date 對象
   * @private
   * @param {Date|string|number} input - 輸入值
   * @returns {Date} Date 對象
   */
  _ensureDate(input) {
    if (input instanceof Date) {
      return new Date(input.getTime());
    }

    if (typeof input === 'number') {
      return new Date(input);
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();

      // 處理 YYYY-MM-DD 格式
      const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }

      // 處理 YYYY/MM/DD 格式
      const match2 = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (match2) {
        return new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
      }

      // 嘗試原生解析
      return new Date(trimmed);
    }

    throw new Error(`無法處理的日期類型: ${typeof input}`);
  }

  /**
   * 驗證日期是否有效
   * @private
   * @param {Date} date - 日期對象
   * @returns {boolean} 是否有效
   */
  _isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
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
    if (!BaziEngine.STEMS.includes(stem)) {
      throw new Error(`無效的天干: ${stem}，有效值為: ${BaziEngine.STEMS.join(', ')}`);
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
    if (!BaziEngine.BRANCHES.includes(branch)) {
      throw new Error(`無效的地支: ${branch}，有效值為: ${BaziEngine.BRANCHES.join(', ')}`);
    }
  }

  /**
   * 解析時間字符串獲取小時
   * @private
   * @param {string} timeStr - 時間字符串 (HH:mm 格式)
   * @returns {number} 小時數 (0-23)
   */
  _parseHour(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      throw new Error(`無效的時間格式: ${timeStr}`);
    }

    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error(`時間格式必須為 HH:mm，收到: ${timeStr}`);
    }

    const hour = parseInt(match[1]);
    const minute = parseInt(match[2]);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`無效的時間值: ${timeStr}`);
    }

    return hour;
  }

  /**
   * 根據小時獲取時辰地支
   * @private
   * @param {number} hour - 小時數 (0-23)
   * @returns {Object} { branch, isCrossDay }
   */
  _getHourBranch(hour) {
    // 處理 23 點（子時，跨日）
    if (hour === 23) {
      return { branch: '子', isCrossDay: true };
    }

    // 其他時辰
    const branchIndex = Math.floor((hour + 1) / 2);
    return { branch: BaziEngine.BRANCHES[branchIndex], isCrossDay: false };
  }

  /**
   * 根據節氣獲取月支
   * @private
   * @param {Date} date - 日期對象
   * @returns {Object} { branch, solarTerm }
   */
  _getMonthBranchBySolarTerm(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 獲取當年的節氣數據
    const yearTerms = this.solarTerms && this.solarTerms[year.toString()];

    if (yearTerms) {
      // 檢查每個節氣
      const termOrder = [
        '小寒', '立春', '驚蟄', '清明', '立夏', '芒種',
        '小暑', '立秋', '白露', '寒露', '立冬', '大雪'
      ];

      for (let i = termOrder.length - 1; i >= 0; i--) {
        const termName = termOrder[i];
        const termDateStr = yearTerms[termName];
        if (termDateStr) {
          const termDate = this._ensureDate(termDateStr);
          if (date >= termDate) {
            return {
              branch: BaziEngine.MONTH_BRANCH_BY_SOLAR_TERM[termName],
              solarTerm: termName
            };
          }
        }
      }

      // 如果在小寒之前，屬於前一年的大雪月（子月）
      return { branch: '子', solarTerm: '大雪' };
    }

    // 備用計算：使用簡化的節氣計算
    return this._getMonthBranchBySolarTermFallback(year, month, day);
  }

  /**
   * 備用的節氣月支計算
   * @private
   * @param {number} year - 年份
   * @param {number} month - 月份
   * @param {number} day - 日期
   * @returns {Object} { branch, solarTerm }
   */
  _getMonthBranchBySolarTermFallback(year, month, day) {
    // 簡化的節氣日期表（近似值）
    const solarTermDates = {
      1: [{ day: 5, term: '小寒', branch: '丑' }, { day: 20, term: '大寒', branch: '丑' }],
      2: [{ day: 4, term: '立春', branch: '寅' }, { day: 19, term: '雨水', branch: '寅' }],
      3: [{ day: 5, term: '驚蟄', branch: '卯' }, { day: 20, term: '春分', branch: '卯' }],
      4: [{ day: 4, term: '清明', branch: '辰' }, { day: 20, term: '穀雨', branch: '辰' }],
      5: [{ day: 5, term: '立夏', branch: '巳' }, { day: 21, term: '小滿', branch: '巳' }],
      6: [{ day: 5, term: '芒種', branch: '午' }, { day: 21, term: '夏至', branch: '午' }],
      7: [{ day: 7, term: '小暑', branch: '未' }, { day: 22, term: '大暑', branch: '未' }],
      8: [{ day: 7, term: '立秋', branch: '申' }, { day: 23, term: '處暑', branch: '申' }],
      9: [{ day: 7, term: '白露', branch: '酉' }, { day: 23, term: '秋分', branch: '酉' }],
      10: [{ day: 8, term: '寒露', branch: '戌' }, { day: 23, term: '霜降', branch: '戌' }],
      11: [{ day: 7, term: '立冬', branch: '亥' }, { day: 22, term: '小雪', branch: '亥' }],
      12: [{ day: 7, term: '大雪', branch: '子' }, { day: 22, term: '冬至', branch: '子' }]
    };

    const monthTerms = solarTermDates[month];
    if (monthTerms) {
      // 檢查是否在第一個節氣之後
      if (day >= monthTerms[0].day) {
        return { branch: monthTerms[0].branch, solarTerm: monthTerms[0].term };
      }
    }

    // 如果在本月第一個節氣之前，屬於上個月
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthTerms = solarTermDates[prevMonth];
    if (prevMonthTerms) {
      return { branch: prevMonthTerms[0].branch, solarTerm: prevMonthTerms[0].term };
    }

    // 默認
    return { branch: '丑', solarTerm: '小寒' };
  }

  /**
   * 獲取節氣日期
   * @private
   * @param {number} year - 年份
   * @param {string} termName - 節氣名稱
   * @returns {Date} 節氣日期
   */
  _getSolarTermDate(year, termName) {
    const yearTerms = this.solarTerms && this.solarTerms[year.toString()];
    if (yearTerms && yearTerms[termName]) {
      return this._ensureDate(yearTerms[termName]);
    }

    // 備用計算
    const termDates = {
      '小寒': new Date(year, 0, 5), '立春': new Date(year, 1, 4),
      '驚蟄': new Date(year, 2, 5), '清明': new Date(year, 3, 4),
      '立夏': new Date(year, 4, 5), '芒種': new Date(year, 5, 5),
      '小暑': new Date(year, 6, 7), '立秋': new Date(year, 7, 7),
      '白露': new Date(year, 8, 7), '寒露': new Date(year, 9, 8),
      '立冬': new Date(year, 10, 7), '大雪': new Date(year, 11, 7)
    };

    return termDates[termName] || new Date(year, 0, 1);
  }

  /**
   * 獲取納音
   * @private
   * @param {string} stem - 天干
   * @param {string} branch - 地支
   * @returns {string} 納音名稱
   */
  _getNayin(stem, branch) {
    const nayinMap = {
      '甲子': '海中金', '甲午': '砂中金', '乙丑': '海中金', '乙未': '砂中金',
      '丙寅': '爐中火', '丙申': '山下火', '丁卯': '爐中火', '丁酉': '山下火',
      '戊辰': '大林木', '戊戌': '平地木', '己巳': '大林木', '己亥': '平地木',
      '庚午': '路旁土', '庚子': '壁上土', '辛未': '路旁土', '辛丑': '壁上土',
      '壬申': '劍鋒金', '壬寅': '金箔金', '癸酉': '劍鋒金', '癸卯': '金箔金',
      '甲戌': '山頭火', '甲辰': '覆燈火', '乙亥': '山頭火', '乙巳': '覆燈火',
      '丙子': '澗下水', '丙午': '天河水', '丁丑': '澗下水', '丁未': '天河水',
      '戊寅': '城頭土', '戊申': '大驛土', '己卯': '城頭土', '己酉': '大驛土',
      '庚辰': '白蠟金', '庚戌': '釵環金', '辛巳': '白蠟金', '辛亥': '釵環金',
      '壬午': '楊柳木', '壬子': '桑柘木', '癸未': '楊柳木', '癸丑': '桑柘木',
      '甲申': '泉中水', '甲寅': '大溪水', '乙酉': '泉中水', '乙卯': '大溪水',
      '丙戌': '屋上土', '丙辰': '沙中土', '丁亥': '屋上土', '丁巳': '沙中土',
      '戊子': '霹靂火', '戊午': '天上火', '己丑': '霹靂火', '己未': '天上火',
      '庚寅': '松柏木', '庚申': '石榴木', '辛卯': '松柏木', '辛酉': '石榴木',
      '壬辰': '長流水', '壬戌': '大海水', '癸巳': '長流水', '癸亥': '大海水'
    };

    return nayinMap[stem + branch] || '';
  }

  /**
   * 創建未知柱（當時間未知時）
   * @private
   * @param {string} label - 柱的標籤
   * @returns {Object} 未知柱對象
   */
  _createUnknownPillar(label) {
    return {
      stem: '?',
      branch: '?',
      name: '??',
      nayin: '',
      label: `${label}柱`,
      isUnknown: true
    };
  }

  /**
   * 天干轉五行
   * @private
   * @param {string} stem - 天干
   * @returns {string} 五行
   */
  _stemToElement(stem) {
    const elements = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
    const idx = BaziEngine.STEMS.indexOf(stem);
    return idx >= 0 ? elements[idx] : 'earth';
  }

  /**
   * 計算所有十神
   * @private
   * @param {string} dayStem - 日干
   * @param {Object} pillars - 四柱對象
   * @returns {Object} 十神信息
   */
  _calculateAllTenGods(dayStem, pillars) {
    const result = {};

    for (const [position, pillar] of Object.entries(pillars)) {
      if (pillar.isUnknown) {
        result[position] = { name: '?', type: 'unknown', description: '時間未知' };
        continue;
      }

      if (pillar.stem) {
        result[position] = this.getTenGod(dayStem, pillar.stem);
      }
    }

    return result;
  }

  /**
   * 備用十神計算
   * @private
   * @param {string} dayStem - 日干
   * @param {string} targetStem - 目標天干
   * @returns {Object} 十神信息
   */
  _calculateTenGod(dayStem, targetStem) {
    const dayIndex = BaziEngine.STEMS.indexOf(dayStem);
    const targetIndex = BaziEngine.STEMS.indexOf(targetStem);

    // 計算五行關係
    const dayElement = Math.floor(dayIndex / 2);
    const targetElement = Math.floor(targetIndex / 2);
    const elements = ['wood', 'fire', 'earth', 'metal', 'water'];

    const dayElem = elements[dayElement];
    const targetElem = elements[targetElement];

    // 同五行
    if (dayElem === targetElem) {
      if (dayIndex === targetIndex) {
        return { name: '比肩', type: 'peer', description: '與我相同' };
      } else {
        return { name: '劫財', type: 'peer', description: '與我同類' };
      }
    }

    // 我生
    const generateMap = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    if (generateMap[dayElem] === targetElem) {
      if (dayIndex % 2 === targetIndex % 2) {
        return { name: '食神', type: 'output', description: '我生者（同性）' };
      } else {
        return { name: '傷官', type: 'output', description: '我生者（異性）' };
      }
    }

    // 我剋
    const controlMap = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    if (controlMap[dayElem] === targetElem) {
      if (dayIndex % 2 === targetIndex % 2) {
        return { name: '偏財', type: 'wealth', description: '我剋者（同性）' };
      } else {
        return { name: '正財', type: 'wealth', description: '我剋者（異性）' };
      }
    }

    // 剋我
    if (controlMap[targetElem] === dayElem) {
      if (dayIndex % 2 === targetIndex % 2) {
        return { name: '七殺', type: 'officer', description: '剋我者（同性）' };
      } else {
        return { name: '正官', type: 'officer', description: '剋我者（異性）' };
      }
    }

    // 生我
    if (generateMap[targetElem] === dayElem) {
      if (dayIndex % 2 === targetIndex % 2) {
        return { name: '偏印', type: 'resource', description: '生我者（同性）' };
      } else {
        return { name: '正印', type: 'resource', description: '生我者（異性）' };
      }
    }

    return { name: '未知', type: 'unknown', description: '無法計算' };
  }

  /**
   * 獲取十神類型
   * @private
   * @param {string} name - 十神名稱
   * @returns {string} 類型
   */
  _getTenGodType(name) {
    const typeMap = {
      '比肩': 'peer', '劫財': 'peer',
      '食神': 'output', '傷官': 'output',
      '偏財': 'wealth', '正財': 'wealth',
      '七殺': 'officer', '正官': 'officer',
      '偏印': 'resource', '正印': 'resource'
    };
    return typeMap[name] || 'unknown';
  }

  /**
   * 獲取十神描述
   * @private
   * @param {string} name - 十神名稱
   * @returns {string} 描述
   */
  _getTenGodDescription(name) {
    const descMap = {
      '比肩': '與我相同，代表兄弟、朋友、競爭',
      '劫財': '與我同類，代表姐妹、同事、合作',
      '食神': '我生者（同性），代表才華、口福、子女（女）',
      '傷官': '我生者（異性），代表智慧、叛逆、技藝',
      '偏財': '我剋者（同性），代表意外之財、父親、情人',
      '正財': '我剋者（異性），代表正當收入、妻子（男）、穩定',
      '七殺': '剋我者（同性），代表壓力、挑戰、權威',
      '正官': '剋我者（異性），代表地位、丈夫（女）、規矩',
      '偏印': '生我者（同性），代表偏門學問、繼母、貴人',
      '正印': '生我者（異性），代表學問、母親、保護'
    };
    return descMap[name] || '';
  }

  /**
   * 獲取所有藏干
   * @private
   * @param {Object} pillars - 四柱對象
   * @returns {Object} 各柱藏干
   */
  _getAllHiddenStems(pillars) {
    const result = {};

    for (const [position, pillar] of Object.entries(pillars)) {
      if (pillar.isUnknown) {
        result[position] = [];
        continue;
      }

      if (pillar.branch) {
        result[position] = this.getHiddenStems(pillar.branch);
      }
    }

    return result;
  }

  /**
   * 檢查六合
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkLiuHe(branches, result) {
    const liuHe = this.branchRelations['六合'];
    if (!liuHe) return;

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const pair = branches[i] + branches[j];
        const reversePair = branches[j] + branches[i];

        if (liuHe[pair] || liuHe[reversePair]) {
          result.liuHe.push({
            branches: [branches[i], branches[j]],
            element: liuHe[pair] || liuHe[reversePair],
            positions: [i, j]
          });
        }
      }
    }
  }

  /**
   * 檢查三合
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkSanHe(branches, result) {
    const sanHe = this.branchRelations['三合'];
    if (!sanHe) return;

    // 檢查所有三地支組合
    if (branches.length >= 3) {
      for (let i = 0; i < branches.length - 2; i++) {
        for (let j = i + 1; j < branches.length - 1; j++) {
          for (let k = j + 1; k < branches.length; k++) {
            const combo = [branches[i], branches[j], branches[k]].sort().join('');
            for (const [key, element] of Object.entries(sanHe)) {
              const sortedKey = key.split('').sort().join('');
              if (combo === sortedKey) {
                result.sanHe.push({
                  branches: [branches[i], branches[j], branches[k]],
                  element,
                  positions: [i, j, k]
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * 檢查三會
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkSanHui(branches, result) {
    const sanHui = this.branchRelations['三會'];
    if (!sanHui) return;

    if (branches.length >= 3) {
      for (let i = 0; i < branches.length - 2; i++) {
        for (let j = i + 1; j < branches.length - 1; j++) {
          for (let k = j + 1; k < branches.length; k++) {
            const combo = [branches[i], branches[j], branches[k]].sort().join('');
            for (const [key, element] of Object.entries(sanHui)) {
              const sortedKey = key.split('').sort().join('');
              if (combo === sortedKey) {
                result.sanHui.push({
                  branches: [branches[i], branches[j], branches[k]],
                  element,
                  positions: [i, j, k]
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * 檢查六沖
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkLiuChong(branches, result) {
    const liuChong = this.branchRelations['六沖'];
    if (!liuChong) return;

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const pair = branches[i] + branches[j];
        const reversePair = branches[j] + branches[i];

        if (liuChong[pair] || liuChong[reversePair]) {
          result.liuChong.push({
            branches: [branches[i], branches[j]],
            positions: [i, j]
          });
        }
      }
    }
  }

  /**
   * 檢查三刑
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkSanXing(branches, result) {
    const sanXing = this.branchRelations['三刑'];
    if (!sanXing) return;

    // 檢查所有地支對和三地支組合
    for (const [key, type] of Object.entries(sanXing)) {
      const keyBranches = key.split('');

      if (keyBranches.length === 2) {
        // 二刑（如子卯刑）
        const hasBoth = keyBranches.every(b => branches.includes(b));
        if (hasBoth) {
          result.sanXing.push({
            branches: keyBranches,
            type,
            isPartial: true
          });
        }
      } else if (keyBranches.length === 3) {
        // 三刑
        const hasAll = keyBranches.every(b => branches.includes(b));
        if (hasAll) {
          result.sanXing.push({
            branches: keyBranches,
            type,
            isPartial: false
          });
        }
      }
    }
  }

  /**
   * 檢查六害
   * @private
   * @param {string[]} branches - 地支數組
   * @param {Object} result - 結果對象
   */
  _checkLiuHai(branches, result) {
    const liuHai = this.branchRelations['六害'];
    if (!liuHai) return;

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const pair = branches[i] + branches[j];
        const reversePair = branches[j] + branches[i];

        if (liuHai[pair] || liuHai[reversePair]) {
          result.liuHai.push({
            branches: [branches[i], branches[j]],
            positions: [i, j]
          });
        }
      }
    }
  }

  /**
   * 生成關係摘要
   * @private
   * @param {Object} result - 關係結果
   * @returns {string[]} 摘要數組
   */
  _generateRelationSummary(result) {
    const summary = [];

    if (result.liuHe.length > 0) {
      result.liuHe.forEach(rel => {
        summary.push(`${rel.branches.join('')}六合化${rel.element}`);
      });
    }

    if (result.sanHe.length > 0) {
      result.sanHe.forEach(rel => {
        summary.push(`${rel.branches.join('')}三合化${rel.element}`);
      });
    }

    if (result.sanHui.length > 0) {
      result.sanHui.forEach(rel => {
        summary.push(`${rel.branches.join('')}三會化${rel.element}`);
      });
    }

    if (result.liuChong.length > 0) {
      result.liuChong.forEach(rel => {
        summary.push(`${rel.branches.join('')}六沖`);
      });
    }

    if (result.sanXing.length > 0) {
      result.sanXing.forEach(rel => {
        summary.push(`${rel.branches.join('')}${rel.type}`);
      });
    }

    if (result.liuHai.length > 0) {
      result.liuHai.forEach(rel => {
        summary.push(`${rel.branches.join('')}六害`);
      });
    }

    return summary;
  }

  _checkNayinMatch(pillars) {
    const nayinElement = {
      '金': 'metal', '木': 'wood', '水': 'water', '火': 'fire', '土': 'earth'
    };
    const generateMap = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const controlMap = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    const elements = [];
    for (const p of pillars) {
      if (p && p.nayin) {
        const lastChar = p.nayin.slice(-1);
        const element = nayinElement[lastChar];
        if (element) elements.push(element);
      }
    }
    if (elements.length < 2) return null;
    let harmonyCount = 0;
    let conflictCount = 0;
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (elements[i] === elements[j]) harmonyCount++;
        else if (generateMap[elements[i]] === elements[j] || generateMap[elements[j]] === elements[i]) harmonyCount++;
        else if (controlMap[elements[i]] === elements[j] || controlMap[elements[j]] === elements[i]) conflictCount++;
      }
    }
    const totalPairs = (elements.length * (elements.length - 1)) / 2;
    if (totalPairs === 0) return null;
    const harmonyRatio = harmonyCount / totalPairs;
    const conflictRatio = conflictCount / totalPairs;
    if (harmonyRatio > 0.5) return true;
    if (conflictRatio > 0.5) return false;
    return null;
  }

  /**
   * 獲取地支對應的五行（月令季節）
   * @private
   * @param {string} branch - 地支
   * @returns {string} 五行名稱
   */
  _getMonthElement(branch) {
    const map = {
      '寅': 'wood', '卯': 'wood', '辰': 'earth',
      '巳': 'fire', '午': 'fire', '未': 'earth',
      '申': 'metal', '酉': 'metal', '戌': 'earth',
      '亥': 'water', '子': 'water', '丑': 'earth'
    };
    return map[branch] || 'earth';
  }

  /**
   * 計算日主旺衰（月令旺相休囚死）
   * @private
   * @param {string} dayMasterElement - 日主五行
   * @param {string} monthBranch - 月支
   * @returns {string} 旺/相/休/囚/死
   */
  _getDayMasterStrength(dayMasterElement, monthBranch) {
    const monthEl = this._getMonthElement(monthBranch);
    // 月令為季節主氣，決定五行旺衰
    const strengthMap = {
      wood: { wood: '旺', fire: '相', water: '休', metal: '囚', earth: '死' },
      fire: { fire: '旺', earth: '相', wood: '休', water: '囚', metal: '死' },
      earth: { earth: '旺', metal: '相', fire: '休', wood: '囚', water: '死' },
      metal: { metal: '旺', water: '相', earth: '休', fire: '囚', wood: '死' },
      water: { water: '旺', wood: '相', metal: '休', earth: '囚', fire: '死' }
    };
    return strengthMap[monthEl]?.[dayMasterElement] || '休';
  }

  /**
   * 計算旬空（空亡）
   * 根據日柱干支在六十甲子中的位置，找出所屬旬的空亡地支
   * @private
   * @param {Object} dayPillar - 日柱 { stem, branch, ganzhiIndex }
   * @returns {string[]} 空亡地支陣列
   */
  _getKongWang(dayPillar) {
    if (!dayPillar || !dayPillar.ganzhiIndex) return [];
    const xun = Math.floor((dayPillar.ganzhiIndex - 1) / 10);
    const kongMap = [
      ['戌', '亥'], // 甲子旬
      ['申', '酉'], // 甲戌旬
      ['午', '未'], // 甲申旬
      ['辰', '巳'], // 甲午旬
      ['寅', '卯'], // 甲辰旬
      ['子', '丑']  // 甲寅旬
    ];
    return kongMap[xun] || [];
  }

  /**
   * 格式化日期
   * @private
   * @param {Date} date - 日期對象
   * @returns {string} 格式化後的日期字符串
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaziEngine;
}

// 瀏覽器環境全局導出
if (typeof window !== 'undefined') {
  window.BaziEngine = BaziEngine;
}

