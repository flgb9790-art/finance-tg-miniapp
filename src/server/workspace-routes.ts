import type { Express, Request, Response } from "express";
import type { TelegramAppUserRow } from "../services/users.js";
import {
  WorkspaceError,
  acceptWorkspaceInvite,
  assertWorkspaceMember,
  countWorkspaceMembers,
  createTeamWorkspace,
  createWorkspaceInvite,
  DEFAULT_INVITE_EXPIRES_DAYS,
  ensurePersonalWorkspace,
  getActiveInviteByToken,
  getPersonalWorkspaceForUser,
  getWorkspaceById,
  leaveTeamWorkspace,
  removeTeamWorkspaceMember,
  listActiveWorkspaceInvites,
  listWorkspaceMembersWithProfiles,
  listWorkspacesForUser,
  revokeWorkspaceInvite,
  updateTeamWorkspaceName
} from "../services/workspaces.js";
import { notifyTeamJoinAccepted } from "../services/team-telegram-notify.js";
import {
  buildWorkspaceApiDto,
  buildWorkspacesListPayload,
  resolveActiveWorkspace,
  setActiveWorkspaceCookie,
  toWorkspaceListItemDto,
  type WorkspaceContext
} from "./workspace-context.js";

export interface WorkspaceRoutesDeps {
  authenticateMiniAppUser: (req: Request) => Promise<TelegramAppUserRow>;
}

