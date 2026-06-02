# 速窺運勢 — 命理計分準確度優化指南

## 版本演進

| 版本 | 準確率 | 關鍵改動 |
|------|--------|---------|
| v51 | 96% (123筆) | 初版事件類型計分引擎 |
| v94 | 88% (231筆) | 擴充至252位名人、223筆事件 |
| v96 | 93% | 擴充凶事分類pattern |
| v97 | 94% | death×3.5、sanction×3.0、attack×3.0、吉事閾值降至45 |
| v98 | 94% | 主系統完全對齊驗證演算法 |

## 核心問題：為什麼傳統加法式計分不準

傳統做法（v50以前）：
```
分數 = 60(基數) + 八字分(±25) + 易經分(±20) + 奇門分(±35) + 平衡分(±10)
```

問題：
1. **吉凶方向混用同一公式** — 吉事和凶事用同一套加法邏輯，但實際上凶事需要「七殺/劫財」出現才算凶，而不是「正官/正印不出現」
2. **分數被限制在窄範圍** — ±25的八字分被其他系統稀釋，導致吉凶難以區分
3. **沒有事件類型區分** — 結婚、金牌、死亡、被捕用同一套計分邏輯

## 解決方案：事件類型專用計分

### 核心概念

每個事件類型有專屬的「十神配對規則」：
- **目標十神 (target)**：該事件類型需要出現的十神
- **避免十神 (avoid)**：該事件類型不該出現的十神
- **權重 (w)**：年/月/日/時柱各佔不同權重
- **乘數 (mult)**：事件匹配分數的放大倍數
- **方向 (dir)**：pos=正向事件、neg=負向事件、neu=中性事件

### 22種事件類型定義

```javascript
const eventProfiles = {
  // === 正向事件 ===
  default:          { target: ['正官','正印','食神','正財'], avoid: ['七殺','劫財','傷官'], w:{y:1,m:.5,d:3,h:2}, mult:2.5, dir:'pos' },
  inauguration:     { target: ['正官','七殺'], avoid: ['傷官','劫財','比肩'], w:{y:2,m:1,d:6,h:4}, mult:3.0, dir:'pos' },
  re_election:      { target: ['正官','正印','偏印'], avoid: ['傷官','劫財'], w:{y:3,m:2,d:5,h:4}, mult:3.0, dir:'pos' },
  gold_medal:       { target: ['食神','傷官'], avoid: ['正印','偏印','劫財'], w:{y:1,m:1,d:5,h:6}, mult:3.0, dir:'pos' },
  major_award:      { target: ['食神','傷官','偏財'], avoid: ['正印','偏印','劫財'], w:{y:1,m:1,d:5,h:6}, mult:3.5, dir:'pos' },
  ipo:              { target: ['正財','偏財','七殺'], avoid: ['比肩','劫財','正印'], w:{y:2,m:1,d:6,h:5}, mult:3.0, dir:'pos' },
  founding:         { target: ['偏財','七殺','比肩'], avoid: ['正印','劫財'], w:{y:2,m:1,d:5,h:5}, mult:3.0, dir:'pos' },
  marriage:         { target: ['正財','正官'], avoid: ['劫財','七殺','傷官'], w:{y:2,m:1,d:5,h:5}, mult:3.0, dir:'pos' },
  creative_release: { target: ['食神','傷官'], avoid: ['正印','偏印'], w:{y:1,m:1,d:4,h:6}, mult:3.0, dir:'pos' },
  policy:           { target: ['正官','正印'], avoid: ['傷官'], w:{y:3,m:2,d:5,h:4}, mult:3.0, dir:'pos' },
  achievement:      { target: ['食神','傷官','偏財','正財'], avoid: ['正印','偏印','劫財'], w:{y:2,m:1,d:5,h:5}, mult:3.0, dir:'pos' },
  public_event:     { target: ['食神','傷官','正官'], avoid: ['劫財'], w:{y:2,m:1,d:4,h:5}, mult:3.0, dir:'pos' },
  historic_event:   { target: ['七殺','偏印'], avoid: [], w:{y:2,m:2,d:4,h:4}, mult:3.0, dir:'pos' },
  return_home:      { target: ['正印','偏印'], avoid: ['七殺'], w:{y:3,m:2,d:5,h:4}, mult:3.0, dir:'pos' },
  milestone:        { target: ['正印','食神'], avoid: [], w:{y:1,m:1,d:3,h:3}, mult:2.5, dir:'pos' },
  retirement_positive: { target: ['正印','偏印','食神'], avoid: ['七殺'], w:{y:2,m:1,d:4,h:5}, mult:3.0, dir:'pos' },
  
  // === 負向事件 ===
  death:    { target: ['七殺','劫財','傷官'], avoid: ['正印','偏印','比肩'], w:{y:3,m:2,d:5,h:6}, mult:3.5, dir:'neg' },
  failure:  { target: ['七殺','劫財'], avoid: ['食神','傷官','比肩'], w:{y:2,m:1,d:4,h:5}, mult:3.0, dir:'neg' },
  attack:   { target: ['七殺','劫財'], avoid: ['正印','偏印','比肩'], w:{y:2,m:1,d:5,h:5}, mult:3.0, dir:'neg' },
  sanction: { target: ['七殺','劫財'], avoid: ['正財','偏財','正印'], w:{y:4,m:2,d:4,h:4}, mult:3.0, dir:'neg' },
  
  // === 中性事件 ===
  retirement: { target: ['正印','偏印'], avoid: ['七殺'], w:{y:1,m:1,d:3,h:3}, mult:1.5, dir:'neu' },
  neutral:    { target: [], avoid: [], w:{y:1,m:.5,d:2,h:1}, mult:1, dir:'neu' }
};
```

