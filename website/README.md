# 指令所

以靜態 HTML、CSS、JavaScript 和 JSON 建置的卡片查詢器；沒有資料庫服務、登入系統或付費外部套件。

## 已有功能

- 202 筆文字成果、642 筆圖片成果嚴格分開。
- 中文用途、英文代碼與提示內容搜尋。
- 內容分類、使用場景與完成目標卡片。
- 完整提示詞詳情、來源版本、提示欄位替換及複製。
- 收藏存於使用者的瀏覽器，不跨裝置同步。
- 分批載入卡片與手機版排版。
- 案例展示介面，現階段案例資料為空，不展示虛構成果。
- 讀取已預留的 `image_links` 圖片網址。

## 資料維護

主資料仍在專案的 `database`。更新後執行：

```powershell
node website/sync-data.cjs
node --test website/tests/library.test.mjs
```

`sync-data.cjs` 只產生網站讀取的精簡資料 `dist/data/library.json`，不修改原始資料庫。原文摘錄與資料整理工具不發布至網站。

網站第一版提供 7 個使用場景、8 個完成目標。因資料庫尚未人工標註，目前依來源分類與代碼建立**編輯分類**，記錄於 `facet_origin`；這不是來源作者的分類或實測結論。可逐筆補上資料庫的 `scenario_ids`、`goal_ids`，並在 `scenarios.json`、`goals.json` 登錄相同 ID，優先採用人工標註。

圖片指令卡片優先顯示 `image_links.cover_url`，若未設定則使用第一張 `result_urls` 圖片；目前沒有圖片時顯示代碼及「案例圖片待補」。詳情顯示參考圖、成果圖及補充展示圖。

新增案例時遵照 `database/README.md` 的案例欄位，特別是 `output_type`、`input`、`result`、`steps`、`image_links` 和 `verification`。同一方法多個案例仍使用獨立 ID。

## 本機預覽

```powershell
node website/server.cjs
```

預覽網址：http://127.0.0.1:4173/。不能直接以檔案方式開啟 `index.html`，需要 HTTP 伺服器讀取 JSON 與模組。

`dist` 是完整靜態網站，可部署到靜態網站主機；Sites 身分保存在 `.openai/hosting.json`。網站資料更新後需要重新發布。
