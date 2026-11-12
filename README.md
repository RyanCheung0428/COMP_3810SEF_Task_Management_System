# TaskFlow 個人任務管理系統

COMP 3810SEF Autumn 2026 Group Project。TaskFlow 讓使用者登入後建立、查看、修改和刪除私人任務。REST API 也可以操作同一帳號的任務。

## 小組資料

組別：`待填`。提交前請填寫每位組員的姓名、學號和實際分工。

| 組員 | 姓名 | 學號（SID） | 計劃分工 |
| --- | --- | --- | --- |
| 1 | 待填 | 待填 | 登入、登出、Session 及權限檢查 |
| 2 | 待填 | 待填 | MongoDB、資料模型及帳戶管理 |
| 3 | 待填 | 待填 | 任務列表及狀態切換 |
| 4 | 待填 | 待填 | 修改、刪除及資料驗證 |
| 5 | 待填 | 待填 | REST API、HTTP 狀態碼及 cURL |
| 6 | 待填 | 待填 | EJS、CSS 及 Docker |

全組共同進行整合測試。每位組員應能解釋自己完成的部分。

## 專案檔案

| 檔案或資料夾 | 用途 |
| --- | --- |
| `server.js` | 設定 Express、連接 MongoDB、處理登入及登出、掛載路由及啟動網站 |
| `package.json`、`package-lock.json` | 啟動及初始化指令、套件清單及鎖定版本 |
| `routes/` | 任務網頁及 API 路由 |
| `models/` | `User` 與 `Task` 的 Mongoose 資料模型 |
| `views/` | EJS 頁面及共用頁首／頁尾 |
| `public/` | CSS 和少量瀏覽器 JavaScript，例如確認刪除 |
| `scripts/` | 資料遷移 |
| `task-input.js` | 網頁和 API 共用的任務驗證及 API 篩選條件 |
| `Dockerfile`、`compose.yaml` | Node.js 24 app container and Atlas connection settings |
| `.env.example` | 環境變數範例 |

主要套件包括 Express（路由）、Mongoose（資料庫）、EJS（頁面）、`bcryptjs`（密碼雜湊）、`express-session`（登入 Session）和 `connect-mongo`（Session 儲存）。

### Where to read the code for each feature

| Feature | Follow the request |
| --- | --- |
| Login and logout | `views/login.ejs` submits to `server.js`. The server finds the account through `models/User.js`, checks the password against its stored hash, and records the user ID in the session. Logging out removes the session. |
| Task list | `routes/tasks.js` queries the signed-in user's tasks for the selected status view, then renders `views/tasks.ejs`. |
| Add, edit, and delete tasks | `views/task-form.ejs` submits to `routes/tasks.js`, which validates input in `task-input.js` before writing through `models/Task.js`. `public/forms.js` asks for confirmation before the delete form is sent. |
| Overdue labels | The task list uses `isOverdue` from `server.js` to compare due dates with today's date in Hong Kong. |
| REST API | `server.js` checks the session before `routes/api.js` handles `/api/tasks`. The routes use the same task model and validation as the web pages, and return JSON. |

## Run with Docker and MongoDB Atlas

Docker Compose runs the TaskFlow app. MongoDB Atlas stores its users, tasks, and sessions in the `taskflow` database.

