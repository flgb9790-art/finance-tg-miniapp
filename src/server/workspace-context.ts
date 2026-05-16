import type { Request, Response } from "express";
import { env } from "../config/env.js";
import type { TelegramAppUserRow } from "../services/users.js";
import {
  countWorkspaceMembers,
  ensurePersonalWorkspace,
  getPersonalWorkspaceForUser,
  getWorkspaceById,
  getWorkspaceMembership,
  listWorkspacesForUser,
  type WorkspaceMemberRole,
  type WorkspaceRow,
  type WorkspaceWithMembership
} from "../services/workspaces.js";

export const workspaceCookieName = "balancy_workspace_id";

export interface WorkspaceContext {
  appUserId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  workspace: WorkspaceRow;
}

export interface WorkspaceApiDto {
  id: string;
  kind: WorkspaceRow["kind"];
  name: string;
  role: WorkspaceMemberRole;
  memberCount: number;
  maxMembers: number;
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.header("cookie");
  if (!raw) {
    return {};
  }

  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [namePart, ...valueParts] = part.trim().split("=");
    if (!namePart) {
      return acc;
    }
    acc[namePart] = decodeURIComponent(valueParts.join("=") ?? "");
    return acc;
  }, {});
}

async function workspaceContextForId(
  appUserId: string,
  workspaceId: string
): Promise<WorkspaceContext | null> {
  const membership = await getWorkspaceMembership(workspaceId, appUserId);

  if (!membership) {
    return null;
  }

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    return null;
  }

  return {
    appUserId,
    workspaceId: workspace.id,
    role: membership.role,
    workspace
  };
}

export async function resolveActiveWorkspace(
  req: Request,
  appUser: TelegramAppUserRow
): Promise<WorkspaceContext> {
  await ensurePersonalWorkspace(appUser.id);

  const headerWorkspaceId = req.header("x-balancy-workspace-id")?.trim();

  if (headerWorkspaceId) {
    const fromHeader = await workspaceContextForId(appUser.id, headerWorkspaceId);

    if (fromHeader) {
      return fromHeader;
    }
  }

  const cookies = parseCookies(req);
  const requestedWorkspaceId = cookies[workspaceCookieName]?.trim();

  if (requestedWorkspaceId) {
    const fromCookie = await workspaceContextForId(appUser.id, requestedWorkspaceId);

    if (fromCookie) {
      return fromCookie;
    }
  }

  const personal =
    (await getPersonalWorkspaceForUser(appUser.id)) ??
    (await ensurePersonalWorkspace(appUser.id));

  const membership = await getWorkspaceMembership(personal.id, appUser.id);

  return {
    appUserId: appUser.id,
    workspaceId: personal.id,
    role: membership?.role ?? "owner",
    workspace: personal
  };
}

export async function buildWorkspaceApiDto(
  ctx: WorkspaceContext
): Promise<WorkspaceApiDto> {
  const memberCount = await countWorkspaceMembers(ctx.workspaceId);

  return {
    id: ctx.workspace.id,
    kind: ctx.workspace.kind,
    name: ctx.workspace.name,
    role: ctx.role,
    memberCount,
    maxMembers: ctx.workspace.max_members
  };
}

export function toWorkspaceListItemDto(item: WorkspaceWithMembership): WorkspaceApiDto {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    role: item.role,
    memberCount: item.member_count,
    maxMembers: item.max_members
  };
}

export async function buildWorkspacesListPayload(appUserId: string): Promise<WorkspaceApiDto[]> {
  const workspaces = await listWorkspacesForUser(appUserId);
  return workspaces.map(toWorkspaceListItemDto);
}

export function setActiveWorkspaceCookie(res: Response, workspaceId: string): void {
  const secureCookie = Boolean((env.appUrl ?? "").trim().startsWith("https://"));

  res.cookie(workspaceCookieName, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 1000
  });
}

export function clearActiveWorkspaceCookie(res: Response): void {
  res.cookie(workspaceCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(0)
  });
}
