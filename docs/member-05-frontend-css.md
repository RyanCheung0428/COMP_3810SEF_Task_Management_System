# 組員 5｜全站前端 CSS

## 負責範圍

負責 TaskFlow 全站的 CSS，包括登入、註冊、重設密碼、任務列表、新增及編輯表單和錯誤頁。示範重點是桌面與手機版排版、鍵盤焦點，以及成功、錯誤、提交中、已完成和逾期等狀態的視覺呈現。

## 程式碼地圖

| 位置 | 用途 |
| --- | --- |
| [`public/styles.css`](../public/styles.css) | 定義全站排版、按鈕、表單、任務列表、焦點外框、訊息樣式和小螢幕規則。 |
| [共用頁首](../views/header.ejs#L5) · [靜態資源設定](../server.js#L45) | EJS 頁面透過頁首載入 `/styles.css`。Express 從 `public` 提供檔案。Viewport 設定讓手機按裝置寬度排版。 |
| [登入頁](../views/login.ejs#L2) · [註冊頁](../views/register.ejs#L2) · [重設密碼頁](../views/forgot-password.ejs#L2) · [錯誤頁](../views/error.ejs#L2) | 共用置中的 `.panel.narrow`。帳戶表單用 `.stack` 排列欄位和按鈕。 |
| [任務列表](../views/tasks.ejs#L3) · [任務表單](../views/task-form.ejs#L2) | 標記搜尋列、狀態卡、任務項目和表單欄位，讓 CSS 套用相應樣式。 |
| [訊息顯示](../public/forms.js#L9) · [任務狀態](../public/forms.js#L100) · [欄位錯誤](../public/forms.js#L256) | JavaScript 更新 `hidden`、`.is-checked` 和 `aria-invalid`，樣式表依這些狀態更新畫面。 |

## 排版及狀態呈現

### 桌面與手機版

1. `.container` 透過 `min(100% - 2rem, 66rem)` 限制內容寬度，並以 `margin-inline: auto` 置中。頁首和表單操作列使用 Flexbox 換行。當視窗不超過 `480px`，`main` 和 `.panel` 的內距縮小。 [容器及頁首](../public/styles.css#L23) · [操作列](../public/styles.css#L51) · [小螢幕規則](../public/styles.css#L357)
2. 帳戶及錯誤頁的 `.narrow` 最大寬度為 `28rem`，任務表單的 `.form-panel` 最大寬度為 `44rem`。`.stack` 用 Grid 排列欄位，輸入欄和文字區填滿可用寬度。`.button` 統一最小高度、內距和圓角，註冊用紫色款式，取消和返回可用淺色款式。 [面板和間距](../public/styles.css#L136) · [輸入欄](../public/styles.css#L173) · [按鈕樣式](../public/styles.css#L195)
3. 任務頁的搜尋欄可收窄，**Add task** 按鈕則維持自身寬度。兩張統計卡用兩欄 Grid 排列，選中的卡有 `aria-current="page"`，CSS 會突出顯示其背景和邊框。任務列採三欄 Grid，左右操作各佔 `44px`，中間內容可以收窄和換行。 [搜尋列](../public/styles.css#L58) · [狀態卡樣式](../public/styles.css#L154) · [任務列樣式](../public/styles.css#L267)

### 鍵盤焦點、錯誤與任務狀態

| 操作或狀態 | 視覺呈現 |
| --- | --- |
| 用 Tab 移動焦點 | `:focus-visible` 加上藍色外框。**Skip to content** 取得焦點後會出現在畫面上，按 Enter 可跳到主要內容。搜尋欄取得鍵盤焦點時亦會改變邊框顏色。 [焦點與跳轉連結](../public/styles.css#L233) · [搜尋欄焦點](../public/styles.css#L85) · [頁面連結](../views/header.ejs#L11) |
| 顯示成功訊息或錯誤 | 頁面的 `.notice-success` 用淺綠底，`.notice-error` 用淺紅底。任務表單收到欄位錯誤時，輸入欄加上 `aria-invalid="true"`，CSS 顯示紅色邊框和欄位錯誤文字。訊息清空後，`hidden` 讓提示收起。 [訊息及欄位樣式](../public/styles.css#L247) · [隱藏規則](../public/styles.css#L150) · [欄位錯誤處理](../public/forms.js#L256) |
| 表單提交或任務操作進行中 | JavaScript 暫時停用觸發操作的按鈕，相應的 `:disabled` 規則降低透明度並顯示等候游標。 [表單提交](../public/forms.js#L46) · [表單按鈕樣式](../public/styles.css#L231) · [任務按鈕樣式](../public/styles.css#L298) |
| 任務完成或逾期 | 完成後的方框以 `.is-checked` 顯示深綠底和白色勾號。未完成且截止日期已過的任務顯示淺橙底的 **Overdue** 標籤。 [畫面狀態](../public/forms.js#L100) · [完成方框](../public/styles.css#L301) · [逾期標籤](../public/styles.css#L344) |

## 常見問題及排查

| 現象 | 檢查位置 |
| --- | --- |
| 頁面看起來沒有樣式 | 在瀏覽器 **Network** 核對 `/styles.css` 已成功載入，再在 **Elements → Styles** 查目標元素是否帶有所需類別，以及規則有否被覆蓋。 |
| 小螢幕出現水平捲動 | 先確認裝置寬度和 `480px` 規則，再檢查長文字是否放在 `.task-content` 內，以及搜尋列的 `min-width: 0` 是否生效。 [任務文字換行](../public/styles.css#L279) · [搜尋列寬度](../public/styles.css#L68) |
| 點擊後未見焦點外框 | 用 Tab 重試，並在開發者工具查看 `:focus-visible` 是否匹配。這個規則主要用於顯示鍵盤操作時的焦點。 [焦點樣式](../public/styles.css#L233) |
| 預期的錯誤文字沒有出現 | 查看訊息元素的文字和 `hidden` 屬性。欄位框沒有變紅時，檢查該欄位有否 `aria-invalid="true"`。 [訊息更新](../public/forms.js#L9) · [欄位屬性](../public/forms.js#L256) |

## 示範與口頭講解

先在本機啟動 TaskFlow，使用自己建立的測試帳戶。開啟瀏覽器的開發者工具，準備切換至 `1366px` 和 `375px` 的視窗寬度。 [本機啟動指引](./setup.md)

1. 在兩種寬度查看 **Log in** 及 **Create account**，比較置中的面板、按鈕配色和欄位間距。用 Tab 檢查焦點外框並試按 **Skip to content**。輸入一次錯誤的測試帳戶密碼，指出紅色的登入錯誤提示。
2. 登入後新增一筆含長標題、並以香港日期的昨天作截止日的任務。在 `375px` 查看搜尋欄、**Add task**、狀態卡和任務列。確認長字串可換行，兩側操作仍可使用。展示 **Overdue**，再完成任務及切換到 **Completed** 查看勾號。
3. 開啟 **Add task**，在標題輸入幾個空格再儲存。指出頁面錯誤、欄位旁的錯誤文字和紅色邊框。改成有效標題後再次儲存，回到列表時展示綠色的 **Task added.** 訊息。

> 我負責 TaskFlow 全站的 CSS。帳戶頁和任務表單共用面板的基本樣式，並按內容設定不同的最大寬度。手機版會縮小內距，任務列的中欄會換行。用鍵盤操作時會看到焦點外框，提交錯誤會顯示欄位訊息和紅色邊框。從列表亦可看到已完成的勾號和逾期標籤，這些狀態由頁面提供的類別和屬性觸發對應樣式。
