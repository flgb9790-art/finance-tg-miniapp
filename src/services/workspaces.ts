import crypto from "node:crypto";
import { supabase } from "../lib/supabase.js";

export type WorkspaceKind = "personal" | "team";
export type WorkspaceMemberRole = "owner" | "editor";

export interface WorkspaceRow {
  id: string;
  kind: WorkspaceKind;
  name: string;
  owner_user_id: string;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  joined_at: string;
}

export interface WorkspaceInviteRow {
  id: string;
  workspace_id: string;
  token: string;
  created_by_user_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface WorkspaceWithMembership extends WorkspaceRow {
  role: WorkspaceMemberRole;
  member_count: number;
}

export type WorkspaceErrorCode =
  | "not_found"
  | "forbidden"
  | "team_full"
  | "invite_revoked"
  | "invite_expired"
  | "already_member"
  | "team_already_exists";

export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode;

  constructor(code: WorkspaceErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceError";
    this.code = code;
  }
}

const TEAM_MAX_MEMBERS = 5;

function logSupabaseError(context: string, error: unknown): void {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    console.error(`[workspaces] ${context}`, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint
    });

    return;
  }

  console.error(`[workspaces] ${context}`, error);
}

function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getWorkspaceById", error);
    throw error;
  }

  return (data ?? null) as WorkspaceRow | null;
}

export async function getPersonalWorkspaceForUser(
  userId: string
): Promise<WorkspaceRow | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("kind", "personal")
    .maybeSingle();

  if (error) {
    logSupabaseError("getPersonalWorkspaceForUser", error);
    throw error;
  }

  return (data ?? null) as WorkspaceRow | null;
}

export async function ensurePersonalWorkspace(userId: string): Promise<WorkspaceRow> {
  const existing = await getPersonalWorkspaceForUser(userId);

  if (existing) {
    await ensureWorkspaceOwnerMembership(existing.id, userId);
    return existing;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      kind: "personal",
      name: "Личный",
      owner_user_id: userId,
      max_members: 1
    })
    .select()
    .single();

  if (workspaceError) {
    if (isUniqueViolation(workspaceError)) {
      const raced = await getPersonalWorkspaceForUser(userId);

      if (raced) {
        await ensureWorkspaceOwnerMembership(raced.id, userId);
        return raced;
      }
    }

    logSupabaseError("ensurePersonalWorkspace insert", workspaceError);
    throw workspaceError;
  }

  if (!workspace) {
    throw new Error("Supabase did not return the created personal workspace");
  }

  await ensureWorkspaceOwnerMembership(workspace.id as string, userId);

  return workspace as WorkspaceRow;
}

async function ensureWorkspaceOwnerMembership(
  workspaceId: string,
  userId: string
): Promise<void> {
  const existing = await getWorkspaceMembership(workspaceId, userId);

  if (existing) {
    return;
  }

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner"
  });

  if (error && !isUniqueViolation(error)) {
    logSupabaseError("ensureWorkspaceOwnerMembership", error);
    throw error;
  }
}

export async function countWorkspaceMembers(workspaceId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    logSupabaseError("countWorkspaceMembers", error);
    throw error;
  }

  return count ?? 0;
}

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRow | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getWorkspaceMembership", error);
    throw error;
  }

  return (data ?? null) as WorkspaceMemberRow | null;
}

export async function assertWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRow> {
  const membership = await getWorkspaceMembership(workspaceId, userId);

  if (!membership) {
    throw new WorkspaceError("forbidden", "You are not a member of this workspace");
  }

  return membership;
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceWithMembership[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    logSupabaseError("listWorkspacesForUser memberships", membershipError);
    throw membershipError;
  }

  const rows = memberships ?? [];

  if (rows.length === 0) {
    const personal = await ensurePersonalWorkspace(userId);
    return [
      {
        ...personal,
        role: "owner",
        member_count: 1
      }
    ];
  }

  const workspaceIds = rows.map((row) => row.workspace_id as string);
  const roleByWorkspaceId = new Map(
    rows.map((row) => [row.workspace_id as string, row.role as WorkspaceMemberRole])
  );

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  if (workspaceError) {
    logSupabaseError("listWorkspacesForUser workspaces", workspaceError);
    throw workspaceError;
  }

  const result: WorkspaceWithMembership[] = [];

  for (const workspace of workspaces ?? []) {
    const memberCount = await countWorkspaceMembers(workspace.id as string);

    result.push({
      ...(workspace as WorkspaceRow),
      role: roleByWorkspaceId.get(workspace.id as string) ?? "editor",
      member_count: memberCount
    });
  }

  return result;
}

