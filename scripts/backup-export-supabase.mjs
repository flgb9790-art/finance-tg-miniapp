/**
 * One-off Supabase data export via service role (no DATABASE_URL required).
 * Usage: node scripts/backup-export-supabase.mjs <outputDir>
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config();

const outputDir = process.argv[2];

if (!outputDir) {
  console.error("Usage: node scripts/backup-export-supabase.mjs <outputDir>");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TABLES = [
  "app_users",
  "currencies",
  "exchange_rates",
  "accounts",
  "categories",
  "entries",
  "transfers",
  "workspaces",
  "workspace_members",
  "workspace_invites"
];

const PAGE_SIZE = 1000;

async function exportTable(table) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      const code = error.code ?? "";
      const message = error.message ?? "";

      if (
        code === "PGRST205" ||
        code === "42P01" ||
        message.includes("does not exist") ||
        message.includes("Could not find the table")
      ) {
        return { table, rows: [], skipped: true, reason: message };
      }

      throw new Error(`${table}: ${message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return { table, rows, skipped: false };
}

await mkdir(outputDir, { recursive: true });

const manifest = {
  exportedAt: new Date().toISOString(),
  supabaseUrl,
  tables: {}
};

for (const table of TABLES) {
  process.stdout.write(`Exporting ${table}... `);

  try {
    const result = await exportTable(table);
    const filePath = path.join(outputDir, `${table}.json`);

    await writeFile(filePath, JSON.stringify(result.rows, null, 2), "utf8");

    manifest.tables[table] = {
      rowCount: result.rows.length,
      skipped: result.skipped,
      reason: result.reason ?? null,
      file: `${table}.json`
    };

    if (result.skipped) {
      console.log("skipped (not in DB)");
    } else {
      console.log(`${result.rows.length} rows`);
    }
  } catch (error) {
    manifest.tables[table] = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.log("FAILED");
    console.error(error);
  }
}

await writeFile(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log("Supabase export done:", outputDir);
