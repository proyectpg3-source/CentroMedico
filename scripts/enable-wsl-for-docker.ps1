#requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

Write-Host "Habilitando Windows Subsystem for Linux..." -ForegroundColor Cyan
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

Write-Host "Habilitando Virtual Machine Platform..." -ForegroundColor Cyan
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

Write-Host ""
Write-Host "Listo. Reinicia Windows y luego abre Docker Desktop." -ForegroundColor Green
Write-Host "Despues del reinicio, vuelve al proyecto y ejecuta:" -ForegroundColor Green
Write-Host 'docker compose -f docker-compose.microservices.yml up --build' -ForegroundColor Yellow

Read-Host "Presiona Enter para cerrar"
