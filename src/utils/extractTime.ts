/**
 * Extracts a suggested number of minutes from a recipe step string.
 * Returns null if no time phrase is found.
 *
 * Handles:
 *  - "10 minutes" / "10 mins" / "10 min"
 *  - "1 hour" / "1.5 hours"
 *  - "1 hour 30 minutes"
 *  - "10-15 minutes" (uses upper bound)
 *  - "about 20 minutes"
 */
export function extractMinutes(text: string): number | null {
  const t = text.toLowerCase();

  // Match patterns like "1 hour 30 minutes" or "1 hour and 30 minutes"
  const hourMinRe = /(\d+(?:\.\d+)?)\s*hours?\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?)/;
  const hmMatch = t.match(hourMinRe);
  if (hmMatch) {
    return Math.round(parseFloat(hmMatch[1]) * 60 + parseInt(hmMatch[2], 10));
  }

  // Match ranges like "10-15 minutes" — use the lower end (the first number mentioned)
  const rangeRe = /(\d+)\s*[-–]\s*(\d+)\s*(?:minutes?|mins?)/;
  const rangeMatch = t.match(rangeRe);
  if (rangeMatch) {
    return parseInt(rangeMatch[1], 10);
  }

  // Match plain hours: "1 hour", "1.5 hours", "2 hr"
  const hourRe = /(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)\b/;
  const hourMatch = t.match(hourRe);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }

  // Match plain minutes: "10 minutes", "10 min", "10 mins"
  const minRe = /(\d+)\s*(?:minutes?|mins?)\b/;
  const minMatch = t.match(minRe);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Match seconds: "30 seconds" — convert to a sub-minute value
  const secRe = /(\d+)\s*seconds?\b/;
  const secMatch = t.match(secRe);
  if (secMatch) {
    const secs = parseInt(secMatch[1], 10);
    // Only surface if >= 10 seconds (avoids noise like "5 seconds")
    return secs >= 10 ? Math.max(1, Math.round(secs / 60)) : null;
  }

  return null;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
