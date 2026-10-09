# GitHub 與靜態部署

## 上傳 GitHub

目前資料夾可能位於另一個既有 Git 儲存庫中，`website/` 也保留原部署工具的 Git 記錄。為避免把其他資料或巢狀 Git 記錄一起上傳，先執行：

```sh
npm run export:github
```

匯出工具會在 `artifacts/` 產生帶時間戳記的乾淨專案資料夾。它包含原始資料、資料庫、網站、文件與 GitHub 檢查流程；排除 `.git`、部署暫存、舊部署包和既有本站的 hosting 設定。

將該匯出資料夾複製至目前既有儲存庫以外的獨立位置，再建立自己的 Git 儲存庫及 GitHub repository。可使用 GitHub Desktop 發布，或在那個獨立資料夾執行 `git init`、提交後加入自己的 remote 並推送。此整理工作沒有建立或上傳 GitHub repository。

GitHub Actions 在 push 或 pull request 時驗證資料、執行測試並產生網站資料；不會自動發布網站。

## 部署網站

執行 `npm run check` 與 `npm run build` 後，將 `website/dist/` 內容交給靜態網站服務。此目錄的 `index.html` 必須位於發布根目錄，並保留 CSS、JavaScript 及 `data/` 的相對位置。不需要後端、伺服器資料庫或 API 金鑰。

## 使用 GitHub Pages

已提供 `.github/workflows/pages.yml`，手動執行時會建置、驗證並部署 `website/dist/`。

1. 將乾淨匯出專案上傳到 GitHub 儲存庫的預設分支，保留 `.github/` 目錄。
2. 在儲存庫的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
3. 在 **Actions → Deploy to GitHub Pages → Run workflow** 選擇預設分支並執行。
4. 成功後從部署結果或 Settings → Pages 開啟網站，通常為 `https://你的帳號.github.io/儲存庫名稱/`。

每次更新後再手動執行部署流程；push 本身只執行檢查。網站資源及 JSON 使用相對路徑，可在儲存庫名稱的子路徑正常載入。搜尋與詳情在同一頁運作，不需要後端路由或 SPA 轉址設定。

不要選擇「Deploy from a branch」並把本專案的根目錄或 `docs/` 作為網站來源；真正的網站入口在 `website/dist/index.html`。

GitHub Free 可使用公開儲存庫的 Pages；私人儲存庫是否可用取決於帳號方案。網站只有 `website/dist/` 會被部署；公開儲存庫內的來源檔仍可從 GitHub 閱讀。

設定與工作流程參照 [GitHub 官方 Pages 文件](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。本機相容性檢查不代表已完成 GitHub 上的實際部署。

目前 Sites 網站的 `.openai/hosting.json` 保留於本機供原網站更新使用，匯出專案不包含它。GitHub 上傳與原 Sites 網站部署互相獨立；修改 GitHub 檔案不會更新現有網址。
