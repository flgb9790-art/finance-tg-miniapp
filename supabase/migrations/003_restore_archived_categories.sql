-- Categories were "hidden" via is_archived=true with no way to restore them in the mini app.
update public.categories set is_archived = false where is_archived = true;
