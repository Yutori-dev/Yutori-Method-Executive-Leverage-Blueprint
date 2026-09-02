-- Content-only fix (client feedback 2026-09): "I'd delegate more. But I
-- feel I can do the task better..." should be one sentence separated by a
-- comma, not two sentences. Matched on the exact old text rather than
-- sort_order/domain so this can't silently touch the wrong row.
do $$
declare
  v_updated integer;
begin
  update public.delegation_beliefs_questions
  set prompt = 'I''d delegate more, but I feel I can do the task better than the person I might delegate it to.'
  where prompt = 'I''d delegate more. But I feel I can do the task better than the person I might delegate it to.';

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'expected exactly 1 delegation_beliefs_questions row to update, got %', v_updated;
  end if;
end $$;
