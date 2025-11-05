@echo off
SETLOCAL EnableDelayedExpansion

:: Define the name of the final combined file
set "OutputFile=reports.txt"
:: Define the directory to search ('.' means the current directory)
set "SearchDir=."
:: --- File Patterns to INCLUDE ---
:: This pattern will include common source code, configuration, and environment files.
:: Adjust this list (e.g., to add .css, .html, etc.) based on your project.
set "IncludedExtensions=*.js *.jsx *.ts *.tsx *.json *.env *.yaml *.yml"

:: --- Folders to EXCLUDE ---
:: Excludes common build, dependency, and configuration folders.
set "ExcludedFolders=node_modules .next .git dist build"

:: 1. Delete the output file first to ensure a clean start
if exist "%OutputFile%" del "%OutputFile%"

echo Combining specific files into %OutputFile%...

:: 2. Loop recursively through the SearchDir
for /R "%SearchDir%" %%F in (%IncludedExtensions%) do (
    
    :: Check if the file's path contains any of the excluded folders
    SET "FilePath=%%F"
    SET "Exclude=0"

    :: Check against each excluded folder
    FOR %%E IN (%ExcludedFolders%) DO (
        :: Check if the folder name is present in the full file path
        ECHO "!FilePath!" | FIND /I ".\%%E\" >NUL
        IF NOT ERRORLEVEL 1 (
            SET "Exclude=1"
        )
    )

    :: Only process if the file is NOT in an excluded folder
    IF "!Exclude!" EQU "0" (
        :: OPTIONAL: Add a separator and the file path/name before content
        echo.>> "%OutputFile%"
        echo ==========================================================>> "%OutputFile%"
        echo File: "%%F" >> "%OutputFile%"
        echo ==========================================================>> "%OutputFile%"

        :: Append the content of the file
        type "%%F" >> "%OutputFile%"
    )
)

echo.
echo Combination complete! The result is in "%OutputFile%"
ENDLOCAL