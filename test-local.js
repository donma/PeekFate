// 本地測試腳本 - Node.js 環境執行
const fs = require('fs');
const path = require('path');

// 模擬 fetch
global.fetch = async (url) => {
  const filePath = path.join(__dirname, url);
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    ok: true,
    json: async () => JSON.parse(content)
  };
};

// 模擬 window
global.window = {};

// 載入引擎
async function loadEngines() {
  const engines = {};
  
  // 載入所有引擎文件
  const engineFiles = [
    'js/engines/date-engine.js',
    'js/engines/ganzhi-engine.js', 
    'js/engines/bazi-engine.js',
    'js/engines/iching-engine.js',
    'js/engines/qimen-engine.js',
    'js/engines/scoring-engine.js',
    'js/engines/interpretation-engine.js'
  ];

  for (const file of engineFiles) {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    eval(content);
  }

  engines.date = new DateEngine();
  engines.ganzhi = new GanzhiEngine();
  engines.bazi = new BaziEngine();
  engines.iching = new IChingEngine();
  engines.qimen = new QimenEngine();
  engines.scoring = new ScoringEngine();

  // 載入數據
  const results = await Promise.allSettled([
    engines.ganzhi.loadData(),
    engines.bazi.loadData(),
    engines.iching.loadData(),
    engines.qimen.loadData(),
    engines.scoring.loadData()
  ]);

  return { engines, results };
}

