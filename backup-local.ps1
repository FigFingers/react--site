$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$output = "backup_$ts.zip"

$items = @()

Get-ChildItem ".env*" -File -ErrorAction SilentlyContinue |
    ForEach-Object { $items += $_.FullName }

if (Test-Path "prisma") {
    Get-ChildItem "prisma\*.db" -File -ErrorAction SilentlyContinue |
        ForEach-Object { $items += $_.FullName }
}

if (Test-Path "docs")    { $items += (Resolve-Path "docs").Path }
if (Test-Path ".claude") { $items += (Resolve-Path ".claude").Path }

if ($items.Count -gt 0) {
    $manifest = "backup_$ts.txt"
    $items | Out-File -FilePath $manifest -Encoding UTF8
    $items += (Resolve-Path $manifest).Path

    Compress-Archive -Path $items -DestinationPath $output -Force
    Write-Host "Created: $output ($($items.Count - 1) entries)"
    foreach ($i in $items) { Write-Host "  - $i" }
} else {
    Write-Host "Nothing to backup."
}