export async function userHasTeamWorkspace(userId: string): Promise<boolean> {
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (membershipError) {
    logSupabaseError("userHasTeamWorkspace memberships", membershipError);
    throw membershipError;
  }

  const workspaceIds = (memberships ?? []).map((row) => row.workspace_id as string);

  if (workspaceIds.length === 0) {
    return false;
  }

  const { data: teams, error: teamError } = await supabase
    .from("workspaces")
    .select("id")
    .in("id", workspaceIds)
    .eq("kind", "team")
    .limit(1);

  if (teamError) {
    logSupabaseError("userHasTeamWorkspace teams", teamError);
    throw teamError;
  }

  return (teams?.length ?? 0) > 0;
}

export async function createTeamWorkspace(
  ownerUserId: string,
  name: string
): Promise<WorkspaceRow> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new WorkspaceError("not_found", "Team name is required");
  }

  if (await userHasTeamWorkspace(ownerUserId)) {
    throw new WorkspaceError(
      "team_already_exists",
      "You can only belong to one team workspace in this version"
    );
  }

  await ensurePersonalWorkspace(ownerUserId);

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      kind: "team",
      name: trimmedName,
      owner_user_id: ownerUserId,
      max_members: TEAM_MAX_MEMBERS
    })
    .select()
    .single();

  if (workspaceError) {
    logSupabaseError("createTeamWorkspace", workspaceError);
    throw workspaceError;
  }

  if (!workspace) {
    throw new Error("Supabase did not return the created team workspace");
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: ownerUserId,
    role: "owner"
  });

  if (memberError) {
    logSupabaseError("createTeamWorkspace member", memberError);
    throw memberError;
  }

  return workspace as WorkspaceRow;
}

export async function updateTeamWorkspaceName(
  workspaceId: string,
  actorUserId: string,
  name: string
): Promise<WorkspaceRow> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace || workspace.kind !== "team") {
    throw new WorkspaceError("not_found", "Team workspace not found");
  }

  const membership = await assertWorkspaceMember(workspaceId, actorUserId);

  if (membership.role !== "owner") {
    throw new WorkspaceError("forbidden", "Only the team owner can rename the workspace");
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new WorkspaceError("not_found", "Team name is required");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: trimmedName })
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) {
    logSupabaseError("updateTeamWorkspaceName", error);
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the updated workspace");
  }

  return data as WorkspaceRow;
}

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberRow[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (error) {
    logSupabaseError("listWorkspaceMembers", error);
    throw error;
  }

  return (data ?? []) as WorkspaceMemberRow[];
}

export async function createWorkspaceInvite(
  workspaceId: string,
  createdByUserId: string
): Promise<WorkspaceInviteRow> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace || workspace.kind !== "team") {
    throw new WorkspaceError("not_found", "Team workspace not found");
  }

  const membership = await assertWorkspaceMember(workspaceId, createdByUserId);

  if (membership.role !== "owner") {
    throw new WorkspaceError("forbidden", "Only the team owner can create invites");
  }

  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      token: generateInviteToken(),
      created_by_user_id: createdByUserId
    })
    .select()
    .single();

  if (error) {
    logSupabaseError("createWorkspaceInvite", error);
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the created invite");
  }

  return data as WorkspaceInviteRow;
}

