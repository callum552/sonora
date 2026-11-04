"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Headphones,
  Users,
  Music2,
  Disc3,
} from "lucide-react";

import Sidebar from "@/app/components/layout/sidebar";
import Header from "@/app/components/layout/header";
import { recordArtistExplore } from "@/app/lib/library";

// Last.fm artist profile
type ArtistProfile = {
  name: string;
  mbid: string;
  url: string;
  image: string;
  listeners: number;
  playcount: number;
  biography: string;
  tags: string[];
  similarArtists: {
    name: string;
    match: number;
    image: string;
  }[];
};

// Wikimedia artwork
type ArtistArtwork = {
  artist: string;
  title: string;
  image: string;
  source: string;
  creator: string;
  credit: string;
  license: string;
  licenseUrl: string;
};

type SimilarArtistArtwork = Record<string, ArtistArtwork | null>;

function ArtistPageContent() {
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name);
  const lastRecordedName = useRef("");

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [artwork, setArtwork] = useState<ArtistArtwork | null>(null);
  const [similarArtwork, setSimilarArtwork] = useState<SimilarArtistArtwork>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch artwork for one artist
  async function fetchArtwork(
    artistName: string,
    signal: AbortSignal,
  ): Promise<ArtistArtwork | null> {
    try {
      const response = await fetch(
        `/api/artists/artwork?artist=${encodeURIComponent(artistName)}`,
        { signal },
      );

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as ArtistArtwork;
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error(`Artwork unavailable for ${artistName}:`, err);
      }

      return null;
    }
  }

  // Load artist profile and artwork
  useEffect(() => {
    const controller = new AbortController();

    async function loadArtist() {
      setLoading(true);
      setError("");

      setArtist(null);
      setArtwork(null);
      setSimilarArtwork({});

      try {
        // 1. Fetch artist profile from Last.fm
        const response = await fetch(
          `/api/artists/profile?name=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load artist.");
        }

        if (controller.signal.aborted) return;

        setArtist(data);
        setLoading(false);

        // 2. Fetch main artist artwork
        const mainArtwork = await fetchArtwork(name, controller.signal);

        if (controller.signal.aborted) return;

        setArtwork(mainArtwork);

        // 3. Fetch similar artist artwork in parallel
        const similarResults = await Promise.all(
          (data.similarArtists ?? []).map(
            async (similar: ArtistProfile["similarArtists"][number]) => {
              const result = await fetchArtwork(
                similar.name,
                controller.signal,
              );

              return [similar.name, result] as const;
            },
          ),
        );

        if (controller.signal.aborted) return;

        setSimilarArtwork(Object.fromEntries(similarResults));
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadArtist();

    return () => controller.abort();
  }, [name]);

  // Record when the user successfully opens an artist profile.
  useEffect(() => {
    if (!artist) return;

    const artistName = artist.name.trim().toLowerCase();

    // Prevent duplicate records during React re-renders.
    if (lastRecordedName.current === artistName) return;

    lastRecordedName.current = artistName;

    recordArtistExplore(artist.name);
  }, [artist]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0C]">
        <Sidebar />

        <div className="min-h-screen md:pl-64">
          <Header />

          <main className="flex min-h-[70vh] items-center justify-center">
            <div className="text-center">
              <Disc3
                className="mx-auto mb-4 animate-spin text-[#D6A45D]"
                size={32}
              />

              <p className="text-sm text-neutral-400">Discovering artist...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !artist) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] text-[#F5F2ED]">
        <Sidebar />

        <div className="min-h-screen md:pl-64">
          <Header />

          <main className="px-8 py-12">
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Discover
            </Link>

            <h1 className="text-3xl font-semibold">Artist not found</h1>

            <p className="mt-3 text-neutral-400">
              {error || "We couldn't find this artist."}
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#F5F2ED]">
      <Sidebar />

      <div className="min-h-screen md:pl-64">
        <Header />

        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Back navigation */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Discover
            </Link>
          </div>

          {/* Artist hero */}
          <section className="relative flex min-h-[420px] items-end overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
            {artwork?.image ? (
              <img
                src={artwork.image}
                alt={`${artist.name} artist photography`}
                className="absolute inset-0 z-0 h-full w-full object-cover opacity-70"
                onError={() => setArtwork(null)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Music2 size={64} className="text-neutral-700" />
              </div>
            )}

            {/* Hero gradient */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0C0C0C] via-black/40 to-black/10" />

            {/* Artist details */}
            <div className="relative z-10 max-w-3xl px-8 pb-10 pt-24 md:px-12">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-[#D6A45D]">
                Artist discovery
              </p>

              <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
                {artist.name}
              </h1>

              {/* Artist tags */}
              <div className="mt-6 flex flex-wrap gap-3">
                {artist.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs text-neutral-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <a
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#D6A45D] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e4b775]"
              >
                View on Last.fm
                <ExternalLink size={15} />
              </a>
            </div>
          </section>

          {/* Main artwork attribution */}
          {artwork && (
            <div className="mt-3 text-right text-xs text-neutral-500">
              <span>
                Photo:{" "}
                {artwork.creator || artwork.credit || "Wikimedia Commons"}
              </span>

              {artwork.license && <span> · {artwork.license}</span>}

              {artwork.source && (
                <span>
                  {" · "}
                  <a
                    href={artwork.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline transition hover:text-[#D6A45D]"
                  >
                    Image source
                  </a>
                </span>
              )}

              {artwork.licenseUrl && (
                <span>
                  {" · "}
                  <a
                    href={artwork.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline transition hover:text-[#D6A45D]"
                  >
                    Licence details
                  </a>
                </span>
              )}
            </div>
          )}

          {/* Artist statistics */}
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center gap-3 text-neutral-400">
                <Users size={18} />
                <span className="text-sm">Listeners</span>
              </div>

              <p className="text-3xl font-semibold">
                {artist.listeners.toLocaleString()}
              </p>

              <p className="mt-2 text-xs text-neutral-500">Last.fm listeners</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center gap-3 text-neutral-400">
                <Headphones size={18} />
                <span className="text-sm">Total plays</span>
              </div>

              <p className="text-3xl font-semibold">
                {artist.playcount.toLocaleString()}
              </p>

              <p className="mt-2 text-xs text-neutral-500">
                Last.fm play count
              </p>
            </div>
          </section>

          {/* Biography */}
          <section className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <Music2 size={19} className="text-[#D6A45D]" />

              <h2 className="text-xl font-medium">About the artist</h2>
            </div>

            <p className="max-w-4xl text-sm leading-8 text-neutral-400">
              {artist.biography
                ? artist.biography.replace(/<[^>]*>/g, "")
                : "No artist biography is currently available."}
            </p>
          </section>

          {/* Similar artists */}
          <section className="mb-16 mt-14">
            <div className="mb-6">
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[#D6A45D]">
                Keep exploring
              </p>

              <h2 className="text-2xl font-semibold">Similar artists</h2>

              <p className="mt-2 text-sm text-neutral-500">
                Artists you might want to discover next.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {artist.similarArtists.map((similar) => {
                const similarImage = similarArtwork[similar.name];

                return (
                  <div
                    key={similar.name}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-[#D6A45D]/50 hover:bg-white/[0.06]"
                  >
                    {/* Artist card link */}
                    <Link
                      href={`/artists/${encodeURIComponent(similar.name)}`}
                      className="block"
                    >
                      {/* Similar artist image */}
                      <div className="aspect-square overflow-hidden bg-[#1A1A1A]">
                        {similarImage?.image ? (
                          <img
                            src={similarImage.image}
                            alt={`${similar.name} artist photography`}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Music2 size={32} className="text-neutral-600" />
                          </div>
                        )}
                      </div>

                      {/* Similar artist information */}
                      <div className="p-4">
                        <h3 className="font-medium text-[#F5F2ED] transition group-hover:text-[#D6A45D]">
                          {similar.name}
                        </h3>

                        <p className="mt-2 text-xs text-neutral-500">
                          Similarity score: {(similar.match * 100).toFixed(0)}%
                        </p>
                      </div>
                    </Link>

                    {/* Artwork attribution - outside artist link */}
                    {similarImage && (
                      <div className="px-4 pb-4">
                        <p className="text-[10px] leading-4 text-neutral-500">
                          Photo:{" "}
                          {similarImage.creator ||
                            similarImage.credit ||
                            "Wikimedia Commons"}
                          {similarImage.license && (
                            <> · {similarImage.license}</>
                          )}
                        </p>

                        <div className="mt-2 flex gap-3">
                          {similarImage.source && (
                            <a
                              href={similarImage.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-neutral-500 underline transition hover:text-[#D6A45D]"
                            >
                              Image source
                            </a>
                          )}

                          {similarImage.licenseUrl && (
                            <a
                              href={similarImage.licenseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-neutral-500 underline transition hover:text-[#D6A45D]"
                            >
                              Licence details
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/10 py-6 text-xs text-neutral-600">
            SONORA — Find your next favourite.
          </footer>
        </main>
      </div>
    </div>
  );
}

// Suspense wrapper for Next.js
export default function ArtistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0C0C0C]">
          <Sidebar />

          <div className="min-h-screen md:pl-64">
            <Header />

            <main className="flex min-h-[70vh] items-center justify-center">
              <p className="text-sm text-neutral-400">
                Loading artist profile...
              </p>
            </main>
          </div>
        </div>
      }
    >
      <ArtistPageContent />
    </Suspense>
  );
}
