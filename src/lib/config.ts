import { siteConfig } from '@/site.config';

// Support both nested (template v1+) and flat (legacy) siteConfig shapes.
// Downstream sites may omit the `boatwork` object and put these fields at the top level.
const bw = (): Record<string, any> => {
  if ('boatwork' in siteConfig && (siteConfig as any).boatwork) {
    return (siteConfig as any).boatwork;
  }
  return siteConfig as unknown as Record<string, any>;
};

// Returns the site URL from NEXT_PUBLIC_SITE_URL. Throws on *provisioned*
// mini-sites if unset so a misconfigured provision can't ship a broken
// canonical. Falls back to http://localhost:3000 on the template's own
// standalone build and during `next dev`, where SITE_URL is legitimately
// absent.
//
// Discriminator: TEMPLATE_VERSION is set by boatwork-dev/src/service/mini-site/
// provisioning.ts when it configures the mini-site's Vercel project env. Its
// presence is the signal that this build is a real contractor mini-site.
let warnedMissingSiteUrl = false;
export function requireSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url;
  const isProvisionedBuild = !!process.env.TEMPLATE_VERSION;
  if (isProvisionedBuild) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is required on provisioned mini-sites. TEMPLATE_VERSION is set but SITE_URL is missing — the Vercel project is misconfigured.',
    );
  }
  if (!warnedMissingSiteUrl) {
    // eslint-disable-next-line no-console
    console.warn('[config] NEXT_PUBLIC_SITE_URL is not set — using http://localhost:3000 (template build or local dev).');
    warnedMissingSiteUrl = true;
  }
  return 'http://localhost:3000';
}

export function getProfileSlug(): string {
  return bw().profileSlug || 'template';
}

export function getProfileId(): string {
  return bw().profileId || '';
}

export function getProfileUrl(): string {
  return bw().profileUrl || '';
}

export function getBoatworkLogoUrl(): string {
  return bw().logoUrl || '/boatwork-logo.svg';
}

export function getStaticReviews(): any[] {
  return bw().staticReviews || [];
}

/** Returns a normalized boatwork config object regardless of config shape. */
export function getBoatworkConfig(): Record<string, any> {
  const b = bw();
  return {
    profileSlug: b.profileSlug || 'template',
    profileId: b.profileId || '',
    profileUrl: b.profileUrl || '',
    logoUrl: b.logoUrl || '/boatwork-logo.svg',
    useLiveReviews: b.useLiveReviews || false,
    staticReviews: b.staticReviews || [],
  };
}
