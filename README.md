# 速窺運勢

八字 × 易經 × 奇門遁甲 — 每日時辰推演工具

## 線上展示

https://donma.github.io/PeekFate/

---

## 專案簡介

速窺運勢是一個純前端 PWA 命理規則引擎工具。所有推算在瀏覽器端完成，不依賴後端服務，不上傳使用者資料。

系統整合三套傳統命術：

- **八字**：四柱推算、十神、地支關係、藏干、納音、大運、神煞、用神喜忌
- **易經**：六十四卦象、變卦、五行個人化
- **奇門遁甲**：時家奇門盤、八門、九星、八神

使用者輸入西元生日與出生時間，系統推算今日與明日每個時辰的吉凶，並提供 14 天每日概述。

---

## 功能特色

- 今日 + 明日 24 時辰獨立計分，附白話解釋
- 接下來 14 天每日運勢概述與趨勢圖
- 事件類型專用計分（就職、金牌、結婚、逝世、封殺等 22 種子類型）
- 河圖幸運數字（依喜用神五行推算）
- 性別選填，自動推算大運
- 節氣資料涵蓋 1900–2100 年
- 可離線使用，可安裝至手機桌面
- 所有計分來源可追溯

---

## 專案結構

```
/
├── index.html                    # 首頁
├── manifest.json                 # PWA 清單
├── service-worker.js             # 離線快取
├── favicon.png / favicon.ico
├── verification-report.html      # 歷史事件回測報告
│
├── css/
│   └── app.css
│
├── js/
│   ├── main.js                   # 入口
│   ├── app-optimized.js          # 主程式
│   ├── performance-monitor.js
│   ├── pwa-install.js
│   │
│   └── engines/
│       ├── date-engine.js        # 日期引擎
│       ├── ganzhi-engine.js      # 干支引擎
│       ├── bazi-engine.js        # 八字引擎
│       ├── iching-engine.js      # 易經引擎
│       ├── qimen-engine.js       # 奇門遁甲引擎
│       ├── scoring-engine.js     # 計分引擎
│       └── interpretation-engine.js
│
├── data/
│   ├── core/                     # 節氣等核心資料
│   ├── bazi/                     # 八字規則
│   ├── iching/                   # 易經規則
│   ├── qimen/                    # 奇門遁甲規則
│   ├── interpretation/           # 解釋模板
│   └── celebrities/              # 回測名人與事件資料
│
├── tests/
│   ├── bazi-tests.json
│   ├── iching-tests.json
│   ├── qimen-tests.json
│   └── integration-tests.json
│
├── docs/
│   ├── verification-method.md    # 驗證方法說明
│   ├── trick.md                  # 優化方法論
│   └── accuracy-optimization-guide.md
│
├── test-validation.html          # 瀏覽器端測試頁面
├── test-local.js                 # 本地測試腳本
│
├── icons/                        # PWA 圖標
└── CHANGELOG.md
```

---

## 快速開始

### 瀏覽器直接開啟

使用任何 HTTP 伺服器開啟 `index.html`：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# VS Code Live Server
# 右鍵 index.html → Open with Live Server
```

### 安裝為 PWA

**Android Chrome**：開啟網站 → 點擊「安裝到桌面」

**iOS Safari**：開啟網站 → 分享按鈕 →「加入主畫面」

### 部署至 GitHub Pages

1. 上傳至 GitHub
2. Settings → Pages → 選擇 main 分支
3. 訪問 `https://<username>.github.io/<repo>/`

---

## 測試方式

本專案使用 JSON 測試資料進行規則檢查。

### 測試資料

| 檔案 | 內容 |
|------|------|
| `tests/bazi-tests.json` | 八字引擎測試案例 |
| `tests/iching-tests.json` | 易經引擎測試案例 |
| `tests/qimen-tests.json` | 奇門遁甲引擎測試案例 |
| `tests/integration-tests.json` | 整合測試案例 |

### 執行方式

1. **瀏覽器端**：開啟 `test-validation.html`，自動載入引擎並執行測試
2. **本地腳本**：執行 `test-local.js`（需 Node.js 環境）
3. **手動檢查**：確認各命術模組能正確載入 JSON 資料並產出結果

---

## 驗證報告

本專案包含一份歷史事件回測報告（`verification-report.html`），用於評估計分引擎對已知歷史事件的分類能力。

### 回測規模

- **252 位華人名人**（政治、演藝、體育、企業、科學、文學等）
- **231 筆已知事件**（就職、金牌、結婚、逝世、入獄、醜聞、封殺等）
- **回測通過率：94%**

### 通過條件

- 正向事件（就職、金牌等）：分數 ≥ 45
- 負向事件（逝世、逮捕等）：分數 ≤ 52
- 中性事件（退休等）：分數 45–60

### 聲明

本報告屬於歷史事件回測，用於檢查規則引擎是否能對已知事件產生合理分數區間。結果不可解讀為未來事件預測準確率，也不代表科學驗證結論。

詳細方法說明見 `docs/verification-method.md`。

---

## 版本說明

| 項目 | 版本 |
|------|------|
| App Version | v108 |
| Rule Version | v108 |
| Verification Report | v108 |
| Data Version | 2026-06-02 |

版本紀錄見 `CHANGELOG.md`。

---

## 隱私說明

- 不登入、不上傳生日、不保存個資
- 所有推算在瀏覽器端完成
- 歷史事件資料僅用於回測，不涉及使用者輸入
- 可離線使用，無需網路連線

---

## 資料與限制

- 本專案使用本地 JSON 資料，不會上傳任何使用者資訊
- 節氣資料使用天文演算覆蓋 1900–2100 年，偶有 ±1 日誤差（影響月柱邊界日出生者）
- 子時跨日規則固定為 23:00 換日
- 奇門遁甲流派繁多，本系統採固定時家奇門規則
- 性別為選填，未填則不推算大運
- 歷史事件回測資料用於檢查規則引擎行為，不代表未來預測能力
- 目前尚未建立 holdout dataset，回測結果僅代表對現有資料集的通過率
- 部分事件分類受人工規則影響，可能存在標註偏差
- 屬民俗文化參考，不作為醫療、法律、投資、婚姻或人生重大決策依據

---

## License

MIT License

---

## 關於

開發：[當麻實驗室](https://donmalab.com)

GitHub：https://github.com/donma/PeekFate
