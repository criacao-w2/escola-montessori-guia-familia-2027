@echo off
cd /d "%~dp0"
echo Verificando dependencias...
call npm install
echo.
echo Preview em http://localhost:5173  (feche esta janela para parar)
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
pause
