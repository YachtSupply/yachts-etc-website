/**
 * Fetch and normalize a contractor profile from the Boatwork public API.
 *
 * Endpoint: GET /api/v1/public/contractors/{slug}
 * No auth required — public endpoint.
 *
 * Returns null on any failure so the site can fall back to static config.
 */

const BOATWORK_API = 'https://boatwork.co/api/v1';

// ---------- Public types ----------

export interface BoatworkReview {
  id: string | null;
  author: string;
  rating: number;
  text: string;
  date: string;
  isVerified: boolean;
  response: string | null;
  responseDate: string | null;
}

export interface BoatworkService {
  name: string;
  description: string | null;
}

export interface BoatworkPhoto {
  src: string;
  caption: string | null;
}

export interface BoatworkVideo {
  src: string;
  poster: string | null;
  caption: string | null;
}

export interface BoatworkSpecialty {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  benefits: string[];
  priceRange: string | null;
  typicalDuration: string | null;
  faqs: Array<{ question: string; answer: string }>;
}

export interface BoatworkBadge {
  id: string | null;
  name: string | null;
  token: string | null;
  badgeUrl: string | null;
  svgUrl: string | null;
  embedCode: string | null;
  pixelUrl: string | null;
  profileUrl: string;
  isVerified: boolean;
}

export interface BoatworkProfile {
  name: string;
  slug: string;
  tagline: string | null;
  /** @deprecated Use `badges` array instead. Kept for backwards compatibility. */
  badge: BoatworkBadge | null;
  badges: BoatworkBadge[];
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  rating: number | null;
  reviewCount: number;
  reviews: BoatworkReview[];
  services: BoatworkService[];
  photos: BoatworkPhoto[];
  videos: BoatworkVideo[];
  specialties: BoatworkSpecialty[];
  yearEstablished: number | null;
  serviceAreaRadius: number | null;
  serviceArea: string[];
  profileUrl: string;
  updatedAt: string;
  hoursOfOperation: Record<string, string> | null;
  websiteTheme: string | null;
  averageResponseTime: string | null;
  social: {
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    youtube: string | null;
  };
}

// ---------- Helpers ----------

function asString(val: unknown): string | null {
  return typeof val === 'string' && val.length > 0 ? val : null;
}

function asNumber(val: unknown): number | null {
  return typeof val === 'number' && !Number.isNaN(val) ? val : null;
}

function normalizeReview(raw: Record<string, unknown>): BoatworkReview | null {
  const author = asString(raw.author) ?? asString(raw.name);
  const rating = asNumber(raw.rating);
  const text = asString(raw.text) ?? asString(raw.body) ?? asString(raw.content);
  const date = asString(raw.date) ?? asString(raw.createdAt) ?? '';
  if (!author || rating === null || !text) return null;
  return {
    id: asString(raw.id),
    author,
    rating,
    text,
    date,
    isVerified: raw.isVerified === true || raw.verified === true,
    response: asString(raw.response) ?? asString(raw.contractorResponse),
    responseDate: asString(raw.responseDate) ?? asString(raw.respondedAt),
  };
}

function normalizeBadge(raw: Record<string, unknown>, slug: string): BoatworkBadge | null {
  const isVerified = raw.isVerified === true || raw.verified === true;
  const profileUrl = asString(raw.profileUrl) ?? `https://boatwork.co/pro/${slug}/`;
  if (!isVerified && !asString(raw.badgeUrl) && !asString(raw.svgUrl)) return null;
  return {
    id: asString(raw.id),
    name: asString(raw.name) ?? asString(raw.badgeName),
    token: asString(raw.token),
    badgeUrl: asString(raw.badgeUrl),
    svgUrl: asString(raw.svgUrl) ?? asString(raw.svg_url),
    embedCode: asString(raw.embedCode) ?? asString(raw.embed_code),
    pixelUrl: asString(raw.pixelUrl),
    profileUrl,
    isVerified,
  };
}

