
"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import {
  isArtistSaved,
  saveArtist,
  removeSavedArtist,
  type SavedArtist,
} from "@/app/lib/library";

type SaveArtistButtonProps = {
  artist: SavedArtist;
};

export default function SaveArtistButton({
  artist,
}: SaveArtistButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function updateSavedState() {
      setSaved(isArtistSaved(artist.name));
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
  }, [artist.name]);

  function handleSave() {
    if (isArtistSaved(artist.name)) {
      removeSavedArtist(artist.name);
    } else {
      saveArtist(artist);
    }

    setSaved(isArtistSaved(artist.name));
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition ${
        saved
          ? "border-[#D6A45D]/50 bg-[#D6A45D]/10 text-[#D6A45D]"
          : "border-white/15 bg-white/5 text-[#F5F2ED] hover:border-[#D6A45D]/50 hover:text-[#D6A45D]"
      }`}
    >
      {saved ? (
        <>
          <BookmarkCheck size={17} />
          Saved to library
        </>
      ) : (
        <>
          <Bookmark size={17} />
          Save artist
        </>
      )}
    </button>
  );
}
