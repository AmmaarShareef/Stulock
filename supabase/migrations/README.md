# Migrations

SQL files, applied in filename order.

Tables: `profiles`, `sessions`, `daily_aggregates`, `leaderboard_entries`,
`subscriptions`.

Row-level security on every one of them. RLS is the concept to actually understand -
it is what makes a public leaderboard over private data safe.

Spec: section 08.
