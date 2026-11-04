"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Music2 } from "lucide-react";

type ArtistArtwork = {
  image: string;
  source: string;
  creator: string;
  credit: string;
  license: string;
  licenseUrl: string;
};

export default function FeaturedDiscovery() {
  const artistName = "Fontaines D.C.";
  const artistUrl = `/artists/${encodeURIComponent(artistName)}`;

  const [artwork, setArtwork] = useState<ArtistArtwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadArtwork() {
      try {
        const response = await fetch(
          `/api/artists/artwork?artist=${encodeURIComponent(artistName)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Unable to load featured artwork.");
        }

        const data = await response.json();

        if (!controller.signal.aborted && data.image) {
          setArtwork(data);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Featured artwork error:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadArtwork();

    return () => controller.abort();
  }, []);

  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={17} className="text-[#D6A45D]" />

        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
          Featured discovery
        </h2>
      </div>

      <div className="group relative isolate flex min-h-[420px] items-end overflow-hidden rounded-2xl border border-white/10 bg-[#201B18]">
        {/* Featured artist artwork */}
        {artwork?.image ? (
          <img
            src={artwork.image}
            alt={`${artistName} artist photography`}
            className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-[#38291D] via-[#201B18] to-[#101010]">
            <Music2 size={70} className="text-white/10" />
          </div>
        )}

        {/* Background overlays */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/55 to-black/10" />

        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Featured artist content */}
        <div className="relative z-10 max-w-2xl p-8 md:p-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6A45D]/30 bg-black/30 px-3 py-2 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#D6A45D]" />

            <span className="text-xs uppercase tracking-widest text-[#E4B875]">
              Handpicked discovery
            </span>
          </div>

          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[#D6A45D]">
            Post-punk · Alternative rock
          </p>

          <Link
            href={artistUrl}
            className="inline-block transition hover:text-[#E4B875]"
          >
            <h3 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Fontaines
              <br />
              D.C.
            </h3>
          </Link>

          <p className="mt-5 max-w-lg text-sm leading-7 text-white/70 md:text-base">
            Raw energy, poetic storytelling and a distinctive alternative sound.
            A discovery for listeners who appreciate music with character.
          </p>

          <Link
            href={artistUrl}
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[#D6A45D] px-6 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#E8BC80]"
          >
            Explore artist
            <ArrowUpRight size={17} />
          </Link>
        </div>

        {/* Featured badge */}
        <div className="pointer-events-none absolute right-7 top-7 z-10 hidden rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs text-white/80 backdrop-blur md:block">
          SONORA SELECTS / 001
        </div>

        {/* Artwork loading indicator */}
        {loading && (
          <div className="absolute right-7 bottom-7 z-10 text-xs text-white/50">
            Loading artwork...
          </div>
        )}
      </div>

      {/* Artwork attribution */}
      {artwork?.image && artwork.source && (
        <div className="mt-3 text-right text-[10px] text-neutral-600">
          Photo: {artwork.creator || artwork.credit || "Wikimedia Commons"}
          {artwork.license && ` · ${artwork.license}`}
          {" · "}
          <a
            href={artwork.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-[#D6A45D]"
          >
            Image source
          </a>
          {artwork.licenseUrl && (
            <>
              {" · "}
              <a
                href={artwork.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition hover:text-[#D6A45D]"
              >
                Licence
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
