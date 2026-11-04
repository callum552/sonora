import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.LASTFM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Last.fm API key is not configured." },
        { status: 500 },
      );
    }

    const params = new URLSearchParams({
      method: "chart.getTopArtists",
      api_key: apiKey,
      format: "json",
      limit: "12",
    });

    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?${params}`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve trending artists.");
    }

    const data = await response.json();

    if (data.error || !data.artists?.artist) {
      throw new Error("Last.fm returned no trending artists.");
    }

    const results = Array.isArray(data.artists.artist)
      ? data.artists.artist
      : [data.artists.artist];

    const artists = results.map((artist: any) => ({
      name: artist.name,
      url: artist.url || "",
      mbid: artist.mbid || "",
      listeners: Number(artist.listeners) || 0,
      image:
        artist.image?.find((image: any) => image.size === "extralarge")?.[
          "#text"
        ] || "",
    }));

    return NextResponse.json({ artists });
  } catch (error) {
    console.error("Trending artists API error:", error);

    return NextResponse.json(
      { error: "Unable to load trending artists." },
      { status: 500 },
    );
  }
}
