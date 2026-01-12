# Test Roboflow API with local image
param(
    [string]$ImagePath = ""
)

if ($ImagePath -eq "" -or !(Test-Path $ImagePath)) {
    Write-Host "Usage: .\test-api.ps1 -ImagePath 'path\to\your\image.jpg'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or drag and drop an image file onto this script" -ForegroundColor Yellow
    exit
}

Write-Host "Testing Roboflow API..." -ForegroundColor Cyan
Write-Host "Image: $ImagePath" -ForegroundColor Gray

# Read image and convert to base64
$bytes = [System.IO.File]::ReadAllBytes($ImagePath)
$base64 = [Convert]::ToBase64String($bytes)

Write-Host "Image size: $($bytes.Length) bytes" -ForegroundColor Gray
Write-Host "Base64 length: $($base64.Length) characters" -ForegroundColor Gray

# API configuration
$apiUrl = "https://serverless.roboflow.com/boxeyedemo-vbe4d/3"
$apiKey = "Yn6rdd9GN23wHgbEhZeB"

Write-Host "`nSending request to Roboflow..." -ForegroundColor Cyan

try {
    $result = Invoke-RestMethod -Uri "$apiUrl?api_key=$apiKey" `
        -Method Post `
        -Body $base64 `
        -ContentType "application/x-www-form-urlencoded"
    
    Write-Host "`n✓ SUCCESS!" -ForegroundColor Green
    Write-Host "Inference ID: $($result.inference_id)" -ForegroundColor Gray
    Write-Host "Processing time: $($result.time)s" -ForegroundColor Gray
    Write-Host "Image dimensions: $($result.image.width) x $($result.image.height)" -ForegroundColor Gray
    Write-Host "Predictions found: $($result.predictions.Count)" -ForegroundColor Yellow
    
    if ($result.predictions.Count -gt 0) {
        Write-Host "`nDetected objects:" -ForegroundColor Cyan
        foreach ($pred in $result.predictions) {
            Write-Host "  - $($pred.class): $([math]::Round($pred.confidence * 100, 1))% confidence" -ForegroundColor White
        }
    }
    
    Write-Host "`nFull JSON response:" -ForegroundColor Cyan
    $result | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "`n✗ ERROR!" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
