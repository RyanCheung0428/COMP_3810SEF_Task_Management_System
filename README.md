# TaskFlow 個人任務管理系統

COMP 3810SEF 2026 年秋季學期小組專題。TaskFlow 讓使用者登入後建立、查看、修改和刪除私人任務。REST API 也可以操作同一帳號的任務。

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

### 伺服器與路由

| 檔案 | 用途 |
| --- | --- |
| [`server.js`](./server.js) | 啟動 Express、連接 MongoDB，並設定 EJS、靜態資源、MongoDB Session store、Passport 和路由。 |
| [`routes/auth.js`](./routes/auth.js) | 使用 Passport 驗證帳號密碼及恢復登入狀態，並提供註冊、登出及 CSRF 驗證碼端點。 |
| [`routes/tasks.js`](./routes/tasks.js) | 為任務列表、新增及編輯網址渲染 EJS 頁面。瀏覽器透過 REST API 取得私人任務。 |
| [`routes/api.js`](./routes/api.js) | 處理任務的查詢、新增、修改和刪除，依 Passport 驗證後的使用者 ID 限制操作範圍。 |

### 資料模型與輸入驗證

| 檔案 | 用途 |
| --- | --- |
| [`models/User.js`](./models/User.js) | 定義帳戶的使用者名稱、密碼雜湊值和建立時間。使用者名稱有唯一索引，登入時會明確讀取預設隱藏的密碼雜湊。 |
| [`models/Task.js`](./models/Task.js) | 定義任務欄位、預設值、驗證規則和時間戳記。`userId` 記錄任務的擁有者，建立後固定。任務路由透過此模型讀寫資料。`userId` 與 `createdAt` 的複合索引支援按帳戶查詢及由新至舊排序。 |
| [`task-input.js`](./task-input.js) | 提供任務預設值和狀態，驗證任務欄位及標題和狀態篩選。截止日期以 UTC 午夜儲存。 |

### 網頁模板與瀏覽器資源

| 檔案 | 用途 |
| --- | --- |
| [`views/login.ejs`](./views/login.ejs) | 顯示登入表單、登入錯誤、註冊成功訊息和建立帳戶的連結。 |
| [`views/register.ejs`](./views/register.ejs) | 顯示建立帳戶的表單和註冊錯誤。 |
| [`views/tasks.ejs`](./views/tasks.ejs) | 提供狀態統計、任務列表和各項任務操作的模板。 |
| [`views/task-form.ejs`](./views/task-form.ejs) | 提供新增及編輯任務共用表單，以及顯示欄位錯誤的位置。 |
| [`views/error.ejs`](./views/error.ejs) | 顯示錯誤狀態碼、訊息和返回系統的連結。 |
| [`views/partials/header.ejs`](./views/partials/header.ejs) | 各頁共用的頁首模板，設定網頁標題、載入 `styles.css` 和 `forms.js`，並開啟主要內容區。登入後會顯示任務列表連結和登出表單。 |
| [`views/partials/footer.ejs`](./views/partials/footer.ejs) | 各頁在內容末端引入此模板，結束頁首模板開啟的 `<main>`、`<body>` 和 `<html>` 標籤。 |
| [`public/forms.js`](./public/forms.js) | 透過同源 Session Cookie 和 CSRF 驗證碼提交 JSON 表單，載入及顯示任務、分類計數和欄位錯誤。截止日期以香港時間判斷是否逾期。 |
| [`public/styles.css`](./public/styles.css) | 由共用頁首載入的樣式表，控制表單、按鈕、任務列表和錯誤訊息的外觀。它設定鍵盤焦點樣式，並按螢幕寬度調整間距。 |

### 專案設定與部署

