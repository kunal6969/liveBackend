$testRegistration = @{
    email = "2024ume5678@mnit.ac.in"
    password = "testpassword123"
    fullName = "Final Test User"
    gender = "Male"
    whatsappNumber = "+919876543212"
}

$body = $testRegistration | ConvertTo-Json
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing registration with completely new user..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
    
    # Extract verification code for next test
    $verificationCode = $response.verificationCode
    if ($verificationCode) {
        Write-Host "Verification code: $verificationCode" -ForegroundColor Yellow
        
        # Test verification immediately
        Write-Host "Testing verification..." -ForegroundColor Blue
        $verifyData = @{
            email = $response.user.email
            code = $verificationCode
        }
        $verifyBody = $verifyData | ConvertTo-Json
        
        try {
            $verifyResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/verify-email" -Method POST -Body $verifyBody -Headers $headers
            Write-Host "✅ Email verification successful!" -ForegroundColor Green
            Write-Host ($verifyResponse | ConvertTo-Json -Depth 3)
        } catch {
            Write-Host "❌ Verification failed!" -ForegroundColor Red
            Write-Host $_.Exception.Message
            if ($_.ErrorDetails) {
                Write-Host $_.ErrorDetails.Message
            }
        }
    }
} catch {
    Write-Host "❌ Registration failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}
