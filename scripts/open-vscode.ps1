$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CodeCmd = Get-Command code -ErrorAction SilentlyContinue

if (-not $CodeCmd) {
  Write-Error "VS Code 'code' parancs nem talalhato. Telepitsd a VS Code CLI-t (Add to PATH), majd probald ujra."
  exit 1
}

& $CodeCmd.Source -n $ProjectRoot
Start-Sleep -Milliseconds 800
& $CodeCmd.Source --reuse-window $ProjectRoot --command workbench.action.tasks.build
