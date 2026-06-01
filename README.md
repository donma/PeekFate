# 速窺運勢

八字 × 易經 × 奇門遁甲，每日時辰推演工具

**線上體驗**：https://donma.github.io/PeekFate/

---

## 專案介紹

**速窺運勢**是一個純前端命術規則引擎 PWA，不儲存個資，可離線使用。

使用者進入網站後輸入西元生日，出生時間選填。系統直接在瀏覽器用 JSON 規則資料庫與 JavaScript 推算，輸出今日與明日每個時辰的吉凶、可能事件、適合事項、避免事項與白話建議，並提供接下來 14 天的每日概述。

### 核心價值

- 不登入
- 不上傳生日
- 不保存個資
- 可離線使用
- 可安裝到手機主畫面
- 所有結果由規則推算
- 每個判斷可追溯來源
- 今日 + 明日 24 時辰為主軸
- 接下來 14 天為輔助概述

---

## 技術架構

### 前端技術

- HTML5
- CSS3（RWD 響應式設計）
- JavaScript ES6+
- PWA（Progressive Web App）

### 命術系統

- **八字**：四柱推算、十神、地支關係
- **五行**：相生相剋、元素屬性
- **易經 64 卦**：卦象、變卦、互卦、錯卦、綜卦
- **奇門遁甲時家盤**：九宮、八門、九星、八神

---

## 檔案結構

```
/
├── index.html              # 首頁
├── manifest.json           # PWA 清單
├── service-worker.js       # 服務工作者（離線支援）
├── README.md               # 專案說明
│
├── css/
│   └── app.css             # 主要樣式表
│
├── js/
│   ├── app.js              # 主程式
│   ├── app-optimized.js    # 優化後主程式
│   ├── main.js             # 入口文件
│   ├── privacy.js          # 隱私管理
│   ├── pwa-install.js      # PWA 安裝
│   ├── performance-monitor.js  # 性能監控
│   │
│   ├── engines/            # 命術引擎
│   │   ├── date-engine.js      # 日期引擎
│   │   ├── ganzhi-engine.js    # 干支引擎
│   │   ├── bazi-engine.js      # 八字引擎
│   │   ├── iching-engine.js    # 易經引擎
│   │   ├── qimen-engine.js     # 奇門遁甲引擎
│   │   ├── scoring-engine.js   # 計分引擎
│   │   └── interpretation-engine.js  # 解釋引擎
│   │
│   └── ui/                 # UI 渲染
│       ├── form-controller.js      # 表單控制
│       ├── result-renderer.js      # 結果渲染
│       ├── hour-card-renderer.js   # 時辰卡片渲染
│       └── fourteen-day-renderer.js # 14天渲染
│
├── data/                   # JSON 規則資料庫
│   ├── core/               # 核心資料
│   ├── bazi/               # 八字資料
│   ├── iching/             # 易經資料
│   ├── qimen/              # 奇門遁甲資料
│   └── interpretation/     # 解釋模板
│
├── icons/                  # PWA 圖標
└── tests/                  # 測試資料
```

---

## 功能特色

### 1. 自動儲存

輸入過的生日資料會自動儲存在 localStorage，下次開啟自動載入並推算。

### 2. 時辰趨勢圖

今日/明日時辰以長條圖顯示，一眼看出運勢高低。

### 3. 環形分數圖

今日/明日總覽以環形圖顯示平均分數。

### 4. 14 天趨勢圖

接下來 14 天以連續長條圖顯示運勢趨勢。

### 5. 白話解釋

所有計分來源都以白話文顯示，用戶看得懂。

### 6. 收合表單

推算完成後表單自動收合，直接顯示結果。

---

## 計分規則

### 總分計算

```
總分 = 基礎分數(60) + 八字分數 + 易經分數 + 奇門分數 + 平衡分數
```

### 分數範圍

| 來源 | 範圍 |
|------|------|
| 基礎分數 | 60 |
| 八字 | ±25 |
| 易經 | ±20 |
| 奇門 | ±35 |
| 平衡 | ±10 |

### 吉凶等級

| 分數 | 等級 | 說明 |
|------|------|------|
| 85-100 | 大吉 | 諸事順遂，大吉大利 |
| 70-84 | 吉 | 順利吉祥，宜積極行動 |
| 55-69 | 小吉 | 較為順利，可適度進取 |
| 45-54 | 平 | 平穩無波，維持現狀為宜 |
| 30-44 | 小凶 | 略有阻礙，謹慎行事 |
| 0-29 | 凶 | 諸事不順，宜靜不宜動 |

---

## PWA 安裝

### Android Chrome

1. 開啟網站
2. 點擊「安裝到桌面」按鈕
3. 確認安裝

### iOS Safari

1. 開啟網站
2. 點擊分享按鈕
3. 選擇「加入主畫面」

---

## 本地開發

### 啟動方式

使用任何 HTTP 伺服器開啟 `index.html`：

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js
npx serve .

# 使用 VS Code Live Server
# 右鍵 index.html → Open with Live Server
```

### 部署到 GitHub Pages

1. 上傳檔案到 GitHub
2. 前往 Settings → Pages
3. 選擇 main 分支
4. 訪問 https://donma.github.io/PeekFate/

---

## 已知限制

### 八字流派

- 子時換日可能不同
- 月柱節氣切換需依 solar-terms.json 校驗

### 奇門遁甲

- 流派繁多，本系統採固定時家奇門規則

### 命術結果

- 屬民俗文化參考
- 不作為醫療、法律、投資、婚姻或人生重大決策保證

---

## 免責聲明

本工具依傳統命術規則推算，內容屬民俗文化與個人參考，不作為醫療、法律、投資、婚姻或人生重大決策保證。

---

## 授權條款

MIT License

---

## 關於

**速窺運勢** - 純前端命術規則引擎 PWA

開發：[當麻實驗室](https://donmalab.com)

GitHub：https://github.com/donma/PeekFate