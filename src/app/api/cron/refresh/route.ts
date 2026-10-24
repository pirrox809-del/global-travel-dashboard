import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { generateCountryPayload, persistCountryPayload } from '@/lib/external/llm-content';
import { getZai } from '@/lib/zai';

/**
 * Daily scheduled refresh (Vercel Cron → vercel.json "crons").
 *
 * What it does
 * ------------
 * 1. STATUS   : always reports how many countries have AI content and which
 *               ones are the oldest (visible in the Vercel cron logs).
 * 2. REFRESH  : regenerates a small batch (default 2, max 3) of country
 *               briefs — missing ones first, then the oldest by updatedAt —
 *               into a disposable /tmp copy of the SQLite database.
 * 3. PERSIST  : if GH_TOKEN + GH_REPO are configured, commits the refreshed
 *               database back to the repository. The push triggers a Vercel
 *               redeploy, so the new briefs go live automatically.
 *
 * Live data (exchange rates, weather, news, holidays, advisories) is fetched
 * per-request by the app itself, so it is always fresh without any cron.
 * The AI briefs are evergreen editorial content: a small daily rotation keeps
 * the whole dataset healthy without ever hitting the 60s serverless limit.
 *
 * Auth (first match wins):
 *   - Authorization: Bearer $CRON_SECRET  (Vercel Cron sends this automatically
 *     when the CRON_SECRET env var exists)
 *   - Authorization: Bearer $REFRESH_KEY or ?key=$REFRESH_KEY (manual runs)
 *   - the x-vercel-cron header injected by the Vercel scheduler
 *
 * Env vars:
 *   CRON_SECRET  optional — recommended, protects the endpoint
 *   REFRESH_KEY  optional — manual trigger key (?key=…)
 *   GH_TOKEN     optional — fine-grained PAT with "Contents: read/write" on
 *                the repo; enables the automatic commit-back
 *   GH_REPO      optional — "owner/repo" (default: inferred from VERCEL env)
 *   GH_BRANCH    optional — default "main"
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const REPO_DB_PATH = 'db/custom.db';
const DEFAULT_BATCH = 2;
const MAX_BATCH = 3;

const COUNTRY_SELECT = {
  code: true,
  name: true,
  officialName: true,
  capital: true,
  region: true,
  subregion: true,
  languagesJson: true,
  currenciesJson: true,
} as const;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const alt = process.env.REFRESH_KEY;
  const auth = req.headers.get('authorization') ?? '';
  if (secret && auth === `Bearer ${secret}`) return true;
  if (alt && (auth === `Bearer ${alt}` || req.nextUrl.searchParams.get('key') === alt)) return true;
  return Boolean(req.headers.get('x-vercel-cron'));
}

async function statusReport() {
  const [total, withContent, missing, oldest] = await Promise.all([
    db.country.count(),
    db.countryContent.count(),
    db.country.findMany({
      where: { content: null },
      select: { code: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.country.findMany({
      where: { content: { isNot: null } },
      select: { code: true, name: true, content: { select: { updatedAt: true } } },
      orderBy: { content: { updatedAt: 'asc' } },
      take: 5,
    }),
  ]);
  return {
    total,
    withContent,
    coverage: `${Math.round((withContent / Math.max(total, 1)) * 100)}%`,
    missing: missing.map((c) => `${c.code} ${c.name}`),
    oldest: oldest.map((c) => ({
      code: c.code,
      name: c.name,
      updatedAt: c.content?.updatedAt ?? null,
    })),
  };
}

/** Resolve the committed SQLite file inside the serverless bundle. */
function sourceDbPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), 'prisma', 'db', 'custom.db'),
  ];
  return candidates.find((p) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('fs').existsSync(p);
    } catch {
      return false;
    }
  }) ?? null;
}

/* ------------------------------------------------------------------ */
/* GitHub commit-back                                                  */
/* ------------------------------------------------------------------ */

interface GhSha { sha?: string; message?: string; html_url?: string }

async function ghApi(
  url: string,
  token: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: GhSha }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'global-travel-dashboard-cron',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data: GhSha = {};
  try {
    data = (await res.json()) as GhSha;
  } catch {
    /* empty body */
  }
  return { ok: res.ok, status: res.status, data };
}

