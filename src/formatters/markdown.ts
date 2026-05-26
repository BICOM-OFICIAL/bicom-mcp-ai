// Tiny markdown helpers for tool output. Tools return text content that the
// LLM consumes — markdown tables and lists are LLM-friendly because models
// can both parse and re-format them.

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: T[keyof T]) => string;
  align?: "left" | "right";
}

/**
 * Render `rows` as a markdown table using `columns`. If rows is empty,
 * returns a friendly italicized fallback (R13.5 — markdown LLM-friendly).
 */
export function tableToMarkdown<T>(
  rows: T[],
  columns: Array<TableColumn<T>>,
  emptyMessage = "_Sin datos para este periodo._",
): string {
  if (rows.length === 0) return emptyMessage;

  const headerCells = columns.map((c) => c.label);
  const sepCells = columns.map((c) => (c.align === "right" ? "---:" : "---"));

  const formatCell = (row: T, col: TableColumn<T>): string => {
    const raw = row[col.key];
    if (raw === null || raw === undefined) return "—";
    return col.format ? col.format(raw) : String(raw);
  };

  const bodyRows = rows.map((row) => columns.map((c) => formatCell(row, c)));

  const lines: string[] = [];
  lines.push(`| ${headerCells.join(" | ")} |`);
  lines.push(`| ${sepCells.join(" | ")} |`);
  for (const r of bodyRows) {
    lines.push(`| ${r.join(" | ")} |`);
  }
  return lines.join("\n");
}

/**
 * Percentage change between two values. Returns a localized signed string.
 *   percentDelta(110, 100) -> "+10,0%"
 *   percentDelta(90,  100) -> "-10,0%"
 *   percentDelta(50, 0)    -> "—" (sin baseline para comparar)
 *   percentDelta(0, 0)     -> "0,0%"
 */
export function percentDelta(curr: number, prev: number): string {
  if (prev === 0) {
    if (curr === 0) return "0,0%";
    return "—";
  }
  const delta = ((curr - prev) / prev) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1).replace(".", ",")}%`;
}

/**
 * Returns "📈" si curr > prev, "📉" si curr < prev, "➡️" si igual.
 * Visual cue para reportes comparativos.
 */
export function trendArrow(curr: number, prev: number): string {
  if (curr > prev) return "📈";
  if (curr < prev) return "📉";
  return "➡️";
}
