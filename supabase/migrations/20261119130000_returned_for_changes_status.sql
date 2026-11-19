-- Revised workbook (2026-11-19), USR-23 / DIT-15: a Dietitian return is no longer a cancellation.
-- The new enum value is added in its own migration so later migrations can use it.
alter type public.order_status add value if not exists 'returned_for_changes' after 'for_dietitian_review';
