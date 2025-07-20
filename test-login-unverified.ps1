$loginData = @{
    email = "2024ucs1234@mnit.ac.in"
    password = "testpassword123"
}

$body = $loginData | ConvertTo-Json
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing login with unverified user..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Login failed (as expected for unverified user)!" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}
