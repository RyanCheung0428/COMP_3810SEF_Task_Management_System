#!/usr/bin/env bash
set -eu

BASE_URL=${TASKFLOW_URL:-http://localhost:3000}
DEMO_DIR=$(mktemp -d)
COOKIE_JAR="$DEMO_DIR/cookies"
RESPONSE_FILE="$DEMO_DIR/response"
trap 'rm -f "$COOKIE_JAR" "$RESPONSE_FILE"; rmdir "$DEMO_DIR"' EXIT

if [ -z "${DEMO_PASSWORD:-}" ]; then
  read -r -s -p 'student1 password: ' DEMO_PASSWORD
  printf '\n'
fi

csrf_token() {
  sed -n 's/.*name="_csrf" value="\([^"]*\)".*/\1/p' | head -n 1
}

login_page=$(curl -fsS -c "$COOKIE_JAR" "$BASE_URL/login")
login_token=$(printf '%s\n' "$login_page" | csrf_token)
if [ -z "$login_token" ]; then
  printf 'Could not read the login token.\n' >&2
  exit 1
fi

curl -fsS -o /dev/null -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  --data-urlencode 'username=student1' \
  --data-urlencode "password=$DEMO_PASSWORD" \
  --data-urlencode "_csrf=$login_token" "$BASE_URL/login"
unset DEMO_PASSWORD

task_page=$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/tasks")
token=$(printf '%s\n' "$task_page" | csrf_token)
if [ -z "$token" ]; then
  printf 'Could not read the task page. Check the student1 credentials.\n' >&2
  exit 1
fi

# Show the JSON response and check the status after each API request.
show_response() {
  printf '%s returned HTTP %s\n' "$1" "$2"
  cat "$RESPONSE_FILE"
  printf '\n'
  if [ "$2" != "$3" ]; then
    printf 'Expected HTTP %s\n' "$3" >&2
    exit 1
  fi
}

status=$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $token" -H 'Content-Type: application/json' \
  -d '{"title":"cURL demo task","status":"Pending","priority":"High"}' \
  "$BASE_URL/api/tasks")
show_response POST "$status" 201
task_id=$(sed -n 's/.*"_id":"\([0-9a-f]\{24\}\)".*/\1/p' "$RESPONSE_FILE")
if [ -z "$task_id" ]; then
  printf 'Could not read the new task ID.\n' >&2
  exit 1
fi

status=$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -G -b "$COOKIE_JAR" \
  --data-urlencode 'title=cURL demo task' \
  --data-urlencode 'status=Pending' --data-urlencode 'priority=High' \
  "$BASE_URL/api/tasks")
show_response GET "$status" 200

status=$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -X PUT -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $token" -H 'Content-Type: application/json' \
  -d '{"status":"Completed"}' "$BASE_URL/api/tasks/$task_id")
show_response PUT "$status" 200

status=$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -X DELETE -b "$COOKIE_JAR" \
  -H "X-CSRF-Token: $token" "$BASE_URL/api/tasks/$task_id")
show_response DELETE "$status" 200

curl -fsS -o /dev/null -b "$COOKIE_JAR" \
  --data-urlencode "_csrf=$token" "$BASE_URL/logout"
