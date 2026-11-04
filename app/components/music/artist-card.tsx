
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Check,
  ArrowUpRight,
} from "lucide-react";

import {
  isArtistSaved,
  saveArtist,
  removeSavedArtist,
  type SavedArtist,
} from "@/app/lib/library";

interface ArtistCardProps {
  name: string;
  genre: string;
  image: string;
  description: string;
}

export default function ArtistCard({
  name,
  genre,
  image,
  description,
}: ArtistCardProps) {
  const [saved, setSaved] = useState(false);

  const artistUrl = `/artists/${encodeURIComponent(name)}`;

  useEffect(() => {
    function updateSavedState() {
      setSaved(isArtistSaved(name));
    }

    updateSavedState();

    window.addEventListener(
      "sonora-library-updated",
      updateSavedState
    );

    return () => {
      window.removeEventListener(
        "sonora-library-updated",
        updateSavedState
      );
    };
  }, [name]);

  function handleSave() {
    if (isArtistSaved(name)) {
      removeSavedArtist(name);
    } else {
      const artist: SavedArtist = {
        name,
        mbid: "",
        url: "",
        image,
        listeners: 0,
        playcount: 0,
        biography: description,
        tags: [genre],
        savedAt: new Date().toISOString(),
      };

      saveArtist(artist);
    }

    setSaved(isArtistSaved(name));
  }

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#1A1A1A]">

        {/* Artist image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url("${image}")` }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />

        {/* Main clickable area */}
        <Link
          href={artistUrl}
          aria-label={`Explore ${name}`}
          className="absolute inset-0 z-10"
        />

        {/* Genre */}
        <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
          {genre}
        </span>

        {/* Save artist */}
        <button
          type="button"
          aria-label={saved ? `Unsave ${name}` : `Save ${name}`}
          aria-pressed={saved}
          onClick={handleSave}
          className={`absolute right-4 top-4 z-30 rounded-full p-3 backdrop-blur transition ${
            saved
              ? "bg-[#D6A45D] text-black"
              : "bg-black/40 text-white hover:bg-[#D6A45D] hover:text-black"
          }`}
        >
          {saved ? <Check size={18} /> : <Bookmark size={18} />}
        </button>

        {/* Artist information */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5">
          <p className="mb-2 text-xs text-white/60">
            {description}
          </p>

          <div className="flex items-end justify-between gap-3">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              {name}
            </h3>

            <Link
              href={artistUrl}
              aria-label={`Explore ${name}`}
              className="pointer-events-auto rounded-full border border-white/30 p-2 text-white transition hover:border-[#D6A45D] hover:bg-[#D6A45D] hover:text-black"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
