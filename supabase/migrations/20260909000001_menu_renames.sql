-- Client-requested menu renames (Nicole, 2026-08-30): "Current Structure" ->
-- "Investment", "Character — Live Workshop" -> "Fit (Live Workshop)". Plain
-- structural nav data (see 20260829000005_seed_modules.sql's own comment),
-- no versioning system for this table -- a direct update is correct.

update public.modules set name = 'Investment' where key = 'current_structure';
update public.modules set name = 'Fit (Live Workshop)' where key = 'character_live';
