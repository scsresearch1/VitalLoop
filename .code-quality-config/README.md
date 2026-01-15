# Code Quality Configuration

Global code quality rules and validation tools for all projects.

## Quick Start

```bash
# 1. Copy this directory to your project
cp -r .code-quality-config your-project/

# 2. Run setup script
cd your-project
bash .code-quality-config/setup.sh

# 3. Run validation
npm run validate
```

## Files

- **`tsconfig.strict.json`** - Strict TypeScript configuration
- **`.eslintrc.strict.js`** - ESLint rules for type safety
- **`pre-commit-hook.sh`** - Git pre-commit hook
- **`validate-code.sh`** - Standalone validation script
- **`setup.sh`** - Automated setup script
- **`CODE_QUALITY_RULES.md`** - Complete rules documentation
- **`IMPORT_PATTERNS.md`** - Safe import patterns guide

## Rules Enforced

1. ✅ No `any` types
2. ✅ No direct native module imports
3. ✅ Proper error handling (`unknown` not `any`)
4. ✅ TypeScript strict mode
5. ✅ ESLint type checking
6. ✅ Consistent import patterns

## Usage

### Manual Validation
```bash
bash .code-quality-config/validate-code.sh
```

### Pre-commit (Automatic)
The pre-commit hook runs automatically on `git commit`.

### CI/CD Integration
Add to your CI pipeline:
```yaml
- run: bash .code-quality-config/validate-code.sh
```

## Documentation

- [Code Quality Rules](./CODE_QUALITY_RULES.md)
- [Safe Import Patterns](./IMPORT_PATTERNS.md)
