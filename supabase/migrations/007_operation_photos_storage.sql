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
