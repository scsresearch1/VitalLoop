#!/bin/bash
# Standalone script to validate code quality
# Usage: bash .code-quality-config/validate-code.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Code Quality Validation${NC}"
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check command availability
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}⚠️  $1 not found, skipping...${NC}"
        return 1
    fi
    return 0
}

# 1. TypeScript Type Check
if check_command tsc; then
    echo -e "${BLUE}1. Running TypeScript type check...${NC}"
    if npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.log; then
        echo -e "${GREEN}   ✅ TypeScript check passed${NC}"
    else
        echo -e "${RED}   ❌ TypeScript check failed${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# 2. ESLint Check
if check_command eslint; then
    echo -e "${BLUE}2. Running ESLint...${NC}"
    if npx eslint . --ext .ts,.tsx,.js,.jsx 2>&1 | tee /tmp/eslint-output.log; then
        echo -e "${GREEN}   ✅ ESLint check passed${NC}"
    else
        echo -e "${RED}   ❌ ESLint check failed${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# 3. Check for 'any' types
echo -e "${BLUE}3. Checking for 'any' types...${NC}"
ANY_COUNT=$(grep -r ":\s*any\|as any\|<any>" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | wc -l || echo "0")
if [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${RED}   ❌ Found $ANY_COUNT instances of 'any' type${NC}"
    grep -r ":\s*any\|as any\|<any>" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}   ✅ No 'any' types found${NC}"
fi
echo ""

# 4. Check for direct native module imports
echo -e "${BLUE}4. Checking for unsafe native module imports...${NC}"
UNSAFE_IMPORTS=$(grep -r "from ['\"]react-native-" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | grep -v "react-native$" | grep -v "react-native-reanimated" | grep -v "react-native-gesture-handler" | wc -l || echo "0")
if [ "$UNSAFE_IMPORTS" -gt 0 ]; then
    echo -e "${RED}   ❌ Found $UNSAFE_IMPORTS unsafe native module imports${NC}"
    grep -r "from ['\"]react-native-" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | grep -v "react-native$" | grep -v "react-native-reanimated" | grep -v "react-native-gesture-handler" | head -10
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}   ✅ No unsafe imports found${NC}"
fi
echo ""

# 5. Check for error: any in catch blocks
echo -e "${BLUE}5. Checking catch block error types...${NC}"
CATCH_ANY=$(grep -r "catch\s*(error:\s*any)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo . 2>/dev/null | wc -l || echo "0")
if [ "$CATCH_ANY" -gt 0 ]; then
    echo -e "${RED}   ❌ Found $CATCH_ANY catch blocks with 'error: any'${NC}"
    grep -r "catch\s*(error:\s*any)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo . 2>/dev/null | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}   ✅ All catch blocks use proper error types${NC}"
fi
echo ""

# 6. Check for @ts-ignore and @ts-nocheck
echo -e "${BLUE}6. Checking for TypeScript suppressions...${NC}"
TS_SUPPRESS=$(grep -r "@ts-ignore\|@ts-nocheck" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | wc -l || echo "0")
if [ "$TS_SUPPRESS" -gt 0 ]; then
    echo -e "${YELLOW}   ⚠️  Found $TS_SUPPRESS TypeScript suppressions${NC}"
    grep -r "@ts-ignore\|@ts-nocheck" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}   ✅ No TypeScript suppressions found${NC}"
fi
echo ""

# 7. Check for console.log
echo -e "${BLUE}7. Checking for console.log statements...${NC}"
CONSOLE_LOG=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | wc -l || echo "0")
if [ "$CONSOLE_LOG" -gt 0 ]; then
    echo -e "${YELLOW}   ⚠️  Found $CONSOLE_LOG console.log statements${NC}"
    grep -r "console\.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.expo --exclude="*.test.ts" --exclude="*.spec.ts" . 2>/dev/null | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}   ✅ No console.log statements found${NC}"
fi
echo ""

# Summary
echo "================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found, but no errors${NC}"
    exit 0
else
    echo -e "${RED}❌ Validation failed: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    exit 1
fi
