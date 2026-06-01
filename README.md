# 速窺運勢

八字 × 易經 × 奇門遁甲，每日時辰推演工具

---

## 專案介紹

**速窺運勢**是一個純前端命術規則引擎 PWA，不儲存個資，可離線使用。

使用者進入網站後輸入西元生日，出生時間選填。系統不儲存客戶資料，直接在瀏覽器用 JSON 規則資料庫與 JavaScript 推算，輸出今日與明日每個時辰的吉凶、可能事件、適合事項、避免事項與白話建議，並提供接下來 14 天的每日概述。

### 核心價值

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

## 系統架構

### 前端技術

- HTML5
- CSS3
- JavaScript (ES6+)
- PWA (Progressive Web App)

### 命術系統

- **八字**：四柱推算、十神、地支關係
- **易經 64 卦**：卦象、變卦、互卦、錯卦、綜卦
- **奇門遁甲時家盤**：九宮、八門、九星、八神

### 檔案結構

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
        01.json ~ 12.json

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

## 不存個資說明

### 預設行為

本工具不儲存任何個人資料，所有計算都在瀏覽器中進行。

- 資料只留在記憶體
- 重新整理後消失
- 不使用後端
- 不使用伺服器資料庫
- 正式執行時不呼叫 LLM API

### 可選功能

只有使用者明確勾選「記住我的生日與出生時間，僅儲存在本裝置」時，才允許寫入 localStorage。

- localStorage key：`fortunePwaUserProfile`
- 清除資料按鈕會刪除 localStorage
- 未勾選記住，不寫 localStorage

### 免責聲明

所有頁面底部或結果頁顯示：

> 本工具依傳統命術規則推算，內容屬民俗文化與個人參考，不作為醫療、法律、投資、婚姻或人生重大決策保證。

---

## JSON 資料結構

### 核心資料 (/data/core)

| 檔案 | 用途 |
|------|------|
| stems.json | 天干資料（甲乙丙丁戊己庚辛壬癸） |
| branches.json | 地支資料（子丑寅卯辰巳午未申酉戌亥） |
| elements.json | 五行規則（相生相剋） |
| ganzhi-60.json | 六十甲子（完整 60 組） |
| twelve-hours.json | 十二時辰（含跨日子時） |
| solar-terms.json | 節氣資料 |

### 八字資料 (/data/bazi)

| 檔案 | 用途 |
|------|------|
| ten-gods.json | 十神定義（10 天干 × 10 天干） |
| hidden-stems.json | 地支藏干 |
| branch-relations.json | 地支關係（刑沖合害） |
| nayin.json | 納音 |
| bazi-rules.json | 八字規則 |
| bazi-templates.json | 八字模板 |

### 易經資料 (/data/iching)

| 檔案 | 用途 |
|------|------|
| trigrams.json | 八卦資料（乾坤震巽坎離艮兌） |
| hexagrams.json | 64 卦資料 |
| lines.json | 384 爻資料 |
| hexagram-relations.json | 卦象關係（互卦、錯卦、綜卦） |
| change-map.json | 4096 變卦路徑 |
| iching-templates.json | 易經模板 |

### 奇門資料 (/data/qimen)

| 檔案 | 用途 |
|------|------|
| palaces.json | 九宮 |
| doors.json | 八門（休生傷杜景死驚開） |
| stars.json | 九星 |
| gods.json | 八神 |
| yin-yang-dun.json | 陰陽遁規則 |
| ju-rules.json | 局數規則 |
| xunshou.json | 旬首 |
| zhifu-zhishi.json | 值符值使 |
| qimen-patterns.json | 奇門格局 |
| qimen-templates.json | 奇門模板 |

---

## 八字引擎說明

### 主要功能

```javascript
calculateBazi(birthDate, birthTime)      // 計算八字
calculateYearPillar(date)                 // 計算年柱
calculateMonthPillar(date)                // 計算月柱（依節氣換月）
calculateDayPillar(date)                  // 計算日柱
calculateHourPillar(dayStem, birthTime)   // 計算時柱
getDayMaster(bazi)                        // 獲取日主
getTenGod(dayStem, targetStem)            // 獲取十神
getBranchRelations(branches)              // 獲取地支關係
```

### 日柱計算基準

- 基準日期：已知甲子日作為 epoch
- 換算公式：依日期差推算日柱
- 時區處理：使用本地時區

### 月柱節氣換月

