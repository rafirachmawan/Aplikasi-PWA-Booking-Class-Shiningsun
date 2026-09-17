@echo off
REM Script to cleanly kill all Node.js processes and restart dev server
echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul

REM Wait for port to be released
ping localhost -n 3 >nul

echo.
echo ====================================
echo All Node.js processes killed successfully!
echo ====================================
echo.
echo Now you can run 'npm run dev' again
echo.
pause
