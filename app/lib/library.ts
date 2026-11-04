export type SavedArtist = {
  name: string;
  mbid: string;
  url: string;
  image: string;
  listeners: number;
  playcount: number;
  biography: string;
  tags: string[];
  savedAt: string;
};

export type ArtistInteraction = {
  name: string;
  action: "saved" | "dismissed" | "explored" | "unsaved" | "restored";
  timestamp: string;
};

const STORAGE_KEY = "sonora-saved-artists";
const DISMISSED_STORAGE_KEY = "sonora-dismissed-artists";
const INTERACTIONS_STORAGE_KEY = "sonora-artist-interactions";

const MAX_INTERACTIONS = 500;

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

function dispatchLibraryEvent(eventName: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(eventName));
}

function recordInteraction(
  name: string,
  action: ArtistInteraction["action"],
): void {
  if (typeof window === "undefined" || !name.trim()) return;

  const interactions = getArtistInteractions();

  const interaction: ArtistInteraction = {
    name: name.trim(),
    action,
    timestamp: new Date().toISOString(),
  };

  const updatedInteractions = [interaction, ...interactions].slice(
    0,
    MAX_INTERACTIONS,
  );

  localStorage.setItem(
    INTERACTIONS_STORAGE_KEY,
    JSON.stringify(updatedInteractions),
  );

  dispatchLibraryEvent("sonora-feedback-updated");
}

export function getSavedArtists(): SavedArtist[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isArtistSaved(name: string): boolean {
  return getSavedArtists().some(
    (artist) => normaliseName(artist.name) === normaliseName(name),
  );
}

export function saveArtist(artist: SavedArtist): void {
  if (typeof window === "undefined") return;

  const artists = getSavedArtists();

  const alreadySaved = artists.some(
    (item) => normaliseName(item.name) === normaliseName(artist.name),
  );

  if (alreadySaved) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...artists, artist]));

  recordInteraction(artist.name, "saved");

  dispatchLibraryEvent("sonora-library-updated");
}

export function removeSavedArtist(name: string): void {
  if (typeof window === "undefined") return;

  const artists = getSavedArtists();

  const updatedArtists = artists.filter(
    (artist) => normaliseName(artist.name) !== normaliseName(name),
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedArtists));

  recordInteraction(name, "unsaved");

  dispatchLibraryEvent("sonora-library-updated");
}

export function getDismissedArtists(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter((artist): artist is string => typeof artist === "string")
      : [];
  } catch {
    return [];
  }
}

export function isArtistDismissed(name: string): boolean {
  return getDismissedArtists().some(
    (artist) => normaliseName(artist) === normaliseName(name),
  );
}

export function dismissArtist(name: string): void {
  if (typeof window === "undefined" || !name.trim()) return;

  const artists = getDismissedArtists();

  const alreadyDismissed = artists.some(
    (artist) => normaliseName(artist) === normaliseName(name),
  );

  if (alreadyDismissed) return;

  localStorage.setItem(
    DISMISSED_STORAGE_KEY,
    JSON.stringify([...artists, name.trim()]),
  );

  recordInteraction(name, "dismissed");

  dispatchLibraryEvent("sonora-dismissed-updated");
}

export function restoreDismissedArtist(name: string): void {
  if (typeof window === "undefined") return;

  const artists = getDismissedArtists();

  const updatedArtists = artists.filter(
    (artist) => normaliseName(artist) !== normaliseName(name),
  );

  localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updatedArtists));

  recordInteraction(name, "restored");

  dispatchLibraryEvent("sonora-dismissed-updated");
}

// Record when someone opens an artist profile.
export function recordArtistExplore(name: string): void {
  if (!name.trim()) return;

  recordInteraction(name, "explored");
}

// Retrieve the interaction history.
export function getArtistInteractions(): ArtistInteraction[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(INTERACTIONS_STORAGE_KEY);

    const parsed = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (interaction): interaction is ArtistInteraction =>
        interaction &&
        typeof interaction.name === "string" &&
        typeof interaction.timestamp === "string" &&
        ["saved", "dismissed", "explored", "unsaved", "restored"].includes(
          interaction.action,
        ),
    );
  } catch {
    return [];
  }
}

// Retrieve the most recently explored artists.
export function getRecentlyExploredArtists(limit = 10): ArtistInteraction[] {
  return getArtistInteractions()
    .filter((interaction) => interaction.action === "explored")
    .slice(0, limit);
}

// Clear an artist's interaction history.
export function clearArtistInteractions(name: string): void {
  if (typeof window === "undefined") return;

  const updatedInteractions = getArtistInteractions().filter(
    (interaction) => normaliseName(interaction.name) !== normaliseName(name),
  );

  localStorage.setItem(
    INTERACTIONS_STORAGE_KEY,
    JSON.stringify(updatedInteractions),
  );

  dispatchLibraryEvent("sonora-feedback-updated");
}
