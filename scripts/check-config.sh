#!/usr/bin/env bash
set -uo pipefail
fail=0

echo "Checking frontend config usage..."

# 1. Every CONFIG.X used in the JS must exist in the template
if [ -d frontend/js ]; then
  keys_used=$(grep -rhoE "CONFIG\.[A-Z_]+" frontend/js 2>/dev/null | sed 's/CONFIG\.//' | sort -u)
  for k in $keys_used; do
    if ! grep -q "$k" frontend/config.template.js; then
      echo "::error::CONFIG.$k is used in frontend/js but missing from frontend/config.template.js"
      fail=1
    fi
  done
fi

# 2. No hardcoded AWS endpoints or access keys in the frontend
if grep -rEn "amazonaws\.com|execute-api|AKIA[0-9A-Z]{16}" frontend \
     --include=*.js --include=*.html 2>/dev/null; then
  echo "::error::Hardcoded AWS endpoint or access key found in frontend — use CONFIG instead"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "Config check passed."
fi

exit $fail
