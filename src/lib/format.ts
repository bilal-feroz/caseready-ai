// Display helpers shared across screens. Two kinds of timestamp exist:
// - Schedule wall-clock values (case starts, slot times, due times) are stored as "...Z" but
//   mean UAE local time; format them with formatTime/formatDate/formatDateTime.
// - Event instants (audit events, completions) are real UTC moments; format them with the
//   formatEvent* helpers, which convert to UAE time (UTC+4, no daylight saving).

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const UAE_OFFSET_MS = 4 * 3_600_000;

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

/** "Friday, 2 October 2026" */
export function formatLongDate(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${LONG_WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${LONG_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "11:45–13:00" from start + end. */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Shift a real UTC instant to UAE wall-clock, expressed as an ISO string for the helpers above. */
function toUaeWallClock(value?: string | null): string | null {
  if (!value) return null;
  // SQLite CURRENT_TIMESTAMP ("2026-10-01 04:30:00") is UTC but has no zone marker; without
  // this, browsers would parse it as local time.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const d = toDate(normalized);
  return d ? new Date(d.getTime() + UAE_OFFSET_MS).toISOString() : null;
}

/** Event instant in UAE time: "09:15" */
export function formatEventTime(value?: string | null): string {
  return formatTime(toUaeWallClock(value));
}

/** Event instant in UAE time: "Fri, 2 Oct 2026" */
export function formatEventDate(value?: string | null): string {
  return formatDate(toUaeWallClock(value));
}

/** Event instant in UAE time: "2 Oct 2026, 09:15" */
export function formatEventDateTime(value?: string | null): string {
  return formatDateTime(toUaeWallClock(value));
}

/** Greeting for the current hour in the UAE. */
export function uaeGreeting(now = new Date()): string {
  const hour = new Date(now.getTime() + UAE_OFFSET_MS).getUTCHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
