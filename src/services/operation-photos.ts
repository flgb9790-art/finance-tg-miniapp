import { supabase } from "../lib/supabase.js";
import { ENTRY_LIST_SELECT, getEntryById, type EntryListItem } from "./entries.js";

export const OPERATION_PHOTOS_BUCKET = "operation-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 60 * 60;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

export type EntryForClient = EntryListItem & {
  photoViewUrl: string | null;
  hasPhoto: boolean;
};

function extensionForMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

function buildEntryPhotoPath(workspaceId: string, entryId: string, mime: string): string {
  return `${workspaceId}/entries/${entryId}.${extensionForMime(mime)}`;
}

function isExternalPhotoUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function parseImageUploadPayload(body: unknown): { buffer: Buffer; contentType: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const contentType =
    typeof record.contentType === "string" ? record.contentType.trim().toLowerCase() : "";
  let rawBase64 = typeof record.imageBase64 === "string" ? record.imageBase64.trim() : "";

  if (!rawBase64) {
    throw new Error("Файл не передан");
  }

  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error("Поддерживаются только изображения JPEG, PNG или WebP");
  }

  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(rawBase64);
  if (dataUrlMatch) {
    const dataMime = dataUrlMatch[1]?.trim().toLowerCase() ?? "";
    if (dataMime && !ALLOWED_MIME.has(dataMime)) {
      throw new Error("Поддерживаются только изображения JPEG, PNG или WebP");
    }
    rawBase64 = dataUrlMatch[2] ?? "";
  }

  const buffer = Buffer.from(rawBase64, "base64");

  if (!buffer.length) {
    throw new Error("Не удалось прочитать изображение");
  }

  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error("Размер фото не должен превышать 5 МБ");
  }

  return { buffer, contentType };
}

export async function createSignedPhotoUrl(
  storagePath: string | null | undefined
): Promise<string | null> {
  const path = String(storagePath ?? "").trim();

  if (!path) {
    return null;
  }

  if (isExternalPhotoUrl(path)) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from(OPERATION_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error) {
    console.error("Failed to sign operation photo URL", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function enrichEntryForClient(entry: EntryListItem): Promise<EntryForClient> {
  const hasPhoto = Boolean(String(entry.photo_url ?? "").trim());

  return {
    ...entry,
    hasPhoto,
    photoViewUrl: hasPhoto ? await createSignedPhotoUrl(entry.photo_url) : null
  };
}

export async function enrichEntriesForClient(
  entries: EntryListItem[]
): Promise<EntryForClient[]> {
  return Promise.all(entries.map((entry) => enrichEntryForClient(entry)));
}

export async function deleteStoredPhoto(storagePath: string | null | undefined): Promise<void> {
  const path = String(storagePath ?? "").trim();

  if (!path || isExternalPhotoUrl(path)) {
    return;
  }

  const { error } = await supabase.storage.from(OPERATION_PHOTOS_BUCKET).remove([path]);

  if (error) {
    console.warn("Failed to delete operation photo from storage", error);
  }
}

async function updateEntryPhotoPath(
  entryId: string,
  workspaceId: string,
  photoPath: string | null
): Promise<EntryListItem> {
  const { data, error } = await supabase
    .from("entries")
    .update({ photo_url: photoPath })
    .eq("id", entryId)
    .eq("workspace_id", workspaceId)
    .select(ENTRY_LIST_SELECT)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the updated entry");
  }

  return data as EntryListItem;
}

export async function uploadEntryPhoto(
  workspaceId: string,
  entryId: string,
  buffer: Buffer,
  contentType: string
): Promise<EntryForClient> {
  const existing = await getEntryById(entryId, workspaceId);

  if (!existing) {
    throw new Error("Entry was not found");
  }

  const storagePath = buildEntryPhotoPath(workspaceId, entryId, contentType);

  if (existing.photo_url && existing.photo_url !== storagePath) {
    await deleteStoredPhoto(existing.photo_url);
  }

  const { error: uploadError } = await supabase.storage
    .from(OPERATION_PHOTOS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "3600"
    });

  if (uploadError) {
    throw uploadError;
  }

  const updated = await updateEntryPhotoPath(entryId, workspaceId, storagePath);
  return enrichEntryForClient(updated);
}

export async function resolveEntryPhotoViewForClient(
  workspaceId: string,
  entryId: string
): Promise<{ photoViewUrl: string | null; hasPhoto: boolean }> {
  const existing = await getEntryById(entryId, workspaceId);

  if (!existing) {
    throw new Error("Entry was not found");
  }

  const path = String(existing.photo_url ?? "").trim();

  if (!path) {
    return { photoViewUrl: null, hasPhoto: false };
  }

  return {
    photoViewUrl: await createSignedPhotoUrl(path),
    hasPhoto: true
  };
}

export async function removeEntryPhoto(
  workspaceId: string,
  entryId: string
): Promise<EntryForClient> {
  const existing = await getEntryById(entryId, workspaceId);

  if (!existing) {
    throw new Error("Entry was not found");
  }

  if (existing.photo_url) {
    await deleteStoredPhoto(existing.photo_url);
  }

  const updated = await updateEntryPhotoPath(entryId, workspaceId, null);
  return enrichEntryForClient(updated);
}
