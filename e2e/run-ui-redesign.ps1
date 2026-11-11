param([switch]$Headed, [string]$FromSuite = '', [string[]]$Suites = @())
$ErrorActionPreference = 'Stop'
# Start the Angular dev server at 127.0.0.1:4300. Each suite gets a fresh browser profile.
$sessionName = 'hoiquy-redesign-tests'
New-Item -ItemType Directory -Path 'output/playwright' -Force | Out-Null
function Invoke-BrowserCommand {
 param([string[]]$CommandArgs)
 $result = & npx.cmd --yes --package '@playwright/cli' playwright-cli "-s=$sessionName" @CommandArgs 2>&1
 if ($LASTEXITCODE -ne 0 -or ($result -join "`n") -match '### Error') { throw ($result -join "`n") }
 return $result
}
$all = @('audit-fixes','comparison','pearl-transition','pearl-theme','auth-session','guest-memory','entry','entry-validation','lab','learning-offline','lesson-restart','page-modes','mobile-fallback','sphere','motion','slides','neon','navigation-layout','learning-route','smooth-learning','card-glow','shared-planet','lab-arrival','planet','algorithm-flight','model-integrity')
if ($Suites.Count) { $all = $Suites }
if ($FromSuite -and $FromSuite -notin $all) { throw "Unknown FromSuite: $FromSuite" }
$started = -not $FromSuite
$results = @()
foreach ($suite in $all) {
 if ($suite -eq $FromSuite) { $started = $true }
 if (-not $started) { continue }
 $openArgs = @('open','http://127.0.0.1:4300/')
 if ($Headed) { $openArgs += '--headed' }
 try {
  Invoke-BrowserCommand -CommandArgs $openArgs | Out-Null
  Invoke-BrowserCommand -CommandArgs @('run-code','--filename=e2e/ui-redesign/api-fixture.e2e.js') | Out-Null
  Invoke-BrowserCommand -CommandArgs @('run-code',"--filename=e2e/ui-redesign/$suite.e2e.js") | Set-Content "output/playwright/$suite-result.log"
  $results += [pscustomobject]@{suite=$suite;status='passed'}
  Write-Host "PASS $suite"
 } catch {
  $_.ToString() | Set-Content "output/playwright/$suite-result.log"
  $results += [pscustomobject]@{suite=$suite;status='failed';error=$_.ToString()}
  Write-Host "FAIL $suite (see output/playwright/$suite-result.log)"
 } finally {
  & npx.cmd --yes --package '@playwright/cli' playwright-cli "-s=$sessionName" close 2>&1 | Out-Null
  & npx.cmd --yes --package '@playwright/cli' playwright-cli "-s=$sessionName" delete-data 2>&1 | Out-Null
 }
 $results | ConvertTo-Json -Depth 4 | Set-Content 'output/playwright/suite-summary.json'
}
if ($results | Where-Object status -eq 'failed') { throw 'Some UI suites failed; all selected suites were attempted. See suite-summary.json.' }
