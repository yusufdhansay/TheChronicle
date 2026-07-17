import { promises as fs } from "fs";
import path from "path";
import { buildEdition, istDate } from "./news";
import type { Article, Edition } from "./types";

/**
 * File-backed edition store.
 *
 * - `data/current.json` — the live edition, refreshed when older than 12 h
 *   (or on demand via the Refresh Now button).
 * - `data/archive/YYYY-MM-DD.json` — a snapshot per IST day, powering the
 *   calendar view. The latest refresh of a given day wins, with articles
 *   merged so earlier stories aren't lost.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const CURRENT = path.join(DATA_DIR, "current.json");

export const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

let inflight: Promise<Edition> | null = null;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value), "utf8");
  await fs.rename(tmp, file);
}

async function archive(edition: Edition): Promise<void> {
  const file = path.join(ARCHIVE_DIR, `${edition.date}.json`);
  const existing = await readJson<Edition>(file);
  if (existing) {
    // Merge: keep previously archived articles that dropped out of feeds
    const ids = new Set(edition.articles.map((a) => a.id));
    const carried = existing.articles.filter((a) => !ids.has(a.id));
    edition = { ...edition, articles: [...edition.articles, ...carried] };
  }
  await writeJson(file, edition);
}

export async function refreshEdition(): Promise<Edition> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const edition = await buildEdition();
        // Never clobber a good edition with an empty fetch (network blip)
        if (edition.articles.length > 0) {
          await writeJson(CURRENT, edition);
          await archive(edition);
        }
        return edition;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Returns the current edition, refreshing if missing or older than 12 h. */
export async function getEdition(): Promise<Edition> {
  const cached = await readJson<Edition>(CURRENT);
  if (cached) {
    const age = Date.now() - +new Date(cached.fetchedAt);
    if (age < REFRESH_INTERVAL_MS) return cached;
    // Stale: refresh, but fall back to the cached copy on failure
    try {
      const fresh = await refreshEdition();
      return fresh.articles.length > 0 ? fresh : cached;
    } catch {
      return cached;
    }
  }
  return refreshEdition();
}

export async function getArchivedEdition(date: string): Promise<Edition | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (date === istDate()) {
    // Today: prefer the live edition
    const current = await getEdition();
    if (current.date === date) return current;
  }
  return readJson<Edition>(path.join(ARCHIVE_DIR, `${date}.json`));
}

/** Look up a single article by its 12-char hash id. */
export async function getArticleById(
  id: string,
): Promise<Article | null> {
  // Search the live edition first
  const current = await readJson<Edition>(CURRENT);
  if (current) {
    const found = current.articles.find((a) => a.id === id);
    if (found) return found;
  }
  // Fall back to today's archive (may contain older merged articles)
  const todayFile = path.join(ARCHIVE_DIR, `${istDate()}.json`);
  const today = await readJson<Edition>(todayFile);
  if (today) {
    const found = today.articles.find((a) => a.id === id);
    if (found) return found;
  }
  return null;
}

export async function listArchiveDates(): Promise<string[]> {
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    return files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace(".json", ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
