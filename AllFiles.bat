@echo off
SETLOCAL EnableDelayedExpansion

:: Define the name of the final combined file
set "OutputFile=reports.txt"

:: --- 1. FOLDERS TO INCLUDE ---
:: Add your main source code folder names here.
:: (e.g., app, pages, components, lib, styles, etc.)
set "IncludedFolders=app pages components lib styles"

:: --- 2. FILE EXTENSIONS TO INCLUDE ---
:: These are the file types we'll grab from the folders above.
set "IncludedExtensions=*.js *.jsx *.ts *.tsx *.json *.env *.yaml *.yml *.css"

:: --- 3. ROOT FILES TO INCLUDE ---
:: Specific config files in the main folder you might want.
set "RootFiles=*.js *.json *.ts *.env"

:: ==================================================================

:: Delete the output file first for a clean start
if exist "%OutputFile%" del "%OutputFile%"

echo Combining specific files from whitelisted folders...
echo.

:: Loop through the whitelisted FOLDERS
FOR %%D IN (%IncludedFolders%) DO (
    echo --- Processing folder: %%D ---
    
    :: Check if the folder actually exists
    IF EXIST "%%D" (
        :: Loop recursively through files in THIS specific folder
        for /R "%%D" %%F in (%IncludedExtensions%) do (
            echo Adding: "%%F"
            call :AppendFile "%%F"
        )
    ) ELSE (
        echo Folder "%%D" not found, skipping.
    )
)

echo.
echo --- Processing root config files ---
:: Get the specific config files from the ROOT directory
FOR %%F IN (%RootFiles%) DO (
    IF EXIST "%%F" (
        echo Adding: "%%F"
        call :AppendFile "%%F"
    )
)

echo.
echo Combination complete! The result is in "%OutputFile%"
GOTO :EOF

:: --- Subroutine to append file content ---
:AppendFile
    set "FilePath=%~1"
    
    :: Add a separator and the file path/name before content
    echo.>> "%OutputFile%"
    echo ==========================================================>> "%OutputFile%"
    echo File: "!FilePath!" >> "%OutputFile%"
    echo ==========================================================>> "%OutputFile%"
    
    :: Append the content of the file
    type "!FilePath!" >> "%OutputFile%"
    
GOTO :EOF

ENDLOCAL