| 檔案 | 用途 |
| --- | --- |
| [`package.json`](./package.json) | 宣告專案的 Node.js 版本要求及 Express、Mongoose、EJS 等相依套件。`npm start` 會執行 `server.js`。 |
| [`package-lock.json`](./package-lock.json) | 記錄直接及間接相依套件的確切版本、下載來源和完整性資料。Docker 建置時用 `npm ci` 按這份清單安裝套件。 |
| [`Dockerfile`](./Dockerfile) | 定義如何建置應用程式映像檔。它採用 `node:24-bookworm-slim`，用 `npm ci --omit=dev` 安裝套件，複製專案檔案，並以低權限的 `node` 使用者執行 `npm start`。 |
| [`compose.yaml`](./compose.yaml) | 定義 Docker Compose 的 `app` 服務。它指定映像檔的建置位置，把環境變數傳入容器，並將主機 `127.0.0.1` 的指定連接埠對應到容器內的 `3000`。 |
| [`.env.example`](./.env.example) | 提供環境變數的名稱、註解和預設值。首次設定時，以這份範本建立 `.env`，填妥 Atlas 連線和其他執行設定，供 Docker Compose 載入。 |
| [`.dockerignore`](./.dockerignore) | 指定 Docker 建置時排除的項目，例如 `.env`、`.env.*`、本機 `node_modules` 和 `.git`。`Dockerfile` 執行 `COPY` 時只會取得建置內容中的檔案。 |
| [`.gitignore`](./.gitignore) | 定義 Git 對本機設定、套件資料夾及部分本機產生的檔案的忽略規則。`.env.example` 有例外規則，讓環境變數範本可納入版本控制。 |

## 請求流程

1. 登入頁從 `GET /api/auth/csrf` 取得驗證碼，並以 JSON 將帳號密碼送到 `POST /api/auth/login`。Passport Local strategy 以 bcrypt 核對現有密碼雜湊。
2. 登入成功後，Passport 建立新的 Session，將使用者 ID 存到 MongoDB。瀏覽器收到有效期兩小時的 `HttpOnly`、`SameSite=Lax` Cookie，並在同源請求中帶上它。
3. Passport 根據 Session 恢復帳戶身分，任務路由按使用者 ID 存取資料。寫入請求透過 `X-CSRF-Token` 提交目前 Session 的驗證碼。登出會銷毀 Session 並清除 Cookie。

## 使用 Docker 與 MongoDB Atlas 啟動

Docker Compose 負責建置和啟動 TaskFlow，帳戶、任務和登入 Session儲存在 MongoDB Atlas 的 `taskflow` 資料庫。

