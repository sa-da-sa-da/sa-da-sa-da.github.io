# 截图校验脚本：对本地 Hugo 预览页做无头浏览器截图
# 用法：& .\out-shot\shot.ps1
param(
    [string]$Url = 'http://localhost:1313/tools/qking/',
    [string]$Name = 'qking',
    [int]$Width = 1440,
    [int]$Height = 2200
)

$ErrorActionPreference = 'Continue'

$browsers = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    Write-Host 'NO BROWSER FOUND'
    exit 1
}

$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'out-shot'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir ($Name + '.png')
$profileDir = Join-Path $env:TEMP ('shot_profile_' + [guid]::NewGuid().ToString('N'))

$args = @(
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    "--user-data-dir=$profileDir",
    "--screenshot=$outFile",
    "--window-size=$Width,$Height",
    '--virtual-time-budget=10000',
    $Url
)

$p = Start-Process -FilePath $browser -ArgumentList $args -Wait -PassThru `
    -RedirectStandardError (Join-Path $env:TEMP 'shot_err.log') `
    -RedirectStandardOutput (Join-Path $env:TEMP 'shot_out.log')

Write-Host ('exit=' + $p.ExitCode + ' browser=' + (Split-Path -Leaf $browser))
if (Test-Path $outFile) {
    Get-ChildItem $outFile | Select-Object Name, Length | Format-Table -AutoSize
} else {
    Write-Host 'NO SCREENSHOT'
    Get-Content (Join-Path $env:TEMP 'shot_err.log') -Tail 15 -ErrorAction SilentlyContinue
}
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