async function commitDbToGitHub(
  bytes: Buffer,
): Promise<{ mode: 'github'; commitUrl?: string; error: string } | { mode: 'github-not-configured' } | { mode: 'none' }> {
  const token = process.env.GH_TOKEN;
  const repo = process.env.GH_REPO;
  if (!token || !repo) return { mode: 'github-not-configured' };
  const branch = process.env.GH_BRANCH || 'main';
  const api = `https://api.github.com/repos/${repo}/git`;

  const ref = await ghApi(`${api}/ref/heads/${branch}`, token, 'GET');
  if (!ref.ok || !ref.data.object) return { mode: 'github', error: `ref: ${ref.status} ${ref.data.message ?? ''}` };
  const baseCommitSha = ref.data.object.sha;

  const baseCommit = await ghApi(`${api}/commits/${baseCommitSha}`, token, 'GET');
  if (!baseCommit.ok || !baseCommit.data.tree) return { mode: 'github', error: `commit: ${baseCommit.status} ${baseCommit.data.message ?? ''}` };
  const baseTreeSha = baseCommit.data.tree.sha;

  const blob = await ghApi(`${api}/blobs`, token, 'POST', {
    content: bytes.toString('base64'),
    encoding: 'base64',
  });
  if (!blob.ok || !blob.data.sha) return { mode: 'github', error: `blob: ${blob.status} ${blob.data.message ?? ''}` };

  const tree = await ghApi(`${api}/trees`, token, 'POST', {
    base_tree: baseTreeSha,
    tree: [{ path: REPO_DB_PATH, mode: '100644', type: 'blob', sha: blob.data.sha }],
  });
  if (!tree.ok || !tree.data.sha) return { mode: 'github', error: `tree: ${tree.status} ${tree.data.message ?? ''}` };

  const commit = await ghApi(`${api}/commits`, token, 'POST', {
    message: `chore(data): daily auto-refresh of country briefs [cron]`,
    tree: tree.data.sha,
    parents: [baseCommitSha],
  });
  if (!commit.ok || !commit.data.sha) return { mode: 'github', error: `commit: ${commit.status} ${commit.data.message ?? ''}` };

  const push = await ghApi(`${api}/refs/heads/${branch}`, token, 'PATCH', {
    sha: commit.data.sha,
    force: false,
  });
  if (!push.ok) return { mode: 'github', error: `push: ${push.status} ${push.data.message ?? ''}` };

  return { mode: 'github', commitUrl: commit.data.html_url };
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'briefs';
  const status = await statusReport();

  if (scope === 'status') {
    return NextResponse.json({ scope, llm: Boolean(await getZai()), status });
  }

  const zai = await getZai();
  if (!zai) {
    return NextResponse.json({
      scope,
      llm: false,
      status,
      refreshed: [],
      persisted: { mode: 'none' },
      note: 'LLM credentials not configured on this deployment — set ZAI_BASE_URL / ZAI_API_KEY / ZAI_TOKEN. Status report only.',
    });
  }

  const batch = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get('batch') ?? DEFAULT_BATCH) || DEFAULT_BATCH, 1),
    MAX_BATCH,
  );

  // Missing briefs first, then the stalest ones.
  const missing = await db.country.findMany({
    where: { content: null },
    select: COUNTRY_SELECT,
    orderBy: { name: 'asc' },
  });
  const staleNeeded = Math.max(batch - missing.length, 0);
  const stale = staleNeeded
    ? await db.country.findMany({
        where: { content: { isNot: null } },
        select: COUNTRY_SELECT,
        orderBy: { content: { updatedAt: 'asc' } },
        take: staleNeeded,
      })
    : [];
  const targets = [...missing, ...stale].slice(0, batch);

  if (targets.length === 0) {
    return NextResponse.json({ scope, llm: true, status, refreshed: [], persisted: { mode: 'none' }, note: 'All briefs present and fresh.' });
  }

  // Work on a disposable copy — the bundle filesystem is read-only on Vercel.
  const src = sourceDbPath();
  if (!src) {
    return NextResponse.json({ scope, llm: true, status, error: 'db file not found in bundle' }, { status: 500 });
  }
  const tmpDbPath = '/tmp/cron-refresh.db';
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    await fs.rm(`${tmpDbPath}${suffix}`, { force: true });
  }
  await fs.copyFile(src, tmpDbPath);
  const tmpDb = new PrismaClient({ datasourceUrl: `file:${tmpDbPath}` });

  const refreshed: { code: string; ok: boolean; error?: string }[] = [];
  try {
    for (const country of targets) {
      try {
        const payload = await generateCountryPayload(country, 'English');
        await persistCountryPayload(country.code, payload, 'en', tmpDb);
        refreshed.push({ code: country.code, ok: true });
      } catch (err) {
        refreshed.push({ code: country.code, ok: false, error: (err as Error).message });
      }
    }
  } finally {
    await tmpDb.$disconnect();
  }

  const okCount = refreshed.filter((r) => r.ok).length;
  let persisted: Awaited<ReturnType<typeof commitDbToGitHub>> = { mode: 'none' };
  if (okCount > 0) {
    const bytes = await fs.readFile(tmpDbPath);
    persisted = await commitDbToGitHub(bytes);
  }

  return NextResponse.json({
    scope,
    llm: true,
    status,
    refreshed,
    persisted,
    note:
      persisted.mode === 'github'
        ? 'Refreshed database committed to the repository — Vercel will redeploy automatically.'
        : persisted.mode === 'github-not-configured'
          ? 'Briefs regenerated but NOT persisted: set GH_TOKEN + GH_REPO to enable the automatic commit-back.'
          : undefined,
  });
}