1. 在 Atlas 專案中建立專用資料庫帳戶，授予 `taskflow` 資料庫的 `readWrite` 角色。連線字串須使用此帳戶。[Atlas 資料庫帳戶](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
2. 在專案的 IP 存取清單中，加入 Docker 主機連線至 Atlas 時使用的公用 IP 位址。[Atlas IP 存取清單](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
3. 在叢集的 `Connect → Drivers` 畫面複製連線字串，將帳戶及密碼的佔位文字替換為實際資料。帳密中的保留字元須使用百分比編碼。在 `?` 前指定 `/taskflow`。[取得 Atlas 驅動程式連線字串](https://www.mongodb.com/docs/atlas/driver-connection/)

若尚未建立 `.env`，請從範本複製。

```sh
test -f .env || cp .env.example .env
```

將 Atlas 連線字串填入 `.env` 的 `MONGODB_URI`，並保留 Atlas 提供的查詢選項。下例使用佔位文字。

```dotenv
MONGODB_URI=mongodb+srv://<db-user>:<encoded-db-password>@<cluster-host>/taskflow?retryWrites=true&w=majority
```

以 `openssl rand -hex 32` 產生新的 `SESSION_SECRET`，將結果填入 `.env`。容器重建時沿用同一密鑰，未過期的 Session 才能繼續使用。

若需要把本機資料搬到 Atlas，請一起搬移帳戶與任務並保留原有 ID。在 Atlas 核對匯入結果前，請保留本機副本。

| 環境變數 | 用途 |
| --- | --- |
| `PORT` | 主機的連接埠，預設為 `3000`。Compose 綁定主機的 `127.0.0.1`，並將該連接埠對應至容器內的 `3000`。 |
| `MONGODB_URI` | 指定 `taskflow` 資料庫的 Atlas 連線字串。 |
| `SESSION_SECRET` | 簽署 Session Cookie 的密鑰，使用 64 個隨機十六進位字元。 |
| `COOKIE_SECURE` | 預設 `false`，供本機 HTTP 使用。透過 HTTPS 提供服務時設為 `true`。 |
| `TRUST_PROXY` | 預設 `false`。由單一受信任反向代理終止 HTTPS 時設為 `true`。 |

執行下列指令啟動專案。

```sh
docker compose up --build -d
```

Compose 依 `Dockerfile` 建置映像檔並啟動 `app` 容器。容器以 `npm start` 執行 `server.js`，伺服器連上 Atlas 並完成帳戶集合的唯一索引初始化後才開始接收請求。

使用預設連接埠時，開啟[本機 TaskFlow](http://localhost:3000)。前往 `/register` 建立帳戶，也可用已匯入的帳戶登入。

可用 `docker compose logs app` 檢查啟動紀錄，並用 `docker compose down` 停止服務。停止或重建容器後，資料仍保存在 Atlas。

### 在 Atlas 瀏覽資料

在 Atlas 專案開啟 `Database → Data Explorer`，展開已連線的叢集和 `taskflow` 資料庫，再開啟 `users`、`tasks` 或 `sessions` 檢視資料。應用程式建立或匯入資料後，相應的集合便會出現。[瀏覽 Atlas 集合](https://www.mongodb.com/docs/atlas/atlas-ui/collections/)

## 網頁操作

1. **登入。** 先在 `/register` 建立帳號，然後開啟 `/login`，輸入帳號的 Username 和 Password，然後按 **Log in** 進入 Tasks 頁。未登入訪問任務頁會返回登入頁。
2. **新增。** 在 Tasks 頁按 **Add task** 進入獨立表單頁。輸入 Title，可選填 Description 和 Due date，然後按 **Save task**。新任務預設為進行中。
3. **查看及搜尋。** 主頁預設顯示全部未完成任務，最新建立的排在最前。在 **Search by title** 輸入標題關鍵字，停止輸入 300 毫秒後即時搜尋；按 Enter 可立即搜尋，按框內的清除按鈕恢復完整清單。搜尋不分大小寫。按 **Completed** 或 **In progress** 可在搜尋結果中切換狀態，兩張狀態卡顯示符合關鍵字的任務數量。搜尋條件保存在網址中，重新整理及新增／編輯後返回時仍會保留。
4. **更新任務。** 按任務左側的勾選按鈕完成或重新開啟任務。從右側的 **⋯** 選單選 **Edit** 進入獨立編輯頁，或選 **Delete** 並確認刪除。
5. **查看逾期任務。** 任務頁會為尚未完成且截止日早於香港當天日期的任務顯示 **Overdue**。
6. **登出。** 按 **Log out**。再開啟任務頁時需要重新登入。

## REST API

任務 API 及登出需要 Session Cookie。登入、註冊、登出及任務寫入需要 `X-CSRF-Token`。任務列表可使用 `title` 和 `status` 組合篩選。POST 和 PUT 接收 JSON，PUT 保留未提交的欄位。可編輯欄位為 `title`、`description`、`status`、`dueDate`。`status` 接受 `In Progress` 和 `Completed`，POST 省略時預設為 `In Progress`。日期輸入格式為 `YYYY-MM-DD`，可用空字串或 `null` 清除。JSON 回傳日期採 ISO 格式。

| 方法及路徑 | 成功回應 |
| --- | --- |
| `GET /api/auth/csrf` | `200`，目前 Session 的 `csrfToken` |
| `POST /api/auth/register` | `201`，註冊成功訊息 |
| `POST /api/auth/login` | `200`，登入成功訊息及新的 Session Cookie |
| `POST /api/auth/logout` | `204`，銷毀 Session 並清除 Cookie |
| `GET /api/tasks/:id` | `200`，指定的任務 |
| `GET /api/tasks` | `200`，任務 JSON 陣列 |
| `POST /api/tasks` | `201`，新增的任務 |
| `PUT /api/tasks/:id` | `200`，更新後的任務 |
| `DELETE /api/tasks/:id` | `200`，包含 `message` 的 JSON |

登入及註冊接收含 `username` 和 `password` 的 JSON。此範例用 `jq` 讀取驗證碼，並用暫存檔保存 Cookie。

```sh
BASE=http://localhost:3000
COOKIE_JAR=$(mktemp)
CSRF=$(curl -fsS -c "$COOKIE_JAR" "$BASE/api/auth/csrf" | jq -r .csrfToken)
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  --data '{"username":"your-username","password":"your-password"}'

curl -fsS -b "$COOKIE_JAR" "$BASE/api/tasks"
CSRF=$(curl -fsS -b "$COOKIE_JAR" "$BASE/api/auth/csrf" | jq -r .csrfToken)
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/auth/logout" \
  -H "X-CSRF-Token: $CSRF"
rm -f "$COOKIE_JAR"
```

錯誤回傳 JSON `error`，欄位驗證錯誤可附上 `fields`。常見狀態包括 `400` 輸入或 ID 無效、`401` 未登入或帳號密碼錯誤、`403` CSRF 驗證碼缺失或無效、`404` 任務不存在或不屬於該帳戶、`409` 使用者名稱重複、`415` 登入或註冊的請求格式非 JSON，以及 `500` 伺服器錯誤。

切換後，現有帳戶和任務可直接沿用，使用者需重新登入。若 `sessions` 集合已刪除，Session store 會重新建立。舊的 `accesstokens` 紀錄由原有 TTL 索引清理。

## 驗收清單

| 測試 | 預期結果 |
| --- | --- |
| 未登入訪問 `/tasks` 或 API | 網頁轉到登入頁，API 回傳 401 |
| 輸入錯誤密碼、登入後登出 | 錯誤密碼不能登入，登出後使用舊 Cookie 回傳 `401` |
| 新增、編輯、完成、重新開啟及刪除任務 | 列表可在未完成及已完成之間切換，取消刪除會保留任務 |
| 空白或過長標題、無效日期、錯誤狀態 | 顯示錯誤，資料不會被儲存 |
| 標題含 `<`、`>` 或 `&` | 顯示為文字 |
| 使用自行註冊的第二個帳號查看第一個帳號的任務或提交其 ID | 列表看不到他人資料，直接操作回傳 404 |
| 任務截止日期 | 截止日已過且尚未完成的任務顯示逾期 |
| 停止並重建容器 | 已有帳號與任務保留，未過期的登入仍有效 |
| Chrome、Edge，375px／1366px 寬度 | 表單和任務操作可用，鍵盤能切換並操作按鈕 |

## 提交

| 香港時間 | 工作 |
| --- | --- |
| 2026 年 11 月 29 日 | 完成測試、核對 README 及打包 |
| 2026 年 11 月 30 日 23:59 前 | 由組員在 `OLE → Assignment → Group Project` 提交 |

將專案檔案複製到 `comp3810sef_groupNo` 資料夾，以實際組別替換 `No`，再壓縮為同名 `.zip`。保留程式、`package.json`、`package-lock.json`、Docker 設定、README 及 `.env.example`。排除 `node_modules`、實際使用的 `.env`、`.git`、`.agents`、`.aws`、`.codex`、`.playwright-cli` 及測試輸出。

解壓後確認 ZIP 內的頂層資料夾名稱正確，而且可以按上方步驟設定 `.env` 並啟動專案。
