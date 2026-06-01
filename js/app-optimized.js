/**
 * 速窺運勢 - 優化後的主程式
 * 純前端命術規則引擎 PWA
 * 八字 × 易經 × 奇門遁甲，每日時辰推演工具
 * @version 2.0.0
 * @author FastFate
 */

class DataCache {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  async preload(urls) {
    const promises = urls.map(url => this.load(url));
    return Promise.allSettled(promises);
  }

  async load(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (this.loading.has(url)) {
      return this.loading.get(url);
    }

    const promise = fetch(url)
      .then(res => res.json())
      .then(data => {
        this.cache.set(url, data);
        this.loading.delete(url);
        return data;
      })
      .catch(err => {
        this.loading.delete(url);
        throw err;
      });

    this.loading.set(url, promise);
    return promise;
  }

  get(url) {
    return this.cache.get(url);
  }

  has(url) {
    return this.cache.has(url);
  }

  clear() {
    this.cache.clear();
    this.loading.clear();
  }
}

class ResultCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

class EngineManager {
  static instance = null;
  static engines = {};

  static getInstance() {
    if (!EngineManager.instance) {
      EngineManager.instance = new EngineManager();
    }
    return EngineManager.instance;
  }

  static getEngine(name) {
    return EngineManager.engines[name];
  }

  static setEngine(name, engine) {
    EngineManager.engines[name] = engine;
  }

  static hasEngine(name) {
    return !!EngineManager.engines[name];
  }
}

class App {
  constructor() {
    this.dataCache = new DataCache();
    this.resultCache = new ResultCache(50);
    this.perfMonitor = window.perfMonitor || new PerformanceMonitor();
    this.enginesLoaded = false;
    this.isProcessing = false;
    this.currentResult = null;
  }

  async init() {
    try {
      this.perfMonitor.start('app-init');
      this._renderStaticUI();
      await this._loadEngines();
      this._warmupEngines();
      this._bindEvents();
      this._loadSavedProfile();
      this.perfMonitor.end('app-init');
      console.log(`應用程式初始化完成: ${this.perfMonitor.getDuration('app-init').toFixed(2)}ms`);
    } catch (error) {
      console.error('應用程式初始化失敗:', error);
      this._showError('應用程式初始化失敗，請重新整理頁面。');
    }
  }

  _renderStaticUI() {
    const form = document.getElementById('birthForm');
    if (form) {
      form.style.opacity = '1';
    }
  }

  async _loadEngines() {
    this.perfMonitor.start('load-engines');

    const engineFiles = [
      'js/engines/date-engine.js',
      'js/engines/ganzhi-engine.js',
      'js/engines/bazi-engine.js',
      'js/engines/iching-engine.js',
      'js/engines/qimen-engine.js',
      'js/engines/scoring-engine.js',
      'js/engines/interpretation-engine.js'
    ];

    await this._loadScripts(engineFiles);

    const engineManager = EngineManager.getInstance();
    
    if (!EngineManager.hasEngine('date')) {
      EngineManager.setEngine('date', new DateEngine());
    }
    if (!EngineManager.hasEngine('ganzhi')) {
      EngineManager.setEngine('ganzhi', new GanzhiEngine());
    }
    if (!EngineManager.hasEngine('bazi')) {
      EngineManager.setEngine('bazi', new BaziEngine());
    }
    if (!EngineManager.hasEngine('iching')) {
      EngineManager.setEngine('iching', new IChingEngine());
    }
    if (!EngineManager.hasEngine('qimen')) {
      EngineManager.setEngine('qimen', new QimenEngine());
    }
    if (!EngineManager.hasEngine('scoring')) {
      EngineManager.setEngine('scoring', new ScoringEngine());
    }
    if (!EngineManager.hasEngine('interpretation')) {
      EngineManager.setEngine('interpretation', new InterpretationEngine());
    }

    this.dateEngine = EngineManager.getEngine('date');
    this.ganzhiEngine = EngineManager.getEngine('ganzhi');
    this.baziEngine = EngineManager.getEngine('bazi');
    this.ichingEngine = EngineManager.getEngine('iching');
    this.qimenEngine = EngineManager.getEngine('qimen');
    this.scoringEngine = EngineManager.getEngine('scoring');
    this.interpretationEngine = EngineManager.getEngine('interpretation');

    const loadResults = await Promise.allSettled([
      this.ganzhiEngine.loadData(),
      this.baziEngine.loadData(),
      this.ichingEngine.loadData(),
      this.qimenEngine.loadData(),
      this.scoringEngine.loadData(),
      this.interpretationEngine.loadData()
    ]);

    const failed = loadResults.filter(r => r.status === 'rejected' || r.value === false);
    if (failed.length > 0) {
      console.warn(`${failed.length} 個引擎載入部分數據失敗，將使用備用數據`);
    }

    this.enginesLoaded = true;
    this.perfMonitor.end('load-engines');
    console.log(`引擎載入完成: ${this.perfMonitor.getDuration('load-engines').toFixed(2)}ms`);
  }

