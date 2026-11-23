# 專案架構

## 專案檔案

### 伺服器與路由

| 檔案 | 用途 |
| --- | --- |
| [`server.js`](../server.js) | 啟動 Express、連接 MongoDB，並設定 EJS、靜態資源、MongoDB Session store、Passport 和路由。 |
| [`routes/auth.js`](../routes/auth.js) | 使用 Passport 驗證帳號密碼及恢復登入狀態，並提供註冊、重設密碼、登出及 CSRF 驗證碼端點。 |
| [`routes/tasks.js`](../routes/tasks.js) | 為任務列表、新增及編輯網址渲染 EJS 頁面。瀏覽器透過 REST API 取得私人任務。 |
| [`routes/api.js`](../routes/api.js) | 處理任務的查詢、新增、修改和刪除，依 Passport 驗證後的使用者 ID 限制操作範圍。 |

### 資料模型與輸入驗證

| 檔案 | 用途 |
| --- | --- |
| [`models/User.js`](../models/User.js) | 定義帳戶的使用者名稱、密碼雜湊值、登入版本和建立時間。使用者名稱有唯一索引，登入時會明確讀取預設隱藏的密碼雜湊。 |
| [`models/Task.js`](../models/Task.js) | 定義任務欄位、預設值、驗證規則和時間戳記。任務路由透過此模型讀寫資料。任務建立後，`userId` 固定為擁有者的 ID。`userId` 與 `createdAt` 的複合索引支援按帳戶查詢及由新至舊排序。 |
| [`task-input.js`](../task-input.js) | 提供任務預設值和狀態，驗證任務欄位及標題和狀態篩選。截止日期以 UTC 午夜儲存。 |

### 網頁模板與瀏覽器資源

| 檔案 | 用途 |
| --- | --- |
| [`views/login.ejs`](../views/login.ejs) | 顯示登入表單、登入錯誤、註冊及重設密碼的成功訊息，以及建立帳戶和忘記密碼的連結。 |
| [`views/register.ejs`](../views/register.ejs) | 顯示建立帳戶的表單和註冊錯誤。 |
| [`views/forgot-password.ejs`](../views/forgot-password.ejs) | 顯示重設密碼表單及錯誤訊息。 |
| [`views/tasks.ejs`](../views/tasks.ejs) | 提供狀態統計、任務列表和各項任務操作的模板。 |
| [`views/task-form.ejs`](../views/task-form.ejs) | 提供新增及編輯任務共用表單，以及顯示欄位錯誤的位置。 |
| [`views/error.ejs`](../views/error.ejs) | 顯示錯誤狀態碼、訊息和返回系統的連結。 |
| [`views/partials/header.ejs`](../views/partials/header.ejs) | 各頁共用的頁首模板，設定網頁標題、載入 `styles.css` 和 `forms.js`，並開啟主要內容區。登入後會顯示任務列表連結和登出表單。 |
| [`views/partials/footer.ejs`](../views/partials/footer.ejs) | 各頁在內容末端引入此模板，結束頁首模板開啟的 `<main>`、`<body>` 和 `<html>` 標籤。 |
| [`public/forms.js`](../public/forms.js) | 透過同源 Session Cookie 和 CSRF 驗證碼提交 JSON 表單，載入及顯示任務、分類計數和欄位錯誤。以香港時間判斷任務是否逾期。 |
| [`public/styles.css`](../public/styles.css) | 由共用頁首載入的樣式表，控制表單、按鈕、任務列表和錯誤訊息的外觀。它設定鍵盤焦點樣式，並按螢幕寬度調整間距。 |

### 專案設定與部署

| 檔案 | 用途 |
| --- | --- |
| [`package.json`](../package.json) | 宣告專案的 Node.js 版本要求及 Express、Mongoose、EJS 等相依套件。`npm start` 會執行 `server.js`。 |
| [`package-lock.json`](../package-lock.json) | 記錄直接及間接相依套件的確切版本、下載來源和完整性資料。Docker 建置時用 `npm ci` 按這份清單安裝套件。 |
| [`Dockerfile`](../Dockerfile) | 定義本機和 Cloud Run 共用的映像檔。它採用 `node:24-bookworm-slim`，用 `npm ci --omit=dev` 安裝套件，複製專案檔案，並以低權限的 `node` 使用者執行 `npm start`。 |
| [`compose.yaml`](../compose.yaml) | 定義本機 Docker Compose 的 `app` 服務。它指定映像檔的建置位置，把環境變數傳入容器，並將主機 `127.0.0.1` 的指定連接埠對應到容器內的 `3000`。 |
| [`.env.example`](../.env.example) | 提供環境變數的名稱、註解和預設值。首次設定時，以這份範本建立 `.env`，填妥 Atlas 連線和其他執行設定，供 Docker Compose 載入。 |
| [`.dockerignore`](../.dockerignore) | 指定 Docker 建置時排除的項目，例如 `.env`、`.env.*`、本機 `node_modules` 和 `.git`。`Dockerfile` 執行 `COPY` 時只會取得建置內容中的檔案。 |
| [`.gitignore`](../.gitignore) | 定義 Git 對本機設定、套件資料夾及部分本機產生的檔案的忽略規則。`.env.example` 有例外規則，讓環境變數範本可納入版本控制。 |

Cloud Run 透過 Secret Manager 將連線字串和 Session 密鑰傳入容器，Express 以平台指定的連接埠接收請求。 [本機啟動指引](./setup.md) · [Cloud Run 部署指引](./member-06-cloud-run-deployment.md)

## 請求流程

1. 登入頁從 `GET /api/auth/csrf` 取得驗證碼，並以 JSON 將帳號密碼送到 `POST /api/auth/login`。Passport Local strategy 以 bcrypt 核對現有密碼雜湊。
2. 登入成功後，Passport 建立新的 Session，將使用者 ID 及登入版本存到 MongoDB。瀏覽器收到有效期兩小時的 `HttpOnly`、`SameSite=Lax` Cookie，並在同源請求中帶上它。
3. Passport 核對 Session 和帳戶的登入版本後，恢復帳戶身分。任務路由按使用者 ID 存取資料。寫入請求透過 `X-CSRF-Token` 提交目前 Session 的驗證碼。登出會銷毀 Session 並清除 Cookie。
4. 重設密碼時，伺服器同時更新帳戶的 bcrypt 密碼雜湊及登入版本。該帳戶先前的 Session 隨即失效。

## 舊版登入資料相容性

由舊版存取權杖機制切換至 Session Cookie 後，現有帳戶和任務可直接沿用，使用者需重新登入。若 `sessions` 集合已刪除，Session store 會重新建立。舊的 `accesstokens` 紀錄由原有 TTL 索引清理。
