# Quick Start Guide

## 🚀 Apply to Any Project in 3 Steps

### Step 1: Copy Configuration
```bash
cp -r .code-quality-config your-project/
```

### Step 2: Run Setup
```bash
cd your-project
bash .code-quality-config/setup.sh
```

### Step 3: Validate
```bash
npm run validate
```

## 📋 What Gets Checked

✅ **Type Safety**
- No `any` types
- Strict TypeScript mode
- Proper type definitions

✅ **Import Safety**
- No direct native module imports
- Safe require() patterns
- Null checks

✅ **Error Handling**
- Proper error types (`unknown` not `any`)
- Explicit error handling
- Safe fallbacks

✅ **Code Quality**
- ESLint rules
- Consistent patterns
- Best practices

## 🎯 Daily Usage

### Before Committing
```bash
npm run validate
```

### Type Check Only
```bash
npm run type-check
```

### Lint Only
```bash
npm run lint
```

## ⚙️ Configuration Files

- `tsconfig.strict.json` - TypeScript strict settings
- `.eslintrc.strict.js` - ESLint rules
- `validate-code.sh` - Validation script (Linux/Mac)
- `validate-code.bat` - Validation script (Windows)
- `pre-commit-hook.sh` - Git pre-commit hook

## 📚 Full Documentation

- [Complete Rules](./CODE_QUALITY_RULES.md)
- [Import Patterns](./IMPORT_PATTERNS.md)
- [Setup Guide](./APPLY_TO_PROJECT.md)

## 🆘 Troubleshooting

**Windows?** Use `.bat` scripts or Git Bash:
```bash
.code-quality-config\validate-code.bat
```

**Permission denied?**
```bash
chmod +x .code-quality-config/*.sh
```

**Need help?** See [APPLY_TO_PROJECT.md](./APPLY_TO_PROJECT.md)
