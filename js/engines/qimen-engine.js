/**
 * 奇門遁甲引擎
 * 處理奇門遁甲計算
 * 
 * 主要功能：
 * 1. 時家盤計算
 * 2. 節氣判斷
 * 3. 陰陽遁確定
 * 4. 局數計算
 * 5. 九星、八門、八神排布
 * 6. 格局檢測
 */

class QimenEngine {
  constructor() {
    this.palaces = null;
    this.doors = null;
    this.stars = null;
    this.gods = null;
    this.tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    this.diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    this.jiuGong = ['坎一', '坤二', '震三', '巽四', '中五', '乾六', '兌七', '艮八', '離九'];
    this.baMen = ['休門', '生門', '傷門', '杜門', '景門', '死門', '驚門', '開門'];
    this.jiuXing = ['天蓬', '天芮', '天沖', '天輔', '天禽', '天心', '天柱', '天任', '天英'];
    this.baShen = ['值符', '騰蛇', '太陰', '六合', '白虎', '玄武', '九地', '九天'];
    this.solarTerms = this._initSolarTerms();
    this.patterns = this._initPatterns();
  }

  /**
   * 初始化節氣數據
   * @returns {Array} 節氣列表
   */
  _initSolarTerms() {
    return [
      { name: '冬至', month: 12, dun: '陽', ju: [1, 7, 4] },
      { name: '小寒', month: 1, dun: '陽', ju: [2, 8, 5] },
      { name: '大寒', month: 1, dun: '陽', ju: [3, 9, 6] },
      { name: '立春', month: 2, dun: '陽', ju: [8, 5, 2] },
      { name: '雨水', month: 2, dun: '陽', ju: [9, 6, 3] },
      { name: '驚蟄', month: 3, dun: '陽', ju: [1, 7, 4] },
      { name: '春分', month: 3, dun: '陽', ju: [3, 9, 6] },
      { name: '清明', month: 4, dun: '陽', ju: [4, 1, 7] },
      { name: '穀雨', month: 4, dun: '陽', ju: [5, 2, 8] },
      { name: '立夏', month: 5, dun: '陽', ju: [4, 1, 7] },
      { name: '小滿', month: 5, dun: '陽', ju: [5, 2, 8] },
      { name: '芒種', month: 6, dun: '陽', ju: [6, 3, 9] },
      { name: '夏至', month: 6, dun: '陰', ju: [9, 3, 6] },
      { name: '小暑', month: 7, dun: '陰', ju: [8, 2, 5] },
      { name: '大暑', month: 7, dun: '陰', ju: [7, 1, 4] },
      { name: '立秋', month: 8, dun: '陰', ju: [2, 5, 8] },
      { name: '處暑', month: 8, dun: '陰', ju: [1, 4, 7] },
      { name: '白露', month: 9, dun: '陰', ju: [9, 3, 6] },
      { name: '秋分', month: 9, dun: '陰', ju: [7, 1, 4] },
      { name: '寒露', month: 10, dun: '陰', ju: [6, 9, 3] },
      { name: '霜降', month: 10, dun: '陰', ju: [5, 8, 2] },
      { name: '立冬', month: 11, dun: '陰', ju: [6, 9, 3] },
      { name: '小雪', month: 11, dun: '陰', ju: [5, 8, 2] },
      { name: '大雪', month: 12, dun: '陰', ju: [4, 7, 1] }
    ];
  }

