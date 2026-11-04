"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Music2,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Compass,
  Sparkles,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

import Sidebar from "@/app/components/layout/sidebar";
import Header from "@/app/components/layout/header";

import {
  getSavedArtists,
  isArtistSaved,
  saveArtist,
  removeSavedArtist,
  type SavedArtist,
} from "@/app/lib/library";

type Genre = {
  id: string;
  name: string;
  family: string;
  description: string;
  count: number;
  url: string;
  order: number;
};

type GenreArtist = {
  name: string;
  url: string;
  image: string;
  listeners: number;
  mbid: string;
  category: "established" | "discovery" | "related";
  reason: string;
  match?: number;
};

type TrendingArtist = {
  name: string;
  url: string;
  mbid: string;
  listeners: number;
  image: string;
};

const RECENT_GENRES_KEY = "sonora-recent-genres";

const familyDescriptions: Record<string, string> = {
  Alternative:
    "Independent voices, experimental guitars and sounds beyond the mainstream.",
  Electronic:
    "From underground dance music to atmospheric electronic experimentation.",
  "Hip-hop":
    "Rhythm, lyricism, production and the sounds shaping modern culture.",
  Jazz: "Improvisation, expression and music that constantly reinvents itself.",
  "Soul & R&B": "Expressive vocals, rich grooves and timeless songwriting.",
  "Rock & Metal":
    "Powerful guitars, distinctive sounds and generations of rock music.",
  "Folk & Country":
    "Storytelling, acoustic instrumentation and roots-inspired songwriting.",
  Pop: "Melodies, creative production and music that crosses boundaries.",
};

