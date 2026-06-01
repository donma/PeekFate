/**
 * 日期引擎
 * 處理日期相關計算，包含格式化、解析、節氣計算等功能
 * @version 1.0.0
 * @author FastFate
 */

class DateEngine {
  /**
   * 默認時區
   * @type {string}
   */
  static DEFAULT_TIMEZONE = 'Asia/Shanghai';

  /**
   * 二十四節氣名稱
   * @type {string[]}
   */
  static SOLAR_TERMS = [
    '小寒', '大寒', '立春', '雨水', '驚蟄', '春分',
    '清明', '穀雨', '立夏', '小滿', '芒種', '夏至',
    '小暑', '大暑', '立秋', '處暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
  ];

  /**
   * 星期名稱
   * @type {string[]}
   */
  static WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  /**
   * 格式化日期字符串模板
   * @type {Object}
   */
  static FORMAT_TOKENS = {
    YYYY: (date) => date.getFullYear().toString(),
    YY: (date) => (date.getFullYear() % 100).toString().padStart(2, '0'),
    MM: (date) => (date.getMonth() + 1).toString().padStart(2, '0'),
    DD: (date) => date.getDate().toString().padStart(2, '0'),
    HH: (date) => date.getHours().toString().padStart(2, '0'),
    hh: (date) => (date.getHours() % 12).toString().padStart(2, '0'),
    mm: (date) => date.getMinutes().toString().padStart(2, '0'),
    ss: (date) => date.getSeconds().toString().padStart(2, '0'),
    A: (date) => date.getHours() < 12 ? 'AM' : 'PM'
  };

  /**
   * 節氣計算常量 (基於2000年的數據)
   * @type {number[]}
   */
  static SOLAR_TERM_BASE = [
    6.11, 20.84, 4.15, 19.20, 6.18, 21.04,
    5.59, 20.89, 6.31, 21.86, 6.26, 21.94,
    7.44, 23.13, 7.83, 23.34, 8.23, 23.35,
    8.44, 23.54, 7.83, 22.60, 7.52, 22.25
  ];

  /**
   * 創建日期引擎實例
   * @param {string} [timezone] - 時區設置，默認為 Asia/Shanghai
   */
  constructor(timezone = DateEngine.DEFAULT_TIMEZONE) {
    this.timezone = timezone;
  }

  /**
   * 格式化日期
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @param {string} [format='YYYY-MM-DD'] - 格式模板 (YYYY, YY, MM, DD, HH, hh, mm, ss, A)
   * @returns {string} 格式化後的日期字符串
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
   * // => '2026-06-01 14:30:00'
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    let result = format;
    
    // 按照長度排序 token，確保先處理較長的 token (如 YYYY 在 YY 之前)
    const tokens = Object.keys(DateEngine.FORMAT_TOKENS).sort((a, b) => b.length - a.length);
    
    for (const token of tokens) {
      const regex = new RegExp(token, 'g');
      result = result.replace(regex, DateEngine.FORMAT_TOKENS[token](validDate));
    }

    return result;
  }

  /**
   * 解析日期字符串
   * @param {string} dateString - 日期字符串
   * @param {string} [format] - 格式模板 (可選，用於精確解析)
   * @returns {Date} 日期對象
   * @throws {Error} 無法解析時拋出錯誤
   * @example
   * engine.parseDate('2026-06-01')
   * // => Date object
   */
  parseDate(dateString, format) {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error(`無效的日期字符串: ${dateString}`);
    }

    // 嘗試使用內建解析
    const trimmed = dateString.trim();
    
    // 處理常見格式
    const date = this._parseCommonFormats(trimmed);
    if (date && this._isValidDate(date)) {
      return date;
    }

    // 使用 format 進行精確解析
    if (format) {
      return this._parseWithFormat(trimmed, format);
    }

    // 最後嘗試原生解析
    const nativeDate = new Date(trimmed);
    if (this._isValidDate(nativeDate)) {
      return nativeDate;
    }

