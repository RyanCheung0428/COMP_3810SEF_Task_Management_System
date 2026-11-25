# 組員 2｜註冊及重設密碼

## 負責範圍

負責註冊及重設密碼的表單、API 和帳戶資料模型。講解會追蹤帳戶如何建立、密碼如何儲存，以及重設後舊 Session 如何失效。組員 1 負責建立和恢復登入狀態，組員 6 負責 Atlas 連線及 Cloud Run 部署。 [登入與 Session](./member-01-auth-session.md) · [Cloud Run 部署](./member-06-cloud-run-deployment.md)

## 程式碼地圖

| 位置 | 用途 |
| --- | --- |
| [註冊頁](../views/register.ejs#L5)及[重設密碼頁](../views/forgot-password.ejs#L5) | 收集使用者名稱及密碼，重設表單另有確認新密碼欄位。 |
| [訪客表單處理](../public/forms.js#L63) | 把表單資料送到對應 API，失敗時顯示錯誤，成功後返回登入頁。 |
| [帳戶路由](../routes/auth.js#L71) | 檢查寫入來源、JSON 和帳戶欄位，使用 bcrypt 產生雜湊，建立帳戶或更新密碼。 |
| [User 模型](../models/User.js#L4)及[啟動時初始化索引](../server.js#L29) | 定義帳戶欄位及唯一索引。索引就緒後，伺服器才開始接收請求。 |
| [Passport 恢復身分](../routes/auth.js#L39) | 比較帳戶與 Session 的登入版本，判斷該 Session 能否繼續使用。 |

## 操作及請求流程

### 1. 註冊新帳戶

1. 使用者在 `/register` 提交表單。`forms.js` 用 `FormData` 讀取欄位，直接向 `POST /api/auth/register` 送出 JSON。伺服器檢查寫入來源和內容類型，再解析最多 16 KB 的 JSON。 [前端請求](../public/forms.js#L25) · [請求驗證](../routes/auth.js#L55)
2. `readUsername()` 去除名稱前後空格，接受 1 至 64 個字元。名稱按大小寫比對。`isValidNewPassword()` 要求密碼去除前後空格後至少有 8 個字元，原始輸入最多 72 個位元組。bcrypt 使用原始密碼輸入產生雜湊。 [欄位驗證](../routes/auth.js#L19)
3. `User.create()` 將名稱及 bcrypt 密碼雜湊寫入 `users`。資料庫的唯一索引同樣適用於同時提交的註冊請求。重複鍵錯誤 `11000` 會轉成 HTTP `409`。成功時 API 回傳 `201`，前端先用 `sessionStorage` 暫存提示，再返回登入頁顯示。 [註冊路由](../routes/auth.js#L71) · [成功提示](../public/forms.js#L63)

### 2. 用帳戶 ID 連接任務和登入狀態

| 資料位置 | 帳戶流程用到的欄位 |
| --- | --- |
| `users` | `_id` 識別帳戶。`username` 有唯一索引。`passwordHash` 由 `select: false` 在一般查詢中略過，登入時明確讀取。`authVersion` 預設為 `0`，`createdAt` 記錄建立時間。 [模型](../models/User.js#L4) · [登入核對](../routes/auth.js#L28) |
| `tasks` | `userId` 指向帳戶的 `users._id`。重設密碼後仍沿用同一個 `_id`，所以原有任務會保留。 [任務擁有者欄位](../models/Task.js#L6) · [組員 4 的新增流程](./member-04-task-write-curl.md) |
| `sessions` | 登入時保存 Passport 的使用者 ID 及當時的 `authVersion`。後續請求帶 Cookie，Passport 讀取同一帳戶以核對版本。 [Session store](../server.js#L51) · [登入時保存版本](../routes/auth.js#L115) |

### 3. 在本機專題版本重設自己的測試帳戶

1. 以未登入的視窗開啟 **Forgot password?**。重設表單使用同一套寫入來源及 JSON 檢查，並核對新密碼和確認欄位。 [重設表單](../views/forgot-password.ejs#L5) · [重設路由](../routes/auth.js#L86)
2. 路由在同一次帳戶更新內寫入新密碼雜湊及將 `authVersion` 加一。成功回傳 `200`，前端返回登入頁並顯示成功訊息。 [更新帳戶](../routes/auth.js#L95) · [成功後導頁](../public/forms.js#L75)
3. 舊視窗再次發出請求時，Passport 發現 Session 版本和帳戶版本不同，便拒絕恢復登入。例如帳戶由版本 `0` 變為 `1`，舊 Session 保存的版本仍是 `0`。用新密碼登入時，新 Session 會保存版本 `1`，原有任務仍可用相同的擁有者 ID 查回。 [版本核對](../routes/auth.js#L39) · [按帳戶查詢任務](../routes/api.js#L18)

## 失敗時會發生甚麼

| 情況 | 結果 |
| --- | --- |
| 名稱或新密碼不符規則，或兩次輸入的新密碼不同 | `400`，原表單顯示錯誤。 |
| 瀏覽器從其他來源提交寫入請求 | 有跨來源標記時回傳 `403`。 |
| 專題版本找不到要重設的帳戶 | `404`，沒有帳戶資料被更新。 |
| 使用者名稱重複 | `409`，已存在的帳戶保持原狀。 |
| 內容類型有誤或 JSON 超過大小限制 | 分別回傳 `415` 或 `413`。 |
| 資料庫或雜湊操作出現例外 | `500`，表單顯示一般錯誤訊息。 |

## 示範與口頭講解

1. 按本機啟動指引啟動網站，再註冊自己的測試帳戶。重複提交同一名稱，確認表單提示名稱已被使用，Network 面板顯示 `409`。 [本機啟動指引](./setup.md)
2. 登入測試帳戶，新增一筆容易辨認的任務。保留這個視窗，在另一個未登入的無痕視窗重設同一測試帳戶。
3. 重新整理原視窗的任務頁，確認它返回登入頁。用自己的舊密碼確認登入失敗，再用新密碼登入，核對原有任務仍在。如有 Atlas 測試資料的讀取權限，可核對該筆任務的 `userId`、帳戶的 `_id` 和更新後的 `authVersion`。 [Atlas 資料檢視](./setup.md#在-atlas-瀏覽資料)

> 我負責註冊和重設密碼。註冊時，伺服器先驗證欄位，把密碼轉成 bcrypt 雜湊，再由 User 模型建立帳戶。唯一索引會阻止重複名稱。重設密碼會同時更新雜湊和登入版本，所以下次使用舊 Session 時，Passport 會要求重新登入。帳戶 ID 沿用原值，所以用新密碼登入後仍會看到原有任務。

## 公開上線前的驗收

目前專題的密碼重設流程仍欠缺帳戶持有人身分驗證。組員 2 須在公開前完成持有人驗證，確認未通過驗證的請求無法更新密碼或登入版本，成功重設後舊 Session 失效。驗收通過後，組員 6 才可開放公開網址。 [現有重設路由](../routes/auth.js#L86) · [Cloud Run 部署](./member-06-cloud-run-deployment.md)
