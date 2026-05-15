# Full backup: project copy, git bundle, Supabase JSON export, .env copy
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRoot = Join-Path $env:USERPROFILE "Backups\balancy-full-$timestamp"

Write-Host "Backup root: $backupRoot"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

# 1) Project files (exclude heavy/regenerable dirs)
$projectDest = Join-Path $backupRoot "project"
New-Item -ItemType Directory -Path $projectDest -Force | Out-Null

$robolog = Join-Path $backupRoot "robocopy-project.log"
robocopy $projectRoot $projectDest /MIR /XD node_modules .git /NFL /NDL /NJH /NJS /nc /ns /np `
  /XF "robocopy-project.log" | Out-Null
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -ge 8) {
  throw "robocopy failed with exit code $robocopyExit (see $robolog)"
}

# 2) Git bundle (all refs)
$gitDir = Join-Path $backupRoot "git"
New-Item -ItemType Directory -Path $gitDir -Force | Out-Null
Push-Location $projectRoot
try {
  git bundle create (Join-Path $gitDir "repository.bundle") --all
  git status -sb | Out-File -FilePath (Join-Path $gitDir "status.txt") -Encoding utf8
  git branch -a | Out-File -FilePath (Join-Path $gitDir "branches.txt") -Encoding utf8
  git remote -v | Out-File -FilePath (Join-Path $gitDir "remotes.txt") -Encoding utf8
  git log -20 --oneline | Out-File -FilePath (Join-Path $gitDir "log-20.txt") -Encoding utf8
  git diff | Out-File -FilePath (Join-Path $gitDir "uncommitted.patch") -Encoding utf8
  git diff --cached | Out-File -FilePath (Join-Path $gitDir "staged.patch") -Encoding utf8
}
finally {
  Pop-Location
}

# 3) Secrets snapshot (.env) — keep private
$secretsDir = Join-Path $backupRoot "secrets"
New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
  Copy-Item $envFile (Join-Path $secretsDir ".env") -Force
}

# 4) SQL migrations copy
$migrationsSrc = Join-Path $projectRoot "supabase\migrations"
$migrationsDest = Join-Path $backupRoot "supabase\migrations"
if (Test-Path $migrationsSrc) {
  New-Item -ItemType Directory -Path $migrationsDest -Force | Out-Null
  Copy-Item (Join-Path $migrationsSrc "*") $migrationsDest -Recurse -Force
}

# 5) Supabase data export (JSON via API)
$supabaseDataDir = Join-Path $backupRoot "supabase\data"
Push-Location $projectRoot
try {
  node (Join-Path $projectRoot "scripts\backup-export-supabase.mjs") $supabaseDataDir
}
finally {
  Pop-Location
}

# 6) README
$readme = @"
Balancy full backup
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source project: $projectRoot

Contents:
- project/     — source tree (no node_modules, no .git)
- git/         — repository.bundle (--all), status, patches
- secrets/     — .env copy (DO NOT SHARE)
- supabase/migrations/ — SQL migration files
- supabase/data/       — table JSON exports + manifest.json

Restore git bundle:
  git clone git/repository.bundle restored-repo

Restore project:
  Copy project/ to a new folder, run npm install, copy secrets/.env

Supabase:
  JSON is logical backup via REST API. For native SQL dump, use Supabase Dashboard
  → Database → Backups, or pg_dump with connection string from project settings.
"@
Set-Content -Path (Join-Path $backupRoot "README.txt") -Value $readme -Encoding utf8

Write-Host ""
Write-Host "Backup completed: $backupRoot"
Write-Host "Size:"
Get-ChildItem $backupRoot -Recurse -File | Measure-Object -Property Length -Sum |
  ForEach-Object { "{0:N2} MB" -f ($_.Sum / 1MB) }
