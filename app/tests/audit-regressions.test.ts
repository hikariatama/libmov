import { expect, test } from 'bun:test'
import { CatalogPager } from '../electron/catalog-pager'
import { safeExternalUrl } from '../shared/external-url'
import { resolveImport, validateImport } from '../electron/import-watched'
import { importConcurrency, maxImportItems } from '../shared/import-limits'
import type { MediaSummary } from '../shared/media'

const media = (id: string, mediaType: 'movie' | 'tv' = 'movie') => ({ mediaId: id, mediaType, title: id }) as MediaSummary

test('external URLs accept HTTPS and reject other protocols and invalid URLs', () => {
  expect(safeExternalUrl('https://www.thetvdb.com/login')).toBe('https://www.thetvdb.com/login')
  for (const value of ['http://example.com', 'mailto:hello@example.com', '', null]) expect(safeExternalUrl(value)).toBeNull()
})

test('catalog pages follow variable visible chunks including empty chunks, deduplication and restoration', async () => {
  const chunks = [[1, 2], [], [2, 3, 4, 5], [6]]
  const calls: number[] = []
  const pager = new CatalogPager(async (page) => {
    calls.push(page)
    return { items: chunks[page] ?? [], hasMore: page < chunks.length - 1 }
  }, String)
  expect(await pager.page(2, 2)).toEqual({ items: [3, 4], page: 2, hasMore: true })
  expect(await pager.page(1, 2)).toEqual({ items: [1, 2], page: 1, hasMore: true })
  expect(await pager.page(3, 2)).toEqual({ items: [5, 6], page: 3, hasMore: false })
  expect(calls).toEqual([0, 1, 2, 3])
})

test('catalog retries a failed chunk without losing or repeating positions', async () => {
  let fail = true
  const pager = new CatalogPager(async (page) => {
    if (page === 1 && fail) { fail = false; throw new Error('temporary failure') }
    return { items: [page], hasMore: page < 2 }
  }, String)
  await expect(pager.page(1, 2)).rejects.toThrow('temporary failure')
  expect(await pager.page(1, 2)).toEqual({ items: [0, 1], page: 1, hasMore: true })
  expect(await pager.page(2, 2)).toEqual({ items: [2], page: 2, hasMore: false })
})

test('import validates batch shape, limits and deduplicates composite input keys', () => {
  expect(() => validateImport({ mediaItems: new Array(maxImportItems + 1).fill({ mediaId: '1' }) })).toThrow()
  expect(() => validateImport({ mediaItems: [{ mediaId: '1', mediaType: 'unknown' }] })).toThrow()
  expect(validateImport({ mediaItems: [{ mediaId: '1', mediaType: 'tv' }, { mediaId: '1', mediaType: 'movie' }, { mediaId: '1', mediaType: 'tv' }] })).toHaveLength(2)
})

test('import bounds concurrency and distinguishes movie and series with the same ID', async () => {
  let active = 0
  let peak = 0
  const items = validateImport({ mediaItems: Array.from({ length: 12 }, (_, index) => ({ mediaId: String(Math.floor(index / 2)), mediaType: index % 2 ? 'tv' : 'movie' })) })
  const result = await resolveImport(items, async (item) => {
    active += 1
    peak = Math.max(active, peak)
    await new Promise((resolve) => setTimeout(resolve, 1))
    active -= 1
    if (item.mediaType === 'tv' && item.mediaId === '0') throw new Error('unavailable')
    return media(item.mediaId, item.mediaType)
  })
  expect(peak).toBe(importConcurrency)
  expect(active).toBe(0)
  expect(result.importedIds).toContain('movie:0')
  expect(result.importedIds).not.toContain('tv:0')
  expect(result.skippedIds).toEqual(['tv:0'])
  expect(result.imported).toHaveLength(11)
})
