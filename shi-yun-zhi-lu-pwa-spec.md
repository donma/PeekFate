# 時運知錄 PWA 專業版施工規格書

版本：v1.0  
目標：地表最強純前端命術規則引擎 PWA  
主軸：今日 + 明日 24 時辰精算，接下來 14 天概述  
技術：HTML / CSS / JavaScript / JSON / PWA  
資料：八字 + 五行 + 十神 + 易經 64 卦 + 變卦系統 + 奇門遁甲時家盤  
原則：不使用後端、不儲存客戶資料、不呼叫 LLM API、正式運算全部由前端 JS + JSON 完成

---

## 0. 專案一句話

製作一個純前端 PWA。使用者進入網站後輸入西元生日，出生時間選填。系統不儲存客戶資料，直接在瀏覽器用 JSON 規則資料庫與 JavaScript 推算，輸出今日與明日每個時辰的吉凶、可能事件、適合事項、避免事項與白話建議，並提供接下來 14 天的每日概述。

---

## 1. 專案定位

### 1.1 專案名稱

暫定：

```text
時運知錄
```

副標：

```text
八字 × 易經 × 奇門遁甲，每日時辰推演工具
```

### 1.2 產品定位

這不是廉價算命頁，也不是抽籤玩具。

定位為：

```text
純前端命術規則引擎 PWA
```

核心價值：

1. 不登入
2. 不上傳生日
3. 不保存個資
4. 可離線使用
5. 可安裝到手機主畫面
6. 所有結果由規則推算
7. 每個判斷可追溯來源
8. 今日 + 明日 24 時辰為主軸
9. 接下來 14 天為輔助概述

---

## 2. 必須遵守的硬性規則

### 2.1 不准使用後端

不得使用：

```text
Node server
.NET server
PHP server
API server
資料庫伺服器
雲端函式
```

只允許：

```text
HTML
CSS
JavaScript
JSON
PWA
GitHub Pages 或任何靜態站台
```

### 2.2 正式運算不准呼叫 LLM

可以在製作 JSON 規則資料時使用 LLM 協助整理文本。

但是正式網站執行時：

```text
不得呼叫 OpenAI
不得呼叫 Gemini
不得呼叫 Claude
不得呼叫任何 LLM API
不得即時生成命理解釋
```

正式推算必須全部由：

```text
JavaScript + JSON
```

完成。

### 2.3 不儲存客戶資料

預設不得保存：

```text
生日
出生時間
性別
查詢結果
命盤
歷史紀錄
```

使用者輸入資料只存在瀏覽器記憶體中。

可選功能：

```text
[ ] 記住我的生日與出生時間，僅儲存在本裝置
```

只有使用者明確勾選時，才允許寫入 localStorage。

### 2.4 不得誇大準確性

所有頁面底部或結果頁需顯示：

```text
本工具依傳統命術規則推算，內容屬民俗文化與個人參考，不作為醫療、法律、投資、婚姻或人生重大決策保證。
```

---

## 3. 使用者流程

### 3.1 首頁流程

使用者進入首頁後，只看到一個清楚的輸入區。

必要欄位：

```text
西元生日 yyyy-mm-dd
```

選填欄位：

```text
出生時間 HH:mm
```

可選欄位：

```text
出生時辰 下拉選單
不知道出生時間
```

性別第一版不要做，避免規則複雜化。未來若加入大運或部分派別規則再加。

### 3.2 首頁按鈕

主要按鈕：

```text
開始推算
```

次要按鈕：

```text
清除資料
```

如果使用者未輸入生日，顯示：

```text
請先輸入西元生日。
```

如果日期不合法，顯示：

```text
生日格式不正確，請使用 yyyy-mm-dd。
```

### 3.3 結果頁主軸

結果頁第一屏要顯示：

```text
今日時辰
明日時辰
```

今日 + 明日是主軸，不要讓 14 天概述搶畫面。

### 3.4 結果頁結構

結果頁排序：

```text
1. 個人基本盤摘要
2. 今日總覽
3. 今日 12 時辰
4. 明日總覽
5. 明日 12 時辰
6. 接下來 14 天概述
7. 詳細系統說明
8. 免責聲明
```

---

## 4. UI 視覺規格

### 4.1 整體風格

風格：

