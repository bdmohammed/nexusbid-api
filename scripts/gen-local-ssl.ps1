# ─────────────────────────────────────────────────────────────────────────────
# gen-local-ssl.ps1
#
# Generates a self-signed SSL certificate for local HTTPS testing.
# Only needed if you specifically want to test HTTPS flow locally via Docker.
# For normal local development (npm run dev or docker compose up) HTTPS is NOT
# required — Nginx uses HTTP only for local/dev environments.
#
# Requirements: openssl must be installed.
#   • Git for Windows ships openssl at: C:\Program Files\Git\usr\bin\openssl.exe
#   • Or install via: winget install openssl
#
# Usage:
#   .\scripts\gen-local-ssl.ps1
#
# Output:
#   docker/ssl/cert.pem   (self-signed certificate, valid 825 days)
#   docker/ssl/key.pem    (private key)
#
# Then run Docker with the SSL nginx config:
#   docker compose -f docker-compose.yml -f docker-compose.ssl.yml up --build
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$sslDir = Join-Path $PSScriptRoot "..\docker\ssl"
$certPath = Join-Path $sslDir "cert.pem"
$keyPath  = Join-Path $sslDir "key.pem"
$cnfPath  = Join-Path $sslDir "openssl.cnf"

# Create ssl directory if it doesn't exist
if (-not (Test-Path $sslDir)) {
  New-Item -ItemType Directory -Path $sslDir | Out-Null
  Write-Host "Created: $sslDir"
}

# Write a minimal openssl config with SAN for localhost
$cnfContent = @"
[req]
default_bits        = 2048
prompt              = no
default_md          = sha256
distinguished_name  = dn
x509_extensions     = v3_req

[dn]
C=US
ST=Local
L=Localhost
O=NexusBid Local Dev
CN=localhost

[v3_req]
subjectAltName = @alt_names
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
IP.1  = 127.0.0.1
"@

$cnfContent | Out-File -FilePath $cnfPath -Encoding ascii

# Find openssl
$opensslPaths = @(
  "openssl",
  "C:\Program Files\Git\usr\bin\openssl.exe",
  "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
  "C:\OpenSSL-Win64\bin\openssl.exe"
)

$openssl = $null
foreach ($p in $opensslPaths) {
  try {
    & $p version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $openssl = $p; break }
  } catch { }
}

if (-not $openssl) {
  Write-Error @"
openssl not found. Install it via one of:
  - Git for Windows (includes openssl):  https://git-scm.com
  - winget install openssl
  - Chocolatey: choco install openssl
"@
  exit 1
}

Write-Host "Using openssl: $openssl"
Write-Host "Generating self-signed certificate for localhost..."

& $openssl req `
  -x509 `
  -nodes `
  -days 825 `
  -newkey rsa:2048 `
  -keyout $keyPath `
  -out $certPath `
  -config $cnfPath

if ($LASTEXITCODE -ne 0) {
  Write-Error "Certificate generation failed."
  exit 1
}

Remove-Item $cnfPath -Force

Write-Host ""
Write-Host "✅ Certificates generated successfully:"
Write-Host "   cert.pem : $certPath"
Write-Host "   key.pem  : $keyPath"
Write-Host ""
Write-Host "⚠️  Browser warning: This is a self-signed cert."
Write-Host "   To avoid warnings, trust the cert in your OS keystore,"
Write-Host "   or use 'mkcert' (https://github.com/FiloSottile/mkcert) instead."
Write-Host ""
Write-Host "To use HTTPS locally with Docker:"
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.ssl.yml up --build"
