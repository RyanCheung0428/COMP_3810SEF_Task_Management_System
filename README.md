# TaskFlow Personal Task Manager

[繁體中文](./README.zh-Hant.md)

COMP 3810SEF group project for the Fall 2026 semester. TaskFlow lets users log in to create, view, edit, and delete private tasks. The REST API provides access to the same tasks through the user's account.

## Group Info

**Group number** `TBD`

| Member | Name | Student ID (SID) | Responsibilities and walkthrough |
| --- | --- | --- | --- |
| 1 | TBD | a | [Login, logout, sessions, and access control](./docs/member-01-auth-session.md) |
| 2 | TBD | TBD | [Registration and password reset](./docs/member-02-registration-password-reset.md) |
| 3 | TBD | TBD | [Task list, search, filters, and completing or reopening tasks](./docs/member-03-task-list-status.md) |
| 4 | TBD | TBD | [Creating, editing, and deleting tasks, plus validation and the cURL demo](./docs/member-04-task-write-curl.md) |
| 5 | TBD | TBD | [Site-wide CSS and responsive styling](./docs/member-05-frontend-css.md) |
| 6 | TBD | TBD | [Google Cloud Run deployment](./docs/member-06-cloud-run-deployment.md) |

## Project File Overview

| File | Purpose |
| --- | --- |
| [`server.js`](./server.js) | Starts Express, connects to MongoDB, and configures sessions, EJS, and routes. |
| [`package.json`](./package.json) | Defines `npm start` and lists the direct dependencies `bcryptjs`, `connect-mongo`, `ejs`, `express`, `express-session`, `mongodb`, `mongoose`, `passport`, and `passport-local`. |
| [`public/forms.js`](./public/forms.js) | Calls the API, handles form submissions, and updates the task list. |
| [`public/styles.css`](./public/styles.css) | Styles page layouts, forms, and the task list. |
| [`views/login.ejs`](./views/login.ejs) | Displays the login form. |
| [`views/register.ejs`](./views/register.ejs) | Displays the registration form. |
| [`views/forgot-password.ejs`](./views/forgot-password.ejs) | Displays the password reset form. |
| [`views/tasks.ejs`](./views/tasks.ejs) | Provides the template for the task list, status counts, and task controls. |
| [`views/task-form.ejs`](./views/task-form.ejs) | Provides the shared form for creating and editing tasks. |
| [`views/error.ejs`](./views/error.ejs) | Displays the error status and message. |
| [`views/header.ejs`](./views/header.ejs) | Provides the shared page header and loads CSS and JavaScript. |
| [`views/footer.ejs`](./views/footer.ejs) | Closes the shared page layout tags. |
| [`models/User.js`](./models/User.js) | Defines the account schema, including the username, password hash, and login version. |
| [`models/Task.js`](./models/Task.js) | Defines the task schema, including the owner, title, description, status, and due date. |

For other project files and the internal request flow, see the [project architecture guide](./docs/architecture.md).

## Web User Guide

For local use, start TaskFlow with Docker Compose and open `http://localhost:3000` if you are using the default port. For the hosted version, use the public HTTPS URL once the release checks are complete. [Local setup](./docs/setup.md) · [Cloud Run deployment](./docs/member-06-cloud-run-deployment.md)

1. **Log in.** At `/register`, choose a **Username** and **Password**, then click **Create account** to create a test account. Enter the same credentials at `/login` and click **Log in** to open **Tasks**.
2. **Create a task.** Click **Add task**, enter a **Title** and optionally add a **Description** and **Due date**, then click **Save task**.
3. **View tasks.** Open **Tasks** to see the task list. Use **Search by title** to find tasks by title, then click **In progress** or **Completed** to view results by status.
4. **Edit a task.** Open the task's **⋯** menu and click **Edit**. Change the fields and click **Save task**.
5. **Delete a task.** Open the task's **⋯** menu, click **Delete**, and confirm.
6. **Log out.** Click **Log out** to return to the login page.

## REST API

Log in with JSON and save the session cookie. Send that cookie with every task request. Use `Content-Type: application/json` for `POST` and `PUT`, including an empty JSON object (`{}`) for logout.

| HTTP method | URI | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register an account |
| `POST` | `/api/auth/login` | Log in and establish a session |
| `POST` | `/api/auth/reset-password` | Reset a password |
| `POST` | `/api/auth/logout` | Log out |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | List tasks |
| `GET` | `/api/tasks/:id` | Get a task by ID |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |

For field rules, response formats, and error codes, see the [API reference](./docs/api-reference.md).

### cURL Demo

windos cmd

#### Log in once before the demo

Replace `YOUR_DEMO_USERNAME` and `YOUR_DEMO_PASSWORD` with your demo account details. Run this in your own working directory. The `-c cookies.txt` option saves the session cookie there.

```bash
curl.exe -c cookies.txt --json "{\"username\":\"testtest\",\"password\":\"testtest\"}" "https://comp-3810sef-group032.cloud.run/api/auth/login"
```
A successful login prints `{"message":"Signed in."}`.
create 
```bash
curl.exe -b cookies.txt --json "{\"title\":\"Demo task\"}" "https://comp-3810sef-group032.cloud.run/api/tasks"
```
read
```bash
curl.exe -X GET -b cookies.txt https://comp-3810sef-group032.cloud.run/api/tasks
```
update (TASK_ID need to change)
```bash
curl.exe -X PUT -b cookies.txt --json "{\"status\":\"Completed\"}" "https://comp-3810sef-group032.cloud.run/api/tasks/TASK_ID"
```
delete (TASK_ID need to change)
```bash
curl.exe -X DELETE -b cookies.txt https://comp-3810sef-group032.cloud.run/api/tasks/TASK_ID
```
gcp ssh
```bash
curl -sS -w '\n' -X POST -c cookies.txt -H 'Content-Type: application/json' -d '{"username":"testtest","password":"testtest"}' https://comp-3810sef-group032.cloud.run/api/auth/login
```
A successful login prints `{"message":"Signed in."}`.

