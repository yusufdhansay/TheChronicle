import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { buildEdition, istDate } from "./news";
import { isNoise } from "./classify";
import type { Article, Edition } from "./types";

/**
 * Edition store supporting both serverless Redis (Upstash / Vercel KV) and local file storage.
 *
 * - Checks for environment variables from either Upstash Redis (`UPSTASH_REDIS_REST_URL`)
 *   or Vercel KV (`KV_REST_API_URL`).
 * - In local development (without Redis credentials), it falls back to local file storage in `data/`.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const CURRENT = path.join(DATA_DIR, "current.json");

export const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const IS_REDIS = !!(REDIS_URL && REDIS_TOKEN);

const redis = IS_REDIS
  ? new Redis({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    })
  : null;

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
  if (IS_REDIS && redis) {
    const key = `edition:archive:${edition.date}`;
    let existing = await redis.get<Edition>(key);
    if (existing) {
      const ids = new Set(edition.articles.map((a) => a.id));
      const carried = existing.articles.filter(
        (a) => !ids.has(a.id) && !isNoise(`${a.title}. ${a.summary}`),
      );
      edition = { ...edition, articles: [...edition.articles, ...carried] };
    }
    await redis.set(key, edition);
    await redis.sadd("edition:archive_dates", edition.date);
  } else {
    const file = path.join(ARCHIVE_DIR, `${edition.date}.json`);
    const existing = await readJson<Edition>(file);
    if (existing) {
      const ids = new Set(edition.articles.map((a) => a.id));
      const carried = existing.articles.filter(
        (a) => !ids.has(a.id) && !isNoise(`${a.title}. ${a.summary}`),
      );
      edition = { ...edition, articles: [...edition.articles, ...carried] };
    }
    await writeJson(file, edition);
  }
}

export async function refreshEdition(): Promise<Edition> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const edition = await buildEdition();
        if (edition.articles.length > 0) {
          if (IS_REDIS && redis) {
            await redis.set("edition:current", edition);
            await archive(edition);
          } else {
            await writeJson(CURRENT, edition);
            await archive(edition);
          }
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
  if (IS_REDIS && redis) {
    const cached = await redis.get<Edition>("edition:current");
    if (cached) {
      const age = Date.now() - +new Date(cached.fetchedAt);
      if (age < REFRESH_INTERVAL_MS) return cached;
      try {
        const fresh = await refreshEdition();
        return fresh.articles.length > 0 ? fresh : cached;
      } catch {
        return cached;
      }
    }
    return refreshEdition();
  } else {
    const cached = await readJson<Edition>(CURRENT);
    if (cached) {
      const age = Date.now() - +new Date(cached.fetchedAt);
      if (age < REFRESH_INTERVAL_MS) return cached;
      try {
        const fresh = await refreshEdition();
        return fresh.articles.length > 0 ? fresh : cached;
      } catch {
        return cached;
      }
    }
    return refreshEdition();
  }
}

export async function getArchivedEdition(date: string): Promise<Edition | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (date === istDate()) {
    const current = await getEdition();
    if (current.date === date) return current;
  }
  if (IS_REDIS && redis) {
    return await redis.get<Edition>(`edition:archive:${date}`);
  } else {
    return readJson<Edition>(path.join(ARCHIVE_DIR, `${date}.json`));
  }
}

/** Look up a single article by its 12-char hash id. */
export async function getArticleById(
  id: string,
): Promise<Article | null> {
  if (IS_REDIS && redis) {
    const current = await redis.get<Edition>("edition:current");
    if (current) {
      const found = current.articles.find((a) => a.id === id);
      if (found) return found;
    }
    const today = await redis.get<Edition>(`edition:archive:${istDate()}`);
    if (today) {
      const found = today.articles.find((a) => a.id === id);
      if (found) return found;
    }
  } else {
    const current = await readJson<Edition>(CURRENT);
    if (current) {
      const found = current.articles.find((a) => a.id === id);
      if (found) return found;
    }
    const todayFile = path.join(ARCHIVE_DIR, `${istDate()}.json`);
    const today = await readJson<Edition>(todayFile);
    if (today) {
      const found = today.articles.find((a) => a.id === id);
      if (found) return found;
    }
  }
  return null;
}

export async function listArchiveDates(): Promise<string[]> {
  if (IS_REDIS && redis) {
    try {
      const dates = await redis.smembers("edition:archive_dates");
      // filter out potential nulls or non-string elements safely
      const cleanDates = dates.filter((d): d is string => typeof d === "string");
      return cleanDates.sort().reverse();
    } catch {
      return [];
    }
  } else {
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
}
