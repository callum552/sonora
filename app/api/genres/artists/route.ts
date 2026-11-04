import { NextRequest, NextResponse } from "next/server";

type LastFmArtist = {
  name: string;
  url?: string;
  mbid?: string;
  listeners?: string | number;
  match?: string | number;
  image?: {
    size: string;
    "#text": string;
  }[];
};

type Artist = {
  name: string;
  url: string;
  image: string;
  listeners: number;
  mbid: string;
  category: "established" | "discovery" | "related";
  reason: string;
  match?: number;
};

type RelatedArtistEntry = {
  artist: LastFmArtist;
  matches: number;
  totalMatch: number;
  averageMatch: number;
  seedNames: Set<string>;
};

function mapArtist(
  artist: LastFmArtist,
  category: Artist["category"],
  reason: string,
  match?: number,
): Artist {
  return {
    name: artist.name,
    url: artist.url || "",
    image:
      artist.image?.find((image) => image.size === "extralarge")?.["#text"] ||
      artist.image?.find((image) => image.size === "large")?.["#text"] ||
      "",
    listeners: Number(artist.listeners) || 0,
    mbid: artist.mbid || "",
    category,
    reason,
    match,
  };
}

function normaliseName(name: string) {
  return name.trim().toLowerCase();
}

function getArtistKey(artist: LastFmArtist) {
  return artist.mbid?.trim()
    ? artist.mbid.trim().toLowerCase()
    : normaliseName(artist.name);
}

