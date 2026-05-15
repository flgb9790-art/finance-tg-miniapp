/**
 * Run after applying workspace migrations (005+, optional 006) in Supabase.
 * Usage: npm run verify:workspaces
 * Optional: node scripts/verify-phase-1-workspaces.mjs --full  (scan all rows for null workspace_id)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

function ok(message) {
  console.log("OK:", message);
}

async function tableExists(name) {
  const { error } = await supabase.from(name).select("id", { head: true, count: "exact" }).limit(1);

  if (!error) {
    return true;
  }

  const message = error.message ?? "";

  return !(
    message.includes("does not exist") ||
    message.includes("Could not find the table") ||
    error.code === "PGRST205"
  );
}

const fullScan = process.argv.includes("--full");

async function countNulls(table, column) {
  if (fullScan) {
    const { count, error } = await supabase
      .from(table)
      .select(column, { count: "exact", head: true })
      .is(column, null);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    return { total: "all", nulls: count ?? 0 };
  }

  const { data, error } = await supabase.from(table).select(column).limit(5000);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  const nulls = (data ?? []).filter((row) => row[column] == null).length;
  return { total: data?.length ?? 0, nulls };
}

console.log("Phase 1 workspace verification\n");

for (const table of ["workspaces", "workspace_members", "workspace_invites"]) {
  if (!(await tableExists(table))) {
    fail(`Table public.${table} is missing — apply supabase/migrations/005_workspaces_mvp.sql`);
    process.exit(1);
  }
}

ok("workspace tables exist");

const { count: userCount, error: userErr } = await supabase
  .from("app_users")
  .select("id", { count: "exact", head: true });

if (userErr) {
  fail(userErr.message);
  process.exit(1);
}

const { count: personalCount, error: personalErr } = await supabase
  .from("workspaces")
  .select("id", { count: "exact", head: true })
  .eq("kind", "personal");

if (personalErr) {
  fail(personalErr.message);
  process.exit(1);
}

if ((personalCount ?? 0) < (userCount ?? 0)) {
  fail(`personal workspaces (${personalCount}) < app_users (${userCount})`);
} else {
  ok(`personal workspace per user (${personalCount}/${userCount})`);
}

for (const table of ["accounts", "categories", "entries", "transfers"]) {
  const { nulls, total } = await countNulls(table, "workspace_id");

  if (nulls > 0) {
    fail(`${table}: ${nulls}/${total} rows with null workspace_id`);
  } else {
    const scope = fullScan ? "full table" : `${total} sampled`;
    ok(`${table}: no null workspace_id (${scope})`);
  }
}

console.log("\nDone. Fix any FAIL before deploying app changes.");
console.log("Optional: apply 006_workspace_transfer_account_indexes.sql for transfer account filters.");