  /**
   * 初始化格局數據
   * @returns {Array} 格局列表
   */
  _initPatterns() {
    return [
      {
        name: '天遁',
        description: '天盤丙奇，地盤生門，合吉格',
        check: (chart) => {
          return chart.tianPan[4] === '丙' && chart.diPan[1] === '生門';
        }
      },
      {
        name: '地遁',
        description: '天盤乙奇，地盤開門，合吉格',
        check: (chart) => {
          return chart.tianPan[4] === '乙' && chart.diPan[7] === '開門';
        }
      },
      {
        name: '人遁',
        description: '天盤丁奇，地盤休門，合吉格',
        check: (chart) => {
          return chart.tianPan[4] === '丁' && chart.diPan[0] === '休門';
        }
      },
      {
        name: '龍遁',
        description: '天盤乙奇，地盤開門或休門',
        check: (chart) => {
          return chart.tianPan[4] === '乙' && 
                 (chart.diPan[7] === '開門' || chart.diPan[0] === '休門');
        }
      },
      {
        name: '虎遁',
        description: '天盤乙奇，地盤生門或開門',
        check: (chart) => {
          return chart.tianPan[4] === '乙' && 
                 (chart.diPan[1] === '生門' || chart.diPan[7] === '開門');
        }
      },
      {
        name: '風遁',
        description: '天盤乙奇，地盤吉門，合吉格',
        check: (chart) => {
          return chart.tianPan[4] === '乙' && 
                 ['生門', '開門', '休門'].includes(chart.diPan[1]);
        }
      },
      {
        name: '雲遁',
        description: '天盤乙奇，地盤吉門，合吉格',
        check: (chart) => {
          return chart.tianPan[4] === '乙' && 
                 ['生門', '開門', '休門'].includes(chart.diPan[7]);
        }
      },
      {
        name: '儀奇得使',
        description: '天盤六儀，地盤三奇',
        check: (chart) => {
          const yiQi = ['甲子戊', '甲戌己', '甲申庚', '甲午辛', '甲辰壬', '甲寅癸'];
          const sanQi = ['乙', '丙', '丁'];
          return yiQi.some(y => chart.tianPan.includes(y)) && 
                 sanQi.some(q => chart.diPan.includes(q));
        }
      }
    ];
  }

  /**
   * 載入數據
   * 注意：此方法為異步，實際使用時需要等待數據載入完成
   */
  async loadData() {
    try {
      // 嘗試載入 JSON 數據文件
      // 由於 JavaScript 環境限制，這裡使用內建數據
      // 實際應用中可改為從文件或 API 載入
      this.palaces = {
        1: { name: '坎一宮', element: '水', direction: '北' },
        2: { name: '坤二宮', element: '土', direction: '西南' },
        3: { name: '震三宮', element: '木', direction: '東' },
        4: { name: '巽四宮', element: '木', direction: '東南' },
        5: { name: '中五宮', element: '土', direction: '中' },
        6: { name: '乾六宮', element: '金', direction: '西北' },
        7: { name: '兌七宮', element: '金', direction: '西' },
        8: { name: '艮八宮', element: '土', direction: '東北' },
        9: { name: '離九宮', element: '火', direction: '南' }
      };

      this.doors = {
        '休門': { element: '水', nature: '吉' },
        '生門': { element: '土', nature: '吉' },
        '傷門': { element: '木', nature: '兇' },
        '杜門': { element: '木', nature: '中' },
        '景門': { element: '火', nature: '中' },
        '死門': { element: '土', nature: '兇' },
        '驚門': { element: '金', nature: '兇' },
        '開門': { element: '金', nature: '吉' }
      };

      this.stars = {
        '天蓬': { element: '水', nature: '兇' },
        '天芮': { element: '土', nature: '兇' },
        '天沖': { element: '木', nature: '吉' },
        '天輔': { element: '木', nature: '吉' },
        '天禽': { element: '土', nature: '吉' },
        '天心': { element: '金', nature: '吉' },
        '天柱': { element: '金', nature: '兇' },
        '天任': { element: '土', nature: '吉' },
        '天英': { element: '火', nature: '中' }
      };

      this.gods = {
        '值符': { nature: '吉' },
        '騰蛇': { nature: '兇' },
        '太陰': { nature: '吉' },
        '六合': { nature: '吉' },
        '白虎': { nature: '兇' },
        '玄武': { nature: '兇' },
        '九地': { nature: '吉' },
        '九天': { nature: '吉' }
      };

      return true;
    } catch (error) {
      console.error('載入數據失敗:', error.message);
      throw new Error(`數據載入失敗: ${error.message}`);
    }
  }

