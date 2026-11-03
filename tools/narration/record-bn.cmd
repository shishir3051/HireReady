@echo off
rem Records HireReady's Bangla narration with the free AI4Bharat Indic Parler-TTS voice (see README.md).
rem The first run sets up Python, downloads the model (about 3.7 GB) and asks you to log in to Hugging Face.
rem Stop any time with Ctrl+C; run it again to continue. Extra arguments go to record-bn.py (e.g. --limit 5).
setlocal
cd /d "%~dp0"

if not exist .venv-bn\Scripts\python.exe (
  echo Setting up Python 3.11 for the Bangla voice...
  py -3.11 -m venv .venv-bn || goto :fail
  .venv-bn\Scripts\python.exe -m pip install --upgrade pip || goto :fail
  .venv-bn\Scripts\python.exe -m pip install -r requirements-bn.txt || goto :fail
)
if not exist node_modules\.bin\tsx.cmd (
  call npm.cmd install || goto :fail
)

.venv-bn\Scripts\python.exe record-bn.py --check-login
if errorlevel 1 (
  echo.
  echo The Bangla voice model needs a free Hugging Face account:
  echo   1. Sign in at https://huggingface.co and open https://huggingface.co/ai4bharat/indic-parler-tts
  echo   2. Click "Agree and access repository"
  echo   3. Create a "Read" token at https://huggingface.co/settings/tokens and paste it below
  echo.
  .venv-bn\Scripts\huggingface-cli.exe login || goto :fail
)

call npx.cmd tsx generate-bn.ts export || goto :fail
.venv-bn\Scripts\python.exe record-bn.py %*
call npx.cmd tsx generate-bn.ts finish --prune || goto :fail
echo.
echo Done. To publish the Bangla clips: git add client/public/narration/bn, commit and push.
exit /b 0

:fail
echo.
echo Something failed: see the messages above.
exit /b 1
