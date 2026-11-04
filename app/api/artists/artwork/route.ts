type CommonsMetadata = {
  value?: string;
};

type CommonsImageInfo = {
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: {
    Artist?: CommonsMetadata;
    Credit?: CommonsMetadata;
    LicenseShortName?: CommonsMetadata;
    LicenseUrl?: CommonsMetadata;
  };
};

type CommonsPage = {
  title: string;
  index: number;
  imageinfo?: CommonsImageInfo[];
};

function cleanMetadata(value?: string) {
  return (
    value
      ?.replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim() || ""
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get("artist")?.trim();

    if (!artist) {
      return Response.json(
        { error: "Please provide an artist name." },
        { status: 400 },
      );
    }

    if (artist.length > 100) {
      return Response.json(
        { error: "Search term is too long." },
        { status: 400 },
      );
    }

    // Build the Wikimedia Commons search
    const params = new URLSearchParams();

    params.set("action", "query");
    params.set("generator", "search");
    params.set("gsrsearch", `${artist} band filetype:bitmap`);
    params.set("gsrnamespace", "6");
    params.set("gsrlimit", "10");
    params.set("prop", "imageinfo");
    params.set("iiprop", "url|extmetadata");
    params.set("iiurlwidth", "1400");
    params.set(
      "iiextmetadatafilter",
      "Artist|Credit|LicenseShortName|LicenseUrl",
    );
    params.set("format", "json");

    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
      {
        headers: {
          "User-Agent": "SONORA/1.0 (music discovery project)",
        },
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      throw new Error("Wikimedia Commons request failed.");
    }

    const data = await response.json();

    const pages: CommonsPage[] = Object.values(
      data.query?.pages ?? {},
    ) as CommonsPage[];

    // Find the first result with a usable image URL
    const imagePage = pages
      .sort((a, b) => a.index - b.index)
      .find((page) => {
        const image = page.imageinfo?.[0]?.thumburl;

        return image && image.startsWith("https://");
      });

    if (!imagePage) {
      return Response.json(
        { error: "No suitable artist artwork was found." },
        { status: 404 },
      );
    }

    const imageInfo = imagePage.imageinfo![0];
    const metadata = imageInfo.extmetadata ?? {};

    const artwork = {
      artist,
      title: imagePage.title,
      image: imageInfo.thumburl,
      source: imageInfo.descriptionurl,
      creator: cleanMetadata(metadata.Artist?.value),
      credit: cleanMetadata(metadata.Credit?.value),
      license: cleanMetadata(metadata.LicenseShortName?.value),
      licenseUrl: metadata.LicenseUrl?.value || "",
    };

    return Response.json(artwork);
  } catch (error) {
    console.error("Artist artwork error:", error);

    return Response.json(
      { error: "Unable to retrieve artist artwork." },
      { status: 500 },
    );
  }
}
