// Display helpers shared across screens. Times are stored as UTC ("...Z") and rendered
// in UTC so the wall-clock shown always matches the seeded operating-list time.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Ensure exactly one "Dr." prefix regardless of how the name is stored. */
export function formatSurgeonName(name?: string | null): string {
  if (!name) return "";
  const bare = name.replace(/^dr\.?\s*/i, "").trim();
  return `Dr. ${bare}`;
}

/** Uppercase initials from a masked name, e.g. "S. Rahman" -> "SR". */
export function initials(name?: string | null): string {
  if (!name) return "";
  const parts = name.replace(/[^\p{L}\s.]/gu, "").split(/\s+/).filter(Boolean);
  return parts
    .map((p) => p.replace(/\./g, "")[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "09:15" */
export function formatTime(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** "Mon, 13 Jul 2026" */
export function formatDate(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "13 Jul 2026, 09:15" */
export function formatDateTime(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${formatTime(value)}`;
}

/** "11:45–13:00" from start + end. */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}
