# TaskFlow 個人任務管理系統

[English](./README.md)

COMP 3810SEF 2026 年秋季學期小組專題。TaskFlow 讓使用者登入後建立、查看、修改和刪除私人任務。REST API 也可以操作同一帳號的任務。

## 小組資料

小組編號 `待填`。

| 組員 | 姓名 | 學號（SID） | 分工及講解文檔 |
| --- | --- | --- | --- |
| 1 | 待填 | 待填 | [登入、登出、Session 及權限檢查](./docs/member-01-auth-session.md) |
| 2 | 待填 | 待填 | [註冊及重設密碼](./docs/member-02-registration-password-reset.md) |
| 3 | 待填 | 待填 | [任務列表、搜尋、篩選、完成及重開任務](./docs/member-03-task-list-status.md) |
| 4 | 待填 | 待填 | [新增、編輯、刪除任務、資料驗證及 cURL 示範](./docs/member-04-task-write-curl.md) |
| 5 | 待填 | 待填 | [全站前端 CSS 及響應式樣式](./docs/member-05-frontend-css.md) |
| 6 | 待填 | 待填 | [Google Cloud Run 部署](./docs/member-06-cloud-run-deployment.md) |

## 專案檔案

| 檔案 | 用途 |
| --- | --- |
| [`server.js`](./server.js) | 啟動 Express、連接 MongoDB，並設定 Session、EJS 和路由。 |
| [`package.json`](./package.json) | 定義 `npm start` 及直接相依套件 `bcryptjs`、`connect-mongo`、`dotenv`、`ejs`、`express`、`express-session`、`mongodb`、`mongoose`、`passport`、`passport-local`。 |
| [`public/forms.js`](./public/forms.js) | 呼叫 API、處理表單及更新任務列表。 |
| [`public/styles.css`](./public/styles.css) | 設定頁面版面、表單和任務列表樣式。 |
| [`views/login.ejs`](./views/login.ejs) | 顯示登入表單。 |
| [`views/register.ejs`](./views/register.ejs) | 顯示註冊表單。 |
| [`views/forgot-password.ejs`](./views/forgot-password.ejs) | 顯示重設密碼表單。 |
| [`views/tasks.ejs`](./views/tasks.ejs) | 提供任務列表、狀態統計和操作按鈕的模板。 |
| [`views/task-form.ejs`](./views/task-form.ejs) | 提供新增及編輯任務的共用表單。 |
| [`views/error.ejs`](./views/error.ejs) | 顯示錯誤狀態和訊息。 |
| [`views/header.ejs`](./views/header.ejs) | 提供共用頁首，載入 CSS 和 JavaScript。 |
| [`views/footer.ejs`](./views/footer.ejs) | 結束共用的頁面標籤。 |
| [`models/User.js`](./models/User.js) | 定義帳戶資料模型，包括使用者名稱、密碼雜湊和登入版本。 |
| [`models/Task.js`](./models/Task.js) | 定義任務資料模型，包括擁有者、標題、描述、狀態和截止日期。 |

其他檔案與內部請求流程可參閱[專案架構](./docs/architecture.md)。

## 網頁操作

在本機以 Docker Compose 啟動 TaskFlow 後，如使用預設連接埠，請瀏覽 `http://localhost:3000`。雲端版本完成上線驗收後，可使用 Cloud Run 提供的公開 HTTPS 網址。 [本機啟動指引](./docs/setup.md) · [Cloud Run 部署指引](./docs/member-06-cloud-run-deployment.md)

1. **登入。** 在 `/register` 填寫自選的 **Username** 和 **Password**，按 **Create account** 建立測試帳戶。在 `/login` 輸入同一組帳密，按 **Log in** 進入 **Tasks**。
2. **新增。** 按 **+ Add task**，填寫 **Title**，可選填 **Description** 和 **Due date**，再按 **Save task**。
3. **查看與排序。** 在 **Tasks** 頁查看任務。可用 **Search** 同時搜尋標題、描述或截止日期（支援部分日期，例如 `11` 或 `30`），用 **Sort** 切換 **Newest**／**Date** 排序，再按 **In progress** 或 **Completed** 按狀態查看結果。未完成且已逾期或 7 天內到期的任務會顯示對應提示標籤（**Overdue**、**Due today**、**Due tomorrow**、**Due in X days**）。
4. **修改。** 在任務的 **⋯** 選單按 **Edit**，修改欄位後按 **Save task**。
5. **刪除。** 在任務的 **⋯** 選單按 **Delete**，並確認刪除。
6. **登出。** 按 **Log out** 回到登入頁。

## REST API

先以 JSON 登入，保存伺服器發出的 Session Cookie。讀取及修改任務時帶上這個 Cookie。`POST` 和 `PUT` 使用 `Content-Type: application/json`，登出時送出 `{}`。

| HTTP 方法 | URI | 用途 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 註冊帳戶 |
| `POST` | `/api/auth/login` | 登入並建立 Session |
| `POST` | `/api/auth/reset-password` | 重設密碼 |
| `POST` | `/api/auth/logout` | 登出 |
| `POST` | `/api/tasks` | 新增任務 |
| `GET` | `/api/tasks` | 查詢任務清單 |
| `GET` | `/api/tasks/:id` | 查詢單筆任務 |
| `PUT` | `/api/tasks/:id` | 修改任務 |
| `DELETE` | `/api/tasks/:id` | 刪除任務 |

欄位規則、回應格式及錯誤碼可參閱 [API 參考](./docs/api-reference.md)。

### cURL 示範

