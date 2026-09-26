-- Cleanup: remove the temporary diagnostic functions created while tracking
-- down the architecture_recommendations RLS bug fixed in
-- 20260917000015. Their purpose is served; nothing references them.
drop function if exists public.debug_get_policy_def(text, text);
drop function if exists public.debug_arch_reveal_check(uuid);
drop function if exists public.debug_arch_reveal_check2(uuid);
drop function if exists public.debug_list_policies(text);
drop function if exists public.debug_check_grants(text);
drop function if exists public.debug_rls_enabled(text);
drop function if exists public.debug_raw_arch_select(uuid);