1. In your Atlas project, create a dedicated database user with the `readWrite` role on `taskflow`. Use this database user in the URI. [Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
2. In the project's IP access list, allow the public IP address from which the Docker host connects to Atlas. [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
3. Open the cluster's **Connect → Drivers** screen and copy the connection string. Replace the username and password placeholders with the database user's credentials. Percent-encode reserved characters in the credentials. Put `/taskflow` immediately before the `?` so the URI names the correct database. [Connect using an Atlas driver URI](https://www.mongodb.com/docs/atlas/driver-connection/)

Create `.env` if it does not already exist.

```sh
test -f .env || cp .env.example .env
```

Set `MONGODB_URI` in `.env` to your Atlas URI. Keep the query options supplied by Atlas. The example below uses placeholders.

```dotenv
MONGODB_URI=mongodb+srv://<db-user>:<encoded-db-password>@<cluster-host>/taskflow?retryWrites=true&w=majority
```

On a fresh setup, use `openssl rand -hex 32` to generate `SESSION_SECRET`. Keep the filled `.env` private and outside the submission ZIP.

Changing the URI points TaskFlow to Atlas. If you have existing local data, migrate users and tasks together and preserve their IDs when moving to Atlas. Keep the local copy until you have checked the imported accounts and tasks in Atlas.

Start the app.

```sh
docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000). Create an account at `/register`, or sign in with a migrated account.

| Environment variable | Purpose |
| --- | --- |
| `PORT` | Host port, default `3000` |
| `MONGODB_URI` | Atlas Drivers connection string with `taskflow` as the database |
| `SESSION_SECRET` | Key used to sign the session cookie |
| `COOKIE_SECURE` | `false` for the local HTTP. Set `true` when serving over HTTPS. |
| `TRUST_PROXY` | `false` for a direct connection. Set `true` behind one trusted reverse proxy. |

Use `docker compose logs app` to check startup and `docker compose down` to stop the app. The data remains in Atlas when the container is stopped or replaced.

### Browse TaskFlow data in Atlas

In your Atlas project, open **Database → Data Explorer**, expand the connected cluster and the `taskflow` database, then open `users`, `tasks`, or `sessions` to browse its documents. Collections appear as the app creates or imports their data. [Browse Atlas collections](https://www.mongodb.com/docs/atlas/atlas-ui/collections/)

### 升級既有任務資料

使用舊版資料庫時，先停止連到該資料庫的舊版程式，再以同一個 `MONGODB_URI` 執行遷移。指令會永久移除舊有 Priority 和 Category 值，並將既有未完成任務統一為 `In Progress`。已完成任務、擁有者與時間戳記會保留。

```sh
docker compose stop app
docker compose build app
docker compose run --rm --no-deps app npm run migrate:task-fields
docker compose up -d app
```

確認遷移指令回報零筆待處理後再執行最後一步。已完成的遷移可安全重跑。全新資料庫可直接啟動新版。

## 網頁操作

1. **登入。** 先在 `/register` 建立帳號，然後開啟 `/login`，輸入帳號的 Username 和 Password，然後按 **Log in** 進入 Tasks 頁。未登入訪問任務頁會返回登入頁。
2. **新增。** 在 Tasks 頁按 **Add task** 進入獨立表單頁。輸入 Title，可選填 Description 和 Due date，然後按 **Save task**。新任務預設為進行中。
3. **查看。** 主頁預設顯示全部未完成任務，最新建立的排在最前。按 **Completed** 查看已完成任務，或按 **In progress** 切回未完成清單。
4. **更新任務。** 按任務左側的勾選按鈕完成或重新開啟任務。從右側的 **⋯** 選單選 **Edit** 進入獨立編輯頁，或選 **Delete** 並確認刪除。
5. **查看逾期任務。** Tasks 頁會為尚未完成且截止日早於香港當天日期的任務顯示 **Overdue**。
6. **登出。** 按 **Log out**。再開啟任務頁時需要重新登入。

## REST API

API 和網頁使用同一套私人任務及登入 Session。GET 可使用 `title` 和 `status` 組合篩選。POST 和 PUT 接收 JSON，PUT 保留未提交的欄位。可編輯欄位為 `title`、`description`、`status`、`dueDate`。`status` 接受 `In Progress` 和 `Completed`，POST 省略時預設為 `In Progress`。日期輸入格式為 `YYYY-MM-DD`，可用空字串或 `null` 清除。JSON 回傳日期採 ISO 格式。

| 方法及路徑 | 成功回應 |
| --- | --- |
| `GET /api/tasks` | `200`，任務 JSON 陣列 |
| `POST /api/tasks` | `201`，新增的任務 |
| `PUT /api/tasks/:id` | `200`，更新後的任務 |
| `DELETE /api/tasks/:id` | `200`，包含 `message` 的 JSON |

錯誤回傳 JSON `error`，欄位驗證錯誤可附上 `fields`。常見狀態包括 `400` 輸入或 ID 無效、`401` 未登入、`403` CSRF token 不符、`404` 任務不存在或不屬於自己、`500` 伺服器錯誤。

## 驗收清單

| 測試 | 預期結果 |
| --- | --- |
| 未登入訪問 `/tasks` 或 API | 網頁轉到登入頁，API 回傳 401 |
| 輸入錯誤密碼、登入後登出 | 錯誤密碼不能登入，登出後舊 Session 不能再使用 |
| 新增、編輯、完成、重新開啟及刪除任務 | 列表可在未完成及已完成之間切換，取消刪除會保留任務 |
| 空白或過長標題、無效日期、錯誤狀態 | 顯示錯誤，資料不會被儲存 |
| 標題含 `<`、`>` 或 `&` | 顯示為文字 |
| 使用自行註冊的第二個帳號查看第一個帳號的任務或提交其 ID | 列表看不到他人資料，直接操作回傳 404 |
| 任務截止日期 | 截止日已過且尚未完成的任務顯示逾期 |
| 停止並重建容器 | 已有帳號與任務保留 |
| Chrome、Edge，375px／1366px 寬度 | 表單和任務操作可用，鍵盤能切換並操作按鈕 |

驗收記錄（2026 年 11 月 11 日）：在 WSL 的 Docker Compose 環境實測登入、網頁與 API CRUD、兩個帳號的資料隔離，以及重建容器後保留資料。Chrome 和 Edge 均完成鍵盤登入及 375px／1366px 版面檢查。

This verification was performed before the switch to Atlas.

## 提交

| 香港時間 | 工作 |
| --- | --- |
| 2026 年 11 月 29 日 | 完成測試、核對 README 及打包 |
| 2026 年 11 月 30 日 23:59 前 | 由組員在 OLE > Assignment > Group Project 提交 |

將專案檔案複製到 `comp3810sef_groupNo` 資料夾，以實際組別替換 `No`，再壓縮為同名 `.zip`。保留程式、`package.json`、`package-lock.json`、Docker 設定、README 及 `.env.example`。排除 `node_modules`、實際使用的 `.env`、Cookie 暫存檔、`.git`、`.agents`、`.aws`、`.codex`、`.playwright-cli` 及測試輸出。

解壓後確認 ZIP 內的頂層資料夾名稱正確，而且可以按上方步驟設定 `.env` 並啟動專案。
