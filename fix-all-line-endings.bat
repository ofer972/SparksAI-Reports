@echo off
echo Fixing line endings and committing all changes...
echo.

REM Configure git
git config core.autocrlf false
git config core.eol lf

REM Add all files including epic-scope-changes
git add -A

REM Show what will be committed
echo Files to be committed:
git status --short
echo.

REM Commit everything
git commit -m "COMPLETE FIX: Normalize all line endings to LF and add epic-scope-changes component

- Force normalize all text files to LF line endings
- Add .gitattributes to enforce LF going forward  
- Add epic-scope-changes component
- Configure git core.autocrlf=false and core.eol=lf"

echo.
echo Done! Check git status:
git status --short

pause