// 測試
async function runTests() {
  console.log('=== 窺天命 命術引擎驗證測試 ===\n');
  
  const { engines, results } = await loadEngines();
  
  // 1. 引擎載入測試
  console.log('【引擎載入】');
  const engineNames = ['干支', '八字', '易經', '奇門', '計分'];
  let loadPass = 0;
  results.forEach((r, i) => {
    const pass = r.status === 'fulfilled' && r.value !== false;
    console.log(`  ${pass ? '✅' : '❌'} ${engineNames[i]}引擎`);
    if (pass) loadPass++;
  });
  console.log(`  結果：${loadPass}/${results.length} 通過\n`);

  // 2. 64卦二進制唯一性
  console.log('【64卦二進制】');
  const hexagrams = await fetch('data/iching/hexagrams.json').then(r => r.json());
  const binaries = hexagrams.map(h => h.binary);
  const uniqueBinaries = new Set(binaries);
  console.log(`  總卦數：${hexagrams.length}`);
  console.log(`  唯一二進制：${uniqueBinaries.size}`);
  console.log(`  ${uniqueBinaries.size === 64 ? '✅ 通過' : '❌ 失敗'}\n`);

  // 3. 模擬100個生日測試
  console.log('【模擬100個生日測試】');
  const testBirthdays = [
    '1950-01-15', '1950-06-20', '1950-12-31',
    '1955-03-08', '1955-08-15', '1955-11-22',
    '1960-02-05', '1960-05-18', '1960-09-30',
    '1962-01-01', '1962-04-14', '1962-07-28',
    '1965-02-17', '1965-06-06', '1965-10-10',
    '1968-01-29', '1968-05-05', '1968-08-22',
    '1970-03-15', '1970-07-07', '1970-11-11',
    '1972-02-02', '1972-06-18', '1972-09-25',
    '1975-01-10', '1975-04-20', '1975-08-08',
    '1978-02-28', '1978-05-30', '1978-10-15',
    '1980-03-03', '1980-07-15', '1980-12-25',
    '1983-01-20', '1983-06-21', '1983-09-09',
    '1985-02-14', '1985-05-01', '1985-08-28',
    '1988-01-08', '1988-04-15', '1988-07-07',
    '1990-02-20', '1990-06-10', '1990-10-01',
    '1992-03-12', '1992-07-25', '1992-11-18',
    '1995-01-28', '1995-05-15', '1995-09-03',
    '1998-02-08', '1998-06-22', '1998-10-30',
    '2000-01-01', '2000-04-04', '2000-08-08',
    '2002-02-12', '2002-05-25', '2002-09-15',
    '2005-03-05', '2005-07-18', '2005-11-28',
    '2008-01-16', '2008-06-30', '2008-10-10',
    '2010-02-22', '2010-05-05', '2010-08-15',
    '2012-03-20', '2012-07-07', '2012-12-12',
    '2015-01-05', '2015-04-18', '2015-09-28',
    '2018-02-16', '2018-06-15', '2018-11-11',
    '2020-01-25', '2020-05-20', '2020-10-01',
    '2022-02-04', '2022-06-06', '2022-09-09',
    '2024-01-10', '2024-04-04', '2024-08-08',
    '2025-01-01', '2025-03-15', '2025-06-01',
    '1969-08-17', '1973-11-23', '1977-04-30',
    '1981-09-14', '1984-12-22', '1986-03-28',
    '1989-07-11', '1991-10-05', '1993-02-19',
    '1996-06-28', '1999-01-12', '2001-05-23',
    '2003-08-31', '2006-12-07', '2009-04-14',
    '2011-07-22', '2013-11-03', '2016-03-09'
  ];

  const testTimes = ['00:00', '02:30', '05:15', '08:45', '12:00', '14:30', '17:00', '19:30', '21:15', '23:30'];
  
  let totalTests = 0;
  let passTests = 0;
  let failTests = 0;
  const errors = [];

  for (let i = 0; i < testBirthdays.length; i++) {
    const bd = testBirthdays[i];
    const bt = testTimes[i % testTimes.length];
    
    try {
      // 八字計算
      const bazi = engines.bazi.calculateBazi(bd, bt);
      totalTests++;
      if (bazi.year && bazi.month && bazi.day && bazi.hour) {
        passTests++;
      } else {
        failTests++;
        errors.push(`${bd}：八字不完整`);
      }

      // 易經計算
      totalTests++;
      try {
        const hex = engines.iching.deriveHourHexagram(new Date(bd), bazi.hour.branch, bazi);
        if (hex && hex.hexagram && hex.hexagram.name) {
          passTests++;
        } else {
          failTests++;
          errors.push(`${bd}：易經返回空`);
        }
      } catch(e) {
        failTests++;
        errors.push(`${bd}：易經錯誤 - ${e.message}`);
      }

      // 奇門計算
      totalTests++;
      try {
        const qm = engines.qimen.calculateQimenHourChart(new Date(bd), bazi.hour.branch);
        if (qm) {
          passTests++;
        } else {
          failTests++;
          errors.push(`${bd}：奇門返回空`);
        }
      } catch(e) {
        failTests++;
        errors.push(`${bd}：奇門錯誤 - ${e.message}`);
      }

      // 計分驗證
      totalTests++;
      const sc = engines.scoring.calculateTotalScore(5, 3, 8, 2);
      if (sc.totalScore >= 0 && sc.totalScore <= 100 && sc.level) {
        passTests++;
      } else {
        failTests++;
        errors.push(`${bd}：計分異常`);
      }

    } catch(e) {
      failTests++;
      errors.push(`${bd}：未預期錯誤 - ${e.message}`);
    }
  }

  console.log(`  總測試數：${totalTests}`);
  console.log(`  通過：${passTests} ✅`);
  console.log(`  失敗：${failTests} ${failTests > 0 ? '❌' : '✅'}`);
  console.log(`  通過率：${((passTests / totalTests) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n【錯誤詳情】');
    errors.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`));
    if (errors.length > 20) console.log(`  ... 還有 ${errors.length - 20} 個錯誤`);
  }

  // 4. 命理規則驗證
  console.log('\n【命理規則驗證】');
  
  // 立春換年
  const spring1 = engines.bazi.calculateBazi('2026-02-03', '12:00');
  const spring2 = engines.bazi.calculateBazi('2026-02-04', '12:00');
  console.log(`  立春換年：${spring1.year.name} → ${spring2.year.name} ${spring1.year.name !== spring2.year.name ? '✅' : '❌'}`);

  // 十神驗證
  const tgTest = engines.bazi.calculateBazi('1990-06-15', '12:00');
  console.log(`  日主：${tgTest.dayMaster.stem}（${tgTest.dayMaster.label}）`);
  console.log(`  時柱十神：${tgTest.tenGods?.hour?.name || '未知'}`);

  // 易經固定性
  const hex1 = engines.iching.deriveHourHexagram(new Date('2026-06-01'), '午', tgTest);
  const hex2 = engines.iching.deriveHourHexagram(new Date('2026-06-01'), '午', tgTest);
  console.log(`  易經固定性：${hex1.hexagram.id === hex2.hexagram.id ? '✅' : '❌'}（卦=${hex1.hexagram.name}）`);

  // 吉凶分級
  const levels = [
    { s: 95, e: '大吉' }, { s: 75, e: '吉' }, { s: 60, e: '小吉' },
    { s: 50, e: '平' }, { s: 40, e: '小凶' }, { s: 20, e: '凶' }
  ];
  let levelPass = 0;
  levels.forEach(l => {
    const result = engines.scoring.getScoreLevel(l.s);
    if (result.level === l.e) levelPass++;
  });
  console.log(`  吉凶分級：${levelPass}/6 ${levelPass === 6 ? '✅' : '❌'}`);

  // 五行生剋
  const elements = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/core/elements.json'), 'utf8'));
  let elemPass = 0;
  const checks = [
    ['wood', 'fire'], ['fire', 'earth'], ['earth', 'metal'], ['metal', 'water'], ['water', 'wood']
  ];
  checks.forEach(([a, b]) => {
    if (elements.generate[a] === b) elemPass++;
  });
  console.log(`  五行相生：${elemPass}/5 ${elemPass === 5 ? '✅' : '❌'}`);

  // 分數範圍驗證
  console.log('\n【分數範圍驗證】');
  const sc1 = engines.scoring.calculateTotalScore(25, 20, 35, 10);
  const sc2 = engines.scoring.calculateTotalScore(-25, -20, -35, -10);
  const sc3 = engines.scoring.calculateTotalScore(0, 0, 0, 0);
  console.log(`  最高分（全滿分）：${sc1.totalScore} ${sc1.totalScore === 100 ? '✅' : '❌'}`);
  console.log(`  最低分（全負分）：${sc2.totalScore} ${sc2.totalScore === 0 ? '✅' : '❌'}`);
  console.log(`  基礎分（全零）：${sc3.totalScore} ${sc3.totalScore === 60 ? '✅' : '❌'}`);

  // 總結
  console.log('\n=== 驗收結果 ===');
  const allPass = loadPass === 5 && uniqueBinaries.size === 64 && failTests === 0 && levelPass === 6;
  if (allPass) {
    console.log('✅ 驗收通過！');
  } else {
    console.log('❌ 驗收未通過，請檢查上述錯誤');
  }
}

runTests().catch(console.error);