export async function getActiveInviteByToken(token: string): Promise<{
  invite: WorkspaceInviteRow;
  workspace: WorkspaceRow;
  memberCount: number;
} | null> {
  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    logSupabaseError("getActiveInviteByToken", error);
    throw error;
  }

  if (!invite) {
    return null;
  }

  const inviteRow = invite as WorkspaceInviteRow;

  if (inviteRow.revoked_at) {
    throw new WorkspaceError("invite_revoked", "This invite link has been revoked");
  }

  if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() <= Date.now()) {
    throw new WorkspaceError("invite_expired", "This invite link has expired");
  }

  const workspace = await getWorkspaceById(inviteRow.workspace_id);

  if (!workspace || workspace.kind !== "team") {
    throw new WorkspaceError("not_found", "Team workspace not found");
  }

  const memberCount = await countWorkspaceMembers(workspace.id);

  return {
    invite: inviteRow,
    workspace,
    memberCount
  };
}

export async function revokeWorkspaceInvite(
  inviteId: string,
  workspaceId: string,
  actorUserId: string
): Promise<WorkspaceInviteRow> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace || workspace.kind !== "team") {
    throw new WorkspaceError("not_found", "Team workspace not found");
  }

  const membership = await assertWorkspaceMember(workspaceId, actorUserId);

  if (membership.role !== "owner") {
    throw new WorkspaceError("forbidden", "Only the team owner can revoke invites");
  }

  const { data, error } = await supabase
    .from("workspace_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .select()
    .maybeSingle();

  if (error) {
    logSupabaseError("revokeWorkspaceInvite", error);
    throw error;
  }

  if (!data) {
    throw new WorkspaceError("not_found", "Invite not found or already revoked");
  }

  return data as WorkspaceInviteRow;
}

export async function acceptWorkspaceInvite(
  token: string,
  userId: string
): Promise<{ workspace: WorkspaceRow; membership: WorkspaceMemberRow }> {
  const preview = await getActiveInviteByToken(token);

  if (!preview) {
    throw new WorkspaceError("not_found", "Invite not found");
  }

  const { workspace } = preview;

  const existingMembership = await getWorkspaceMembership(workspace.id, userId);

  if (existingMembership) {
    throw new WorkspaceError("already_member", "You are already a member of this team");
  }

  if (await userHasTeamWorkspace(userId)) {
    throw new WorkspaceError(
      "team_already_exists",
      "You can only belong to one team workspace in this version"
    );
  }

  const memberCount = await countWorkspaceMembers(workspace.id);

  if (memberCount >= workspace.max_members) {
    throw new WorkspaceError("team_full", "This team has reached the member limit");
  }

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "editor"
    })
    .select()
    .single();

  if (error) {
    logSupabaseError("acceptWorkspaceInvite", error);
    throw error;
  }

  if (!membership) {
    throw new Error("Supabase did not return the new workspace membership");
  }

  return {
    workspace,
    membership: membership as WorkspaceMemberRow
  };
}

export interface WorkspaceMemberWithProfile extends WorkspaceMemberRow {
  user: {
    id: string;
    first_name: string | null;
    username: string | null;
  } | null;
}

export async function listWorkspaceMembersWithProfiles(
  workspaceId: string
): Promise<WorkspaceMemberWithProfile[]> {
  const members = await listWorkspaceMembers(workspaceId);

  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((member) => member.user_id);
  const { data: users, error } = await supabase
    .from("app_users")
    .select("id, first_name, username")
    .in("id", userIds);

  if (error) {
    logSupabaseError("listWorkspaceMembersWithProfiles users", error);
    throw error;
  }

  const userById = new Map((users ?? []).map((user) => [user.id as string, user]));

  return members.map((member) => ({
    ...member,
    user: (userById.get(member.user_id) as WorkspaceMemberWithProfile["user"]) ?? null
  }));
}

export async function listActiveWorkspaceInvites(
  workspaceId: string
): Promise<WorkspaceInviteRow[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("listActiveWorkspaceInvites", error);
    throw error;
  }

  return (data ?? []) as WorkspaceInviteRow[];
}

export async function leaveTeamWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace || workspace.kind !== "team") {
    throw new WorkspaceError("not_found", "Team workspace not found");
  }

  const membership = await assertWorkspaceMember(workspaceId, userId);

  if (membership.role === "owner") {
    throw new WorkspaceError(
      "forbidden",
      "Владелец не может покинуть команду"
    );
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("leaveTeamWorkspace", error);
    throw error;
  }
}
