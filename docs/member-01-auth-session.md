# 組員 1｜登入、登出、Session 及權限檢查

## 負責範圍

負責登入、登出及存取控制，包括登入表單、帳密核對、Cookie 和 Session，以及受保護頁面和 API 的登入檢查。組員 2 負責註冊及重設密碼，組員 6 負責 Cloud Run 的 HTTPS 及執行設定。 [帳戶流程](./member-02-registration-password-reset.md) · [Cloud Run 部署](./member-06-cloud-run-deployment.md)

## 程式碼地圖

| 檔案 | 在流程中的工作 |
| --- | --- |
| `views/login.ejs`、`views/header.ejs` | 登入表單以 `data-auth="login"` 標記及指定 API 路徑。共用頁首載入 `forms.js`，並提供登入後使用的登出表單。[登入表單](../views/login.ejs#L6) · [共用頁首](../views/header.ejs#L8) |
| `public/forms.js` | `initialize()` 判斷當前頁面，`handleForm()` 接管提交，`request()` 處理 Cookie、JSON 和回應。[啟動](../public/forms.js#L289) · [表單](../public/forms.js#L46) · [請求](../public/forms.js#L25) |
| `server.js` | 設定 Session store 和 Passport 中介軟件，將網站頁面、任務 API 和帳戶 API 分派到各自的路由。[中介軟件與路由掛載](../server.js#L46) |
| `routes/auth.js`、`models/User.js` | 用 User 模型核對帳密和登入版本，檢查 API 寫入請求，處理登入及登出。[Passport 設定](../routes/auth.js#L28) · [寫入檢查](../routes/auth.js#L55) · [登入及登出](../routes/auth.js#L104) · [帳戶欄位](../models/User.js#L4) |
| `routes/tasks.js`、`routes/api.js` | 頁面路由提供任務模板，API 用已登入的 `req.user.id` 找出該帳戶的任務。[頁面路由](../routes/tasks.js#L33) · [任務 API 查詢](../routes/api.js#L18) |

## 操作及請求流程

```mermaid
sequenceDiagram
    participant B as 瀏覽器 forms.js
    participant S as server.js
    participant A as routes/auth.js
    participant D as MongoDB
    B->>S: POST /api/auth/login 傳送 JSON 帳密
    S->>A: 檢查寫入來源及 JSON 格式
    A->>D: 用 User 模型查帳戶並取得密碼雜湊
    A-->>S: 核對成功及更新 Session
    S->>D: 保存新 Session
    S-->>B: 200 及新 Session Cookie
    B->>S: GET /tasks 帶新 Cookie
    S->>D: 取回 Session 並按使用者 ID 查帳戶
    S-->>B: 驗證通過後渲染任務頁
```

### 1. 伺服器先處理 Session，再選擇路由

Express 在靜態資源之後設定 `Cache-Control: no-store`，再依序執行 `express-session`、`passport.initialize()` 和 `passport.session()`。瀏覽器的 `taskflow.sid` Cookie 帶有使用 `SESSION_SECRET` 簽署的 Session ID。伺服器透過 `MongoStore` 用這個 ID 找回 Session 資料。`saveUninitialized: false` 讓初次開啟登入頁時略過寫入空的訪客 Session。`resave: false` 讓未修改的 Session 省去完整重寫。Cookie 設為 `HttpOnly`、`SameSite=Lax` 和兩小時有效期，`Secure` 由 `COOKIE_SECURE` 控制。 [中介軟件次序](../server.js#L43) · [Cookie 選項](../routes/auth.js#L8)

`GET /` 依登入狀態轉往 `/tasks` 或 `/login`。`guestPage()` 為訪客渲染登入、註冊或重設密碼頁，已登入的使用者開啟這些網址會轉往任務頁。`/dashboard` 通過頁面登入檢查後也轉往 `/tasks`。[頁面入口](../server.js#L65)

### 2. 瀏覽器組裝登入請求

1. `initialize()` 找到訪客表單時交給 `initializeGuestForm()`。該函式以 `FormData` 讀取欄位，將表單的 `action` 傳入 `request()`。共用的 `handleForm()` 取消原生提交、暫停提交按鈕避免重複請求，在 `finally` 恢復按鈕。[頁面初始化](../public/forms.js#L289) · [訪客表單](../public/forms.js#L63) · [提交處理](../public/forms.js#L46)
2. `request()` 用 `Content-Type: application/json` 把帳密直接送到 `POST /api/auth/login`。第一次登入時，瀏覽器可以從沒有 Cookie 的狀態開始。 [前端請求](../public/forms.js#L25)
3. `POST /api/auth/login` 先用 `checkApiWrite()` 檢查瀏覽器提供的 `Sec-Fetch-Site` 及 JSON 內容類型，再解析最多 16 KB 的 JSON。登入路由去除使用者名稱首尾空格，確認名稱有 1 至 64 個字元，密碼為非空且最多 72 位元組的字串，然後交給 Passport Local strategy。策略透過 `User.findOne()` 明確選取 `passwordHash`，用 `bcrypt.compare()` 核對原始密碼輸入。[登入路由](../routes/auth.js#L104) · [請求驗證](../routes/auth.js#L55) · [使用者名稱規則](../routes/auth.js#L19) · [Passport Local strategy](../routes/auth.js#L28)
4. Passport 的 `req.logIn()` 建立新的 Session，`serializeUser()` 存入 `user.id`。登入路由再加入絕對到期時間和帳戶當前的 `authVersion`，然後回傳 `200` 和新 Cookie。瀏覽器轉往 `/tasks`。後續請求自動帶上同一個 Cookie。[序列化](../routes/auth.js#L37) · [登入成功分支](../routes/auth.js#L112) · [前端導頁](../public/forms.js#L68)

### 3. Passport 恢復身分，路由再檢查操作範圍

`passport.session()` 把儲存在 Session 的使用者 ID 交給 `deserializeUser()`。程式先檢查 `authExpiresAt`，再以 `User.findById()` 取得帳戶，確認登入版本仍相同。舊帳戶或舊 Session 缺少版本時，`?? 0` 讓比較沿用初始版本。通過後 Passport 可設定 `req.user`，供 `req.isAuthenticated()` 和任務路由使用。[身分恢復](../routes/auth.js#L37)

```js
passport.deserializeUser(async (req, id, done) => {
  if (!(req.session.authExpiresAt > Date.now())) return done(null, false);
  try {
    const user = await User.findById(id);
    if (!user || (user.authVersion ?? 0) !== (req.session.authVersion ?? 0)) return done(null, false);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
});
```

頁面使用 `requirePageLogin`。任務 API 先檢查登入。讀取可直接進入路由，寫入會檢查瀏覽器提供的來源資訊，`POST` 和 `PUT` 還需要 JSON。API 以 `req.user.id` 寫入或比對擁有者。單筆操作也比對網址的任務 ID，因此查詢不到該帳戶的任務時回傳 `404`。[路由掛載](../server.js#L79) · [登入和寫入檢查](../routes/auth.js#L50) · [任務擁有者條件](../routes/api.js#L24)

```js
  app.use('/tasks', requirePageLogin, taskRoutes);
  app.use('/api/auth', auth.router);
  app.use('/api/tasks', auth.requireLogin, auth.checkApiWrite, express.json({ limit: '16kb' }), apiRoutes);
```

### 4. 登出及返回頁面

在任務頁或任務表單頁，`initialize()` 顯示共用頁首的導覽，將登出表單交給 `handleForm()`。前端以 JSON `{}` 呼叫 `POST /api/auth/logout`。伺服器檢查登入、寫入來源及內容格式，再執行 `req.logout()`、`req.session.destroy()` 和 `res.clearCookie()`。前端把無內容的 `204` 當作成功，`signOut()` 清除暫存提示並返回 `/login`。如瀏覽器從返回快取恢復頁面，`pageshow` 會觸發重載，讓伺服器重新檢查登入。[登出表單](../views/header.ejs#L16) · [伺服器登出](../routes/auth.js#L124) · [前端登出及頁面恢復](../public/forms.js#L289) · [`signOut()`](../public/forms.js#L20)

## 逐步追蹤一次登入和登出

以下以自己的測試帳戶 `trace-demo` 為例。假設帳戶 ID 為 `507f1f77bcf86cd799439011`，登入版本為 `0`，上午 10 時登入。

### 每一個請求用了甚麼資料

| 請求或動作 | 瀏覽器帶入的資料 | 伺服器結果及下一步 |
| --- | --- | --- |
| 開啟登入頁 | 首次進入時尚無這個網站的 Cookie | `guestPage('login')` 渲染登入表單。`initialize()` 選取表單並綁定提交事件。[頁面入口](../server.js#L69) · [前端啟動](../public/forms.js#L289) |
| 按 **Log in**，送出 `POST /api/auth/login` | JSON 帳密 | 伺服器以使用者名稱查帳戶及核對密碼。成功後 Passport 保存帳戶 ID，路由把版本 `0` 和中午 12 時的絕對到期時間寫入 Session，回傳 `200` 和登入 Cookie。 [登入回應](../routes/auth.js#L104) · [Session 有效期](../routes/auth.js#L8) |
| `GET /tasks`，然後 `GET /api/tasks` | 瀏覽器在兩個請求自動帶上已登入 Cookie | 兩個請求各自由 Passport 恢復 `req.user`。頁面入口先回傳 HTML，之後 `loadTaskList()` 取得 JSON，API 以 `req.user.id` 限定任務清單。[頁面路由](../routes/tasks.js#L33) · [載入任務](../public/forms.js#L124) · [清單查詢](../routes/api.js#L18) |
| `POST /api/auth/logout` | 已登入 Cookie、JSON `{}` | 通過檢查後移除登入狀態和 Session，並指示瀏覽器清除 Cookie。前端收到 `204` 後轉到登入頁。[前端登出](../public/forms.js#L296) · [登出路由](../routes/auth.js#L124) |

### 三種資料各自的用途

- **Cookie 的 Session ID** 供 `express-session` 找到 MongoDB 的 Session 記錄。登入時更換 Session ID，讓訪客階段的識別碼與登入階段分開。Cookie 由瀏覽器管理，`HttpOnly` 保護它免被網頁指令碼讀取。[Session 設定](../server.js#L51) · [Cookie 屬性](../routes/auth.js#L8) · [登入成功分支](../routes/auth.js#L115)
- **帳戶 ID** 在 `serializeUser(user, done)` 時寫入 Session。後續請求由 `deserializeUser(req, id, done)` 重新查詢帳戶。API 用同一個帳戶 ID 作為資料擁有者，任務的 `_id` 則識別個別任務。[序列化及恢復](../routes/auth.js#L37) · [單筆任務查詢](../routes/api.js#L30)
- **到期時間和登入版本** 都屬於伺服器端 Session。後續頁面重新整理可延續該 Session 的登入。`authExpiresAt` 只在登入時設定，例子從中午 12 時起便不能恢復登入。版本比較也能讓重設密碼後的舊 Session 失效。[檢查到期和版本](../routes/auth.js#L39) · [設定登入狀態](../routes/auth.js#L115)

### 參數、回呼與回應的交接

| 函式 | 收到甚麼 | 完成後交給哪一層 |
| --- | --- | --- |
| `handleForm(form, onSubmit, onError)` | 表單及兩個回呼 | 以同一個表單的 `dataset.submitting` 管理提交。執行 `onSubmit()` 時拋出的錯誤交給 `onError(error)`，最後恢復按鈕。[共用提交處理](../public/forms.js#L46) |
| `request(url, { method, body, authenticated })` | 表單 `action` 或任務 API 路徑，加上方法等選項 | 有 `body` 時送出 JSON。成功後交回解析後的 JSON。`204` 直接交回 `true`。預期已登入的請求若收到 `401`，先導回登入頁，再結束該次前端處理。[共用請求](../public/forms.js#L25) |
| Local strategy 的 `(username, password, done)` | 路由整理過的名稱及原始密碼 | 密碼相符時交回 `done(null, user)`。找不到帳戶或密碼不符時交回 `done(null, false)`。查詢或比對發生例外時交回 `done(error)`。[帳密策略](../routes/auth.js#L28) · [路由整理名稱](../routes/auth.js#L104) |
| `passport.authenticate('local', callback)` | Express 的 `req`、`res`、`next`，及策略交付的結果 | 先處理例外，交給 `next(error)`。驗證不通過時回傳 `401`。收到帳戶時才呼叫 `req.logIn(user, callback)`。[登入回呼](../routes/auth.js#L112) |
| `req.logIn(user, callback)` | 驗證通過的帳戶 | 成功回呼才追加到期時間和版本，再回傳 `200`。若收到 `loginError`，交給 Express 的錯誤處理。[寫入登入狀態](../routes/auth.js#L115) |

下列片段中，`user.authVersion` 來自帳戶文件，`req.session.authVersion` 則是登入這一刻的副本。若 `req.logIn()` 的回呼帶有錯誤，第一個 `return` 會結束回呼，成功回應便只會出現在後續欄位設定完成的分支。[登入成功分支](../routes/auth.js#L115) · [集中錯誤回應](../server.js#L83)

```js
    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      req.session.authExpiresAt = Date.now() + sessionLifetime;
      req.session.authVersion = user.authVersion ?? 0;
      return res.status(200).json({ message: 'Signed in.' });
    });
```

### 登出回應如何回到畫面

1. 後端取得已通過登入及寫入檢查的請求後，等 `req.logout()` 的回呼成功才呼叫 `req.session.destroy()`。任何一個回呼收到例外都交給 `next()`。銷毀成功後，`clearCookie()` 使用建立 Session 時同一組 Cookie 選項，再以 `end()` 結束 `204` 回應。[登出回呼](../routes/auth.js#L124) · [Cookie 設定](../server.js#L51)
2. 前端登出處理等待 `request()` 的回傳值。`request()` 在讀取 JSON 前就將 `204` 轉為 `true`，讓登出回呼可執行 `signOut()`。`signOut()` 移除 `sessionStorage` 的提示訊息，再用 `location.replace()` 導回登入頁。[回應分支](../public/forms.js#L31) · [登出回呼](../public/forms.js#L298) · [前端導頁](../public/forms.js#L20)

## 失敗時會發生甚麼

| 情況 | 結果 |
| --- | --- |
| 輸入錯誤帳密，或登入欄位格式不合規 | 登入 API 回傳 `401`。登入表單以 `authenticated: false` 呼叫 `request()`，錯誤會交給表單顯示。[登入回應](../routes/auth.js#L104) · [訪客表單錯誤](../public/forms.js#L63) |
| 瀏覽器缺少有效 Session、Session 已到期，或登入版本已更新 | 網頁任務入口轉到 `/login`，任務 API 回傳 `401`。在已登入的頁面，`request()` 收到 `401` 也會執行 `signOut()`。[身分恢復](../routes/auth.js#L39) · [頁面檢查](../server.js#L65) · [前端處理](../public/forms.js#L31) |
| 瀏覽器寫入請求的 `Sec-Fetch-Site` 顯示其他來源 | API 回傳 `403`，表單會顯示錯誤。請從 TaskFlow 自己的頁面提交。 [寫入檢查](../routes/auth.js#L55) · [回應處理](../public/forms.js#L37) |
| 登入的內容類型錯誤，或 JSON 無法解析 | 登入的內容類型須為 `application/json`，否則回傳 `415`。JSON 格式錯誤或超過限制分別回傳 `400` 或 `413`。[內容類型檢查](../routes/auth.js#L63) · [Express 錯誤處理](../server.js#L84) |
| 查詢帳戶、建立登入狀態或銷毀 Session 時發生例外 | 錯誤傳到 Express 的集中處理。API 一般回傳 `500`，頁面則渲染錯誤模板。[Passport 錯誤分支](../routes/auth.js#L28) · [登出錯誤分支](../routes/auth.js#L124) · [錯誤回應](../server.js#L83) |

## 示範與口頭講解

按本機啟動指引啟動網站，並準備自己註冊的測試帳戶。 [本機啟動指引](./setup.md)

1. 在未登入的無痕視窗開啟 `/tasks`，畫面會轉到 `/login`。直接開啟 `/api/tasks`，會看到 `401` 及 `Please sign in first.`
2. 開啟開發者工具的 Network 面板並保留記錄。用自己建立的測試帳戶先輸入錯誤密碼，再輸入正確密碼。觀察登入端點先回傳 `401`，成功時回傳 `200`，重新整理任務頁後仍可查看任務。
3. 按 **Log out**，在 Network 確認 `POST /api/auth/logout` 送出 `{}` 並回傳 `204`。再次開啟 `/tasks`，確認回到登入頁。 [cURL 的 Cookie 用法](../README.zh-Hant.md#curl-示範)

> 登入表單以 JSON 直接提交帳密。Passport 核對成功後，伺服器儲存 Session 並發出 Cookie。之後網頁和 cURL 都用這個 Cookie 認出登入者，任務 API 會按帳戶 ID 選取私人任務。登出時伺服器銷毀 Session 並清除 Cookie。

### 演練提問及檢查位置

| 問題或觀察 | 講解時可指出的程式或證據 |
| --- | --- |
| 登入失敗後，為甚麼可以直接再試一次？ | `handleForm()` 在 `finally` 清除提交標記和恢復按鈕。帳密錯誤的 `401` 由訪客表單的 `onError` 顯示。使用者可修正帳密再提交。[表單回呼](../public/forms.js#L46) · [訪客錯誤顯示](../public/forms.js#L63) |
| cURL 如何延續登入狀態？ | 登入使用 `-c` 把回應的 Cookie 存到檔案。後續請求用 `-b` 讀取同一個檔案。 [逐句示範](../README.zh-Hant.md#課堂示範的四條指令) |
| `POST /api/auth/login` 顯示 `200`，為甚麼還要檢查 `GET /tasks`？ | `200` 表明當次帳密驗證和登入回呼成功。`GET /tasks` 檢查瀏覽器有帶新 Cookie，伺服器也能從 store 恢復身分。Network 可依次核對回應狀態、Cookie 是否已更換，以及下一個請求有否帶上 Cookie。[Session 中介軟件](../server.js#L51) · [頁面保護](../server.js#L65) |
| `401` 和 `404` 各由哪一層回應？ | 受保護 API 的 `401` 由 `requireLogin()` 回應。指定任務的 `404` 可由 `Task.findOne()` 找不到同時符合任務 ID 和擁有者 ID 的文件而觸發。 [登入檢查](../routes/auth.js#L50) · [單筆任務路由](../routes/api.js#L30) · [組員 4 的 cURL 示範](./member-04-task-write-curl.md) |
| 前端按登出後沒有導頁，應從哪裏開始看？ | 在 Network 查看登出請求的 Cookie、JSON `{}` 和回應狀態。收到 `204` 時，檢查 `request()` 是否走到 `return true`，以及登出回呼是否呼叫 `signOut()`。[回應分支](../public/forms.js#L31) · [登出回呼](../public/forms.js#L298) |