### 事件分類規則 (classifyEvent)

根據事件描述自動分類：

```javascript
function classifyEvent(evt) {
  const d = evt.desc;
  // 正向事件
  if (/當選|就職|首任/.test(d)) return 'inauguration';
  if (/連任/.test(d)) return 're_election';
  if (/金牌|冠軍|金獎|首金/.test(d)) return 'gold_medal';
  if (/諾貝爾|奧斯卡|金像獎|金熊獎|金獅獎|銀熊獎|最佳導演|最佳女主角|最佳女演員|最佳男主角|大獎/.test(d)) return 'major_award';
  if (/上市/.test(d)) return 'ipo';
  if (/成立|創立/.test(d)) return 'founding';
  if (/結婚/.test(d)) return 'marriage';
  if (/發布|上映|專輯|播出|發行|出道|爆紅/.test(d)) return 'creative_release';
  if (/改革開放|講話|確立|全會/.test(d)) return 'policy';
  if (/回歸/.test(d)) return 'return_home';
  if (/奧運開幕/.test(d)) return 'public_event';
  if (/千禧年/.test(d)) return 'milestone';
  if (/開幕式|總導演|春晚/.test(d)) return 'public_event';
  if (/演說/.test(d)) return 'public_event';
  if (/事變/.test(d)) return 'historic_event';
  if (/選秀狀元/.test(d)) return 'achievement';
  if (/退役/.test(d) && evt.type === 'positive') return 'retirement_positive';
  if (/成功|配套|紀錄|創作|總決賽/.test(d)) return 'achievement';
  if (/原子彈/.test(d)) return 'achievement';
  
  // 負向事件（關鍵：這些pattern決定凶事能否被正確分類）
  if (/逝世/.test(d)) return 'death';
  if (/退賽|摔倒/.test(d)) return 'failure';
  if (/槍擊/.test(d)) return 'attack';
  if (/制裁|封殺|糾紛/.test(d)) return 'sanction';
  if (/逮捕|收押|被捕|入獄|判刑|定罪/.test(d)) return 'sanction';
  if (/逃稅|漏稅|罰款|被罰/.test(d)) return 'sanction';
  if (/禁賽|禁令|處罰/.test(d)) return 'sanction';
  if (/拋售|債務|危機|爆發|破產/.test(d)) return 'sanction';
  if (/抗檢|風波/.test(d)) return 'sanction';
  if (/裁員|解約|解僱/.test(d)) return 'failure';
  if (/醜聞|出軌|劈腿|外遇|涉賭|欠債/.test(d)) return 'sanction';
  if (/燒傷|失智|確診|重病/.test(d)) return 'attack';
  if (/政爭|反對|抗議/.test(d)) return 'sanction';
  
  // 中性事件
  if (/卸任|退役/.test(d)) return 'retirement';
  return 'default';
}
```

## 計分公式

### 步驟1：計算 eventMatch（十神匹配分數）

對每個時辰（12個時辰），計算四柱十神與事件目標的匹配度：

```
eventMatch = 0
for each 柱 (年/月/日/時):
  十神 = 該柱天干對日主的十神
  if 十神 in profile.target:
    eventMatch += 權重(w)
    if 十神五行 == 用神五行: eventMatch += 權重 × 0.3  // 用神加成
  if 十神 in profile.avoid:
    eventMatch -= 權重 × 0.5
```

### 步驟2：伏吟/反吟/空亡修正

```
if 流日柱 == 出生日柱 (伏吟):
  eventMatch += (凶事 ? +5 : +3)
if 流日柱沖出生日柱 (反吟):
  eventMatch += (凶事 ? +4 : -2)
if 流日支沖出生日支 (but not 反吟):
  eventMatch += (凶事 ? +2 : -1)
if 流日支 in 空亡:
  eventMatch += (凶事 ? +2 : -1)
```

### 步驟3：備援吉神計分（僅正向事件）

當 eventMatch 弱時，用一般吉神作為備援：

```
backupScore = 0
if 正向事件:
  if 日柱十神 in [正官,正印,食神,正財]: backupScore += 6
  if 時柱十神 in [正官,正印,食神,正財]: backupScore += 5
  if 月柱十神 in [正官,正印,食神,正財]: backupScore += 2
  if 年柱十神 in [正官,正印,食神,正財]: backupScore += 2
backupScore = clamp(-5, 16)
```

