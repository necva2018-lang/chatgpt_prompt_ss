# 指令資料庫

資料格式版本：1.1.0。整理日期：2026-10-09。

這是供查詢器使用的結構化 JSON 資料庫，以及可直接閱讀的 Markdown 目錄。尚未建立網站、搜尋介面或資料庫服務。原始 `Data Pool` 檔案未修改。

## 已整理的資料

| 來源 | 文字成果 | 圖片成果 |
|---|---:|---:|
| 400-plus-codes-v2 中文解析 | 0 | 642 |
| 99 個實用提示詞範本 | 99 | 0 |
| 50 個超實用隱藏指令 | 50 | 0 |
| 5 個必學＋30 個進階版 | 33 | 0 |
| 隱藏指令完整版 20 組 | 20 | 0 |
| 合計 | 202 | 642 |

共 844 筆**來源紀錄**，不是 844 個已去重、已實測的獨立方法。宣稱 35 組的來源實際只列出 33 組，沒有補造另外兩組。

## 絕對分類規則

最上層只有兩種成果類型，兩類實體分檔，禁止一筆紀錄同時掛兩類：

- `text`／文字成果：預期輸出是文字、表格、程式碼、腳本、分析或提示詞文字。
- `image`／圖片成果：預期輸出是圖片、圖像轉換、視覺化圖解或影像風格處理。

「短影音腳本」仍屬文字成果；「用文字產生流程圖圖片」屬圖片成果。之後同一方法若有文字與圖片兩種版本，應建立兩筆 ID，再用 `related_ids` 相互連結。成果類型和卡片外觀無關：文字成果可以用視覺卡片展示。

## 檔案入口

| 檔案 | 用途 |
|---|---|
| `manifest.json` | 版本、筆數、各資料檔入口 |
| `text-prompts.json` | 202 筆文字成果紀錄 |
| `image-prompts.json` | 642 筆圖片成果紀錄 |
| `text-catalog.md` | 文字成果完整閱讀目錄 |
| `image-catalog.md` | 圖片成果完整閱讀目錄 |
| `record.schema.json` | 指令紀錄的 JSON Schema |
| `sources.json` | 原始來源、相對路徑、SHA-256 與筆數 |
| `categories.json` | 分類 ID、名稱、成果類型 |
| `duplicate-groups.json` | 36 組名稱相同或格式相近、待語義審查的群組 |
| `scenarios.json` | 使用場景資料，預留空陣列 |
| `goals.json` | 完成目標資料，預留空陣列 |
| `cases.json` | 成果案例資料，預留空陣列 |
| `validation-report.json` | 匯入核對報告 |
| `build-database.cjs` | 本次五份來源的整理工具；不是網站程式 |

JSON 是主資料，Markdown 目錄供閱讀。兩者不要各自維護。編輯主資料後應同步更新閱讀目錄與 manifest。

## 統一紀錄欄位

| 欄位 | 定義 |
|---|---|
| `id` | 穩定 ID，來源 ID＋來源項目編號；不可拿顯示名稱当主鍵 |
| `output_type` | 必填，`text` 或 `image` |
| `title` | 卡片中文顯示名稱；圖片資料暫用中文功能描述 |
| `command` | 原始英文名稱或斜線代碼，不擅改拼寫 |
| `aliases` | 搜尋別名；本次只加入機械性名稱變體 |
| `summary` | 用途說明；尚未全面改寫成短卡片文案 |
| `category_ids` | 內容分類，多對多；本次保留來源分類，未做跨來源統一分類審訂 |
| `scenario_ids` | 使用場景：在哪件事使用，例如課程招生 |
| `goal_ids` | 完成目標：希望改善什麼，例如降低閱讀負擔 |
| `tags` | 額外搜尋標籤，預留 |
| `prompt` | 提示內容、語言、內容完整度、來源性質、可替換欄位 |
| `usage` | 所需輸入、步驟、備註、來源使用段落 |
| `examples` | 來源的輸入提示範例，不等於實測成果 |
| `case_ids` | 連結成果案例 |
| `media` | 卡片素材資訊；沒有實際素材時保持空陣列 |
| `image_links` | 圖片連結專區：封面、原始參考圖、生成成果、其他展示圖片 |
| `related_ids` | 關聯方法或不同成果版本 |
| `duplicate_group_ids` | 同名待審群組 |
| `source_refs` | 來源 ID、編號、原文行號與原始摘錄 |
| `quality` | 審查狀態、實測與否、待確認旗標、整理備註 |
| `created_at`／`updated_at` | 資料庫整理日期，不是原文章發布日期 |
| `extensions` | 額外欄位；不覆寫核心欄位 |

空陣列代表「尚未補資料」；`null` 代表「未知或尚未指定」。不得把未知當成不適用或已驗證。

### 圖片連結專區

依已確認流程：先整理資料，再生成案例，最後上傳圖片並填入連結。目前不生成或上傳圖片，不填入假網址。每筆紀錄統一保留以下結構，文字成果若之後需要展示圖片也能使用，成果分類仍保持不變：

```json
{
  "image_links": {
    "cover_url": null,
    "reference_urls": [],
    "result_urls": [],
    "gallery_urls": []
  }
}
```

