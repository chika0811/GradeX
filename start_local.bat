@echo off
echo Starting GradeX Local Server...
echo.

IF NOT EXIST "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo Starting development server...
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with error code %ERRORLEVEL%.
    pause
)
