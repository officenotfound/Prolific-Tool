@echo off
REM Build script for Prolific Tool
"C:\Program Files\nodejs\node_modules\typescript\bin\tsc" -p chrome/tsconfig.json
echo TypeScript compilation complete!
