@echo off
REM Windows batch script for code validation
REM Usage: .code-quality-config\validate-code.bat

echo 🔍 Code Quality Validation
echo ================================
echo.

set ERRORS=0
set WARNINGS=0

REM 1. TypeScript Type Check
echo 1. Running TypeScript type check...
call npx tsc --noEmit
if %ERRORLEVEL% EQU 0 (
    echo    ✅ TypeScript check passed
) else (
    echo    ❌ TypeScript check failed
    set /a ERRORS+=1
)
echo.

REM 2. ESLint Check
echo 2. Running ESLint...
call npx eslint . --ext .ts,.tsx,.js,.jsx
if %ERRORLEVEL% EQU 0 (
    echo    ✅ ESLint check passed
) else (
    echo    ❌ ESLint check failed
    set /a ERRORS+=1
)
echo.

REM 3. Check for 'any' types
echo 3. Checking for 'any' types...
findstr /S /R /C:":\s*any" /C:"as any" /C:"<any>" *.ts *.tsx 2>nul | findstr /V /C:"node_modules" /C:"dist" /C:"build" /C:".test.ts" /C:".spec.ts" >nul
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Found instances of 'any' type
    set /a WARNINGS+=1
) else (
    echo    ✅ No 'any' types found
)
echo.

REM Summary
echo ================================
if %ERRORS% EQU 0 if %WARNINGS% EQU 0 (
    echo ✅ All checks passed!
    exit /b 0
) else if %ERRORS% EQU 0 (
    echo ⚠️  %WARNINGS% warning(s) found, but no errors
    exit /b 0
) else (
    echo ❌ Validation failed: %ERRORS% error(s), %WARNINGS% warning(s)
    exit /b 1
)
