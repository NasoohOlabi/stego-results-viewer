param(
	[ValidateRange(1024, 65535)]
	[int]$Port = 3107,
	[ValidateRange(1, 300)]
	[int]$ReadinessTimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
$healthUrl = "http://127.0.0.1:$Port/share-health"
$deadline = [DateTime]::UtcNow.AddSeconds($ReadinessTimeoutSeconds)
$ready = $false

while ([DateTime]::UtcNow -lt $deadline) {
	try {
		$response = Invoke-RestMethod -Method Get -Uri $healthUrl -TimeoutSec 2
		if ($response.service -eq "stego-results-viewer-share" -and $response.mode -eq "read-only") {
			$ready = $true
			break
		}
		Start-Sleep -Seconds 1
	} catch {
		Start-Sleep -Seconds 1
	}
}

if (-not $ready) {
	throw "The read-only Stego viewer identity check failed at $healthUrl. No tunnel was started."
}

Write-Host "Starting the Cloudflare tunnel for the verified read-only viewer on port $Port."
cloudflared tunnel --protocol http2 --url "http://127.0.0.1:$Port"
