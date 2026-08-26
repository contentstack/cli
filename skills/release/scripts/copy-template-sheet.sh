#!/usr/bin/env bash
# Copies the CAB sheet template and renames it for the current release.
# Usage:  NEW_SHEET_ID=$(bash scripts/copy-template-sheet.sh "$GOOGLE_ACCESS_TOKEN" "PROJ | 16-08-2026 | Release" "$TEMPLATE_ID")
# Output: prints the new Google Sheet ID to stdout on success; error message to stderr on failure.

TOKEN="$1"
SHEET_NAME="$2"
TEMPLATE_ID="$3"

if [ -z "$TOKEN" ] || [ -z "$SHEET_NAME" ] || [ -z "$TEMPLATE_ID" ]; then
  echo "Usage: $0 <access_token> <sheet_name> <template_id>" >&2
  exit 1
fi

RESPONSE=$(curl -s -X POST \
  "https://www.googleapis.com/drive/v3/files/${TEMPLATE_ID}/copy" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${SHEET_NAME}\"}")

NEW_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -z "$NEW_ID" ]; then
  echo "ERROR: Failed to copy template. Response: $RESPONSE" >&2
  exit 1
fi

echo "$NEW_ID"
