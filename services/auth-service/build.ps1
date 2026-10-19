mkdir build
$targets = @(
    @{ GOOS="windows"; GOARCH="amd64"; OUT="app-windows-amd64.exe" },
    @{ GOOS="linux";   GOARCH="amd64"; OUT="app-linux-amd64" },
    @{ GOOS="darwin";  GOARCH="arm64"; OUT="app-darwin-arm64" }
)

foreach ($t in $targets) {
    $env:GOOS = $t.GOOS
    $env:GOARCH = $t.GOARCH
    Write-Host "Building for $($t.GOOS)/$($t.GOARCH)..."
    go build -o $t.OUT
}
