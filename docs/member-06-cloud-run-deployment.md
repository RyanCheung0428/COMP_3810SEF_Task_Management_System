# 組員 6｜Google Cloud Run 部署

## 負責範圍

在 Google Cloud Console 將 TaskFlow 的 GitHub repo 連接 Cloud Run。Cloud Build 按 repo 根目錄的 Dockerfile 建置映像檔，Cloud Run 執行該映像檔，並透過 Secret Manager 取得 Atlas 連線設定和 Session 密鑰。 [Cloud Run 持續部署](https://docs.cloud.google.com/run/docs/continuous-deployment)

## Cloud Run 和 GitHub

在 **Cloud Run → Connect repository → Cloud Build → Set up with Cloud Build** 選擇 GitHub repo，再設定分支和建置方式。若服務已建立，可在該服務的 **Source → Connect to repo** 設定連接。推送至觸發器指定的分支時，Cloud Build 會建置及部署新修訂版本。 [Console 操作](https://docs.cloud.google.com/run/docs/continuous-deployment#set-up-with-cloud-build)

| 設定 | 紀錄 |
| --- | --- |
| Google Cloud 專案 | `comp3810-515306`，來自本機 Google Cloud 設定 |
| GitHub repo | [`RyanCheung0428/COMP_3810SEF_Task_Management_System`](https://github.com/RyanCheung0428/COMP_3810SEF_Task_Management_System) |
| 觸發分支 | Repo 預設分支為 `main`。實際觸發分支以 **Cloud Build → Triggers** 為準 |
| Build Type 和 Source location | **Dockerfile**，使用 repo 根目錄的 [Dockerfile](../Dockerfile) |
| Cloud Run 服務名稱、區域和 HTTPS 網址 | taskflow |
| 容器連接埠和 HTTPS 設定 | Cloud Run 將容器埠傳入 `PORT`，預設為 `8080`。在 **Variables and Secrets** 核對 `COOKIE_SECURE=true` 和 `TRUST_PROXY=true` |

## 服務帳戶、Secret Manager 和 Atlas

| 身分 | 在 Console 核對的權限 |
| --- | --- |
| Cloud Build 建置服務帳戶 | 在 **Cloud Build → Triggers** 查看觸發器使用的帳戶，名稱待填。在 **IAM & Admin → IAM** 核對 **Cloud Build Service Account**（`roles/cloudbuild.builds.builder`）及 **Cloud Run Admin**（`roles/run.admin`），並在執行服務帳戶的權限頁核對 **Service Account User**（`roles/iam.serviceAccountUser`）。 [Cloud Build 權限](https://docs.cloud.google.com/run/docs/continuous-deployment#required_roles) |
| Cloud Run 執行服務帳戶 | 在 **Cloud Run → 服務 → Edit & deploy new revision → Security** 查看帳戶，名稱待填。在 **Secret Manager** 的兩項 Secret 各自授予此帳戶 **Secret Manager Secret Accessor**（`roles/secretmanager.secretAccessor`）。 [Secret Manager 權限](https://docs.cloud.google.com/secret-manager/docs/manage-access-to-secrets) |

在 **Secret Manager** 建立或核對下列兩項 Secret。再在 Cloud Run 的 **Containers → Variables and Secrets → Reference a secret** 選擇對應的 Secret 和已啟用版本。講解時展示名稱、版本及權限即可。 [Cloud Run 密鑰設定](https://docs.cloud.google.com/run/docs/configuring/services/secrets)

| Cloud Run 環境變數 | Secret 名稱及版本 | 用途 |
| --- | --- | --- |
| `MONGODB_URI` | MONGODB_URI | Atlas 的連線字串，指向 `taskflow` 資料庫。 |
| `SESSION_SECRET` | SESSION_SECRET | 用 64 個隨機十六進位字元簽署 Session Cookie。日常重新部署沿用相同密鑰。 |

Atlas 的 **IP Access List** 已允許 `0.0.0.0/0`，即接受來自任何 IPv4 位址的連線。Cloud Run 使用 `MONGODB_URI` 中的資料庫帳戶認證，該帳戶只需有 `taskflow` 資料庫的 `readWrite` 權限。 [Atlas IP Access List](https://www.mongodb.com/docs/atlas/security/ip-access-list/) · [Atlas 資料庫帳戶](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)

## 示範與口頭講解

1. 在 **Cloud Run → Source** 展示 GitHub repo，並在 **Cloud Build → History** 核對建置結果及來源提交。
2. 在 Cloud Run 的 **Revisions** 核對修訂版本和流量，在 **Logs** 核對應用程式已啟動。若啟動失敗，先檢查 Secret 名稱、版本及執行帳戶權限，再核對 Atlas 帳密和連線字串。 [Cloud Run 日誌](https://docs.cloud.google.com/run/docs/logging)
3. 在 **Secret Manager** 指出兩項 Secret 的名稱、版本和存取角色，再回 Cloud Run 展示環境變數的對應。
4. 先完成受限版本驗收。組員 2 驗證重設密碼已加入帳戶持有人身分驗證後，才在 Cloud Run 的 **Security** 選擇 **Allow public access**。開放後用測試帳戶在 HTTPS 網址示範登入、新增任務及登出。 [公開存取設定](https://docs.cloud.google.com/run/docs/authenticating/public) · [重設密碼的上線條件](./member-02-registration-password-reset.md) · [上線驗收](./submission-checklist.md#cloud-run-上線驗收)

> 我在 Google Cloud Console 用 Cloud Build 將 GitHub repo 連接 Cloud Run。指定分支有新提交時，Cloud Build 會按 Dockerfile 建置並部署新版本。我在 Secret Manager 儲存 Atlas 連線字串和 Session 密鑰，並讓 Cloud Run 執行帳戶讀取這兩項 Secret。最後，我用建置紀錄、修訂版本和日誌核對部署結果。
