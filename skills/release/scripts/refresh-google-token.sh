#!/usr/bin/env bash
# Exchanges the stored refresh token for a fresh Google access token.
# Usage:  source scripts/refresh-google-token.sh
# Effect: exports $GOOGLE_ACCESS_TOKEN into the calling shell.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS_FILE="$SKILL_DIR/references/google-credentials.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "ERROR: $CREDS_FILE not found. Run the OAuth setup in SKILL.md Step 6 first." >&2
  return 1 2>/dev/null || exit 1
fi

REFRESH_TOKEN=$(jq -r '.refresh_token' "$CREDS_FILE")
CLIENT_ID=$(jq -r '.client_id' "$CREDS_FILE")
CLIENT_SECRET=$(jq -r '.client_secret' "$CREDS_FILE")

if [ -z "$REFRESH_TOKEN" ] || [ "$REFRESH_TOKEN" = "null" ]; then
  echo "ERROR: refresh_token missing in $CREDS_FILE" >&2
  return 1 2>/dev/null || exit 1
fi

RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token")

GOOGLE_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // empty')

if [ -z "$GOOGLE_ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to refresh token. Response: $RESPONSE" >&2
  return 1 2>/dev/null || exit 1
fi

export GOOGLE_ACCESS_TOKEN
echo "Access token refreshed successfully."
