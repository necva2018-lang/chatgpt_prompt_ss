---
name: cloudinary-case-sync
description: 在指令所專案將已驗收圖片案例上傳 Cloudinary、去重、接續失敗批次並同步本機網頁展示；使用者要求上傳同步案例時使用。
---

# Cloudinary 案例上傳與同步

本技能專用專案根目錄：

`C:/Users/Albert/Desktop/雲端同步資料夾_home/Codex USE/04_ClassRD USE/01_project/Chatgptu隱藏指令 查詢器`

在此根目錄執行命令。完整規則：[圖片案例工作規則](<C:/Users/Albert/Desktop/雲端同步資料夾_home/Codex USE/04_ClassRD USE/01_project/Chatgptu隱藏指令 查詢器/docs/IMAGE-CASE-WORKFLOW.md>)；以該檔及進度 JSON 為準。

先讀工作規則、docs/CLOUDINARY.md、當批清單及主進度。只處理使用者授權的當批案例；技能本身不授權額外發布、刪除或新批次。

使用 scripts/cloudinary-media.cjs 的預覽與上傳命令，指定 --batch。憑證只由專案 .env 或環境變數讀取，不輸出、複製到技能或網站。來源及本意 review 必須完整且匹配檔案哈希；不得關掉檢查來重用舊清單。

先 media:preview，確認來源／成果／ID／展示對應；整批合格後 media:upload。沿用媒體雜湊 ID、overwrite=false 及逐張 receipt，重跑補缺不重傳。批次失敗停在成功紀錄，修正後接續。

完成後核對案例與指令對應、圖片網址、網站建置與瀏覽器載入，更新進度與部署狀態。本機同步不等於公開發布。替換舊案例時依批次規則更新展示對應且保存歷史，不刪原始檔或遠端素材。

