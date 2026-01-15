#!/bin/bash
# Pre-commit hook to run code quality checks
# Install: cp .code-quality-config/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

echo "🔍 Running pre-commit checks..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if TypeScript is available
if command -v tsc &> /dev/null; then
    echo "📘 Running TypeScript type check..."
    if npx tsc --noEmit; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
    else
        echo -e "${RED}❌ TypeScript check failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript not found, skipping type check${NC}"
fi

# Check if ESLint is available
if command -v eslint &> /dev/null; then
    echo "🔧 Running ESLint..."
    if npx eslint . --ext .ts,.tsx,.js,.jsx; then
        echo -e "${GREEN}✅ ESLint check passed${NC}"
    else
        echo -e "${RED}❌ ESLint check failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  ESLint not found, skipping lint check${NC}"
fi

# Check for unsafe patterns
echo "🚨 Checking for unsafe patterns..."

# Check for 'any' types (excluding test files)
if grep -r ":\s*any" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude="*.test.ts" --exclude="*.spec.ts" .; then
    echo -e "${RED}❌ Found 'any' types in source code${NC}"
    echo "   Use proper types instead of 'any'"
    exit 1
fi

# Check for direct imports from react-native-* (excluding core RN)
if grep -r "from ['\"]react-native-" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude="*.test.ts" --exclude="*.spec.ts" . | grep -v "react-native$" | grep -v "react-native-reanimated" | grep -v "react-native-gesture-handler"; then
    echo -e "${RED}❌ Found direct imports from native modules${NC}"
    echo "   Use safe import pattern with require() and try/catch"
    exit 1
fi

# Check for error: any in catch blocks
if grep -r "catch\s*(error:\s*any)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build .; then
    echo -e "${RED}❌ Found 'error: any' in catch blocks${NC}"
    echo "   Use 'error: unknown' instead"
    exit 1
fi

echo -e "${GREEN}✅ All pre-commit checks passed${NC}"
exit 0