```text
米色底
中國風
古典
專業
乾淨
RWD
手機優先
```

不要做成：

```text
廉價算命網站
大紅大紫閃爍
滿版神像背景
浮誇金光
低俗廣告風
```

### 4.2 色彩

建議色票：

```text
背景米色：#F7EFE1
卡片底色：#FFF9ED
深紅主色：#8B1E1E
朱紅輔色：#B33A2E
深墨文字：#2B2118
次要文字：#6F5B46
淡金線條：#C9A45C
淺邊框：#E6D6B8
吉色：#2F7D32
平色：#9A6A1F
凶色：#A32828
```

### 4.3 字體

CSS 建議：

```css
body {
  font-family:
    "Noto Serif TC",
    "Noto Sans TC",
    "PingFang TC",
    "Microsoft JhengHei",
    serif;
}
```

標題可用 serif，內文可用 sans。

### 4.4 版面

手機版：

```text
單欄
卡片式
每個時辰一張卡
重點資訊先顯示
詳細資訊可展開
```

桌面版：

```text
最大寬度 1180px
今日與明日可以左右雙欄
時辰卡片可用 grid 2 或 3 欄
14 天概述可用橫向或卡片 grid
```

### 4.5 時辰卡片

每張卡片必須顯示：

```text
時辰名稱
時間範圍
吉凶等級
分數
一句重點
適合事項
避免事項
展開詳細
```

展開後顯示：

```text
八字分析
易經分析
奇門分析
計分來源
```

### 4.6 吉凶標籤

分數區間：

```text
85-100：大吉
70-84：吉
55-69：小吉
45-54：平
30-44：小凶
0-29：凶
```

視覺：

```text
大吉：深綠
吉：綠
小吉：青綠
平：棕金
小凶：橘紅
凶：深紅
```

不得只靠顏色判斷，必須有文字標籤。

---

## 5. PWA 規格

### 5.1 必要檔案

