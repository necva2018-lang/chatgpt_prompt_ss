# Cloudinary 媒體流程

第 1 階段已開發離線預覽與上傳／同步工具。本階段未實際上傳、未加入正式案例、未發布網站。使用 Node.js 22 以上，無需新增套件。

2026-10-09 更新：已有24個合規案例完成。最新使用者授權允許 ex product 產品素材，舊成果保留；每批20個。來源與五項 review 及哈希仍須完整，詳見工作規則。

## 先看圖片會放在哪裡

```sh
npm run media:preview
```

不用帳號或憑證，不連外。產生 `output/media/preview-01/plan.json`，列出每張圖的本機路徑、內容雜湊、Cloudinary public ID、案例 ID、指令 ID 與展示位置。未設定 Cloud name 時顯示 null，不虛構可用網址。預覽不修改資料庫與網站。

歷史第一批只包含 `/packshot` 與 `/subwayad`，對應清單是 `database/media-batches/preview-01.json`。2026-10-09 使用者已將每批數量改為 20 個案例，上傳工具支援 1～20 個；所有案例仍需逐張來源與本意驗收。

## 第 2 階段：本機設定

把根目錄 `.env.example` 複製為 `.env`，在本機填入 Cloudinary Console 的 Cloud name、API Key、API Secret。`.env` 已被 Git 忽略；不要把 Secret 貼入聊天、JSON 或網頁。環境變數優先於 `.env`。

資料夾預設 `prompt-atelier/cases`。`CLOUDINARY_FOLDER_MODE=dynamic` 用於目前的動態資料夾模式；若帳號使用舊的固定資料夾模式，改為 `fixed`。無需 unsigned upload preset。

先再次執行預覽，確認 cloud、資料夾及對應清單。

## 第 2 階段：實際上傳及同步

確認要上傳這批後執行：

```sh
npm run media:upload
```

此命令會執行外部上傳。流程如下：

1. 驗證憑證是否存在、案例與指令是否匹配，以及本機圖片是否存在。
2. 使用簽名 REST 上傳，Secret 不放入請求欄位或輸出；圖片以角色及 SHA-256 雜湊命名，`overwrite=false`。
3. 每張成功後寫入 `database/media-upload-ledger.json`；相同 cloud、資料夾、角色及圖片內容會重用成功紀錄。
4. 全批成功後備份原 JSON 到 `output/media/<批次 ID>/backup/`，再同步 `database/cases.json`、指令的 `case_ids` 與 `image_links`。
5. 驗證資料庫並重新建置 `website/dist/data/library.json`。指令卡片、指令詳情及案例頁沿用既有展示位置。

封面寬度上限 640px；參考圖及成果上限 1280px，不強制裁切，並加入 `f_auto`、`q_auto`。原圖仍保存於 Cloudinary。

上傳途中失敗時，資料庫與網站不會同步不完整案例；已成功的圖片紀錄會留下供接續使用。若遠端成功但回應丟失，重試相同 public ID 不覆寫既有圖片。資料庫檔案逐一以暫存檔替換，並非跨檔案交易；若同步／建置中斷，修正後重跑可補齊，亦可使用備份恢復。請一次只執行一個上傳程序。

本機資料同步完成不等於公開網站已發布。依 `docs/DEPLOYMENT.md` 執行現有部署流程，公開網址才會更新。

## 後續小批次

新增 `database/media-batches/<批次>.json`，沿用第一批結構，使用新案例 ID、正確指令 ID、專案內的參考圖與成果路徑、實際完整提示詞及成果說明。

```sh
npm run media:preview -- --batch database/media-batches/<批次>.json
npm run media:upload -- --batch database/media-batches/<批次>.json
```

保留案例 ID，重跑不會新增重複案例。指令已有封面時保留既有封面，新成果加入詳情；更換精選封面可另外編輯 `cover_url`。新生成案例標為示範並保留待確認狀態，不自動把指令標成已實測。

上傳紀錄不包含憑證；保留它能避免重複上傳。若手動刪除了 Cloudinary 圖片，需要移除該筆上傳紀錄後再執行，工具不主動查詢遠端是否被刪除。預覽報告及備份不部署到網站。GitHub 匯出目前不包含 `ex product/` 和 `output/`，若在其他電腦執行上傳，需另外帶走清單所引用的本機圖片。

## 驗證

`npm run check` 包含離線預覽、共用參考圖去重、簽名上傳的模擬、部分失敗接續、重跑同步、不可信回傳及舊資料夾模式測試。它們不向 Cloudinary 發出請求；實際 Cloudinary 驗收留待第 2 階段。

官方參考：[簽名上傳](https://cloudinary.com/documentation/upload_images)、[Upload API](https://cloudinary.com/documentation/image_upload_api_reference)、[圖片最佳化](https://cloudinary.com/documentation/image_optimization)。
