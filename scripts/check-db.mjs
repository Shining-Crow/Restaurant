#!/usr/bin/env node
/**
 * Quick Supabase / Postgres connectivity check for local setup.
 * Run: npm run db:check
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

function withPrismaCliParams(connectionString) {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function migrationDatabaseUrl() {
  const raw =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  return raw ? withPrismaCliParams(raw) : "";
}

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return "(invalid URL)";
  }
}

async function tryConnect(label, url) {
  if (!url?.trim()) {
    console.log(`  ${label}: skipped (not set)`);
    return false;
  }
  const client = new Client({
    connectionString: url.trim(),
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    await client.query("select 1 as ok");
    console.log(`  ${label}: OK`);
    console.log(`    ${maskUrl(url)}`);
    await client.end();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${label}: FAILED`);
    console.log(`    ${maskUrl(url)}`);
    console.log(`    ${message}`);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

function tryPrismaExecute(label) {
  const result = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--stdin"],
    {
      input: "select 1;",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    },
  );
  if (result.status === 0) {
    console.log(`  ${label}: OK`);
    console.log(`    ${maskUrl(migrationDatabaseUrl())}`);
    return true;
  }
  const stderr = (result.stderr || result.stdout || "").trim();
  console.log(`  ${label}: FAILED`);
  console.log(`    ${maskUrl(migrationDatabaseUrl())}`);
  if (stderr) console.log(`    ${stderr.split("\n").slice(-3).join("\n    ")}`);
  return false;
}

const direct = process.env.DIRECT_URL?.trim();
const pooled = process.env.DATABASE_URL?.trim();
const directForPrisma = direct ? withPrismaCliParams(direct) : "";

console.log("Checking database connections...\n");

const directOk = await tryConnect("DIRECT_URL (pg client)", directForPrisma);
await tryConnect("DATABASE_URL (app runtime)", pooled);
console.log("");
const prismaOk = tryPrismaExecute("Prisma CLI (used by db:migrate)");

console.log("");
if (prismaOk) {
  console.log("Prisma migrate should work — run:");
  console.log("  npm run db:migrate:deploy   # apply pending migrations");
  console.log("  npm run db:migrate          # dev workflow / new migrations");
  process.exit(0);
}

if (directOk) {
  console.log("pg connects but Prisma CLI failed.");
  console.log("Ensure DIRECT_URL includes ?sslmode=require&connect_timeout=30");
  console.log("Then retry: npm run db:migrate:deploy");
  process.exit(1);
}

console.log("Could not connect for migrations.\n");
console.log("Fix:");
console.log("  1. Open https://supabase.com/dashboard → your project");
console.log("  2. Settings → Database → Connection string");
console.log("  3. If the project is paused, click Restore / Unpause first");
console.log("  4. Copy fresh URIs into .env:");
console.log("     DATABASE_URL  = Transaction pooler (:6543, ?pgbouncer=true)");
console.log("     DIRECT_URL    = Session pooler (:5432) + ?sslmode=require&connect_timeout=30");
console.log("");
console.log('If you see "tenant/user ... not found", the project ref, password,');
console.log("or pooler region in .env does not match the dashboard strings.");
process.exit(1);
