---
name: image-case-verify
description: 在指令所專案檢驗生成圖片是否符合案例本意，核對來源、五項目視條件、技術事實、檔案哈希及網頁；使用者要求驗證這批案例時使用。
---

# 圖片案例本意與資料驗證

本技能專用專案根目錄：

`C:/Users/Albert/Desktop/雲端同步資料夾_home/Codex USE/04_ClassRD USE/01_project/Chatgptu隱藏指令 查詢器`

在此根目錄執行命令。完整規則：[圖片案例工作規則](<C:/Users/Albert/Desktop/雲端同步資料夾_home/Codex USE/04_ClassRD USE/01_project/Chatgptu隱藏指令 查詢器/docs/IMAGE-CASE-WORKFLOW.md>)；以該檔及進度 JSON 為準。

先讀工作規則與待驗收批次。核對 prompt_id、command、英文原文及來源；親自查看原圖與成果圖，不能根據提示詞、檔名或腳本成功宣稱圖像正確。

每張只做一次本意目視，涵蓋subject、scene、effect、relations、details，簡短保存expected、observed、status，避免逐項重開圖片。畫面好看不等於本意符合。例如 subwayad 必須是產品印在地鐵廣告載體上，放在月台不合格。

檢查來源記錄：助理素材依生成或外部授權核對；使用者 ex product 素材須記錄2026-10-09授權、原始檔與哈希。已完成案例不重做；外部圖另查來源及授權。技術圖用可信來源核對構造或標註，缺資料就保持待修。任何偏差寫清原因，不上傳或計完成。

通過時把 review 綁到原圖、成果及實際提示詞 SHA-256，記錄檢查者與時間。圖像、素材或提示詞有變更須重驗，不沿用旧 passed。上傳後以程式整批核對資料與對應；每批網頁僅抽查首、末及1個特殊案例，涵蓋展示位置，保存1張截圖。抽查異常才擴查；沒有程式變更不重跑完整測試或重複建置。未抽查項目明記批次核對／抽樣驗證。更新主進度及精簡報告。程式檢查不能替代視覺語義判斷。

