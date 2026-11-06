@echo off
title Marcia Atelier - Iniciar
cd /d "%~dp0"

echo Iniciando o backend (API)...
start "Marcia Atelier - Backend" cmd /k "cd /d "%~dp0backend" && npm start"

echo Iniciando o frontend (telas)...
start "Marcia Atelier - Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Pronto! Duas janelas foram abertas. O navegador abre sozinho em instantes.
echo Para desligar o sistema, feche as duas janelas.
timeout /t 5 >nul
