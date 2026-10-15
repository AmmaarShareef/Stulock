param(
  [switch]$IUnderstandThisDestroysLocalSupabaseData
)

if (-not $IUnderstandThisDestroysLocalSupabaseData) { throw "Pass -IUnderstandThisDestroysLocalSupabaseData to reset only your LOCAL Supabase container." }
pnpm exec supabase db reset --local
pnpm exec supabase migration list --local
Write-Output "Local migration rehearsal completed. This script never targets the linked remote project."