async function lastFmRequest(params: Record<string, string>, apiKey: string) {
  const searchParams = new URLSearchParams({
    ...params,
    api_key: apiKey,
    format: "json",
  });

  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?${searchParams}`,
    { next: { revalidate: 3600 } },
  );

  if (!response.ok) {
    throw new Error("Last.fm request failed.");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm returned an error.");
  }

  return data;
}

function getMedian(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Last.fm API key is not configured." },
        { status: 500 },
      );
    }

    const tag = request.nextUrl.searchParams.get("tag")?.trim();

    if (!tag) {
      return NextResponse.json(
        { error: "A genre tag is required." },
        { status: 400 },
      );
    }

    // 1. Retrieve the most popular artists associated with this genre.
    const genreData = await lastFmRequest(
      {
        method: "tag.getTopArtists",
        tag,
        limit: "50",
      },
      apiKey,
    );

    const rawArtists = genreData.topartists?.artist || [];

    const results: LastFmArtist[] = Array.isArray(rawArtists)
      ? rawArtists
      : [rawArtists];

    const validArtists = results.filter((artist) => artist.name);

    if (validArtists.length === 0) {
      return NextResponse.json({
        genre: tag,
        artists: [],
        established: [],
        discoveries: [],
        related: [],
        total: 0,
      });
    }

    // 2. Split the genre chart into established and lesser-known artists.
    const sortedByPopularity = [...validArtists].sort(
      (a, b) => (Number(b.listeners) || 0) - (Number(a.listeners) || 0),
    );

    const splitIndex = Math.max(1, Math.ceil(sortedByPopularity.length * 0.4));

    const establishedRaw = sortedByPopularity.slice(0, splitIndex);

    const established = establishedRaw
      .slice(0, 12)
      .map((artist) =>
        mapArtist(
          artist,
          "established",
          `One of the most listened-to artists associated with ${tag}.`,
        ),
      );

    // Use the genre chart's listener distribution as a popularity baseline.
    const genreListenerCounts = validArtists
      .map((artist) => Number(artist.listeners) || 0)
      .filter((listeners) => listeners > 0);

    const medianListeners = getMedian(genreListenerCounts);

    // 3. Find artists connected to established artists in this genre.
    const seedArtists = establishedRaw.slice(0, 5);

    const similarResponses = await Promise.all(
      seedArtists.map(async (artist) => {
        try {
          const data = await lastFmRequest(
            {
              method: "artist.getSimilar",
              artist: artist.name,
              limit: "30",
            },
            apiKey,
          );

          const similar = data.similarartists?.artist || [];

          return {
            seedName: artist.name,
            artists: Array.isArray(similar) ? similar : [similar],
          };
        } catch (error) {
          console.error(
            `Unable to find similar artists for ${artist.name}:`,
            error,
          );

          return {
            seedName: artist.name,
            artists: [],
          };
        }
      }),
    );

    // 4. Aggregate connections and similarity scores.
    const relatedMap = new Map<string, RelatedArtistEntry>();

    const genreArtistKeys = new Set(
      validArtists.map((artist) => getArtistKey(artist)),
    );

    similarResponses.forEach(({ seedName, artists }) => {
      artists.forEach((artist) => {
        if (!artist.name) return;

        const key = getArtistKey(artist);

        // Don't recommend artists already present in the genre chart.
        if (genreArtistKeys.has(key)) return;

        const similarity = Number(artist.match) || 0;
        const existing = relatedMap.get(key);

        if (existing) {
          existing.matches += 1;
          existing.totalMatch += similarity;
          existing.averageMatch = existing.totalMatch / existing.matches;
          existing.seedNames.add(seedName);
        } else {
          relatedMap.set(key, {
            artist,
            matches: 1,
            totalMatch: similarity,
            averageMatch: similarity,
            seedNames: new Set([seedName]),
          });
        }
      });
    });

    const candidates = Array.from(relatedMap.values());

    // 5. Find Hidden Gems.
    // Prioritise artists with multiple connections and fewer listeners.
    // The listener threshold is relative to this genre's chart, not a
    // universal definition of an emerging or underground artist.
    const hiddenGemCandidates = candidates
      .filter(({ artist }) => {
        const listeners = Number(artist.listeners) || 0;

        return (
          listeners > 0 && medianListeners > 0 && listeners < medianListeners
        );
      })
      .sort((a, b) => {
        // First prioritise connections to multiple established artists.
        if (b.matches !== a.matches) {
          return b.matches - a.matches;
        }

        // Then favour artists with fewer listeners.
        const aListeners = Number(a.artist.listeners) || 0;
        const bListeners = Number(b.artist.listeners) || 0;

        if (aListeners !== bListeners) {
          return aListeners - bListeners;
        }

        // Finally, favour stronger similarity.
        return b.averageMatch - a.averageMatch;
      });

    const discoveries = hiddenGemCandidates
      .slice(0, 12)
      .map(({ artist, matches, averageMatch, seedNames }) => {
        const connectionText =
          matches > 1
            ? `Connected to ${matches} established ${tag} artists, including ${Array.from(
                seedNames,
              )
                .slice(0, 2)
                .join(" and ")}.`
            : `A lesser-known artist connected to ${
                Array.from(seedNames)[0]
              }, with fewer listeners than the typical ${tag} chart artist.`;

        return mapArtist(
          artist,
          "discovery",
          connectionText,
          Math.round(averageMatch * 100),
        );
      });

    // 6. Build the Related Artists section from the strongest
    // remaining connections, excluding Hidden Gems already selected.
    const discoveryKeys = new Set(
      discoveries.map((artist) => normaliseName(artist.name)),
    );

    const related = candidates
      .filter(({ artist }) => !discoveryKeys.has(normaliseName(artist.name)))
      .sort((a, b) => {
        if (b.matches !== a.matches) {
          return b.matches - a.matches;
        }

        return b.averageMatch - a.averageMatch;
      })
      .slice(0, 12)
      .map(({ artist, matches, averageMatch }) =>
        mapArtist(
          artist,
          "related",
          matches > 1
            ? `Similar to ${matches} established artists associated with ${tag}.`
            : `Related to established artists in the ${tag} genre.`,
          Math.round(averageMatch * 100),
        ),
      );

    // 7. Fallback: if Last.fm doesn't return suitable hidden gems,
    // use lesser-listened artists from the genre chart.
    if (discoveries.length === 0) {
      const establishedKeys = new Set(
        established.map((artist) => normaliseName(artist.name)),
      );

      const fallbackDiscoveries = sortedByPopularity
        .filter((artist) => {
          const listeners = Number(artist.listeners) || 0;

          return (
            !establishedKeys.has(normaliseName(artist.name)) && listeners > 0
          );
        })
        .sort((a, b) => (Number(a.listeners) || 0) - (Number(b.listeners) || 0))
        .slice(0, 12)
        .map((artist) =>
          mapArtist(
            artist,
            "discovery",
            `A lesser-listened-to artist featured in the ${tag} genre chart.`,
          ),
        );

      discoveries.push(...fallbackDiscoveries);
    }

    // Preserve the original artists property for existing consumers.
    const artists = [...established, ...discoveries, ...related];

    return NextResponse.json({
      genre: tag,
      artists,
      established,
      discoveries,
      related,
      total: artists.length,
    });
  } catch (error) {
    console.error("Genre artists API error:", error);

    return NextResponse.json(
      { error: "Unable to load genre artists." },
      { status: 500 },
    );
  }
}
