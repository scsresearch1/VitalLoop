# Code Quality Rules - Global Standards

This document defines the global code quality rules that should be applied across all projects.

## 🚨 Critical Rules (Must Follow)

### 1. Type Safety
- ❌ **NEVER** use `any` type
- ✅ Use proper types or `unknown` with type guards
- ✅ Enable TypeScript strict mode
- ✅ Run `tsc --noEmit` before committing

### 2. Native Module Imports
- ❌ **NEVER** directly import from `react-native-*` modules (except core)
- ✅ Use `require()` with try/catch pattern
- ✅ Create safe interface types
- ✅ Check for null/undefined before use

### 3. Error Handling
- ❌ **NEVER** use `catch (error: any)`
- ✅ Use `catch (error: unknown)` with type guards
- ✅ Always handle errors explicitly
- ✅ Set variables to null in catch blocks

### 4. Code Review Checklist
Before committing, verify:
- [ ] No `any` types
- [ ] No direct native module imports
- [ ] All errors properly typed
- [ ] Null checks for optional values
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors

## 📋 Implementation Steps

### Step 1: Copy Configuration Files
```bash
# Copy to your project root
cp -r .code-quality-config/* your-project/
```

### Step 2: Update tsconfig.json
Merge `tsconfig.strict.json` into your `tsconfig.json`:
```bash
# Merge strict settings
jq -s '.[0] * .[1]' tsconfig.json .code-quality-config/tsconfig.strict.json > tsconfig.json.new
mv tsconfig.json.new tsconfig.json
```

### Step 3: Update ESLint Config
Merge `.eslintrc.strict.js` into your `.eslintrc.js`:
```bash
# Copy and customize
cp .code-quality-config/.eslintrc.strict.js .eslintrc.js
```

### Step 4: Install Dependencies
```bash
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-import
```

### Step 5: Set Up Pre-commit Hook
```bash
# Make executable
chmod +x .code-quality-config/pre-commit-hook.sh

# Install hook
cp .code-quality-config/pre-commit-hook.sh .git/hooks/pre-commit
```

### Step 6: Run Validation
```bash
# Run validation script
bash .code-quality-config/validate-code.sh
```

## 🔍 Validation Commands

### Quick Check
```bash
bash .code-quality-config/validate-code.sh
```

### Type Check Only
```bash
npx tsc --noEmit
```

### Lint Only
```bash
npx eslint . --ext .ts,.tsx
```

### Check for 'any' Types
```bash
grep -r ":\s*any\|as any" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .
```

### Check for Unsafe Imports
```bash
grep -r "from ['\"]react-native-" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . | grep -v "react-native$"
```

## 📝 Safe Import Pattern Template

```typescript
// types.ts - Define safe interface
export interface SafeNativeType {
  // Define properties here
}

// service.ts - Safe import pattern
let NativeModule: any = null;

try {
  const module = require('react-native-native-module');
  NativeModule = module.default || module;
} catch (error) {
  console.error('Native module not available:', error);
  NativeModule = null;
}

// Usage
function useNativeFeature(): SafeNativeType[] {
  if (!NativeModule) {
    throw new Error('Native module not available');
  }
  // Use NativeModule safely
}
```

## 🎯 CI/CD Integration

Add to your CI pipeline:
```yaml
# .github/workflows/quality-check.yml
name: Code Quality
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx tsc --noEmit
      - run: npx eslint . --ext .ts,.tsx
      - run: bash .code-quality-config/validate-code.sh
```

## 📚 Resources

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)
- [Safe Import Patterns](./IMPORT_PATTERNS.md)

## ⚠️ Exceptions

Only allow exceptions with:
1. Written justification in code comments
2. Team approval
3. Issue tracking for future fix

Example:
```typescript
// TODO: Fix this - see issue #123
// Exception: Legacy code, will refactor in Q2
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = getLegacyData();
```
