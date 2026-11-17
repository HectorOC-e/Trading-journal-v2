-- Cover the composite owner/practice foreign key used by cascading deletes and joins.
CREATE INDEX practice_trade_links_user_id_practice_id_idx
ON public.practice_trade_links(user_id, practice_id);
