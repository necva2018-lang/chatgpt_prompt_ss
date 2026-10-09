# 指令所 · Prompt Atelier

以卡片搜尋、瀏覽與複製指令的靜態網站。目前整理 844 筆來源記錄：202 筆文字成果、642 筆圖片成果。兩種類型分開分類，支援關鍵字、使用場景、完成目標與收藏。

## 快速啟動

安裝 Node.js 22 或更新版本。在專案根目錄執行：

```sh
npm start
```

開啟 http://127.0.0.1:4173 。專案沒有第三方執行依賴，不需要先執行 npm install，也不需要資料庫服務。

## 專案結構

```text
Data Pool/               原始蒐集文件，保留來源
database/                完整 JSON 資料庫、結構定義與驗證工具
website/
  dist/                  可直接部署的網站
    data/library.json    由完整資料庫產生的前端資料
  tests/                 查詢與資料邏輯測試
  sync-data.cjs          同步資料庫到網站
  server.cjs             本機預覽伺服器
docs/                    維護、部署與來源說明
  screenshots/           開發過程的預覽圖
scripts/
  export-github.cjs      匯出乾淨的 GitHub 專案資料夾
  archive/               一次性歷史修改腳本
.github/workflows/       GitHub 自動檢查
artifacts/               舊部署包及匯出結果，不納入 Git
```

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm start` | 本機預覽 |
| `npm run build` | 將完整資料庫同步成網站資料 |
| `npm run validate:data` | 驗證資料格式與關聯 |
| `npm test` | 執行查詢器測試 |
| `npm run check` | 執行資料驗證及測試 |
| `npm run export:github` | 匯出排除 Git 記錄、部署暫存及本站 hosting 設定的完整專案 |

「複製指令」只複製指令代碼，例如 `/insideview`；「複製提示詞」複製完整提示詞及填入的變數。

圖片案例尚待生成與上傳；資料已保留封面、參考圖、成果圖與相簿連結欄位。場景、目標與案例也保留獨立資料檔，可逐步擴充。

詳細資料規則見 [database/README.md](database/README.md)，日常維護見 [docs/MAINTENANCE.md](docs/MAINTENANCE.md)，GitHub 與部署操作見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。原始資料的權利與來源說明見 [docs/SOURCES.md](docs/SOURCES.md)。

已包含 GitHub Pages 手動部署流程。上傳後，將 Settings → Pages 的來源設為 GitHub Actions，再執行 Actions → Deploy to GitHub Pages → Run workflow。
