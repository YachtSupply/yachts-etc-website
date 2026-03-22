/**
 * GitHub API helpers for template version checking.
 * Used by /api/template/version-check to let contractor sites
 * know when a newer template version is available.
 */

const GITHUB_API = 'https://api.github.com';
const ORG = 'YachtSupply';
const TEMPLATE_REPO = 'marine-pro-website-template';

function getToken(): string | null {
  return process.env.SYNC_TOKEN || process.env.GITHUB_TOKEN || null;
}

async function githubFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error('No GitHub token configured (SYNC_TOKEN or GITHUB_TOKEN)');

  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
    cache: 'no-store',
  });
}

// ── Types ──

export interface TemplateVersion {
  version: string;
  sha: string;
  date: string;
  message: string;
  author: string;
}

// ── Semver helpers ──

export function parseSemver(v: string) {
  const match = (v || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return { major: 0, minor: 0, patch: 0 };
  return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
}

export function isNewerVersion(templateVersion: string, siteVersion: string): boolean {
  const tv = parseSemver(templateVersion);
  const sv = parseSemver(siteVersion);
  if (tv.major !== sv.major) return tv.major > sv.major;
  if (tv.minor !== sv.minor) return tv.minor > sv.minor;
  return tv.patch > sv.patch;
}

export function getUpgradeType(templateVersion: string, siteVersion: string): 'force' | 'optional' | 'up-to-date' {
  if (templateVersion === siteVersion) return 'up-to-date';
  if (!isNewerVersion(templateVersion, siteVersion)) return 'up-to-date';
  const tv = parseSemver(templateVersion);
  const sv = parseSemver(siteVersion);
  if (tv.major !== sv.major || tv.minor !== sv.minor) return 'force';
  return 'optional';
}

// ── Types for admin endpoints ──

export interface ContractorSite {
  slug: string;
  repo: string;
  version: string;
  upgradeType: 'force' | 'optional' | 'up-to-date';
}

export interface VersionHistoryEntry {
  version: string;
  sha: string;
  date: string;
  message: string;
  author: string;
}

// ── API functions ──

/** Get the current template version from .boatwork-template on main */
export async function getTemplateVersion(): Promise<TemplateVersion | null> {
  try {
    const commitRes = await githubFetch(`/repos/${ORG}/${TEMPLATE_REPO}/commits/main`);
    if (!commitRes.ok) return null;
    const commit = await commitRes.json();

    const fileRes = await githubFetch(`/repos/${ORG}/${TEMPLATE_REPO}/contents/.boatwork-template?ref=main`);
    if (!fileRes.ok) return null;
    const file = await fileRes.json();
    const meta = JSON.parse(Buffer.from(file.content, 'base64').toString());

    return {
      version: meta.templateVersion || '0.0.0',
      sha: commit.sha,
      date: commit.commit.author.date,
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author.name,
    };
  } catch (err) {
    console.error('[github] Failed to get template version:', err);
    return null;
  }
}

/** List all contractor sites and their current template versions */
export async function getContractorSites(): Promise<ContractorSite[]> {
  try {
    const templateVersion = await getTemplateVersion();
    const res = await githubFetch(`/orgs/${ORG}/repos?per_page=100&type=all`);
    if (!res.ok) return [];
    const repos = (await res.json()) as Array<{ name: string; full_name: string }>;

    const sites: ContractorSite[] = [];
    for (const repo of repos) {
      if (!repo.name.endsWith('-website') || repo.name === TEMPLATE_REPO) continue;

      const fileRes = await githubFetch(`/repos/${repo.full_name}/contents/.boatwork-template?ref=main`);
      if (!fileRes.ok) continue;
      const file = await fileRes.json();
      const meta = JSON.parse(Buffer.from(file.content, 'base64').toString());
      const siteVersion = meta.templateVersion || '0.0.0';

      sites.push({
        slug: repo.name.replace(/-website$/, ''),
        repo: repo.full_name,
        version: siteVersion,
        upgradeType: templateVersion ? getUpgradeType(templateVersion.version, siteVersion) : 'up-to-date',
      });
    }
    return sites;
  } catch (err) {
    console.error('[github] Failed to get contractor sites:', err);
    return [];
  }
}

/** Get version history from recent commits that include version bumps */
export async function getVersionHistory(limit = 20): Promise<VersionHistoryEntry[]> {
  try {
    const res = await githubFetch(`/repos/${ORG}/${TEMPLATE_REPO}/commits?per_page=${limit}&path=.boatwork-template`);
    if (!res.ok) return [];
    const commits = (await res.json()) as Array<{
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
    }>;

    return commits.map((c) => ({
      version: '', // filled below if parseable
      sha: c.sha,
      date: c.commit.author.date,
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
    }));
  } catch (err) {
    console.error('[github] Failed to get version history:', err);
    return [];
  }
}

/** Trigger a template sync workflow run */
export async function triggerSync(targetRepo?: string, force?: boolean): Promise<boolean> {
  try {
    const res = await githubFetch(`/repos/${ORG}/${TEMPLATE_REPO}/actions/workflows/sync-template.yml/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          force: force ? 'true' : 'false',
          ...(targetRepo ? { target_repo: targetRepo } : {}),
        },
      }),
    });
    return res.status === 204;
  } catch (err) {
    console.error('[github] Failed to trigger sync:', err);
    return false;
  }
}
