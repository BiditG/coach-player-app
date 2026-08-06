#!/usr/bin/env bash
#
# Pre-commit security scan — blocks commits containing secrets or dangerous patterns.
# Called by: .husky/pre-commit
#
# Note: This script DETECTS dangerous patterns like eval() — it does not use them.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Get staged files (exclude binary, lock, workflow files, and files that
# legitimately contain secret-shaped text: this script's own detection patterns
# and the placeholder .env.example — both are false-positive sources).
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM \
  | grep -vE '\.(lock|png|jpg|svg|ico|woff2?)$' \
  | grep -vE '^(\.github/workflows/|package-lock\.json|pnpm-lock\.yaml|\.env\.example$|scripts/security-check\.sh$)' \
  || true)

if [[ -z "$STAGED_FILES" ]]; then
    exit 0
fi

echo "[security] Scanning staged files..."

# Check 1: .env files with potential secrets
for file in $STAGED_FILES; do
    if [[ "$file" =~ \.env(\..+)?$ && "$file" != ".env.example" ]]; then
        echo -e "${RED}[BLOCKED]${NC} $file — never commit .env files with secrets"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 2: Hardcoded secret patterns
SECRET_PATTERNS='(password|secret|token|api_key|apikey|private_key)\s*[:=]\s*["\x27][^\s"'\'']{8,}'
for file in $STAGED_FILES; do
    if git diff --cached -- "$file" | grep -iEq "$SECRET_PATTERNS"; then
        echo -e "${RED}[BLOCKED]${NC} $file — possible hardcoded secret"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 3: Anthropic API keys
for file in $STAGED_FILES; do
    if git diff --cached -- "$file" | grep -qE 'sk-ant-api-'; then
        echo -e "${RED}[BLOCKED]${NC} $file — Anthropic API key detected"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 4: Supabase service role key (JWT pattern)
for file in $STAGED_FILES; do
    if git diff --cached -- "$file" | grep -qE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}'; then
        echo -e "${RED}[BLOCKED]${NC} $file — JWT/Supabase service key detected"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 5: Secrets in NEXT_PUBLIC_ variables (anti-pattern)
# Match only when SECRET/PRIVATE/SERVICE_ROLE is part of the SAME NEXT_PUBLIC_
# identifier (a public var that IS a secret). `[A-Z0-9_]*` (not `.*`) avoids the
# false positive of an error message listing two distinct vars on one line, e.g.
# "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY".
for file in $STAGED_FILES; do
    if git diff --cached -- "$file" | grep -qE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE)'; then
        echo -e "${RED}[BLOCKED]${NC} $file — secret exposed via NEXT_PUBLIC_"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 6: Detect eval() usage in code (dangerous pattern)
for file in $STAGED_FILES; do
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
        EVAL_PATTERN='\beval\s*\('
        if git diff --cached -- "$file" | grep -qE "$EVAL_PATTERN"; then
            echo -e "${YELLOW}[WARNING]${NC} $file — detected eval() usage (security risk)"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

# Check 7: dangerouslySetInnerHTML (warning)
for file in $STAGED_FILES; do
    if git diff --cached -- "$file" | grep -q 'dangerouslySetInnerHTML'; then
        echo -e "${YELLOW}[WARNING]${NC} $file — dangerouslySetInnerHTML usage"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Summary
if [[ $ERRORS -gt 0 ]]; then
    echo ""
    echo -e "${RED}Security check FAILED: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo "Fix the issues above before committing."
    exit 1
fi

if [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}Security check passed with $WARNINGS warning(s)${NC}"
else
    echo -e "${GREEN}Security check passed${NC}"
fi