create 
```bash
curl -sS -w '\n' -X POST -b cookies.txt -H 'Content-Type: application/json' -d '{"title":"Demo task"}' https://comp-3810sef-group032.cloud.run/api/tasks| jq
```

read
```bash
curl -sS -w '\n' -X GET -b cookies.txt https://comp-3810sef-group032.cloud.run/api/tasks | jq
```
update(TASK_ID need to change)
```bash
curl -sS -w '\n' -X PUT -b cookies.txt -H 'Content-Type: application/json' -d '{"status":"Completed"}' https://comp-3810sef-group032.cloud.run/api/tasks/TASK_ID| jq
```
delete(TASK_ID need to change)
```bash
curl -sS -w '\n' -X DELETE -b cookies.txt https://comp-3810sef-group032.cloud.run/api/tasks/TASK_ID
```

Start TaskFlow and create a demo account at `/register`. For a cloud demo, replace `http://localhost:3000` in each command with your service’s HTTPS URL.

#### Log in once before the demo

Replace `YOUR_DEMO_USERNAME` and `YOUR_DEMO_PASSWORD` with your demo account details. Run this in your own working directory. The `-c cookies.txt` option saves the session cookie there.

```bash
curl -sS -w '\n' -X POST -c cookies.txt -H 'Content-Type: application/json' -d '{"username":"YOUR_DEMO_USERNAME","password":"YOUR_DEMO_PASSWORD"}' http://localhost:3000/api/auth/login
```

A successful login prints `{"message":"Signed in."}`.

#### Four commands for the live demo

Run these four commands one at a time in the same directory. Each uses `-b cookies.txt` to send the saved cookie and prints one line of JSON.

**1. Create a task (POST).** Copy the `_id` from the response. The new task has the status `In Progress`.

```bash
curl -sS -w '\n' -X POST -b cookies.txt -H 'Content-Type: application/json' -d '{"title":"Demo task"}' http://localhost:3000/api/tasks| jq
```

**2. Read the task list (GET).** Find `Demo task` with the same `_id` in the returned array.

```bash
curl -sS -w '\n' -X GET -b cookies.txt http://localhost:3000/api/tasks | jq
```

**3. Update the task (PUT).** Replace `TASK_ID` in the URL with the `_id` from step 1. The response shows `Completed`.

```bash
curl -sS -w '\n' -X PUT -b cookies.txt -H 'Content-Type: application/json' -d '{"status":"Completed"}' http://localhost:3000/api/tasks/TASK_ID| jq

```


**4. Delete the task (DELETE).** Replace `TASK_ID` with that same `_id`. The response is `{"message":"Task deleted."}`.

```bash
curl -sS -w '\n' -X DELETE -b cookies.txt http://localhost:3000/api/tasks/TASK_ID


```


<details>
<summary>Optional automated API check with Bash and jq</summary>

This check also reads the task by ID, verifies that an update preserves its description, checks for `404` after deletion, and logs out. To use a different URL, set `BASE` before running the block.

```bash
(
  set -euo pipefail
  BASE=${BASE:-http://localhost:3000}
  BASE=${BASE%/}

  IFS= read -r -p 'Test account username: ' USERNAME
  IFS= read -r -s -p 'Password: ' PASSWORD
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
      printf 'Expected HTTP %s, received HTTP %s.\n' "$expected" "$status" >&2
      cat "$BODY" >&2
      return 1
    fi
  }

  # Log in directly. Save the session cookie for the task requests.
  printf '%s\n' "$USERNAME" "$PASSWORD" \
    | jq -Rnc '{username: input, password: input}' \
    | api_call 200 POST /api/auth/login \
        -H 'Content-Type: application/json' --data-binary @-
  unset PASSWORD

  # Create the task, save its ID, and verify the default status is In Progress.
  api_call 201 POST /api/tasks \
    -H 'Content-Type: application/json' \
    --data '{"title":"cURL CRUD demo","description":"Keep this description"}'
  TASK_ID=$(jq -ej '._id | select(type == "string" and test("^[0-9a-fA-F]{24}$"))' "$BODY")
  jq -e 'select(.status == "In Progress")' "$BODY"

  # Find the demo task in the list, then fetch it by ID.
  api_call 200 GET /api/tasks
  jq -e --arg id "$TASK_ID" '.[] | select(._id == $id)' "$BODY"
  api_call 200 GET "/api/tasks/$TASK_ID"
  jq -e --arg id "$TASK_ID" 'select(._id == $id)' "$BODY"

  # Update the title and status, and verify that the description is preserved.
  api_call 200 PUT "/api/tasks/$TASK_ID" \
    -H 'Content-Type: application/json' \
    --data '{"title":"cURL CRUD demo updated","status":"Completed"}'
  jq -e --arg id "$TASK_ID" 'select(._id == $id and .title == "cURL CRUD demo updated"
    and .status == "Completed" and .description == "Keep this description")' "$BODY"

  # Delete the demo task and verify that its ID can no longer be found.
  api_call 200 DELETE "/api/tasks/$TASK_ID"
  jq -e 'select(.message == "Task deleted.")' "$BODY"
  api_call 404 GET "/api/tasks/$TASK_ID"
  jq . "$BODY"

  api_call 204 POST /api/auth/logout -H 'Content-Type: application/json' --data '{}'
)
```

</details>

[Acceptance and submission checklist](./docs/submission-checklist.md)