  async _loadScripts(urls) {
    const promises = urls.map(url => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`無法載入腳本: ${url}`));
      document.head.appendChild(script);
    }));
    await Promise.all(promises);
  }

  _warmupEngines() {
    this.perfMonitor.start('warmup-engines');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    try {
      this.dateEngine.formatDate(today);
      this.ganzhiEngine.getGanzhi ? this.ganzhiEngine.getGanzhi(today) : null;
    } catch (e) {
      console.warn('引擎預熱部分失敗:', e);
    }
    
    this.perfMonitor.end('warmup-engines');
  }

  _bindEvents() {
    const form = document.getElementById('birthForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleFormSubmit();
      });
    }

    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => this._handleClear());
    }

    const unknownTime = document.getElementById('unknownTime');
    const birthTime = document.getElementById('birthTime');
    const birthHour = document.getElementById('birthHour');
    if (unknownTime) {
      unknownTime.addEventListener('change', () => {
        if (birthTime) birthTime.disabled = unknownTime.checked;
        if (birthHour) birthHour.disabled = unknownTime.checked;
      });
    }

    // 收合按鈕
    const btnToggle = document.getElementById('btnToggleSection');
    const formContainer = document.getElementById('formContainer');
    if (btnToggle && formContainer) {
      btnToggle.addEventListener('click', () => {
        const isCollapsed = formContainer.classList.contains('collapsed');
        formContainer.classList.toggle('collapsed');
        btnToggle.textContent = isCollapsed ? '▲ 收合輸入區' : '▼ 展開輸入區';
      });
    }
  }

  _loadSavedProfile() {
    try {
      const saved = localStorage.getItem('fortunePwaUserProfile');
      if (saved) {
        const profile = JSON.parse(saved);
        const birthDateInput = document.getElementById('birthDate');
        const birthTimeInput = document.getElementById('birthTime');
        const unknownTimeCheckbox = document.getElementById('unknownTime');
        
        if (birthDateInput && profile.birthDate) {
          birthDateInput.value = profile.birthDate;
        }
        if (birthTimeInput && profile.birthTime) {
          birthTimeInput.value = profile.birthTime;
        }
        if (unknownTimeCheckbox && profile.unknownTime) {
          unknownTimeCheckbox.checked = true;
          if (birthTimeInput) birthTimeInput.disabled = true;
        }
        
        // 有資料時自動推算
        if (profile.birthDate) {
          console.log('已載入儲存的用戶資料，自動推算中...');
          setTimeout(() => this._handleFormSubmit(), 100);
        }
      }
    } catch (error) {
      console.warn('無法載入已儲存的資料:', error);
    }
  }

  async _handleFormSubmit() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const formData = this._getFormData();
      const validation = this._validateForm(formData);
      if (!validation.valid) {
        this._showError(validation.message);
        return;
      }

      this._showLoading('正在推算命盤，請稍候...');
      await new Promise(resolve => setTimeout(resolve, 50));

      this.perfMonitor.start('calculation');
      const result = await this._performCalculation(formData);
      this.perfMonitor.end('calculation');
      console.log(`推算完成: ${this.perfMonitor.getDuration('calculation').toFixed(2)}ms`);

      this.currentResult = result;
      this._renderResult(result);
      this._handleRememberMe(formData);
      this._hideLoading();
      this._showResultSection();
    } catch (error) {
      console.error('推算過程發生錯誤:', error);
      this._showError(`推算失敗：${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  _getFormData() {
    const birthDate = document.getElementById('birthDate')?.value || '';
    const birthTime = document.getElementById('birthTime')?.value || '';
    const birthHour = document.getElementById('birthHour')?.value || '';
    const unknownTime = document.getElementById('unknownTime')?.checked || false;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    const hourMap = {
      'zi': '00:00', 'chou': '02:00', 'yin': '04:00', 'mao': '06:00',
      'chen': '08:00', 'si': '10:00', 'wu': '12:00', 'wei': '14:00',
      'shen': '16:00', 'you': '18:00', 'xu': '20:00', 'hai': '22:00'
    };

    let time = null;
    if (!unknownTime) {
      if (birthTime) {
        time = birthTime;
      } else if (birthHour && hourMap[birthHour]) {
        time = hourMap[birthHour];
      }
    }

    return { birthDate, birthTime: time, unknownTime, rememberMe };
  }

  _validateForm(data) {
    if (!data.birthDate) {
      return { valid: false, message: '請先輸入西元生日。' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.birthDate)) {
      return { valid: false, message: '生日格式不正確，請使用 yyyy-mm-dd。' };
    }
    const date = new Date(data.birthDate);
    if (isNaN(date.getTime())) {
      return { valid: false, message: '生日日期無效，請確認輸入。' };
    }
    const now = new Date();
    if (date > now) {
      return { valid: false, message: '生日不能是未來的日期。' };
    }
    if (date.getFullYear() < 1900) {
      return { valid: false, message: '生日年份需在 1900 年之後。' };
    }
    return { valid: true };
  }

  async _performCalculation(formData) {
    const cacheKey = this._generateCacheKey(formData);
    
    if (this.resultCache.has(cacheKey)) {
      console.log('使用緩存結果');
      return this.resultCache.get(cacheKey);
    }

    const birthDate = formData.birthDate;
    const birthTime = formData.birthTime;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = this.dateEngine.addDays(today, 1);

    const baziResult = this.baziEngine.calculateBazi(birthDate, birthTime);

    const [todayHours, tomorrowHours] = await Promise.all([
      this._calculateDayHours(baziResult, today),
      this._calculateDayHours(baziResult, tomorrow)
    ]);

    const fourteenDays = this._calculate14Days(baziResult, today);

    const todaySummary = this._calculateDaySummary(todayHours, today);
    const tomorrowSummary = this._calculateDaySummary(tomorrowHours, tomorrow);

    const result = {
      bazi: baziResult,
      today: { date: this._formatDate(today), summary: todaySummary, hours: todayHours },
      tomorrow: { date: this._formatDate(tomorrow), summary: tomorrowSummary, hours: tomorrowHours },
      fourteenDays,
      timestamp: now.toISOString()
    };

    this.resultCache.set(cacheKey, result);
    return result;
  }

  _generateCacheKey(formData) {
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    return `${formData.birthDate}_${formData.birthTime || 'unknown'}_${today}`;
  }

  async _calculateDayHours(baziResult, date) {
    const hourBranches = [
      { branch: '子', name: '子時', start: '23:00', end: '00:59', crossDay: true },
      { branch: '丑', name: '丑時', start: '01:00', end: '02:59', crossDay: false },
      { branch: '寅', name: '寅時', start: '03:00', end: '04:59', crossDay: false },
      { branch: '卯', name: '卯時', start: '05:00', end: '06:59', crossDay: false },
      { branch: '辰', name: '辰時', start: '07:00', end: '08:59', crossDay: false },
      { branch: '巳', name: '巳時', start: '09:00', end: '10:59', crossDay: false },
      { branch: '午', name: '午時', start: '11:00', end: '12:59', crossDay: false },
      { branch: '未', name: '未時', start: '13:00', end: '14:59', crossDay: false },
      { branch: '申', name: '申時', start: '15:00', end: '16:59', crossDay: false },
      { branch: '酉', name: '酉時', start: '17:00', end: '18:59', crossDay: false },
      { branch: '戌', name: '戌時', start: '19:00', end: '20:59', crossDay: false },
      { branch: '亥', name: '亥時', start: '21:00', end: '22:59', crossDay: false }
    ];

    // 判斷是否是今天，過濾已過去的時辰
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = date.getTime() === today.getTime();
    const currentHour = now.getHours();

    let filteredBranches = hourBranches;
    if (isToday) {
      filteredBranches = hourBranches.filter(hb => {
        const startHour = parseInt(hb.start.split(':')[0]);
        // 子時特殊處理（23:00 開始）
        if (hb.branch === '子') {
          return currentHour >= 23 || currentHour < 1;
        }
        return startHour >= currentHour;
      });
    }

    const results = [];
    const dayMasterElement = baziResult.dayMaster.element;

    for (const hb of filteredBranches) {
      try {
        const hourResult = this._calculateSingleHour(baziResult, date, hb, dayMasterElement);
        results.push(hourResult);
      } catch (error) {
        console.warn(`計算 ${hb.name} 時發生錯誤:`, error);
        results.push(this._createFallbackHourResult(date, hb));
      }
    }

    return results;
  }

  _calculateSingleHour(baziResult, date, hourBranch, dayMasterElement) {
    const dateStr = this._formatDate(date);
    const hourGanzhi = this._calculateHourGanzhi(baziResult.day.stem, hourBranch.branch);

    let baziScore = 0;
    const baziTrace = [];

    if (hourGanzhi.tenGod) {
      const tenGodScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[hourGanzhi.tenGod.name] || 0;
      baziScore += tenGodScore;
      baziTrace.push({
        system: 'bazi', rule: 'hourTenGod', value: hourGanzhi.tenGod.name,
        score: tenGodScore, reason: `時干對日主形成${hourGanzhi.tenGod.name}`
      });
    }

    const hourBranchElement = this._getBranchElement(hourBranch.branch);
    const elementRelationScore = this._calculateElementRelationScore(dayMasterElement, hourBranchElement);
    baziScore += elementRelationScore;
    baziTrace.push({
      system: 'bazi', rule: 'elementRelation', value: `${dayMasterElement}-${hourBranchElement}`,
      score: elementRelationScore, reason: `時支五行${hourBranchElement}與日主${dayMasterElement}的關係`
    });

    baziScore = Math.max(-25, Math.min(25, baziScore));

    let ichingResult = null;
    let ichingScore = 0;
    const ichingTrace = [];
    try {
      ichingResult = this.ichingEngine.deriveHourHexagram(date, hourBranch.branch, baziResult);
      const personalized = this.ichingEngine.personalizeHexagramByElement(ichingResult.hexagram, dayMasterElement);
      ichingScore = this._calculateIchingScore(personalized, ichingResult);
      ichingTrace.push({
        system: 'iching', rule: 'hexagram', value: ichingResult.hexagram.name,
        score: ichingScore, reason: `卦象${ichingResult.hexagram.name}，五行${personalized.strengthLevel}`
      });
    } catch (error) {
      console.warn('易經計算錯誤:', error);
    }
    ichingScore = Math.max(-20, Math.min(20, ichingScore));

    let qimenChart = null;
    let qimenScore = 0;
    const qimenTrace = [];
    try {
      qimenChart = this.qimenEngine.calculateQimenHourChart(date, hourBranch.branch);
      qimenScore = this._calculateQimenScore(qimenChart);
      qimenTrace.push({
        system: 'qimen', rule: 'door', value: qimenChart.zhiShi?.door || '未知',
        score: this._getQimenDoorScore(qimenChart.zhiShi?.door),
        reason: `值使門${qimenChart.zhiShi?.door || '未知'}`
      });
    } catch (error) {
      console.warn('奇門計算錯誤:', error);
    }
    qimenScore = Math.max(-35, Math.min(35, qimenScore));

    const balanceScore = 0;

    const scoreResult = this.scoringEngine.calculateTotalScore(baziScore, ichingScore, qimenScore, balanceScore);

    let tenGodName = hourGanzhi.tenGod?.name || '未知';
    let doorName = qimenChart?.zhiShi?.door || '';
    let starName = qimenChart?.zhiFu?.star || '';
    let godName = '';

    let interpretation = null;
    try {
      interpretation = this.interpretationEngine.buildHourReading({
        tenGod: tenGodName,
        door: doorName,
        star: starName,
        god: godName,
        hexagram: ichingResult?.hexagram?.name || '',
        score: scoreResult.totalScore,
        level: scoreResult.level,
        bazi: baziResult,
        iching: ichingResult,
        qimen: qimenChart
      });
    } catch (error) {
      console.warn('解釋生成錯誤:', error);
    }

    const trace = [...baziTrace, ...ichingTrace, ...qimenTrace];

    return {
      date: dateStr,
      hourBranch: hourBranch.branch,
      hourName: hourBranch.name,
      timeRange: `${hourBranch.start}-${hourBranch.end}`,
      score: scoreResult.totalScore,
      level: scoreResult.level,
      levelColor: scoreResult.color,
      headline: interpretation?.headline || this._getDefaultHeadline(scoreResult.level),
      possibleEvents: interpretation?.possibleEvents || [],
      suitable: interpretation?.suitable || [],
      avoid: interpretation?.avoid || [],
      advice: interpretation?.advice || '',
      systems: {
        bazi: {
          hourGanzhi: hourGanzhi.name,
          tenGod: tenGodName,
          score: baziScore
        },
        iching: {
          hexagram: ichingResult?.hexagram?.name || '',
          changedHexagram: ichingResult?.changedHexagram?.name || '',
          movingLine: ichingResult?.movingLine || null,
          score: ichingScore
        },
        qimen: {
          yinYangDun: qimenChart?.dun || '',
          ju: qimenChart?.ju || 0,
          door: doorName,
          star: starName,
          god: godName,
          score: qimenScore
        }
      },
      trace
    };
  }

  _calculateHourGanzhi(dayStem, hourBranch) {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    const dayStemIndex = stems.indexOf(dayStem);
    const hourBranchIndex = branches.indexOf(hourBranch);
    const hourStemStart = [0, 2, 4, 6, 8];
    const hourStemIndex = (hourStemStart[dayStemIndex % 5] + hourBranchIndex) % 10;

    const stem = stems[hourStemIndex];
    const tenGod = this.baziEngine.getTenGod(dayStem, stem);

    return { stem, branch: hourBranch, name: stem + hourBranch, tenGod };
  }

  _getBranchElement(branch) {
    const map = {
      '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
      '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
      '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
    };
    return map[branch] || 'earth';
  }

  _calculateElementRelationScore(dayElement, hourElement) {
    const generateMap = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const controlMap = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

    if (dayElement === hourElement) return 1;
    if (generateMap[dayElement] === hourElement) return -2;
    if (generateMap[hourElement] === dayElement) return 3;
    if (controlMap[dayElement] === hourElement) return 4;
    if (controlMap[hourElement] === dayElement) return -4;
    return 0;
  }

  _calculateIchingScore(personalized, ichingResult) {
    const strengthScores = { '強旺': 8, '平穩': 3, '偏弱': -3, '衰弱': -8 };
    let score = strengthScores[personalized.strengthLevel] || 0;

    if (ichingResult.changedHexagram) {
      const changedKeywords = ichingResult.changedHexagram.keywords || [];
      const positiveKeywords = ['開創', '完成', '合作', '成長', '順利'];
      const negativeKeywords = ['阻滯', '衝突', '危險', '結束', '不穩'];
      if (changedKeywords.some(k => positiveKeywords.includes(k))) score += 3;
      if (changedKeywords.some(k => negativeKeywords.includes(k))) score -= 3;
    }

    return Math.max(-20, Math.min(20, score));
  }

  _calculateQimenScore(chart) {
    if (!chart) return 0;

    let score = 0;
    const doorScores = {
      '開門': 10, '休門': 8, '生門': 9, '傷門': -7,
      '杜門': -5, '景門': 3, '死門': -10, '驚門': -6
    };
    const starScores = {
      '天蓬': -6, '天芮': -5, '天沖': 4, '天輔': 7,
      '天禽': 6, '天心': 8, '天柱': -3, '天任': 5, '天英': 2
    };
    const godScores = {
      '值符': 8, '騰蛇': -4, '太陰': 5, '六合': 6,
      '白虎': -7, '玄武': -5, '九地': 3, '九天': 4
    };

    if (chart.zhiShi?.door) score += doorScores[chart.zhiShi.door] || 0;
    if (chart.zhiFu?.star) score += starScores[chart.zhiFu.star] || 0;

    if (chart.doors) {
      for (const palace in chart.doors) {
        const door = chart.doors[palace];
        if (doorScores[door]) score += Math.round(doorScores[door] * 0.2);
      }
    }

    if (chart.patterns) {
      for (const pattern of chart.patterns) {
        if (pattern.name === '天遁' || pattern.name === '地遁' || pattern.name === '人遁') score += 5;
      }
    }

    return Math.max(-35, Math.min(35, score));
  }

  _getQimenDoorScore(door) {
    const scores = {
      '開門': 10, '休門': 8, '生門': 9, '傷門': -7,
      '杜門': -5, '景門': 3, '死門': -10, '驚門': -6
    };
    return scores[door] || 0;
  }

  _calculate14Days(baziResult, startDate) {
    const days = [];
    for (let i = 2; i <= 15; i++) {
      const date = this.dateEngine.addDays(startDate, i);
      try {
        const dayInfo = this._calculate14DaySummary(baziResult, date);
        days.push(dayInfo);
      } catch (error) {
        days.push(this._createFallback14Day(date));
      }
    }
    return days;
  }

  _calculate14DaySummary(baziResult, date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const dayGanzhi = this.baziEngine.calculateDayPillar(date);
    const dayMasterElement = baziResult.dayMaster.element;

    let totalScore = 50;
    const bestHours = [];
    const riskHours = [];

    const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const hourNames = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'];

    for (let h = 0; h < 12; h++) {
      try {
        const hourGanzhi = this._calculateHourGanzhi(baziResult.day.stem, hourBranches[h]);
        const tenGodScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[hourGanzhi.tenGod?.name] || 0;
        const branchElement = this._getBranchElement(hourBranches[h]);
        const relScore = this._calculateElementRelationScore(dayMasterElement, branchElement);
        const hourScore = 50 + tenGodScore + relScore;

        if (hourScore >= 60) bestHours.push(hourNames[h]);
        if (hourScore < 40) riskHours.push(hourNames[h]);
      } catch (e) {
        // skip
      }
    }

    const tenGod = this.baziEngine.getTenGod(baziResult.day.stem, dayGanzhi.stem);
    const tenGodScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[tenGod.name] || 0;
    totalScore += tenGodScore;

    const dayBranchElement = this._getBranchElement(dayGanzhi.branch);
    const relScore = this._calculateElementRelationScore(dayMasterElement, dayBranchElement);
    totalScore += relScore;

    totalScore = Math.max(0, Math.min(100, totalScore));
    const levelInfo = this.scoringEngine.getScoreLevel(totalScore);

    return {
      date: this._formatDate(date),
      weekday: `週${weekdays[date.getDay()]}`,
      score: Math.round(totalScore),
      level: levelInfo.level,
      levelColor: levelInfo.color,
      theme: this._getDayTheme(tenGod.name, totalScore),
      bestHours: bestHours.slice(0, 3),
      riskHours: riskHours.slice(0, 2),
      advice: this._getDayAdvice(totalScore)
    };
  }

  _calculateDaySummary(hours, date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const scores = hours.map(h => h.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const bestHours = hours.filter(h => h.score >= 70).map(h => h.hourName);
    const riskHours = hours.filter(h => h.score < 40).map(h => h.hourName);
    const levelInfo = this.scoringEngine.getScoreLevel(avgScore);

    return {
      date: this._formatDate(date),
      weekday: `週${weekdays[date.getDay()]}`,
      averageScore: avgScore,
      maxScore,
      minScore,
      level: levelInfo.level,
      levelColor: levelInfo.color,
      bestHours,
      riskHours
    };
  }

  _getDefaultHeadline(level) {
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

  _getDayTheme(tenGod, score) {
    if (score >= 70) return `今日${tenGod}主事，運勢順暢，把握機會`;
    if (score >= 55) return `今日${tenGod}主事，平穩中有小機遇`;
    if (score >= 45) return `今日${tenGod}主事，平穩無波`;
    return `今日${tenGod}主事，宜謹慎保守`;
  }

  _getDayAdvice(score) {
    if (score >= 70) return '運勢良好，適合積極行動與重要安排。';
    if (score >= 55) return '較為順利，可適度推進計劃。';
    if (score >= 45) return '平穩無波，維持現狀為宜。';
    return '運勢偏低，宜保守行事，避免衝動決定。';
  }

  _createFallbackHourResult(date, hourBranch) {
    return {
      date: this._formatDate(date),
      hourBranch: hourBranch.branch,
      hourName: hourBranch.name,
      timeRange: `${hourBranch.start}-${hourBranch.end}`,
      score: 50,
      level: '平',
      levelColor: '#9A6A1F',
      headline: '平穩無波，維持現狀為宜',
      possibleEvents: [],
      suitable: [],
      avoid: [],
      advice: '保持平常心，按部就班行事。',
      systems: { bazi: {}, iching: {}, qimen: {} },
      trace: []
    };
  }

  _createFallback14Day(date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return {
      date: this._formatDate(date),
      weekday: `週${weekdays[date.getDay()]}`,
      score: 50,
      level: '平',
      levelColor: '#9A6A1F',
      theme: '平穩日',
      bestHours: [],
      riskHours: [],
      advice: '維持日常節奏即可。'
    };
  }

  _formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _handleRememberMe(formData) {
    try {
      // 自動儲存用戶資料到 localStorage
      localStorage.setItem('fortunePwaUserProfile', JSON.stringify({
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        unknownTime: formData.unknownTime
      }));
    } catch (error) {
      console.warn('無法儲存資料:', error);
    }
  }

  _handleClear() {
    const form = document.getElementById('birthForm');
    if (form) form.reset();

    const birthTime = document.getElementById('birthTime');
    const birthHour = document.getElementById('birthHour');
    if (birthTime) birthTime.disabled = false;
    if (birthHour) birthHour.disabled = false;

    try { localStorage.removeItem('fortunePwaUserProfile'); } catch (e) {}

    const resultSection = document.getElementById('resultSection');
    if (resultSection) resultSection.style.display = 'none';

    // 展開表單區域
    const formContainer = document.getElementById('formContainer');
    const btnToggle = document.getElementById('btnToggleSection');
    if (formContainer) {
      formContainer.classList.remove('collapsed');
    }
    if (btnToggle) {
      btnToggle.textContent = '▲ 收合輸入區';
    }

    this.currentResult = null;
  }

  _showLoading(message) {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">${message}</p>
      </div>
    `;
    overlay.style.display = 'flex';
  }

  _hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  _showError(message) {
    this._hideLoading();
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'errorMessage';
      errorDiv.className = 'error-message';
      const main = document.querySelector('.main-content') || document.body;
      main.insertBefore(errorDiv, main.firstChild);
    }
    errorDiv.innerHTML = `<p>${message}</p><button class="btn btn-secondary" onclick="this.parentElement.style.display='none'">關閉</button>`;
    errorDiv.style.display = 'block';
  }

  _showResultSection() {
    const section = document.getElementById('resultSection');
    const formContainer = document.getElementById('formContainer');
    const btnToggle = document.getElementById('btnToggleSection');
    
    // 顯示結果區域
    if (section) {
      section.style.display = 'block';
    }
    
    // 收合表單區域（不隱藏）
    if (formContainer) {
      formContainer.classList.add('collapsed');
    }
    if (btnToggle) {
      btnToggle.textContent = '▼ 展開輸入區';
    }
    
    // 滾動到個人基本盤卡片上方
    setTimeout(() => {
      const baziSummary = document.querySelector('.bazi-summary');
      if (baziSummary) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const cardTop = baziSummary.getBoundingClientRect().top + window.pageYOffset - headerHeight - 16;
        window.scrollTo({ top: cardTop, behavior: 'smooth' });
      }
    }, 150);
  }

  _renderResult(result) {
    const container = document.getElementById('resultContent');
    if (!container) return;

    const { bazi, today, tomorrow, fourteenDays } = result;

    let html = '';

    html += this._renderBaziSummary(bazi);
    html += this._renderDaySummary(today.summary, '今日總覽');
    html += this._renderHourCards(today.hours, '今日時辰');
    html += this._renderDaySummary(tomorrow.summary, '明日總覽');
    html += this._renderHourCards(tomorrow.hours, '明日時辰');
    html += this._render14Days(fourteenDays);
    html += this._renderDisclaimer();

    container.innerHTML = html;
    this._bindCardToggle();
  }

  _renderBaziSummary(bazi) {
    const pillars = [];
    if (bazi.year) pillars.push(`年柱：${bazi.year.name}`);
    if (bazi.month) pillars.push(`月柱：${bazi.month.name}`);
    if (bazi.day) pillars.push(`日柱：${bazi.day.name}`);
    if (bazi.hour && !bazi.hour.isUnknown) {
      pillars.push(`時柱：${bazi.hour.name}`);
    } else {
      pillars.push('時柱：未知');
    }

    const tenGodInfo = bazi.tenGods?.hour ? `時柱十神：${bazi.tenGods.hour.name}` : '';
    const branchSummary = bazi.branchRelations?.summary?.length > 0
      ? `<p class="bazi-relations">地支關係：${bazi.branchRelations.summary.join('、')}</p>`
      : '';

    return `
      <div class="result-card bazi-summary">
        <h3 class="card-title">個人基本盤</h3>
        <div class="bazi-pillars">${pillars.map(p => `<span class="pillar">${p}</span>`).join('')}</div>
        <div class="bazi-master">日主：${bazi.dayMaster.stem}（${bazi.dayMaster.label}）</div>
        ${tenGodInfo ? `<p class="bazi-tengod">${tenGodInfo}</p>` : ''}
        ${branchSummary}
        ${bazi.birthInfo?.note ? `<p class="bazi-note">${bazi.birthInfo.note}</p>` : ''}
      </div>
    `;
  }

  _renderDaySummary(summary, title) {
    const score = summary.averageScore;
    const circumference = 2 * Math.PI * 40;
    const dashoffset = circumference - (score / 100) * circumference;
    const scoreColor = summary.levelColor;
    
    return `
      <div class="result-card day-summary">
        <div class="day-summary-header">
          <div class="day-score-chart">
            <svg viewBox="0 0 100 100" class="score-ring">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E6D6B8" stroke-width="8"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="${scoreColor}" stroke-width="8"
                stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
                stroke-linecap="round" transform="rotate(-90 50 50)"/>
            </svg>
            <div class="score-text">
              <span class="score-number">${score}</span>
              <span class="score-label">分</span>
            </div>
          </div>
          <div class="day-info">
            <h3 class="card-title">${title}</h3>
            <span class="day-date">${summary.date} ${summary.weekday}</span>
            <span class="day-level" style="background-color:${scoreColor}">${summary.level}</span>
            <div class="day-range">最高 ${summary.maxScore} / 最低 ${summary.minScore}</div>
          </div>
        </div>
        ${summary.bestHours.length > 0 ? `<p class="day-best">最佳時辰：${summary.bestHours.join('、')}</p>` : ''}
        ${summary.riskHours.length > 0 ? `<p class="day-risk">注意時辰：${summary.riskHours.join('、')}</p>` : ''}
      </div>
    `;
  }

  _renderHourCards(hours, title) {
    const cards = hours.map(h => {
      const suitableHtml = h.suitable.length > 0
        ? `<div class="hour-suitable"><strong>適合：</strong>${h.suitable.slice(0, 2).join('、')}</div>` : '';
      const avoidHtml = h.avoid.length > 0
        ? `<div class="hour-avoid"><strong>避免：</strong>${h.avoid.slice(0, 2).join('、')}</div>` : '';

      return `
        <div class="hour-card" data-hour="${h.hourBranch}">
          <div class="hour-header">
            <span class="hour-name">${h.hourName}</span>
            <span class="hour-time">${h.timeRange}</span>
            <span class="hour-score" style="color:${h.levelColor}">${h.score}分</span>
            <span class="hour-level" style="background-color:${h.levelColor}">${h.level}</span>
          </div>
          <p class="hour-headline">${h.headline}</p>
          ${suitableHtml}
          ${avoidHtml}
          <button class="btn-toggle-detail">展開詳細</button>
          <div class="hour-detail" style="display:none;">
            <div class="detail-section">
              <h4>八字分析</h4>
              <p>時柱：${h.systems.bazi.hourGanzhi || '-'}</p>
              <p>十神：${h.systems.bazi.tenGod || '-'}</p>
              <p>分數：${h.systems.bazi.score >= 0 ? '+' : ''}${h.systems.bazi.score}</p>
            </div>
            <div class="detail-section">
              <h4>易經分析</h4>
              <p>卦象：${h.systems.iching.hexagram || '-'}</p>
              ${h.systems.iching.changedHexagram ? `<p>變卦：${h.systems.iching.changedHexagram}</p>` : ''}
              ${h.systems.iching.movingLine ? `<p>動爻：第${h.systems.iching.movingLine}爻</p>` : ''}
              <p>分數：${h.systems.iching.score >= 0 ? '+' : ''}${h.systems.iching.score}</p>
            </div>
            <div class="detail-section">
              <h4>奇門遁甲</h4>
              <p>${h.systems.qimen.yinYangDun || ''} ${h.systems.qimen.ju ? h.systems.qimen.ju + '局' : ''}</p>
              <p>八門：${h.systems.qimen.door || '-'}</p>
              <p>九星：${h.systems.qimen.star || '-'}</p>
              <p>分數：${h.systems.qimen.score >= 0 ? '+' : ''}${h.systems.qimen.score}</p>
            </div>
            ${h.trace.length > 0 ? `
            <div class="detail-section">
              <h4>計分來源</h4>
              <div class="trace-list">
                ${h.trace.map(t => {
                  const desc = this._getTraceDescription(t);
                  return `<div class="trace-item"><span class="trace-score ${t.score >= 0 ? 'positive' : 'negative'}">${t.score >= 0 ? '+' : ''}${t.score}</span> ${desc}</div>`;
                }).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="result-card hour-section">
        <h3 class="card-title">${title}</h3>
        <div class="hour-grid">${cards}</div>
      </div>
    `;
  }

  _render14Days(days) {
    // 計算最大最小分數用於圖表高度
    const scores = days.map(d => d.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // 生成趨勢圖
    const trendBars = days.map((d, i) => {
      const height = ((d.score - 0) / 100) * 60;
      return `
        <div class="trend-bar-wrapper" title="${d.date} ${d.weekday} ${d.score}分 ${d.level}">
          <div class="trend-bar" style="height:${height}px;background-color:${d.levelColor}"></div>
          <div class="trend-score">${d.score}</div>
          <div class="trend-date">${d.date.split('-')[2]}</div>
        </div>
      `;
    }).join('');

    // 生成簡潔卡片列表
    const cards = days.map(d => `
      <div class="fourteen-item">
        <span class="fourteen-item-date">${d.date.split('-')[2]}日 ${d.weekday}</span>
        <span class="fourteen-item-score" style="color:${d.levelColor}">${d.score}分</span>
        <span class="fourteen-item-level" style="background-color:${d.levelColor}">${d.level}</span>
        <span class="fourteen-item-theme">${d.theme}</span>
      </div>
    `).join('');

    return `
      <div class="result-card fourteen-section">
        <h3 class="card-title">接下來 14 天概述</h3>
        
        <div class="trend-chart">
          <div class="trend-labels">
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>
          <div class="trend-bars">${trendBars}</div>
        </div>
        
        <div class="fourteen-list">${cards}</div>
      </div>
    `;
  }

  _getTraceDescription(trace) {
    // 把專業術語轉換成白話文
    const { system, rule, value, score, reason } = trace;
    
    // 八字相關
    if (system === 'bazi') {
      if (rule === 'hourTenGod') {
        const tenGodDesc = {
          '正官': '遇到正官，代表有貴人相助、地位提升的機會',
          '七殺': '遇到七殺，壓力較大，但有突破的機會',
          '正財': '遇到正財，財運穩定，適合處理金錢事務',
          '偏財': '遇到偏財，有意外之財或合作機會',
          '食神': '遇到食神，心情愉悅，適合享受生活',
          '傷官': '遇到傷官，創意豐富，但要注意口舌',
          '正印': '遇到正印，有長輩或貴人幫助',
          '偏印': '遇到偏印，學習運佳，適合進修',
          '比肩': '遇到比肩，與同輩競爭或合作',
          '劫財': '遇到劫財，要小心財務損失'
        };
        return tenGodDesc[value] || `時柱遇到${value}`;
      }
      if (rule === 'elementRelation') {
        const relations = {
          'metal-water': '時辰五行與日主相生，運勢順暢',
          'water-wood': '時辰五行與日主相生，運勢順暢',
          'wood-fire': '時辰五行與日主相生，運勢順暢',
          'fire-earth': '時辰五行與日主相生，運勢順暢',
          'earth-metal': '時辰五行與日主相生，運勢順暢',
          'metal-wood': '時辰五行與日主相剋，需謹慎行事',
          'wood-earth': '時辰五行與日主相剋，需謹慎行事',
          'earth-water': '時辰五行與日主相剋，需謹慎行事',
          'water-fire': '時辰五行與日主相剋，需謹慎行事',
          'fire-metal': '時辰五行與日主相剋，需謹慎行事'
        };
        return relations[value] || `時辰五行與日主的關係`;
      }
    }
    
    // 奇門遁甲相關
    if (system === 'qimen') {
      if (rule === 'door') {
        const doorDesc = {
          '開門': '遇到開門，適合開始新計劃、開創新局',
          '休門': '遇到休門，適合休息、等待、修復關係',
          '生門': '遇到生門，財運佳、適合投資或交易',
          '傷門': '遇到傷門，容易有衝突或損失，需謹慎',
          '杜門': '遇到杜門，適合隱藏、保密、等待時機',
          '景門': '遇到景門，適合考試、面試、展現才華',
          '死門': '遇到死門，運勢較差，宜靜不宜動',
          '驚門': '遇到驚門，容易有驚嚇或意外，需小心'
        };
        return doorDesc[value] || `遇到${value}`;
      }
      if (rule === 'star') {
        const starDesc = {
          '天輔': '天輔星相助，學習運佳、有貴人指點',
          '天禽': '天禽星照臨，運勢穩定、適合處理重要事務',
          '天心': '天心星守護，決策力強、適合做重要決定',
          '天任': '天任星助力，責任感強、適合承擔重任',
          '天沖': '天沖星影響，行動力強、但要避免衝動',
          '天英': '天英星照耀，適合展現才華、但要務實',
          '天蓬': '天蓬星干擾，要小心意外、避免冒險',
          '天芮': '天芮星影響，健康運較差、要注意休息',
          '天柱': '天柱星動搖，容易有變動、需穩定心神'
        };
        return starDesc[value] || `${value}影響`;
      }
      if (rule === 'god') {
        const godDesc = {
          '值符': '值符守護，運勢強旺、適合主動出擊',
          '太陰': '太陰庇佑，暗中有貴人、適合私下進行',
          '六合': '六合助力，人緣佳、適合合作或社交',
          '九地': '九地穩固，基礎扎實、適合守成',
          '九天': '九天開運，視野開闊、適合拓展',
          '騰蛇': '騰蛇干擾，容易有虛驚、要保持冷靜',
          '白虎': '白虎動怒，容易有衝突、要避免爭執',
          '玄武': '玄武遮眼，容易被騙、要小心判斷'
        };
        return godDesc[value] || `${value}影響`;
      }
    }
    
    // 易經相關
    if (system === 'iching') {
      if (rule === 'hexagram') {
        return `卦象：${value}`;
      }
    }
    
    // 預設
    return reason || `${value}`;
  }

  _renderDisclaimer() {
    return `
      <div class="result-card disclaimer-card">
        <p class="disclaimer-text">本工具依傳統命術規則推算，內容屬民俗文化與個人參考，不作為醫療、法律、投資、婚姻或人生重大決策保證。</p>
        <p class="disclaimer-text">子時跨日規則依本系統設定，部分派別可能不同。月柱節氣切換規則尚需人工校驗。奇門遁甲存在流派差異，本系統採固定時家奇門規則。</p>
      </div>
    `;
  }

  _bindCardToggle() {
    document.querySelectorAll('.btn-toggle-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = btn.nextElementSibling;
        if (detail) {
          const isVisible = detail.style.display !== 'none';
          detail.style.display = isVisible ? 'none' : 'block';
          btn.textContent = isVisible ? '展開詳細' : '收起詳細';
        }
      });
    });
  }
}

window.App = App;
