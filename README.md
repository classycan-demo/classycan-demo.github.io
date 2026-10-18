# CLASSyCAN Demo (粵講粵識)

沉浸式、互動型的廣東話與香港文化學習平台。透過茶樓實境探索、道地生活對話、粵拼發音與點心紙互動，輕鬆學會道地香港粵語。

## 🌟 特色功能 (Features)

- **茶樓實境探索**：沉浸式茶樓場景探索點心、茶具與文化用語。
- **互動點心紙 (Dim Sum Ordering)**：模擬香港茶樓劃點心紙體驗。
- **道地粵音發音**：點擊字詞或點心即時播放純正粵語音訊（含 Jyutping 標註）。
- **實用語境對話**：侍應交流、落單、搭檯、加水、埋單等實用情境。
- **隨堂互動測驗**：針對詞彙與點心特徵進行即時測驗。

## 📁 專案結構 (Project Structure)

```text
classycan_demo/
├── index.html              # 主頁面
├── src/
│   ├── css/
│   │   ├── style.css       # 核心樣式與排版
│   │   └── components.css  # 互動組件與彈窗樣式
│   ├── js/
│   │   ├── main.js         # 主應用邏輯與事件綁定
│   │   ├── audio.js        # 音訊播放控制器
│   │   ├── data.js         # 學習模組資料處理
│   │   └── quiz.js         # 測驗與問答邏輯
│   └── data/
│       └── unit1.json      # 第一課：飲茶文化結構化數據
├── public/
│   └── unit1/
│       ├── audio/          # 粵語語音檔 (.mp3 / .m4a)
│       └── image/          # 介面圖示、點心相片及背景圖
├── docs/                   # 課程筆記與參考文檔
├── .gitignore              # Git 忽略設定
└── README.md
```

## 🚀 本地快速啟動 (Getting Started)

由於瀏覽器安全性限制（CORS / Fetch 本地 JSON），建議使用簡易本機 HTTP 伺服器開啟：

### 使用 Python (內建)
```bash
# Python 3
python3 -m http.server 8000
```
開啟瀏覽器訪問：[http://localhost:8000](http://localhost:8000)

### 使用 VS Code Live Server
在 VS Code 中開啟此資料夾，右鍵點擊 `index.html` 選擇 **"Open with Live Server"**。

---
*Developed for CLASSyCAN Cantonese Learning Project.*
