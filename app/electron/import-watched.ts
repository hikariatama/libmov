import type { MediaSummary, SetWatchedByTvdbIdImport } from '../shared/media'
import { mediaKeyOf } from '../shared/media'
import { importConcurrency, maxImportItems } from '../shared/import-limits'

export function validateImport(request: unknown): SetWatchedByTvdbIdImport[] {
  if (!request || typeof request !== 'object' || !('mediaItems' in request) || !Array.isArray(request.mediaItems) || request.mediaItems.length < 1 || request.mediaItems.length > maxImportItems) {
    throw new Error(`Import between 1 and ${maxImportItems} titles at a time.`)
  }
  const items: SetWatchedByTvdbIdImport[] = request.mediaItems.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('mediaId' in item) || typeof item.mediaId !== 'string' || !/^\d{1,16}$/.test(item.mediaId) ||
      ('mediaType' in item && item.mediaType !== undefined && item.mediaType !== 'movie' && item.mediaType !== 'tv') ||
      ('title' in item && item.title !== undefined && (typeof item.title !== 'string' || item.title.length > 500))) {
      throw new Error('Import contains an invalid title or TheTVDB ID.')
    }
    return item as SetWatchedByTvdbIdImport
  })
  return [...new Map(items.map((item) => [`${item.mediaType ?? 'any'}:${item.mediaId}`, item])).values()]
}

export async function resolveImport(items: SetWatchedByTvdbIdImport[], resolve: (item: SetWatchedByTvdbIdImport) => Promise<MediaSummary>) {
  const results: (MediaSummary | null)[] = new Array(items.length).fill(null)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(importConcurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      try { results[index] = await resolve(items[index]!) } catch { /* An unavailable title is reported as skipped. */ }
    }
  }))
  const imported = results.filter((item): item is MediaSummary => item !== null)
  return {
    imported,
    importedIds: [...new Set(imported.map(mediaKeyOf))],
    skippedIds: items.filter((_, index) => results[index] === null).map((item) => `${item.mediaType ?? 'any'}:${item.mediaId}`),
  }
}
