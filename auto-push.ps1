$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$idleSeconds = 12
$lastChange = Get-Date
$pending = $false
$isPushing = $false

function Test-GitAvailable {
  git --version *> $null
  return $LASTEXITCODE -eq 0
}

function Invoke-AutoPush {
  if ($script:isPushing) { return }
  $script:isPushing = $true

  try {
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
      Write-Host "No changes to upload."
      return
    }

    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host ""
    Write-Host "Uploading changes at $stamp ..."

    git add -A
    if ($LASTEXITCODE -ne 0) { throw "git add failed" }

    $statusAfterAdd = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($statusAfterAdd)) {
      Write-Host "Nothing staged."
      return
    }

    git commit -m "auto: update app $stamp"
    if ($LASTEXITCODE -ne 0) { throw "git commit failed" }

    git push origin main
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }

    Write-Host "Uploaded to GitHub. GitHub Pages will update shortly."
  } catch {
    Write-Host "Auto upload stopped by an error: $($_.Exception.Message)"
    Write-Host "Fix the issue, then save any file to try again."
  } finally {
    $script:isPushing = $false
  }
}

if (-not (Test-GitAvailable)) {
  Write-Host "Git was not found. Install Git first, then run this again."
  exit 1
}

Write-Host "DCA auto upload is watching:"
Write-Host $root
Write-Host ""
Write-Host "Keep this window open while coding."
Write-Host "After a file changes, it waits $idleSeconds seconds, then commits and pushes to GitHub."
Write-Host "Press Ctrl+C to stop."
Write-Host ""

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $root
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$ignoredPattern = "\\(\.git|\.claude|\.wrangler|node_modules|dist|build)(\\|$)|\.log$|\.env"

$handler = {
  $path = $Event.SourceEventArgs.FullPath
  if ($path -match $using:ignoredPattern) { return }
  $script:lastChange = Get-Date
  $script:pending = $true
  Write-Host "Change detected: $path"
}

$subscriptions = @(
  Register-ObjectEvent $watcher Changed -Action $handler
  Register-ObjectEvent $watcher Created -Action $handler
  Register-ObjectEvent $watcher Deleted -Action $handler
  Register-ObjectEvent $watcher Renamed -Action $handler
)

try {
  while ($true) {
    Start-Sleep -Seconds 2
    if ($pending -and -not $isPushing) {
      $age = (New-TimeSpan -Start $lastChange -End (Get-Date)).TotalSeconds
      if ($age -ge $idleSeconds) {
        $pending = $false
        Invoke-AutoPush
      }
    }
  }
} finally {
  foreach ($sub in $subscriptions) {
    Unregister-Event -SubscriptionId $sub.Id -ErrorAction SilentlyContinue
  }
  $watcher.Dispose()
}
