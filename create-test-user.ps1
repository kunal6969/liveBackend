$testUser = @{
    email = "2025ucs9999@mnit.ac.in"
    password = "simplepass123"
    fullName = "Test User Login"
    gender = "Male"
    whatsappNumber = "+919999999999"
}

$body = $testUser | ConvertTo-Json
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Creating fresh test user..."
Write-Host "Email: $($testUser.email)"
Write-Host "Password: $($testUser.password)"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/test-register" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Test user created successfully!" -ForegroundColor Green
    Write-Host "User ID: $($response.user.id)" -ForegroundColor Yellow
    Write-Host "Email: $($response.user.email)" -ForegroundColor Yellow
    Write-Host "Verified: $($response.user.isEmailVerified)" -ForegroundColor Yellow
    
    # Test login immediately
    Write-Host "`nTesting login with created user..."
    $loginData = @{
        email = $testUser.email
        password = $testUser.password
    }
    $loginBody = $loginData | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method POST -Body $loginBody -Headers $headers
        Write-Host "✅ Login test successful!" -ForegroundColor Green
        Write-Host "Logged in as: $($loginResponse.user.fullName)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Login test failed!" -ForegroundColor Red
        Write-Host $_.Exception.Message
        if ($_.ErrorDetails) {
            Write-Host $_.ErrorDetails.Message
        }
    }
    
} catch {
    Write-Host "❌ User creation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}
