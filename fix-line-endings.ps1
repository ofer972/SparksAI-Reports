# PowerShell script to fix line endings and commit all changes
Write-Host "Fixing line endings and committing changes..."

# Configure git
git config core.autocrlf false
git config core.eol lf

# Add .gitattributes if it exists
if (Test-Path .gitattributes) {
    git add .gitattributes
    Write-Host "Added .gitattributes"
}

# Add epic-scope-changes file
if (Test-Path "components/epic-scope-changes/EpicScopeChangesPage.tsx") {
    git add -f "components/epic-scope-changes/EpicScopeChangesPage.tsx"
    Write-Host "Added epic-scope-changes component"
}

# Normalize all line endings
Write-Host "Normalizing line endings..."
git add --renormalize .

# Show status
Write-Host "`nCurrent git status:"
git status --short

# Commit everything
Write-Host "`nCommitting changes..."
git commit -m "Fix line endings: normalize all files to LF and add epic-scope-changes component

- Normalize all text files to use LF line endings
- Add .gitattributes to enforce LF going forward
- Add epic-scope-changes component to repository
- Configure git to use LF line endings"

Write-Host "`nFinal status:"
git status --short
