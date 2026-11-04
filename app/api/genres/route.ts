import { NextResponse } from "next/server";

type GenreDefinition = {
  name: string;
  family: string;
  description: string;
};

const genreCatalogue: GenreDefinition[] = [
  // Alternative
  {
    name: "indie rock",
    family: "Alternative",
    description: "Independent guitar music and alternative sounds.",
  },
  {
    name: "indie pop",
    family: "Alternative",
    description: "Melodic pop with an independent edge.",
  },
  {
    name: "post-punk",
    family: "Alternative",
    description: "Angular guitars, driving rhythms and experimental sounds.",
  },
  {
    name: "shoegaze",
    family: "Alternative",
    description: "Atmospheric guitars and immersive soundscapes.",
  },
  {
    name: "dream pop",
    family: "Alternative",
    description: "Ethereal vocals and dreamy textures.",
  },
  {
    name: "grunge",
    family: "Alternative",
    description: "Raw guitars and alternative rock.",
  },
  {
    name: "alternative rock",
    family: "Alternative",
    description: "A broad world of alternative guitar music.",
  },

  // Electronic
  {
    name: "house",
    family: "Electronic",
    description: "Rhythmic electronic music built for the dancefloor.",
  },
  {
    name: "techno",
    family: "Electronic",
    description: "Driving electronic beats and hypnotic rhythms.",
  },
  {
    name: "ambient",
    family: "Electronic",
    description: "Atmospheric music and evolving textures.",
  },
  {
    name: "drum and bass",
    family: "Electronic",
    description: "Fast breakbeats and deep basslines.",
  },
  {
    name: "uk garage",
    family: "Electronic",
    description: "Syncopated rhythms and distinctive British dance music.",
  },
  {
    name: "trance",
    family: "Electronic",
    description: "Melodic builds and expansive electronic sounds.",
  },
  {
    name: "electronica",
    family: "Electronic",
    description: "Experimental and alternative electronic music.",
  },

  // Hip-hop
  {
    name: "hip-hop",
    family: "Hip-hop",
    description: "Rhythm, lyricism and musical expression.",
  },
  {
    name: "alternative hip-hop",
    family: "Hip-hop",
    description: "Creative approaches beyond mainstream rap.",
  },
  {
    name: "boom bap",
    family: "Hip-hop",
    description: "Classic hip-hop production and sampled beats.",
  },
  {
    name: "trap",
    family: "Hip-hop",
    description: "Heavy bass, sharp percussion and modern rap.",
  },
  {
    name: "grime",
    family: "Hip-hop",
    description: "Fast-paced British MC culture and electronic beats.",
  },

  // Jazz
  {
    name: "jazz",
    family: "Jazz",
    description: "Improvisation, expression and timeless musicianship.",
  },
  {
    name: "bebop",
    family: "Jazz",
    description: "Fast tempos and intricate improvisation.",
  },
  {
    name: "jazz fusion",
    family: "Jazz",
    description: "Jazz mixed with rock, funk and electronic influences.",
  },
  {
    name: "contemporary jazz",
    family: "Jazz",
    description: "Modern interpretations of jazz.",
  },
  {
    name: "smooth jazz",
    family: "Jazz",
    description: "Relaxed melodies and accessible jazz arrangements.",
  },

  // Soul and R&B
  {
    name: "soul",
    family: "Soul & R&B",
    description: "Expressive vocals and rich musical arrangements.",
  },
  {
    name: "rnb",
    family: "Soul & R&B",
    description: "Rhythm and blues, from classic to contemporary.",
  },
  {
    name: "neo soul",
    family: "Soul & R&B",
    description: "Soulful vocals with modern production.",
  },
  {
    name: "funk",
    family: "Soul & R&B",
    description: "Groove-driven rhythms and infectious basslines.",
  },
  {
    name: "motown",
    family: "Soul & R&B",
    description: "Classic soul and influential Motown sounds.",
  },

  // Rock and Metal
  {
    name: "classic rock",
    family: "Rock & Metal",
    description: "Influential rock music from across generations.",
  },
  {
    name: "progressive rock",
    family: "Rock & Metal",
    description: "Ambitious arrangements and experimental structures.",
  },
  {
    name: "heavy metal",
    family: "Rock & Metal",
    description: "Powerful riffs and heavy instrumentation.",
  },
  {
    name: "indie metal",
    family: "Rock & Metal",
    description: "Independent and alternative heavy music.",
  },
  {
    name: "punk rock",
    family: "Rock & Metal",
    description: "Energetic, direct and rebellious guitar music.",
  },

  // Folk and Country
  {
    name: "folk",
    family: "Folk & Country",
    description: "Storytelling and traditional acoustic sounds.",
  },
  {
    name: "indie folk",
    family: "Folk & Country",
    description: "Contemporary songwriting with folk influences.",
  },
  {
    name: "country",
    family: "Folk & Country",
    description: "Songwriting rooted in American country traditions.",
  },
  {
    name: "americana",
    family: "Folk & Country",
    description: "A blend of folk, country, blues and roots music.",
  },

  // Pop
  {
    name: "pop",
    family: "Pop",
    description: "Melody-driven music across styles and generations.",
  },
  {
    name: "synthpop",
    family: "Pop",
    description: "Synthesizers, electronic textures and pop melodies.",
  },
  {
    name: "art pop",
    family: "Pop",
    description: "Experimental ideas within an accessible pop framework.",
  },
];

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
      method: "tag.getTopTags",
      api_key: apiKey,
      format: "json",
    });

    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?${params}`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve genre popularity data.");
    }

    const data = await response.json();

    if (data.error) {
      throw new Error("Last.fm returned an error.");
    }

    const rawTags = data.toptags?.tag || [];

    const tags = Array.isArray(rawTags) ? rawTags : [rawTags];

    const popularity = new Map<string, number>();

    for (const tag of tags) {
      if (tag.name) {
        popularity.set(String(tag.name).toLowerCase(), Number(tag.count) || 0);
      }
    }

    const genres = genreCatalogue.map((genre, index) => ({
      id: genre.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: genre.name,
      family: genre.family,
      description: genre.description,
      count: popularity.get(genre.name.toLowerCase()) || 0,
      url: `https://www.last.fm/tag/${encodeURIComponent(genre.name)}`,
      order: index,
    }));

    return NextResponse.json({
      genres,
      families: [...new Set(genreCatalogue.map((genre) => genre.family))],
      total: genres.length,
    });
  } catch (error) {
    console.error("Genres API error:", error);

    return NextResponse.json(
      { error: "Unable to load music genres." },
      { status: 500 },
    );
  }
}
