# TaskFlow 專案檔案導覽

TaskFlow 讓使用者登入後在 Tasks 頁管理自己的任務。Express 接收請求，透過 Mongoose 讀寫 MongoDB Atlas。網頁由 EJS 模板產生 HTML，REST API 則回傳 JSON。

## 檔案一覽

### 伺服器與路由

| 檔案 | 用途 |
| --- | --- |
| [`server.js`](./server.js) | `npm start` 執行的入口。啟動時檢查環境變數、連接 MongoDB，並設定 EJS、靜態資源和 Session。它處理註冊、登入及登出，為受保護的路由檢查登入狀態，並為表單及 API 的寫入請求核對 CSRF token。 |
| [`routes/tasks.js`](./routes/tasks.js) | 處理 `/tasks` 下的網頁操作，包括列出和搜尋任務，以及新增、編輯、完成、重新開啟和刪除。它使用 `task-input.js` 驗證輸入，透過 `Task` 模型操作目前帳戶的任務，並交給 EJS 顯示列表或表單。 |
| [`routes/api.js`](./routes/api.js) | 處理 `/api/tasks` 的 `GET`、`POST`、`PUT` 和 `DELETE` 請求。它與網頁共用任務模型和驗證規則，以登入 Session 的使用者 ID 限制操作範圍，並回傳 JSON 和 HTTP 狀態碼。 |

### 資料模型與輸入驗證

| 檔案 | 用途 |
| --- | --- |
| [`models/User.js`](./models/User.js) | 定義帳戶的使用者名稱、密碼雜湊值和建立時間。`server.js` 透過此模型註冊和查詢帳戶，`seed.js` 用它建立示範帳戶。使用者名稱有唯一索引，登入路由會明確讀取預設隱藏的密碼雜湊值。 |
| [`models/Task.js`](./models/Task.js) | 定義任務欄位、預設值、驗證規則和時間戳記。`userId` 記錄任務的擁有者，建立後固定。任務路由透過此模型讀寫資料。`userId` 與 `createdAt` 的複合索引支援按帳戶查詢及由新至舊排序。 |
| [`task-input.js`](./task-input.js) | 為網頁路由及 API 提供共用的任務預設值和兩種狀態。`validateTask` 整理和驗證可編輯欄位，例如將有效的 `YYYY-MM-DD` 截止日期轉成 UTC 午夜的日期值。`readTaskFilters` 驗證搜尋輸入，網頁按標題搜尋，API 可同時按標題和狀態篩選。 |

### 網頁模板與瀏覽器資源

| 檔案 | 用途 |
| --- | --- |
| [`views/login.ejs`](./views/login.ejs) | 由 `server.js` 產生登入頁。表單把使用者名稱、密碼及隱藏欄位 `_csrf` 送到 `POST /login`，頁面亦顯示登入錯誤、註冊成功訊息和建立帳戶的連結。 |
| [`views/register.ejs`](./views/register.ejs) | 顯示建立帳戶的表單，將使用者名稱、密碼及 `_csrf` 送到 `POST /register`，並顯示 `server.js` 回傳的註冊錯誤。 |
| [`views/tasks.ejs`](./views/tasks.ejs) | 接收 `routes/tasks.js` 傳來的任務和篩選條件，顯示搜尋表單、任務卡片及完成、重新開啟、編輯和刪除按鈕。它使用 `server.js` 提供的日期函式，以香港日期為準，為已過截止日且仍未完成的任務加上 `Overdue` 標示。 |
| [`views/task-form.ejs`](./views/task-form.ejs) | 新增及編輯任務共用的表單。`routes/tasks.js` 提供頁面標題、欄位值、提交網址及錯誤訊息，模板會在對應欄位旁顯示錯誤。 |
| [`views/error.ejs`](./views/error.ejs) | 顯示伺服器或任務路由傳來的網頁錯誤狀態碼和訊息，按登入狀態提供返回任務列表或登入頁的連結。 |
| [`views/partials/header.ejs`](./views/partials/header.ejs) | 各頁共用的頁首模板，設定網頁標題、載入 `styles.css` 和 `forms.js`，並開啟主要內容區。登入後會顯示任務列表連結和登出表單。 |
| [`views/partials/footer.ejs`](./views/partials/footer.ejs) | 各頁在內容末端引入此模板，結束頁首模板開啟的 `<main>`、`<body>` 和 `<html>` 標籤。 |
| [`public/forms.js`](./public/forms.js) | 在瀏覽器處理 `POST` 表單的提交。刪除前會顯示確認視窗，提交時會停用觸發提交的按鈕，並阻止重複送出。瀏覽器從歷史快取還原登入後的頁面時，它會重新載入頁面，讓伺服器再檢查 Session。 |
| [`public/styles.css`](./public/styles.css) | 由共用頁首載入的樣式表，控制表單、按鈕、任務卡片和錯誤訊息的外觀。它設定鍵盤焦點樣式，並按螢幕寬度調整欄數。 |

