/**
 * Small RFC 4180 CSV parser for LimeSurvey exports: quoted fields, embedded
 * delimiters / quotes / newlines, BOM, CRLF. LimeSurvey exports as comma- or
 * semicolon-separated depending on settings, so the delimiter is detected
 * from the header line instead of assumed.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function detectDelimiter(text: string): string {
  // Count candidates on the first line, outside quotes.
  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === "\n") break;
      if (ch in counts) counts[ch]++;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      records.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      // Duplicate header names: keep every value rather than overwrite.
      const key = h in row ? `${h} (${idx + 1})` : h;
      row[key] = r[idx] ?? "";
    });
    return row;
  });
  return { headers, rows };
}
