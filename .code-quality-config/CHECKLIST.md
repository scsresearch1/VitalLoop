# Code Quality Checklist

Use this checklist when setting up code quality rules for a new project or reviewing existing code.

## ✅ Setup Checklist

- [ ] Copied `.code-quality-config` directory to project
- [ ] Ran `setup.sh` script
- [ ] TypeScript strict mode enabled in `tsconfig.json`
- [ ] ESLint configuration installed (`.eslintrc.js`)
- [ ] Required dependencies installed (`@typescript-eslint/*`, `eslint-plugin-import`)
- [ ] npm scripts added to `package.json`
- [ ] Pre-commit hook installed (optional)
- [ ] Validation script runs successfully (`npm run validate`)

## ✅ Code Review Checklist

### Type Safety
- [ ] No `any` types in source code (except test files)
- [ ] All functions have explicit return types
- [ ] All variables have proper types
- [ ] No `@ts-ignore` or `@ts-nocheck` comments
- [ ] TypeScript compiles without errors (`tsc --noEmit`)

### Import Safety
- [ ] No direct imports from `react-native-*` modules (except core)
- [ ] Native modules use `require()` with try/catch
- [ ] Safe interfaces defined for native module types
- [ ] Null checks before using native module APIs
- [ ] Error handling for unavailable modules

### Error Handling
- [ ] No `catch (error: any)` - use `catch (error: unknown)`
- [ ] Type guards used for error handling
- [ ] Variables set to `null` in catch blocks
- [ ] Errors properly logged and handled

### Code Quality
- [ ] ESLint passes without errors
- [ ] No `console.log` in production code (use logger)
- [ ] Consistent import ordering
- [ ] No unused variables or imports
- [ ] Proper async/await error handling

## ✅ Pre-Commit Checklist

Before every commit:
- [ ] Run `npm run validate`
- [ ] Fix all TypeScript errors
- [ ] Fix all ESLint errors
- [ ] No `any` types introduced
- [ ] No unsafe imports added
- [ ] Error handling is proper

## ✅ CI/CD Checklist

- [ ] Validation script runs in CI pipeline
- [ ] Type check runs in CI
- [ ] Lint check runs in CI
- [ ] Build fails on quality errors
- [ ] Quality reports visible in CI

## 🚨 Common Issues to Watch For

### Red Flags
- ❌ `any` type usage
- ❌ Direct `import` from native modules
- ❌ `catch (error: any)`
- ❌ `@ts-ignore` comments
- ❌ `console.log` statements
- ❌ Missing null checks
- ❌ Unhandled promises

### Green Flags
- ✅ Proper TypeScript types
- ✅ Safe import patterns
- ✅ `catch (error: unknown)` with type guards
- ✅ Explicit error handling
- ✅ Null checks before use
- ✅ Proper logging (not console.log)

## 📊 Validation Commands

```bash
# Full validation
npm run validate

# Individual checks
npm run type-check  # TypeScript only
npm run lint        # ESLint only

# Manual checks
grep -r ":\s*any" --include="*.ts" --include="*.tsx" .
grep -r "from ['\"]react-native-" --include="*.ts" --include="*.tsx" .
```

## 🎯 Project-Specific Notes

Add project-specific checks here:

- [ ] Custom rule 1
- [ ] Custom rule 2
- [ ] Custom rule 3

---

**Last Updated**: When you complete this checklist, note the date and any project-specific findings.
