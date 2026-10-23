@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto folder_error

where docker >nul 2>&1
if errorlevel 1 goto docker_missing
where powershell.exe >nul 2>&1
if errorlevel 1 goto powershell_missing
docker compose version >nul 2>&1
if errorlevel 1 goto compose_missing
docker info >nul 2>&1
if errorlevel 1 goto docker_stopped

set "LOCAL_IP=127.0.0.1"
echo Starting LooperLands. The first build can take a few minutes.
docker compose -f docker-compose-local.yml up --build -d
if errorlevel 1 goto build_error

echo Waiting for the local game launcher...
powershell.exe -NoLogo -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; for ($attempt=0; $attempt -lt 60; $attempt++) { try { $response=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8010/local/api/catalog' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 2 }; exit 1"
if errorlevel 1 goto readiness_error

echo.
echo LooperLands is ready: http://127.0.0.1:8010/local/
echo Choose your map and avatar in the browser, then click Start game.
start "" "http://127.0.0.1:8010/local/"
popd
exit /b 0

:folder_error
echo Could not open the LooperLands folder.
pause
exit /b 1

:docker_missing
echo Install Docker Desktop, start it, then double-click start-local.bat again.
goto failed

:powershell_missing
echo Windows PowerShell is unavailable. Enable it in Windows, then try again.
goto failed

:compose_missing
echo Update Docker Desktop to a version with Docker Compose, then try again.
goto failed

:docker_stopped
echo Start Docker Desktop and wait until its engine is running, then double-click start-local.bat again.
goto failed

:build_error
echo The local build failed. Check the Docker output above, fix the reported error, then try again.
goto failed

:readiness_error
docker compose -f docker-compose-local.yml logs --tail=40 gameserver
echo The local game did not become ready. Check the logs above and that ports 8000 and 8010 are available, then try again.

:failed
echo.
pause
popd
exit /b 1
