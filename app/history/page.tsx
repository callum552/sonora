"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock3,
  Compass,
  Search,
  Music2,
  Trash2,
  Bookmark,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";

import Sidebar from "@/app/components/layout/sidebar";
import Header from "@/app/components/layout/header";
import {
  ArtistInteraction,
  getArtistInteractions,
  clearArtistInteractions,
} from "@/app/lib/library";

type FilterType = "all" | "explored" | "saved" | "dismissed" | "other";

const filters: { label: string; value: FilterType }[] = [
  { label: "All activity", value: "all" },
  { label: "Explored", value: "explored" },
  { label: "Saved", value: "saved" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Other", value: "other" },
];

function getActionDetails(action: ArtistInteraction["action"]) {
  switch (action) {
    case "explored":
      return {
        label: "Explored",
        description: "You visited this artist's profile",
        icon: Eye,
        colour: "text-[#D6A45D]",
        background: "bg-[#D6A45D]/10",
      };

    case "saved":
      return {
        label: "Saved",
        description: "Added to your library",
        icon: Bookmark,
        colour: "text-emerald-400",
        background: "bg-emerald-400/10",
      };

    case "dismissed":
      return {
        label: "Dismissed",
        description: "Removed from your recommendations",
        icon: EyeOff,
        colour: "text-neutral-400",
        background: "bg-white/[0.06]",
      };

    case "unsaved":
      return {
        label: "Unsaved",
        description: "Removed from your library",
        icon: Bookmark,
        colour: "text-neutral-400",
        background: "bg-white/[0.06]",
      };

    case "restored":
      return {
        label: "Restored",
        description: "Made available for recommendations again",
        icon: RotateCcw,
        colour: "text-sky-400",
        background: "bg-sky-400/10",
      };
  }
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryPageContent() {
  const [interactions, setInteractions] = useState<ArtistInteraction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const loadHistory = useCallback(() => {
    setInteractions(getArtistInteractions());
  }, []);

  useEffect(() => {
    loadHistory();

    window.addEventListener("sonora-feedback-updated", loadHistory);

    return () => {
      window.removeEventListener("sonora-feedback-updated", loadHistory);
    };
  }, [loadHistory]);

  const filteredInteractions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return interactions.filter((interaction) => {
      const matchesSearch = interaction.name.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "other"
          ? interaction.action === "unsaved" ||
            interaction.action === "restored"
          : interaction.action === filter);

      return matchesSearch && matchesFilter;
    });
  }, [interactions, search, filter]);

  const exploredCount = interactions.filter(
    (item) => item.action === "explored",
  ).length;

  const savedCount = interactions.filter(
    (item) => item.action === "saved",
  ).length;

  const uniqueArtists = new Set(
    interactions.map((item) => item.name.trim().toLowerCase()),
  ).size;

  const groupedInteractions = useMemo(() => {
    const groups: { date: string; items: ArtistInteraction[] }[] = [];

    filteredInteractions.forEach((interaction) => {
      const date = formatDate(interaction.timestamp);
      const existingGroup = groups.find((group) => group.date === date);

      if (existingGroup) {
        existingGroup.items.push(interaction);
      } else {
        groups.push({
          date,
          items: [interaction],
        });
      }
    });

    return groups;
  }, [filteredInteractions]);

  function handleClearArtist(name: string) {
    const confirmed = window.confirm(
      `Remove all history for ${name}? This cannot be undone.`,
    );

    if (!confirmed) return;

    clearArtistInteractions(name);
    loadHistory();
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#F5F2ED]">
      <Sidebar />

      <div className="min-w-0 md:pl-64">
        <Header />

        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
          {/* Page introduction */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2 text-[#D6A45D]">
              <Clock3 size={16} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                Your journey
              </span>
            </div>

            <h1 className="font-serif text-4xl tracking-tight text-[#F5F2ED] sm:text-5xl">
              Discovery history
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-500">
              Every artist you explore is part of your musical journey. Revisit
              discoveries and see how your taste evolves.
            </p>
          </section>

          {/* Statistics */}
          <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-[#181818] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Artists encountered
                </span>
                <Music2 size={17} className="text-[#D6A45D]" />
              </div>

              <p className="text-3xl font-medium tabular-nums">
                {uniqueArtists}
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                Unique artists in your history
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#181818] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Profiles explored
                </span>
                <Eye size={17} className="text-[#D6A45D]" />
              </div>

              <p className="text-3xl font-medium tabular-nums">
                {exploredCount}
              </p>
              <p className="mt-1 text-[11px] text-neutral-600">
                Recorded profile visits
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#181818] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Artists saved</span>
                <Bookmark size={17} className="text-emerald-400" />
              </div>

              <p className="text-3xl font-medium tabular-nums">{savedCount}</p>
              <p className="mt-1 text-[11px] text-neutral-600">
                Save actions recorded
              </p>
            </div>
          </section>

          {/* History controls */}
          <section>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-serif text-2xl">Your activity</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Your latest interactions appear first.
                </p>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search artists..."
                  className="h-11 w-full rounded-lg border border-white/[0.08] bg-[#181818] pl-10 pr-4 text-sm text-[#F5F2ED] outline-none transition-colors placeholder:text-neutral-600 focus:border-[#D6A45D]/50"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-7 flex gap-2 overflow-x-auto pb-2">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs transition-colors ${
                    filter === item.value
                      ? "bg-[#D6A45D] font-medium text-[#171717]"
                      : "border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Activity timeline */}
            {groupedInteractions.length > 0 ? (
              <div className="space-y-9">
                {groupedInteractions.map((group) => (
                  <div key={group.date}>
                    <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      {group.date}
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#181818]">
                      {group.items.map((interaction, index) => {
                        const details = getActionDetails(interaction.action);
                        const Icon = details.icon;

                        return (
                          <div
                            key={`${interaction.timestamp}-${interaction.name}-${index}`}
                            className={`group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-5 ${
                              index !== group.items.length - 1
                                ? "border-b border-white/[0.06]"
                                : ""
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${details.background}`}
                            >
                              <Icon size={17} className={details.colour} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/artists/${encodeURIComponent(interaction.name)}`}
                                className="flex w-fit items-center gap-1.5 text-sm font-medium text-[#F5F2ED] transition-colors hover:text-[#D6A45D]"
                              >
                                <span className="truncate">
                                  {interaction.name}
                                </span>
                                <ArrowUpRight
                                  size={13}
                                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              </Link>

                              <p className="mt-1 text-[11px] text-neutral-500">
                                {details.description}
                              </p>
                            </div>

                            <div className="hidden text-right sm:block">
                              <span
                                className={`text-[10px] font-medium ${details.colour}`}
                              >
                                {details.label}
                              </span>
                              <p className="mt-1 text-[10px] tabular-nums text-neutral-600">
                                {formatTime(interaction.timestamp)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleClearArtist(interaction.name)
                              }
                              title={`Clear history for ${interaction.name}`}
                              aria-label={`Clear history for ${interaction.name}`}
                              className="rounded-lg p-2 text-neutral-600 opacity-100 transition-colors hover:bg-red-400/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.1] px-6 py-16 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
                  {search || filter !== "all" ? (
                    <Search size={22} className="text-neutral-500" />
                  ) : (
                    <Clock3 size={22} className="text-[#D6A45D]" />
                  )}
                </div>

                <h3 className="font-serif text-xl">
                  {search || filter !== "all"
                    ? "No matching activity"
                    : "Your journey starts here"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  {search || filter !== "all"
                    ? "Try changing your search or selecting a different filter."
                    : "Explore an artist's profile and your discoveries will start appearing here."}
                </p>

                {!search && filter === "all" && (
                  <Link
                    href="/explore"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#D6A45D] px-5 py-3 text-xs font-semibold text-[#171717] transition-colors hover:bg-[#E2B875]"
                  >
                    <Compass size={15} />
                    Start exploring
                  </Link>
                )}
              </div>
            )}

            <p className="mt-6 text-center text-[10px] text-neutral-600">
              Your history is stored locally on this device. Up to 500
              interactions are retained.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return <HistoryPageContent />;
}
