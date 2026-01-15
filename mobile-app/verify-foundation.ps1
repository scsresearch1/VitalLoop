# Critical Foundation Checks Verification Script
# Run this AFTER installing the APK and launching the app

Write-Host "=== CRITICAL FOUNDATION CHECKS ===" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️  These checks MUST be verified at RUNTIME on the device" -ForegroundColor Yellow
Write-Host ""
Write-Host "After launching the app, check the console/logs for:" -ForegroundColor Cyan
Write-Host ""

Write-Host "CHECK 1: NativeModules.BleManager non-null" -ForegroundColor Yellow
Write-Host "  Look for: '✅ YES - 1. NativeModules.BleManager non-null'" -ForegroundColor Green
Write-Host "  Or: '✅ NativeModules.BleManager: PRESENT'" -ForegroundColor Green
Write-Host "  If you see '❌ NO' or '❌ MISSING' → REJECT" -ForegroundColor Red
Write-Host ""

Write-Host "CHECK 2: APK built via expo run:android or eas build (not Expo Go)" -ForegroundColor Yellow
Write-Host "  Look for: '✅ YES - 2. Not Expo Go'" -ForegroundColor Green
Write-Host "  Check app icon/name - should NOT say 'Expo Go'" -ForegroundColor Green
Write-Host "  If you see '❌ NO' → Wrong build method, rebuild required" -ForegroundColor Red
Write-Host ""

Write-Host "CHECK 3: App starts WITHOUT 'BLE native module not available' error" -ForegroundColor Yellow
Write-Host "  Look for: NO error message on screen" -ForegroundColor Green
Write-Host "  Look for: '✅ ALL FOUNDATION CHECKS PASSED'" -ForegroundColor Green
Write-Host "  If you see the error → REJECT, rebuild required" -ForegroundColor Red
Write-Host ""

Write-Host "CHECK 4: BleManager.start() executes without throwing" -ForegroundColor Yellow
Write-Host "  Look for: '✅ CRITICAL CHECK 4 PASSED: BleManager.start() executed without throwing'" -ForegroundColor Green
Write-Host "  Look for: '✅ BLE Manager initialized'" -ForegroundColor Green
Write-Host "  If you see '❌ CRITICAL CHECK 4 FAILED' → REJECT" -ForegroundColor Red
Write-Host ""

Write-Host "=== ACCEPTANCE RULE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If ALL 4 checks show ✅ YES:" -ForegroundColor Green
Write-Host "  → ACCEPT - Foundation verified" -ForegroundColor Green
Write-Host "  → Can proceed with scanning, GATT, data parsing" -ForegroundColor Green
Write-Host ""
Write-Host "If ANY check shows ❌ NO:" -ForegroundColor Red
Write-Host "  → REJECT IMMEDIATELY" -ForegroundColor Red
Write-Host "  → Do NOT proceed with scanning, GATT, or data parsing" -ForegroundColor Red
Write-Host "  → Fix build/configuration issues first" -ForegroundColor Red
Write-Host ""

Write-Host "=== How to Check ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Install APK on device" -ForegroundColor White
Write-Host "2. Launch app" -ForegroundColor White
Write-Host "3. Check console/logs (Metro bundler output or device logs)" -ForegroundColor White
Write-Host "4. Look for the 4 check results above" -ForegroundColor White
Write-Host "5. Verify ALL show ✅ YES" -ForegroundColor White
Write-Host ""

Write-Host "=== Console Commands ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To check manually in app console:" -ForegroundColor Yellow
Write-Host ""
Write-Host 'const { NativeModules } = require("react-native");' -ForegroundColor Gray
Write-Host 'console.log("BleManager:", NativeModules.BleManager ? "PRESENT" : "MISSING");' -ForegroundColor Gray
Write-Host 'console.log("Is null?", NativeModules.BleManager === null);' -ForegroundColor Gray
Write-Host 'console.log("Is undefined?", NativeModules.BleManager === undefined);' -ForegroundColor Gray
Write-Host ""