- `cover_url`：卡片封面圖片網址，未設定時為 `null`。
- `reference_urls`：原始參考圖片網址，可多張。
- `result_urls`：實際生成的成果圖片網址，可多張。
- `gallery_urls`：補充展示圖片網址，可多張，例如步驟圖或比較圖。

上傳後填入可存取的正式圖片網址，欄位不綁定特定儲存服務。來源文章中的裝飾圖片不當成生成成果。每筆實測案例也保留相同的 `image_links` 結構；多案例的原圖與成果配對，以 `cases.json` 的個別案例為準，指令紀錄的連結供卡片精選展示。
ㄧ
### 提示內容完整度

- `template`：來源提供可套用的提示句或完整模板，不代表每筆都是多步驟長模板。
- `instruction`：來源提供一句可用功能指示。本次圖片類保留英文說明，避免中文誤譯主導使用。
- `task_description`：只有任務說明，不能在介面上標示為「完整模板」。目前 55 筆。

`prompt.variables` 收錄方括號 `[欄位]` 與中文括號 `【欄位】`，保留原名稱與原始 token；使用必填性未知時 `required` 為 `null`。

### 品質旗標

| 旗標 | 意義 |
|---|---|
| `translation_unreviewed` | 中文翻譯未逐筆校對，目前 639 筆 |
| `visual_result_unverified` | 未生成圖片驗證 |
| `full_template_missing` | 只有簡短用途說明，完整模板待補 |
| `custom_mode` | 來源明示的自創角色模式 |

目前所有紀錄都標示 `imported`、`tested: false`。來源宣稱「穩定」「已測試」不等於本資料庫實測，不直接採為認證。

圖片資料中 `/popupstore`、`/packagingdieline`、`/splitdiopter` 的明顯中文誤譯已依原英文修正，原中文仍保留於 `extensions.original_translation_zh`。其餘圖片翻譯原樣收錄並標記待審。

## 重複與同名處理

名稱去掉大小寫、斜線、空格及部分符號後相同，只建立比對群組，不直接合併。例如 `/persona` 的「指定角色」與「目標客群」用途不同，保留不同 ID。

同義但名稱不同的項目尚未人工建立關聯，例如 SOCRATES 與 Socratic。36 組是名稱檢查群組，不是確定重複，也不是全部語義重複的數量。圖片與文字的同名紀錄不放入同一重複群組。

若未來確認兩筆方法相同：可指定主紀錄，其他紀錄標成 `archived`，在 `related_ids`／`extensions.canonical_id` 指向主紀錄；保留來源與舊 ID，避免已存在的案例連結失效。

## 擴充場景、目標與案例

這三個資料表目前預留，尚未虛構案例或代使用者決定完整分類。

場景與目標共用建議欄位：`id`、`name`、`description`、`allowed_output_types`、`parent_id`、`sort_order`、`extensions`。例如場景名稱「課程招生」，目標名稱「講清楚價值」，兩者不要混成同一欄。

案例建議欄位：

| 欄位 | 用途 |
|---|---|
| `id`／`title`／`output_type` | 案例 ID、名稱、絕對成果類型 |
| `scenario_ids`／`goal_ids` | 關聯使用場景與完成目標 |
| `input` | 原始素材：`text`、`media` |
| `result` | 完成成果：`text`、`media` |
| `image_links` | 同指令紀錄的圖片連結專區，保存此案例自己的封面、參考圖與成果網址 |
| `steps` | 依序保存 `order`、`prompt_id`、`applied_prompt`、`purpose`、`observed_effect` |
| `card` | `headline`、`excerpt`、`cover_media_id`；文字成果可直接以文字排版 |
| `verification` | `status`：`concept`、`demonstrated` 或 `tested`；以及證據與備註 |
| `source_refs` | 案例素材及方法來源 |
| `extensions` | 後續額外欄位 |

`purpose` 是預期作用；`observed_effect` 是實際觀察，未實測時設成 `null`。一個案例可使用多個加強指令，透過步驟解釋「目標 → 使用指令 → 改善結果」。一個案例若同時展示文字與圖片兩種最終成果，分成兩個互相關聯的案例，不破壞絕對分類。

未來可在 `extensions` 加入編輯版本、作者、授權資訊、平台測試、難度及操作限制。要增加新的核心欄位或成果類型，先升級 schema 版本，不把新成果硬塞進既有兩類。

## 更新與核對

新增資料時：先登錄來源，決定成果類型，分配穩定 ID，補齊統一欄位，保留原文，再核對來源筆數、ID、參照與分類。新增項目不能改動既有 ID。應先對新來源抽樣確認格式，不能假設所有 Markdown 都能用相同規則解析。

本次整理工具固定處理目前五份來源，使用：

```powershell
node database/build-database.cjs
node database/validate-database.cjs
```

**這個命令會重新產生指令、來源、分類、重複群組與閱讀目錄，覆蓋對這些產物的手動編輯。** `scenarios.json`、`goals.json`、`cases.json` 若已存在則保留。正式開始人工維護後，應修改整理流程以保存人工編輯，或停止直接重跑。

目前核對涵蓋筆數、唯一 ID、必填非空、成果／分類一致、來源參照、原文行號，以及依 `record.schema.json` 做結構核對。這不代表完成語義去重、中文全面校對、場景／目標標註或生成效果測試。
