export interface OperationCreatedByProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

export interface OperationCreatedByDto {
  id: string;
  firstName: string | null;
  username: string | null;
}

export interface RowWithCreatedByEmbed {
  created_by_user_id?: string | null;
  user_id?: string;
  created_by?: OperationCreatedByProfile | null;
}

export function toOperationCreatedByDto(
  row: RowWithCreatedByEmbed | null | undefined
): OperationCreatedByDto | null {
  const profile = row?.created_by;

  if (profile?.id) {
    const firstName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null;

    return {
      id: profile.id,
      firstName,
      username: profile.username ?? null
    };
  }

  const fallbackId = row?.created_by_user_id ?? row?.user_id;

  if (fallbackId) {
    return {
      id: fallbackId,
      firstName: null,
      username: null
    };
  }

  return null;
}