月柱以節氣為界，不得用農曆月份硬算。立春、驚蟄、清明等節氣切換需依 solar-terms.json 校驗。

### 子時處理

- 採用晚子時 23:00-23:59 視為當日子時
- 結果中標記子時跨日可能存在派別差異
- `timeBoundaryNote`: "子時跨日規則依本系統設定，部分派別可能不同。"

### 出生時間未知

如果 birthTime 為 null，系統以三柱估算，結果標示：

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

---

## 易經引擎說明

### 主要功能

```javascript
getHexagramByBinary(binary)                    // 獲取卦象
getChangedHexagram(hexagramId, movingLines)    // 獲取變卦
getNuclearHexagram(hexagramId)                 // 獲取互卦
getOppositeHexagram(hexagramId)                // 獲取錯卦
getReverseHexagram(hexagramId)                 // 獲取綜卦
deriveHourHexagram(date, hourBranch, userBazi) // 推算時辰卦象
personalizeHexagramByElement(hexagram, dayMasterElement) // 個人化卦象
```

### 每時辰卦象生成規則

採用固定可驗證公式：

```text
hexagramIndex = ((dayGanzhiIndex + hourBranchIndex + dayMasterStemIndex) % 64) + 1
movingLine = ((hourBranchIndex + dayGanzhiIndex) % 6) + 1
```

特點：
- 公式固定
- 不得隨機
- 不得每次結果不同
- 可重現、可驗證

### 卦象結構

- binary：由下爻到上爻的順序，1 代表陽爻，0 代表陰爻
- 每卦包含：judgment（卦辭）、image（象辭）、keywords、summary

---

## 奇門引擎說明

### 主要功能

```javascript
calculateQimenHourChart(date, hourBranch)  // 計算時家盤
getSolarTermForQimen(date)                  // 獲取節氣
getYinYangDun(date)                         // 獲取陰陽遁
getJuNumber(date)                           // 獲取局數
getXunShou(dayGanzhi, hourGanzhi)           // 獲取旬首
getZhiFu(chart)                             // 獲取值符
getZhiShi(chart)                            // 獲取值使
arrangePalaces(dun, ju)                     // 排列九宮
arrangeDoors(chart)                         // 排列八門
arrangeStars(chart)                         // 排列九星
arrangeGods(chart)                          // 排列八神
detectQimenPatterns(chart)                  // 偵測格局
summarizeQimen(chart)                       // 奇門摘要
```

### 流派聲明

本系統採固定時家奇門規則。奇門遁甲存在拆補、置閏、茅山、陰盤、陽盤等不同流派，本系統第一版以可驗證、可重現、可替換為優先。

### 陰陽遁規則

- 冬至後用陽遁
- 夏至後用陰遁

### 局數規則

根據節氣與三元決定局數，每個節氣都有上中下三元局數。

### 主要宮位選取

以值使門所在宮為主要判斷宮。若未來加入問題類型，可依問題取用神。

---

## 分數規則

### 計分系統

每個時辰初始分數：**50 分**

加權來源：

| 來源 | 分數範圍 |
|------|----------|
| 八字 | 最多 ±25 分 |
| 易經 | 最多 ±20 分 |
| 奇門 | 最多 ±35 分 |
| 平衡修正 | 最多 ±10 分 |

總分限制：**0-100 分**

### 分數合成

```javascript
score = 50
score += baziScore
score += ichingScore
score += qimenScore
score += balanceScore
score = Math.max(0, Math.min(100, score))
```

### 吉凶等級

| 分數區間 | 等級 | 視覺顏色 |
|----------|------|----------|
| 85-100 | 大吉 | 深綠 |
| 70-84 | 吉 | 綠 |
| 55-69 | 小吉 | 青綠 |
| 45-54 | 平 | 棕金 |
| 30-44 | 小凶 | 橘紅 |
| 0-29 | 凶 | 深紅 |

### 八字分數來源

- 時干對日主十神
- 時支五行對日主五行
- 流日與本命地支刑沖合害
- 出生時間有無

### 易經分數來源

依卦象 keywords 與變卦趨勢。

### 奇門分數來源（權重最高）

- 八門分數
- 九星分數
- 八神分數
- 格局分數（伏吟、反吟、空亡、門迫、擊刑、入墓）

### Trace 追溯

每個結果都要有 trace，能追溯分數來源：

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

---

## PWA 測試方式

### 測試項目

