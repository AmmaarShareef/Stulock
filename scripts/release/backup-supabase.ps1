param(
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)

if (-not $env:SUPABASE_ACCESS_TOKEN -or -not $env:SUPABASE_DB_PASSWORD) { throw "Set SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD in this shell first." }
$resolvedDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedDirectory | Out-Null
$backupPath = Join-Path $resolvedDirectory ("stulock-public-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".sql")
pnpm exec supabase db dump --linked --schema public --file $backupPath
if (-not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -lt 1024) { throw "Backup was not created or is unexpectedly small." }
Write-Output "Backup written to $backupPath. Encrypt and store it outside this workspace."
