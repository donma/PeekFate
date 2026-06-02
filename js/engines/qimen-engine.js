class QimenEngine {
  constructor() {
    this.loaded = false;
    this.config = null;
    this.solarTerms = null;
    this.stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    this.branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    this.sixtyCycle = [];
    for (let i = 0; i < 60; i++) {
      this.sixtyCycle.push({ stem: this.stems[i % 10], branch: this.branches[i % 12], name: this.stems[i % 10] + this.branches[i % 12] });
    }
  }

  async loadData() {
    return this.initialize();
  }

  async initialize() {
    try {
      const [configResp] = await Promise.all([
        fetch('./data/interpretation/qimen-config.json')
      ]);
      this.config = await configResp.json();
      this.loaded = true;
      return true;
    } catch (e) {
      console.warn('奇門遁甲引擎初始化失敗:', e);
      return false;
    }
  }

  setSolarTerms(data) { this.solarTerms = data; }

  /* ---- 60甲子工具 ---- */
  _getIndex(stem, branch) {
    for (let i = 0; i < 60; i++) {
      if (this.sixtyCycle[i].stem === stem && this.sixtyCycle[i].branch === branch) return i;
    }
    return -1;
  }

  /* ---- 節氣判定 ---- */
  _getSolarTermName(date) {
    // solarTerms 格式: { "1900": { "立春": "1900-02-04", ... }, ... }
    if (!this.solarTerms) return null;
    const y = String(date.getFullYear());
    const yearData = this.solarTerms[y];
    if (!yearData) return null;
    const ts = date.getTime();
    const termOrder = ['立春','雨水','驚蟄','春分','清明','穀雨','立夏','小滿','芒種','夏至','小暑','大暑','立秋','處暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
    let lastTerm = null;
    for (const name of termOrder) {
      const dStr = yearData[name];
      if (!dStr) continue;
      const d = new Date(dStr);
      if (d <= ts) lastTerm = name;
    }
    return lastTerm;
  }

  _daysSinceTermStart(date, termName) {
    if (!this.solarTerms) return 0;
    const y = String(date.getFullYear());
    const yearData = this.solarTerms[y];
    if (!yearData) return 0;
    const dStr = yearData[termName];
    if (!dStr) return 0;
    const d = new Date(dStr);
    return Math.floor((date.getTime() - d.getTime()) / 86400000);
  }

  _getSexagenaryIndex(stem, branch) {
    return this._getIndex(stem, branch);
  }

  /* ---- 三元判定 ---- */
  _getYuan(daysSinceTerm) {
    if (daysSinceTerm < 0) daysSinceTerm = 0;
    if (daysSinceTerm < 5) return 0; // 上元
    if (daysSinceTerm < 10) return 1; // 中元
    return 2; // 下元
  }

  /* ---- 陰陽遁判定 ---- */
  _isYang(date, termName) {
    // 陽遁: 冬至→夏至; 陰遁: 夏至→冬至
    const yangTerms = ['冬至','小寒','大寒','立春','雨水','驚蟄','春分','清明','穀雨','立夏','小滿','芒種'];
    return yangTerms.includes(termName);
  }

  /* ===== 核心排盤 ===== */

  /**
   * 布三奇六儀（地盤）
   */
  _placeDiPan(boardNum, isYang) {
    const order = ['戊','己','庚','辛','壬','癸','丁','丙','乙'];
    const result = {};
    for (let i = 0; i < 9; i++) {
      let palace;
      if (isYang) {
        palace = ((boardNum - 1 + i) % 9) + 1;
      } else {
        palace = (((boardNum - 1 - i) % 9) + 9) % 9 + 1;
      }
      result[palace] = order[i];
    }
    return result;
  }

  /**
   * 定旬首
   */
  _getXunShou(hourIndex) {
    const xunStart = Math.floor(hourIndex / 10) * 10;
    return {
      index: xunStart,
      name: this.sixtyCycle[xunStart].name,
      stem: this.sixtyCycle[xunStart].stem,
      branch: this.sixtyCycle[xunStart].branch,
      yi: ['戊','己','庚','辛','壬','癸'][Math.floor(xunStart / 10) % 6] // 甲子→戊, 甲戌→己, etc
    };
  }

  /**
   * 找奇儀所在的宮位（地盤）
   */
  _findYiPalace(diPan, yi) {
    for (const [palace, val] of Object.entries(diPan)) {
      if (val === yi) return parseInt(palace);
    }
    return null;
  }

  /**
   * 找天干所在宮位（地盤）
   */
  _findStemPalace(diPan, stem) {
    const heavenStems = ['戊','己','庚','辛','壬','癸','丁','丙','乙'];
    if (heavenStems.includes(stem)) return this._findYiPalace(diPan, stem);
    // 甲遁在戊, 乙/丙/丁 直接查
    if (stem === '甲') return this._findYiPalace(diPan, '戊');
    for (const [palace, val] of Object.entries(diPan)) {
      if (val === stem) return parseInt(palace);
    }
    return null;
  }

  /* ---- 九星/八門/八神查表 ---- */
  _getStarByPalace(palace) {
    return this.config.stars.find(s => s.palace === palace);
  }

  _getStarByName(name) {
    return this.config.stars.find(s => s.name === name);
  }

  _getDoorByPalace(palace) {
    if (palace === 5) return this.config.doors.find(d => d.name === '死寄');
    // 八門映射: 1休,2死,3傷,4杜,6開,7驚,8生,9景
    const doorMap = { 1:'休',2:'死',3:'傷',4:'杜',6:'開',7:'驚',8:'生',9:'景' };
    return this.config.doors.find(d => d.name === doorMap[palace]);
  }

  _getDoorByName(name) {
    return this.config.doors.find(d => d.name === name);
  }

  _getSpiritByIndex(index) {
    return this.config.spirits[index];
  }

  /**
   * 計算時辰奇門盤
   * @param {Date} date
   * @param {string} hourBranch - 時支（子丑寅卯...）
   * @param {string} dayStem - 日干（用於定時干）
   * @param {string} birthDayStem - 命主日干（用於十神對照，可選）
   * @returns {Object} board state with scoring info
   */
  calculateHourBoard(date, hourBranch, dayStem) {
    if (!this.loaded || !this.config) return null;
    const termName = this._getSolarTermName(date);
    if (!termName) return null;

    const isYang = this._isYang(date, termName);
    const daysSince = this._daysSinceTermStart(date, termName);
    const yuan = this._getYuan(daysSince);
    const boardKey = isYang ? 'yang' : 'yin';
    const boardList = this.config.board[boardKey][termName];
    if (!boardList) return null;
    const boardNum = boardList[yuan];

    // 地盤
    const diPan = this._placeDiPan(boardNum, isYang);

    // 時辰 60甲子 index
    const hourIndex = this._getSexagenaryIndex(dayStem, hourBranch);
    if (hourIndex < 0) return null;

    // 旬首
    const xunShou = this._getXunShou(hourIndex);

    // 值符宮 = 旬首奇儀在地盤的宮位
    const zhiFuPalace = this._findYiPalace(diPan, xunShou.yi);

    // 值符星 = 該宮的九星
    const zhiFuStar = this._getStarByPalace(zhiFuPalace);

    // 值使門 = 該宮的八門
    const zhiShiDoor = this._getDoorByPalace(zhiFuPalace);

    // 時干宮（地盤中時干的位置）
    const hourStemPalace = this._findStemPalace(diPan, dayStem);

    // 時支宮（地支對應的宮位）
    const branchPalaceMap = { '子':1,'丑':2,'寅':3,'卯':4,'辰':5,'巳':6,'午':7,'未':8,'申':9,'酉':10,'戌':11,'亥':12 };
    const palaceBranchMap = { 1:'子',2:'丑',3:'寅',4:'卯',5:'辰',6:'巳',7:'午',8:'未',9:'申' }; // Only 9 palaces, use modulo
    const hourBranchPalace = (branchPalaceMap[hourBranch] % 9) || 9;

    // 天盤旋轉位移
    let tianPanDisp = 0;
    if (hourStemPalace && zhiFuPalace) {
      tianPanDisp = (hourStemPalace - zhiFuPalace + 9) % 9;
    }

    // 計算各宮天盤九星
    const tianPanStars = {};
    for (const p of this.config.palaces) {
      if (p.num === 5) continue;
      const origStar = this._getStarByPalace(p.num);
      if (!origStar) continue;
      const targetPalace = ((p.num - 1 + tianPanDisp) % 9) + 1;
      tianPanStars[targetPalace] = origStar.name;
    }

    // 人盤旋轉位移
    let renPanDisp = 0;
    if (zhiFuPalace) {
      renPanDisp = (hourBranchPalace - zhiFuPalace + 9) % 9;
    }

    // 計算各宮人盤八門
    const renPanDoors = {};
    for (const p of this.config.palaces) {
      if (p.num === 5) continue;
      const origDoor = this._getDoorByPalace(p.num);
      if (!origDoor) continue;
      const targetPalace = ((p.num - 1 + renPanDisp) % 9) + 1;
      renPanDoors[targetPalace] = origDoor.name;
    }

    // 當值宮位 = 值符宮（天盤中值符所在位置）
    const currentZhiFuPalace = hourStemPalace || zhiFuPalace;
    const currentZhiFuStar = tianPanStars[currentZhiFuPalace] || zhiFuStar?.name;
    const currentZhiFuDoor = renPanDoors[currentZhiFuPalace];

    // 八神（簡化版：只計算值符位置）
    const spirits = this._placeShenPan(currentZhiFuPalace, isYang);

    return {
      date,
      termName,
      isYang,
      boardNum,
      yuan,
      hourIndex,
      xunShou: xunShou.name,
      diPan,
      zhiFuPalace,
      zhiFuStar: zhiFuStar?.name || null,
      zhiFuStarQuality: zhiFuStar?.quality || null,
      zhiShiPalace: zhiFuPalace,
      zhiShiDoor: zhiShiDoor?.name || null,
      zhiShiDoorQuality: zhiShiDoor?.quality || null,
      hourStemPalace,
      hourBranchPalace,
      tianPanDisp,
      tianPanStars,
      renPanDisp,
      renPanDoors,
      currentZhiFuPalace,
      currentZhiFuStar,
      currentZhiFuDoor,
      spirits
    };
  }

  _placeShenPan(zhiFuPalace, isYang) {
    const result = {};
    if (!zhiFuPalace) return result;
    for (let i = 0; i < 8; i++) {
      const offset = isYang ? i : -i;
      const palace = (((zhiFuPalace - 1 + offset) % 9) + 9) % 9 + 1;
      if (palace === 5) continue;
      result[palace] = this.config.spirits[i];
    }
    return result;
  }

  /**
   * 從奇門盤推導時辰分數
   * @returns {Object} { score, trace }
   */
  deriveHourScore(board) {
    if (!board) return { score: 0, trace: [] };

    let score = 0;
    const trace = [];

    // 1. 值符星品質
    if (board.zhiFuStarQuality === '吉') { score += 4; trace.push({ rule: 'zhiFu', score: 4, reason: `值符${board.zhiFuStar}吉星，貴人庇護` }); }
    else if (board.zhiFuStarQuality === '凶') { score -= 4; trace.push({ rule: 'zhiFu', score: -4, reason: `值符${board.zhiFuStar}凶星，動盪不安` }); }

    // 2. 值使門品質
    if (board.zhiShiDoorQuality === '吉') { score += 3; trace.push({ rule: 'zhiShi', score: 3, reason: `值使${board.zhiShiDoor}吉門，行動通達` }); }
    else if (board.zhiShiDoorQuality === '凶') { score -= 3; trace.push({ rule: 'zhiShi', score: -3, reason: `值使${board.zhiShiDoor}凶門，阻礙衝突` }); }

    // 3. 三奇在位（乙丙丁）
    const sanQi = ['乙','丙','丁'];
    for (const q of sanQi) {
      const palace = this._findYiPalace(board.diPan, q);
      if (palace) {
        // 三奇在值符宮 = 大吉
        if (palace === board.currentZhiFuPalace) {
          score += 5;
          trace.push({ rule: 'sanQiZhiFu', score: 5, reason: `三奇${q}在值符宮，大利` });
        } else if (palace === board.hourStemPalace) {
          score += 3;
          trace.push({ rule: 'sanQiHour', score: 3, reason: `三奇${q}在時干宮，時機有利` });
        } else {
          score += 1;
          trace.push({ rule: 'sanQi', score: 1, reason: `三奇${q}在位` });
        }
      }
    }

    // 4. 門迫（門剋宮）
    const menPo = this._checkMenPo(board);
    if (menPo > 0) { score += menPo; trace.push({ rule: 'menPoGood', score: menPo, reason: '門宮相生，和諧' }); }
    else if (menPo < 0) { score += menPo; trace.push({ rule: 'menPoBad', score: menPo, reason: '門迫，凶' }); }

    // 5. 反吟/伏吟
    if (board.tianPanDisp === 0) {
      score -= 2;
      trace.push({ rule: 'fuYinQM', score: -2, reason: '星伏吟（天盤不動），遲滯' });
    } else if (board.tianPanDisp === 5) {
      score -= 3;
      trace.push({ rule: 'fanYinQM', score: -3, reason: '星反吟（天盤對沖），反覆' });
    }

    // 6. 八神吉凶
    if (board.spirits && board.currentZhiFuPalace) {
      const spirit = board.spirits[board.currentZhiFuPalace];
      if (spirit) {
        if (spirit.quality === '吉') { score += 3; trace.push({ rule: 'spirit', score: 3, reason: `值符宮神${spirit.name}，吉` }); }
        else if (spirit.quality === '凶') { score -= 2; trace.push({ rule: 'spirit', score: -2, reason: `值符宮神${spirit.name}，凶` }); }
      }
    }

    // 7. 陰陽遁加成
    score += board.isYang ? 1 : -1;
    trace.push({ rule: 'dunType', score: board.isYang ? 1 : -1, reason: board.isYang ? '陽遁，陽氣升發' : '陰遁，陰氣收斂' });

    return { score, trace };
  }

  _checkMenPo(board) {
    const doorElementMap = { '休':'water', '生':'earth', '傷':'wood', '杜':'wood', '景':'fire', '死':'earth', '驚':'metal', '開':'metal', '死寄':'earth' };
    const palaceElMap = { 1:'water', 2:'earth', 3:'wood', 4:'wood', 5:'earth', 6:'metal', 7:'metal', 8:'earth', 9:'fire' };
    const generateMap = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' };
    const controlMap = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' };
    let score = 0;
    for (let p = 1; p <= 9; p++) {
      if (p === 5) continue;
      const doorName = board.renPanDoors[p];
      const palaceEl = palaceElMap[p];
      const doorEl = doorElementMap[doorName];
      if (!doorEl || !palaceEl) continue;
      if (doorEl === palaceEl) score += 1;
      else if (generateMap[doorEl] === palaceEl) score += 2;
      else if (generateMap[palaceEl] === doorEl) score -= 2;
      else if (controlMap[doorEl] === palaceEl) score -= 3;
    }
    return score;
  }

  /**
   * 相容舊版接口：計算奇門時盤（包裝 calculateHourBoard）
   * 回傳 { zhiFu: {star}, zhiShi: {door}, dun, ju, doors, gods, patterns, summary }
   */
  calculateQimenHourChart(date, hourBranch) {
    // 需要 dayStem 來定時干，這裡用當日日干
    const dayStem = this._getDayStem(date);
    const board = this.calculateHourBoard(date, hourBranch, dayStem);
    if (!board) return null;

    // 計算值符/值使對象
    const zhiFuObj = { star: board.zhiFuStar, palace: board.zhiFuPalace };
    const zhiShiObj = { door: board.zhiShiDoor, palace: board.zhiShiPalace };

    // 八神整理為名稱映射
    const gods = {};
    for (const [p, spirit] of Object.entries(board.spirits || {})) {
      gods[p] = spirit.name;  // 只保留神名
    }

    // 門數值版（舊版計分用）
    const doors = board.renPanDoors || {};

    // 特殊格局
    const patterns = [];
    if (board.zhiFuStarQuality === '吉' && board.zhiShiDoorQuality === '吉') {
      patterns.push({ name: '天遁', quality: '吉' });
    }
    if (board.zhiFuStarQuality === '凶' && board.zhiShiDoorQuality === '凶') {
      patterns.push({ name: '天網', quality: '凶' });
    }

    // 摘要
    const favorable = [];
    const unfavorable = [];
    if (board.zhiFuStarQuality === '吉') favorable.push(board.zhiFuStar);
    if (board.zhiShiDoorQuality === '吉') favorable.push(board.zhiShiDoor);
    if (board.zhiFuStarQuality === '凶') unfavorable.push(board.zhiFuStar);
    if (board.zhiShiDoorQuality === '凶') unfavorable.push(board.zhiShiDoor);

    return {
      zhiFu: zhiFuObj,
      zhiShi: zhiShiObj,
      dun: board.isYang ? '陽遁' : '陰遁',
      ju: board.boardNum,
      doors,
      gods,
      patterns,
      summary: { favorable, unfavorable }
    };
  }

  _getDayStem(date) {
    const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // 粗略計算日干（用於時辰定奇門，精確度已足夠）
    // 使用 2024-01-01 = 甲子日 為基準
    const base = new Date(2024, 0, 1);
    const diff = Math.round((date.getTime() - base.getTime()) / 86400000);
    return stems[((diff % 10) + 10) % 10];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QimenEngine;
}
