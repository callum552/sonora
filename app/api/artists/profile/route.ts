type LastFmImage = {
  "#text": string;
  size: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();

    if (!name) {
      return Response.json(
        { error: "Please provide an artist name." },
        { status: 400 },
      );
    }

    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Music search is not configured." },
        { status: 500 },
      );
    }

    // Build a reusable Last.fm request
    async function lastFmRequest(method: string) {
      const params = new URLSearchParams();

      params.set("method", method);
      params.set("artist", name!);
      params.set("api_key", apiKey!);
      params.set("format", "json");

      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
        {
          headers: {
            "User-Agent": "SONORA/1.0",
          },
          next: { revalidate: 3600 },
        },
      );

      if (!response.ok) {
        throw new Error("Last.fm request failed.");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Last.fm API error.");
      }

      return data;
    }

    // Fetch artist information and similar artists together
    const [infoData, similarData] = await Promise.all([
      lastFmRequest("artist.getInfo"),
      lastFmRequest("artist.getSimilar"),
    ]);

    const artist = infoData.artist;

    if (!artist) {
      return Response.json({ error: "Artist not found." }, { status: 404 });
    }

    const tags = artist.tags?.tag ?? [];
    const similarArtists = similarData.similarartists?.artist ?? [];

    const profile = {
      name: artist.name,
      mbid: artist.mbid,
      url: artist.url,
      image:
        artist.image
          ?.slice()
          .reverse()
          .find(
            (img: LastFmImage) =>
              img["#text"] && img["#text"].startsWith("https://"),
          )?.["#text"] || "",
      listeners: Number(artist.stats?.listeners ?? 0),
      playcount: Number(artist.stats?.playcount ?? 0),
      biography: artist.bio?.summary ?? "",
      tags: Array.isArray(tags)
        ? tags.map((tag: { name: string }) => tag.name)
        : tags.name
          ? [tags.name]
          : [],
      similarArtists: similarArtists
        .slice(0, 8)
        .map(
          (similar: {
            name: string;
            match: string;
            image?: LastFmImage[];
          }) => ({
            name: similar.name,
            match: Number(similar.match),
            image:
              similar.image?.find((img) => img.size === "large")?.["#text"] ||
              "",
          }),
        ),
    };

    return Response.json(profile);
  } catch (error) {
    console.error("Artist profile error:", error);

    return Response.json(
      { error: "Unable to load this artist profile." },
      { status: 500 },
    );
  }
}
