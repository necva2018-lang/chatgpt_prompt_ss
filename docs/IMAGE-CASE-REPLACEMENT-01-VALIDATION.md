# replacement-01 批次驗證紀錄

日期：2026-10-09；階段 1 第一批：2 個案例完成助理驗收，使用者確認待回覆。

素材由助理使用內建 imagegen 生成：無品牌鼠尾草綠保溫瓶。原圖合理，未使用 ex product 或其他使用者素材。原圖、兩张成果、完整實際提示詞存於 output/imagegen/replacement-01；資料庫批次保留來源與 SHA-256。

## 圖片本意

- /packshot：保留瓶身、深灰蓋與提環；背景為無縫淺灰棚拍，柔光與落地陰影合理；無品牌文字、水印、多餘物件。
- /subwayad：產品以平面產品攝影出現在牆面金屬框燈箱內；看得到磁磚、月台黃線、軌道及頂部照明，透視與廣告載體一致；月台没有實體產品。
- 五項預期及實際目視結果已寫入 database/media-batches/replacement-01.json，綁定原圖、成果及提示詞哈希。沒有修改重試；兩張首次成果通過。

## 接入與網頁

- Cloudinary 上傳成功：共用原圖 1 張、成果 2 張；成功憑據位於 database/media-upload-ledger.json。
- 兩個指令的 case_ids、cover_url、原圖與成果改為新案例；舊 AirPods 案例移至 database/case-history/preview-01.json，原始檔及遠端資產保留。
- 實際瀏覽器核對卡片、指令詳情及案例原圖／成果、英文原指令、完整生成提示詞；封面 naturalWidth=640，詳情原圖與成果 naturalWidth=1254。
- 最終畫面發現封面裁切提環，已將卡片圖片改為完整顯示並重新目視核對；gallery.png 是修正後畫面。
- 圖片載入及網址證據：output/media/replacement-01/browser-verification.json；案例畫面 gallery.png、packshot-detail.png、subwayad-detail.png；指令畫面 command-cards.png、packshot-command.png、subwayad-command.png。
- npm run build 成功；npm run check 資料 844 筆、進度同步、17 項測試通過。

本次只同步本機網頁，未公開部署；助理驗收不代替使用者確認。此成果是 AI 示範，不代表真實產品或商業合作。

下次批次：stage-1-02，/luxuryedition 與 /storefrontmockup，共 2 個案例；先寫驗收條件再選助理素材。
