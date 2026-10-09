# 資料與網站維護

1. 編輯 `database/text-prompts.json` 或 `database/image-prompts.json`；兩種成果維持分開。
2. 保留記錄 ID、來源與統一欄位。新增分類、場景、目標及案例時，同步更新對應的 JSON 檔與關聯 ID。
3. 執行 `npm run check`。
4. 執行 `npm run build`，更新 `website/dist/data/library.json`。
5. 執行 `npm start`，確認搜尋、分類、詳情與兩種複製按鈕。

圖片使用每筆記錄的 `image_links`：`cover_url`、`reference_urls`、`result_urls`、`gallery_urls`。暫無圖片時保留 null 或空陣列；案例生成、上傳後再填網址。

`database/build-database.cjs` 是原始資料匯入工具，會重新產生資料檔，可能覆寫人工修訂。日常更新不要執行它。新增原始來源時，先調整匯入規則並備份現有資料；它目前針對既有五份來源設計。

`scripts/archive/` 的程式是開發過程的一次性修改腳本，部分不具重複執行安全性，不是建置流程。`docs/screenshots/` 是歷史截圖，介面以目前網站為準。

網站收藏存在使用者瀏覽器的 localStorage；目前沒有帳號或跨裝置同步。七個使用場景及八個完成目標的預設分類來自編輯規則，並非原始資料都已人工確認。資料中的來源、品質與分類標記須保留。
