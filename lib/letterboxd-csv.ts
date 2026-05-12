// Small RFC-4180 CSV parser + Letterboxd-specific row decoders.
// All functions are pure; no I/O. Tested in lib/__tests__/letterboxd-csv.test.ts.

export type DiaryRow = {
  date: string;
  name: string;
  year: string | null;
  uri: string;
  rating: number;
  watchedDate: string;
};

export type ReviewRow = DiaryRow & { review: string };

export type WatchedRow = {
  date: string;
  name: string;
  year: string | null;
  uri: string;
};

export type WatchlistRow = WatchedRow;

// ---------- generic CSV ----------

/**
 * RFC-4180 parser. Returns each body row as { header → cell }. Handles:
 * - quoted fields with commas, newlines, and escaped `""` for literal `"`
 * - CRLF and LF line endings
 * - trailing newline
 * - unknown / extra / missing columns (extras ignored, missing fall back to '')
 *
 * Blank rows (all cells empty after parsing) are dropped.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  const [headerRow, ...bodyRows] = rows;
  const headers = headerRow.map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (const row of bodyRows) {
    if (row.length === 1 && row[0] === '') continue; // blank line
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = row[i] ?? '';
    }
    out.push(record);
  }
  return out;
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // Treat CR or CRLF as a single row terminator.
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      if (text[i] === '\n') i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  // Flush last cell/row if non-empty (file may not end with a newline).
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------- Letterboxd-specific decoders ----------

function pickYear(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // Letterboxd year columns are 4 digits; reject anything else as null.
  return /^\d{4}$/.test(trimmed) ? trimmed : null;
}

function pickRating(raw: string | undefined): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

export function parseDiaryCsv(text: string): DiaryRow[] {
  return parseCsv(text).map((r) => {
    const date = r['Date'] ?? '';
    const watchedDate = (r['Watched Date'] ?? '').trim() || date;
    return {
      date,
      name: r['Name'] ?? '',
      year: pickYear(r['Year']),
      uri: r['Letterboxd URI'] ?? '',
      rating: pickRating(r['Rating']),
      watchedDate,
    };
  });
}

export function parseReviewsCsv(text: string): ReviewRow[] {
  return parseCsv(text).map((r) => {
    const date = r['Date'] ?? '';
    const watchedDate = (r['Watched Date'] ?? '').trim() || date;
    return {
      date,
      name: r['Name'] ?? '',
      year: pickYear(r['Year']),
      uri: r['Letterboxd URI'] ?? '',
      rating: pickRating(r['Rating']),
      watchedDate,
      review: r['Review'] ?? '',
    };
  });
}

export function parseWatchedCsv(text: string): WatchedRow[] {
  return parseCsv(text).map((r) => ({
    date: r['Date'] ?? '',
    name: r['Name'] ?? '',
    year: pickYear(r['Year']),
    uri: r['Letterboxd URI'] ?? '',
  }));
}

export function parseWatchlistCsv(text: string): WatchlistRow[] {
  return parseWatchedCsv(text);
}
