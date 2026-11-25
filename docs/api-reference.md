# REST API 參考

所有 `POST` 和 `PUT` 請求使用 `Content-Type: application/json`。`GET` 和 `DELETE` 可直接使用路徑。 [cURL 示範](../README.zh-Hant.md#curl-示範)

## 帳戶與 Session

| 方法及路徑 | 請求 | 成功回應 |
| --- | --- | --- |
| `POST /api/auth/register` | JSON `username`、`password` | `201`，註冊成功訊息 |
| `POST /api/auth/login` | JSON `username`、`password` | `200`，登入成功訊息及新的 Session Cookie |
| `POST /api/auth/reset-password` | JSON `username`、`password`、`confirmPassword` | `200`，重設成功訊息 |
| `POST /api/auth/logout` | 已登入的 Session Cookie 和 JSON `{}` | `204`，銷毀 Session 並清除 Cookie，回應沒有內容 |

登入直接傳送帳密 JSON，使用 cURL 的 `-c` 保存回應發出的 Cookie，之後用 `-b` 帶上它。瀏覽器若提供 `Sec-Fetch-Site`，寫入只接受 `same-origin`。API 不授予跨來源 CORS 權限。缺少來源標記的用戶端仍需遵守 JSON 格式。 [寫入檢查](../routes/auth.js#L55)

使用者名稱去除前後空格後按大小寫比對，長度為 1 至 64 個字元。註冊和重設的新密碼去除前後空格後須至少有 8 個字元，原始輸入最多 72 個位元組。重設時，`password` 須與 `confirmPassword` 完全一致。 [帳戶路由及驗證程式碼](../routes/auth.js)

## 任務

所有任務端點都需要已登入的 Session Cookie。單筆查詢、修改和刪除使用新增時回傳的任務 `_id`。

| 方法及路徑 | 請求 | 成功回應 |
| --- | --- | --- |
| `GET /api/tasks` | 可用 `title` 和 `status` 組合篩選。標題搜尋不分大小寫 | `200`，自己的任務 JSON 陣列，按建立時間由新到舊排列 |
| `GET /api/tasks/:id` | 路徑中的任務 ID | `200`，指定的任務 |
| `POST /api/tasks` | JSON，至少提供 `title` | `201`，新增的任務，包含 `_id` |
| `PUT /api/tasks/:id` | JSON，至少提供一個可編輯欄位，保留未提交的欄位 | `200`，更新後的任務 |
| `DELETE /api/tasks/:id` | 路徑中的任務 ID | `200`，包含 `message` 的 JSON |

可編輯的 JSON 欄位如下。 [任務路由](../routes/api.js) · [任務欄位及篩選驗證](../task-input.js)

| 欄位 | 輸入規則 |
| --- | --- |
| `title` | 去除前後空格後須有 1 至 120 個字元 |
| `description` | 最多 1,000 個字元 |
| `status` | `In Progress` 或 `Completed`。新增時省略，預設為 `In Progress` |
| `dueDate` | 有效的 `YYYY-MM-DD` 日期。空字串或 `null` 可清除。JSON 回傳的日期採 ISO 格式 |

## 錯誤回應

錯誤回傳 JSON `error`，任務欄位或篩選條件驗證失敗時可附上 `fields`。 [伺服器錯誤處理](../server.js) · [任務路由](../routes/api.js)

| 狀態碼 | 意義 |
| --- | --- |
| `400` | 註冊、重設密碼、任務欄位、篩選條件或任務 ID 無效 |
| `401` | 未登入，或帳號密碼錯誤 |
| `403` | 瀏覽器的 `Sec-Fetch-Site` 顯示寫入請求來自其他來源 |
| `404` | 找不到帳戶或任務，或任務不屬於目前帳戶 |
| `409` | 使用者名稱重複 |
| `415` | `POST` 或 `PUT` 的請求缺少所需的 `application/json` 格式 |
| `500` | 伺服器錯誤 |
