Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Creates a small, browser-loadable CU Reviews snapshot for the current Cornell
# Fall 2026 LAW data.  It only copies public aggregate course fields; review
# text is deliberately not mirrored into the planner.
$projectRoot = Split-Path -Parent $PSScriptRoot
$courseDataFile = Join-Path $projectRoot "data\cornell-law-2026-27.zh-CN.json"
$outputDirectory = Join-Path $projectRoot "data\cureviews"
$outputFile = Join-Path $outputDirectory "cureviews-law-current.js"
$baseUrl = "https://www.cureviews.org"

if (-not (Test-Path -LiteralPath $courseDataFile)) {
  throw "Current Cornell course data was not found: $courseDataFile"
}

$currentData = Get-Content -LiteralPath $courseDataFile -Raw | ConvertFrom-Json
$wantedCodes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($course in @($currentData.courses)) {
  if ($course.code) { [void]$wantedCodes.Add([string]$course.code) }
}

$searchBody = @{ query = "LAW" } | ConvertTo-Json -Compress
$searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/search/get-courses" -Method Post -ContentType "application/json" -Body $searchBody
$records = [ordered]@{}

foreach ($course in @($searchResponse.result.courses)) {
  $code = "{0} {1}" -f ([string]$course.classSub).ToUpperInvariant(), [string]$course.classNum
  if (-not $wantedCodes.Contains($code)) { continue }
  $records[$code] = [ordered]@{
    courseId = [string]$course._id
    title = [string]$course.classTitle
    rating = if ($null -ne $course.classRating) { [double]$course.classRating } else { 0 }
    difficulty = if ($null -ne $course.classDifficulty) { [double]$course.classDifficulty } else { 0 }
    workload = if ($null -ne $course.classWorkload) { [double]$course.classWorkload } else { 0 }
    semesters = @($course.classSems)
    url = "$baseUrl/course/LAW/$($course.classNum)"
  }
}

$snapshot = [ordered]@{
  source = "CU Reviews public course search"
  fetchedAt = (Get-Date).ToUniversalTime().ToString("o")
  scope = "Historical CU Reviews aggregate data matched to the current Fall 2026 LAW course codes; it is not an official course-data source."
  records = $records
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$json = $snapshot | ConvertTo-Json -Depth 8 -Compress
Set-Content -LiteralPath $outputFile -Encoding UTF8 -NoNewline -Value "window.CUREVIEWS_LAW_CURRENT = $json;"
Write-Host "CU Reviews snapshot refreshed: $($records.Count) matching Fall 2026 LAW courses -> $outputFile"
