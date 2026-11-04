"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  ArrowUpRight,
  Music2,
  Bookmark,
  BookmarkCheck,
  X,
} from "lucide-react";

import {
  getSavedArtists,
  isArtistSaved,
  saveArtist,
  removeSavedArtist,
  getDismissedArtists,
  dismissArtist,
  getArtistInteractions,
  type SavedArtist,
} from "@/app/lib/library";

type Recommendation = {
  name: string;
  url: string;
  image: string;
  match: number;
  score: number;
  sourceCount: number;
  recommendedBecause: string[];
  genreCompatibility: number;
  genres: string[];
  artworkCredit?: string;
  artworkSource?: string;
  artworkLicense?: string;
  artworkLicenseUrl?: string;
};

type ArtworkResponse = {
  image?: string;
  source?: string;
  creator?: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
};

export default function ForYou() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [dismissedNames, setDismissedNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    function syncSavedNames() {
      setSavedNames(
        getSavedArtists().map((artist) => artist.name.toLowerCase()),
      );
    }

    function syncDismissedNames() {
      setDismissedNames(
        getDismissedArtists().map((artist) => artist.toLowerCase()),
      );
    }

    async function loadRecommendations() {
      const savedArtists: SavedArtist[] = getSavedArtists();
      const dismissedArtists = getDismissedArtists();
      const interactions = getArtistInteractions();

      syncSavedNames();
      syncDismissedNames();

      if (savedArtists.length === 0) {
        setRecommendations([]);
        setLoading(false);
        setError("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            savedArtists,
            dismissedArtists,
            interactions,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load recommendations.");
        }

        if (cancelled) return;

        // Retrieve artist photography from Wikimedia.
        const artistsWithArtwork = await Promise.all(
          (data.recommendations || []).map(async (artist: Recommendation) => {
            try {
              const artworkResponse = await fetch(
                `/api/artists/artwork?artist=${encodeURIComponent(
                  artist.name,
                )}`,
              );

              if (!artworkResponse.ok) {
                return artist;
              }

              const artwork = (await artworkResponse.json()) as ArtworkResponse;

              if (!artwork.image) {
                return artist;
              }

              return {
                ...artist,
                image: artwork.image,
                artworkCredit: artwork.credit || artwork.creator || "",
                artworkSource: artwork.source || "",
                artworkLicense: artwork.license || "",
                artworkLicenseUrl: artwork.licenseUrl || "",
              };
            } catch (err) {
              console.error(`Artwork unavailable for ${artist.name}:`, err);

              return artist;
            }
          }),
        );

        if (!cancelled) {
          setRecommendations(artistsWithArtwork);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();

    function handleLibraryUpdate() {
      syncSavedNames();
      loadRecommendations();
    }

    function handleDismissedUpdate() {
      syncDismissedNames();
      loadRecommendations();
    }

    function handleFeedbackUpdate() {
      loadRecommendations();
    }

    window.addEventListener("sonora-library-updated", handleLibraryUpdate);

    window.addEventListener("sonora-dismissed-updated", handleDismissedUpdate);

    window.addEventListener("sonora-feedback-updated", handleFeedbackUpdate);

    return () => {
      cancelled = true;

      window.removeEventListener("sonora-library-updated", handleLibraryUpdate);

      window.removeEventListener(
        "sonora-dismissed-updated",
        handleDismissedUpdate,
      );

      window.removeEventListener(
        "sonora-feedback-updated",
        handleFeedbackUpdate,
      );
    };
  }, []);

  function handleSaveArtist(artist: Recommendation) {
    if (isArtistSaved(artist.name)) {
      removeSavedArtist(artist.name);
    } else {
      const savedArtist: SavedArtist = {
        name: artist.name,
        mbid: "",
        url: artist.url || "",
        image: artist.image || "",
        listeners: 0,
        playcount: 0,
        biography: `Discovered through SONORA. Similar to ${artist.recommendedBecause.join(", ")}.`,
        tags: artist.genres || [],
        savedAt: new Date().toISOString(),
      };

      saveArtist(savedArtist);
    }

    setSavedNames(getSavedArtists().map((item) => item.name.toLowerCase()));
  }

  function handleDismissArtist(name: string) {
    dismissArtist(name);

    setDismissedNames((current) =>
      current.includes(name.toLowerCase())
        ? current
        : [...current, name.toLowerCase()],
    );
  }

  const visibleRecommendations = recommendations.filter(
    (artist) => !dismissedNames.includes(artist.name.toLowerCase()),
  );

  return (
    <section className="mt-12">
      {/* Section heading */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={17} className="text-[#D6A45D]" />

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            Personalised for you
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-[#F5F2ED]">
          Your next discoveries
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Music recommendations shaped by your taste and listening activity.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 py-12 text-neutral-400">
          <Loader2 className="animate-spin text-[#D6A45D]" size={20} />

          <span className="text-sm">
            Finding your next favourite artists...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* No saved artists */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Music2 size={28} className="mx-auto mb-4 text-[#D6A45D]" />

          <h3 className="text-lg font-medium text-[#F5F2ED]">
            Your discoveries start here
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
            Save a few favourite artists to your Library and we'll start finding
            music that fits your taste.
          </p>

          <Link
            href="/library"
            className="mt-5 inline-flex text-sm font-medium text-[#D6A45D] hover:text-[#E8BC80]"
          >
            Visit your Library
            <ArrowUpRight size={15} className="ml-1" />
          </Link>
        </div>
      )}

      {/* All recommendations dismissed */}
      {!loading &&
        !error &&
        recommendations.length > 0 &&
        visibleRecommendations.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <Music2 size={28} className="mx-auto mb-4 text-[#D6A45D]" />

            <h3 className="text-lg font-medium text-[#F5F2ED]">
              That's everything for now
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              You've dismissed all your current recommendations. Try saving some
              more artists to discover something new.
            </p>

            <Link
              href="/library"
              className="mt-5 inline-flex text-sm font-medium text-[#D6A45D] hover:text-[#E8BC80]"
            >
              Visit your Library
              <ArrowUpRight size={15} className="ml-1" />
            </Link>
          </div>
        )}

      {/* Recommendation cards */}
      {!loading && !error && visibleRecommendations.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleRecommendations.map((artist) => {
            const isSaved = savedNames.includes(artist.name.toLowerCase());

            return (
              <div
                key={artist.name}
                className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-[#D6A45D]/40 hover:bg-white/[0.04]"
              >
                {/* Artist profile link */}
                <Link
                  href={`/artists/${encodeURIComponent(artist.name)}`}
                  className="block"
                >
                  {/* Artist artwork */}
                  <div className="relative aspect-square overflow-hidden bg-[#1A1A1A]">
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={`${artist.name} artwork`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Music2 size={32} className="text-neutral-600" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] text-[#E4B875] backdrop-blur">
                      {Math.round(artist.match)}% similar
                    </span>
                  </div>

                  {/* Artist information */}
                  <div className="p-4">
                    <h3 className="truncate text-sm font-semibold text-[#F5F2ED]">
                      {artist.name}
                    </h3>

                    <p className="mt-1 text-xs text-neutral-500">
                      Similar to {artist.recommendedBecause.join(", ")}
                    </p>

                    {/* Genre compatibility */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                          Genre match
                        </span>

                        <span className="text-xs font-medium text-[#D6A45D]">
                          {Math.round(artist.genreCompatibility ?? 0)}%
                        </span>
                      </div>

                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#D6A45D] transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, artist.genreCompatibility ?? 0),
                            )}%`,
                          }}
                        />
                      </div>

                      {/* Genre tags */}
                      {artist.genres?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {artist.genres.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-neutral-400"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Save and dismiss controls */}
                <div className="space-y-2 px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => handleSaveArtist(artist)}
                    aria-label={
                      isSaved
                        ? `Remove ${artist.name} from Library`
                        : `Save ${artist.name} to Library`
                    }
                    aria-pressed={isSaved}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      isSaved
                        ? "border-[#D6A45D]/40 bg-[#D6A45D]/10 text-[#D6A45D]"
                        : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-[#D6A45D]/40 hover:text-[#D6A45D]"
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck size={15} />
                        Saved to Library
                      </>
                    ) : (
                      <>
                        <Bookmark size={15} />
                        Save to Library
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismissArtist(artist.name)}
                    aria-label={`Dismiss ${artist.name}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-500 transition hover:bg-white/[0.04] hover:text-neutral-300"
                  >
                    <X size={14} />
                    Dismiss
                  </button>
                </div>

                {/* Artwork attribution */}
                {artist.artworkCredit && (
                  <div className="px-4 pb-3">
                    <p className="text-[10px] leading-4 text-neutral-600">
                      Photo: {artist.artworkCredit}
                      {artist.artworkLicense && ` · ${artist.artworkLicense}`}
                    </p>

                    <div className="mt-1 flex gap-3">
                      {artist.artworkSource && (
                        <a
                          href={artist.artworkSource}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#D6A45D] hover:underline"
                        >
                          Image source
                        </a>
                      )}

                      {artist.artworkLicenseUrl && (
                        <a
                          href={artist.artworkLicenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-neutral-500 hover:text-[#D6A45D] hover:underline"
                        >
                          Licence
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
