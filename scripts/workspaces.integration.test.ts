/**
 * Integration tests for workspace services (requires Supabase + .env).
 * Usage: npm run test:workspaces
 */
import { config } from "dotenv";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  WorkspaceError,
  acceptWorkspaceInvite,
  createTeamWorkspace,
  createWorkspaceInvite,
  ensurePersonalWorkspace,
  getWorkspaceMembership,
  leaveTeamWorkspace,
  listActiveWorkspaceInvites,
  listWorkspacesForUser,
  revokeWorkspaceInvite,
  userHasTeamWorkspace
} from "../src/services/workspaces.ts";

config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error("SKIP: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const runId = Date.now();
const telegramIdOwner = -(9_000_000_000_000 + runId);
const telegramIdMember = telegramIdOwner - 1;

let ownerUserId = "";
let memberUserId = "";
let teamWorkspaceId = "";

async function insertTestUser(telegramUserId: number, label: string): Promise<string> {
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      telegram_user_id: telegramUserId,
      username: `test_${label}_${runId}`,
      first_name: `Test ${label}`
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error(`Failed to create test user ${label}`);
  }

  return data.id as string;
}

async function deleteTestUsers(): Promise<void> {
  const ids = [ownerUserId, memberUserId].filter(Boolean);

  if (ids.length === 0) {
    return;
  }

  const workspaceIds = new Set<string>();

  if (teamWorkspaceId) {
    workspaceIds.add(teamWorkspaceId);
  }

  const { data: ownedWorkspaces, error: ownedError } = await supabase
    .from("workspaces")
    .select("id")
    .in("owner_user_id", ids);

  if (ownedError) {
    console.warn("[test] cleanup list workspaces failed:", ownedError.message);
  } else {
    for (const row of ownedWorkspaces ?? []) {
      workspaceIds.add(row.id as string);
    }
  }

  if (workspaceIds.size > 0) {
    const { error: workspaceDeleteError } = await supabase
      .from("workspaces")
      .delete()
      .in("id", [...workspaceIds]);

    if (workspaceDeleteError) {
      console.warn("[test] cleanup workspaces failed:", workspaceDeleteError.message);
    }
  }

  const { error } = await supabase.from("app_users").delete().in("id", ids);

  if (error) {
    console.warn("[test] cleanup app_users failed:", error.message);
  }
}

describe("workspaces integration", () => {
  after(async () => {
    await deleteTestUsers();
  });

  it("creates personal workspaces for new users", async () => {
    ownerUserId = await insertTestUser(telegramIdOwner, "owner");
    memberUserId = await insertTestUser(telegramIdMember, "member");

    const personalOwner = await ensurePersonalWorkspace(ownerUserId);
    const personalMember = await ensurePersonalWorkspace(memberUserId);

    assert.equal(personalOwner.kind, "personal");
    assert.equal(personalMember.kind, "personal");
    assert.notEqual(personalOwner.id, personalMember.id);
  });

  it("creates a team, invite, and accepts membership", async () => {
    const team = await createTeamWorkspace(ownerUserId, `Test team ${runId}`);
    teamWorkspaceId = team.id;

    assert.equal(team.kind, "team");
    assert.equal(await userHasTeamWorkspace(ownerUserId), true);
    assert.equal(await userHasTeamWorkspace(memberUserId), false);

    const invite = await createWorkspaceInvite(team.id, ownerUserId);
    assert.ok(invite.token);

    const activeBefore = await listActiveWorkspaceInvites(team.id);
    assert.ok(activeBefore.some((item) => item.id === invite.id));

    const accepted = await acceptWorkspaceInvite(invite.token, memberUserId);
    assert.equal(accepted.workspace.id, team.id);
    assert.equal(accepted.membership.role, "editor");
    assert.equal(await userHasTeamWorkspace(memberUserId), true);

    const memberMembership = await getWorkspaceMembership(team.id, memberUserId);
    assert.ok(memberMembership);
  });

  it("prevents owner from leaving and allows member to leave", async () => {
    await assert.rejects(
      () => leaveTeamWorkspace(teamWorkspaceId, ownerUserId),
      (error: unknown) => {
        assert.ok(error instanceof WorkspaceError);
        assert.equal(error.code, "forbidden");
        return true;
      }
    );

    await leaveTeamWorkspace(teamWorkspaceId, memberUserId);
    assert.equal(await getWorkspaceMembership(teamWorkspaceId, memberUserId), null);
    assert.equal(await userHasTeamWorkspace(memberUserId), false);
  });

  it("revokes invites and lists workspaces for owner", async () => {
    const invite = await createWorkspaceInvite(teamWorkspaceId, ownerUserId);
    const revoked = await revokeWorkspaceInvite(invite.id, teamWorkspaceId, ownerUserId);
    assert.ok(revoked.revoked_at);

    const active = await listActiveWorkspaceInvites(teamWorkspaceId);
    assert.equal(
      active.some((item) => item.id === invite.id),
      false
    );

    const workspaces = await listWorkspacesForUser(ownerUserId);
    const kinds = workspaces.map((item) => item.kind).sort();
    assert.deepEqual(kinds, ["personal", "team"]);
  });
});
