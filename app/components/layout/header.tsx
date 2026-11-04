"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Loader2, Music2 } from "lucide-react";

type Artist = {
  name: string;
  listeners: number;
  mbid: string;
  url: string;
  image: string;
};

export default function Header() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setArtists([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/artists/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed.");
        }

        setArtists(data.results);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
          setArtists([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function selectArtist(artist: Artist) {
    setQuery("");
    setIsOpen(false);
    setArtists([]);

    router.push(`/artists/${encodeURIComponent(artist.name)}`);
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setIsOpen(true);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
    }

    if (e.key === "Enter" && artists.length > 0) {
      selectArtist(artists[0]);
    }
  }

  return (
    <header className="sticky top-0 z-50 flex min-h-20 items-center justify-between gap-6 border-b border-white/[0.07] bg-[#151515]/95 px-5 py-4 shadow-lg shadow-black/10 backdrop-blur-xl sm:px-8">
      {/* Page introduction */}
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
          Your personal music space
        </p>

        <h2 className="truncate font-serif text-xl text-[#F5F2ED] sm:text-2xl">
          Discover something different.
        </h2>
      </div>

      {/* Header controls */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {/* Artist search */}
        <div className="relative">
          <div
            className={`flex h-10 w-10 items-center gap-3 rounded-xl border bg-white/[0.025] px-3 transition-all duration-200 sm:w-64 lg:w-72 ${
              isOpen
                ? "border-[#D6A45D]/40 bg-white/[0.04]"
                : "border-white/[0.08] hover:border-white/[0.16]"
            }`}
          >
            <Search
              size={17}
              className={`shrink-0 ${
                isOpen ? "text-[#D6A45D]" : "text-neutral-500"
              }`}
            />

            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search artists..."
              aria-label="Search artists"
              aria-expanded={isOpen && !!query.trim()}
              className="hidden min-w-0 flex-1 bg-transparent text-sm text-[#F5F2ED] outline-none placeholder:text-neutral-600 sm:block"
            />

            {loading && (
              <Loader2
                size={15}
                className="hidden shrink-0 animate-spin text-[#D6A45D] sm:block"
              />
            )}
          </div>

          {/* Mobile search input */}
          <div className="absolute right-0 top-0 sm:hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search artists..."
              aria-label="Search artists"
              className="h-10 w-10 rounded-xl bg-transparent pl-10 text-sm text-white outline-none focus:w-56 focus:border focus:border-[#D6A45D]/40 focus:bg-[#1B1B1B] focus:px-3"
            />
          </div>

          {/* Search results */}
          {isOpen && query.trim() && (
            <div className="absolute right-0 top-full mt-3 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-xl border border-white/[0.09] bg-[#1B1B1B] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Artist results
                </p>

                {loading && (
                  <Loader2 size={14} className="animate-spin text-[#D6A45D]" />
                )}
              </div>

              {loading && artists.length === 0 && (
                <p className="px-4 py-5 text-sm text-neutral-400">
                  Searching for artists...
                </p>
              )}

              {error && (
                <p className="px-4 py-5 text-sm text-red-400">{error}</p>
              )}

              {!loading && !error && artists.length === 0 && (
                <p className="px-4 py-5 text-sm text-neutral-500">
                  No artists found. Try another search.
                </p>
              )}

              <div className="max-h-96 overflow-y-auto">
                {artists.map((artist, index) => (
                  <button
                    key={artist.mbid || `${artist.name}-${index}`}
                    onClick={() => selectArtist(artist)}
                    className="group flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.04]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.05]">
                      {artist.image ? (
                        <img
                          src={artist.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music2 size={18} className="text-neutral-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#F5F2ED] transition group-hover:text-[#D6A45D]">
                        {artist.name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {artist.listeners.toLocaleString()} listeners
                      </p>
                    </div>

                    <span className="text-[11px] text-neutral-600 transition group-hover:text-[#D6A45D]">
                      Explore →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition hover:bg-white/[0.05] hover:text-[#F5F2ED]"
        >
          <Bell size={18} strokeWidth={1.7} />
        </button>

        {/* User avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D6A45D]/20 bg-[#D6A45D]/10 text-xs font-semibold text-[#D6A45D]">
          C
        </div>
      </div>
    </header>
  );
}
