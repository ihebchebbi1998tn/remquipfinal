$ErrorActionPreference = "Stop"

$base = "https://luccibyey.com.tn/remquip/backend"

Write-Host "Logging in as admin..."
$loginUrl = "$base/api.php?path=auth%2Flogin"
$bodyObj = @{
  email = "admin@remquip.local"
  password = "password"
}
$bodyJson = ($bodyObj | ConvertTo-Json -Compress)
$resp = Invoke-RestMethod -Method Post -Uri $loginUrl -ContentType "application/json" -Body $bodyJson
$token = $resp.data.token
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Token empty. Login response: $($resp | ConvertTo-Json -Depth 6)"
}

Write-Host ("Token prefix: " + $token.Substring(0,10))
Write-Host ("Token length: " + $token.Length)

$headers = @{
  Authorization = "Bearer $token"
  "X-Auth-Token" = $token
}

function Test-Get([string]$path) {
  $url = "$base/api.php?path=$path"
  try {
    $r = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
    Write-Host ("OK  " + $path)
  } catch {
    $status = 0
    $bodyText = ""
    try {
      $status = $_.Exception.Response.StatusCode.value__
    } catch { }
    try {
      $resp = $_.Exception.Response
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $bodyText = $reader.ReadToEnd()
    } catch { }
    Write-Host ("FAIL " + $path + " status=" + $status)
    if ($bodyText -ne "") {
      Write-Host ("  BODY=" + $bodyText.Substring(0, [Math]::Min(600, $bodyText.Length)))
    }
  }
}

Write-Host "==== Protected admin read endpoints ===="

$adminReadPaths = @(
  "dashboard%2Fstats",
  "dashboard%2Frecent-orders",
  "dashboard%2Factivity-log",
  "dashboard%2Ftop-products",
  "inventory%2Flow-stock",
  "inventory%2Flogs%3Fpage%3D1%26limit%3D20",
  "orders%3Fpage%3D1%26limit%3D5",
  "customers%3Fpage%3D1%26limit%3D5",
  "discounts%3Fpage%3D1%26limit%3D5",
  "analytics%2Fdashboard",
  "analytics%2Fevents%2Fsummary%3Fdays%3D30",
  "settings",
  "users%3Fpage%3D1%26limit%3D10",
  "admin%2Fpermissions",
  "cms%2Fpages%3Fpage%3D1%26limit%3D5",
  "cms%2Fpages%2Fhome%2Fcontent%3Flocale%3Den"
)

foreach ($p in $adminReadPaths) {
  Test-Get $p
}

Write-Host "Done."

