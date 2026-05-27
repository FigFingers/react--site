@echo off
setlocal enabledelayedexpansion

REM タイムスタンプ生成
for /f "tokens=1-3 delims=/" %%a in ("%date%") do set D=%%a%%b%%c
for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do set T=%%a%%b%%c
set OUTPUT=backup_%D%_%T%.zip

echo Backing up local-only files into %OUTPUT% ...

powershell -NoProfile -Command ^
  "$items = @();" ^
  "Get-ChildItem '.env*' -File -ErrorAction SilentlyContinue | ForEach-Object { $items += $_.FullName };" ^
  "if (Test-Path 'prisma') { Get-ChildItem 'prisma\*.db' -File -ErrorAction SilentlyContinue | ForEach-Object { $items += $_.FullName } };" ^
  "if (Test-Path 'docs')    { $items += (Resolve-Path 'docs').Path };" ^
  "if (Test-Path '.claude') { $items += (Resolve-Path '.claude').Path };" ^
  "if ($items.Count -gt 0) { Compress-Archive -Path $items -DestinationPath '%OUTPUT%' -Force; Write-Host ('Created: %OUTPUT% (' + $items.Count + ' entries)') }" ^
  "else { Write-Host 'Nothing to backup.' }"

pause