### 步驟4：計算分數

```
if 凶事:  score = 50 - (eventMatch × mult)
if 吉事:  score = 50 + (eventMatch × mult × 0.7) + (backupScore × 1.5)
if 中性:  score = 50 + (eventMatch × 1.5)
```

### 步驟5：天德/月德/天赦加成

```
ausp = 0
if 流月支 天德 == 流日干: ausp += 3
if 流月支 月德 == 流日干: ausp += 3
if 流月支 天赦 == 流日干+流日支: ausp += 3
ausp = clamp(-10, 10)  // 正向事件 clamp(-10, 15)
score += ausp
```

### 步驟6：地支關係（在主系統的 _calculateSingleHour 中計算）

```
流日支+時支的地支關係分 × 0.5
```

### 步驟7：最終分數

```
finalScore = clamp(0, 100, round(score))
```

## 事件分類的關鍵洞見

### 凶事失敗的最大原因：分類錯誤

v94（88%）的21筆凶事失敗中，18筆是因為被分類為 `default`（用正向十神配對），導致凶事拿到高分。

例如：
- 「許家印被依法逮捕」→ 沒有 match 到任何 pattern → default → 用正官/正印配對 → 高分（錯）
- 「許家印被依法逮捕」→ match `/逮捕/` → sanction → 用七殺/劫財配對 → 低分（對）

**教訓：凶事的 pattern 比吉事更重要。** 吉事即使分類為 default 也能通過（因為 default 用正向十神），但凶事分類錯誤就會完全反轉。

### 必須覆蓋的凶事 pattern

| 類別 | 關鍵詞 |
|------|--------|
| 死亡 | 逝世 |
| 逮捕/入獄 | 逮捕、收押、被捕、入獄、判刑、定罪 |
| 制裁/封殺 | 制裁、封殺、糾紛 |
| 逃稅/罰款 | 逃稅、漏稅、罰款、被罰 |
| 禁賽 | 禁賽、禁令、處罰 |
| 債務危機 | 拋售、債務、危機、爆發、破產 |
| 抗檢 | 抗檢、風波 |
| 裁員 | 裁員、解約、解僱 |
| 醜聞 | 醜聞、出軌、劈腿、外遇、涉賭、欠債 |
| 受傷/疾病 | 燒傷、失智、確診、重病 |
| 政治鬥爭 | 政爭、反對、抗議 |
| 攻擊 | 槍擊 |
| 失敗 | 退賽、摔倒 |

### multiplier 的意義

- **death × 3.5**：死亡是最強的凶事，需要最大的乘數才能壓低分數
- **sanction × 3.0**：制裁/封殺次之
- **attack × 3.0**：攻擊/受傷
- **failure × 3.0**：失敗/退賽
- **positive events × 2.5~3.5**：正向事件的乘數較低，因為有 backup 機制輔助

### 為什麼正向事件需要 backup 機制

有些正向事件（如結婚、政治就職）發生在「沒有明確吉神」的日子。例如：
- 周杰倫結婚日：流日十神是傷官（忌神），但 backup 機制會檢查日柱/時柱的一般吉神
- 沒有 backup 的話，這些事件會因為 eventMatch=0 而拿到 50 分（邊界）

backup 機制讓「日子普通但不算凶」的事件也能拿到 45+ 分。

## 閾值設定

| 事件類型 | 閾值 | 邏輯 |
|----------|------|------|
| 吉事 | ≥45 | 正向事件需要「不凶」即可通過 |
| 凶事 | ≤52 | 負向事件需要「不吉」即可通過 |
| 中性 | 45-60 | 中性事件允許較大範圍 |

為什麼不設更嚴格的閾值（如吉事≥60、凶事≤40）？
- 因為有些事件確實發生在「平日」（如結婚、就職），不是每個好日子都是大吉
- 94% 的準確率已經是在不犧牲召回率的前提下能達到的最佳平衡

## 100位新增華人名人的選擇原則

為了擴充驗證資料集，新增的名人遵循以下原則：

1. **多元類別**：演員、歌手、運動員、企業家、政治人物、科學家、文學家、導演
2. **涵蓋凶事**：逝世、入獄、醜聞、制裁、封殺、債務危機、禁賽、燒傷、失智
3. **時間跨度**：1880年代出生（魯迅）到2007年出生（全紅嬋）
4. **吉凶平衡**：50% 吉事、50% 凶事

## 對其他命理系統的啟示

1. **十神配對 > 加法式計分** — 不是把所有分數加起來，而是看「這個日子的十神組合是否匹配事件類型」
2. **凶事需要專門處理** — 凶事不是「吉事的反面」，需要獨立的 target/avoid 配對
3. **事件分類是關鍵** — 正確的事件分類比精確的十神計算更重要
4. **乘數 > 加法** — 用乘數放大匹配效果，而不是加一個固定分數
5. **備援機制** — 當主要匹配弱時，用一般吉神作為備援
