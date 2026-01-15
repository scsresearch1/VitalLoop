# How to Apply Code Quality Rules to Your Project

## Quick Setup (Recommended)

### Option 1: Automated Setup
```bash
# Copy the .code-quality-config directory to your project root
cp -r .code-quality-config your-project/

# Run the setup script
cd your-project
bash .code-quality-config/setup.sh
```

### Option 2: Manual Setup

#### Step 1: Copy Configuration Files
```bash
cp -r .code-quality-config your-project/
```

#### Step 2: Update tsconfig.json
Add these settings to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Step 3: Install ESLint Dependencies
```bash
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-import
```

#### Step 4: Create/Update .eslintrc.js
Copy `.code-quality-config/.eslintrc.strict.js` to `.eslintrc.js`:
```bash
cp .code-quality-config/.eslintrc.strict.js .eslintrc.js
```

#### Step 5: Add npm Scripts
Add to your `package.json`:
```json
{
  "scripts": {
    "validate": "bash .code-quality-config/validate-code.sh",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "quality-check": "npm run type-check && npm run lint"
  }
}
```

#### Step 6: Set Up Pre-commit Hook (Optional)
```bash
# Make executable (Linux/Mac)
chmod +x .code-quality-config/pre-commit-hook.sh

# Copy to git hooks
cp .code-quality-config/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Verify Setup

Run validation:
```bash
npm run validate
```

Or manually:
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Full validation
bash .code-quality-config/validate-code.sh
```

## Fixing Common Issues

### Issue: "Cannot find module" errors
**Solution**: Install missing dependencies:
```bash
npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Issue: ESLint errors about native modules
**Solution**: Update `.eslintrc.js` to exclude your node_modules:
```javascript
module.exports = {
  // ... other config
  ignorePatterns: ['node_modules/', 'dist/', 'build/'],
};
```

### Issue: TypeScript strict mode too strict
**Solution**: Gradually enable strict options:
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Issue: Pre-commit hook not running
**Solution**: Check if hook is executable:
```bash
ls -la .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## CI/CD Integration

### GitHub Actions
Add to `.github/workflows/quality.yml`:
```yaml
name: Code Quality
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run validate
```

### GitLab CI
Add to `.gitlab-ci.yml`:
```yaml
quality_check:
  stage: test
  script:
    - npm install
    - npm run validate
```

## Project-Specific Customization

### Exclude Files from Checks
Update `.eslintrc.js`:
```javascript
module.exports = {
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.config.js', // Exclude config files
  ],
};
```

### Allow 'any' in Specific Files
Add to `.eslintrc.js`:
```javascript
overrides: [
  {
    files: ['legacy/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
],
```

## Troubleshooting

### Scripts not executable (Windows)
On Windows, use Git Bash or WSL to run `.sh` scripts, or use the `.bat` version:
```bash
.code-quality-config\validate-code.bat
```

### Permission Denied
```bash
chmod +x .code-quality-config/*.sh
```

### ESLint conflicts with existing config
Merge rules instead of replacing:
```javascript
module.exports = {
  ...require('.code-quality-config/.eslintrc.strict.js'),
  // Your existing rules
  rules: {
    // Override specific rules if needed
  },
};
```

## Next Steps

1. ✅ Run `npm run validate` to see current issues
2. ✅ Fix 'any' types and unsafe imports
3. ✅ Enable pre-commit hook
4. ✅ Add to CI/CD pipeline
5. ✅ Document any exceptions

## Support

For issues or questions:
- Check [CODE_QUALITY_RULES.md](./CODE_QUALITY_RULES.md)
- Review [IMPORT_PATTERNS.md](./IMPORT_PATTERNS.md)
- Run `npm run validate` for detailed error messages