function workspaceErrorStatus(error: unknown): number {
  if (!(error instanceof WorkspaceError)) {
    return 400;
  }

  switch (error.code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

function workspaceErrorMessage(error: unknown): string {
  if (error instanceof WorkspaceError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Workspace request failed";
}

async function requireWorkspaceContext(
  req: Request,
  deps: WorkspaceRoutesDeps
): Promise<{ appUser: TelegramAppUserRow; ws: WorkspaceContext }> {
  const appUser = await deps.authenticateMiniAppUser(req);
  const ws = await resolveActiveWorkspace(req, appUser);
  return { appUser, ws };
}

export function registerWorkspaceRoutes(app: Express, deps: WorkspaceRoutesDeps): void {
  app.get("/api/workspaces", async (req, res) => {
    try {
      const appUser = await deps.authenticateMiniAppUser(req);
      const workspaces = await buildWorkspacesListPayload(appUser.id);
      const ws = await resolveActiveWorkspace(req, appUser);

      res.json({
        activeWorkspaceId: ws.workspaceId,
        workspaces
      });
    } catch (error) {
      console.error("Failed to list workspaces", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.post("/api/workspaces/team", async (req, res) => {
    try {
      const appUser = await deps.authenticateMiniAppUser(req);
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        res.status(400).json({ error: "Team name is required" });
        return;
      }

      const workspace = await createTeamWorkspace(appUser.id, name);
      setActiveWorkspaceCookie(res, workspace.id);

      const membership = await assertWorkspaceMember(workspace.id, appUser.id);
      const memberCount = (await listWorkspacesForUser(appUser.id)).find(
        (item) => item.id === workspace.id
      )?.member_count;

      res.status(201).json({
        workspace: {
          id: workspace.id,
          kind: workspace.kind,
          name: workspace.name,
          role: membership.role,
          memberCount: memberCount ?? 1,
          maxMembers: workspace.max_members
        }
      });
    } catch (error) {
      console.error("Failed to create team workspace", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.post("/api/workspaces/switch", async (req, res) => {
    try {
      const appUser = await deps.authenticateMiniAppUser(req);
      const workspaceId =
        typeof req.body?.workspaceId === "string" ? req.body.workspaceId.trim() : "";

      if (!workspaceId) {
        res.status(400).json({ error: "workspaceId is required" });
        return;
      }

      const membership = await assertWorkspaceMember(workspaceId, appUser.id);
      const workspace = await getWorkspaceById(workspaceId);

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      setActiveWorkspaceCookie(res, workspaceId);

      res.json({
        workspace: {
          id: workspace.id,
          kind: workspace.kind,
          name: workspace.name,
          role: membership.role,
          memberCount: await countWorkspaceMembers(workspaceId),
          maxMembers: workspace.max_members
        }
      });
    } catch (error) {
      console.error("Failed to switch workspace", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.get("/api/workspaces/members", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);

      if (ws.workspace.kind !== "team") {
        res.status(400).json({ error: "Members are only available for team workspaces" });
        return;
      }

      await assertWorkspaceMember(ws.workspaceId, appUser.id);
      const members = await listWorkspaceMembersWithProfiles(ws.workspaceId);

      res.json({
        members: members.map((member) => ({
          userId: member.user_id,
          role: member.role,
          joinedAt: member.joined_at,
          firstName: member.user?.first_name ?? null,
          username: member.user?.username ?? null
        }))
      });
    } catch (error) {
      console.error("Failed to list workspace members", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.get("/api/workspaces/invites", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);

      if (ws.workspace.kind !== "team") {
        res.status(400).json({ error: "Invites are only available for team workspaces" });
        return;
      }

      if (ws.role !== "owner") {
        res.status(403).json({ error: "Only the team owner can list invites" });
        return;
      }

      const invites = await listActiveWorkspaceInvites(ws.workspaceId);

      res.json({
        invites: invites.map((invite) => ({
          id: invite.id,
          token: invite.token,
          createdAt: invite.created_at,
          expiresAt: invite.expires_at
        }))
      });
    } catch (error) {
      console.error("Failed to list workspace invites", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.post("/api/workspaces/invites", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);

      let expiresInDays: number | null | undefined = DEFAULT_INVITE_EXPIRES_DAYS;

      if (req.body && Object.prototype.hasOwnProperty.call(req.body, "expiresInDays")) {
        const raw = req.body.expiresInDays;

        if (raw === null) {
          expiresInDays = null;
        } else if (typeof raw === "number" && Number.isFinite(raw)) {
          expiresInDays = raw;
        } else {
          res.status(400).json({
            error: "expiresInDays must be a number of days or null for no expiry"
          });
          return;
        }
      }

      const invite = await createWorkspaceInvite(ws.workspaceId, appUser.id, { expiresInDays });

      res.status(201).json({
        invite: {
          id: invite.id,
          token: invite.token,
          workspaceId: invite.workspace_id,
          createdAt: invite.created_at,
          expiresAt: invite.expires_at
        }
      });
    } catch (error) {
      console.error("Failed to create workspace invite", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.get("/api/workspaces/invites/:token", async (req, res) => {
    try {
      const token =
        typeof req.params.token === "string" ? req.params.token.trim() : "";

      if (!token) {
        res.status(400).json({ error: "Invite token is required" });
        return;
      }

      const preview = await getActiveInviteByToken(token);

      if (!preview) {
        res.status(404).json({ error: "Invite not found" });
        return;
      }

      res.json({
        workspace: {
          id: preview.workspace.id,
          name: preview.workspace.name,
          kind: preview.workspace.kind,
          memberCount: preview.memberCount,
          maxMembers: preview.workspace.max_members
        }
      });
    } catch (error) {
      console.error("Failed to preview workspace invite", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.post("/api/workspaces/invites/:token/accept", async (req, res) => {
    try {
      const appUser = await deps.authenticateMiniAppUser(req);
      const token =
        typeof req.params.token === "string" ? req.params.token.trim() : "";

      if (!token) {
        res.status(400).json({ error: "Invite token is required" });
        return;
      }

      const result = await acceptWorkspaceInvite(token, appUser.id);
      setActiveWorkspaceCookie(res, result.workspace.id);

      void notifyTeamJoinAccepted({
        joined: result.joined,
        workspaceName: result.workspace.name,
        memberAppUser: appUser,
        ownerAppUserId: result.workspace.owner_user_id
      });

      res.json({
        workspace: toWorkspaceListItemDto({
          ...result.workspace,
          role: result.membership.role,
          member_count: (await listWorkspacesForUser(appUser.id)).find(
            (item) => item.id === result.workspace.id
          )?.member_count ?? 1
        })
      });
    } catch (error) {
      console.error("Failed to accept workspace invite", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.delete("/api/workspaces/invites/:inviteId", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);
      const inviteId =
        typeof req.params.inviteId === "string" ? req.params.inviteId.trim() : "";

      if (!inviteId) {
        res.status(400).json({ error: "Invite id is required" });
        return;
      }

      const invite = await revokeWorkspaceInvite(inviteId, ws.workspaceId, appUser.id);

      res.json({
        invite: {
          id: invite.id,
          revokedAt: invite.revoked_at
        }
      });
    } catch (error) {
      console.error("Failed to revoke workspace invite", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.delete("/api/workspaces/members/:userId", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);
      const targetUserId =
        typeof req.params.userId === "string" ? req.params.userId.trim() : "";

      if (!targetUserId) {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      if (ws.workspace.kind !== "team") {
        res.status(400).json({ error: "Members can only be removed from team workspaces" });
        return;
      }

      await removeTeamWorkspaceMember(ws.workspaceId, appUser.id, targetUserId);

      res.json({
        removedUserId: targetUserId,
        memberCount: await countWorkspaceMembers(ws.workspaceId)
      });
    } catch (error) {
      console.error("Failed to remove workspace member", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.post("/api/workspaces/team/leave", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);

      if (ws.workspace.kind !== "team") {
        res.status(400).json({ error: "Not in a team workspace" });
        return;
      }

      await leaveTeamWorkspace(ws.workspaceId, appUser.id);

      const personal =
        (await getPersonalWorkspaceForUser(appUser.id)) ??
        (await ensurePersonalWorkspace(appUser.id));
      const membership = await assertWorkspaceMember(personal.id, appUser.id);

      setActiveWorkspaceCookie(res, personal.id);

      res.json({
        workspace: await buildWorkspaceApiDto({
          appUserId: appUser.id,
          workspaceId: personal.id,
          role: membership.role,
          workspace: personal
        }),
        workspaces: await buildWorkspacesListPayload(appUser.id)
      });
    } catch (error) {
      console.error("Failed to leave team workspace", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });

  app.patch("/api/workspaces/team/name", async (req, res) => {
    try {
      const { appUser, ws } = await requireWorkspaceContext(req, deps);
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        res.status(400).json({ error: "Team name is required" });
        return;
      }

      const workspace = await updateTeamWorkspaceName(ws.workspaceId, appUser.id, name);

      res.json({
        workspace: await buildWorkspaceApiDto({
          appUserId: appUser.id,
          workspaceId: workspace.id,
          role: ws.role,
          workspace
        })
      });
    } catch (error) {
      console.error("Failed to rename team workspace", error);
      res.status(workspaceErrorStatus(error)).json({
        error: workspaceErrorMessage(error)
      });
    }
  });
}