### 專案設定與部署

| 檔案 | 用途 |
| --- | --- |
| [`package.json`](./package.json) | 宣告專案的 Node.js 版本要求及 Express、Mongoose、EJS 等相依套件。`npm start` 會執行 `server.js`，`npm run seed` 會執行 `seed.js`。 |
| [`package-lock.json`](./package-lock.json) | 記錄直接及間接相依套件的確切版本、下載來源和完整性資料。Docker 建置時用 `npm ci` 按這份清單安裝套件。 |
| [`Dockerfile`](./Dockerfile) | 定義如何建置應用程式映像檔。它採用 `node:24-bookworm-slim`，用 `npm ci --omit=dev` 安裝套件，複製專案檔案，並以低權限的 `node` 使用者執行 `npm start`。 |
| [`compose.yaml`](./compose.yaml) | 定義 Docker Compose 的 `app` 服務。它指定映像檔的建置位置，把環境變數傳入容器，並將主機 `127.0.0.1` 的指定連接埠對應到容器內的 `3000`。 |
| [`.env.example`](./.env.example) | 提供環境變數的名稱、註解和預設值。首次設定時，以這份範本建立 `.env`，填妥 Atlas 連線和其他執行設定，供 Docker Compose 載入。 |
| [`.dockerignore`](./.dockerignore) | 指定 Docker 建置時排除的項目，例如 `.env`、`.env.*`、本機 `node_modules` 和 `.git`。`Dockerfile` 執行 `COPY` 時只會取得建置內容中的檔案。 |
| [`.gitignore`](./.gitignore) | 定義 Git 對本機設定、套件資料夾及示範產生的部分檔案的忽略規則。`.env.example` 有例外規則，讓環境變數範本可納入版本控制。 |

### 操作指引與示範

| 檔案 | 用途 |
| --- | --- |
| [`README.md`](./README.md) | 專案的主要使用指引，記錄小組分工、Atlas 和 Docker 設定、網頁操作、REST API、驗收清單及提交安排。 |
| [`seed.js`](./seed.js) | 由 `npm run seed` 執行。它使用 `MONGODB_URI` 連接資料庫，將 `DEMO_PASSWORD` 雜湊後，只建立尚未存在的 `student1` 和 `student2` 示範帳戶。 |
| [`scripts/demo.sh`](./scripts/demo.sh) | 網站啟動後可執行的 cURL 示範。腳本以 `student1` 登入，保存 Cookie 並取得 CSRF token，再依次新增、篩選、更新及刪除示範任務，檢查每一步的 HTTP 狀態碼，最後登出並清理暫存檔。 |
| [`scripts/migrate-task-fields.js`](./scripts/migrate-task-fields.js) | 升級既有 MongoDB 任務資料。移除舊 Priority 和 Category 欄位，將舊的未完成狀態統一為 `In Progress`，並檢查待遷移的任務數。 |

## 三個請求流程

### 登入