export default function ExplorePage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [artists, setArtists] = useState<GenreArtist[]>([]);
  const [savedNames, setSavedNames] = useState<string[]>([]);

  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [error, setError] = useState("");

  const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [recentGenres, setRecentGenres] = useState<string[]>([]);
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([
    "Alternative",
    "Electronic",
  ]);

  // Load genres, trending artists, saved artists and recent genres.
  useEffect(() => {
    let cancelled = false;

    async function loadGenres() {
      try {
        setLoadingGenres(true);

        const response = await fetch("/api/genres");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load genres.");
        }

        if (!cancelled) {
          setGenres(data.genres || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load genres.",
          );
        }
      } finally {
        if (!cancelled) setLoadingGenres(false);
      }
    }

    async function loadTrendingArtists() {
      try {
        setLoadingTrending(true);

        const response = await fetch("/api/artists/trending");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load trending artists.");
        }

        if (!cancelled) {
          setTrendingArtists(data.artists || []);
        }
      } catch (err) {
        console.error("Unable to load trending artists:", err);
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }
    }

    function syncSavedNames() {
      setSavedNames(
        getSavedArtists().map((artist) => artist.name.toLowerCase()),
      );
    }

    function loadRecentGenres() {
      try {
        const stored = localStorage.getItem(RECENT_GENRES_KEY);

        if (stored) {
          const parsed = JSON.parse(stored);

          if (!cancelled && Array.isArray(parsed)) {
            setRecentGenres(parsed);
          }
        }
      } catch {
        if (!cancelled) setRecentGenres([]);
      }
    }

    loadGenres();
    loadTrendingArtists();
    syncSavedNames();
    loadRecentGenres();

    window.addEventListener("sonora-library-updated", syncSavedNames);

    return () => {
      cancelled = true;
      window.removeEventListener("sonora-library-updated", syncSavedNames);
    };
  }, []);

  // Search across genre names, families and descriptions.
  const filteredGenres = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return genres;

    return genres.filter(
      (genre) =>
        genre.name.toLowerCase().includes(query) ||
        genre.family.toLowerCase().includes(query) ||
        genre.description.toLowerCase().includes(query),
    );
  }, [genres, search]);

  // Organise genres into families.
  const genreFamilies = useMemo(() => {
    const families = new Map<string, Genre[]>();

    filteredGenres.forEach((genre) => {
      const existing = families.get(genre.family) || [];
      families.set(genre.family, [...existing, genre]);
    });

    return Array.from(families.entries());
  }, [filteredGenres]);

  const currentGenre = genres.find(
    (genre) => genre.name.toLowerCase() === selectedGenre.toLowerCase(),
  );

  const relatedGenres = currentGenre
    ? genres.filter(
        (genre) =>
          genre.family === currentGenre.family &&
          genre.name.toLowerCase() !== currentGenre.name.toLowerCase(),
      )
    : [];

  // Remember recently explored genres.
  useEffect(() => {
    if (!selectedGenre) return;

    setRecentGenres((current) => {
      const updated = [
        selectedGenre,
        ...current.filter(
          (genre) => genre.toLowerCase() !== selectedGenre.toLowerCase(),
        ),
      ].slice(0, 6);

      localStorage.setItem(RECENT_GENRES_KEY, JSON.stringify(updated));

      return updated;
    });
  }, [selectedGenre]);

  // Load artists when a genre is selected.
  useEffect(() => {
    if (!selectedGenre) {
      setArtists([]);
      return;
    }

    let cancelled = false;

    async function loadArtists() {
      try {
        setLoadingArtists(true);
        setError("");
        setArtists([]);

        const response = await fetch(
          `/api/genres/artists?tag=${encodeURIComponent(selectedGenre)}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load artists.");
        }

        if (!cancelled) {
          setArtists(data.artists || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load artists.",
          );
        }
      } finally {
        if (!cancelled) setLoadingArtists(false);
      }
    }

    loadArtists();

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

  function selectGenre(genre: string) {
    setSelectedGenre(genre);
    setSearch("");
    setError("");
  }

  function toggleFamily(family: string) {
    setExpandedFamilies((current) =>
      current.includes(family)
        ? current.filter((item) => item !== family)
        : [...current, family],
    );
  }

  function handleSaveArtist(artist: GenreArtist) {
    if (isArtistSaved(artist.name)) {
      removeSavedArtist(artist.name);
    } else {
      const savedArtist: SavedArtist = {
        name: artist.name,
        mbid: artist.mbid,
        url: artist.url,
        image: artist.image,
        listeners: artist.listeners,
        playcount: 0,
        biography: `Discovered through SONORA's Explore section in ${selectedGenre}.`,
        tags: [selectedGenre],
        savedAt: new Date().toISOString(),
      };

      saveArtist(savedArtist);
    }

    setSavedNames(getSavedArtists().map((item) => item.name.toLowerCase()));
  }

  const unfamiliarGenres = genres
    .filter(
      (genre) =>
        !recentGenres.some(
          (recent) => recent.toLowerCase() === genre.name.toLowerCase(),
        ),
    )
    .slice(0, 4);

  // Reusable artist section for the three discovery categories.
  function renderArtistSection(
    title: string,
    eyebrow: string,
    description: string,
    categoryArtists: GenreArtist[],
    category: GenreArtist["category"],
  ) {
    if (categoryArtists.length === 0) return null;

    return (
      <section className="mb-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#D6A45D]">
              {eyebrow}
            </p>
            <h3 className="text-xl font-medium">{title}</h3>
            <p className="mt-2 text-sm text-neutral-500">{description}</p>
          </div>

          <span className="shrink-0 text-xs text-neutral-600">
            {categoryArtists.length} artists
          </span>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categoryArtists.map((artist) => {
            const isSaved = savedNames.includes(artist.name.toLowerCase());

            return (
              <div
                key={`${category}-${artist.name}`}
                className="group overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition hover:border-[#D6A45D]/40"
              >
                <Link
                  href={`/artists/${encodeURIComponent(artist.name)}`}
                  className="block"
                >
                  <div className="aspect-square overflow-hidden bg-[#1A1A1A]">
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
                  </div>

                  <div className="p-4 pb-2">
                    <h4 className="truncate text-sm font-medium">
                      {artist.name}
                    </h4>

                    <p className="mt-1 text-xs text-neutral-500">
                      {artist.listeners.toLocaleString()} listeners
                    </p>

                    {artist.reason && (
                      <p className="mt-3 min-h-8 text-xs leading-5 text-neutral-500">
                        {artist.reason}
                      </p>
                    )}

                    {category === "related" &&
                      typeof artist.match === "number" && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-600">
                            <span>Last.fm similarity</span>
                            <span>{Math.round(artist.match)}%</span>
                          </div>

                          <div className="h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#D6A45D]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, artist.match),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                  </div>
                </Link>

                <div className="px-4 pb-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveArtist(artist)}
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
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark size={15} />
                        Save to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F2ED]">
      <Sidebar />

      <div className="md:pl-64">
        <Header />

        <main className="mx-auto max-w-7xl px-6 py-10">
          {/* Page introduction */}
          <div className="mb-12">
            <div className="mb-3 flex items-center gap-2">
              <Compass size={17} className="text-[#D6A45D]" />
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                Discover something different
              </span>
            </div>

            <h1 className="font-editorial text-4xl font-normal tracking-tight sm:text-5xl">
              Explore music.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-400">
              Follow a sound, explore a scene or find an artist you never knew
              you needed to hear. Your next favourite starts here.
            </p>
          </div>

          {/* Genre detail */}
          {selectedGenre ? (
            <section>
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre("");
                  setError("");
                }}
                className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-[#D6A45D]"
              >
                <ArrowLeft size={16} />
                All genres
              </button>

              <div className="mb-10 border-b border-white/[0.08] pb-8">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#D6A45D]">
                  {currentGenre?.family || "Genre discovery"}
                </p>

                <h2 className="font-editorial text-4xl font-normal capitalize sm:text-5xl">
                  {selectedGenre}
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">
                  {currentGenre?.description ||
                    `Discover artists associated with ${selectedGenre}.`}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {currentGenre && (
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-400">
                      {currentGenre.family}
                    </span>
                  )}

                  {currentGenre?.count ? (
                    <span className="text-xs text-neutral-500">
                      Last.fm tag popularity:{" "}
                      {currentGenre.count.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Related genres */}
              {relatedGenres.length > 0 && (
                <div className="mb-12">
                  <p className="mb-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Explore related sounds
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {relatedGenres.map((genre) => (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => selectGenre(genre.name)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs capitalize text-neutral-300 transition hover:border-[#D6A45D]/50 hover:text-[#D6A45D]"
                      >
                        {genre.name}
                        <ArrowUpRight size={12} className="ml-2 inline" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist results */}
              <div className="mb-8">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#D6A45D]">
                  Find your next favourite
                </p>

                <h3 className="text-xl font-medium">
                  Discover {selectedGenre}
                </h3>

                <p className="mt-2 text-sm text-neutral-500">
                  Explore familiar names, uncover lesser-known artists and
                  follow connections to new music.
                </p>
              </div>

              {error && (
                <p className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                  {error}
                </p>
              )}

              {loadingArtists ? (
                <div className="flex items-center gap-3 py-12 text-neutral-400">
                  <Loader2 size={20} className="animate-spin text-[#D6A45D]" />
                  <span className="text-sm">Finding artists...</span>
                </div>
              ) : artists.length > 0 ? (
                <>
                  {renderArtistSection(
                    "Established artists",
                    "The essentials",
                    "Recognised artists associated with this sound.",
                    artists.filter(
                      (artist) => artist.category === "established",
                    ),
                    "established",
                  )}

                  {renderArtistSection(
                    "Hidden gems",
                    "Go a little deeper",
                    "Less-listened-to artists from the genre. A good place to find something new.",
                    artists.filter((artist) => artist.category === "discovery"),
                    "discovery",
                  )}

                  {renderArtistSection(
                    "You might also like",
                    "Follow the connections",
                    "Artists connected to the leading names in this genre.",
                    artists.filter((artist) => artist.category === "related"),
                    "related",
                  )}

                  {artists.every(
                    (artist) =>
                      !["established", "discovery", "related"].includes(
                        artist.category,
                      ),
                  ) && (
                    <div className="rounded-xl border border-white/[0.08] p-8 text-center">
                      <p className="text-sm text-neutral-400">
                        No categorised artists were returned for this genre.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                !loadingArtists && (
                  <div className="rounded-xl border border-white/[0.08] p-10 text-center">
                    <Music2
                      size={28}
                      className="mx-auto mb-4 text-neutral-600"
                    />
                    <p className="text-sm text-neutral-400">
                      No artists found for this genre.
                    </p>
                    <p className="mt-2 text-xs text-neutral-600">
                      Try exploring another genre in this family.
                    </p>
                  </div>
                )
              )}
            </section>
          ) : (
            <>
              {/* Trending artists */}
              <section className="mb-14">
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#D6A45D]" />
                    <p className="text-xs uppercase tracking-[0.2em] text-[#D6A45D]">
                      What's gaining attention
                    </p>
                  </div>

                  <h2 className="text-xl font-medium">Trending artists</h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    Artists listeners are discovering right now.
                  </p>
                </div>

                {loadingTrending ? (
                  <div className="flex items-center gap-3 py-8 text-neutral-400">
                    <Loader2
                      size={18}
                      className="animate-spin text-[#D6A45D]"
                    />
                    <span className="text-sm">Loading trending artists...</span>
                  </div>
                ) : trendingArtists.length > 0 ? (
                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {trendingArtists.slice(0, 12).map((artist) => (
                      <Link
                        key={artist.name}
                        href={`/artists/${encodeURIComponent(artist.name)}`}
                        className="group"
                      >
                        <div className="aspect-square overflow-hidden rounded-xl bg-[#1A1A1A]">
                          {artist.image ? (
                            <img
                              src={artist.image}
                              alt={`${artist.name} artwork`}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Music2 size={30} className="text-neutral-600" />
                            </div>
                          )}
                        </div>

                        <h3 className="mt-3 truncate text-sm font-medium transition group-hover:text-[#D6A45D]">
                          {artist.name}
                        </h3>

                        <p className="mt-1 text-xs text-neutral-500">
                          {artist.listeners.toLocaleString()} listeners
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-sm text-neutral-500">
                    Trending artists are currently unavailable.
                  </p>
                )}
              </section>

              {/* Outside your comfort zone */}
              {unfamiliarGenres.length > 0 && (
                <section className="mb-14">
                  <div className="mb-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles size={15} className="text-[#D6A45D]" />
                      <p className="text-xs uppercase tracking-[0.2em] text-[#D6A45D]">
                        Take a chance
                      </p>
                    </div>

                    <h2 className="text-xl font-medium">
                      Outside your comfort zone
                    </h2>

                    <p className="mt-2 text-sm text-neutral-500">
                      Sounds you haven't explored recently.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {unfamiliarGenres.map((genre, index) => (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => selectGenre(genre.name)}
                        className="group flex min-h-28 items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-left transition hover:border-[#D6A45D]/40 hover:bg-white/[0.05]"
                      >
                        <div>
                          <p className="mb-2 text-xs text-neutral-600">
                            {String(index + 1).padStart(2, "0")}
                          </p>
                          <h3 className="font-medium capitalize">
                            {genre.name}
                          </h3>
                          <p className="mt-1 text-xs text-neutral-500">
                            {genre.family}
                          </p>
                        </div>

                        <ArrowUpRight
                          size={17}
                          className="text-neutral-600 transition group-hover:text-[#D6A45D]"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Recently explored */}
              {recentGenres.length > 0 && (
                <section className="mb-14">
                  <div className="mb-5">
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#D6A45D]">
                      Pick up where you left off
                    </p>
                    <h2 className="text-xl font-medium">Recently explored</h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {recentGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => selectGenre(genre)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm capitalize text-neutral-300 transition hover:border-[#D6A45D]/50 hover:text-[#D6A45D]"
                      >
                        <Music2 size={14} />
                        {genre}
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Genre catalogue */}
              <section className="border-t border-white/[0.08] pt-10">
                <div className="mb-7">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#D6A45D]">
                    Find your sound
                  </p>

                  <h2 className="font-editorial text-3xl font-normal">
                    Browse genres
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    Explore music by style, scene and sound.
                  </p>
                </div>

                {/* Search */}
                <div className="relative mb-8 max-w-xl">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search genres or musical styles..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#D6A45D]/50"
                  />
                </div>

                {error && (
                  <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {loadingGenres ? (
                  <div className="flex items-center gap-3 py-12 text-neutral-400">
                    <Loader2
                      size={20}
                      className="animate-spin text-[#D6A45D]"
                    />
                    <span className="text-sm">Loading genres...</span>
                  </div>
                ) : genreFamilies.length > 0 ? (
                  <div className="space-y-4">
                    {genreFamilies.map(([family, familyGenres], index) => {
                      const isExpanded =
                        search.trim().length > 0 ||
                        expandedFamilies.includes(family);

                      return (
                        <div
                          key={family}
                          className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFamily(family)}
                            aria-expanded={isExpanded}
                            className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.025] sm:p-6"
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="font-editorial text-2xl text-[#D6A45D]/70">
                                {String(index + 1).padStart(2, "0")}
                              </span>

                              <div className="min-w-0">
                                <h3 className="text-lg font-medium">
                                  {family}
                                </h3>
                                <p className="mt-1 hidden text-xs text-neutral-500 sm:block">
                                  {familyDescriptions[family] ||
                                    "Explore this musical family."}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-xs text-neutral-500">
                                {familyGenres.length} styles
                              </span>
                              <ChevronDown
                                size={18}
                                className={`text-neutral-500 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="grid gap-2 border-t border-white/[0.06] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                              {familyGenres.map((genre) => (
                                <button
                                  key={genre.id}
                                  type="button"
                                  onClick={() => selectGenre(genre.name)}
                                  className="group flex items-center justify-between gap-3 rounded-lg border border-transparent bg-white/[0.02] px-4 py-3 text-left transition hover:border-[#D6A45D]/30 hover:bg-[#D6A45D]/[0.05]"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <Music2
                                      size={16}
                                      className="shrink-0 text-[#D6A45D]/70"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm capitalize text-neutral-200 transition group-hover:text-[#D6A45D]">
                                        {genre.name}
                                      </p>
                                      <p className="mt-1 truncate text-[11px] text-neutral-600">
                                        {genre.description}
                                      </p>
                                    </div>
                                  </div>

                                  <ArrowUpRight
                                    size={15}
                                    className="shrink-0 text-neutral-600 transition group-hover:text-[#D6A45D]"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !loadingGenres && (
                    <div className="rounded-xl border border-white/10 p-10 text-center">
                      <Music2
                        size={25}
                        className="mx-auto mb-3 text-neutral-600"
                      />
                      <p className="text-sm text-neutral-400">
                        No genres match your search.
                      </p>
                    </div>
                  )
                )}
              </section>
            </>
          )}

          {/* Library link */}
          <div className="mt-14 border-t border-white/10 pt-6">
            <Link
              href="/library"
              className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-[#D6A45D]"
            >
              Explore your saved music
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
