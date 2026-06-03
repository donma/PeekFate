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
    this._eventType = 'general';
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

    // 共享節氣數據給奇門引擎
    if (this.baziEngine?.solarTerms) {
      this.qimenEngine.setSolarTerms(this.baziEngine.solarTerms);
    }

    this.celebrities = [];

    const failed = loadResults.filter(r => r.status === 'rejected' || r.value === false);
    if (failed.length > 0) {
      console.warn(`${failed.length} 個引擎載入部分數據失敗，將使用備用數據`);
      const errorDiv = document.getElementById('engineError');
      if (errorDiv) {
        errorDiv.innerHTML = `
          ${failed.length} 個引擎載入失敗，部分功能可能受限。
          <button onclick="caches.keys().then(names => names.forEach(name => caches.delete(name))).then(() => location.reload(true))" style="margin-left:10px;padding:4px 8px;font-size:12px;cursor:pointer;">
            清除緩存並重新載入
          </button>
        `;
        errorDiv.style.display = 'block';
      }
    } else {
      // 隱藏錯誤訊息
      const errorDiv = document.getElementById('engineError');
      if (errorDiv) errorDiv.style.display = 'none';
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
        btnToggle.textContent = isCollapsed ? '▲ 收合輸入區' : '▼ 修改資料';
      });
    }
  }

  _loadSavedProfile() {
    try {
      const saved = localStorage.getItem('fortunePwaUserProfile');
      const formContainer = document.getElementById('formContainer');
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

        // 恢復時辰下拉
        const birthHourInput = document.getElementById('birthHour');
        if (birthHourInput && profile.birthHour) {
          birthHourInput.value = profile.birthHour;
        }

        // 恢復性別
        if (profile.gender) {
          const radios = document.querySelectorAll('input[name="gender"]');
          for (const r of radios) {
            if (r.value === profile.gender) { r.checked = true; break; }
          }
        }

        // 恢復推算類別
        const categorySelect = document.getElementById('eventCategory');
        if (categorySelect && profile.eventCategory) {
          categorySelect.value = profile.eventCategory;
          this._eventType = profile.eventCategory;
        }
        
        // 有資料時自動推算
        if (profile.birthDate) {
          console.log('已載入儲存的用戶資料，自動推算中...');
          setTimeout(() => this._handleFormSubmit(), 100);
        }
      } else {
        // 無儲存資料時展開表單
        const inputSection = document.getElementById('inputSection');
        if (inputSection) inputSection.style.display = '';
        if (formContainer) formContainer.classList.remove('collapsed');
      }
    } catch (error) {
      console.warn('無法載入已儲存的資料:', error);
      const inputSection = document.getElementById('inputSection');
      if (inputSection) inputSection.style.display = '';
    }
  }

  async _handleFormSubmit() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const formData = this._getFormData();
      this._eventType = formData.eventCategory || 'general';
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
      // 隱藏輸入區
      const inputSection = document.getElementById('inputSection');
      if (inputSection) inputSection.style.display = 'none';
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
    let gender = null;
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    if (genderRadios) {
      for (const radio of genderRadios) {
        if (radio.checked) { gender = radio.value; break; }
      }
    }

    const hourMap = {
      'zi': '23:00', 'chou': '02:00', 'yin': '04:00', 'mao': '06:00',
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

    const eventCategory = document.getElementById('eventCategory')?.value || 'general';

    return { birthDate, birthTime: time, unknownTime, rememberMe, gender, eventCategory };
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

    const baziResult = this.baziEngine.calculateBazi(birthDate, birthTime, formData.gender);

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
    return `${formData.birthDate}_${formData.birthTime || 'unknown'}_${formData.gender || 'unknown'}_${today}`;
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = date.getTime() === today.getTime();
    const currentHour = now.getHours();

    // 標記已過時辰（用於顯示時過濾）
    const isPast = (hb) => {
      if (!isToday) return false;
      const startHour = parseInt(hb.start.split(':')[0]);
      // 23點以後，今日所有時辰都已過（子時屬於明日）
      if (currentHour >= 23) return true;
      if (hb.branch === '子') return currentHour >= 1;
      return currentHour > startHour + 2;
    };

    const results = [];
    const dayMasterElement = baziResult.dayMaster.element;

    for (const hb of hourBranches) {
      try {
        const hourResult = this._calculateSingleHour(baziResult, date, hb, dayMasterElement);
        hourResult._past = isPast(hb);
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
    const flowDayPillar = this.baziEngine.calculateDayPillar(date);
    const hourGanzhi = this._calculateHourGanzhi(flowDayPillar.stem, baziResult.day.stem, hourBranch.branch);

    let baziScore = 0;
    const baziTrace = [];

    if (hourGanzhi.tenGod) {
      const tenGodScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[hourGanzhi.tenGod.name] || 0;
      // 日主旺衰動態調整：旺/相時喜官殺財食傷，忌印比；囚/死時反轉
      const strength = baziResult.dayMasterStrength || '休';
      const tenGodType = hourGanzhi.tenGod.type;
      const dynamicModifiers = {
        '旺': { favor: ['officer', 'wealth', 'output'], unfavor: ['resource', 'peer'] },
        '相': { favor: ['officer', 'wealth', 'output'], unfavor: ['resource', 'peer'] },
        '休': { favor: [], unfavor: [] },
        '囚': { favor: ['resource', 'peer'], unfavor: ['officer', 'wealth', 'output'] },
        '死': { favor: ['resource', 'peer'], unfavor: ['officer', 'wealth', 'output'] }
      };
      const mod = dynamicModifiers[strength] || dynamicModifiers['休'];
      let adjustedScore = tenGodScore;
      if (mod.favor.includes(tenGodType)) {
        adjustedScore = Math.round(tenGodScore * 1.5);
      } else if (mod.unfavor.includes(tenGodType)) {
        adjustedScore = Math.round(tenGodScore * 0.5);
      }
      baziScore += adjustedScore;
      const reason = mod.favor.includes(tenGodType) ? `${hourGanzhi.tenGod.name}（日主${strength}，喜用）`
        : mod.unfavor.includes(tenGodType) ? `${hourGanzhi.tenGod.name}（日主${strength}，忌神）`
        : `時干對日主形成${hourGanzhi.tenGod.name}`;
      baziTrace.push({
        system: 'bazi', rule: 'hourTenGod', value: hourGanzhi.tenGod.name,
        score: adjustedScore, reason
      });
    }

    const hourBranchElement = this._getBranchElement(hourBranch.branch);
    const elementRelationScore = this._calculateElementRelationScore(dayMasterElement, hourBranchElement);
    baziScore += elementRelationScore;
    baziTrace.push({
      system: 'bazi', rule: 'elementRelation', value: `${dayMasterElement}-${hourBranchElement}`,
      score: elementRelationScore, reason: `時支五行${hourBranchElement}與日主${dayMasterElement}的關係`
    });

    // 旬空扣分：時支若為空亡，能量減半
    if (baziResult.kongWang && baziResult.kongWang.length > 0) {
      if (baziResult.kongWang.includes(hourBranch.branch)) {
        const kongWangPenalty = -3;
        baziScore += kongWangPenalty;
        baziTrace.push({
          system: 'bazi', rule: 'kongWang', value: hourBranch.branch,
          score: kongWangPenalty, reason: `時支${hourBranch.branch}為空亡，能量受阻`
        });
      }
    }

    // 用神喜忌加分：時干/時支五行為用神則加，為忌神則扣
    if (baziResult.yongShen) {
      const yong = baziResult.yongShen.yongShen;
      const ji = baziResult.yongShen.jiShen;
      if (yong || ji) {
        const hourStemElement = this.baziEngine._stemToElement ? this.baziEngine._stemToElement(hourGanzhi.stem) : null;
        const hourBranchElement2 = this._getBranchElement(hourBranch.branch);
        let yongScore = 0;
        if (yong && hourStemElement === yong) { yongScore += 3; }
        if (yong && hourBranchElement2 === yong) { yongScore += 1; }
        if (ji && hourStemElement === ji) { yongScore -= 3; }
        if (ji && hourBranchElement2 === ji) { yongScore -= 1; }
        if (yongScore !== 0) {
          baziScore += yongScore;
          baziTrace.push({
            system: 'bazi', rule: 'yongShen', value: baziResult.yongShen.yongShenLabel || '',
            score: yongScore,
            reason: yongScore > 0 ? `時柱五行合用神${baziResult.yongShen.yongShenLabel}，吉`
              : `時柱五行犯忌神${baziResult.yongShen.jiShenLabel}，凶`
          });
        }
      }
    }

    // 神煞計分（日支/年支的神煞影響全局）
    if (baziResult.shenSha && baziResult.shenSha.length > 0) {
      for (const ss of baziResult.shenSha) {
        const shaScore = ss.isGood ? 2 : -2;
        baziScore += shaScore;
        baziTrace.push({
          system: 'bazi', rule: 'shenSha', value: ss.name,
          score: shaScore, reason: `${ss.name}（${ss.isGood ? '吉神' : '凶煞'}）`
        });
      }
    }

    // 地支關係深度扣分（刑沖害 vs 合會）
    if (baziResult.branchRelationScore) {
      const relScore = baziResult.branchRelationScore;
      if (relScore !== 0) {
        baziScore += relScore;
        baziTrace.push({
          system: 'bazi', rule: 'branchRelation', value: `${relScore > 0 ? '合會' : '刑沖'}`,
          score: relScore, reason: relScore > 0 ? '地支合會多，氣場和諧' : '地支刑沖害多，氣場動盪'
        });
      }
    }

    // 日主有根/無根修正
    if (baziResult.rootInfo) {
      const rm = baziResult.rootInfo.modifier;
      if (rm !== 0) {
        baziScore += rm;
        baziTrace.push({
          system: 'bazi', rule: 'root',
          score: rm,
          reason: rm > 0 ? `日主有根${baziResult.rootInfo.exposed ? '且透出' : ''}，扎根有力`
            : '日主無根，虛浮無力'
        });
      }
    }

    // 藏干透出十神
    if (baziResult.hiddenStemDetails) {
      const rules = this.scoringEngine.scoreRules?.baziScores?.tenGods || {};
      let hiddenScore = 0;
      for (const [pos, items] of Object.entries(baziResult.hiddenStemDetails)) {
        if (!items || items.length === 0) continue;
        items.forEach((item, idx) => {
          const baseScore = rules[item.tenGod] || 0;
          // 本氣藏干全分，餘者半數
          let s = idx === 0 ? baseScore : Math.round(baseScore * 0.5);
          // 透出加倍
          if (item.isExposed) s *= 2;
          hiddenScore += s;
        });
      }
      if (hiddenScore !== 0) {
        baziScore += hiddenScore;
        baziTrace.push({
          system: 'bazi', rule: 'hiddenStem',
          score: hiddenScore,
          reason: hiddenScore > 0 ? '藏干透出十神多為吉' : '藏干透出十神多為凶'
        });
      }
    }

    // 納音五行深度
    if (baziResult.nayinDepth?.details) {
      for (const nd of baziResult.nayinDepth.details) {
        if (nd.score !== 0) {
          baziScore += nd.score;
          const posZh = {year:'年',month:'月',day:'日',hour:'時'}[nd.position] || nd.position;
          baziTrace.push({ system: 'bazi', rule: 'nayinDepth', value: nd.nayin, score: nd.score, reason: `${posZh}柱納音${nd.nayin}${nd.relation}日主` });
        }
      }
    }

    // 暗合暗沖
    if (baziResult.anHeScore && baziResult.anHeScore !== 0) {
      baziScore += baziResult.anHeScore;
      baziTrace.push({ system: 'bazi', rule: 'anHe', score: baziResult.anHeScore, reason: '地支暗合，氣場暗通' });
    }

    // 身強身弱精確判定（新增）
    if (baziResult.bodyStrength) {
      const bs = baziResult.bodyStrength;
      const bsScore = Math.round(bs.total * 1.5);
      if (bsScore !== 0) {
        baziScore += bsScore;
        baziTrace.push({ system: 'bazi', rule: 'bodyStrength', score: bsScore, reason: `身強身弱：${bs.level}(${bs.deLing.detail}, ${bs.deDi.detail}, ${bs.deShi.detail})` });
      }
    }

    // 格局加分（新增）
    if (baziResult.pattern) {
      const pScore = baziResult.pattern.type === '從格' ? 5 : baziResult.pattern.type === '專旺格' ? 5 : baziResult.pattern.type === '八格' ? 2 : 0;
      if (pScore !== 0) {
        baziScore += pScore;
        baziTrace.push({ system: 'bazi', rule: 'pattern', score: pScore, reason: `格局：${baziResult.pattern.name}` });
      }
    }

    // 十二長生（日主在時支狀態）
    if (baziResult.shiErChangSheng?.hour) {
      const ces = baziResult.shiErChangSheng.hour;
      if (ces.score !== 0) {
        baziScore += ces.score;
        baziTrace.push({ system: 'bazi', rule: 'shiErChangSheng', value: ces.state, score: ces.score, reason: `日主在時支${ces.state}（${ces.score >= 0 ? '吉' : '凶'}）` });
      }
    }

    // 天干沖剋
    if (baziResult.stemClashScore && baziResult.stemClashScore !== 0) {
      baziScore += baziResult.stemClashScore;
      baziTrace.push({ system: 'bazi', rule: 'stemClash', score: baziResult.stemClashScore, reason: '天干沖剋，氣場不和' });
    }

    // 大運細化（放大運的影響）
    if (baziResult.dayun?.pillars?.length > 0) {
      const firstDayun = baziResult.dayun.pillars[0];
      if (firstDayun.tenGod) {
        const dyScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[firstDayun.tenGod] || 0;
        const dyAdjusted = Math.round(dyScore * 0.4);
        if (dyAdjusted !== 0) {
          baziScore += dyAdjusted;
          baziTrace.push({ system: 'bazi', rule: 'dayunGod', value: firstDayun.tenGod, score: dyAdjusted, reason: `大運天干為${firstDayun.tenGod}` });
        }
      }
      if (firstDayun.isYongMatch) {
        baziScore += 2;
        baziTrace.push({ system: 'bazi', rule: 'dayunYong', score: 2, reason: '大運五行合用以神' });
      }
      if (!firstDayun.isFavorable) {
        baziScore -= 2;
        baziTrace.push({ system: 'bazi', rule: 'dayunFavorable', score: -2, reason: '大運五行不利日主' });
      }
    }

    // 天干合化加分
    if (baziResult.stemCombinations) {
      let combScore = 0;
      if (baziResult.stemCombinations.yearMonth?.combined) combScore += 2;
      if (baziResult.stemCombinations.monthDay?.combined) combScore += 2;
      if (combScore > 0) {
        baziScore += combScore;
        baziTrace.push({ system: 'bazi', rule: 'stemCombine', score: combScore, reason: '天干合化成功，氣場和諧' });
      }
    }

    // 流年/流月影響
    let isSuiYunBingLin = false;
    const flowYear = this.baziEngine.calculateYearPillar(date);
    const flowMonth = this.baziEngine.calculateMonthPillar(date);
    if (flowYear) {
      const flowYearTenGod = this.baziEngine.getTenGod(baziResult.day.stem, flowYear.stem);
      if (flowYearTenGod) {
        const fyScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[flowYearTenGod.name] || 0;
        let fyAdjusted = Math.round(fyScore * 1.0);
        const matchDayun = baziResult.dayun?.pillars?.find(p => p.name === flowYear.name);
        if (matchDayun) {
          fyAdjusted = Math.round(fyAdjusted * 2);
          isSuiYunBingLin = true;
        }
        if (fyAdjusted !== 0) {
          baziScore += fyAdjusted;
          baziTrace.push({
            system: 'bazi', rule: 'flowYear', value: `${flowYear.name} ${flowYearTenGod.name}`,
            score: fyAdjusted, reason: `流年${flowYear.name}對日主形成${flowYearTenGod.name}（${fyScore >= 0 ? '吉' : '凶'}）${matchDayun ? '，歲運並臨加倍' : ''}`
          });
        }
        if (matchDayun) {
          baziTrace.push({ system: 'bazi', rule: 'suiYunBingLin', score: Math.round(fyScore * 1.0), reason: `歲運並臨：流年${flowYear.name}=大運，效應加倍` });
        }
      }
      // 流年支與四柱刑沖合會
      const flowYearBranches = [flowYear.branch, baziResult.year?.branch, baziResult.month?.branch, baziResult.day?.branch, hourBranch?.branch].filter(Boolean);
      if (flowYearBranches.length >= 2) {
        const flowYearRels = this.baziEngine.getBranchRelations(flowYearBranches);
        const flowScore = this.baziEngine._calculateBranchRelationScore(flowYearRels) * 0.8;
        if (Math.abs(flowScore) > 0) {
          baziScore += Math.round(flowScore);
          baziTrace.push({
            system: 'bazi', rule: 'flowYearBranch',
            score: Math.round(flowScore),
            reason: flowScore > 0 ? '流年支與命局合會，吉' : '流年支與命局刑沖，凶'
          });
        }
      }
    }
    if (flowMonth) {
      const flowMonthTenGod = this.baziEngine.getTenGod(baziResult.day.stem, flowMonth.stem);
      if (flowMonthTenGod) {
        const fmScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[flowMonthTenGod.name] || 0;
        const fmAdjusted = Math.round(fmScore * 0.6);
        if (fmAdjusted !== 0) {
          baziScore += fmAdjusted;
          baziTrace.push({
            system: 'bazi', rule: 'flowMonth', value: `${flowMonth.name} ${flowMonthTenGod.name}`,
            score: fmAdjusted, reason: `流月${flowMonth.name}對日主形成${flowMonthTenGod.name}`
          });
        }
      }
    }

    // 流日完整互動
    if (flowDayPillar) {
      // 流日十神（原有）
      const flowDayTenGod = this.baziEngine.getTenGod(baziResult.day.stem, flowDayPillar.stem);
      if (flowDayTenGod) {
        const fdScore = this.scoringEngine.scoreRules?.baziScores?.tenGods?.[flowDayTenGod.name] || 0;
        const fdAdjusted = Math.round(fdScore * 1.2);
        if (fdAdjusted !== 0) {
          baziScore += fdAdjusted;
          baziTrace.push({
            system: 'bazi', rule: 'flowDay', value: `${flowDayPillar.name} ${flowDayTenGod.name}`,
            score: fdAdjusted, reason: `流日${flowDayPillar.name}對日主形成${flowDayTenGod.name}`
          });
        }
      }
      // 流日支與時支關係（原有）
      const flowDayBranches = [flowDayPillar.branch, hourBranch.branch].filter(Boolean);
      if (flowDayBranches.length >= 2) {
        const flowDayRels = this.baziEngine.getBranchRelations(flowDayBranches);
        const fdRelScore = this.baziEngine._calculateBranchRelationScore(flowDayRels) * 0.8;
        if (Math.abs(fdRelScore) > 0) {
          baziScore += Math.round(fdRelScore);
          baziTrace.push({
            system: 'bazi', rule: 'flowDayBranch',
            score: Math.round(fdRelScore),
            reason: fdRelScore > 0 ? '流日支與時支合會，吉' : '流日支與時支刑沖，凶'
          });
        }
      }
      // 流日天干 vs 四柱 + 伏吟反吟（新增）
      const fdi = this._calculateFlowDayInteractions(flowDayPillar, baziResult);
      if (fdi.totalScore !== 0) {
        baziScore += fdi.totalScore;
        for (const t of fdi.traces) {
          baziTrace.push({ system: 'bazi', rule: t.rule, score: t.score, reason: t.reason });
        }
      }
    }

    // 流日神煞（天德/月德/天赦 — 以流月支+流日干判斷）
    if (flowDayPillar && flowMonth) {
      const tianDeMap = { '寅':'丁','卯':'申','辰':'壬','巳':'辛','午':'亥','未':'甲','申':'癸','酉':'寅','戌':'丙','亥':'乙','子':'巳','丑':'庚' };
      const yueDeSeason = { '寅':'丙','午':'丙','戌':'丙','巳':'庚','酉':'庚','丑':'庚','申':'壬','子':'壬','辰':'壬','亥':'甲','卯':'甲','未':'甲' };
      const tianSheSeason = { '寅':'戊寅','卯':'戊寅','辰':'戊寅','巳':'甲午','午':'甲午','未':'甲午','申':'戊申','酉':'戊申','戌':'戊申','亥':'甲子','子':'甲子','丑':'甲子' };
      const flowMonthBranch = flowMonth.branch;
      let flowDeityScore = 0;
      if (tianDeMap[flowMonthBranch] === flowDayPillar.stem) { flowDeityScore += 3; }
      if (yueDeSeason[flowMonthBranch] === flowDayPillar.stem) { flowDeityScore += 3; }
      if (tianSheSeason[flowMonthBranch] === (flowDayPillar.stem + flowDayPillar.branch)) { flowDeityScore += 3; }
      if (flowDeityScore !== 0) {
        baziScore += flowDeityScore;
        baziTrace.push({ system: 'bazi', rule: 'flowDeity', score: flowDeityScore, reason: `流日逢天德/月德/天赦，日辰吉利` });
      }
    }

    baziScore = Math.max(-35, Math.min(35, baziScore));

    let ichingResult = null;
    let ichingScore = 0;
    const ichingTrace = [];
    try {
      if (this.ichingEngine && this.ichingEngine.loaded) {
        ichingResult = this.ichingEngine.deriveHourHexagram(date, hourBranch.branch, baziResult);
        if (ichingResult && ichingResult.hexagram) {
          const personalized = this.ichingEngine.personalizeHexagramByElement(ichingResult.hexagram, dayMasterElement);
          ichingScore = this._calculateIchingScore(personalized, ichingResult);
          ichingTrace.push({
            system: 'iching', rule: 'hexagram', value: ichingResult.hexagram.name,
            score: ichingScore, reason: `卦象${ichingResult.hexagram.name}，五行${personalized.advice?.strengthLevel || '平穩'}`
          });
        } else {
          console.warn('易經引擎返回空結果');
        }
      } else {
        console.warn('易經引擎未載入', this.ichingEngine?.loaded);
      }
    } catch (error) {
      console.warn('易經計算錯誤:', error.message);
      ichingScore = 0;
    }
    ichingScore = Math.max(-20, Math.min(20, ichingScore));

    let qimenChart = null;
    let qimenScore = 0;
    const qimenTrace = [];
    try {
      qimenChart = this.qimenEngine.calculateQimenHourChart(date, hourBranch.branch);
      if (qimenChart) {
        qimenScore = this._calculateQimenScore(qimenChart, date, hourBranch.branch, flowDayPillar?.stem);
        const doorName = qimenChart.zhiShi?.door || '未知';
        qimenTrace.push({
          system: 'qimen', rule: 'door', value: doorName,
          score: this._getQimenDoorScore(qimenChart.zhiShi?.door),
          reason: `值使門${doorName}`
        });
        if (qimenChart.zhiFu?.star) {
          qimenTrace.push({
            system: 'qimen', rule: 'star', value: qimenChart.zhiFu.star,
            score: this._getQimenStarScore(qimenChart.zhiFu.star),
            reason: `值符星${qimenChart.zhiFu.star}`
          });
        }
      }
    } catch (error) {
      console.warn('奇門計算錯誤:', error);
    }
    qimenScore = Math.max(-35, Math.min(35, qimenScore));

    const balanceScore = this._calculateBalanceScore(baziResult, ichingResult, qimenChart);

    // v51 event-type specific scoring as primary
    const hourTenGodName = hourGanzhi.tenGod?.name || null;
    const eventType = ScoringEngine.USER_CATEGORIES[this._eventType]?.profile || 'default';
    const eventScore = this.scoringEngine.calculateEventMatchScore(
      baziResult, this.baziEngine, date, hourTenGodName, eventType
    );
    const ichingAdj = Math.round(ichingScore * 0.12);
    const qimenAdj = Math.round(qimenScore * 0.06);
    const finalScore = Math.max(0, Math.min(100, eventScore + ichingAdj + qimenAdj));
    const levelInfo = this.scoringEngine.getScoreLevel(finalScore);

    let tenGodName = hourGanzhi.tenGod?.name || '未知';
    let doorName = qimenChart?.zhiShi?.door || '';
    let starName = qimenChart?.zhiFu?.star || '';
    let godName = this._getQimenGod(qimenChart);

    let interpretation = null;
    try {
      interpretation = this.interpretationEngine.buildHourReading({
        tenGod: tenGodName,
        door: doorName,
        star: starName,
        god: godName,
        hexagram: ichingResult?.hexagram?.name || '',
        score: finalScore,
        level: levelInfo.level,
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
      score: finalScore,
      level: levelInfo.level,
      levelColor: levelInfo.color,
      headline: interpretation?.headline || this._getDefaultHeadline(levelInfo.level),
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

  _calculateHourGanzhi(calcDayStem, birthDayStem, hourBranch) {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    // calcDayStem: 用於五鼠遁推定時干（當日日干）
    // birthDayStem: 用於十神關係（相對於命主日干）
    const calcIndex = stems.indexOf(calcDayStem);
    const hourBranchIndex = branches.indexOf(hourBranch);
    const hourStemStart = [0, 2, 4, 6, 8];
    const hourStemIndex = (hourStemStart[calcIndex % 5] + hourBranchIndex) % 10;

    const stem = stems[hourStemIndex];
    const tenGod = this.baziEngine.getTenGod(birthDayStem, stem);

    return { stem, branch: hourBranch, name: stem + hourBranch, tenGod };
  }

  /**
   * 流日干支 vs 本命四柱完整互動計算
   * 回傳 { stemInt, branchInt, fuYin, fanYin, totalScore, traces }
   */
  _calculateFlowDayInteractions(flowDayPillar, baziResult) {
    const pillarKeys = ['year', 'month', 'day', 'hour'];
    const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const stemEl = s => ({ '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth','己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water' }[s]||'');
    const branchEl = b => ({ '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire','午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water' }[b]||'');

    // 天干五合
    const heMap = { '甲':{p:'己',el:'earth'},'乙':{p:'庚',el:'metal'},'丙':{p:'辛',el:'water'},'丁':{p:'壬',el:'wood'},'戊':{p:'癸',el:'fire'},'己':{p:'甲',el:'earth'},'庚':{p:'乙',el:'metal'},'辛':{p:'丙',el:'water'},'壬':{p:'丁',el:'wood'},'癸':{p:'戊',el:'fire'} };
    // 天干相沖: 甲庚乙辛丙壬丁癸
    const chongMap = { '甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁' };
    // 五行生
    const generateMap = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' };
    // 五行剋
    const controlMap = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' };

    const traces = [];
    let totalScore = 0;
    const stemInt = [];
    const branchInt = [];
    const keyZh = { year: '年', month: '月', day: '日', hour: '時' };
    const fuYin = {};
    const fanYin = {};

    if (!flowDayPillar) return { stemInt, branchInt, fuYin, fanYin, totalScore, traces };

    const fStem = flowDayPillar.stem;
    const fBranch = flowDayPillar.branch;

    const elZh = el => ({wood:'木',fire:'火',earth:'土',metal:'金',water:'水'}[el] || el);

    for (const key of pillarKeys) {
      const p = baziResult[key];
      if (!p) continue;
      const kz = keyZh[key] || key;

      // === 天干互動 ===
      const pStem = p.stem;
      const pStemEl = stemEl(pStem);
      const fStemEl = stemEl(fStem);

      // 天干五合
      if (heMap[fStem] && heMap[fStem].p === pStem) {
        const s = 3;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '合', element: heMap[fStem].el, score: s });
        traces.push({ rule: 'flowStemHe', key, score: s, reason: `流日${fStem}與${kz}柱${pStem}五合化${elZh(heMap[fStem].el)}` });
      }
      // 天干相沖
      if (chongMap[fStem] === pStem) {
        const s = -3;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '沖', score: s });
        traces.push({ rule: 'flowStemChong', key, score: s, reason: `流日${fStem}沖${kz}柱${pStem}` });
      }
      // 天干生入（流日生日柱）
      if (generateMap[fStemEl] === pStemEl && key !== 'day') {
        const s = 2;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '生', score: s });
        traces.push({ rule: 'flowStemGenerate', key, score: s, reason: `流日${fStem}(${elZh(fStemEl)})生${kz}柱${pStem}(${elZh(pStemEl)})` });
      }
      // 天干剋入（流日剋日柱）— 視為凶
      if (controlMap[fStemEl] === pStemEl && key === 'day') {
        const s = -2;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '剋', score: s });
        traces.push({ rule: 'flowStemControl', key, score: s, reason: `流日${fStem}(${elZh(fStemEl)})剋日主${pStem}(${elZh(pStemEl)})` });
      }
      // 天干相沖
      if (chongMap[fStem] === pStem) {
        const s = -3;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '沖', score: s });
        traces.push({ rule: 'flowStemChong', key, score: s, reason: `流日${fStem}沖${kz}柱${pStem}` });
      }
      // 天干生入（流日生日柱）
      if (generateMap[fStemEl] === pStemEl && key !== 'day') {
        const s = 2;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '生', score: s });
        traces.push({ rule: 'flowStemGenerate', key, score: s, reason: `流日${fStem}(${fStemEl})生${key}柱${pStem}(${pStemEl})` });
      }
      // 天干剋入（流日剋日柱）— 視為凶
      if (controlMap[fStemEl] === pStemEl && key === 'day') {
        const s = -2;
        totalScore += s;
        stemInt.push({ stem: fStem, target: key, type: '剋', score: s });
        traces.push({ rule: 'flowStemControl', key, score: s, reason: `流日${fStem}(${elZh(fStemEl)})剋日主${pStem}(${elZh(pStemEl)})` });
      }

      // === 地支互動 ===
      const pBranch = p.branch;
      const rels = this.baziEngine.getBranchRelations([fBranch, pBranch]);
      if (rels) {
        const relScore = this.baziEngine._calculateBranchRelationScore(rels);
        if (relScore !== 0) {
          const s = Math.round(relScore * 1.0);
          totalScore += s;
          branchInt.push({ branch: fBranch, target: key, type: rels.summary?.[0] || '刑', score: s });
          traces.push({ rule: 'flowBranchRelation', key, score: s, reason: `流日${fBranch}與${kz}柱${pBranch}${rels.summary?.[0] || '刑沖'}` });
        }
      }

      // === 伏吟/反吟 ===
      if (fStem === pStem && fBranch === pBranch) {
        const s = key === 'day' ? 8 : 5;
        totalScore += s;
        fuYin[key] = true;
        traces.push({ rule: 'fuYin', key, score: s, reason: `流日${flowDayPillar.name}與${kz}柱伏吟` });
      }
      // 反吟：天干相沖 + 地支相沖
      const branchOpposite = { '子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳' };
      if (chongMap[fStem] === pStem && branchOpposite[fBranch] === pBranch) {
        const s = key === 'day' ? -8 : -5;
        totalScore += s;
        fanYin[key] = true;
        traces.push({ rule: 'fanYin', key, score: s, reason: `流日${flowDayPillar.name}與${kz}柱反吟` });
      }
    }

    return { stemInt, branchInt, fuYin, fanYin, totalScore, traces };
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
    // 五行生剋關係計分
    // 比和：穩定 +2
    // 生我（生入）：有利 +4
    // 我生（生出）：消耗 -1
    // 我剋（剋出）：控制 +2
    // 剋我（剋入）：壓力 -4
    
    const generateMap = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const controlMap = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

    if (dayElement === hourElement) return 2;      // 比和：穩定
    if (generateMap[hourElement] === dayElement) return 4;  // 生我：有利
    if (generateMap[dayElement] === hourElement) return -1;  // 我生：消耗
    if (controlMap[dayElement] === hourElement) return 2;    // 我剋：控制
    if (controlMap[hourElement] === dayElement) return -4;   // 剋我：壓力
    return 0;
  }

  _calculateIchingScore(personalized, ichingResult) {
    const strengthScores = { '強旺': 8, '平穩': 3, '偏弱': -3, '衰弱': -8 };
    let score = strengthScores[personalized.advice?.strengthLevel] || 0;

    // 加入卦象基礎分（取自 score-rules.json）
    if (ichingResult && ichingResult.hexagram && ichingResult.hexagram.name) {
      const hexagramRules = this.scoringEngine?.scoreRules?.ichingScores?.hexagram;
      if (hexagramRules) {
        const name = ichingResult.hexagram.name;
        // 先取首字（八純卦：乾為天→乾），再取末二字（小畜、无妄），最後取末字（屯、蒙）
        let hexScore = hexagramRules[name.charAt(0)];
        if (hexScore === undefined) {
          const lastTwo = name.slice(-2);
          hexScore = hexagramRules[lastTwo];
        }
        if (hexScore === undefined) {
          const lastOne = name.slice(-1);
          hexScore = hexagramRules[lastOne];
        }
        if (hexScore && hexScore !== 0) score += hexScore;
      }
    }

    if (ichingResult && ichingResult.changedHexagram) {
      const changedKeywords = ichingResult.changedHexagram.keywords || [];
      const positiveKeywords = ['開創', '完成', '合作', '成長', '順利'];
      const negativeKeywords = ['阻滯', '衝突', '危險', '結束', '不穩'];
      if (changedKeywords.some(k => positiveKeywords.includes(k))) score += 3;
      if (changedKeywords.some(k => negativeKeywords.includes(k))) score -= 3;
    }

    return Math.max(-20, Math.min(20, score));
  }

  _calculateQimenScore(chart, date, hourBranch, dayStem) {
    if (!chart) return 0;

    let score = 0;

    // 使用 scoringEngine 的規則，如果沒有則使用預設值
    const doorScores = this.scoringEngine.scoreRules?.qimenScores?.doors || {
      '開門': 10, '休門': 8, '生門': 9, '傷門': -7,
      '杜門': -5, '景門': 3, '死門': -10, '驚門': -6
    };
    const starScores = this.scoringEngine.scoreRules?.qimenScores?.stars || {
      '天蓬': -6, '天芮': -5, '天沖': 4, '天輔': 7,
      '天禽': 6, '天心': 8, '天柱': -3, '天任': 5, '天英': 2
    };

    // 值符星 + 值使門（基礎）
    if (chart.zhiFu?.star) score += starScores[chart.zhiFu.star] || 0;
    if (chart.zhiShi?.door) score += doorScores[chart.zhiShi.door] || 0;

    // 全盤門（現有）
    if (chart.doors) {
      for (const palace in chart.doors) {
        const door = chart.doors[palace];
        if (doorScores[door]) score += Math.round(doorScores[door] * 0.2);
      }
    }

    // 特殊格局（現有）
    if (chart.patterns) {
      for (const pattern of chart.patterns) {
        if (pattern.name === '天遁' || pattern.name === '地遁' || pattern.name === '人遁') score += 5;
      }
    }

    // 新增：完整奇門深層計分（新引擎）
    if (date && hourBranch && dayStem) {
      const board = this.qimenEngine.calculateHourBoard(date, hourBranch, dayStem);
      if (board) {
        const detail = this.qimenEngine.deriveHourScore(board);
        if (detail) {
          score += detail.score;
        }
      }
    }

    return Math.max(-35, Math.min(35, score));
  }

  _getQimenDoorScore(door) {
    const scores = this.scoringEngine.scoreRules?.qimenScores?.doors || {
      '開門': 10, '休門': 8, '生門': 9, '傷門': -7,
      '杜門': -5, '景門': 3, '死門': -10, '驚門': -6
    };
    return scores[door] || 0;
  }

  _getQimenStarScore(star) {
    const scores = this.scoringEngine.scoreRules?.qimenScores?.stars || {
      '天蓬': -6, '天芮': -5, '天沖': 4, '天輔': 7,
      '天禽': 6, '天心': 8, '天柱': -3, '天任': 5, '天英': 2
    };
    return scores[star] || 0;
  }

  _getQimenGod(chart) {
    if (!chart || !chart.gods || !chart.zhiShi) return '';
    const hourPalace = chart.zhiShi.palace;
    return chart.gods[hourPalace] || '';
  }

  _calculateBalanceScore(baziResult, ichingResult, qimenChart) {
    let score = 0;
    try {
      if (baziResult && baziResult.day && baziResult.dayMaster) {
        const elementMap = {
          '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
          '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
          '壬': 'water', '癸': 'water',
          '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
          '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
          '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
        };
        const hiddenStemMap = {
          '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
          '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'],
          '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
          '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
        };
        const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
        const pillars = ['year', 'month', 'day', 'hour'];
        for (const p of pillars) {
          const pillar = baziResult[p];
          if (!pillar) continue;
          if (pillar.stem && elementMap[pillar.stem]) counts[elementMap[pillar.stem]] += 2;
          if (pillar.branch && elementMap[pillar.branch]) counts[elementMap[pillar.branch]]++;
          if (pillar.branch && hiddenStemMap[pillar.branch]) {
            for (const hs of hiddenStemMap[pillar.branch]) {
              if (elementMap[hs]) counts[elementMap[hs]]++;
            }
          }
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total > 0) {
          const avg = total / 5;
          for (const [el, c] of Object.entries(counts)) {
            if (c === 0) score -= 2;
            else if (c > avg * 1.8) score -= 1;
            else if (c >= avg * 0.6) score += 1;
          }
        }
      }
      if (baziResult && baziResult.branchRelations) {
        const relations = baziResult.branchRelations;
        if (relations.summary && relations.summary.length > 0) {
          const harmonious = relations.summary.filter(r =>
            r.includes('合')
          ).length;
          const conflicting = relations.summary.filter(r =>
            r.includes('沖') || r.includes('刑') || r.includes('害')
          ).length;
          score += harmonious * 2 - conflicting * 2;
        }
      }
      if (ichingResult && ichingResult.hexagram) {
        const trigramMap = { '乾': 1, '坤': -1, '震': 1, '巽': -1, '坎': -1, '離': 1, '艮': 1, '兌': -1 };
        const name = ichingResult.hexagram.name || '';
        const upper = name.length >= 2 ? name[0] : '';
        const lower = name.length >= 2 ? name[1] : name[0] || '';
        const upperVal = trigramMap[upper] || 0;
        const lowerVal = trigramMap[lower] || 0;
        if (upperVal * lowerVal > 0) score += 2;
        else if (upperVal * lowerVal < 0) score -= 2;
      }
      if (qimenChart && qimenChart.summary) {
        if (qimenChart.summary.favorable && qimenChart.summary.favorable.length > 0) score += 2;
        if (qimenChart.summary.unfavorable && qimenChart.summary.unfavorable.length > 0) score -= 2;
      }
    } catch (e) {
      console.warn('平衡分數計算錯誤:', e);
    }
    return Math.max(-10, Math.min(10, score));
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
    const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const hourNames = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'];
    const eventType = ScoringEngine.USER_CATEGORIES[this._eventType]?.profile || 'default';

    const hourScores = [];
    const bestHours = [];
    const riskHours = [];

    for (let h = 0; h < 12; h++) {
      try {
        const fdPillar = this.baziEngine.calculateDayPillar(date);
        const hourGanzhi = this._calculateHourGanzhi(fdPillar.stem, baziResult.day.stem, hourBranches[h]);
        const hourTenGodName = hourGanzhi.tenGod?.name || null;
        const score = this.scoringEngine.calculateEventMatchScore(
          baziResult, this.baziEngine, date, hourTenGodName, eventType
        );
        hourScores.push(score);
        if (score >= 60) bestHours.push(hourNames[h]);
        if (score < 40) riskHours.push(hourNames[h]);
      } catch (e) { /* skip */ }
    }

    const avgScore = hourScores.length > 0
      ? Math.round(hourScores.reduce((a, b) => a + b, 0) / hourScores.length)
      : 50;
    const maxScore = hourScores.length > 0 ? Math.max(...hourScores) : 50;
    const minScore = hourScores.length > 0 ? Math.min(...hourScores) : 50;
    const levelInfo = this.scoringEngine.getScoreLevel(avgScore);

    return {
      date: this._formatDate(date),
      weekday: `週${weekdays[date.getDay()]}`,
      flowDay: dayGanzhi?.name || '',
      score: avgScore,
      level: levelInfo.level,
      levelColor: levelInfo.color,
      description: levelInfo.description,
      theme: levelInfo.description,
      maxScore,
      minScore,
      bestHours: bestHours.slice(0, 3),
      riskHours: riskHours.slice(0, 2),
      averageScore: avgScore
    };
  }

  _calculateDaySummary(hours, date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const scores = hours.map(h => h.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const flowDayPillar = this.baziEngine.calculateDayPillar(date);
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
        birthHour: formData.birthHour || '',
        unknownTime: formData.unknownTime,
        gender: formData.gender || '',
        eventCategory: formData.eventCategory || 'general'
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

    // 顯示輸入區
    const inputSection = document.getElementById('inputSection');
    if (inputSection) inputSection.style.display = '';

    // 把表單移回輸入區
    const formContainer = document.getElementById('formContainer');
    if (formContainer && inputSection) {
      formContainer.classList.remove('collapsed');
      inputSection.appendChild(formContainer);
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
    
    // 滾動到今日總覽
    setTimeout(() => {
      const todaySummary = document.querySelector('.day-summary');
      if (todaySummary) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const top = todaySummary.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 200);
  }

  _renderResult(result) {
    const container = document.getElementById('resultContent');
    if (!container) return;

    const { bazi, today, tomorrow, fourteenDays } = result;

    // 把表單從 hero 區移到結果區
    const formContainer = document.getElementById('formContainer');
    if (formContainer) {
      formContainer.classList.add('collapsed');
    }

    let html = '';

    html += `<div id="formToggleArea"></div>`;
    html += `<div class="result-card bazi-summary" id="baziSummaryCard">`;
    html += `<div class="card-header-toggle" id="baziToggleBtn" onclick="toggleBazi()">▼ 個人基本盤 <button class="btn-share" id="btnShareBazi" title="產生命盤簡報">產生簡報</button></div>`;
    html += `<div class="card-body-collapsible collapsed" id="baziBody">`;
    // 河圖幸運數字（喜用神五行→數字）
    const hetuMap = { 'water': '1、6', 'fire': '2、7', 'wood': '3、8', 'metal': '4、9', 'earth': '5、10' };
    const luckyNum = bazi.yongShen?.yongShen ? hetuMap[bazi.yongShen.yongShen] || '' : '';

    html += this._renderBaziSummaryInner(bazi);
    html += `</div></div>`;
    html += this._renderScoreLegend();
    html += this._renderDaySummary(today.summary, '今日總覽', luckyNum, true);
    html += this._renderDailyMeta(bazi);
    html += this._renderDailyWisdom(bazi);
    html += this._renderFiveElementChart(bazi);
    const todayRemaining = today.hours.filter(h => !h._past);
    if (todayRemaining.length > 0) {
      html += this._renderHourCards(todayRemaining, '今日時辰');
    }
    html += this._renderDaySummary(tomorrow.summary, '明日總覽');
    html += this._renderHourCards(tomorrow.hours, '明日時辰');
    html += this._render14Days(fourteenDays);
    html += this._renderDailyAdvice(bazi, today);
    html += this._renderDirectionAdvice(today);
    html += this._renderYearMonthAnalysis(bazi);
    html += this._renderDisclaimer();

    container.innerHTML = html;

    // 綁定產生簡報按鈕
    const btnShare = document.getElementById('btnShareCard');
    if (btnShare) {
      btnShare.addEventListener('click', () => this._generateShareCard(bazi, today));
    }
    const btnShareBazi = document.getElementById('btnShareBazi');
    if (btnShareBazi) {
      btnShareBazi.addEventListener('click', () => this._generateBaziCard(bazi));
    }

    // 把表單 DOM 插入到結果區
    if (formContainer) {
      const toggleArea = document.getElementById('formToggleArea');
      if (toggleArea) {
        // 插入 toggle 按鈕
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-toggle-section btn-toggle-result';
        toggleBtn.id = 'btnToggleForm';
        toggleBtn.textContent = '▼ 修改資料';
        toggleBtn.onclick = toggleSection;
        toggleArea.parentNode.insertBefore(toggleBtn, toggleArea.nextSibling);
        // 插入表單
        toggleBtn.parentNode.insertBefore(formContainer, toggleBtn.nextSibling);
      }
    }

    this._bindCardToggle();
  }

  _renderScoreLegend() {
    const levels = [
      { label: '大吉', min: 85, max: 100, color: '#2F7D32' },
      { label: '吉', min: 70, max: 84, color: '#4CAF50' },
      { label: '小吉', min: 55, max: 69, color: '#8BC34A' },
      { label: '平', min: 45, max: 54, color: '#9A6A1F' },
      { label: '小凶', min: 30, max: 44, color: '#A32828' },
      { label: '凶', min: 0, max: 29, color: '#6B1A1A' }
    ];
    const bar = levels.map(l =>
      `<span class="legend-seg" style="background:${l.color};flex:${l.max - l.min + 1}">
        <span class="legend-label">${l.label}</span>
      </span>`
    ).join('');
    const labels = levels.map(l =>
      `<span style="flex:${l.max - l.min + 1};text-align:center;font-size:0.65rem;color:var(--text-secondary)">${l.min}</span>`
    ).join('');
    return `
      <div class="score-legend">
        <div class="legend-bar">${bar}</div>
        <div class="legend-scale">${labels}</div>
      </div>`;
  }

  _renderBaziChartSVG(bazi) {
    const stemEl = s => ({ '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth','己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water' }[s]||'');
    const branchEl = b => ({ '寅':'wood','卯':'wood','巳':'fire','午':'fire','申':'metal','酉':'metal','亥':'water','子':'water','辰':'earth','戌':'earth','丑':'earth','未':'earth' }[b]||'');
    const elColor = e => ({ wood:'#6B8E6B', fire:'#B8433A', earth:'#C9A45C', metal:'#8B7D6B', water:'#4A7C8C' }[e]||'#999');
    const elLight = e => ({ wood:'#E8F0E8', fire:'#F5E6E6', earth:'#F5EDD6', metal:'#EFEAE4', water:'#E4EDF0' }[e]||'#f5f0eb');
    const pillarData = [
      { key:'year', label:'年', pillar:bazi.year },
      { key:'month', label:'月', pillar:bazi.month },
      { key:'day', label:'日', pillar:bazi.day },
      { key:'hour', label:'時', pillar:bazi.hour?.isUnknown ? null : bazi.hour }
    ];

    const W = 380, H = 320, gap = 12;
    const cw = (W - gap * 5) / 4;
    const isMobile = window.innerWidth < 420;
    const scale = isMobile ? 0.85 : 1;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="bazi-chart-svg">`;
    svg += `<defs>
      <filter id="gDay"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.08"/></filter>
      <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#D4A84B"/><stop offset="50%" stop-color="#F0D68A"/><stop offset="100%" stop-color="#D4A84B"/></linearGradient>
    </defs>`;

    // Background
    svg += `<rect x="0" y="0" width="${W}" height="300" rx="4" fill="none"/>`;

    pillarData.forEach((d, i) => {
      if (!d.pillar) return;
      const x = gap + i * (cw + gap);
      const cx = x + cw / 2;
      const pillarEl = branchEl(d.pillar.branch);
      const isDay = d.key === 'day';
      const stem = d.pillar.stem;
      const branch = d.pillar.branch;
      const sEl = stemEl(stem);
      const sColor = elColor(sEl);
      const sLight = elLight(sEl);
      const bColor = elColor(pillarEl);
      const bLight = elLight(pillarEl);

      // Card background
      svg += `<rect x="${x}" y="4" width="${cw}" height="280" rx="6" fill="${isDay?'#FFFDF5':'#FFFBF0'}" stroke="${isDay?'url(#goldBar)':'#D4C5A9'}" stroke-width="${isDay?'2':'1'}" filter="url(#shadow)"/>`;

      // Top decorative band
      const bandH = 28;
      svg += `<rect x="${x}" y="4" width="${cw}" height="${bandH}" rx="6" fill="${isDay?'url(#goldBar)':'#E8DDCC'}"/>`;
      svg += `<rect x="${x}" y="4" width="${cw}" height="6" rx="6" fill="${isDay?'url(#goldBar)':'#E8DDCC'}"/>`;
      svg += `<text x="${cx}" y="${24}" text-anchor="middle" font-size="14" fill="${isDay?'#5D4037':'#6B5D4F'}" font-weight="700" font-family="'Noto Serif CJK SC','Source Han Serif SC',serif">${d.label}柱</text>`;

      // Ten god badge
      const tgKey = d.key === 'day' ? null : d.key;
      if (tgKey && bazi.tenGods?.[tgKey]) {
        const tg = bazi.tenGods[tgKey];
        const isGood = tg.type === 'good';
        const badgeW = 34;
        const badgeH = 16;
        svg += `<rect x="${cx - badgeW/2}" y="${36}" width="${badgeW}" height="${badgeH}" rx="8" fill="${isGood?'#E8F0E8':'#F5E6E6'}" stroke="${isGood?'#6B8E6B':'#B8433A'}" stroke-width="0.5"/>`;
        svg += `<text x="${cx}" y="${48}" text-anchor="middle" font-size="9" fill="${isGood?'#2E5C2E':'#8B2C2C'}" font-weight="600" font-family="sans-serif">${tg.name}</text>`;
      }

      // Heavenly stem - large rounded box
      const sh = 40, sw = 36;
      const stemY = 60;
      svg += `<rect x="${cx - sw/2}" y="${stemY}" width="${sw}" height="${sh}" rx="6" fill="${sLight}" stroke="${sColor}" stroke-width="1"/>`;
      svg += `<text x="${cx}" y="${stemY + sh - 12}" text-anchor="middle" font-size="24" fill="${sColor}" font-weight="700" font-family="'Noto Serif CJK SC','Source Han Serif SC',serif">${stem}</text>`;

      // Small element label below stem
      const sElName = { wood:'木', fire:'火', earth:'土', metal:'金', water:'水' }[sEl]||'';
      svg += `<text x="${cx}" y="${stemY + sh + 14}" text-anchor="middle" font-size="8" fill="${sColor}" opacity="0.6" font-family="sans-serif">${sElName}</text>`;

      // Earthly branch - large rounded box
      const bh = 40, bw = 36;
      const branchY = stemY + sh + 20;
      svg += `<rect x="${cx - bw/2}" y="${branchY}" width="${bw}" height="${bh}" rx="6" fill="${bLight}" stroke="${bColor}" stroke-width="1"/>`;
      svg += `<text x="${cx}" y="${branchY + bh - 12}" text-anchor="middle" font-size="24" fill="${bColor}" font-weight="700" font-family="'Noto Serif CJK SC','Source Han Serif SC',serif">${branch}</text>`;

      // Small element label below branch
      const bElName = { wood:'木', fire:'火', earth:'土', metal:'金', water:'水' }[pillarEl]||'';
      svg += `<text x="${cx}" y="${branchY + bh + 14}" text-anchor="middle" font-size="8" fill="${bColor}" opacity="0.6" font-family="sans-serif">${bElName}</text>`;

      // Separator line
      const sepY = branchY + bh + 22;
      svg += `<line x1="${x + 6}" y1="${sepY}" x2="${x + cw - 6}" y2="${sepY}" stroke="#E8DDCC" stroke-width="1" stroke-dasharray="2,2"/>`;

      // Hidden stems row
      const hsKey = { year:'year', month:'month', day:'day', hour:'hour' }[d.key];
      const hiddenStems = bazi.hiddenStemDetails?.[hsKey];
      if (hiddenStems && hiddenStems.length > 0) {
        const hsY = sepY + 14;
        const hsSpacing = 14;
        const hsStartX = cx - ((hiddenStems.length - 1) * hsSpacing) / 2;
        hiddenStems.forEach((h, hi) => {
          const hx = hsStartX + hi * hsSpacing;
          const hsEl = stemEl(h.stem);
          const hsClr = elColor(hsEl);
          svg += `<text x="${hx}" y="${hsY}" text-anchor="middle" font-size="11" fill="${hsClr}" font-weight="600" font-family="serif">${h.stem}</text>`;
          if (h.isExposed) {
            svg += `<circle cx="${hx}" cy="${hsY + 6}" r="2" fill="${hsClr}" opacity="0.5"/>`;
          }
        });
      }

      // Nayin text
      if (d.pillar.nayin) {
        svg += `<text x="${cx}" y="280" text-anchor="middle" font-size="9" fill="#A08060" font-family="sans-serif" opacity="0.7">${d.pillar.nayin}</text>`;
      }
    });

    // Day master label at bottom center
    if (bazi.dayMaster) {
      svg += `<text x="${W/2}" y="310" text-anchor="middle" font-size="12" fill="#5D4037" font-weight="600" font-family="'Noto Serif CJK SC','Source Han Serif SC',serif">日主　${bazi.dayMaster.stem}（${bazi.dayMaster.label}）</text>`;
    }

    svg += '</svg>';
    return svg;
  }

  _renderBaziSummaryInner(bazi) {
    const strengthLabels = { '旺': '旺（得令）', '相': '相（得生）', '休': '休（退休）', '囚': '囚（受制）', '死': '死（受剋）' };
    const strengthVal = bazi.dayMasterStrength
      ? `<span class="strength-${bazi.dayMasterStrength}">${strengthLabels[bazi.dayMasterStrength] || bazi.dayMasterStrength}</span>`
      : '';

    const rootVal = bazi.rootInfo
      ? (bazi.rootInfo.hasRoot
        ? `<span class="root-yes">有根</span>（${bazi.rootInfo.rootSources.slice(0, 2).join('、')}）${bazi.rootInfo.exposed ? '<span class="root-exposed">且透出</span>' : ''}`
        : `<span class="root-no">無根（虛浮）</span>`)
      : '';

    const kongWangVal = bazi.kongWang?.length > 0 ? bazi.kongWang.join('、') : '';

    const yongShenVal = bazi.yongShen?.yongShen
      ? `<span class="yongshen-val">${bazi.yongShen.yongShenLabel}</span>`
      : '';
    const jiShenVal = bazi.yongShen?.yongShen
      ? `<span class="jishen-val">${bazi.yongShen.jiShenLabel || '無'}</span>`
      : '';

    const bodyStrengthVal = bazi.bodyStrength
      ? `<span class="${bazi.bodyStrength.level === '身強' ? 'root-yes' : 'root-no'}">${bazi.bodyStrength.level}</span>（${bazi.bodyStrength.deLing.detail}、${bazi.bodyStrength.deDi.detail}、${bazi.bodyStrength.deShi.detail}）`
      : '';

    const patternVal = bazi.pattern ? `<span class="pattern-name">${bazi.pattern.name}</span>` : '';

    const miscItems = [
      bazi.taiYuan ? `胎元：${bazi.taiYuan.name}` : '',
      bazi.mingGong?.branch ? `命宮：${bazi.mingGong.branch}` : '',
      bazi.renYuanSiLing?.stem ? `司令：${bazi.renYuanSiLing.stem}` : '',
      bazi.stemCombinations?.yearMonth?.combined ? `年干合化：${bazi.stemCombinations.yearMonth.element}` : '',
      bazi.stemCombinations?.monthDay?.combined ? `月干合化：${bazi.stemCombinations.monthDay.element}` : ''
    ].filter(Boolean);

    const hiddenStemVal = bazi.hiddenStemDetails
      ? Object.entries(bazi.hiddenStemDetails).filter(([,v]) => v?.length).map(([pos, items]) => {
        const labels = { year: '年', month: '月', day: '日', hour: '時' };
        return `${labels[pos]||pos}：${items.map(i => `${i.stem}(${i.tenGod})${i.isExposed ? '透' : ''}`).join(' ')}`;
      }).join(' | ')
      : '';

    const shenShaVal = bazi.shenSha?.length > 0
      ? bazi.shenSha.map(s => `<span class="shensha-item ${s.isGood ? 'good' : 'bad'}">${s.name}</span>`).join('、')
      : '';

    const branchScoreVal = bazi.branchRelationScore
      ? `${bazi.branchRelationScore >= 0 ? '和諧' : '動盪'}（${bazi.branchRelationScore >= 0 ? '+' : ''}${bazi.branchRelationScore}）`
      : '';

    const tenGodVal = bazi.tenGods?.hour ? bazi.tenGods.hour.name : '';

    const branchRels = bazi.branchRelations?.summary?.length > 0
      ? bazi.branchRelations.summary.join('、')
      : '';

    const rows = [
      ['日主旺衰', strengthVal],
      ['日主根基', rootVal],
      ['旬空', kongWangVal],
      ['用神', yongShenVal],
      ['忌神', jiShenVal],
      ['身強身弱', bodyStrengthVal],
      ['格局', patternVal],
      ['基本資訊', miscItems.join(' | ')],
      ['藏干透出', hiddenStemVal],
      ['神煞', shenShaVal],
      ['地支氣場', branchScoreVal],
      ['時柱十神', tenGodVal],
      ['地支關係', branchRels],
      ['備註', bazi.birthInfo?.note || '']
    ].filter(([,val]) => val);

    const dlHtml = rows.map(([label, value]) =>
      `<div class="bazi-row"><dt class="bazi-label">${label}</dt><dd class="bazi-value">${value}</dd></div>`
    ).join('');

    return `
      <div class="bazi-chart-container">${this._renderBaziChartSVG(bazi)}</div>
      <dl class="bazi-details">${dlHtml}</dl>
    `;
  }

  _renderDaySummary(summary, title, luckyNum, showBtn) {
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
              <span class="score-number">${score}<span class="score-label">分</span></span>
            </div>
          </div>
          <div class="day-info">
            <h3 class="card-title">${title}${showBtn ? ' <button class="btn-share" id="btnShareCard" title="產生簡報">產生簡報</button>' : ''}</h3>
            <span class="day-date">${summary.date} ${summary.weekday}</span>
            <span class="day-level" style="background-color:${scoreColor}">${summary.level}</span>
            ${summary.flowDay ? `<span class="day-flow-pillar">流日 ${summary.flowDay}</span>` : ''}
            <div class="day-range">最高 ${summary.maxScore} / 最低 ${summary.minScore}</div>
          </div>
        </div>
        ${summary.bestHours.length > 0 ? `<p class="day-best">最佳時辰：${summary.bestHours.join('、')}</p>` : ''}
        ${summary.riskHours.length > 0 ? `<p class="day-risk">注意時辰：${summary.riskHours.join('、')}</p>` : ''}
        ${luckyNum ? `
        <div class="lucky-section">
          <span class="lucky-label">今日幸運數字</span>
          <div class="lucky-numbers">${luckyNum.split('、').map(n => `<span class="lucky-num">${n}</span>`).join('')}</div>
        </div>` : ''}
      </div>
    `;
  }

  _renderHourCards(hours, title) {
    // 生成時辰趨勢圖
    const trendBars = hours.map(h => {
      const height = (h.score / 100) * 50;
      const shortName = h.hourName.replace('時', '');
      return `
        <div class="hour-bar-wrapper" title="${h.hourName} ${h.score}分 ${h.level}">
          <div class="hour-bar" style="height:${height}px;background-color:${h.levelColor}"></div>
          <div class="hour-bar-score">${h.score}</div>
          <div class="hour-bar-name">${shortName}</div>
        </div>
      `;
    }).join('');

    const cards = hours.map(h => {
      // 生成具體事件預測
      const predictions = this._generatePredictions(h);
      const badge = h.score >= 65 ? '🟢' : h.score < 45 ? '🔴' : '🟡';
      
      return `
        <div class="hour-card" data-hour="${h.hourBranch}">
          <div class="hour-header">
            <span class="hour-badge-icon">${badge}</span>
            <span class="hour-name">${h.hourName}</span>
            <span class="hour-time">${h.timeRange}</span>
            <span class="hour-score" style="color:${h.levelColor}">${h.score}分</span>
            <span class="hour-level" style="background-color:${h.levelColor}">${h.level}</span>
          </div>
          
          <div class="hour-predictions">
            ${predictions.map(p => `<div class="prediction-item">${p}</div>`).join('')}
          </div>
          
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
        <div class="hour-trend-chart">
          <div class="hour-trend-bars">${trendBars}</div>
        </div>
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
    // 把專業術語轉換成具體事件預測
    const { system, rule, value, score, reason } = trace;
    
    // 八字相關 - 根據十神推算具體事件
    if (system === 'bazi') {
      if (rule === 'hourTenGod') {
        const tenGodEvents = {
          '正官': '有貴人相助或上司提拔的機會，適合處理公務、考試、面試',
          '七殺': '壓力較大，可能遇到挑戰或競爭，需要堅持才能突破',
          '正財': '財運穩定，適合處理財務、簽約、收帳',
          '偏財': '有意外之財或合作機會，適合投資、交易、社交',
          '食神': '心情愉悅，適合享受美食、聚會、創作',
          '傷官': '創意豐富但容易口舌是非，適合寫作、表達，避免與人爭執',
          '正印': '有長輩或貴人幫助，適合學習、進修、請教',
          '偏印': '學習運佳但容易鑽牛角尖，適合研究、思考',
          '比肩': '與同輩競爭或合作，適合團隊工作、社交活動',
          '劫財': '要小心財務損失或被借錢，避免衝動消費'
        };
        return tenGodEvents[value] || `時柱遇到${value}`;
      }
      if (rule === 'elementRelation') {
        const elementEvents = {
          'metal-water': '思維清晰，適合思考、規劃、溝通',
          'water-wood': '創意豐富，適合學習、進修、創作',
          'wood-fire': '充滿活力，適合表現、展示、社交',
          'fire-earth': '穩定踏實，適合處理日常事務、整理',
          'earth-metal': '果斷有力，適合決策、執行、清理',
          'metal-wood': '容易有衝突或壓力，需要謹慎行事',
          'wood-earth': '容易感到疲憊，需要休息調整',
          'earth-water': '容易有阻礙，需要耐心等待',
          'water-fire': '情緒波動較大，需要保持冷靜',
          'fire-metal': '容易有意外或變動，需要靈活應對'
        };
        return elementEvents[value] || `時辰五行與日主的關係`;
      }
    }
    
    // 奇門遁甲相關 - 根據八門推算具體事件
    if (system === 'qimen') {
      if (rule === 'door') {
        const doorEvents = {
          '開門': '適合開始新計劃、開會、談判、出行',
          '休門': '適合休息、等待、修復關係、養生',
          '生門': '財運佳，適合投資、簽約、拜訪客戶',
          '傷門': '容易有衝突或損失，避免爭執、手術、冒險',
          '杜門': '適合保密、隱藏、等待時機、閉關修煉',
          '景門': '適合考試、面試、展示才華、文書工作',
          '死門': '運勢較差，宜靜不宜動，避免重大決策',
          '驚門': '容易有驚嚇或意外，開車要小心，避免衝動'
        };
        return doorEvents[value] || `遇到${value}`;
      }
      if (rule === 'star') {
        const starEvents = {
          '天輔': '學習運佳，適合進修、考試、請教貴人',
          '天禽': '運勢穩定，適合處理重要事務、簽約',
          '天心': '決策力強，適合做重要決定、領導團隊',
          '天任': '責任感強，適合承擔重任、照顧他人',
          '天沖': '行動力強，適合開始新計劃，但要避免衝動',
          '天英': '適合展現才華、參加社交活動，但要務實',
          '天蓬': '要小心意外、盜賊，避免冒險投資',
          '天芮': '健康運較差，要注意休息、養生、看醫生',
          '天柱': '容易有變動或破壞，需要穩定心神'
        };
        return starEvents[value] || `${value}影響`;
      }
    }
    
    // 預設
    return reason || `${value}`;
  }

  _generatePredictions(hourData) {
    const predictions = [];
    const { systems, score, level } = hourData;
    
    // 根據十神推算
    const tenGod = systems.bazi?.tenGod;
    if (tenGod) {
      const tenGodPredictions = {
        '正官': ['可能收到上司或長輩的好消息', '適合處理公務或正式場合'],
        '七殺': ['可能遇到挑戰或競爭', '需要堅持才能突破困境'],
        '正財': ['財運穩定，可能有穩定收入', '適合處理財務事務'],
        '偏財': ['可能有意外之財或合作機會', '適合社交和投資'],
        '食神': ['心情愉悅，適合享受生活', '可能有美食或聚會機會'],
        '傷官': ['創意豐富，適合表達想法', '但要注意口舌是非'],
        '正印': ['可能得到長輩或貴人幫助', '適合學習和進修'],
        '偏印': ['適合深入研究和思考', '但避免鑽牛角尖'],
        '比肩': ['適合與同輩合作', '可能有團隊活動機會'],
        '劫財': ['要小心財務損失', '避免借錢給他人']
      };
      if (tenGodPredictions[tenGod]) {
        predictions.push(...tenGodPredictions[tenGod]);
      }
    }
    
    // 根據八門推算
    const door = systems.qimen?.door;
    if (door) {
      const doorPredictions = {
        '開門': ['適合開始新計劃或出行', '可能有新的機會出現'],
        '休門': ['適合休息和調整', '可能有修復關係的機會'],
        '生門': ['財運佳，適合投資', '可能有賺錢機會'],
        '傷門': ['要小心衝突或損失', '避免爭執和冒險'],
        '杜門': ['適合保密和等待', '不宜公開行動'],
        '景門': ['適合考試或展示', '可能有文書或消息'],
        '死門': ['運勢較差，宜靜不宜動', '避免重大決策'],
        '驚門': ['要小心意外或驚嚇', '開車要特別注意']
      };
      if (doorPredictions[door]) {
        predictions.push(...doorPredictions[door]);
      }
    }
    
    // 根據九星推算
    const star = systems.qimen?.star;
    if (star) {
      const starPredictions = {
        '天輔': ['學習運佳，適合進修', '可能有貴人指點'],
        '天禽': ['運勢穩定，適合處理事務', '可能有簽約機會'],
        '天心': ['決策力強，適合做決定', '可能有領導機會'],
        '天任': ['責任感強，適合承擔重任', '可能需要照顧他人'],
        '天沖': ['行動力強，適合開始新計劃', '但要避免衝動'],
        '天英': ['適合展現才華', '可能有社交活動'],
        '天蓬': ['要小心意外或盜賊', '避免冒險投資'],
        '天芮': ['健康運較差，要注意休息', '可能需要看醫生'],
        '天柱': ['容易有變動或破壞', '需要穩定心神']
      };
      if (starPredictions[star]) {
        predictions.push(...starPredictions[star]);
      }
    }
    
    // 根據卦象推算
    const hexagram = systems.iching?.hexagram;
    if (hexagram) {
      const hexagramPredictions = {
        '乾為天': ['充滿活力，適合積極行動', '可能有領導機會'],
        '坤為地': ['穩定踏實，適合執行計劃', '可能有合作機會'],
        '水雷屯': ['初期困難，需要耐心', '適合積蓄力量'],
        '山水蒙': ['需要學習和啟蒙', '適合請教他人'],
        '水天需': ['需要等待時機', '適合養精蓄銳'],
        '天水訟': ['可能有爭訟或衝突', '適合尋求和解'],
        '地水師': ['適合組織和領導', '可能有團隊活動'],
        '水地比': ['適合合作和親附', '可能有貴人相助'],
        '風天小畜': ['小有蓄積，適合穩步發展', '避免冒進'],
        '天澤履': ['踐行禮儀，適合正式場合', '要謹慎行事'],
        '地天泰': ['通泰順利，適合積極行動', '可能有好消息'],
        '天地否': ['閉塞不通，適合退守', '避免重大決策'],
        '天火同人': ['志同道合，適合合作', '可能有社交機會'],
        '火天大有': ['大有收穫，適合積極行動', '可能有成功機會'],
        '地山謙': ['謙虛處世，適合學習', '可能有貴人相助'],
        '雷地豫': ['喜悅和豫，適合享受生活', '但不可沉溺安樂']
      };
      if (hexagramPredictions[hexagram]) {
        predictions.push(...hexagramPredictions[hexagram]);
      }
    }
    
    // 如果沒有具體預測，使用通用預測
    if (predictions.length === 0) {
      if (score >= 70) {
        predictions.push('運勢良好，適合積極行動');
        predictions.push('可能有好消息或機會出現');
      } else if (score >= 55) {
        predictions.push('運勢平穩，適合按部就班');
        predictions.push('可能有小確幸或小機會');
      } else if (score >= 45) {
        predictions.push('運勢普通，適合維持現狀');
        predictions.push('避免重大決策');
      } else {
        predictions.push('運勢較差，宜靜不宜動');
        predictions.push('避免冒險和衝動');
      }
    }
    
    // 限制預測數量
    return predictions.slice(0, 4);
  }

  // ==================== 每日元數據（開運色/節氣/宜忌/神煞） ====================
  _renderDailyMeta(bazi) {
    const now = new Date();
    const flowDay = this.baziEngine.calculateDayPillar(now);
    if (!flowDay) return '';

    const dayEl = this._getBranchElement(flowDay.branch);
    const colorMap = {
      wood: { name: '綠色系', colors: ['綠','青','翠'], avoid: '白色系' },
      fire: { name: '紅色系', colors: ['紅','粉','紫'], avoid: '黑色系' },
      earth: { name: '黃色系', colors: ['黃','棕','米'], avoid: '綠色系' },
      metal: { name: '白色系', colors: ['白','銀','金'], avoid: '紅色系' },
      water: { name: '黑色系', colors: ['黑','藍','灰'], avoid: '黃色系' }
    };
    const lucky = colorMap[dayEl] || colorMap.earth;

    // 節氣
    let solarTerm = '';
    try {
      const terms = this.baziEngine.solarTerms;
      if (terms) {
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        const yearTerms = terms[y] || terms[String(y)];
        if (yearTerms) {
          for (const t of yearTerms) {
            const td = new Date(t.date + 'T12:00:00');
            const nextTd = yearTerms[yearTerms.indexOf(t) + 1];
            const nextDate = nextTd ? new Date(nextTd.date + 'T12:00:00') : new Date(y + 1, 0, 1);
            if (now >= td && now < nextDate) {
              solarTerm = t.name;
              break;
            }
          }
        }
      }
    } catch (e) {}

    // 每日宜忌（依流日十神）
    const dayTG = this.baziEngine.getTenGod(bazi.day.stem, flowDay.stem);
    const yiJiMap = {
      '正官': { yi: ['簽約', '面試', '拜訪', '考試'], ji: ['訴訟', '冒險'] },
      '七殺': { yi: ['競爭', '運動', '解決問題'], ji: ['投資', '簽約'] },
      '正印': { yi: ['讀書', '進修', '拜佛', '養生'], ji: ['投機', '爭吵'] },
      '偏印': { yi: ['研究', '冥想', '藝術'], ji: ['社交', '合夥'] },
      '食神': { yi: ['聚餐', '創作', '約會', '享受'], ji: ['爭辯', '冒險'] },
      '傷官': { yi: ['運動', '改革', '表達'], ji: ['簽約', '面試'] },
      '正財': { yi: ['理財', '購物', '存錢', '務實'], ji: ['投機', '借貸'] },
      '偏財': { yi: ['投資', '社交', '拓展'], ji: ['賭博', '衝動消費'] },
      '比肩': { yi: ['合作', '聚會', '運動'], ji: ['獨斷', '借貸'] },
      '劫財': { yi: ['競爭', '討債'], ji: ['投資', '合夥', '借貸'] }
    };
    const yiJi = dayTG ? yiJiMap[dayTG.name] : null;

    // 流日神煞
    const activeShenSha = [];
    if (bazi.shenSha) {
      for (const ss of bazi.shenSha) {
        activeShenSha.push(ss.name);
      }
    }

    let html = '<div class="result-card daily-meta-card">';
    html += '<dl class="bazi-details">';

    html += `<div class="bazi-row"><dt class="bazi-label">開運穿搭</dt><dd class="bazi-value">宜<span style="color:${dayEl === 'fire' ? '#C62828' : dayEl === 'water' ? '#1565C0' : dayEl === 'wood' ? '#2E7D32' : dayEl === 'metal' ? '#9E9E9E' : '#8D6E63'};font-weight:600">${lucky.name}</span>（${lucky.colors.join('、')}），忌${lucky.avoid}</dd></div>`;

    if (solarTerm) {
      html += `<div class="bazi-row"><dt class="bazi-label">當前節氣</dt><dd class="bazi-value">${solarTerm}</dd></div>`;
    }

    if (yiJi) {
      html += `<div class="bazi-row"><dt class="bazi-label">今日宜</dt><dd class="bazi-value" style="color:var(--lucky-color)">${yiJi.yi.join('、')}</dd></div>`;
      html += `<div class="bazi-row"><dt class="bazi-label">今日忌</dt><dd class="bazi-value" style="color:var(--unlucky-color)">${yiJi.ji.join('、')}</dd></div>`;
    }

    if (activeShenSha.length > 0) {
      html += `<div class="bazi-row"><dt class="bazi-label">流日神煞</dt><dd class="bazi-value">${activeShenSha.join('、')}</dd></div>`;
    }

    html += '</dl></div>';
    return html;
  }

  // ==================== 每日一言 + 健康 + 開運食物 ====================
  _renderDailyWisdom(bazi) {
    const now = new Date();
    const flowDay = this.baziEngine.calculateDayPillar(now);
    if (!flowDay) return '';

    const dayTG = this.baziEngine.getTenGod(bazi.day.stem, flowDay.stem);
    const dayEl = this._getBranchElement(flowDay.branch);

    // 每日一言（依流日十神）
    const wisdomMap = {
      '正官': '守正道，行正事，貴人自來。',
      '七殺': '壓力即動力，逆境見真章。',
      '正印': '靜心學習，厚積薄發。',
      '偏印': '獨處是養分，沉默是力量。',
      '食神': '享受當下，才華自顯。',
      '傷官': '打破框架，才能突破。',
      '正財': '穩紮穩打，積少成多。',
      '偏財': '廣結善緣，機遇自來。',
      '比肩': '同行者眾，攜手共進。',
      '劫財': '守財為上，靜待時機。'
    };
    const wisdom = dayTG ? wisdomMap[dayTG.name] : '順應天時，把握當下。';

    // 健康建議（依流日五行）
    const healthMap = {
      wood: { organ: '肝膽', advice: '少熬夜，多護眼，情緒勿鬱結。' },
      fire: { organ: '心臟、血壓', advice: '避免過勞，少辛辣，保持心態平和。' },
      earth: { organ: '脾胃', advice: '飲食規律，少油膩，注意消化。' },
      metal: { organ: '肺、呼吸道', advice: '注意保暖，避免過敏源，多深呼吸。' },
      water: { organ: '腎臟、泌尿', advice: '多喝水，少憋尿，注意腰部保暖。' }
    };
    const health = healthMap[dayEl] || healthMap.earth;

    // 開運食物（依流日五行）
    const foodMap = {
      wood: '綠色蔬菜、酸味食物、芽菜類',
      fire: '紅色食物、苦味、番茄、紅豆',
      earth: '黃色食物、甜味、地瓜、南瓜、小米',
      metal: '白色食物、辛味、白蘿蔔、梨子',
      water: '黑色食物、湯類、海帶、黑豆、芝麻'
    };
    const food = foodMap[dayEl] || '均衡飲食';

    return `
      <div class="result-card wisdom-card">
        <div class="wisdom-quote">「${wisdom}」</div>
        <dl class="bazi-details">
          <div class="bazi-row"><dt class="bazi-label">健康提醒</dt><dd class="bazi-value">${health.organ}：${health.advice}</dd></div>
        </dl>
      </div>
    `;
  }

  // ==================== 今日五行平衡圖 ====================
  _renderFiveElementChart(bazi) {
    const now = new Date();
    const flowDay = this.baziEngine.calculateDayPillar(now);
    const flowMonth = this.baziEngine.calculateMonthPillar(now);
    const flowYear = this.baziEngine.calculateYearPillar(now);

    const elMap = { '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth','己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water' };
    const brElMap = { '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire','午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water' };

    // 統計今日五行：流日干支 + 流月干支 + 流年干支
    const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const add = el => { if (count[el] !== undefined) count[el]++; };

    if (flowDay) { add(elMap[flowDay.stem]); add(brElMap[flowDay.branch]); }
    if (flowMonth) { add(elMap[flowMonth.stem]); add(brElMap[flowMonth.branch]); }
    if (flowYear) { add(elMap[flowYear.stem]); add(brElMap[flowYear.branch]); }

    const total = Object.values(count).reduce((a, b) => a + b, 0) || 1;
    const elNames = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    const elColors = { wood: '#4CAF50', fire: '#E57373', earth: '#BCAAA4', metal: '#BDBDBD', water: '#64B5F6' };

    // 用 Canvas 畫雷達圖
    const size = 180;
    const cx = size / 2, cy = size / 2, R = 60;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
    const angles = elements.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2);

    // 背景五邊形
    ctx.strokeStyle = '#E6D6B8';
    ctx.lineWidth = 0.5;
    for (let r = 0.2; r <= 1; r += 0.2) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const x = cx + Math.cos(angles[i]) * R * r;
        const y = cy + Math.sin(angles[i]) * R * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 軸線
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angles[i]) * R, cy + Math.sin(angles[i]) * R);
      ctx.stroke();
    }

    // 資料點
    const maxVal = Math.max(...Object.values(count), 1);
    ctx.fillStyle = 'rgba(139,30,30,0.2)';
    ctx.strokeStyle = '#8B1E1E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const val = count[elements[i]] / maxVal;
      const x = cx + Math.cos(angles[i]) * R * val;
      const y = cy + Math.sin(angles[i]) * R * val;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 標籤
    ctx.textAlign = 'center';
    ctx.font = '600 12px "Noto Serif TC", serif';
    for (let i = 0; i < 5; i++) {
      const lx = cx + Math.cos(angles[i]) * (R + 16);
      const ly = cy + Math.sin(angles[i]) * (R + 16);
      ctx.fillStyle = elColors[elements[i]];
      ctx.fillText(elNames[elements[i]], lx, ly + 4);
    }

    const dataUrl = canvas.toDataURL('image/png');

    // 數據列表
    const bars = elements.map(el => {
      const pct = Math.round((count[el] / total) * 100);
      return `<div class="el-bar-row">
        <span class="el-name" style="color:${elColors[el]}">${elNames[el]}</span>
        <div class="el-bar"><div class="el-bar-fill" style="width:${pct}%;background:${elColors[el]}"></div></div>
        <span class="el-pct">${pct}%</span>
      </div>`;
    }).join('');

    return `
      <div class="result-card five-el-card">
        <h3 class="card-title">今日五行分佈</h3>
        <div class="five-el-body">
          <img src="${dataUrl}" alt="五行雷達圖" class="five-el-chart">
          <div class="five-el-bars">${bars}</div>
        </div>
      </div>
    `;
  }

  // ==================== 每日吉時建議 ====================
  _renderDailyAdvice(bazi, today) {
    const tenGodActivities = {
      '正官': ['簽約', '面試', '開會', '拜訪長官', '考試'],
      '七殺': ['競爭', '談判', '運動', '解決糾紛'],
      '正印': ['讀書', '進修', '拜佛', '養生', '簽長約'],
      '偏印': ['研究', '獨處', '冥想', '藝術創作'],
      '食神': ['聚餐', '創作', '表演', '約會', '享受美食'],
      '傷官': ['運動', '改革', '表達意見', '突破現狀'],
      '正財': ['收帳', '投資', '買賣', '存錢', '務實工作'],
      '偏財': ['投資', '社交', '拓展人脈', '意外收入'],
      '比肩': ['合作', '聚會', '同儕交流', '運動'],
      '劫財': ['競爭', '討債', '處理財務糾紛']
    };

    const doorActivities = {
      '開門': '開業、求職、出行',
      '休門': '休閒、約會、療癒',
      '生門': '投資、開業、動土',
      '傷門': '運動、競爭、醫療',
      '杜門': '保密、躲藏、閉關',
      '景門': '考試、表演、聚會',
      '死門': '送葬、拆除、收尾',
      '驚門': '小心、防範、祈福'
    };

    const bestHours = today.summary.bestHours || [];
    if (bestHours.length === 0 && today.hours.length === 0) return '';

    // 找出分數最高的 2-3 個時辰
    const sortedHours = [...today.hours].sort((a, b) => b.score - a.score).slice(0, 3);

    let rows = '';
    for (const h of sortedHours) {
      const tenGod = h.systems?.bazi?.tenGod || '';
      const door = h.systems?.qimen?.door || '';
      const activities = tenGodActivities[tenGod] || ['一般事務'];
      const doorAct = doorActivities[door] || '';
      rows += `
        <div class="advice-row">
          <span class="advice-hour">${h.hourName}</span>
          <span class="advice-score" style="color:${h.levelColor}">${h.score}分</span>
          <span class="advice-god">${tenGod}</span>
          <span class="advice-activities">${activities.slice(0, 3).join('、')}${doorAct ? '；' + doorAct : ''}</span>
        </div>`;
    }

    return `
      <div class="result-card advice-card">
        <h3 class="card-title">今日吉時建議</h3>
        <div class="advice-list">${rows}</div>
      </div>
    `;
  }

  // ==================== 方位建議 ====================
  _renderDirectionAdvice(today) {
    if (!today.hours || today.hours.length === 0) return '';

    // 統計今日各方位的吉凶
    const doorDirMap = {
      '開門': '西北', '休門': '北方', '生門': '東北',
      '傷門': '東方', '杜門': '東南', '景門': '南方',
      '死門': '西南', '驚門': '西方'
    };

    const dirScores = {};
    for (const h of today.hours) {
      const door = h.systems?.qimen?.door;
      if (!door) continue;
      const dir = doorDirMap[door];
      if (!dir) continue;
      if (!dirScores[dir]) dirScores[dir] = { total: 0, count: 0 };
      dirScores[dir].total += h.score;
      dirScores[dir].count++;
    }

    const dirs = Object.entries(dirScores)
      .map(([dir, d]) => ({ dir, avg: Math.round(d.total / d.count) }))
      .sort((a, b) => b.avg - a.avg);

    if (dirs.length === 0) return '';

    const goodDirs = dirs.filter(d => d.avg >= 55).map(d => d.dir);
    const badDirs = dirs.filter(d => d.avg < 45).map(d => d.dir);

    let html = '<div class="result-card direction-card"><h3 class="card-title">今日吉方位</h3>';
    if (goodDirs.length > 0) {
      html += `<p class="dir-good">吉方：${goodDirs.join('、')}（出行、開會、開業優先選擇）</p>`;
    }
    if (badDirs.length > 0) {
      html += `<p class="dir-bad">凶方：${badDirs.join('、')}（避免重要事務）</p>`;
    }
    if (goodDirs.length === 0 && badDirs.length === 0) {
      html += `<p class="dir-neutral">各方位平穩，無特別吉凶。</p>`;
    }
    html += '</div>';
    return html;
  }

  // ==================== 流年流月分析 ====================
  _renderYearMonthAnalysis(bazi) {
    const now = new Date();
    const flowYear = this.baziEngine.calculateYearPillar(now);
    const flowMonth = this.baziEngine.calculateMonthPillar(now);
    const dayMaster = bazi.day.stem;

    const tenGodDesc = {
      '正官': '事業穩定，有貴人相助',
      '七殺': '壓力較大，需謹慎應對',
      '正印': '學習成長，適合進修',
      '偏印': '思緒活躍，適合研究',
      '食神': '才華展現，社交順暢',
      '傷官': '變動較多，注意口舌',
      '正財': '財運穩定，適合理財',
      '偏財': '偏財運佳，拓展人脈',
      '比肩': '同儕助力，合作有利',
      '劫財': '財務波動，避免借貸'
    };

    const yearTG = flowYear ? this.baziEngine.getTenGod(dayMaster, flowYear.stem) : null;
    const monthTG = flowMonth ? this.baziEngine.getTenGod(dayMaster, flowMonth.stem) : null;

    // 大運
    let dayunInfo = '';
    if (bazi.dayun?.pillars?.length > 0) {
      const dy = bazi.dayun.pillars[0];
      dayunInfo = `${dy.name}（${dy.tenGod || ''}）`;
    }

    let html = '<div class="result-card year-month-card"><h3 class="card-title">流年流月概述</h3>';
    html += '<dl class="bazi-details">';

    if (dayunInfo) {
      html += `<div class="bazi-row"><dt class="bazi-label">當前大運</dt><dd class="bazi-value">${dayunInfo}</dd></div>`;
    }

    if (flowYear && yearTG) {
      const desc = tenGodDesc[yearTG.name] || '';
      html += `<div class="bazi-row"><dt class="bazi-label">${flowYear.name}年</dt><dd class="bazi-value">${yearTG.name}年 — ${desc}</dd></div>`;
    }

    if (flowMonth && monthTG) {
      const desc = tenGodDesc[monthTG.name] || '';
      html += `<div class="bazi-row"><dt class="bazi-label">${flowMonth.name}月</dt><dd class="bazi-value">${monthTG.name}月 — ${desc}</dd></div>`;
    }

    html += '</dl></div>';
    return html;
  }

  // ==================== 分享卡片 Canvas 生成 ====================
  _generateShareCard(bazi, today) {
    const W = 480;
    const PAD = 24;
    const summary = today.summary;
    const hours = today.hours || [];

    // 開運色
    const dayEl = this._getBranchElement(summary.flowDay ? summary.flowDay.charAt(1) : '土');
    const colorMap = { wood: '綠色系', fire: '紅色系', earth: '黃色系', metal: '白色系', water: '黑色系' };
    const luckyColor = colorMap[dayEl] || '黃色系';
    const hetuMap = { 'water': '1、6', 'fire': '2、7', 'wood': '3、8', 'metal': '4、9', 'earth': '5、10' };
    const luckyNum = bazi.yongShen?.yongShen ? hetuMap[bazi.yongShen.yongShen] || '' : '';

    // 時辰格子高度
    const gridCols = 4;
    const gridRows = 3;
    const cellH = 44;
    const gridH = gridRows * cellH;
    const headerH = 140;
    const metaH = 70;
    const footerH = 40;
    const H = headerH + metaH + gridH + footerH + PAD * 2;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#F7EFE1';
    ctx.fillRect(0, 0, W, H);

    // 頂部色塊
    const grad = ctx.createLinearGradient(0, 0, 0, headerH + PAD);
    grad.addColorStop(0, '#8B1E1E');
    grad.addColorStop(1, '#5C0E0E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, headerH + PAD);

    // 菱形暗紋
    ctx.strokeStyle = 'rgba(201,164,92,0.08)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < headerH + PAD; y += 20) {
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x - 10, y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // 標題
    ctx.fillStyle = '#F5D680';
    ctx.font = '700 16px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('速窺運勢', W / 2, PAD + 24);

    // 日期
    ctx.fillStyle = '#F0DCC0';
    ctx.font = '400 12px "Noto Sans TC", sans-serif';
    ctx.fillText(`${summary.date} ${summary.weekday}　流日 ${summary.flowDay || ''}`, W / 2, PAD + 48);

    // 分數
    ctx.fillStyle = summary.levelColor;
    ctx.font = '900 48px "Noto Serif TC", serif';
    ctx.fillText(`${summary.averageScore}`, W / 2, PAD + 108);
    ctx.fillStyle = '#F0DCC0';
    ctx.font = '400 14px "Noto Sans TC", sans-serif';
    ctx.fillText(`分　${summary.level}`, W / 2, PAD + 130);

    // 元數據區
    const metaY = headerH + PAD;
    ctx.fillStyle = '#FFF9ED';
    ctx.fillRect(0, metaY, W, metaH);
    ctx.fillStyle = '#C9A45C';
    ctx.font = '600 12px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`開運穿搭：${luckyColor}`, PAD, metaY + 20);
    ctx.fillText(`幸運數字：${luckyNum}`, PAD, metaY + 42);
    ctx.textAlign = 'right';
    ctx.fillText(`最佳時辰：${(summary.bestHours || []).join(' ')}`, W - PAD, metaY + 20);
    ctx.fillText(`注意時辰：${(summary.riskHours || []).join(' ') || '無'}`, W - PAD, metaY + 42);

    // 時辰格子
    const gridY = metaY + metaH;
    ctx.fillStyle = '#FFF9ED';
    ctx.fillRect(0, gridY, W, gridH);

    const cellW = Math.floor((W - PAD * 2) / gridCols);
    for (let i = 0; i < hours.length && i < 12; i++) {
      const h = hours[i];
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = PAD + col * cellW;
      const y = gridY + row * cellH;

      // 格子背景
      const bgColor = h.score >= 65 ? '#e8f5e9' : h.score < 45 ? '#ffebee' : '#fff8e1';
      ctx.fillStyle = bgColor;
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = '#E6D6B8';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // 時辰名
      ctx.fillStyle = '#2B2118';
      ctx.font = '600 13px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(h.hourName, x + cellW / 2, y + 18);

      // 分數 + 徽章
      const badge = h.score >= 65 ? '🟢' : h.score < 45 ? '🔴' : '🟡';
      ctx.fillStyle = h.levelColor;
      ctx.font = '700 12px "Noto Sans TC", sans-serif';
      ctx.fillText(`${badge} ${h.score}`, x + cellW / 2, y + 36);
    }

    // 浮水印
    ctx.fillStyle = 'rgba(139,30,30,0.08)';
    ctx.font = '400 11px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('當麻實驗室  donmalab.com', W / 2, H - 12);

    // 顯示預覽
    const dataUrl = canvas.toDataURL('image/png');
    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
      <img src="${dataUrl}" alt="今日運勢簡報">
      <div class="share-actions">
        <button class="btn-download" id="btnDownloadCard">下載圖片</button>
        <button class="btn-close-share" id="btnCloseShare">關閉</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btnCloseShare').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('btnDownloadCard').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `速窺運勢_${summary.date}.png`;
      a.click();
    });
  }

  // ==================== 命盤簡報 Canvas ====================
  _generateBaziCard(bazi) {
    const W = 480;
    const PAD = 24;
    const ROW_H = 24;
    const HEADER_H = 56;
    const PILLAR_H = 80;
    const FOOTER_H = 30;

    // 資料列
    const strengthLabels = { '旺': '旺（得令）', '相': '相（得生）', '休': '休（退休）', '囚': '囚（受制）', '死': '死（受剋）' };
    const rows = [
      ['日主旺衰', strengthLabels[bazi.dayMasterStrength] || bazi.dayMasterStrength || ''],
      ['日主根基', bazi.rootInfo?.hasRoot ? '有根' : '無根（虛浮）'],
      ['旬空', bazi.kongWang?.join('、') || ''],
      ['用神', bazi.yongShen?.yongShenLabel || ''],
      ['忌神', bazi.yongShen?.jiShenLabel || ''],
      ['身強身弱', bazi.bodyStrength ? `${bazi.bodyStrength.level}（${bazi.bodyStrength.deLing.detail}、${bazi.bodyStrength.deDi.detail}、${bazi.bodyStrength.deShi.detail}）` : ''],
      ['格局', bazi.pattern?.name || ''],
      ['胎元', bazi.taiYuan?.name || ''],
      ['命宮', bazi.mingGong?.branch || ''],
      ['司令', bazi.renYuanSiLing?.stem || ''],
      ['神煞', bazi.shenSha?.map(s => s.name).join('、') || ''],
      ['地支氣場', bazi.branchRelationScore ? `${bazi.branchRelationScore >= 0 ? '和諧' : '動盪'}（${bazi.branchRelationScore >= 0 ? '+' : ''}${bazi.branchRelationScore}）` : ''],
      ['地支關係', bazi.branchRelations?.summary?.join('、') || ''],
    ].filter(([, v]) => v);

    const detailRows = rows.length;
    const H = PAD + HEADER_H + PILLAR_H + PAD + detailRows * ROW_H + PAD + FOOTER_H + PAD;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#F7EFE1';
    ctx.fillRect(0, 0, W, H);

    // 頂部紅底
    ctx.fillStyle = '#8B1E1E';
    ctx.fillRect(0, 0, W, HEADER_H + PAD);
    ctx.strokeStyle = 'rgba(201,164,92,0.08)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < HEADER_H + PAD; y += 20) {
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 10, y);
        ctx.closePath(); ctx.stroke();
      }
    }

    // 標題
    ctx.fillStyle = '#F5D680';
    ctx.font = '700 16px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('速窺運勢 — 個人命盤', W / 2, PAD + 22);

    // 性別/生日
    ctx.fillStyle = '#F0DCC0';
    ctx.font = '400 11px "Noto Sans TC", sans-serif';
    const gender = bazi.gender === 'male' ? '男' : bazi.gender === 'female' ? '女' : '';
    const bd = bazi.birthInfo?.birthDate || '';
    ctx.fillText(`${bd} ${gender}`, W / 2, PAD + 42);

    // 四柱
    const pillars = [
      { label: '年柱', stem: bazi.year?.stem || '', branch: bazi.year?.branch || '', tg: bazi.tenGods?.year?.name || '' },
      { label: '月柱', stem: bazi.month?.stem || '', branch: bazi.month?.branch || '', tg: bazi.tenGods?.month?.name || '' },
      { label: '日柱', stem: bazi.day?.stem || '', branch: bazi.day?.branch || '', tg: bazi.tenGods?.day?.name || '' },
      { label: '時柱', stem: bazi.hour?.stem || '', branch: bazi.hour?.branch || '', tg: bazi.tenGods?.hour?.name || '' }
    ];

    const elColor = { '甲':'#2E7D32','乙':'#4CAF50','丙':'#C62828','丁':'#E57373','戊':'#8D6E63','己':'#A1887F','庚':'#78909C','辛':'#BDBDBD','壬':'#1565C0','癸':'#42A5F5' };
    const brElColor = { '子':'#1565C0','丑':'#8D6E63','寅':'#2E7D32','卯':'#4CAF50','辰':'#A1887F','巳':'#C62828','午':'#E57373','未':'#BCAAA4','申':'#78909C','酉':'#BDBDBD','戌':'#795548','亥':'#42A5F5' };

    const pillarY = HEADER_H + PAD;
    const cellW = Math.floor((W - PAD * 2) / 4);

    // 四柱標籤行
    ctx.textAlign = 'center';
    ctx.font = '600 11px "Noto Sans TC", sans-serif';
    for (let i = 0; i < 4; i++) {
      const cx = PAD + i * cellW + cellW / 2;
      ctx.fillStyle = '#8B6914';
      ctx.fillText(pillars[i].label, cx, pillarY + 14);
    }

    // 天干行
    for (let i = 0; i < 4; i++) {
      const cx = PAD + i * cellW + cellW / 2;
      ctx.fillStyle = elColor[pillars[i].stem] || '#2B2118';
      ctx.font = '700 24px "Noto Serif TC", serif';
      ctx.fillText(pillars[i].stem, cx, pillarY + 42);
    }

    // 地支行
    for (let i = 0; i < 4; i++) {
      const cx = PAD + i * cellW + cellW / 2;
      ctx.fillStyle = brElColor[pillars[i].branch] || '#2B2118';
      ctx.font = '700 24px "Noto Serif TC", serif';
      ctx.fillText(pillars[i].branch, cx, pillarY + 66);
    }

    // 資料列
    const dataY = pillarY + PILLAR_H + PAD;
    for (let i = 0; i < rows.length; i++) {
      const y = dataY + i * ROW_H;
      // 背景條紋
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,249,237,0.5)';
        ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);
      }
      // 標籤
      ctx.fillStyle = '#8B1E1E';
      ctx.font = '600 12px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(rows[i][0], PAD + 4, y + 16);
      // 值
      ctx.fillStyle = '#2B2118';
      ctx.font = '400 12px "Noto Sans TC", sans-serif';
      ctx.fillText(rows[i][1], PAD + 80, y + 16);
    }

    // 浮水印
    ctx.fillStyle = 'rgba(139,30,30,0.08)';
    ctx.font = '400 11px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('當麻實驗室  donmalab.com', W / 2, H - 10);

    // 預覽
    const dataUrl = canvas.toDataURL('image/png');
    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
      <img src="${dataUrl}" alt="個人命盤簡報">
      <div class="share-actions">
        <button class="btn-download" id="btnDownloadBazi">下載圖片</button>
        <button class="btn-close-share" id="btnCloseBazi">關閉</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('btnCloseBazi').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('btnDownloadBazi').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `命盤_${bazi.day?.stem || ''}${bazi.day?.branch || ''}.png`;
      a.click();
    });
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
