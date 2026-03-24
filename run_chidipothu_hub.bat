@echo off
setlocal
cd /d "%~dp0"

echo Starting Backend...
start "Chidipothu Hub Backend" cmd /k "cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 8001"

echo Starting Frontend...
start "Chidipothu Hub Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting up.
echo Backend: http://localhost:8001
echo Frontend: http://localhost:3000
echo.
pause
