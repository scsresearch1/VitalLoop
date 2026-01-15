# Build Monitor Script
# Continuously monitors the Android build process

Write-Host "=== Android Build Monitor ===" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

$checkInterval = 5 # seconds
$buildStarted = $false

while ($true) {
    Clear-Host
    Write-Host "=== Build Status Check - $(Get-Date -Format 'HH:mm:ss') ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Check for running build processes
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "Node.js processes running: $($nodeProcesses.Count)" -ForegroundColor Green
        $nodeProcesses | Select-Object Id, CPU, @{Label="Memory (MB)"; Expression={[math]::Round($_.WorkingSet / 1MB, 2)}} | Format-Table
    }
    
    if ($javaProcesses) {
        Write-Host "Java processes running (Gradle): $($javaProcesses.Count)" -ForegroundColor Green
        $javaProcesses | Select-Object Id, CPU, @{Label="Memory (MB)"; Expression={[math]::Round($_.WorkingSet / 1MB, 2)}} | Format-Table
    }
    
    Write-Host ""
    
    # Check Android folder
    if (Test-Path "android") {
        Write-Host "✅ Android folder exists" -ForegroundColor Green
        
        # Check for build folder
        if (Test-Path "android\app\build") {
            Write-Host "✅ Build folder exists" -ForegroundColor Green
            
            # Check for recent activity
            $recentFiles = Get-ChildItem "android\app\build" -Recurse -File -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-2) } | 
                Sort-Object LastWriteTime -Descending | 
                Select-Object -First 5
            
            if ($recentFiles) {
                Write-Host "📝 Recent build activity (last 2 minutes):" -ForegroundColor Yellow
                $recentFiles | Format-Table Name, LastWriteTime, @{Label="Size (KB)"; Expression={[math]::Round($_.Length / 1KB, 2)}}
                $buildStarted = $true
            }
            
            # Check for APK files
            if (Test-Path "android\app\build\outputs\apk") {
                $apks = Get-ChildItem "android\app\build\outputs\apk" -Recurse -Filter "*.apk" -ErrorAction SilentlyContinue
                if ($apks) {
                    Write-Host "🎉 APK FILES FOUND!" -ForegroundColor Green
                    $apks | Format-Table Name, LastWriteTime, @{Label="Size (MB)"; Expression={[math]::Round($_.Length / 1MB, 2)}}, FullName
                } else {
                    Write-Host "⏳ No APK files yet - build in progress..." -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "⏳ Build folder not created yet - waiting for build to start..." -ForegroundColor Yellow
        }
        
        # Check Gradle cache
        if (Test-Path "android\.gradle") {
            $gradleSize = (Get-ChildItem "android\.gradle" -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum / 1MB
            Write-Host "📦 Gradle cache: $([math]::Round($gradleSize, 2)) MB" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️ Android folder not found - run 'npx expo prebuild --clean' first" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Next check in $checkInterval seconds..." -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    
    Start-Sleep -Seconds $checkInterval
}
