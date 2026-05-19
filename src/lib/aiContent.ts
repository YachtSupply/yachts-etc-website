/**
 * AI-generated content loader.
 *
 * The actual AI generation happens in scripts/generate-content.mjs,
 * which runs before the Vercel build and writes src/data/generated-content.json.
 *
 * At build/runtime, this module just reads that static JSON file.
 * No Anthropic SDK, no API calls, no ANTHROPIC_API_KEY needed here.
 */

import fs from 'fs';
import path from 'path';
import type { BoatworkProfile } from './boatwork';

// ---------- Public types ----------

export interface ReviewSynopsisData {
  aggregateRating: number;        // 1-5 scale, one decimal
  totalReviewCount: number;       // Sum of all sources
  boatworkReviewCount: number;
  googleReviewCount: number;
  summary: string;                // AI-generated 2-3 sentences
  keywords: string[];             // 5-8 service/quality tags
  sources: ('boatwork' | 'google')[];
}

export interface ParkedSimilarContractor {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  primarySpecialty: string | null;
  profileUrl: string;
}

// SEO-DUP-7b: when this block is present with `isActive: true`, the template
// renders a "this site is no longer available" landing instead of the normal
// homepage, and layout.tsx flips to robots: { index: false }. Written by
// boatwork-dev's parkContractor helper when a subscription ends.
export interface ParkedBlock {
  isActive: true;
  message: string;
  parkedAt: string;
  similarContractors: ParkedSimilarContractor[];
  profileUrl: string;
}

// KAN-779 — first-person, contractor-voice content blocks produced by the M2
// pipeline on boatwork-dev and merged into generated-content.json by the
// provisioning + refresh-dirty-content paths. Keyed by the same slugs the
// content generator uses (specialty slug, city slug).
export interface SubdomainContentBlock {
  headline?: string;
  body: string;
}

export interface GeneratedContent {
  tagline: string;               // Only used as fallback if profile.tagline is null
  about: string;                 // Enriched about text — voice-preserving + SEO
  seoTitle: string;              // "{Name} | {Primary Service} {City}, {State}"
  seoDescription: string;        // 150-160 chars, city + service keywords + CTA
  seoKeywords: string[];         // 6-8 "[service] [city]" patterns
  serviceDescriptions: Record<string, string>;  // Per-specialty 1-3 sentence descriptions
  serviceAreaDescription: string;  // Coverage copy from counties/radius
  commonProjects: string[];      // Bullet items derived from specialties
  serviceAreaLocalities: string[];  // AI-generated locality names within service radius
  serviceAreaTitle?: string;     // Dynamic section title based on business type
  serviceKeywords: Record<string, string[]>;  // Per-service bullet keywords
  reviewSynopsis?: ReviewSynopsisData;  // AI-synthesized review summary (optional - only if reviews exist)
  parked?: ParkedBlock;          // SEO-DUP-7b: optional — only present when the contractor's subscription has ended
  // KAN-779 — surface-specific content the M2 pipeline writes onto the
  // contractor record. Null when generation hasn't run for this contractor
  // yet; the template falls back to existing fields/templates in that case.
  subdomainHeroText?: string | null;
  subdomainServiceDetails?: Record<string, SubdomainContentBlock> | null;
  subdomainCityContent?: Record<string, SubdomainContentBlock> | null;
  marketplaceAboutText?: string | null;
}

interface CachedContent {
  updatedAt: string;
  specialtiesKey?: string;
  servicesKey?: string;
  contentVersion?: string;
  content: GeneratedContent;
}

// ---------- Fallback content (used in local dev only — see generateSiteContent) ----------

// SEO-DUP-9: this fallback used to copy profile.description verbatim, which is
// the same text the marketplace /pro/[slug]/ page renders. That's a silent
// duplicate-content violation. The fallback now uses a structural placeholder
// that never overlaps with marketplace copy. In production this code path
// isn't reached — generateSiteContent throws when generated-content.json is
// missing.
export function buildFallbackContent(profile: BoatworkProfile): GeneratedContent {
  const city = profile.city ?? 'Fort Lauderdale';
  const state = profile.state ?? 'FL';
  const primaryService = profile.specialties[0]?.name ?? profile.services[0]?.name ?? 'Yacht Management';

  return {
    tagline: 'Where Luxury Meets Meticulous Care',
    about: `Professional marine services in ${city}, ${state}. Site content is being generated — please check back shortly.`,
    seoTitle: `${profile.name} | ${primaryService} ${city}, ${state}`,
    seoDescription: `${profile.name} provides expert ${primaryService.toLowerCase()} and marine services in ${city}, ${state}. Trusted by yacht owners across South Florida.`,
    seoKeywords: [
      `${primaryService.toLowerCase()} ${city}`,
      `marine services ${city}`,
      `yacht maintenance ${city}`,
      `boat repair ${city}`,
      `yacht management ${state}`,
    ],
    serviceDescriptions: Object.fromEntries(
      (profile.services.length > 0 ? profile.services : profile.specialties).map((s) => {
        const sp = profile.specialties.find((sp) => sp.name === s.name);
        return [
          s.name,
          sp?.longDescription ?? sp?.shortDescription ?? ('description' in s ? s.description : null) ?? `${profile.name} offers professional ${s.name.toLowerCase()} services in ${city}, ${state}.`,
        ];
      }),
    ),
    serviceAreaDescription: profile.serviceArea.length > 0
      ? `Serving yacht owners across ${profile.serviceArea.join(', ')}.`
      : `Based in ${city}, serving the greater South Florida yachting community.`,
    commonProjects: [],
    serviceAreaLocalities: [],
    serviceKeywords: {},
  };
}

// ---------- Main export ----------

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'generated-content.json');

/**
 * Loads AI-generated content from src/data/generated-content.json.
 * That file is written by scripts/generate-content.mjs before the build.
 * Falls back to static content derived from the profile if the file is missing.
 */
export async function generateSiteContent(profile: BoatworkProfile): Promise<GeneratedContent> {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
      const cached = JSON.parse(raw) as CachedContent;
      if (cached?.content) {
        if (!Array.isArray(cached.content.commonProjects)) {
          cached.content.commonProjects = [];
        }
        if (!Array.isArray(cached.content.serviceAreaLocalities)) {
          cached.content.serviceAreaLocalities = [];
        }
        if (!cached.content.serviceKeywords || typeof cached.content.serviceKeywords !== 'object') {
          cached.content.serviceKeywords = {};
        }
        return cached.content;
      }
    }
  } catch {
    // Fall through to error/fallback
  }

  // SEO-DUP-9: on a *provisioned* mini-site, refuse to render without the
  // generated-content.json that provisioning commits. TEMPLATE_VERSION is set
  // only on provisioned Vercel projects (see boatwork-dev provisioning step 5).
  // On the template's own standalone build / local dev, fall through to the
  // non-overlapping structural fallback below.
  if (process.env.TEMPLATE_VERSION) {
    throw new Error(
      '[aiContent] generated-content.json is missing or invalid on a provisioned mini-site. This file is committed by provisioning before the Vercel build; its absence indicates a failed or incomplete provision. Refusing to render to avoid shipping placeholder copy.',
    );
  }

  console.warn('[aiContent] generated-content.json not found or invalid — using fallback (template build or local dev). Run scripts/generate-content.mjs before building.');
  return buildFallbackContent(profile);
}
