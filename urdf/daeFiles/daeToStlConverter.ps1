Get-ChildItem *.dae | ForEach-Object {
     $outputFile = $_.BaseName + ".stl"
     assimp export $_.FullName $outputFile -f stl --rotate Z_UP
     Write-Output "Converted $($_.Name) to $outputFile"
}