```text
manifest.json
service-worker.js
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

### 5.2 Manifest

範例：

```json
{
  "name": "時運知錄",
  "short_name": "時運知錄",
  "description": "八字、易經與奇門遁甲的每日時辰推演工具。",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7EFE1",
  "theme_color": "#8B1E1E",
  "lang": "zh-TW",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

如果部署到子目錄，例如 GitHub Pages `/FortunePWA/`，路徑必須改成 `/FortunePWA/...`。

### 5.3 Service Worker

必須快取：

```text
index.html
css/app.css
js/app.js
js/engines/*.js
data/**/*.json
manifest.json
icons/*.png
```

策略：

```text
HTML：network first，失敗回 cache
CSS / JS / JSON / icons：stale while revalidate
非 GET request：不處理
外站資源：不快取
```

### 5.4 安裝提示

不得一進站跳大型彈窗。

使用低干擾按鈕：

```text
安裝到桌面
```

規則：

1. 只有 beforeinstallprompt 觸發時顯示
2. 使用者點擊才 prompt
3. 關閉後 7 天內不再顯示
4. 已 standalone 時不顯示
5. iOS 顯示小提示：可使用 Safari 分享按鈕加入主畫面

---

## 6. 專案檔案結構

必須照這個結構建立。

```text
/
  index.html
  manifest.json
  service-worker.js
  README.md

  /css
    app.css

  /js
    app.js
    privacy.js
    pwa-install.js

    /engines
      date-engine.js
      ganzhi-engine.js
      bazi-engine.js
      iching-engine.js
      qimen-engine.js
      scoring-engine.js
      interpretation-engine.js

    /ui
      form-controller.js
      result-renderer.js
      hour-card-renderer.js
      fourteen-day-renderer.js

  /data
    /core
      stems.json
      branches.json
      elements.json
      ganzhi-60.json
      twelve-hours.json
      solar-terms.json

    /bazi
      ten-gods.json
      hidden-stems.json
      branch-relations.json
      nayin.json
      bazi-rules.json
      bazi-templates.json

    /iching
      trigrams.json
      hexagrams.json
      lines.json
      hexagram-relations.json
      change-map.json
      iching-templates.json

    /qimen
      palaces.json
      doors.json
      stars.json
      gods.json
      yin-yang-dun.json
      ju-rules.json
      xunshou.json
      zhifu-zhishi.json
      qimen-patterns.json
      qimen-templates.json

    /calendar
      /2026
        01.json
        02.json
        03.json
        04.json
        05.json
        06.json
        07.json
        08.json
        09.json
        10.json
        11.json
        12.json

    /interpretation
      score-rules.json
      event-templates.json
      advice-templates.json
      risk-templates.json

  /icons
    icon-192.png
    icon-512.png
    icon-maskable-512.png

  /tests
    bazi-tests.json
    iching-tests.json
    qimen-tests.json
    integration-tests.json
```

---

## 7. JSON 資料設計

### 7.1 core/stems.json

天干資料。

```json
{
  "甲": {
    "index": 1,
    "element": "wood",
    "yinYang": "yang",
    "label": "陽木",
    "image": "大樹、棟樑、直上之木"
  },
  "乙": {
    "index": 2,
    "element": "wood",
    "yinYang": "yin",
    "label": "陰木",
    "image": "花草、藤蔓、柔木"
  },
  "丙": {
    "index": 3,
    "element": "fire",
    "yinYang": "yang",
    "label": "陽火",
    "image": "太陽、光明、外放之火"
  },
  "丁": {
    "index": 4,
    "element": "fire",
    "yinYang": "yin",
    "label": "陰火",
    "image": "燈火、爐火、細緻之火"
  },
  "戊": {
    "index": 5,
    "element": "earth",
    "yinYang": "yang",
    "label": "陽土",
    "image": "高山、城牆、厚重之土"
  },
  "己": {
    "index": 6,
    "element": "earth",
    "yinYang": "yin",
    "label": "陰土",
    "image": "田園、土壤、包容之土"
  },
  "庚": {
    "index": 7,
    "element": "metal",
    "yinYang": "yang",
    "label": "陽金",
    "image": "刀劍、礦石、剛硬之金"
  },
  "辛": {
    "index": 8,
    "element": "metal",
    "yinYang": "yin",
    "label": "陰金",
    "image": "珠玉、首飾、精緻之金"
  },
  "壬": {
    "index": 9,
    "element": "water",
    "yinYang": "yang",
    "label": "陽水",
    "image": "江海、大河、奔流之水"
  },
  "癸": {
    "index": 10,
    "element": "water",
    "yinYang": "yin",
    "label": "陰水",
    "image": "雨露、霧氣、細密之水"
  }
}
```

### 7.2 core/branches.json

地支資料。

每個地支需包含：

```json
{
  "子": {
    "index": 1,
    "element": "water",
    "yinYang": "yang",
    "zodiac": "鼠",
    "hiddenStems": ["癸"],
    "month": 11,
    "hourRange": "23:00-00:59"
  }
}
```

必須完整列出十二地支：

```text
子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥
```

### 7.3 core/elements.json

五行規則。

```json
{
  "elements": {
    "wood": "木",
    "fire": "火",
    "earth": "土",
    "metal": "金",
    "water": "水"
  },
  "generate": {
    "wood": "fire",
    "fire": "earth",
    "earth": "metal",
    "metal": "water",
    "water": "wood"
  },
  "control": {
    "wood": "earth",
    "earth": "water",
    "water": "fire",
    "fire": "metal",
    "metal": "wood"
  }
}
```

### 7.4 core/ganzhi-60.json

六十甲子。

每筆：

```json
{
  "index": 1,
  "name": "甲子",
  "stem": "甲",
  "branch": "子",
  "nayin": "海中金"
}
```

必須完整 60 筆。

### 7.5 core/twelve-hours.json

十二時辰。

注意子時跨日。

```json
[
  {
    "branch": "子",
    "name": "子時",
    "start": "23:00",
    "end": "00:59",
    "crossDay": true
  },
  {
    "branch": "丑",
    "name": "丑時",
    "start": "01:00",
    "end": "02:59",
    "crossDay": false
  }
]
```

必須完整 12 筆。

---

## 8. 八字引擎規格

### 8.1 bazi-engine.js 必須提供

```javascript
calculateBazi(birthDate, birthTime)
calculateYearPillar(date)
calculateMonthPillar(date)
calculateDayPillar(date)
calculateHourPillar(dayStem, birthTime)
getDayMaster(bazi)
getTenGod(dayStem, targetStem)
getBranchRelations(branches)
```

### 8.2 出生時間未知

如果 birthTime 為 null：

```json
{
  "accuracy": "estimated",
  "pillars": {
    "year": "...",
    "month": "...",
    "day": "...",
    "hour": null
  },
  "note": "未輸入出生時間，因此本命分析未包含時柱。"
}
```

### 8.3 月柱必須用節氣換月

不得用農曆月份硬算月柱。

月柱要以節氣為界，尤其立春、驚蟄、清明等節氣切換要特別注意。

第一版若 solar-terms.json 不完整，必須明確標示：

```text
目前月柱節氣切換規則尚需人工校驗
```

不能偷用錯誤簡化法但不說。

### 8.4 日柱計算

日柱必須有可驗證基準日。

例如：

```text
使用已知甲子日作為 epoch，依日期差推算日柱。
```

必須在 README 或註解中寫出：

```text
基準日期
基準干支
換算公式
時區處理方式
```

### 8.5 子時處理

子時跨日要明確處理。

第一版採用：

```text
晚子時 23:00-23:59 視為當日子時，但需在結果中標記子時跨日可能存在派別差異。
```

或採用另一派別也可以，但必須統一，不能混用。

結果要包含：

```json
{
  "timeBoundaryNote": "子時跨日規則依本系統設定，部分派別可能不同。"
}
```

---

## 9. 十神規格

### 9.1 ten-gods.json

必須定義日主對其他天干的十神。

十神：

```text
比肩
劫財
食神
傷官
偏財
正財
七殺
正官
偏印
正印
```

結構：

```json
{
  "甲": {
    "甲": "比肩",
    "乙": "劫財",
    "丙": "食神",
    "丁": "傷官",
    "戊": "偏財",
    "己": "正財",
    "庚": "七殺",
    "辛": "正官",
    "壬": "偏印",
    "癸": "正印"
  }
}
```

必須完整包含 10 天干 × 10 天干。

### 9.2 十神模板

bazi-templates.json：

```json
{
  "偏財": {
    "keywords": ["資源", "交易", "機會", "外部財"],
    "positive": "容易出現資源、交易、邀約或成果相關訊息。",
    "negative": "若太貪快，容易承諾過多或忽略條件。",
    "advice": "適合談資源與合作，但條件要寫清楚。"
  }
}
```

每個十神都要有：

```text
keywords
positive
negative
advice
scoreDelta
suitable
avoid
```

---

## 10. 易經 64 卦引擎規格

### 10.1 iching/trigrams.json

八卦資料。

```json
{
  "乾": {
    "binary": "111",
    "element": "metal",
    "image": "天",
    "direction": "西北",
    "family": "父",
    "keywords": ["剛健", "主動", "開創"]
  },
  "坤": {
    "binary": "000",
    "element": "earth",
    "image": "地",
    "direction": "西南",
    "family": "母",
    "keywords": ["承載", "順勢", "包容"]
  }
}
```

必須完整八卦：

```text
乾 兌 離 震 巽 坎 艮 坤
```

### 10.2 iching/hexagrams.json

64 卦資料。

每卦必須包含：

```json
{
  "id": 64,
  "name": "火水未濟",
  "upper": "離",
  "lower": "坎",
  "binary": "101010",
  "judgment": "未濟。亨，小狐汔濟，濡其尾，無攸利。",
  "image": "火在水上，未濟。君子以慎辨物居方。",
  "keywords": ["未完成", "過渡", "收尾", "不穩"],
  "summary": "事情尚未完成，局勢正在最後整理階段，需避免急於收尾。"
}
```

注意：

```text
binary 必須明確定義爻序。
請採用由下爻到上爻的順序。
1 代表陽爻，0 代表陰爻。
```

### 10.3 iching/lines.json

384 爻資料。

每筆：

```json
{
  "hexagramId": 64,
  "line": 3,
  "text": "六三，未濟，征凶，利涉大川。",
  "plain": "事情尚未成熟，若硬推容易出錯，但適合做跨越障礙的準備。",
  "keywords": ["未熟", "冒進風險", "準備跨越"]
}
```

### 10.4 hexagram-relations.json

每卦需包含：

```json
{
  "64": {
    "nuclear": 63,
    "opposite": 63,
    "reverse": 63,
    "pair": 63
  }
}
```

定義：

```text
互卦 nuclear：取第 2、3、4 爻為下卦，第 3、4、5 爻為上卦
錯卦 opposite：六爻陰陽全部反轉
綜卦 reverse：六爻上下顛倒
pair：卦序對應綜卦或傳統卦對，依資料表定義
```

### 10.5 change-map.json

4096 變卦路徑。

每卦 64 種動爻組合。

```json
{
  "64": {
    "none": 64,
    "1": 38,
    "2": 35,
    "3": 50,
    "4": 4,
    "5": 6,
    "6": 40,
    "1,2": 12,
    "1,2,3,4,5,6": 63
  }
}
```

注意：

```text
動爻編號 1-6，1 為初爻，6 為上爻。
```

### 10.6 iching-engine.js 必須提供

```javascript
getHexagramByBinary(binary)
getChangedHexagram(hexagramId, movingLines)
getNuclearHexagram(hexagramId)
getOppositeHexagram(hexagramId)
getReverseHexagram(hexagramId)
deriveHourHexagram(date, hourBranch, userBazi)
personalizeHexagramByElement(hexagram, dayMasterElement)
```

### 10.7 每時辰卦象生成規則

第一版可採用固定可驗證公式：

```text
以日期干支序號 + 時辰地支序號 + 使用者日主序號 推出本時辰卦象。
```

範例：

```text
hexagramIndex = ((dayGanzhiIndex + hourBranchIndex + dayMasterStemIndex) % 64) + 1
movingLine = ((hourBranchIndex + dayGanzhiIndex) % 6) + 1
```

重點：

```text
公式必須固定
必須寫在 README
不得隨機
不得每次結果不同
```

未來可以替換更傳統的起卦法，但第一版必須可重現。

---

## 11. 奇門遁甲時家盤規格

### 11.1 重要聲明

奇門遁甲流派很多。

第一版必須採用固定規則，不可混用。

README 必須寫：

```text
本系統採固定時家奇門規則。奇門遁甲存在拆補、置閏、茅山、陰盤、陽盤等不同流派，本系統第一版以可驗證、可重現、可替換為優先。
```

### 11.2 qimen/palaces.json

九宮：

```json
{
  "1": {
    "name": "坎一宮",
    "element": "water",
    "direction": "北",
    "trigram": "坎"
  },
  "2": {
    "name": "坤二宮",
    "element": "earth",
    "direction": "西南",
    "trigram": "坤"
  }
}
```

必須完整 1-9 宮。

### 11.3 qimen/doors.json

八門：

```json
{
  "休門": {
    "level": "吉",
    "score": 12,
    "element": "water",
    "keywords": ["休息", "修復", "和解", "等待"],
    "suitable": ["休養", "談和", "修復關係", "等待消息"],
    "avoid": ["強攻", "躁進"],
    "summary": "適合修復、協調與穩定關係。"
  },
  "生門": {
    "level": "大吉",
    "score": 18,
    "element": "earth",
    "keywords": ["生機", "財務", "機會", "成長"],
    "suitable": ["求財", "談生意", "啟動計畫", "拜訪"],
    "avoid": ["貪快", "過度承諾"],
    "summary": "有利於成長、交易與資源累積。"
  }
}
```

必須完整八門：

```text
休 生 傷 杜 景 死 驚 開
```

### 11.4 qimen/stars.json

九星：

```text
天蓬
天任
天沖
天輔
天英
天芮
天柱
天心
天禽
```

每星包含：

```text
level
score
element
keywords
suitable
avoid
summary
```

### 11.5 qimen/gods.json

八神：

```text
值符
騰蛇
太陰
六合
白虎
玄武
九地
九天
```

每神包含：

```text
level
score
keywords
eventTone
summary
```

### 11.6 qimen/yin-yang-dun.json

定義陰遁陽遁。

基本規則：

```text
冬至後用陽遁
夏至後用陰遁
```

若使用更細規則，必須寫明。

### 11.7 qimen/ju-rules.json

局數規則。

必須根據節氣與三元決定局數。

資料結構：

```json
{
  "冬至": {
    "upper": 1,
    "middle": 7,
    "lower": 4,
    "dun": "yang"
  }
}
```

每個節氣都要有上中下三元局數。

### 11.8 qimen-engine.js 必須提供

```javascript
calculateQimenHourChart(date, hourBranch)
getSolarTermForQimen(date)
getYinYangDun(date)
getJuNumber(date)
getXunShou(dayGanzhi, hourGanzhi)
getZhiFu(chart)
getZhiShi(chart)
arrangePalaces(dun, ju)
arrangeDoors(chart)
arrangeStars(chart)
arrangeGods(chart)
detectQimenPatterns(chart)
summarizeQimen(chart)
```

### 11.9 奇門結果資料

每個時辰奇門結果：

```json
{
  "yinYangDun": "陽遁",
  "ju": 6,
  "solarTerm": "芒種",
  "yuan": "上元",
  "xunshou": "甲子",
  "zhifu": "天蓬",
  "zhishi": "休門",
  "mainPalace": 1,
  "door": "休門",
  "star": "天蓬",
  "god": "值符",
  "patterns": ["伏吟"],
  "score": 12,
  "summary": "此時適合保守、等待與修復，不宜強攻。"
}
```

### 11.10 主要宮位選取

因使用者不是問特定方位，今日 / 明日 24 時辰主軸採：

```text
以值使門所在宮為主要判斷宮。
```

若未來加入問題類型，可依問題取用神。

---

## 12. 計分系統

### 12.1 總分

每個時辰初始分數：

```text
50
```

加權來源：

```text
八字：最多 ±25
易經：最多 ±20
奇門：最多 ±35
平衡修正：最多 ±10
```

總分限制：

```text
0-100
```

### 12.2 分數合成

```javascript
score = 50
score += baziScore
score += ichingScore
score += qimenScore
score += balanceScore
score = Math.max(0, Math.min(100, score))
```

### 12.3 八字分數

八字分數來源：

```text
時干對日主十神
時支五行對日主五行
流日與本命地支刑沖合害
出生時間有無
```

範例：

```json
{
  "十神": {
    "正官": 8,
    "七殺": -6,
    "正財": 8,
    "偏財": 6,
    "食神": 6,
    "傷官": -4,
    "正印": 5,
    "偏印": 2,
    "比肩": 1,
    "劫財": -3
  }
}
```

### 12.4 易經分數

依卦象 keywords 與變卦趨勢。

例如：

```json
{
  "hexagramKeywords": {
    "開創": 8,
    "完成": 8,
    "合作": 6,
    "等待": 0,
    "阻滯": -8,
    "衝突": -10,
    "危險": -12
  }
}
```

### 12.5 奇門分數

奇門權重最高。

來源：

```text
八門分數
九星分數
八神分數
格局分數
伏吟 / 反吟 / 空亡 / 門迫 / 擊刑
```

範例：

```json
{
  "doors": {
    "生門": 18,
    "開門": 16,
    "休門": 12,
    "景門": 6,
    "杜門": -4,
    "傷門": -8,
    "驚門": -10,
    "死門": -16
  },
  "patterns": {
    "伏吟": -10,
    "反吟": -14,
    "空亡": -8,
    "門迫": -6,
    "擊刑": -8,
    "入墓": -6
  }
}
```

---

## 13. 今日 + 明日 24 時辰結果

### 13.1 時辰清單

每天 12 時辰：

```text
子時 23:00-00:59
丑時 01:00-02:59
寅時 03:00-04:59
卯時 05:00-06:59
辰時 07:00-08:59
巳時 09:00-10:59
午時 11:00-12:59
未時 13:00-14:59
申時 15:00-16:59
酉時 17:00-18:59
戌時 19:00-20:59
亥時 21:00-22:59
```

### 13.2 每個時辰必要輸出

```json
{
  "date": "2026-06-01",
  "hourBranch": "午",
  "hourName": "午時",
  "timeRange": "11:00-12:59",
  "score": 82,
  "level": "吉",
  "headline": "適合推進合作與確認條件",
  "possibleEvents": [],
  "suitable": [],
  "avoid": [],
  "advice": "",
  "systems": {
    "bazi": {},
    "iching": {},
    "qimen": {}
  },
  "trace": []
}
```

### 13.3 trace 必須可追溯

每個結果都要有 trace。

```json
"trace": [
  {
    "system": "bazi",
    "rule": "hourTenGod",
    "value": "偏財",
    "score": 6,
    "reason": "時干對日主形成偏財，代表資源與交易機會。"
  },
  {
    "system": "qimen",
    "rule": "door",
    "value": "生門",
    "score": 18,
    "reason": "生門主生機、財務、成長。"
  }
]
```

這是專業版的關鍵。

---

## 14. 接下來 14 天概述

### 14.1 14 天不是主軸

14 天只是概述，不能比今日 + 明日還詳細。

### 14.2 每天輸出

```json
{
  "date": "2026-06-02",
  "weekday": "二",
  "score": 74,
  "level": "吉",
  "theme": "適合整理資源與溝通安排",
  "bestHours": ["巳時", "午時", "申時"],
  "riskHours": ["子時", "戌時"],
  "advice": "可安排重要溝通，但避免太晚做決定。"
}
```

### 14.3 UI

14 天概述用小卡片。

每張只顯示：

```text
日期
星期
分數
吉凶
一句主題
最佳時辰
風險時辰
```

點擊才展開簡要說明。

---

## 15. 解釋模板系統

### 15.1 interpretation-engine.js

不要在 JS 裡硬寫長文。

所有文案都從 JSON 模板取。

```javascript
buildHourReading(context)
mergeSystemSummaries(bazi, iching, qimen)
selectPossibleEvents(context)
selectAdvice(context)
selectWarnings(context)
```

### 15.2 event-templates.json

```json
{
  "wealth_opportunity": {
    "conditions": ["tenGod:偏財", "door:生門"],
    "events": [
      "容易遇到資源、交易、邀約或金錢相關訊息。",
      "適合談合作、確認條件或整理收益安排。"
    ]
  }
}
```

### 15.3 advice-templates.json

```json
{
  "contract_clear": {
    "conditions": ["tenGod:偏財", "risk:not_high"],
    "advice": "可以主動處理合作與財務事項，但條件要寫清楚，不要只靠口頭承諾。"
  }
}
```

### 15.4 risk-templates.json

```json
{
  "conflict_risk": {
    "conditions": ["door:驚門", "tenGod:七殺"],
    "warning": "此時容易因壓力、誤會或急躁而引發衝突，重要決策宜延後。"
  }
}
```

---

## 16. 隱私規格

### 16.1 privacy.js

必須提供：

```javascript
shouldRememberUser()
saveUserProfile(profile)
loadUserProfile()
clearUserProfile()
isProfileStored()
```

### 16.2 預設行為

預設不存。

使用者按下開始推算時：

```text
資料只留在記憶體
重新整理後消失
```

### 16.3 勾選記住

只有勾選：

```text
記住我的生日與出生時間，僅儲存在本裝置
```

才存 localStorage。

localStorage key：

```text
fortunePwaUserProfile
```

清除資料按鈕必須刪除 localStorage。

---

## 17. 測試要求

### 17.1 八字測試

tests/bazi-tests.json：

```json
[
  {
    "birthDate": "1983-06-21",
    "birthTime": "12:00",
    "expected": {
      "hasYearPillar": true,
      "hasMonthPillar": true,
      "hasDayPillar": true,
      "hasHourPillar": true
    }
  }
]
```

注意：如果尚未確認正確柱，先測結構，不要偽造精準結果。

### 17.2 易經測試

必測：

```text
64 卦數量 = 64
384 爻數量 = 384
每卦有互卦
每卦有錯卦
每卦有綜卦
change-map 每卦至少 64 種變化
```

### 17.3 奇門測試

必測：

```text
每個時辰可產生 chart
chart 有陰陽遁
chart 有局數
chart 有值符
chart 有值使
chart 有門星神
```

如果奇門規則尚未人工校驗，必須在測試報告標示：

```text
STRUCTURE PASS / TRADITIONAL RULE ACCURACY NEEDS REVIEW
```

### 17.4 隱私測試

必測：

```text
未勾選記住，不寫 localStorage
勾選記住，才寫 localStorage
清除資料會刪除 localStorage
standalone PWA 下正常
```

### 17.5 PWA 測試

必測：

```text
Manifest 可讀
Service Worker 註冊成功
Cache Storage 有資料
離線可開首頁
離線可讀 JSON
Android Chrome 可加入主畫面
iOS Safari 可加入主畫面
```

---

## 18. README 必須寫清楚

README.md 必須包含：

```text
專案介紹
系統架構
不存個資說明
JSON 資料結構
八字引擎說明
易經引擎說明
奇門引擎說明
分數規則
PWA 測試方式
已知限制
未來待校驗項目
```

### 18.1 已知限制一定要寫

```text
八字流派對子時換日可能不同
月柱節氣切換需依 solar-terms.json 校驗
奇門遁甲流派繁多，本系統採固定時家奇門規則
命術結果屬民俗文化參考
本工具不保存個資，但若使用者勾選記住，資料會存在本機 localStorage
```

---

## 19. AI 施工順序

請嚴格按順序施工。

```text
1. 建立資料夾結構
2. 建立 core JSON
3. 建立 bazi JSON
4. 建立 iching JSON
5. 建立 qimen JSON
6. 建立 interpretation JSON
7. 建立 JS engines
8. 建立測試 JSON
9. 建立首頁 UI
10. 建立結果 UI
11. 建立 PWA
12. 建立 README
13. 跑測試
14. 回報未校驗項目
```

不要先做 UI 再補規則。  
先規則，後畫面。

---

## 20. 給 coding AI 的完整任務描述

請直接把下面這段給 coding AI 使用：

```text
請依照本規格製作一個專業版純前端命術規則引擎 PWA，名稱為「時運知錄」。

重點：
1. 使用者進入首頁後輸入西元生日，出生時間選填。
2. 預設不儲存客戶資料。
3. 所有生日與出生時間只在瀏覽器記憶體中計算。
4. 若使用者勾選「記住我的生日與出生時間，僅儲存在本裝置」，才可寫入 localStorage。
5. 不使用後端。
6. 不使用伺服器資料庫。
7. 正式執行時不呼叫 LLM API。
8. 所有規則用 JSON 檔儲存。
9. 所有推算由前端 JavaScript 完成。
10. 可安裝成 PWA，並可離線使用。

視覺：
1. 米色底。
2. 中國風。
3. 專業、乾淨、好看。
4. 手機優先 RWD。
5. 不要做成廉價算命網站。
6. 今日與明日 24 時辰是主軸。
7. 接下來 14 天是概述。

命術系統：
1. 八字
2. 五行
3. 十神
4. 易經 64 卦
5. 變卦 / 互卦 / 錯卦 / 綜卦
6. 奇門遁甲時家盤

結果：
1. 先顯示個人基本盤摘要。
2. 顯示今日總覽。
3. 顯示今日 12 時辰。
4. 顯示明日總覽。
5. 顯示明日 12 時辰。
6. 顯示接下來 14 天概述。
7. 每個時辰需包含分數、吉凶、可能事件、適合事項、避免事項與一句建議。
8. 每個時辰需可展開看八字、易經、奇門詳細推算。
9. 每個結果需有 trace，能追溯分數來源。

資料夾結構請依規格建立：
/data/core
/data/bazi
/data/iching
/data/qimen
/data/calendar/YYYY/MM.json
/data/interpretation
/js/engines
/js/ui
/css
/icons
/tests

請先建立規則資料與引擎，再做 UI。
請不要用隨機結果。
請不要用 LLM 即時生成結果。
請不要保存個資。
請完成後回報：
1. 檔案結構
2. JSON 檔案用途
3. JS 引擎用途
4. PWA 設定
5. 測試方式
6. 尚未人工校驗的命術規則
```

---

## 21. 完成標準

一個合格版本必須達到：

```text
1. 首頁可輸入生日
2. 出生時間可選填
3. 不輸入時間也能推算，但標示三柱估算
4. 輸入時間可排四柱
5. 今日 12 時辰可顯示
6. 明日 12 時辰可顯示
7. 14 天概述可顯示
8. 每時辰有八字、易經、奇門來源
9. 每時辰有分數與吉凶
10. 每時辰有可能事件與建議
11. 不存客戶資料
12. 可安裝 PWA
13. 可離線開啟
14. README 說明清楚
15. 測試資料存在
```

---

## 22. 最重要提醒

此專案最容易失敗的地方不是畫面，而是規則亂掉。

所以施工時務必遵守：

```text
資料先行
規則可查
計算可測
結果可追溯
文案不亂掰
個資不保存
```

做不到 trace，就不算專業版。
