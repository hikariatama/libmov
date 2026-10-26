import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type {
  LibraryMediaItem,
  LibrarySnapshot,
  LibraryStatus,
  MediaList,
  MediaSummary,
  StoredMediaList,
} from '../shared/media'
import { mediaKeyOf, watchlistSlug } from '../shared/media'

type ListRow = {
  created_at: string
  id: string
  item_count: number
  name: string
  slug: string
  system: number
  updated_at: string
}

type ItemRow = {
  added_at: string
  artwork_thumbnail_url: string | null
  artwork_url: string | null
  backdrop_url: string | null
  genres: string
  list_id: string
  media_id: string
  media_key: string
  media_type: 'movie' | 'tv'
  original_country: string | null
  original_language: string
  overview: string
  release_date: string | null
  score: number | null
  title: string
  title_hint: string
  year: string | null
}

type StatusRow = {
  list_ids: string | null
  media_key: string
  watched_at: string | null
}

function now(): string {
  return new Date().toISOString()
}

function readArrayOfStrings(value: string | null): string[] {
  if (!value) {
    return []
  }

  const parsed = JSON.parse(value)
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
}

function toJsonText(value: string[]): string {
  return JSON.stringify(value)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeList(list: ListRow): MediaList {
  return {
    createdAt: list.created_at,
    id: list.id,
    itemCount: list.item_count,
    name: list.name,
    slug: list.slug,
    system: Boolean(list.system),
    updatedAt: list.updated_at,
  }
}

function makeStatus(row: StatusRow): LibraryStatus {
  const listIds = readArrayOfStrings(row.list_ids)

  return {
    inWatchlist: listIds.includes(watchlistSlug),
    listIds,
    watched: row.watched_at !== null,
    watchedAt: row.watched_at,
  }
}

function makeMediaItem(row: ItemRow, status: LibraryStatus): LibraryMediaItem {
  return {
    addedAt: row.added_at,
    artworkThumbnailUrl: row.artwork_thumbnail_url,
    artworkUrl: row.artwork_url,
    backdropUrl: row.backdrop_url,
    genres: readArrayOfStrings(row.genres),
    mediaId: row.media_id,
    mediaType: row.media_type,
    originalCountry: row.original_country,
    originalLanguage: row.original_language,
    overview: row.overview,
    releaseDate: row.release_date,
    score: row.score,
    status,
    title: row.title,
    titleHint: row.title_hint,
    year: row.year,
  }
}

export class LibraryDatabase {
  private readonly database: Database.Database

  constructor(userDataPath: string) {
    this.database = new Database(join(userDataPath, 'library.sqlite'))
    this.database.pragma('journal_mode = WAL')
    this.database.pragma('foreign_keys = ON')
    this.initialize()
  }

  private initialize(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS media_cache (
        media_key TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
        title TEXT NOT NULL,
        overview TEXT NOT NULL,
        artwork_url TEXT,
        artwork_thumbnail_url TEXT,
        backdrop_url TEXT,
        release_date TEXT,
        year TEXT,
        score REAL,
        genres TEXT NOT NULL DEFAULT '[]',
        original_language TEXT NOT NULL DEFAULT '',
        original_country TEXT,
        title_hint TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS list_items (
        list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        media_key TEXT NOT NULL REFERENCES media_cache(media_key) ON DELETE CASCADE,
        added_at TEXT NOT NULL,
        PRIMARY KEY (list_id, media_key)
      );
      CREATE TABLE IF NOT EXISTS watched_entries (
        media_key TEXT PRIMARY KEY REFERENCES media_cache(media_key) ON DELETE CASCADE,
        watched_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON list_items(list_id, added_at DESC);
    `)
    this.ensureWatchlist()
  }

  private ensureWatchlist(): void {
    const existing = this.database.prepare('SELECT id FROM lists WHERE slug = ?').get(watchlistSlug)

    if (existing) {
      return
    }

    const timestamp = now()
    this.database
      .prepare('INSERT INTO lists (id, name, slug, system, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(watchlistSlug, 'Watchlist', watchlistSlug, timestamp, timestamp)
  }

  private upsertMedia(media: MediaSummary): void {
    this.database
      .prepare(
        `
          INSERT INTO media_cache (
            media_key,
            media_id,
            media_type,
            title,
            overview,
            artwork_url,
            artwork_thumbnail_url,
            backdrop_url,
            release_date,
            year,
            score,
            genres,
            original_language,
            original_country,
            title_hint,
            updated_at
          ) VALUES (
            @mediaKey,
            @mediaId,
            @mediaType,
            @title,
            @overview,
            @artworkUrl,
            @artworkThumbnailUrl,
            @backdropUrl,
            @releaseDate,
            @year,
            @score,
            @genres,
            @originalLanguage,
            @originalCountry,
            @titleHint,
            @updatedAt
          )
          ON CONFLICT(media_key) DO UPDATE SET
            title = excluded.title,
            overview = excluded.overview,
            artwork_url = excluded.artwork_url,
            artwork_thumbnail_url = excluded.artwork_thumbnail_url,
            backdrop_url = excluded.backdrop_url,
            release_date = excluded.release_date,
            year = excluded.year,
            score = excluded.score,
            genres = excluded.genres,
            original_language = excluded.original_language,
            original_country = excluded.original_country,
            title_hint = excluded.title_hint,
            updated_at = excluded.updated_at
        `,
      )
      .run({
        artworkThumbnailUrl: media.artworkThumbnailUrl,
        artworkUrl: media.artworkUrl,
        backdropUrl: media.backdropUrl,
        genres: toJsonText(media.genres),
        mediaId: media.mediaId,
        mediaKey: mediaKeyOf(media),
        mediaType: media.mediaType,
        originalCountry: media.originalCountry,
        originalLanguage: media.originalLanguage,
        overview: media.overview,
        releaseDate: media.releaseDate,
        score: media.score,
        title: media.title,
        titleHint: media.titleHint,
        updatedAt: now(),
        year: media.year,
      })
  }

  private readLists(): MediaList[] {
    const rows = this.database
      .prepare(
        `
          SELECT
            lists.id,
            lists.name,
            lists.slug,
            lists.system,
            lists.created_at,
            lists.updated_at,
            COUNT(list_items.media_key) AS item_count
          FROM lists
          LEFT JOIN list_items ON list_items.list_id = lists.id
          GROUP BY lists.id
          ORDER BY lists.system DESC, lists.updated_at DESC, lists.name COLLATE NOCASE ASC
        `,
      )
      .all() as ListRow[]

    return rows.map(makeList)
  }

  private readStatuses(): Record<string, LibraryStatus> {
    const rows = this.database
      .prepare(
        `
          SELECT
            media_cache.media_key,
            (
              SELECT json_group_array(list_items.list_id)
              FROM list_items
              WHERE list_items.media_key = media_cache.media_key
            ) AS list_ids,
            watched_entries.watched_at
          FROM media_cache
          LEFT JOIN watched_entries ON watched_entries.media_key = media_cache.media_key
          WHERE EXISTS (
            SELECT 1 FROM list_items WHERE list_items.media_key = media_cache.media_key
          ) OR watched_entries.media_key IS NOT NULL
        `,
      )
      .all() as StatusRow[]

    return Object.fromEntries(rows.map((row) => [row.media_key, makeStatus(row)]))
  }

  private readItemsByList(statuses: Record<string, LibraryStatus>): Map<string, LibraryMediaItem[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
            list_items.list_id,
            list_items.added_at,
            media_cache.media_key,
            media_cache.media_id,
            media_cache.media_type,
            media_cache.title,
            media_cache.overview,
            media_cache.artwork_url,
            media_cache.artwork_thumbnail_url,
            media_cache.backdrop_url,
            media_cache.release_date,
            media_cache.year,
            media_cache.score,
            media_cache.genres,
            media_cache.original_language,
            media_cache.original_country,
            media_cache.title_hint
          FROM list_items
          INNER JOIN media_cache ON media_cache.media_key = list_items.media_key
          ORDER BY list_items.added_at DESC
        `,
      )
      .all() as ItemRow[]

    const grouped = new Map<string, LibraryMediaItem[]>()

    for (const row of rows) {
      const status = statuses[row.media_key] ?? {
        inWatchlist: row.list_id === watchlistSlug,
        listIds: row.list_id ? [row.list_id] : [],
        watched: false,
        watchedAt: null,
      }
      const existing = grouped.get(row.list_id) ?? []
      existing.push(makeMediaItem(row, status))
      grouped.set(row.list_id, existing)
    }

    return grouped
  }

  private readRecentlyWatched(statuses: Record<string, LibraryStatus>): LibraryMediaItem[] {
    const rows = this.database
      .prepare(
        `
          SELECT
            '' AS list_id,
            watched_entries.watched_at AS added_at,
            media_cache.media_key,
            media_cache.media_id,
            media_cache.media_type,
            media_cache.title,
            media_cache.overview,
            media_cache.artwork_url,
            media_cache.artwork_thumbnail_url,
            media_cache.backdrop_url,
            media_cache.release_date,
            media_cache.year,
            media_cache.score,
            media_cache.genres,
            media_cache.original_language,
            media_cache.original_country,
            media_cache.title_hint
          FROM watched_entries
          INNER JOIN media_cache ON media_cache.media_key = watched_entries.media_key
          ORDER BY watched_entries.watched_at DESC
        `,
      )
      .all() as ItemRow[]

    return rows.map((row) =>
      makeMediaItem(
        row,
        statuses[row.media_key] ?? {
          inWatchlist: false,
          listIds: [],
          watched: true,
          watchedAt: row.added_at,
        },
      ),
    )
  }

  snapshot(): LibrarySnapshot {
    const lists = this.readLists()
    const statuses = this.readStatuses()
    const groupedItems = this.readItemsByList(statuses)
    const recentlyWatched = this.readRecentlyWatched(statuses)
    const hydratedLists: StoredMediaList[] = lists.map((list) => ({
      ...list,
      items: groupedItems.get(list.id) ?? [],
    }))

    return {
      lists: hydratedLists,
      recentlyWatched,
      statuses,
      watchlist: groupedItems.get(watchlistSlug) ?? [],
    }
  }

  createList(name: string): LibrarySnapshot {
    const normalized = name.trim()

    if (!normalized) {
      throw new Error('List name cannot be empty.')
    }

    const baseSlug = slugify(normalized) || 'list'
    let nextSlug = baseSlug
    let counter = 1

    while (this.database.prepare('SELECT 1 FROM lists WHERE slug = ?').get(nextSlug) !== undefined) {
      counter += 1
      nextSlug = `${baseSlug}-${counter}`
    }

    const timestamp = now()
    this.database
      .prepare('INSERT INTO lists (id, name, slug, system, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
      .run(randomUUID(), normalized, nextSlug, timestamp, timestamp)

    return this.snapshot()
  }

  setListMembership(listId: string, media: MediaSummary, add: boolean): LibrarySnapshot {
    this.upsertMedia(media)

    const timestamp = now()
    const listExists = this.database.prepare('SELECT id FROM lists WHERE id = ?').get(listId)

    if (!listExists) {
      throw new Error('List not found.')
    }

    if (add) {
      this.database
        .prepare(
          `
            INSERT INTO list_items (list_id, media_key, added_at)
            VALUES (?, ?, ?)
            ON CONFLICT(list_id, media_key) DO NOTHING
          `,
        )
        .run(listId, mediaKeyOf(media), timestamp)
    } else {
      this.database.prepare('DELETE FROM list_items WHERE list_id = ? AND media_key = ?').run(listId, mediaKeyOf(media))
    }

    this.database.prepare('UPDATE lists SET updated_at = ? WHERE id = ?').run(timestamp, listId)

    return this.snapshot()
  }

  setWatched(media: MediaSummary, watched: boolean): LibrarySnapshot {
    this.upsertMedia(media)

    if (watched) {
      this.database
        .prepare(
          `
            INSERT INTO watched_entries (media_key, watched_at)
            VALUES (?, ?)
            ON CONFLICT(media_key) DO UPDATE SET watched_at = excluded.watched_at
          `,
        )
        .run(mediaKeyOf(media), now())
    } else {
      this.database.prepare('DELETE FROM watched_entries WHERE media_key = ?').run(mediaKeyOf(media))
    }

    return this.snapshot()
  }

  setWatchedMany(mediaItems: MediaSummary[]): LibrarySnapshot {
    const write = this.database.transaction((items: MediaSummary[]) => {
      for (const media of items) {
        this.upsertMedia(media)
        this.database
          .prepare(
            `
              INSERT INTO watched_entries (media_key, watched_at)
              VALUES (?, ?)
              ON CONFLICT(media_key) DO UPDATE SET watched_at = excluded.watched_at
            `,
          )
          .run(mediaKeyOf(media), now())
      }
    })

    write(mediaItems)

    return this.snapshot()
  }
}
