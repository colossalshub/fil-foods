-- Postgres cannot use new enum labels in the same transaction as ALTER TYPE ... ADD VALUE.
-- Apply enum extensions in this migration first; follow-up migrations may use the new values.

alter type public.app_role add value if not exists 'dietitian_staff';

alter type public.order_status add value if not exists 'for_dietitian_review';
alter type public.order_status add value if not exists 'awaiting_payment';
alter type public.order_status add value if not exists 'paid';