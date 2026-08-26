#!/usr/bin/env bash
# back-merge.sh — check or create back-merge PRs (master/main → development)
#
# Usage:
#   back-merge.sh check  <owner/repo> [<owner/repo> ...]
#   back-merge.sh create <fix_version> <owner/repo> [<owner/repo> ...]
#
# create mode PR title: "<fix_version> | Back-merge"  (pass "" for plain "Back-merge")

MODE="$1"; shift
FIX_VERSION=""
if [ "$MODE" = "create" ]; then
  FIX_VERSION="$1"; shift
fi

REPOS=("$@")

PR_TITLE="${FIX_VERSION:+$FIX_VERSION | }Back-merge"

for REPO in "${REPOS[@]}"; do
  # 2a — dev branch
  DEV=$(gh api "repos/${REPO}/branches/development" 2>/dev/null | jq -r '.name // empty')
  if [ -z "$DEV" ]; then
    echo "${REPO}|NO_DEV|—|—"
    continue
  fi

  # 2b — main or master
  MAIN=$(gh api "repos/${REPO}/branches/main" 2>/dev/null | jq -r '.name // empty')
  MASTER=$(gh api "repos/${REPO}/branches/master" 2>/dev/null | jq -r '.name // empty')
  if [ -n "$MAIN" ]; then
    BASE="main"
  elif [ -n "$MASTER" ]; then
    BASE="master"
  else
    echo "${REPO}|NO_BASE|—|—"
    continue
  fi

  # 2c — existing open back-merge PR
  OPEN_PR=$(gh pr list --repo "$REPO" --head "$BASE" --base development --state open \
    --json number,url --jq 'if length > 0 then .[0] | "\(.number)|\(.url)" else "" end' 2>/dev/null)
  if [ -n "$OPEN_PR" ]; then
    PR_NUM=$(echo "$OPEN_PR" | cut -d'|' -f1)
    PR_URL=$(echo "$OPEN_PR" | cut -d'|' -f2)
    echo "${REPO}|PR_OPEN|${BASE}|PR#${PR_NUM} ${PR_URL}"
    continue
  fi

  # 2d — compare
  COMPARE=$(gh api "repos/${REPO}/compare/development...${BASE}" \
    --jq '{ahead_by:.ahead_by,status:.status}' 2>/dev/null)
  AHEAD=$(echo "$COMPARE" | jq -r '.ahead_by // "error"')
  STATUS=$(echo "$COMPARE" | jq -r '.status // "error"')

  if [ "$AHEAD" = "error" ] || [ "$STATUS" = "404" ] || [ "$STATUS" = "error" ]; then
    echo "${REPO}|ACCESS_ERROR|${BASE}|—"
    continue
  fi

  if [ "$AHEAD" -gt 0 ] 2>/dev/null; then
    if [ "$MODE" = "check" ]; then
      echo "${REPO}|NEEDS_MERGE|${BASE}|${BASE} is ${AHEAD} commits ahead (${STATUS})"
    else
      # create mode — check for closed PR (just note it, don't block)
      CLOSED=$(gh pr list --repo "$REPO" --head "$BASE" --base development --state closed \
        --json number,url --jq '.[0].number' 2>/dev/null)
      CLOSED_NOTE="${CLOSED:+previous closed PR#$CLOSED}"

      RESULT=$(gh pr create \
        --repo "$REPO" \
        --base development \
        --head "$BASE" \
        --title "$PR_TITLE" \
        --body "Back-merge of \`${BASE}\` into \`development\` following ${FIX_VERSION:-release}." 2>&1)

      if echo "$RESULT" | grep -q "^https://"; then
        echo "${REPO}|CREATED|${BASE}|${RESULT}${CLOSED_NOTE:+ ($CLOSED_NOTE)}"
      elif echo "$RESULT" | grep -qi "no commits between"; then
        echo "${REPO}|IN_SYNC|${BASE}|—"
      else
        echo "${REPO}|ERROR|${BASE}|${RESULT}"
      fi
    fi
  else
    echo "${REPO}|IN_SYNC|${BASE}|—"
  fi
done
