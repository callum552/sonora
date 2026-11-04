"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Music2, Trash2, Loader2, ArrowUpRight } from "lucide-react";

import Sidebar from "@/app/components/layout/sidebar";
import Header from "@/app/components/layout/header";

import {
  getSavedArtists,
  removeSavedArtist,
  type SavedArtist,
} from "@/app/lib/library";

type ArtistArtwork = {
  image: string;
  source: string;
  credit: string;
  license: string;
  licenseUrl: string;
};

export default function LibraryPage() {
  const [artists, setArtists] = useState<SavedArtist[]>([]);
  const [artwork, setArtwork] = useState<Record<string, ArtistArtwork>>({});
  const [loadingArtwork, setLoadingArtwork] = useState(false);

  // Load saved artists and listen for library changes.
  useEffect(() => {
    function loadLibrary() {
      setArtists(getSavedArtists());
    }

    loadLibrary();

    window.addEventListener("sonora-library-updated", loadLibrary);

    return () => {
      window.removeEventListener("sonora-library-updated", loadLibrary);
    };
  }, []);

  // Retrieve proper artist photography for saved artists.
  useEffect(() => {
    let cancelled = false;

    async function loadArtwork() {
      if (artists.length === 0) {
        setArtwork({});
        return;
      }

      setLoadingArtwork(true);

      const results = await Promise.all(
        artists.map(async (artist) => {
          try {
            const response = await fetch(
              `/api/artists/artwork?artist=${encodeURIComponent(artist.name)}`,
            );

            if (!response.ok) return null;

            const data = await response.json();

            if (!data.image) return null;

            return {
              name: artist.name,
              artwork: {
                image: data.image,
                source: data.source || "",
                credit: data.credit || "",
                license: data.license || "",
                licenseUrl: data.licenseUrl || "",
              },
            };
          } catch (error) {
            console.error(`Unable to load artwork for ${artist.name}:`, error);

            return null;
          }
        }),
      );

      if (!cancelled) {
        const updatedArtwork: Record<string, ArtistArtwork> = {};

        results.forEach((result) => {
          if (result) {
            updatedArtwork[result.name.toLowerCase()] = result.artwork;
          }
        });

        setArtwork(updatedArtwork);
        setLoadingArtwork(false);
      }
    }

    loadArtwork();

    return () => {
      cancelled = true;
    };
  }, [artists]);

  function handleRemove(name: string) {
    removeSavedArtist(name);

    setArtists(getSavedArtists());

    setArtwork((current) => {
      const updated = { ...current };
      delete updated[name.toLowerCase()];
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#F5F2ED]">
      <Sidebar />

      {/* Main content */}
      <div className="min-h-screen md:pl-64">
        <div className="sticky top-0 z-50">
          <Header />
        </div>

        <main className="mx-auto max-w-7xl px-6 py-10">
          {/* Page heading */}
          <div className="mb-10">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-[#D6A45D]">
              Your collection
            </p>

            <h1 className="text-4xl font-semibold tracking-tight">
              Your Library
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              All the artists you've discovered and saved.
            </p>
          </div>

          {/* Library count */}
          <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <Bookmark size={18} className="text-[#D6A45D]" />

              <span className="text-sm text-neutral-300">Saved artists</span>
            </div>

            <span className="text-sm text-neutral-500">
              {artists.length} {artists.length === 1 ? "artist" : "artists"}
            </span>
          </div>

          {/* Empty state */}
          {artists.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#D6A45D]/10">
                <Music2 size={28} className="text-[#D6A45D]" />
              </div>

              <h2 className="text-xl font-medium">Your library is waiting.</h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
                Discover artists you love and save them here to build your
                personal music collection.
              </p>

              <Link
                href="/explore"
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#D6A45D] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e4b775]"
              >
                Discover artists
                <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              {/* Artwork loading indicator */}
              {loadingArtwork && (
                <div className="mb-5 flex items-center gap-2 text-xs text-neutral-500">
                  <Loader2 size={14} className="animate-spin text-[#D6A45D]" />
                  Updating artist artwork...
                </div>
              )}

              {/* Saved artist grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {artists.map((artist) => {
                  const artistArtwork = artwork[artist.name.toLowerCase()];

                  const image = artistArtwork?.image || artist.image;

                  return (
                    <div
                      key={artist.name}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-[#D6A45D]/40"
                    >
                      <Link
                        href={`/artists/${encodeURIComponent(artist.name)}`}
                        className="block"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#1A1A1A]">
                          {image ? (
                            <img
                              src={image}
                              alt={`${artist.name} artwork`}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Music2 size={36} className="text-neutral-600" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/artists/${encodeURIComponent(artist.name)}`}
                            className="min-w-0 flex-1"
                          >
                            <h2 className="truncate font-medium text-[#F5F2ED] transition hover:text-[#D6A45D]">
                              {artist.name}
                            </h2>

                            <p className="mt-1 text-xs text-neutral-500">
                              {artist.tags.slice(0, 2).join(" · ") || "Artist"}
                            </p>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleRemove(artist.name)}
                            aria-label={`Remove ${artist.name} from library`}
                            title="Remove from library"
                            className="rounded-lg p-2 text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <p className="mt-4 text-xs text-neutral-500">
                          {artist.listeners.toLocaleString()} Last.fm listeners
                        </p>

                        {/* Artwork attribution */}
                        {artistArtwork?.source && (
                          <div className="mt-3 border-t border-white/5 pt-3">
                            <p className="text-[10px] leading-4 text-neutral-600">
                              Image:{" "}
                              {artistArtwork.credit || "Wikimedia Commons"}
                              {artistArtwork.license &&
                                ` · ${artistArtwork.license}`}
                            </p>

                            <div className="mt-1 flex gap-3">
                              <a
                                href={artistArtwork.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-neutral-500 underline transition hover:text-[#D6A45D]"
                              >
                                Source
                              </a>

                              {artistArtwork.licenseUrl && (
                                <a
                                  href={artistArtwork.licenseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-neutral-500 underline transition hover:text-[#D6A45D]"
                                >
                                  Licence
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
