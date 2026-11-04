import { NextRequest, NextResponse } from "next/server";

type SimilarArtist = {
  name: string;
  match: number;
  url: string;
  image: string;
};

type Recommendation = SimilarArtist & {
  score: number;
  recommendedBecause: string[];
  sourceCount: number;
  genreCompatibility: number;
  genres: string[];
};

type SavedArtistInput = {
  name: string;
  tags?: string[];
};

type ArtistInteraction = {
  name: string;
  action: "saved" | "dismissed" | "explored" | "unsaved" | "restored";
  timestamp: string;
};

type RecommendationSeed = {
  name: string;
  tags?: string[];
  type: "saved" | "explored";
  weight: number;
};

type ArtistCandidate = {
  name: string;
  url: string;
  image: string;
  matches: number[];
  weightedMatches: number[];
  savedSources: Set<string>;
  exploredSources: Set<string>;
};

type ScoredCandidate = {
  name: string;
  url: string;
  image: string;
  averageMatch: number;
  sourceCount: number;
  sources: string[];
  tags: string[];
  genreCompatibility: number;
  tasteCoverageScore: number;
  discoveryScore: number;
  baseScore: number;
};

const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

const MAX_SAVED_SEEDS = 10;
const MAX_EXPLORED_SEEDS = 5;
const MAX_SIMILAR_ARTISTS = 15;
const MAX_TAG_CANDIDATES = 30;
const MAX_RECOMMENDATIONS = 20;

const EXPLORE_HALF_LIFE_DAYS = 30;

function normaliseTag(tag: string): string {
  return tag.toLowerCase().trim();
}

function normaliseArtist(name: string): string {
  return name.toLowerCase().trim();
}

// Give recently explored artists more influence than older visits.
// The influence gradually decreases over a 30-day half-life.
function calculateRecencyWeight(timestamp: string): number {
  const interactionDate = new Date(timestamp).getTime();

  if (!Number.isFinite(interactionDate)) return 0;

  const ageInDays = Math.max(
    0,
    (Date.now() - interactionDate) / (1000 * 60 * 60 * 24),
  );

  const decay = Math.pow(0.5, ageInDays / EXPLORE_HALF_LIFE_DAYS);

  return 0.25 + decay * 0.5;
}

