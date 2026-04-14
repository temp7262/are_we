$smartDetect = "// Smart API detection (works on Vercel, ngrok, localhost)`nvar API_BASE = (window.location.port === '3000')`n    ? 'http://localhost:5000/api'`n    : window.location.origin + '/api';"

$basePath = "c:\Users\ASUS\Desktop\hjksjdhfewjfksldvjlskvjsfkdvjlsidjv\are_we"

$files = @(
    "Frontend\js\dashboard.js",
    "Frontend\js\apply.js",
    "Frontend\js\bonafide.js",
    "Frontend\js\character.js",
    "Frontend\js\home.js",
    "Frontend\js\documents.js",
    "Frontend\js\download.js",
    "Frontend\js\feereceipt.js",
    "Frontend\js\migration.js",
    "Frontend\js\noc.js",
    "Frontend\js\notification.js",
    "Frontend\js\transcript.js",
    "Frontend\js\profile.js"
)

foreach ($f in $files) {
    $path = Join-Path $basePath $f
    $content = Get-Content $path -Raw
    # Replace both double-quoted and single-quoted variants
    $content = $content -replace "const API_BASE = `"http://localhost:5000/api`";", $smartDetect
    $content = $content -replace "const API_BASE = 'http://localhost:5000/api';", $smartDetect
    Set-Content $path -Value $content -NoNewline
    Write-Host "Fixed: $f"
}

# Fix track-status.js which also has FILES_BASE
$tsPath = Join-Path $basePath "Frontend\js\track-status.js"
$content = Get-Content $tsPath -Raw
$content = $content -replace "const API_BASE = `"http://localhost:5000/api`";", $smartDetect
$content = $content -replace "const FILES_BASE = `"http://localhost:5000/`";", "var FILES_BASE = window.location.origin + '/';"
Set-Content $tsPath -Value $content -NoNewline
Write-Host "Fixed: track-status.js (API_BASE + FILES_BASE)"

# Fix admin-portal clerk.js, hod.js, principal.js FILES_BASE
$adminFiles = @("Frontend\admin-portal\clerk.js", "Frontend\admin-portal\hod.js", "Frontend\admin-portal\principal.js")
foreach ($f in $adminFiles) {
    $path = Join-Path $basePath $f
    $content = Get-Content $path -Raw
    $content = $content -replace "const FILES_BASE = `"http://localhost:5000/`";", "var FILES_BASE = window.location.origin + '/';"
    Set-Content $path -Value $content -NoNewline
    Write-Host "Fixed FILES_BASE: $f"
}

# Fix db.js - process.exit(1) kills serverless functions
$dbPath = Join-Path $basePath "Backend\config\db.js"
$dbContent = Get-Content $dbPath -Raw
$dbContent = $dbContent -replace "process\.exit\(1\);", "// process.exit(1); // Disabled for Vercel serverless compatibility"
Set-Content $dbPath -Value $dbContent -NoNewline
Write-Host "Fixed: Backend\config\db.js (removed process.exit)"

Write-Host "`nAll files fixed!"