| 測試項目 | 說明 |
|----------|------|
| Manifest 可讀 | manifest.json 格式正確 |
| Service Worker 註冊成功 | service-worker.js 正常運作 |
| Cache Storage 有資料 | 快取檔案存在 |
| 離線可開首頁 | 斷網後可開啟 |
| 離線可讀 JSON | 斷網後可讀取規則資料 |
| Android Chrome 可加入主畫面 | Android 安裝測試 |
| iOS Safari 可加入主畫面 | iOS 安裝測試 |

### 必要檔案

```text
manifest.json
service-worker.js
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

### Service Worker 策略

- HTML：network first，失敗回 cache
- CSS / JS / JSON / icons：stale while revalidate
- 非 GET request：不處理
- 外站資源：不快取

### 安裝提示規則

1. 只有 beforeinstallprompt 觸發時顯示
2. 使用者點擊才 prompt
3. 關閉後 7 天內不再顯示
4. 已 standalone 時不顯示
5. iOS 顯示小提示：可使用 Safari 分享按鈕加入主畫面

---

## 已知限制

### 八字流派

- 子時換日可能不同
- 月柱節氣切換需依 solar-terms.json 校驗
- 目前月柱節氣切換規則尚需人工校驗

### 奇門遁甲

- 流派繁多，本系統採固定時家奇門規則
- 拆補、置閏、茅山、陰盤、陽盤等不同流派規則各異

### 命術結果

- 屬民俗文化參考
- 不作為醫療、法律、投資、婚姻或人生重大決策保證

### 個資保存

- 本工具不保存個資
- 若使用者勾選「記住」，資料會存在本機 localStorage
- 清除資料按鈕會刪除 localStorage

---

## 未來待校驗項目

### 八字

- 月柱節氣切換規則
- 子時換日規則
- 地支刑沖合害規則

### 奇門遁甲

- 局數規則
- 值符值使規則
- 格局判斷
- 陰陽遁切換規則

### 易經

- 卦象解釋
- 爻辭解釋
- 變卦規則

---

## 測試方式

### 執行測試

1. 開啟瀏覽器開發者工具
2. 執行測試腳本
3. 檢查測試結果

### 測試案例

| 測試類型 | 數量 | 檔案 |
|----------|------|------|
| 八字測試 | 25 個案例 | tests/bazi-tests.json |
| 易經測試 | 100 個案例 | tests/iching-tests.json |
| 奇門測試 | 35 個案例 | tests/qimen-tests.json |
| 整合測試 | 20 個案例 | tests/integration-tests.json |

### 八字測試

必測項目：
- 年柱計算
- 月柱計算（依節氣）
- 日柱計算
- 時柱計算
- 十神計算
- 地支關係

### 易經測試

必測項目：
- 64 卦數量 = 64
- 384 爻數量 = 384
- 每卦有互卦
- 每卦有錯卦
- 每卦有綜卦
- change-map 每卦至少 64 種變化

### 奇門測試

必測項目：
- 每個時辰可產生 chart
- chart 有陰陽遁
- chart 有局數
- chart 有值符
- chart 有值使
- chart 有門星神

注意：若奇門規則尚未人工校驗，測試報告標示：STRUCTURE PASS / TRADITIONAL RULE ACCURACY NEEDS REVIEW

### 隱私測試

必測項目：
- 未勾選記住，不寫 localStorage
- 勾選記住，才寫 localStorage
- 清除資料會刪除 localStorage
- standalone PWA 下正常

---

## 部署方式

### 本地測試

1. 使用 HTTP 伺服器（如 VS Code Live Server）
2. 開啟 index.html
3. 測試功能

### 部署到 GitHub Pages

1. 上傳檔案到 GitHub
2. 啟用 GitHub Pages
3. 訪問網址

### 部署到其他靜態站台

支援任何靜態站台：
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

---

## 開發工具

### 前端

- HTML5
- CSS3
- JavaScript (ES6+)

### 工具

- Visual Studio Code
- Git

### 測試

- 瀏覽器開發者工具
- 手動測試

---

## 授權條款

MIT License

---

## 更新日誌

### v1.0.0

- 初始版本
- 完成八字、易經、奇門引擎
- 完成 PWA 設置
- 完成 UI 開發
- 完成測試資料

---

## 一句話總結

> 資料先行、規則可查、計算可測、結果可追溯、文案不亂掰、個資不保存。
