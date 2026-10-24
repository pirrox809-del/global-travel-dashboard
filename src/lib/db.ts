import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from '@prisma/client'

/**
 * Runtime DATABASE_URL resolution.
 *
 * Locally (and in the sandbox) `.env` provides DATABASE_URL and everything
 * works as-is. On Vercel, `.env` is intentionally NOT committed (security),
 * so there is no DATABASE_URL — Prisma would throw
 * "Environment variable not found: DATABASE_URL" and every DB-backed API
 * route would return 500.
 *
 * Fix: if no DATABASE_URL is present, locate the committed SQLite file
 * (db/custom.db) relative to the serverless working directory and use it.
 * On Vercel the function filesystem is READ-ONLY, so first copy the DB to
 * /tmp (writable) so Prisma can create journal/WAL files and the app can
 * persist LLM-generated content (ephemeral per lambda instance — fine).
 *
 * IMPORTANT: this module must NEVER throw at import time — a throw during
 * module init makes every DB route 500 with an empty body and hides the
 * root cause. Worst case we return a best-guess path and the first QUERY
 * fails with a descriptive error that route handlers can catch and report.
 */
function diagnose(candidates: string[]): string {
  const parts = [
    `cwd=${process.cwd()}`,
    `vercel=${process.env.VERCEL ?? 'unset'}`,
    'candidates: ' + candidates
      .map((p) => `${p} (${fs.existsSync(p) ? 'EXISTS' : 'missing'})`)
      .join(', '),
  ];
  return parts.join(' | ');
}

function resolveDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL;

  // Only trust an EXPLICIT ABSOLUTE file: URL (e.g. the sandbox .env).
  // Relative URLs like "file:../db/custom.db" are resolved by the Prisma
  // engine relative to unpredictable locations in serverless bundles and
  // fail with "Error code 14: Unable to open the database file" — replace
  // them with an absolute path we control (see candidates below).
  const isAbsoluteFileUrl = (u: string) => /^file:(\/\/)?\//.test(u);
  if (explicit && isAbsoluteFileUrl(explicit)) {
    if (!fs.existsSync(explicit.replace(/^file:(\/\/)?/, ''))) {
      console.error('[db] DATABASE_URL points to a missing file:', explicit);
    }
    return explicit;
  }
  if (explicit && !/^file:/i.test(explicit)) {
    // Non-file URLs (postgres://, etc.) — pass through untouched.
    return explicit;
  }

  const candidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), 'prisma', 'db', 'custom.db'),
    path.join(process.cwd(), '..', 'db', 'custom.db'),
  ];
  const source = candidates.find((p) => fs.existsSync(p));

  // Serverless platforms (Vercel) mount the bundle read-only: copy the
  // committed DB to /tmp so SQLite can write journals and the app can save
  // generated content. Only pays a one-time ~0.5MB copy per lambda instance.
  if (process.env.VERCEL) {
    const tmp = path.join(os.tmpdir(), 'custom.db');
    if (source) {
      try {
        if (!fs.existsSync(tmp) || fs.statSync(tmp).size !== fs.statSync(source).size) {
          fs.copyFileSync(source, tmp);
        }
        return `file:${tmp}`;
      } catch (e) {
        console.error('[db] copy to /tmp failed:', (e as Error).message, '— using read-only file');
        return `file:${source}`;
      }
    }
    // No candidate found (e.g. the DB was not traced into the lambda).
    console.error('[db] DB file NOT FOUND in lambda —', diagnose(candidates));
    return `file:${tmp}`; // query will fail with a descriptive SQLite error
  }

  if (source) return `file:${source}`;
  console.error('[db] No DATABASE_URL and no SQLite file found —', diagnose(candidates));
  return `file:${candidates[0]}`; // query will fail with a descriptive error
}

process.env.DATABASE_URL ??= resolveDatabaseUrl();

/** Human-readable state for error reports returned by API routes. */
export function getDbDiagnostics(): string {
  const candidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), 'prisma', 'db', 'custom.db'),
    path.join(process.cwd(), '..', 'db', 'custom.db'),
  ];
  return diagnose(candidates) + ` | url=${process.env.DATABASE_URL ?? 'unset'}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
