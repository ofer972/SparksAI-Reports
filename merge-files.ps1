$excludeDirs = @('node_modules', '.next', 'dist', 'build', '.git', '.vscode', '.idea', 'out', 'coverage', '.turbo')
$extensions = @('.js', '.ts', '.tsx', '.jsx', '.json', '.config.js', '.config.ts', '.mjs', '.cjs')
$output = 'Mergedfile.txt'

# Remove existing output file
if (Test-Path $output) {
    Remove-Item $output
}

Write-Host "Merging relevant source files into $output..."
Write-Host ""

# Get all files recursively
$allFiles = Get-ChildItem -Recurse -File

# Filter files
$files = $allFiles | Where-Object {
    $ext = [System.IO.Path]::GetExtension($_.FullName)
    $shouldInclude = $extensions -contains $ext
    
    if (-not $shouldInclude) {
        return $false
    }
    
    $path = $_.FullName
    $shouldExclude = $false
    
    foreach ($dir in $excludeDirs) {
        if ($path -like "*\$dir\*" -or $path -like "*\$dir") {
            $shouldExclude = $true
            break
        }
    }
    
    return -not $shouldExclude
}

$count = 0
foreach ($file in $files) {
    $count++
    Write-Host "Processing $count : $($file.Name)"
    
    Add-Content -Path $output -Value "`r`n========================================`r`nFile: $($file.FullName)`r`n========================================`r`n`r`n"
    Get-Content -Path $file.FullName -Raw | Add-Content -Path $output
    Add-Content -Path $output -Value "`r`n`r`n"
}

Write-Host "`r`nDone! Merged $count files into $output"