  /**
   * 計算時家盤
   * @param {Date} date - 日期時間
   * @param {string} hourBranch - 時辰地支
   * @returns {Object} 時家盤數據
   */
  calculateQimenHourChart(date, hourBranch) {
    try {
      // 驗證輸入
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('無效的日期格式');
      }

      if (!this.diZhi.includes(hourBranch)) {
        throw new Error('無效的時辰地支');
      }

      // 獲取節氣
      const solarTerm = this.getSolarTermForQimen(date);
      if (!solarTerm) {
        throw new Error('無法獲取節氣信息');
      }

      // 獲取陰陽遁
      const dun = this.getYinYangDun(date);
      if (!dun) {
        throw new Error('無法確定陰陽遁');
      }

      // 獲取局數
      const ju = this.getJuNumber(date);
      if (!ju || ju < 1 || ju > 9) {
        throw new Error('無效的局數');
      }

      // 計算日干支
      const dayGanzhi = this._getDayGanzhi(date);
      
      // 計算時干支
      const hourGanzhi = this._getHourGanzhi(date, hourBranch);

      // 獲取旬首
      const xunShou = this.getXunShou(dayGanzhi, hourGanzhi);
      if (!xunShou) {
        throw new Error('無法計算旬首');
      }

      // 排列九宮
      const palaces = this.arrangePalaces(dun, ju);
      if (!palaces) {
        throw new Error('無法排列九宮');
      }

      // 獲取值符
      const zhiFu = this.getZhiFu({
        dun,
        ju,
        xunShou,
        hourGanzhi,
        palaces
      });

      // 獲取值使
      const zhiShi = this.getZhiShi({
        dun,
        ju,
        xunShou,
        hourGanzhi,
        palaces
      });

      // 安排八門
      const doors = this.arrangeDoors({
        dun,
        ju,
        xunShou,
        hourGanzhi,
        palaces,
        zhiShi
      });

      // 安排九星
      const stars = this.arrangeStars({
        dun,
        ju,
        xunShou,
        hourGanzhi,
        palaces,
        zhiFu
      });

      // 安排八神
      const gods = this.arrangeGods({
        dun,
        ju,
        hourGanzhi,
        palaces
      });

      // 構建完整盤面
      const chart = {
        date: date.toISOString(),
        hourBranch,
        solarTerm: solarTerm.name,
        dun,
        ju,
        dayGanzhi,
        hourGanzhi,
        xunShou,
        zhiFu,
        zhiShi,
        palaces,
        doors,
        stars,
        gods,
        tianPan: this._buildTianPan(palaces, stars),
        diPan: this._buildDiPan(palaces, doors)
      };

      // 檢測格局
      chart.patterns = this.detectQimenPatterns(chart);

      // 總結奇門
      chart.summary = this.summarizeQimen(chart);

      return chart;
    } catch (error) {
      console.error('計算時家盤失敗:', error.message);
      throw new Error(`計算時家盤失敗: ${error.message}`);
    }
  }

  /**
   * 獲取節氣
   * @param {Date} date - 日期
   * @returns {Object|null} 節氣信息
   */
  getSolarTermForQimen(date) {
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('無效的日期格式');
      }

      const month = date.getMonth() + 1;
      const day = date.getDate();

      // 簡化的節氣計算
      // 實際應用中應使用精確的天文計算
      const termDates = [
        { month: 1, day: 6, name: '小寒' },
        { month: 1, day: 20, name: '大寒' },
        { month: 2, day: 4, name: '立春' },
        { month: 2, day: 19, name: '雨水' },
        { month: 3, day: 6, name: '驚蟄' },
        { month: 3, day: 21, name: '春分' },
        { month: 4, day: 5, name: '清明' },
        { month: 4, day: 20, name: '穀雨' },
        { month: 5, day: 6, name: '立夏' },
        { month: 5, day: 21, name: '小滿' },
        { month: 6, day: 6, name: '芒種' },
        { month: 6, day: 21, name: '夏至' },
        { month: 7, day: 7, name: '小暑' },
        { month: 7, day: 23, name: '大暑' },
        { month: 8, day: 7, name: '立秋' },
        { month: 8, day: 23, name: '處暑' },
        { month: 9, day: 8, name: '白露' },
        { month: 9, day: 23, name: '秋分' },
        { month: 10, day: 8, name: '寒露' },
        { month: 10, day: 23, name: '霜降' },
        { month: 11, day: 7, name: '立冬' },
        { month: 11, day: 22, name: '小雪' },
        { month: 12, day: 7, name: '大雪' },
        { month: 12, day: 22, name: '冬至' }
      ];

      // 找到當前或最近的節氣
      let currentTerm = null;
      for (let i = termDates.length - 1; i >= 0; i--) {
        const term = termDates[i];
        if (month > term.month || (month === term.month && day >= term.day)) {
          currentTerm = this.solarTerms.find(t => t.name === term.name);
          break;
        }
      }

      // 如果在第一個節氣之前，使用最後一個節氣
      if (!currentTerm) {
        currentTerm = this.solarTerms[this.solarTerms.length - 1];
      }

      return currentTerm;
    } catch (error) {
      console.error('獲取節氣失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取陰陽遁
   * @param {Date} date - 日期
   * @returns {string|null} '陽' 或 '陰'
   */
  getYinYangDun(date) {
    try {
      const solarTerm = this.getSolarTermForQimen(date);
      if (!solarTerm) {
        throw new Error('無法獲取節氣');
      }

      return solarTerm.dun;
    } catch (error) {
      console.error('獲取陰陽遁失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取局數
   * @param {Date} date - 日期
   * @returns {number|null} 局數 (1-9)
   */
  getJuNumber(date) {
    try {
      const solarTerm = this.getSolarTermForQimen(date);
      if (!solarTerm) {
        throw new Error('無法獲取節氣');
      }

      const dayGanzhi = this._getDayGanzhi(date);
      const dayStem = dayGanzhi.charAt(0);
      const stemIndex = this.tianGan.indexOf(dayStem);

      // 根據日干確定上中下元
      // 甲己為符頭，根據日干支確定屬於哪一元
      let yuan;
      const dayBranch = dayGanzhi.charAt(1);
      const branchIndex = this.diZhi.indexOf(dayBranch);

      // 簡化的元數計算
      // 實際應用中需要更精確的計算
      if (stemIndex % 3 === 0) {
        yuan = 0; // 上元
      } else if (stemIndex % 3 === 1) {
        yuan = 1; // 中元
      } else {
        yuan = 2; // 下元
      }

      return solarTerm.ju[yuan];
    } catch (error) {
      console.error('獲取局數失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取旬首
   * @param {string} dayGanzhi - 日干支
   * @param {string} hourGanzhi - 時干支
   * @returns {string|null} 旬首
   */
  getXunShou(dayGanzhi, hourGanzhi) {
    try {
      if (!dayGanzhi || dayGanzhi.length < 2) {
        throw new Error('無效的日干支');
      }

      const hourStem = hourGanzhi.charAt(0);
      const hourBranch = hourGanzhi.charAt(1);
      const hourBranchIndex = this.diZhi.indexOf(hourBranch);

      // 計算旬首
      // 甲子旬：甲子、乙丑、丙寅、丁卯、戊辰、己巳、庚午、辛未、壬申、癸酉
      // 甲戌旬：甲戌、乙亥、丙子、丁丑、戊寅、己卯、庚辰、辛巳、壬午、癸未
      // 以此類推
      const xunShouList = [
        '甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'
      ];

      // 計算時支在旬中的位置
      const stemIndex = this.tianGan.indexOf(hourStem);
      const xunIndex = (hourBranchIndex - stemIndex + 12) % 12;
      
      // 確定旬首
      const xunShouBranchIndex = (hourBranchIndex - xunIndex + 12) % 12;
      const xunShou = xunShouList[Math.floor(xunShouBranchIndex / 2)];

      return xunShou;
    } catch (error) {
      console.error('獲取旬首失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取值符
   * @param {Object} chart - 盤面數據
   * @returns {Object|null} 值符信息
   */
  getZhiFu(chart) {
    try {
      const { dun, ju, xunShou, hourGanzhi, palaces } = chart;

      if (!xunShou || !hourGanzhi) {
        throw new Error('缺少旬首或時干支信息');
      }

      const hourStem = hourGanzhi.charAt(0);
      const hourBranch = hourGanzhi.charAt(1);
      const hourBranchIndex = this.diZhi.indexOf(hourBranch);

      // 值符跟隨時干
      // 陽遁：值符隨時干飛布
      // 陰遁：值符隨時干飛布（逆飛）
      
      // 找到旬首所在宮位
      const xunShouBranch = xunShou.charAt(1);
      const xunShouBranchIndex = this.diZhi.indexOf(xunShouBranch);
      
      // 計算值符宮位
      let zhiFuPalace;
      if (dun === '陽') {
        // 陽遁：從旬首宮位順數到時干
        zhiFuPalace = (xunShouBranchIndex + this.tianGan.indexOf(hourStem)) % 9 + 1;
      } else {
        // 陰遁：從旬首宮位逆數到時干
        zhiFuPalace = (xunShouBranchIndex - this.tianGan.indexOf(hourStem) + 9) % 9 + 1;
      }

      // 獲取值符星
      const zhiFuStar = this.jiuXing[(ju - 1 + 9) % 9];

      return {
        palace: zhiFuPalace,
        star: zhiFuStar,
        stem: hourStem
      };
    } catch (error) {
      console.error('獲取值符失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取值使
   * @param {Object} chart - 盤面數據
   * @returns {Object|null} 值使信息
   */
  getZhiShi(chart) {
    try {
      const { dun, ju, xunShou, hourGanzhi, palaces } = chart;

      if (!xunShou || !hourGanzhi) {
        throw new Error('缺少旬首或時干支信息');
      }

      const hourStem = hourGanzhi.charAt(0);
      const hourBranch = hourGanzhi.charAt(1);
      const hourBranchIndex = this.diZhi.indexOf(hourBranch);

      // 值使跟隨時支
      // 陽遁：值使隨時支飛布
      // 陰遁：值使隨時支飛布（逆飛）

      // 找到旬首所在宮位
      const xunShouBranch = xunShou.charAt(1);
      const xunShouBranchIndex = this.diZhi.indexOf(xunShouBranch);
      
      // 計算值使宮位
      let zhiShiPalace;
      if (dun === '陽') {
        // 陽遁：從旬首宮位順數到時支
        zhiShiPalace = (xunShouBranchIndex + hourBranchIndex) % 9 + 1;
      } else {
        // 陰遁：從旬首宮位逆數到時支
        zhiShiPalace = (xunShouBranchIndex - hourBranchIndex + 9) % 9 + 1;
      }

      // 獲取值使門
      const zhiShiDoor = this.baMen[(ju - 1 + 9) % 8];

      return {
        palace: zhiShiPalace,
        door: zhiShiDoor,
        branch: hourBranch
      };
    } catch (error) {
      console.error('獲取值使失敗:', error.message);
      return null;
    }
  }

  /**
   * 安排九宮
   * @param {string} dun - 陰陽遁
   * @param {number} ju - 局數
   * @returns {Object|null} 九宮排列
   */
  arrangePalaces(dun, ju) {
    try {
      if (!dun || !ju) {
        throw new Error('缺少陰陽遁或局數');
      }

      const palaces = {};
      
      // 三奇六儀排列順序
      const sanQiLiuYi = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
      
      // 陽遁順排，陰遁逆排
      if (dun === '陽') {
        // 陽遁：從局數對應的宮位開始順排
        for (let i = 0; i < 9; i++) {
          const palaceNum = ((ju - 1 + i) % 9) + 1;
          palaces[palaceNum] = sanQiLiuYi[i];
        }
      } else {
        // 陰遁：從局數對應的宮位開始逆排
        for (let i = 0; i < 9; i++) {
          const palaceNum = ((ju - 1 - i + 9) % 9) + 1;
          palaces[palaceNum] = sanQiLiuYi[i];
        }
      }

      return palaces;
    } catch (error) {
      console.error('安排九宮失敗:', error.message);
      return null;
    }
  }

  /**
   * 安排八門
   * @param {Object} chart - 盤面數據
   * @returns {Object|null} 八門排列
   */
  arrangeDoors(chart) {
    try {
      const { dun, ju, xunShou, hourGanzhi, palaces, zhiShi } = chart;

      if (!zhiShi) {
        throw new Error('缺少值使信息');
      }

      const doors = {};
      const doorNames = [...this.baMen];
      
      // 八門排列：值使門確定後，按宮位順序排列
      // 陽遁順排，陰遁逆排
      
      // 找到值使門在八門中的位置
      const zhiShiDoorIndex = doorNames.indexOf(zhiShi.door);
      
      if (dun === '陽') {
        // 陽遁：從值使宮位開始順排
        for (let i = 0; i < 8; i++) {
          const palaceNum = ((zhiShi.palace - 1 + i) % 9) + 1;
          if (palaceNum !== 5) { // 中五宮不排門
            doors[palaceNum] = doorNames[(zhiShiDoorIndex + i) % 8];
          }
        }
      } else {
        // 陰遁：從值使宮位開始逆排
        for (let i = 0; i < 8; i++) {
          const palaceNum = ((zhiShi.palace - 1 - i + 9) % 9) + 1;
          if (palaceNum !== 5) { // 中五宮不排門
            doors[palaceNum] = doorNames[(zhiShiDoorIndex - i + 8) % 8];
          }
        }
      }

      return doors;
    } catch (error) {
      console.error('安排八門失敗:', error.message);
      return null;
    }
  }

  /**
   * 安排九星
   * @param {Object} chart - 盤面數據
   * @returns {Object|null} 九星排列
   */
  arrangeStars(chart) {
    try {
      const { dun, ju, xunShou, hourGanzhi, palaces, zhiFu } = chart;

      if (!zhiFu) {
        throw new Error('缺少值符信息');
      }

      const stars = {};
      const starNames = [...this.jiuXing];
      
      // 九星排列：值符星確定後，按宮位順序排列
      // 陽遁順排，陰遁逆排
      
      // 找到值符星在九星中的位置
      const zhiFuStarIndex = starNames.indexOf(zhiFu.star);
      
      if (dun === '陽') {
        // 陽遁：從值符宮位開始順排
        for (let i = 0; i < 9; i++) {
          const palaceNum = ((zhiFu.palace - 1 + i) % 9) + 1;
          stars[palaceNum] = starNames[(zhiFuStarIndex + i) % 9];
        }
      } else {
        // 陰遁：從值符宮位開始逆排
        for (let i = 0; i < 9; i++) {
          const palaceNum = ((zhiFu.palace - 1 - i + 9) % 9) + 1;
          stars[palaceNum] = starNames[(zhiFuStarIndex - i + 9) % 9];
        }
      }

      return stars;
    } catch (error) {
      console.error('安排九星失敗:', error.message);
      return null;
    }
  }

  /**
   * 安排八神
   * @param {Object} chart - 盤面數據
   * @returns {Object|null} 八神排列
   */
  arrangeGods(chart) {
    try {
      const { dun, ju, hourGanzhi, palaces } = chart;

      const gods = {};
      const godNames = [...this.baShen];
      
      // 八神排列：值符確定後，按宮位順序排列
      // 陽遁順排，陰遁逆排
      
      // 值符在中五宮
      const zhiFuPalace = 5;
      
      if (dun === '陽') {
        // 陽遁：從值符宮位開始順排
        for (let i = 0; i < 8; i++) {
          const palaceNum = ((zhiFuPalace - 1 + i) % 9) + 1;
          if (palaceNum !== 5) { // 中五宮不排神
            gods[palaceNum] = godNames[i % 8];
          }
        }
      } else {
        // 陰遁：從值符宮位開始逆排
        for (let i = 0; i < 8; i++) {
          const palaceNum = ((zhiFuPalace - 1 - i + 9) % 9) + 1;
          if (palaceNum !== 5) { // 中五宮不排神
            gods[palaceNum] = godNames[i % 8];
          }
        }
      }

      return gods;
    } catch (error) {
      console.error('安排八神失敗:', error.message);
      return null;
    }
  }

  /**
   * 檢測格局
   * @param {Object} chart - 盤面數據
   * @returns {Array} 格局列表
   */
  detectQimenPatterns(chart) {
    try {
      const patterns = [];

      // 檢查各種格局
      for (const pattern of this.patterns) {
        if (pattern.check(chart)) {
          patterns.push({
            name: pattern.name,
            description: pattern.description
          });
        }
      }

      // 檢查特殊格局
      // 天顯時格：六甲之時
      if (chart.hourGanzhi.startsWith('甲')) {
        patterns.push({
          name: '天顯時格',
          description: '六甲之時，諸事皆宜'
        });
      }

      // 悖格：丙加庚
      if (chart.tianPan && chart.tianPan[4] === '丙' && 
          chart.diPan && chart.diPan[6] === '庚') {
        patterns.push({
          name: '悖格',
          description: '丙加庚，主悖亂'
        });
      }

      return patterns;
    } catch (error) {
      console.error('檢測格局失敗:', error.message);
      return [];
    }
  }

  /**
   * 總結奇門
   * @param {Object} chart - 盤面數據
   * @returns {Object} 總結信息
   */
  summarizeQimen(chart) {
    try {
      const summary = {
        overall: '',
        favorable: [],
        unfavorable: [],
        advice: ''
      };

      // 統計吉凶
      let jiCount = 0;
      let xiongCount = 0;

      // 檢查八門
      if (chart.doors) {
        for (const palace in chart.doors) {
          const door = chart.doors[palace];
          const doorInfo = this.doors[door];
          if (doorInfo) {
            if (doorInfo.nature === '吉') {
              jiCount++;
              summary.favorable.push(`${this.palaces[palace].name}${door}吉門`);
            } else if (doorInfo.nature === '兇') {
              xiongCount++;
              summary.unfavorable.push(`${this.palaces[palace].name}${door}兇門`);
            }
          }
        }
      }

      // 檢查九星
      if (chart.stars) {
        for (const palace in chart.stars) {
          const star = chart.stars[palace];
          const starInfo = this.stars[star];
          if (starInfo) {
            if (starInfo.nature === '吉') {
              jiCount++;
              summary.favorable.push(`${this.palaces[palace].name}${star}吉星`);
            } else if (starInfo.nature === '兇') {
              xiongCount++;
              summary.unfavorable.push(`${this.palaces[palace].name}${star}兇星`);
            }
          }
        }
      }

      // 檢查八神
      if (chart.gods) {
        for (const palace in chart.gods) {
          const god = chart.gods[palace];
          const godInfo = this.gods[god];
          if (godInfo) {
            if (godInfo.nature === '吉') {
              jiCount++;
              summary.favorable.push(`${this.palaces[palace].name}${god}吉神`);
            } else if (godInfo.nature === '兇') {
              xiongCount++;
              summary.unfavorable.push(`${this.palaces[palace].name}${god}兇神`);
            }
          }
        }
      }

      // 檢查格局
      if (chart.patterns && chart.patterns.length > 0) {
        for (const pattern of chart.patterns) {
          summary.favorable.push(`遇${pattern.name}格`);
        }
      }

      // 總體判斷
      if (jiCount > xiongCount) {
        summary.overall = '吉';
        summary.advice = '此局吉利，諸事可行，宜積極進取。';
      } else if (xiongCount > jiCount) {
        summary.overall = '兇';
        summary.advice = '此局兇險，諸事宜慎，宜保守行事。';
      } else {
        summary.overall = '平';
        summary.advice = '此局平穩，吉兇參半，宜謹慎行事。';
      }

      return summary;
    } catch (error) {
      console.error('總結奇門失敗:', error.message);
      return {
        overall: '未知',
        favorable: [],
        unfavorable: [],
        advice: '無法總結'
      };
    }
  }

  /**
   * 獲取日干支
   * @param {Date} date - 日期
   * @returns {string} 日干支
   */
  _getDayGanzhi(date) {
    try {
      // 簡化的日干支計算
      // 實際應用中需要使用精確的萬年曆算法
      const baseDate = new Date(1900, 0, 1); // 1900年1月1日為甲戌日
      const baseGanzhi = '甲戌';
      
      const diffTime = date.getTime() - baseDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const ganzhiIndex = (diffDays + 10) % 60; // 加10是為了調整到正確的干支
      const stemIndex = ganzhiIndex % 10;
      const branchIndex = ganzhiIndex % 12;
      
      return this.tianGan[stemIndex] + this.diZhi[branchIndex];
    } catch (error) {
      console.error('獲取日干支失敗:', error.message);
      return '甲子'; // 返回默認值
    }
  }

  /**
   * 獲取時干支
   * @param {Date} date - 日期
   * @param {string} hourBranch - 時辰地支
   * @returns {string} 時干支
   */
  _getHourGanzhi(date, hourBranch) {
    try {
      const dayGanzhi = this._getDayGanzhi(date);
      const dayStem = dayGanzhi.charAt(0);
      const dayStemIndex = this.tianGan.indexOf(dayStem);
      
      const hourBranchIndex = this.diZhi.indexOf(hourBranch);
      
      // 時干計算：根據日干確定時干
      // 甲己日起甲子時，乙庚日起丙子時，丙辛日起戊子時，丁壬日起庚子時，戊癸日起壬子時
      const hourStemStart = [0, 2, 4, 6, 8]; // 甲己、乙庚、丙辛、丁壬、戊癸
      const dayStemMod = dayStemIndex % 5;
      const hourStemIndex = (hourStemStart[dayStemMod] + hourBranchIndex) % 10;
      
      return this.tianGan[hourStemIndex] + hourBranch;
    } catch (error) {
      console.error('獲取時干支失敗:', error.message);
      return '甲子'; // 返回默認值
    }
  }

  /**
   * 構建天盤
   * @param {Object} palaces - 九宮排列
   * @param {Object} stars - 九星排列
   * @returns {Object} 天盤
   */
  _buildTianPan(palaces, stars) {
    try {
      const tianPan = {};
      
      for (let i = 1; i <= 9; i++) {
        tianPan[i] = {
          gan: palaces ? palaces[i] : null,
          star: stars ? stars[i] : null
        };
      }

      return tianPan;
    } catch (error) {
      console.error('構建天盤失敗:', error.message);
      return {};
    }
  }

  /**
   * 構建地盤
   * @param {Object} palaces - 九宮排列
   * @param {Object} doors - 八門排列
   * @returns {Object} 地盤
   */
  _buildDiPan(palaces, doors) {
    try {
      const diPan = {};
      
      for (let i = 1; i <= 9; i++) {
        diPan[i] = {
          gan: palaces ? palaces[i] : null,
          door: doors ? doors[i] : null
        };
      }

      return diPan;
    } catch (error) {
      console.error('構建地盤失敗:', error.message);
      return {};
    }
  }

  /**
   * 獲取宮位信息
   * @param {number} palaceNum - 宮位號
   * @returns {Object} 宮位信息
   */
  getPalaceInfo(palaceNum) {
    try {
      if (palaceNum < 1 || palaceNum > 9) {
        throw new Error('無效的宮位號');
      }

      return this.palaces[palaceNum] || null;
    } catch (error) {
      console.error('獲取宮位信息失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取門信息
   * @param {string} doorName - 門名
   * @returns {Object} 門信息
   */
  getDoorInfo(doorName) {
    try {
      return this.doors[doorName] || null;
    } catch (error) {
      console.error('獲取門信息失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取星信息
   * @param {string} starName - 星名
   * @returns {Object} 星信息
   */
  getStarInfo(starName) {
    try {
      return this.stars[starName] || null;
    } catch (error) {
      console.error('獲取星信息失敗:', error.message);
      return null;
    }
  }

  /**
   * 獲取神信息
   * @param {string} godName - 神名
   * @returns {Object} 神信息
   */
  getGodInfo(godName) {
    try {
      return this.gods[godName] || null;
    } catch (error) {
      console.error('獲取神信息失敗:', error.message);
      return null;
    }
  }

  /**
   * 格式化盤面顯示
   * @param {Object} chart - 盤面數據
   * @returns {string} 格式化後的盤面
   */
  formatChart(chart) {
    try {
      let output = '=== 奇門遁甲盤 ===\n\n';
      
      output += `日期: ${chart.date}\n`;
      output += `時辰: ${chart.hourBranch}\n`;
      output += `節氣: ${chart.solarTerm}\n`;
      output += `遁: ${chart.dun}遁\n`;
      output += `局數: ${chart.ju}局\n`;
      output += `日干支: ${chart.dayGanzhi}\n`;
      output += `時干支: ${chart.hourGanzhi}\n`;
      output += `旬首: ${chart.xunShou}\n`;
      output += `值符: ${chart.zhiFu.star} (宮${chart.zhiFu.palace})\n`;
      output += `值使: ${chart.zhiShi.door} (宮${chart.zhiShi.palace})\n\n`;

      output += '--- 九宮排列 ---\n';
      for (let i = 1; i <= 9; i++) {
        const palace = this.palaces[i];
        const gan = chart.palaces[i];
        const door = chart.doors[i] || '無';
        const star = chart.stars[i] || '無';
        const god = chart.gods[i] || '無';
        
        output += `${palace.name}: ${gan} | ${door} | ${star} | ${god}\n`;
      }

      output += '\n--- 格局 ---\n';
      if (chart.patterns && chart.patterns.length > 0) {
        for (const pattern of chart.patterns) {
          output += `${pattern.name}: ${pattern.description}\n`;
        }
      } else {
        output += '無特殊格局\n';
      }

      output += '\n--- 總結 ---\n';
      output += `整體: ${chart.summary.overall}\n`;
      output += `建議: ${chart.summary.advice}\n`;

      if (chart.summary.favorable.length > 0) {
        output += `有利因素: ${chart.summary.favorable.join('、')}\n`;
      }
      if (chart.summary.unfavorable.length > 0) {
        output += `不利因素: ${chart.summary.unfavorable.join('、')}\n`;
      }

      return output;
    } catch (error) {
      console.error('格式化盤面失敗:', error.message);
      return '無法格式化盤面';
    }
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QimenEngine;
}
