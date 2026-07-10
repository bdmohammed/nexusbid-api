$exclude = @(
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.next',
    '.turbo',
    '.nx',
    '.cache',
    '.vscode',
    '.idea'
)

function Show-Tree {
    param(
        [string]$Path = ".",
        [string]$Prefix = ""
    )

    $items = Get-ChildItem -LiteralPath $Path | Where-Object {
        $exclude -notcontains $_.Name
    } | Sort-Object @{Expression = {$_.PSIsContainer}; Descending = $true}, Name

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]

        $isLast = $i -eq ($items.Count - 1)

        if ($isLast) {
            $branch = "└── "
            $nextPrefix = $Prefix + "    "
        }
        else {
            $branch = "├── "
            $nextPrefix = $Prefix + "│   "
        }

        Write-Host "$Prefix$branch$($item.Name)"

        if ($item.PSIsContainer) {
            Show-Tree -Path $item.FullName -Prefix $nextPrefix
        }
    }
}

Write-Host "."
Show-Tree