    throw new Error(`無法解析日期字符串: ${dateString}`);
  }

  /**
   * 獲取指定日期的節氣
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @returns {string|null} 節氣名稱，如果不是節氣則返回 null
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.getSolarTerm(new Date(2026, 5, 21))
   * // => '夏至'
   */
  getSolarTerm(date) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    const year = validDate.getFullYear();
    const month = validDate.getMonth();
    const day = validDate.getDate();

    // 計算節氣索引 (每個月兩個節氣)
    const termIndex = this._calculateSolarTermIndex(year, month, day);
    
    if (termIndex !== null) {
      return DateEngine.SOLAR_TERMS[termIndex];
    }

    return null;
  }

  /**
   * 獲取星期名稱
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @param {boolean} [short=false] - 是否返回簡短名稱
   * @returns {string} 星期名稱
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.getWeekday(new Date())
   * // => '星期日'
   */
  getWeekday(date, short = false) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    const dayIndex = validDate.getDay();
    const fullName = DateEngine.WEEKDAYS[dayIndex];
    
    if (short) {
      return fullName.replace('星期', '週');
    }
    
    return fullName;
  }

  /**
   * 日期加減天數
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @param {number} days - 要加的天數（負數為減）
   * @returns {Date} 新的日期對象
   * @throws {Error} 無效日期或無效天數時拋出錯誤
   * @example
   * engine.addDays(new Date(), 7)
   * // => 7天後的日期
   */
  addDays(date, days) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    if (typeof days !== 'number' || !Number.isFinite(days)) {
      throw new Error(`無效的天數: ${days}`);
    }

    const result = new Date(validDate.getTime());
    result.setDate(result.getDate() + Math.floor(days));
    
    return result;
  }

  /**
   * 判斷是否為閏年
   * @param {number} year - 年份
   * @returns {boolean} 是否為閏年
   * @throws {Error} 無效年份時拋出錯誤
   * @example
   * engine.isLeapYear(2024)
   * // => true
   */
  isLeapYear(year) {
    if (typeof year !== 'number' || !Number.isInteger(year)) {
      throw new Error(`無效的年份: ${year}`);
    }

    if (year < 1) {
      throw new Error(`年份必須大於0: ${year}`);
    }

    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * 獲取指定月份的天數
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @returns {number} 該月的天數
   * @throws {Error} 無效參數時拋出錯誤
   * @example
   * engine.getDaysInMonth(2026, 2)
   * // => 28
   */
  getDaysInMonth(year, month) {
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1) {
      throw new Error(`無效的年份: ${year}`);
    }

    if (typeof month !== 'number' || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`無效的月份: ${month}，必須在 1-12 之間`);
    }

    // 月份天數表
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // 二月特殊處理
    if (month === 2 && this.isLeapYear(year)) {
      return 29;
    }

    return daysInMonth[month - 1];
  }

  /**
   * 計算兩個日期之間的天數差
   * @param {Date|string|number} date1 - 第一個日期
   * @param {Date|string|number} date2 - 第二個日期
   * @returns {number} 天數差（絕對值）
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.daysBetween('2026-01-01', '2026-12-31')
   * // => 364
   */
  daysBetween(date1, date2) {
    const validDate1 = this._ensureDate(date1);
    const validDate2 = this._ensureDate(date2);

    if (!this._isValidDate(validDate1)) {
      throw new Error(`無效的日期: ${date1}`);
    }
    if (!this._isValidDate(validDate2)) {
      throw new Error(`無效的日期: ${date2}`);
    }

    const timeDiff = Math.abs(validDate2.getTime() - validDate1.getTime());
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * 獲取農曆信息（簡化版本）
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @returns {Object} 農曆信息
   * @example
   * engine.getLunarDate(new Date())
   * // => { year: 2026, month: 4, day: 10, isLeapMonth: false }
   */
  getLunarDate(date) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    // 這裡使用簡化的農曆計算
    // 完整實現需要農曆數據表
    return this._calculateLunarDate(validDate);
  }

  /**
   * 獲取日期的完整信息
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @returns {Object} 日期的完整信息
   * @example
   * engine.getDateInfo(new Date())
   */
  getDateInfo(date) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    const year = validDate.getFullYear();
    const month = validDate.getMonth() + 1;
    const day = validDate.getDate();

    return {
      year,
      month,
      day,
      weekday: this.getWeekday(validDate),
      weekdayShort: this.getWeekday(validDate, true),
      dayOfWeek: validDate.getDay(),
      dayOfYear: this._getDayOfYear(validDate),
      weekOfYear: this._getWeekOfYear(validDate),
      isLeapYear: this.isLeapYear(year),
      daysInMonth: this.getDaysInMonth(year, month),
      solarTerm: this.getSolarTerm(validDate),
      lunarDate: this.getLunarDate(validDate),
      timestamp: validDate.getTime(),
      iso: validDate.toISOString(),
      formatted: this.formatDate(validDate, 'YYYY-MM-DD HH:mm:ss')
    };
  }

  // ==================== 私有方法 ====================

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
      return this.parseDate(input);
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
   * 解析常見日期格式
   * @private
   * @param {string} dateString - 日期字符串
   * @returns {Date|null} 日期對象或 null
   */
  _parseCommonFormats(dateString) {
    const formats = [
      // ISO 8601
      { regex: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/, parse: (m) => new Date(dateString) },
      // YYYY-MM-DD
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parse: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
      // YYYY/MM/DD
      { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parse: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
      // YYYYMMDD
      { regex: /^(\d{4})(\d{2})(\d{2})$/, parse: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
      // MM-DD-YYYY
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: (m) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])) },
      // DD/MM/YYYY
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])) },
      // 時間戳字符串
      { regex: /^\d{13}$/, parse: (m) => new Date(parseInt(dateString)) },
      { regex: /^\d{10}$/, parse: (m) => new Date(parseInt(dateString) * 1000) }
    ];

    for (const format of formats) {
      const match = dateString.match(format.regex);
      if (match) {
        const date = format.parse(match);
        if (this._isValidDate(date)) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * 使用格式模板解析日期
   * @private
   * @param {string} dateString - 日期字符串
   * @param {string} format - 格式模板
   * @returns {Date} 日期對象
   */
  _parseWithFormat(dateString, format) {
    const tokenPatterns = {
      'YYYY': '(\\d{4})',
      'YY': '(\\d{2})',
      'MM': '(\\d{2})',
      'DD': '(\\d{2})',
      'HH': '(\\d{2})',
      'hh': '(\\d{2})',
      'mm': '(\\d{2})',
      'ss': '(\\d{2})',
      'A': '(AM|PM)'
    };

    let pattern = format;
    const tokenOrder = [];

    // 按長度排序 token
    const tokens = Object.keys(tokenPatterns).sort((a, b) => b.length - a.length);

    for (const token of tokens) {
      const index = pattern.indexOf(token);
      if (index !== -1) {
        tokenOrder.push(token);
        pattern = pattern.replace(token, tokenPatterns[token]);
      }
    }

    const regex = new RegExp(`^${pattern}$`);
    const match = dateString.match(regex);

    if (!match) {
      throw new Error(`日期字符串 "${dateString}" 與格式 "${format}" 不匹配`);
    }

    const values = {};
    tokenOrder.forEach((token, index) => {
      values[token] = match[index + 1];
    });

    let year = values.YYYY ? parseInt(values.YYYY) : (values.YY ? 2000 + parseInt(values.YY) : new Date().getFullYear());
    let month = values.MM ? parseInt(values.MM) - 1 : 0;
    let day = values.DD ? parseInt(values.DD) : 1;
    let hours = values.HH ? parseInt(values.HH) : (values.hh ? parseInt(values.hh) : 0);
    const minutes = values.mm ? parseInt(values.mm) : 0;
    const seconds = values.ss ? parseInt(values.ss) : 0;

    // 處理 AM/PM
    if (values.A) {
      if (values.A === 'PM' && hours < 12) {
        hours += 12;
      } else if (values.A === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    const date = new Date(year, month, day, hours, minutes, seconds);

    if (!this._isValidDate(date)) {
      throw new Error(`解析後的日期無效: ${dateString}`);
    }

    return date;
  }

  /**
   * 計算節氣索引
   * @private
   * @param {number} year - 年份
   * @param {number} month - 月份 (0-11)
   * @param {number} day - 日期
   * @returns {number|null} 節氣索引或 null
   */
  _calculateSolarTermIndex(year, month, day) {
    // 簡化的節氣計算算法
    // 基於年份和月份計算近似節氣日期
    
    const termIndex = month * 2; // 每月兩個節氣
    
    // 計算節氣日期（簡化算法）
    const termDay1 = this._getSolarTermDay(year, termIndex);
    const termDay2 = this._getSolarTermDay(year, termIndex + 1);

    if (day === termDay1) {
      return termIndex;
    }
    if (day === termDay2) {
      return termIndex + 1;
    }

    return null;
  }

  /**
   * 獲取節氣日期
   * @private
   * @param {number} year - 年份
   * @param {number} termIndex - 節氣索引 (0-23)
   * @returns {number} 日期
   */
  _getSolarTermDay(year, termIndex) {
    // 簡化的節氣計算
    // 實際應用中應使用更精確的天文算法
    
    const baseDay = DateEngine.SOLAR_TERM_BASE[termIndex];
    const yearOffset = year - 2000;
    
    // 計算閏年偏移
    const leapYears = Math.floor(yearOffset / 4) - Math.floor(yearOffset / 100) + Math.floor(yearOffset / 400);
    const dayOffset = leapYears * 0.2422;
    
    // 某些年份的特殊調整
    const adjustments = this._getSolarTermAdjustments(year, termIndex);
    
    return Math.floor(baseDay + dayOffset + adjustments);
  }

  /**
   * 獲取節氣調整值
   * @private
   * @param {number} year - 年份
   * @param {number} termIndex - 節氣索引
   * @returns {number} 調整值
   */
  _getSolarTermAdjustments(year, termIndex) {
    // 世紀年份的特殊調整
    const century = Math.floor(year / 100);
    const yearInCentury = year % 100;
    
    // 簡化調整
    if (yearInCentury === 0) {
      return -1;
    }
    
    return 0;
  }

  /**
   * 計算農曆日期（簡化版本）
   * @private
   * @param {Date} date - 日期對象
   * @returns {Object} 農曆信息
   */
  _calculateLunarDate(date) {
    // 這是一個簡化的農曆計算
    // 完整的農曆計算需要農曆數據表
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // 簡化計算：假設農曆與公曆有固定偏移
    // 實際應用中應使用農曆算法庫
    
    return {
      year: year,
      month: month + 1,
      day: day,
      isLeapMonth: false,
      yearGanZhi: this._getGanZhiYear(year),
      zodiac: this._getZodiac(year)
    };
  }

  /**
   * 獲取天干地支年份
   * @private
   * @param {number} year - 年份
   * @returns {string} 天干地支
   */
  _getGanZhiYear(year) {
    const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    const stemIndex = (year - 4) % 10;
    const branchIndex = (year - 4) % 12;
    
    return heavenlyStems[stemIndex] + earthlyBranches[branchIndex];
  }

  /**
   * 獲取生肖
   * @private
   * @param {number} year - 年份
   * @returns {string} 生肖
   */
  _getZodiac(year) {
    const zodiacs = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
    return zodiacs[(year - 4) % 12];
  }

  /**
   * 獲取一年中的第幾天
   * @private
   * @param {Date} date - 日期對象
   * @returns {number} 一年中的第幾天
   */
  _getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * 獲取一年中的第幾週
   * @private
   * @param {Date} date - 日期對象
   * @returns {number} 一年中的第幾週
   */
  _getWeekOfYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * 添加月份
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @param {number} months - 要添加的月份數（負數為減）
   * @returns {Date} 新的日期對象
   * @throws {Error} 無效參數時拋出錯誤
   * @example
   * engine.addMonths(new Date(), 3)
   * // => 3個月後的日期
   */
  addMonths(date, months) {
    const validDate = this._ensureDate(date);
    
    if (!this._isValidDate(validDate)) {
      throw new Error(`無效的日期: ${date}`);
    }

    if (typeof months !== 'number' || !Number.isFinite(months)) {
      throw new Error(`無效的月份數: ${months}`);
    }

    const result = new Date(validDate.getTime());
    const targetMonth = result.getMonth() + Math.floor(months);
    const targetDate = result.getDate();
    
    result.setMonth(targetMonth);
    
    // 處理月份天數不一致的情況
    // 例如：1月31日 + 1個月 = 2月28/29日
    if (result.getDate() !== targetDate) {
      result.setDate(0); // 設置為上個月的最後一天
    }
    
    return result;
  }

  /**
   * 添加年份
   * @param {Date|string|number} date - 日期對象、日期字符串或時間戳
   * @param {number} years - 要添加的年數（負數為減）
   * @returns {Date} 新的日期對象
   * @throws {Error} 無效參數時拋出錯誤
   * @example
   * engine.addYears(new Date(), 1)
   * // => 1年後的日期
   */
  addYears(date, years) {
    return this.addMonths(date, years * 12);
  }

  /**
   * 比較兩個日期
   * @param {Date|string|number} date1 - 第一個日期
   * @param {Date|string|number} date2 - 第二個日期
   * @returns {number} -1: date1 < date2, 0: 相等, 1: date1 > date2
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.compareDates('2026-01-01', '2026-12-31')
   * // => -1
   */
  compareDates(date1, date2) {
    const validDate1 = this._ensureDate(date1);
    const validDate2 = this._ensureDate(date2);

    if (!this._isValidDate(validDate1)) {
      throw new Error(`無效的日期: ${date1}`);
    }
    if (!this._isValidDate(validDate2)) {
      throw new Error(`無效的日期: ${date2}`);
    }

    const time1 = validDate1.getTime();
    const time2 = validDate2.getTime();

    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    return 0;
  }

  /**
   * 判斷日期是否在範圍內
   * @param {Date|string|number} date - 要檢查的日期
   * @param {Date|string|number} startDate - 開始日期
   * @param {Date|string|number} endDate - 結束日期
   * @returns {boolean} 是否在範圍內
   * @throws {Error} 無效日期時拋出錯誤
   * @example
   * engine.isDateInRange('2026-06-15', '2026-06-01', '2026-06-30')
   * // => true
   */
  isDateInRange(date, startDate, endDate) {
    const validDate = this._ensureDate(date);
    const validStart = this._ensureDate(startDate);
    const validEnd = this._ensureDate(endDate);

    if (!this._isValidDate(validDate)) throw new Error(`無效的日期: ${date}`);
    if (!this._isValidDate(validStart)) throw new Error(`無效的開始日期: ${startDate}`);
    if (!this._isValidDate(validEnd)) throw new Error(`無效的結束日期: ${endDate}`);

    const time = validDate.getTime();
    const start = validStart.getTime();
    const end = validEnd.getTime();

    return time >= start && time <= end;
  }

  /**
   * 獲取當前時間戳
   * @returns {number} 時間戳（毫秒）
   */
  now() {
    return Date.now();
  }

  /**
   * 創建日期對象
   * @param {number} year - 年份
   * @param {number} month - 月份 (1-12)
   * @param {number} day - 日期
   * @param {number} [hours=0] - 小時
   * @param {number} [minutes=0] - 分鐘
   * @param {number} [seconds=0] - 秒
   * @returns {Date} 日期對象
   * @throws {Error} 無效參數時拋出錯誤
   */
  create(year, month, day, hours = 0, minutes = 0, seconds = 0) {
    if (typeof year !== 'number' || year < 1) {
      throw new Error(`無效的年份: ${year}`);
    }
    if (typeof month !== 'number' || month < 1 || month > 12) {
      throw new Error(`無效的月份: ${month}，必須在 1-12 之間`);
    }
    if (typeof day !== 'number' || day < 1 || day > this.getDaysInMonth(year, month)) {
      throw new Error(`無效的日期: ${day}，${year}年${month}月最多有 ${this.getDaysInMonth(year, month)} 天`);
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    
    if (!this._isValidDate(date)) {
      throw new Error(`無法創建日期: ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    }

    return date;
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateEngine;
}

// 瀏覽器環境全局導出
if (typeof window !== 'undefined') {
  window.DateEngine = DateEngine;
}