1. 瀏覽器送出 `GET /login`。`server.js` 為訪客的工作階段（Session）準備防跨站請求偽造的驗證碼（CSRF token），並透過 `views/login.ejs` 將它放入登入表單的 `_csrf` 隱藏欄位。
2. 表單送出 `POST /login`。`server.js` 核對表單 token 與 Session 內的值，並檢查使用者名稱和密碼的輸入格式。它透過 `models/User.js` 從 MongoDB 讀取帳戶和密碼雜湊值，再用 `bcryptjs` 比對密碼。帳戶不存在或密碼不符時，回傳 `401` 並重新顯示登入頁。
3. 登入成功後，`server.js` 重新建立 Session，儲存使用者 ID 和新的 CSRF token。Session 資料透過 `connect-mongo` 存入 MongoDB，瀏覽器以已簽署的 `taskflow.sid` Cookie 識別 Session。`303` 回應引導瀏覽器以 `GET /tasks` 載入該帳戶的任務列表。

### 在網頁新增任務

1. 已登入的使用者開啟 `GET /tasks/new`。`routes/tasks.js` 以 `task-input.js` 的預設值顯示 `views/task-form.ejs`，表單會把欄位及 `_csrf` 送到 `POST /tasks`。
2. `server.js` 檢查登入 Session、解析表單並核對 CSRF token。`routes/tasks.js` 隨後用 `validateTask` 驗證資料。若欄位有誤，伺服器回傳 `400`，並用原有模板顯示錯誤。
3. 驗證通過後，`routes/tasks.js` 將 Session 的使用者 ID 加入任務，透過 `models/Task.js` 儲存至 MongoDB。瀏覽器收到 `303` 後以 `GET /tasks` 重新載入列表，`views/tasks.ejs` 顯示新任務和本次操作的成功訊息。

### 透過 API 更新任務

1. 客戶端送出 `PUT /api/tasks/:id`，帶上登入 Cookie、`X-CSRF-Token` 標頭及 JSON，例如 `{"status":"Completed"}`。`server.js` 確認登入狀態、解析 JSON，並核對標頭中的 token。
2. `routes/api.js` 檢查任務 ID 的格式，再使用 `validateTask(req.body, true)` 驗證提交的欄位。它透過 `models/Task.js` 同時按任務 ID 和 Session 的使用者 ID 尋找任務，並更新已提交且可編輯的欄位。
3. 更新成功時，API 回傳 `200` 及更新後的任務 JSON。無效 ID 或欄位回傳 `400`，找不到屬於該帳戶的指定任務則回傳 `404`。

## Docker 啟動與示範

以 `.env.example` 建立 `.env` 後，Docker Compose 會使用其中的變數，並依 `compose.yaml` 把應用程式所需的設定傳入 `app` 容器。

| 變數 | 用途 |
| --- | --- |
| `PORT` | 瀏覽器連線的主機連接埠，預設為 `3000`。容器內的應用程式固定使用 `3000`。 |
| `MONGODB_URI` | MongoDB Atlas 連線字串。按 `README.md` 的設定，在連線字串中指定 `taskflow` 資料庫，用來存放帳戶、任務和 Session。 |
| `SESSION_SECRET` | 用來簽署 Session Cookie 的密鑰。`server.js` 要求填入 64 個十六進制字元，可用 `openssl rand -hex 32` 產生。 |
| `DEMO_PASSWORD` | 初始化示範帳戶時使用的密碼。`seed.js` 要求去除首尾空格後至少 8 個字元，原始值最多 72 位元組。 |
| `COOKIE_SECURE` | 本機 HTTP 示範用 `false`。設為 `true` 時，Session Cookie 只會透過 HTTPS 傳送。 |
| `TRUST_PROXY` | 預設為 `false`。在單一受信任的反向代理後方運行時可設為 `true`。 |

1. 執行 `docker compose up --build -d`。Compose 按 `Dockerfile` 建置並啟動 `app`，容器中的 `npm start` 會執行 `server.js`，連接 Atlas 後才開始接收網頁請求。
2. 如需建立示範帳戶，執行 `docker compose exec app npm run seed`。`seed.js` 會使用容器內的資料庫和示範密碼設定。
3. 在主機執行 `bash scripts/demo.sh` 可展示 API 操作。腳本預設連到 `http://localhost:3000`，可用 `TASKFLOW_URL` 指定其他網址。若目前 shell 未提供 `DEMO_PASSWORD`，腳本會提示輸入 `student1` 的密碼。
