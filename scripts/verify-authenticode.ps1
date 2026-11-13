param(
	[Parameter(Mandatory = $true)]
	[string[]]$Path,
	[Parameter(Mandatory = $true)]
	[string]$ExpectedSignerSubject
)

$ErrorActionPreference = 'Stop'

foreach ($filePath in $Path) {
	if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
		throw "Signed file not found: $filePath"
	}

	$signature = Get-AuthenticodeSignature -LiteralPath $filePath
	if ($signature.Status -ne 'Valid') {
		throw "Authenticode status for '$filePath' is '$($signature.Status)', expected 'Valid'."
	}
	if ($null -eq $signature.SignerCertificate -or $signature.SignerCertificate.Subject -cne $ExpectedSignerSubject) {
		throw "Signer subject for '$filePath' does not match the configured publisher subject."
	}
	if ($null -eq $signature.TimeStamperCertificate) {
		throw "A trusted RFC 3161 timestamp is missing from '$filePath'."
	}

	Write-Output "PASS: $filePath | signer: $($signature.SignerCertificate.Subject) | timestamp: $($signature.TimeStamperCertificate.Subject)"
}
