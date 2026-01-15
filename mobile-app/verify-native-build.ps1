# Native Build Verification Script
# Verifies that the app is a native Android build with BLE module

Write-Host "=== NATIVE ANDROID BUILD VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$allChecksPass = $true

# Check 1: Android folder exists
Write-Host "1. Checking Android native folder..." -ForegroundColor Yellow
if (Test-Path "android") {
    Write-Host "   ✅ Android folder exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Android folder NOT found" -ForegroundColor Red
    Write-Host "   → Run: npx expo prebuild --clean" -ForegroundColor Yellow
    $allChecksPass = $false
}

# Check 2: react-native-ble-manager in build.gradle
Write-Host ""
Write-Host "2. Checking native module in build.gradle..." -ForegroundColor Yellow
if (Test-Path "android\app\build.gradle") {
    $buildGradle = Get-Content "android\app\build.gradle" -Raw
    if ($buildGradle -match "react-native-ble-manager") {
        Write-Host "   ✅ react-native-ble-manager found in build.gradle" -ForegroundColor Green
    } else {
        Write-Host "   ❌ react-native-ble-manager NOT in build.gradle" -ForegroundColor Red
        Write-Host "   → Module not linked - rebuild required" -ForegroundColor Yellow
        $allChecksPass = $false
    }
} else {
    Write-Host "   ⚠️ build.gradle not found (prebuild may be needed)" -ForegroundColor Yellow
}

# Check 3: react-native-ble-manager in settings.gradle
Write-Host ""
Write-Host "3. Checking native module in settings.gradle..." -ForegroundColor Yellow
if (Test-Path "android\settings.gradle") {
    $settingsGradle = Get-Content "android\settings.gradle" -Raw
    if ($settingsGradle -match "react-native-ble-manager") {
        Write-Host "   ✅ react-native-ble-manager found in settings.gradle" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ react-native-ble-manager not explicitly in settings.gradle" -ForegroundColor Yellow
        Write-Host "   (May be auto-linked - check if APK builds)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ settings.gradle not found" -ForegroundColor Yellow
}

# Check 4: Plugin in app.json
Write-Host ""
Write-Host "4. Checking plugin in app.json..." -ForegroundColor Yellow
if (Test-Path "app.json") {
    $appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
    if ($appJson.expo.plugins -contains "react-native-ble-manager") {
        Write-Host "   ✅ react-native-ble-manager plugin in app.json" -ForegroundColor Green
    } else {
        Write-Host "   ❌ react-native-ble-manager plugin NOT in app.json" -ForegroundColor Red
        Write-Host "   → Add plugin to app.json and rebuild" -ForegroundColor Yellow
        $allChecksPass = $false
    }
} else {
    Write-Host "   ❌ app.json not found" -ForegroundColor Red
    $allChecksPass = $false
}

# Check 5: expo-dev-client in dependencies
Write-Host ""
Write-Host "5. Checking expo-dev-client..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.'expo-dev-client') {
        Write-Host "   ✅ expo-dev-client in dependencies" -ForegroundColor Green
    } else {
        Write-Host "   ❌ expo-dev-client NOT in dependencies" -ForegroundColor Red
        Write-Host "   → Install: npm install expo-dev-client" -ForegroundColor Yellow
        $allChecksPass = $false
    }
} else {
    Write-Host "   ❌ package.json not found" -ForegroundColor Red
    $allChecksPass = $false
}

# Check 6: APK exists (if built)
Write-Host ""
Write-Host "6. Checking for built APK..." -ForegroundColor Yellow
if (Test-Path "android\app\build\outputs\apk") {
    $apks = Get-ChildItem "android\app\build\outputs\apk" -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue
    if ($apks) {
        Write-Host "   ✅ APK files found:" -ForegroundColor Green
        $apks | ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host "      - $($_.Name) ($sizeMB MB) - $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "   ⚠️ APK folder exists but no APK files" -ForegroundColor Yellow
        Write-Host "   → Build may be in progress or failed" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ No APK folder - build not completed yet" -ForegroundColor Yellow
    Write-Host "   → Run: npx expo run:android" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
if ($allChecksPass) {
    Write-Host "✅ Build configuration looks correct" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEP: Verify at runtime:" -ForegroundColor Yellow
    Write-Host "  1. Install APK on device" -ForegroundColor White
    Write-Host "  2. Launch app" -ForegroundColor White
    Write-Host "  3. Check console for: '✅ NativeModules.BleManager: PRESENT'" -ForegroundColor White
    Write-Host ""
    Write-Host "If runtime check fails, rebuild:" -ForegroundColor Yellow
    Write-Host "  adb uninstall com.scs.research.india.mobileapp" -ForegroundColor White
    Write-Host "  rm -rf android/.gradle android/app/build" -ForegroundColor White
    Write-Host "  npx expo prebuild --clean" -ForegroundColor White
    Write-Host "  npx expo run:android" -ForegroundColor White
} else {
    Write-Host "❌ Build configuration issues found" -ForegroundColor Red
    Write-Host ""
    Write-Host "FIX REQUIRED before building:" -ForegroundColor Yellow
    Write-Host "  1. Fix the issues listed above" -ForegroundColor White
    Write-Host "  2. Run: npx expo prebuild --clean" -ForegroundColor White
    Write-Host "  3. Verify all checks pass" -ForegroundColor White
    Write-Host "  4. Then run: npx expo run:android" -ForegroundColor White
}

Write-Host ""
Write-Host "=== RUNTIME VERIFICATION ===" -ForegroundColor Cyan
Write-Host "After installing APK, check app console for:" -ForegroundColor Yellow
Write-Host "  ✅ NativeModules.BleManager: PRESENT" -ForegroundColor Green
Write-Host ""
Write-Host "If you see '❌ MISSING', the APK doesn't contain native module." -ForegroundColor Red
Write-Host "→ Rebuild required (see instructions above)" -ForegroundColor Yellow
