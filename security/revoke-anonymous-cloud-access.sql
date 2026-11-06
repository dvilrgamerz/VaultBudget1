-- Apply only to an existing optional VaultBudget Supabase project.
-- GitHub source changes do not automatically alter deployed database grants.
-- The local-first browser app is unaffected by this change.
revoke select on table public.vault_states from anon;

-- Expected result: false.
select has_table_privilege('anon', 'public.vault_states', 'SELECT') as anonymous_can_select_vault_states;
