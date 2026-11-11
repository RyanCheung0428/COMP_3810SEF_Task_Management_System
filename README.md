# TaskFlow 個人任務管理系統

COMP 3810SEF Autumn 2026 Group Project。TaskFlow 讓使用者登入後建立、搜尋、修改和刪除私人任務。Dashboard 顯示任務進度，REST API 也可以操作同一帳號的任務。

## 小組資料

組別：`待填`。提交前請填寫每位組員的姓名、學號和實際分工。

| 組員 | 姓名 | 學號（SID） | 計劃分工 |
| --- | --- | --- | --- |
| 1 | 待填 | 待填 | 登入、登出、Session 及權限檢查 |
| 2 | 待填 | 待填 | MongoDB、資料模型及測試帳號初始化 |
| 3 | 待填 | 待填 | 任務列表、搜尋及篩選 |
| 4 | 待填 | 待填 | 修改、刪除及資料驗證 |
| 5 | 待填 | 待填 | REST API、HTTP 狀態碼及 cURL |
| 6 | 待填 | 待填 | EJS、CSS、Dashboard 及 Docker |

全組共同進行整合測試及展示練習。每位組員應能解釋自己完成的部分。

## 專案檔案

| 檔案或資料夾 | 用途 |
| --- | --- |
| `server.js` | 設定 Express、連接 MongoDB、處理登入及登出、掛載路由及啟動網站 |
| `package.json`、`package-lock.json` | 啟動及初始化指令、套件清單及鎖定版本 |
| `routes/` | 任務網頁、Dashboard 及 API 路由 |
| `models/` | `User` 與 `Task` 的 Mongoose 資料模型 |
| `views/` | EJS 頁面及共用頁首／頁尾 |
| `public/` | CSS 和少量瀏覽器 JavaScript，例如確認刪除 |
| `seed.js`、`scripts/demo.sh` | 測試帳號初始化及 cURL 示範 |
| `task-input.js` | 網頁和 API 共用的任務驗證及搜尋條件 |
| `Dockerfile`、`compose.yaml` | Node.js 24 應用程式及 MongoDB 8.0 服務 |
| `.env.example` | 環境變數範例 |

主要套件包括 Express（路由）、Mongoose（資料庫）、EJS（頁面）、`bcryptjs`（密碼雜湊）、`express-session`（登入 Session）和 `connect-mongo`（Session 儲存）。

### Where to read the code for each feature

| Feature | Follow the request |
| --- | --- |
| Login and logout | `views/login.ejs` submits to `server.js`. The server finds the account through `models/User.js`, checks the password against its stored hash, and records the user ID in the session. Logging out removes the session. |
| Task list and filters | `routes/tasks.js` uses `readTaskFilters` from `task-input.js` to build the search conditions, queries the signed-in user's tasks, then renders `views/tasks.ejs`. |
| Add, edit, and delete tasks | `views/task-form.ejs` submits to `routes/tasks.js`, which validates input in `task-input.js` before writing through `models/Task.js`. `public/forms.js` asks for confirmation before the delete form is sent. |
| Dashboard and overdue labels | `routes/dashboard.js` counts tasks by status for `views/dashboard.ejs`. The task list uses `isOverdue` from `server.js` to compare due dates with today's date in Hong Kong. |
| REST API | `server.js` checks the session before `routes/api.js` handles `/api/tasks`. The routes use the same task model and validation as the web pages, and return JSON. |

## 使用 Docker 啟動

準備可執行 Docker Compose 的環境。在專案資料夾執行：

```sh
cp .env.example .env
openssl rand -hex 32
```

將 `openssl` 產生的 64 個十六進位字元貼到 `.env` 的 `SESSION_SECRET`。設定至少 8 字元且不超過 72 bytes 的 `DEMO_PASSWORD`，例如 `TaskFlowDemo123!`，僅用於示範。

```sh
docker compose up --build -d
docker compose exec app npm run seed
```

