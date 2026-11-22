# 使用 Docker 與 MongoDB Atlas 啟動

Docker Compose 負責建置和啟動 TaskFlow。帳戶、任務和登入 Session 儲存在 MongoDB Atlas 的 `taskflow` 資料庫。

## 準備 Atlas 連線

1. 在 Atlas 專案中建立專用資料庫帳戶，授予 `taskflow` 資料庫的 `readWrite` 角色。連線字串須使用此帳戶。 [Atlas 資料庫帳戶](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
2. 在專案的 IP 存取清單中，加入 Docker 主機連線至 Atlas 時使用的公用 IP 位址。 [Atlas IP 存取清單](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/)
3. 在叢集的 **Connect → Drivers** 畫面複製連線字串，將帳戶及密碼的佔位文字替換為實際資料。帳密中的保留字元須使用百分比編碼。在 `?` 前指定 `/taskflow`。 [取得 Atlas 驅動程式連線字串](https://www.mongodb.com/docs/atlas/driver-connection/)

若尚未建立 `.env`，在專案根目錄執行下列指令，從範本複製一份。 [`.env.example`](../.env.example)

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

## 啟動及停止服務

在專案根目錄執行下列指令啟動專案。

```sh
docker compose up --build -d
```

Compose 依 `Dockerfile` 建置映像檔並啟動 `app` 容器。容器以 `npm start` 執行 `server.js`。伺服器連上 Atlas 並完成帳戶集合的唯一索引初始化後才開始接收請求。

使用預設連接埠時，前往本機 TaskFlow 的 `/register` 建立帳戶，也可用已匯入的帳戶登入。 [開啟本機 TaskFlow](http://localhost:3000)

在專案根目錄執行 `docker compose logs app` 可檢查啟動紀錄，執行 `docker compose down` 可停止服務。停止或重建容器後，資料仍保存在 Atlas。

## 在 Atlas 瀏覽資料

在 Atlas 專案開啟 **Database → Data Explorer**，展開已連線的叢集和 `taskflow` 資料庫，再開啟 `users`、`tasks` 或 `sessions` 檢視資料。應用程式建立或匯入資料後，相應的集合便會出現。 [瀏覽 Atlas 集合](https://www.mongodb.com/docs/atlas/atlas-ui/collections/)
