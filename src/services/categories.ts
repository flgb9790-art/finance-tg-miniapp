import type { OperationKind } from "../shared/domain.js";
import { supabase } from "../lib/supabase.js";

export interface CategoryRow {
  id: string;
  user_id: string;
  kind: OperationKind;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  userId: string;
  kind: OperationKind;
  name: string;
}

export async function listCategories(userId: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CategoryRow[];
}

export async function countActiveCategories(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      name: input.name
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the created category");
  }

  return data as CategoryRow;
}

export async function getCategoryById(
  categoryId: string,
  userId: string
): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CategoryRow | null;
}

export interface UpdateCategoryInput {
  userId: string;
  categoryId: string;
  name: string;
  kind: OperationKind;
}

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<CategoryRow> {
  const trimmed = input.name.trim();

  if (!trimmed) {
    throw new Error("Category name is required");
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: trimmed,
      kind: input.kind
    })
    .eq("id", input.categoryId)
    .eq("user_id", input.userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the updated category");
  }

  return data as CategoryRow;
}

export async function deleteCategory(
  categoryId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
