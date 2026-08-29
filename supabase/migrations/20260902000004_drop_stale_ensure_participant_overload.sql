-- 20260901000003_privacy_consent.sql added p_privacy_consent as a third
-- parameter to ensure_participant(), but `create or replace function` only
-- replaces a function with an identical signature -- a different parameter
-- count is a distinct overload in Postgres, not a replacement. That left
-- the original 2-argument ensure_participant(text, text) still live
-- alongside the new 3-argument version, which makes any caller that omits
-- p_privacy_consent ambiguous ("could not choose the best candidate
-- function"). The app always calls with all three arguments
-- (CompleteProfileForm.tsx), so this was latent rather than user-facing,
-- but it's real dead/dangerous surface -- drop the stale overload so only
-- one ensure_participant exists.

drop function if exists public.ensure_participant(text, text);
