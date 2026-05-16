-- Receipt / check photos for entries (uploaded via backend using service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operation-photos',
  'operation-photos',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Backend uses service_role; explicit policy for storage.objects (idempotent).
drop policy if exists "operation_photos_service_all" on storage.objects;
create policy "operation_photos_service_all"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'operation-photos')
  with check (bucket_id = 'operation-photos');
