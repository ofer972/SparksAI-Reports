@echo off
echo ========================================
echo COMPLETE GIT LINE ENDING FIX
echo ========================================
echo.

echo Step 1: Fixing GLOBAL Git configuration...
git config --global core.autocrlf false
git config --global core.eol lf
git config --global core.safecrlf false
echo [OK] Global config updated
echo.

echo Step 2: Fixing LOCAL repository configuration...
cd /d "%~dp0"
git config core.autocrlf false
git config core.eol lf
git config core.safecrlf false
echo [OK] Local config updated
echo.

echo Step 3: Adding epic-scope-changes file...
git add -f components/epic-scope-changes/EpicScopeChangesPage.tsx
if %ERRORLEVEL% EQU 0 (
    echo [OK] Epic scope changes file added
) else (
    echo [WARNING] Could not add epic-scope-changes file
)
echo.

echo Step 4: Adding .gitattributes...
git add .gitattributes
echo [OK] .gitattributes added
echo.

echo Step 5: Normalizing ALL files to LF...
git add --renormalize .
echo [OK] All files normalized
echo.

echo Step 6: Showing current status...
git status --short
echo.

echo Step 7: Committing all changes...
git commit -m "FIX: Normalize all line endings to LF and add epic-scope-changes

- Fixed global and local git config (autocrlf=false, eol=lf)
- Added .gitattributes to enforce LF line endings
- Normalized all existing files to LF
- Added epic-scope-changes component"
echo.

echo ========================================
echo FINAL STATUS:
echo ========================================
git status --short
echo.

echo ========================================
echo VERIFICATION:
echo ========================================
echo Global config:
git config --global core.autocrlf
git config --global core.eol
echo.
echo Local config:
git config core.autocrlf
git config core.eol
echo.

pause




