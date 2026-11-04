type LastFmImage = {
  "#text": string;
  size: string;
};

type LastFmArtist = {
  name: string;
  listeners: string;
  mbid: string;
  url: string;
  image: LastFmImage[];
};

export async function GET(request: Request) {
  try {
    // 1. Read the search term from the URL
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    // 2. Validate the search term
    if (!query) {
      return Response.json(
        { error: "Please provide an artist name." },
        { status: 400 },
      );
    }

    if (query.length > 100) {
      return Response.json(
        { error: "Search term is too long." },
        { status: 400 },
      );
    }

    // 3. Check that the API key exists
    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
      console.error("LASTFM_API_KEY is missing.");
      return Response.json(
        { error: "Music search is not configured." },
        { status: 500 },
      );
    }

    // 4. Build the Last.fm API request
    const params = new URLSearchParams({
      method: "artist.search",
      artist: query,
      api_key: apiKey,
      format: "json",
      limit: "10",
    });

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

    // Last.fm can return API errors even with HTTP 200
    if (data.error) {
      console.error("Last.fm API error:", data.message);
      return Response.json(
        { error: "Last.fm could not complete the search." },
        { status: 502 },
      );
    }

    // 5. Extract and format the artist results
    const artists: LastFmArtist[] = data.results?.artistmatches?.artist ?? [];

    const formattedArtists = artists.map((artist) => ({
      name: artist.name,
      listeners: Number(artist.listeners),
      mbid: artist.mbid,
      url: artist.url,
      image:
        artist.image?.find((img) => img.size === "large")?.["#text"] ||
        artist.image?.find((img) => img.size === "medium")?.["#text"] ||
        "",
    }));

    // 6. Return the results to SONORA
    return Response.json({
      query,
      results: formattedArtists,
    });
  } catch (error) {
    console.error("Artist search failed:", error);

    return Response.json(
      { error: "Something went wrong while searching for artists." },
      { status: 500 },
    );
  }
}