async function getArtistTags(
  artist: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      method: "artist.getTopTags",
      artist,
      api_key: apiKey,
      format: "json",
      autocorrect: "1",
    });

    const response = await fetch(`${LASTFM_API}?${params}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) return [];

    const data = await response.json();

    if (data.error || !data.toptags?.tag) return [];

    const tags = Array.isArray(data.toptags.tag)
      ? data.toptags.tag
      : [data.toptags.tag];

    return [
      ...new Set<string>(
        tags
          .filter(
            (tag: { name?: string }) =>
              typeof tag.name === "string" && tag.name.trim(),
          )
          .slice(0, 10)
          .map((tag: { name: string }) => normaliseTag(tag.name)),
      ),
    ];
  } catch {
    return [];
  }
}

function calculateGenreCompatibility(
  candidateTags: string[],
  userTags: Set<string>,
): number {
  if (userTags.size === 0) return 50;

  if (candidateTags.length === 0) return 0;

  const matchingTags = candidateTags.filter((tag) =>
    userTags.has(normaliseTag(tag)),
  );

  const denominator = Math.min(userTags.size, 5);

  return Math.min(100, Math.round((matchingTags.length / denominator) * 100));
}

function calculateDiscoveryScore(similarityScore: number): number {
  return Math.max(0, 100 - Math.abs(similarityScore - 60) * 2);
}

function calculateTagOverlap(
  firstTags: string[],
  secondTags: string[],
): number {
  if (firstTags.length === 0 || secondTags.length === 0) {
    return 0;
  }

  const first = new Set(firstTags.map(normaliseTag));
  const second = new Set(secondTags.map(normaliseTag));

  const intersection = [...first].filter((tag) => second.has(tag)).length;
  const union = new Set([...first, ...second]).size;

  return union === 0 ? 0 : intersection / union;
}

function rankWithDiversity(candidates: ScoredCandidate[]): Recommendation[] {
  const remaining = [...candidates];
  const selected: Recommendation[] = [];

  while (remaining.length > 0 && selected.length < MAX_RECOMMENDATIONS) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index];

      const highestOverlap = selected.reduce(
        (highest, selectedArtist) =>
          Math.max(
            highest,
            calculateTagOverlap(candidate.tags, selectedArtist.genres),
          ),
        0,
      );

      const diversityPenalty = highestOverlap * 15;
      const adjustedScore = candidate.baseScore - diversityPenalty;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestIndex = index;
      }
    }

    const candidate = remaining.splice(bestIndex, 1)[0];

    const selectedOverlap = selected.reduce(
      (highest, selectedArtist) =>
        Math.max(
          highest,
          calculateTagOverlap(candidate.tags, selectedArtist.genres),
        ),
      0,
    );

    const finalScore = Math.max(0, candidate.baseScore - selectedOverlap * 15);

    selected.push({
      name: candidate.name,
      url: candidate.url,
      image: candidate.image,
      match: candidate.averageMatch,
      score: Math.round(finalScore * 100) / 100,
      sourceCount: candidate.sourceCount,
      recommendedBecause: candidate.sources,
      genreCompatibility: candidate.genreCompatibility,
      genres: candidate.tags.slice(0, 5),
    });
  }

  return selected;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Last.fm API key is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json();

    const savedArtists: SavedArtistInput[] = body.savedArtists;

    const dismissedArtists: string[] = Array.isArray(body.dismissedArtists)
      ? body.dismissedArtists.filter(
          (name: unknown): name is string => typeof name === "string",
        )
      : [];

    const interactions: ArtistInteraction[] = Array.isArray(body.interactions)
      ? body.interactions.filter(
          (interaction: unknown): interaction is ArtistInteraction => {
            if (!interaction || typeof interaction !== "object") {
              return false;
            }

            const item = interaction as Record<string, unknown>;

            return (
              typeof item.name === "string" &&
              typeof item.timestamp === "string" &&
              item.action === "explored"
            );
          },
        )
      : [];

    if (
      !Array.isArray(savedArtists) ||
      savedArtists.length === 0 ||
      !savedArtists.every(
        (artist) =>
          artist &&
          typeof artist.name === "string" &&
          artist.name.trim().length > 0,
      )
    ) {
      return NextResponse.json(
        {
          recommendations: [],
          message: "Save some artists to get recommendations.",
        },
        { status: 200 },
      );
    }

    // 1. Build recommendation seeds from saved and explored artists.
    const savedSeeds: RecommendationSeed[] = savedArtists
      .slice(0, MAX_SAVED_SEEDS)
      .map((artist) => ({
        name: artist.name,
        tags: artist.tags,
        type: "saved",
        weight: 1,
      }));

    const excludedSeedNames = new Set([
      ...savedArtists.map((artist) => normaliseArtist(artist.name)),
      ...dismissedArtists.map(normaliseArtist),
    ]);

    // Keep only the most recent exploration for each artist.
    const recentExplorations = new Map<string, ArtistInteraction>();

    for (const interaction of interactions) {
      const key = normaliseArtist(interaction.name);

      if (!key || excludedSeedNames.has(key)) continue;

      const existing = recentExplorations.get(key);

      if (
        !existing ||
        new Date(interaction.timestamp).getTime() >
          new Date(existing.timestamp).getTime()
      ) {
        recentExplorations.set(key, interaction);
      }
    }

    const exploredSeeds: RecommendationSeed[] = Array.from(
      recentExplorations.values(),
    )
      .filter((interaction) =>
        Number.isFinite(new Date(interaction.timestamp).getTime()),
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, MAX_EXPLORED_SEEDS)
      .map((interaction) => ({
        name: interaction.name,
        type: "explored",
        weight: calculateRecencyWeight(interaction.timestamp),
      }));

    const artistSeeds = [...savedSeeds, ...exploredSeeds];

    // 2. Retrieve similar artists for each seed.
    const results = await Promise.all(
      artistSeeds.map(async (artist) => {
        try {
          const params = new URLSearchParams({
            method: "artist.getSimilar",
            artist: artist.name,
            api_key: apiKey,
            format: "json",
            limit: String(MAX_SIMILAR_ARTISTS),
            autocorrect: "1",
          });

          const response = await fetch(`${LASTFM_API}?${params}`, {
            next: { revalidate: 3600 },
          });

          if (!response.ok) return [];

          const data = await response.json();

          if (data.error || !data.similarartists?.artist) {
            return [];
          }

          const similar = Array.isArray(data.similarartists.artist)
            ? data.similarartists.artist
            : [data.similarartists.artist];

          return similar
            .filter(
              (item: { name?: string }) =>
                typeof item.name === "string" && item.name.trim(),
            )
            .map((item: any) => ({
              name: item.name,
              match: Number(item.match) || 0,
              url: item.url || "",
              image:
                item.image?.find((image: any) => image.size === "extralarge")?.[
                  "#text"
                ] || "",
              sourceArtist: artist.name,
              sourceType: artist.type,
              sourceWeight: artist.weight,
            }));
        } catch (error) {
          console.error(
            `Unable to find similar artists for ${artist.name}:`,
            error,
          );

          return [];
        }
      }),
    );

    const allSimilarArtists = results.flat();

    // 3. Exclude saved and dismissed artists from recommendations.
    const excludedNames = new Set([
      ...savedArtists.map((artist) => normaliseArtist(artist.name)),
      ...dismissedArtists.map(normaliseArtist),
    ]);

    // 4. Group duplicate recommendations and retain source behaviour.
    const grouped = new Map<string, ArtistCandidate>();

    for (const artist of allSimilarArtists) {
      const key = normaliseArtist(artist.name);

      if (!key || excludedNames.has(key)) continue;

      const existing = grouped.get(key);

      if (existing) {
        existing.matches.push(artist.match);
        existing.weightedMatches.push(artist.match * artist.sourceWeight);

        if (artist.sourceType === "saved") {
          existing.savedSources.add(artist.sourceArtist);
        } else {
          existing.exploredSources.add(artist.sourceArtist);
        }

        if (!existing.image && artist.image) {
          existing.image = artist.image;
        }

        if (!existing.url && artist.url) {
          existing.url = artist.url;
        }
      } else {
        grouped.set(key, {
          name: artist.name,
          url: artist.url,
          image: artist.image,
          matches: [artist.match],
          weightedMatches: [artist.match * artist.sourceWeight],
          savedSources: new Set(
            artist.sourceType === "saved" ? [artist.sourceArtist] : [],
          ),
          exploredSources: new Set(
            artist.sourceType === "explored" ? [artist.sourceArtist] : [],
          ),
        });
      }
    }

    // 5. Build the user's genre profile from saved artists.
    // Explored artists influence discovery, but do not automatically
    // become permanent genre preferences.
    const seedTags = await Promise.all(
      savedSeeds.map(async (artist) => {
        const savedTags = Array.isArray(artist.tags)
          ? artist.tags
              .filter((tag) => typeof tag === "string")
              .map(normaliseTag)
              .filter(Boolean)
          : [];

        if (savedTags.length > 0) {
          return savedTags;
        }

        return getArtistTags(artist.name, apiKey);
      }),
    );

    const userTagSet = new Set(seedTags.flat().filter(Boolean));

    // 6. Calculate preliminary scores.
    const preliminary = Array.from(grouped.values())
      .map((artist) => {
        const totalWeight =
          artist.savedSources.size +
          artist.weightedMatches.reduce(
            (total, value, index) =>
              total +
              (artist.matches[index] > 0 ? value / artist.matches[index] : 0),
            0,
          );

        const weightedAverage =
          artist.weightedMatches.reduce((total, value) => total + value, 0) /
          Math.max(
            artist.weightedMatches.reduce(
              (total, value, index) =>
                total +
                (artist.matches[index] > 0 ? value / artist.matches[index] : 0),
              0,
            ),
            0.001,
          );

        const similarityScore = weightedAverage * 100;

        const savedSourceCount = artist.savedSources.size;
        const exploredSourceCount = artist.exploredSources.size;

        const tasteCoverageScore =
          Math.min(
            (savedSourceCount + exploredSourceCount * 0.5) /
              Math.max(savedSeeds.length, 1),
            1,
          ) * 100;

        const discoveryScore = calculateDiscoveryScore(similarityScore);

        const preliminaryScore =
          similarityScore * 0.5 +
          tasteCoverageScore * 0.2 +
          discoveryScore * 0.15;

        return {
          ...artist,
          averageMatch: similarityScore,
          sourceCount: savedSourceCount + exploredSourceCount,
          preliminaryScore,
          totalWeight,
        };
      })
      .sort((a, b) => b.preliminaryScore - a.preliminaryScore)
      .slice(0, MAX_TAG_CANDIDATES);

    // 7. Retrieve genre tags for the strongest candidates.
    const candidatesWithTags = await Promise.all(
      preliminary.map(async (artist) => {
        const tags = await getArtistTags(artist.name, apiKey);

        return {
          ...artist,
          tags,
        };
      }),
    );

    // 8. Calculate final recommendation scores.
    const scoredCandidates: ScoredCandidate[] = candidatesWithTags.map(
      (artist) => {
        const similarityScore = artist.averageMatch;

        const savedCoverage =
          Math.min(
            artist.savedSources.size / Math.max(savedSeeds.length, 1),
            1,
          ) * 100;

        const exploredCoverage =
          Math.min(
            artist.exploredSources.size / Math.max(exploredSeeds.length, 1),
            1,
          ) * 100;

        // Saved artists have stronger influence than explored artists.
        const tasteCoverageScore =
          savedCoverage * 0.75 + exploredCoverage * 0.25;

        const genreCompatibility = calculateGenreCompatibility(
          artist.tags,
          userTagSet,
        );

        const discoveryScore = calculateDiscoveryScore(similarityScore);

        const baseScore =
          similarityScore * 0.5 +
          tasteCoverageScore * 0.15 +
          genreCompatibility * 0.2 +
          discoveryScore * 0.15;

        const sources = [...artist.savedSources, ...artist.exploredSources];

        return {
          name: artist.name,
          url: artist.url,
          image: artist.image,
          averageMatch: similarityScore,
          sourceCount: artist.sourceCount,
          sources,
          tags: artist.tags,
          genreCompatibility,
          tasteCoverageScore,
          discoveryScore,
          baseScore,
        };
      },
    );

    // 9. Select recommendations while encouraging variety.
    const recommendations = rankWithDiversity(scoredCandidates);

    return NextResponse.json({
      recommendations,
      seedCount: artistSeeds.length,
      savedSeedCount: savedSeeds.length,
      exploredSeedCount: exploredSeeds.length,
      genreProfile: [...userTagSet],
    });
  } catch (error) {
    console.error("Recommendation API error:", error);

    return NextResponse.json(
      { error: "Unable to generate recommendations." },
      { status: 500 },
    );
  }
}
