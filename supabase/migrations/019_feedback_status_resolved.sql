-- 019_feedback_status_resolved.sql
-- Fix: the Feedback inbox "Mark resolved" button writes status='resolved',
-- but the original feedback_status_check constraint only permitted
-- open/reviewed/done/dismissed. The update was rejected (500) and the item
-- silently stayed open. Add 'resolved' to the allowed values.

alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check
  check (status = any (array['open','reviewed','resolved','done','dismissed']));