先啟動 TaskFlow，並在 `/register` 建立示範帳戶。如果用雲端示範，把每條指令的 `http://localhost:3000` 換成服務的 HTTPS 網址。

#### 上台前登入一次

把下面的帳號和密碼換成自己的示範帳密，在自己的工作資料夾執行一次。`-c cookies.txt` 會把登入 Cookie 存在這個資料夾。

```bash
curl -sS -w '\n' -X POST -c cookies.txt -H 'Content-Type: application/json' -d '{"username":"你的示範帳號","password":"你的示範密碼"}' http://localhost:3000/api/auth/login
```

看到 `{"message":"Signed in."}` 就代表登入成功。

#### 課堂示範的四條指令

在同一個資料夾逐句執行以下四條指令。每句都用 `-b cookies.txt` 帶上登入 Cookie，按一次 Enter 就會顯示一行 JSON。

**1. 新增任務（POST）。** 複製回應中的 `_id`。新任務的狀態是 `In Progress`。

```bash
curl -sS -w '\n' -X POST -b cookies.txt -H 'Content-Type: application/json' -d '{"title":"Demo task"}' http://localhost:3000/api/tasks
```

**2. 讀取任務清單（GET）。** 在回傳的陣列中找出 `Demo task`，核對它的 `_id`。

```bash
curl -sS -w '\n' -X GET -b cookies.txt http://localhost:3000/api/tasks
```

**3. 更新任務（PUT）。** 把網址中的 `TASK_ID` 換成第一步的 `_id`。回應中的狀態會變成 `Completed`。

```bash
curl -sS -w '\n' -X PUT -b cookies.txt -H 'Content-Type: application/json' -d '{"status":"Completed"}' http://localhost:3000/api/tasks/TASK_ID
```

**4. 刪除任務（DELETE）。** 把 `TASK_ID` 換成同一個 `_id`。成功會顯示 `{"message":"Task deleted."}`。

```bash
curl -sS -w '\n' -X DELETE -b cookies.txt http://localhost:3000/api/tasks/TASK_ID
```

<details>
<summary>選用的完整 API 驗收（Bash 和 jq）</summary>

這段程式也會按 ID 查詢任務、核對更新後保留的描述、確認刪除後查詢回傳 `404`，最後登出。使用其他網址時，先把 `BASE` 設為該服務的完整網址。

```bash
(
  set -euo pipefail
  BASE=${BASE:-http://localhost:3000}
  BASE=${BASE%/}

  IFS= read -r -p '測試帳戶使用者名稱：' USERNAME
  IFS= read -r -s -p '密碼：' PASSWORD
  printf '\n'

  DEMO_DIR=$(mktemp -d)
  COOKIE_JAR="$DEMO_DIR/cookies.txt"
  BODY="$DEMO_DIR/response.json"
  trap 'rm -f -- "$COOKIE_JAR" "$BODY"; rmdir -- "$DEMO_DIR"' EXIT
  touch "$COOKIE_JAR"

  api_call() {
    local expected=$1 method=$2 path=$3 status
    shift 3
    status=$(curl -sS -o "$BODY" -w '%{http_code}' \
      -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X "$method" "$@" "$BASE$path")
    printf '%s %s → HTTP %s\n' "$method" "$path" "$status"
    if [[ $status != "$expected" ]]; then
      printf '預期 HTTP %s，收到 HTTP %s。\n' "$expected" "$status" >&2
      cat "$BODY" >&2
      return 1
    fi
  }

  # 直接以 JSON 登入，將回傳的 Session Cookie 存入 Cookie jar。
  printf '%s\n' "$USERNAME" "$PASSWORD" \
    | jq -Rnc '{username: input, password: input}' \
    | api_call 200 POST /api/auth/login \
        -H 'Content-Type: application/json' --data-binary @-
  unset PASSWORD

  # Create：新增任務並保存回應內的 ID，確認預設狀態為 In Progress。
  api_call 201 POST /api/tasks \
    -H 'Content-Type: application/json' \
    --data '{"title":"cURL CRUD demo","description":"Keep this description"}'
  TASK_ID=$(jq -ej '._id | select(type == "string" and test("^[0-9a-fA-F]{24}$"))' "$BODY")
  jq -e 'select(.status == "In Progress")' "$BODY"

  # Read：從列表回應取出示範任務，再用 ID 查詢單筆任務。
  api_call 200 GET /api/tasks
  jq -e --arg id "$TASK_ID" '.[] | select(._id == $id)' "$BODY"
  api_call 200 GET "/api/tasks/$TASK_ID"
  jq -e --arg id "$TASK_ID" 'select(._id == $id)' "$BODY"

  # Update：只提交標題和狀態，檢查未提交的描述仍然保留。
  api_call 200 PUT "/api/tasks/$TASK_ID" \
    -H 'Content-Type: application/json' \
    --data '{"title":"cURL CRUD demo updated","status":"Completed"}'
  jq -e --arg id "$TASK_ID" 'select(._id == $id and .title == "cURL CRUD demo updated"
    and .status == "Completed" and .description == "Keep this description")' "$BODY"

  # Delete：刪除本次新增的任務，再確認同一個 ID 已查不到。
  api_call 200 DELETE "/api/tasks/$TASK_ID"
  jq -e 'select(.message == "Task deleted.")' "$BODY"
  api_call 404 GET "/api/tasks/$TASK_ID"
  jq . "$BODY"

  api_call 204 POST /api/auth/logout -H 'Content-Type: application/json' --data '{}'
)
```

</details>

[驗收及提交指引](./docs/submission-checklist.md)