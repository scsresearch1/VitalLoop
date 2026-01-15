#!/bin/bash
# Setup script to apply code quality rules to a project
# Usage: bash .code-quality-config/setup.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up Code Quality Rules${NC}"
echo "======================================"
echo ""

# Check if we're in a project directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  No package.json found. Are you in a project directory?${NC}"
    exit 1
fi

PROJECT_NAME=$(node -p "require('./package.json').name || 'unknown'")
echo -e "${BLUE}Project: ${PROJECT_NAME}${NC}"
echo ""

# Step 1: Check TypeScript
echo -e "${BLUE}1. Checking TypeScript setup...${NC}"
if [ -f "tsconfig.json" ]; then
    echo "   ✅ tsconfig.json exists"
    
    # Check if strict mode is enabled
    if grep -q '"strict":\s*true' tsconfig.json; then
        echo "   ✅ Strict mode enabled"
    else
        echo -e "   ${YELLOW}⚠️  Strict mode not enabled${NC}"
        echo "   Adding strict settings..."
        
        # Backup original
        cp tsconfig.json tsconfig.json.backup
        
        # Merge strict settings (simple merge)
        if command -v jq &> /dev/null; then
            jq '.compilerOptions.strict = true | .compilerOptions.noImplicitAny = true | .compilerOptions.strictNullChecks = true' tsconfig.json > tsconfig.json.tmp
            mv tsconfig.json.tmp tsconfig.json
        else
            echo "   Please manually enable strict mode in tsconfig.json"
        fi
    fi
else
    echo -e "   ${YELLOW}⚠️  No tsconfig.json found${NC}"
    echo "   Creating tsconfig.json from template..."
    cp .code-quality-config/tsconfig.strict.json tsconfig.json
fi
echo ""

# Step 2: Check ESLint
echo -e "${BLUE}2. Checking ESLint setup...${NC}"
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    echo "   ✅ ESLint config exists"
else
    echo "   Creating .eslintrc.js from template..."
    cp .code-quality-config/.eslintrc.strict.js .eslintrc.js
fi
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}3. Checking dependencies...${NC}"
MISSING_DEPS=()

if ! grep -q "@typescript-eslint/parser" package.json; then
    MISSING_DEPS+=("@typescript-eslint/parser")
fi
if ! grep -q "@typescript-eslint/eslint-plugin" package.json; then
    MISSING_DEPS+=("@typescript-eslint/eslint-plugin")
fi
if ! grep -q "eslint-plugin-import" package.json; then
    MISSING_DEPS+=("eslint-plugin-import")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "   Installing missing dependencies..."
    npm install --save-dev ${MISSING_DEPS[@]}
else
    echo "   ✅ All dependencies installed"
fi
echo ""

# Step 4: Set up pre-commit hook
echo -e "${BLUE}4. Setting up pre-commit hook...${NC}"
if [ -d ".git" ]; then
    if [ -f ".git/hooks/pre-commit" ]; then
        echo -e "   ${YELLOW}⚠️  Pre-commit hook already exists${NC}"
        echo "   Backing up to .git/hooks/pre-commit.backup"
        cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
    fi
    
    cp .code-quality-config/pre-commit-hook.sh .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "   ✅ Pre-commit hook installed"
else
    echo -e "   ${YELLOW}⚠️  Not a git repository, skipping pre-commit hook${NC}"
fi
echo ""

# Step 5: Add npm scripts
echo -e "${BLUE}5. Adding npm scripts...${NC}"
if grep -q '"validate"' package.json; then
    echo "   ✅ Validation script exists"
else
    # Add scripts using node
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts['validate'] = 'bash .code-quality-config/validate-code.sh';
        pkg.scripts['type-check'] = 'tsc --noEmit';
        pkg.scripts['lint'] = 'eslint . --ext .ts,.tsx';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "   ✅ Added validation scripts"
fi
echo ""

# Step 6: Run initial validation
echo -e "${BLUE}6. Running initial validation...${NC}"
if bash .code-quality-config/validate-code.sh; then
    echo -e "${GREEN}✅ Setup complete!${NC}"
else
    echo -e "${YELLOW}⚠️  Setup complete, but validation found issues${NC}"
    echo "   Please review and fix the issues above"
fi
echo ""

echo -e "${GREEN}✨ Code quality rules are now active!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review any validation errors"
echo "  2. Fix 'any' types and unsafe imports"
echo "  3. Run 'npm run validate' before committing"
echo ""
