// Bicom-api returns dates as "YYYY-MM-DD" strings in UTC (server clock).
// For the MCP output we render them in America/Santiago timezone with
// es-CL locale ("26 may 2026").
//
// Parsing trick: append "T12:00:00Z" so we're at UTC noon — avoids the
// day-boundary edge case where a "YYYY-MM-DD" parsed as midnight UTC would
// render as the previous day in Santiago (UTC-3 or UTC-4 depending on DST).

const SANTIAGO = "America/Santiago";

const DATE = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: SANTIAGO,
});

export function toSantiago(isoDate: string): string {
  // Defensive — if the input is empty or malformed, return as-is.
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate;
  return DATE.format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`));
}

export function formatRange(from: string, to: string): string {
  return `${toSantiago(from)} → ${toSantiago(to)}`;
}