function normalizeService(raw: Record<string, unknown>): BoatworkService | null {
  const name = asString(raw.name) ?? asString(raw.title);
  if (!name) return null;
  return { name, description: asString(raw.description) };
}

function normalizePhoto(raw: Record<string, unknown>): BoatworkPhoto | null {
  const src =
    asString(raw.src) ??
    asString(raw.url) ??
    asString(raw.imageUrl) ??
    asString(raw.photoUrl) ??
    asString(raw.image) ??
    asString(raw.fileUrl);
  if (!src) return null;
  return { src, caption: asString(raw.caption) ?? asString(raw.title) };
}

function normalizeVideo(raw: Record<string, unknown>): BoatworkVideo | null {
  const src = asString(raw.src) ?? asString(raw.url) ?? asString(raw.videoUrl);
  if (!src) return null;
  return {
    src,
    poster: asString(raw.poster) ?? asString(raw.thumbnailUrl),
    caption: asString(raw.caption) ?? asString(raw.title),
  };
}

function safeArray<T>(arr: unknown, mapper: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => mapper(item as Record<string, unknown>)).filter(Boolean) as T[];
}

// ---------- Main fetch ----------

export async function fetchBoatworkProfile(slug: string, profileId?: string): Promise<BoatworkProfile | null> {
  try {
    const url = profileId
      ? `${BOATWORK_API}/public/contractors/by-id/${profileId}`
      : `${BOATWORK_API}/public/contractors/${slug}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const identifier = profileId ? `id "${profileId}"` : `slug "${slug}"`;
      console.warn(`[boatwork] API returned ${res.status} for ${identifier}`);
      return null;
    }

    const json = await res.json();
    // The API may wrap the profile in a `data` key or return it at the top level.
    const raw = (json?.data ?? json) as Record<string, unknown>;

    if (!raw || typeof raw !== 'object') return null;

    const reviews = safeArray(raw.reviews, normalizeReview);

    const profile: BoatworkProfile = {
      name: asString(raw.name) ?? asString(raw.businessName) ?? slug,
      slug,
      tagline: asString(raw.tagline),
      description: asString(raw.description) ?? asString(raw.about),
      phone: asString(raw.phone) ?? asString(raw.telephone),
      email: asString(raw.email),
      address: asString(raw.address) ?? asString(raw.location),
      city: asString(raw.city),
      state: asString(raw.state),
      logoUrl: asString(raw.logoUrl) ?? asString(raw.logo),
      coverImageUrl: asString(raw.coverImageUrl) ?? asString(raw.coverImage),
      isVerified: raw.isVerified === true || raw.verified === true,
      rating: asNumber(raw.rating) ?? asNumber(raw.averageRating),
      reviewCount: (asNumber(raw.reviewCount) ?? reviews.length) as number,
      reviews,
      services: safeArray(raw.services, normalizeService),
      photos: safeArray(raw.photos ?? raw.portfolio ?? raw.images ?? raw.gallery ?? raw.mediaItems, normalizePhoto),
      videos: safeArray(raw.videos, normalizeVideo),
      specialties: Array.isArray(raw.specialties)
        ? (raw.specialties as unknown[]).flatMap((s) => {
            if (typeof s === 'object' && s !== null) {
              const o = s as Record<string, unknown>;
              const name = asString(o.name);
              if (!name) return [];
              const faqsRaw = o.faqs;
              const faqs: Array<{ question: string; answer: string }> = [];
              if (Array.isArray(faqsRaw)) {
                for (const f of faqsRaw) {
                  if (typeof f === 'object' && f !== null) {
                    const fObj = f as Record<string, unknown>;
                    const q = asString(fObj.question) ?? asString(fObj.q);
                    const a = asString(fObj.answer) ?? asString(fObj.a);
                    if (q && a) faqs.push({ question: q, answer: a });
                  }
                }
              } else if (typeof faqsRaw === 'string') {
                try {
                  const parsed = JSON.parse(faqsRaw);
                  if (Array.isArray(parsed)) {
                    for (const f of parsed) {
                      if (f?.question && f?.answer) faqs.push({ question: f.question, answer: f.answer });
                    }
                  }
                } catch { /* ignore */ }
              }
              return [{
                id: asString(o.id) ?? '',
                name,
                slug: asString(o.slug) ?? '',
                shortDescription: asString(o.shortDescription),
                longDescription: asString(o.longDescription),
                benefits: Array.isArray(o.benefits)
                  ? (o.benefits as unknown[]).filter((b): b is string => typeof b === 'string')
                  : [],
                priceRange: asString(o.priceRange),
                typicalDuration: asString(o.typicalDuration),
                faqs,
              }];
            }
            return [];
          })
        : [],
      yearEstablished: asNumber(raw.yearEstablished) ?? asNumber(raw.year_established),
      serviceAreaRadius: asNumber(raw.serviceAreaRadius) ?? asNumber(raw.service_area_radius),
      serviceArea: (() => {
        if (Array.isArray(raw.serviceArea) && (raw.serviceArea as unknown[]).length > 0) {
          return (raw.serviceArea as unknown[]).filter((s): s is string => typeof s === 'string');
        }
        // API does not return serviceArea — generate a fallback from city/state
        const city = asString(raw.city);
        const state = asString(raw.state);
        if (city && state) return [`${city} area`, `${city}, ${state}`];
        if (city) return [`${city} area`];
        return [];
      })(),
      profileUrl: asString(raw.profileUrl) ?? `https://boatwork.co/pro/${slug}/`,
      updatedAt: asString(raw.updatedAt) ?? new Date().toISOString(),
      social: {
        facebook: asString((raw.social as Record<string, unknown>)?.facebook) ?? asString(raw.facebookUrl) ?? null,
        instagram: asString((raw.social as Record<string, unknown>)?.instagram) ?? asString(raw.instagramUrl) ?? null,
        linkedin: asString((raw.social as Record<string, unknown>)?.linkedin) ?? asString(raw.linkedinUrl) ?? null,
        youtube: asString((raw.social as Record<string, unknown>)?.youtube) ?? asString(raw.youtubeUrl) ?? null,
      },
      badges: (() => {
        // Support both `badges` array (ContractorBadge[]) and legacy single `badge` object
        const badgesArr = raw.badges ?? raw.contractorBadges;
        if (Array.isArray(badgesArr)) {
          return badgesArr
            .map((b) => (typeof b === 'object' && b !== null ? normalizeBadge(b as Record<string, unknown>, slug) : null))
            .filter((b): b is BoatworkBadge => b !== null);
        }
        const single = raw.badge as Record<string, unknown> | null | undefined;
        if (single && typeof single === 'object') {
          const b = normalizeBadge(single, slug);
          return b ? [b] : [];
        }
        return [];
      })(),
      badge: (() => {
        // Legacy single badge — first from badges array, or direct badge object
        const badgesArr = raw.badges ?? raw.contractorBadges;
        if (Array.isArray(badgesArr) && badgesArr.length > 0) {
          const first = badgesArr[0];
          if (typeof first === 'object' && first !== null) return normalizeBadge(first as Record<string, unknown>, slug);
        }
        const b = raw.badge as Record<string, unknown> | null | undefined;
        if (!b || typeof b !== 'object') return null;
        return normalizeBadge(b, slug);
      })(),
      hoursOfOperation: (() => {
        const h = raw.hoursOfOperation;
        if (!h) return null;
        if (typeof h === 'object') return h as Record<string, string>;
        if (typeof h === 'string') {
          try { return JSON.parse(h) as Record<string, string>; } catch { return null; }
        }
        return null;
      })(),
      averageResponseTime: asString(raw.averageResponseTime) ?? asString(raw.avgResponseTime),
      websiteTheme: asString(raw.websiteTheme),
    };

    return profile;
  } catch (err) {
    console.error('[boatwork] Failed to fetch profile:', err);
    return null;
  }
}