開啟 [http://localhost:3000](http://localhost:3000)。使用 `student1` 或 `student2` 登入，兩個帳號的初始密碼都是首次初始化時設定的 `DEMO_PASSWORD`。重複執行 `seed` 會保留已有帳號及任務。

| 環境變數 | 用途 |
| --- | --- |
| `PORT` | 網站連接埠，預設 `3000` |
| `MONGODB_URI` | 資料庫連線，Compose 使用服務名稱 `mongo` |
| `SESSION_SECRET` | Session Cookie 的簽署密鑰 |
| `DEMO_PASSWORD` | 初始化測試帳號的密碼 |
| `COOKIE_SECURE` | HTTP 示範使用 `false`；HTTPS 使用 `true` |
| `TRUST_PROXY` | 直接連線使用 `false`；在可信的單層反向代理後使用 `true` |

MongoDB 只在 Compose 網絡內連線，資料放在 Docker volume。使用 `docker compose logs app` 查看網站日誌，使用 `docker compose down` 停止服務並保留資料。`docker compose down -v` 會一併刪除 volume 內的帳號和任務。

## 網頁操作

1. **登入。** 開啟 `/login`，輸入測試帳號的 Username 和 Password，然後按 **Log in**。未登入訪問任務頁會返回登入頁。
2. **新增。** 在 Tasks 頁按 **Add task**，輸入 Title，並選擇填寫 Description、Status、Priority、Category 和 Due date，再按 **Save task**。預設狀態為 Pending，優先級為 Medium。
3. **查看及搜尋。** Tasks 頁按最新建立時間排序。可同時輸入標題關鍵字、Status 和 Priority。結果必須符合所有已填條件。按 **Clear filters** 恢復完整列表。
4. **修改及刪除。** 按任務上的 **Edit** 修改資料。按 **Delete** 後確認刪除，或取消以保留任務。
5. **查看進度。** 在 **Dashboard** 查看任務總數、各狀態數量及完成率。尚未完成且截止日早於香港當天日期的任務顯示逾期。
6. **登出。** 按 **Log out**。再開啟任務頁時需要重新登入。

## REST API 及 cURL 示範

API 和網頁使用同一套私人任務及登入 Session。GET 可使用 `title`、`status`、`priority` 組合篩選。POST 和 PUT 接收 JSON，PUT 保留未提交的欄位。可編輯欄位為 `title`、`description`、`status`、`priority`、`category`、`dueDate`。日期輸入格式為 `YYYY-MM-DD`，可用空字串或 `null` 清除。JSON 回傳日期採 ISO 格式。

| 方法及路徑 | 成功回應 |
| --- | --- |
| `GET /api/tasks` | `200`，任務 JSON 陣列 |
| `POST /api/tasks` | `201`，新增的任務 |
| `PUT /api/tasks/:id` | `200`，更新後的任務 |
| `DELETE /api/tasks/:id` | `200`，包含 `message` 的 JSON |

錯誤回傳 JSON `error`，欄位驗證錯誤可附上 `fields`。常見狀態包括 `400` 輸入或 ID 無效、`401` 未登入、`403` CSRF token 不符、`404` 任務不存在或不屬於自己、`500` 伺服器錯誤。

可直接執行 `bash scripts/demo.sh`，按提示輸入測試密碼，依次示範新增、篩選、修改及刪除。以下是相同流程的 cURL 指令，可逐段執行。

先讀取登入頁的 CSRF token，提交登入表單後保存新 Cookie。登入會更新 Session，因此再從 `/tasks` 讀取 API 寫入所需的 token。

```bash
BASE_URL=http://localhost:3000
COOKIE_JAR=$(mktemp)
read -r -s -p 'student1 password: ' DEMO_PASSWORD
printf '\n'

LOGIN_TOKEN=$(curl -fsS -c "$COOKIE_JAR" "$BASE_URL/login" |
  sed -n 's/.*name="_csrf" value="\([^"]*\)".*/\1/p' | head -n 1)

curl -fsS -o /dev/null -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  --data-urlencode "username=student1" \
  --data-urlencode "password=$DEMO_PASSWORD" \
  --data-urlencode "_csrf=$LOGIN_TOKEN" "$BASE_URL/login"
unset DEMO_PASSWORD

CSRF_TOKEN=$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/tasks" |
  sed -n 's/.*name="_csrf" value="\([^"]*\)".*/\1/p' | head -n 1)
```

新增任務並從回應保存 `_id`：

```bash
TASK=$(curl -fsS -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $CSRF_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"cURL demo task","status":"Pending","priority":"High"}' \
  "$BASE_URL/api/tasks")
printf '%s\n' "$TASK"
TASK_ID=$(printf '%s\n' "$TASK" | sed -n 's/.*"_id":"\([0-9a-f]\{24\}\)".*/\1/p')
```

讀取、修改及刪除剛才的示範任務：

```bash
curl -fsS -G -b "$COOKIE_JAR" \
  --data-urlencode 'title=cURL demo task' \
  --data-urlencode 'status=Pending' --data-urlencode 'priority=High' \
  "$BASE_URL/api/tasks"

curl -fsS -X PUT -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $CSRF_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"Completed"}' "$BASE_URL/api/tasks/$TASK_ID"

curl -fsS -X DELETE -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $CSRF_TOKEN" "$BASE_URL/api/tasks/$TASK_ID"

curl -fsS -o /dev/null -b "$COOKIE_JAR" \
  --data-urlencode "_csrf=$CSRF_TOKEN" "$BASE_URL/logout"
rm -f "$COOKIE_JAR"
```

## 驗收清單

| 測試 | 預期結果 |
| --- | --- |
| 未登入訪問 `/tasks`、`/dashboard` 或 API | 網頁轉到登入頁，API 回傳 401 |
| 輸入錯誤密碼、登入後登出 | 錯誤密碼不能登入，登出後舊 Session 不能再使用 |
| 新增、搜尋、編輯及刪除任務 | 各步驟成功，搜尋同時套用所有條件，取消確認會保留任務 |
| 空白或過長標題、無效日期、錯誤狀態 | 顯示錯誤，資料不會被儲存 |
| 標題含 `<`、`>` 或 `&` | 顯示為文字 |
| 使用 `student2` 查看 `student1` 的任務或提交其 ID | 列表看不到他人資料，直接操作回傳 404 |
| Dashboard 與截止日期 | 空帳號完成率為 0%，數量與任務一致，已完成任務不顯示逾期 |
| 執行 cURL 示範 | POST、GET、PUT、DELETE 依序回傳 201、200、200、200 |
| 重複 seed，停止並重建容器 | 已有帳號與任務保留 |
| Chrome、Edge，375px／1366px 寬度 | 表單和任務操作可用，鍵盤能切換並操作按鈕 |

驗收記錄（2026 年 11 月 11 日）：在 WSL 的 Docker Compose 環境實測登入、網頁與 API CRUD、兩個帳號的資料隔離，以及重建容器後保留資料。cURL 示範回傳 201、200、200、200。Chrome 和 Edge 均完成鍵盤登入及 375px／1366px 版面檢查。

## 展示及提交

10 分鐘展示可分為 1 分鐘介紹項目、組別及分工，1 分鐘啟動網站，5 分鐘展示登入、任務 CRUD、搜尋、Dashboard 及登出，3 分鐘執行已準備的 cURL 指令。

| 香港時間 | 工作 |
| --- | --- |
| 2026 年 11 月 16 日 23:59 前 | 按課程安排登記展示時段 |
| 2026 年 11 月 29 日 | 完成測試、核對 README 及打包 |
| 2026 年 11 月 30 日 23:59 前 | 由組員在 OLE > Assignment > Group Project 提交 |

將專案檔案複製到 `comp3810sef_groupNo` 資料夾，以實際組別替換 `No`，再壓縮為同名 `.zip`。保留程式、`package.json`、`package-lock.json`、Docker 設定、README 及 `.env.example`。排除 `node_modules`、實際使用的 `.env`、Cookie 暫存檔、`.git`、`.agents`、`.aws`、`.codex`、`.playwright-cli` 及測試輸出。

解壓後確認 ZIP 內的頂層資料夾名稱正確，而且可以按上方步驟設定 `.env` 並啟動專案。
