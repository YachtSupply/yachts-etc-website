import { getTemplateVersion, parseSemver, getUpgradeType } from '@/lib/github';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://boatwork.co',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** CORS preflight */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Public endpoint for contractor sites to check if an update is available.
 *
 * GET /api/template/version-check?current=1.0.0
 *
 * Used by the upgrade notification banner on boatwork.co business center.
 * Fetches the live template version from GitHub. Falls back to the build-time
 * constant if the GitHub API is unreachable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentVersion = searchParams.get('current') || '0.0.0';

  // Read local .boatwork-template for repo identity and fallback version
  let fallbackVersion = '0.0.0';
  let templateRepo = 'YachtSupply/marine-pro-website-template';
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.boatwork-template'), 'utf8'));
    fallbackVersion = meta.templateVersion || '0.0.0';
    templateRepo = meta.templateRepo || templateRepo;
  } catch { /* use default */ }

  // Prefer live version from GitHub; fall back to build-time constant
  const liveVersion = await getTemplateVersion(templateRepo);
  const latestVersion = liveVersion?.version || fallbackVersion;

  const upgradeType = getUpgradeType(latestVersion, currentVersion);
  const tv = parseSemver(latestVersion);
  const sv = parseSemver(currentVersion);

  // Only report update if template is actually newer
  const isNewer = tv.major > sv.major ||
    (tv.major === sv.major && tv.minor > sv.minor) ||
    (tv.major === sv.major && tv.minor === sv.minor && tv.patch > sv.patch);

  return Response.json({
    currentVersion,
    latestVersion,
    updateAvailable: isNewer,
    upgradeType: isNewer ? upgradeType : 'up-to-date',
    isForced: isNewer && upgradeType === 'force',
    changelog: isNewer
      ? `Version ${latestVersion}: ${tv.major > sv.major ? 'Major update' : tv.minor > sv.minor ? 'New features available' : 'Bug fixes and improvements'}`
      : null,
  }, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
