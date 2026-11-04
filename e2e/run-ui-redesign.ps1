param([switch]$Headed, [string]$FromSuite = '')
$ErrorActionPreference = 'Stop'
# Start the Angular dev server on http://127.0.0.1:4300 before running this script.
$sessionName = 'hoiquy-redesign-tests'
New-Item -ItemType Directory -Path 'output/playwright' -Force | Out-Null
function Invoke-BrowserCommand {
    param([string[]]$CommandArgs)
    $result = & npx.cmd --yes --package '@playwright/cli' playwright-cli "-s=$sessionName" @CommandArgs 2>&1
    $exitCode = $LASTEXITCODE
    $result | Out-Host
    if ($exitCode -ne 0 -or ($result -join "`n") -match '### Error') { throw 'Browser check failed. See the command output.' }
    return $result
}
$openArgs = @('open','http://127.0.0.1:4300/')
if ($Headed) { $openArgs += '--headed' }
Invoke-BrowserCommand -CommandArgs $openArgs | Out-Null
try {
    Invoke-BrowserCommand -CommandArgs @('run-code','--filename=e2e/ui-redesign/api-fixture.e2e.js') | Out-Null
    $started = -not $FromSuite
    foreach ($suite in @('entry','entry-validation','lab','learning-offline','lesson-restart','page-modes','mobile-fallback','sphere','motion','slides','neon','navigation-layout','learning-route','smooth-learning','card-glow','shared-planet','lab-arrival','planet','algorithm-flight','model-integrity')) {
        if ($suite -eq $FromSuite) { $started = $true }
        if (-not $started) { continue }
        Invoke-BrowserCommand -CommandArgs @('run-code',"--filename=e2e/ui-redesign/$suite.e2e.js") | Set-Content "output/playwright/$suite-result.log"
    }
    if (-not $started) { throw 'Unknown FromSuite' }
} finally { Invoke-BrowserCommand -CommandArgs @('close') | Out-Null }
