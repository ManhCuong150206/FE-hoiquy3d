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
Invoke-BrowserCommand -CommandArgs @('open','http://127.0.0.1:4300/','--headed') | Out-Null
try {
    foreach ($suite in @('entry','lab','learning-offline','mobile-fallback','sphere','motion','slides','neon','navigation-layout','learning-route','smooth-learning','card-glow','algorithm-flight')) {
        Invoke-BrowserCommand -CommandArgs @('run-code',"--filename=e2e/ui-redesign/$suite.e2e.js") | Set-Content "output/playwright/$suite-result.log"
    }
} finally { Invoke-BrowserCommand -CommandArgs @('close') | Out-Null }
