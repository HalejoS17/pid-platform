$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (
    Join-Path $PSScriptRoot "..\.."
)

$envPath = Join-Path $projectRoot ".env"
$composePath = Join-Path $projectRoot "compose.yaml"
$sqlPath = Join-Path `
    $projectRoot `
    "database\bootstrap\001_roles_and_schemas.sql"

if (-not (Test-Path $envPath)) {
    throw "No se encontró el archivo .env en la raíz del proyecto."
}

function Import-DotEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    foreach ($line in Get-Content $Path) {
        $value = $line.Trim()

        if (
            [string]::IsNullOrWhiteSpace($value) -or
            $value.StartsWith("#")
        ) {
            continue
        }

        $parts = $value.Split("=", 2)

        if ($parts.Count -ne 2) {
            continue
        }

        $name = $parts[0].Trim()
        $content = $parts[1].Trim().Trim('"')

        [Environment]::SetEnvironmentVariable(
            $name,
            $content,
            "Process"
        )
    }
}

Import-DotEnv -Path $envPath

$requiredVariables = @(
    "POSTGRES_DB",
    "POSTGRES_SUPERUSER",
    "POSTGRES_SUPERUSER_PASSWORD",
    "PID_MIGRATOR_PASSWORD",
    "PID_APP_PASSWORD",
    "PID_WORKER_PASSWORD"
)

foreach ($variable in $requiredVariables) {
    $currentValue = [Environment]::GetEnvironmentVariable(
        $variable,
        "Process"
    )

    if ([string]::IsNullOrWhiteSpace($currentValue)) {
        throw "Falta la variable obligatoria: $variable"
    }
}

Write-Host "`nIniciando PostgreSQL..."

docker compose `
    --env-file $envPath `
    -f $composePath `
    up -d postgres

if ($LASTEXITCODE -ne 0) {
    throw "No fue posible iniciar PostgreSQL."
}

Write-Host "Esperando a que PostgreSQL esté disponible..."

$isReady = $false

for ($attempt = 1; $attempt -le 30; $attempt++) {
    docker compose `
        --env-file $envPath `
        -f $composePath `
        exec -T postgres `
        pg_isready `
        -U $env:POSTGRES_SUPERUSER `
        -d $env:POSTGRES_DB | Out-Null

    if ($LASTEXITCODE -eq 0) {
        $isReady = $true
        break
    }

    Start-Sleep -Seconds 2
}

if (-not $isReady) {
    throw "PostgreSQL no respondió dentro del tiempo esperado."
}

Write-Host "Creando roles y esquemas..."

Get-Content -Raw $sqlPath |
    docker compose `
        --env-file $envPath `
        -f $composePath `
        exec -T postgres `
        psql `
        -v ON_ERROR_STOP=1 `
        -U $env:POSTGRES_SUPERUSER `
        -d $env:POSTGRES_DB `
        -v "database_name=$($env:POSTGRES_DB)" `
        -v "migrator_password=$($env:PID_MIGRATOR_PASSWORD)" `
        -v "app_password=$($env:PID_APP_PASSWORD)" `
        -v "worker_password=$($env:PID_WORKER_PASSWORD)"

if ($LASTEXITCODE -ne 0) {
    throw "Falló la creación de roles o esquemas."
}

Write-Host "`nPostgreSQL fue inicializado correctamente."
