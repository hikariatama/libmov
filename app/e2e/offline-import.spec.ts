import { chromium, expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

async function launch(configured: boolean) {
  const browser = await chromium.launch({
    executablePath: process.env.LIBMOV_CHROMIUM_PATH,
    args: ['--allow-file-access-from-files', '--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  // Every request is a local fixture; the test must never contact a catalog or load remote artwork.
  await page.route('https://**/*', (route) => route.abort())
  await page.addInitScript((searchConfigured) => {
    const title = { mediaId: '1', mediaType: 'movie', title: 'Synthetic local title', genres: [], overview: 'Local fixture', artworkUrl: null, artworkThumbnailUrl: null, year: '2026', originalLanguage: 'en' }
    const library = { lists: [], recentlyWatched: [title], watchlist: [title], statuses: { 'movie:1': { watched: true, inWatchlist: true } } }
    Reflect.set(window, '__importCalls', 0)
    Reflect.set(window, 'libmov', {
      platform: 'linux',
      bootstrap: async () => ({ library, searchConfigured, searchError: searchConfigured ? null : 'Key unavailable' }),
      configureCatalog: async () => ({ ok: false, error: 'Fixture connection unavailable.' }),
      getMediaDetail: async () => { throw new Error('Catalog unavailable. Local actions still work.') },
      setWatched: async () => library,
      setListMembership: async () => library,
      setWatchedByTvdbIds: async () => {
        Reflect.set(window, '__importCalls', Number(Reflect.get(window, '__importCalls')) + 1)
        return new Promise((resolve) => Reflect.set(window, '__finishImport', () => resolve({ importedIds: ['movie:1'], skippedIds: ['tv:1'], library })))
      },
    })
  }, configured)
  await page.goto(pathToFileURL(resolve('dist/index.html')).href)
  return { browser, page }
}

test('unavailable credentials retain local library access and a reconnect path', async () => {
  const { browser, page } = await launch(false)
  try {
    await page.getByRole('button', { name: 'Open local library' }).click()
    await expect(page.getByTestId('watchlist-count')).toHaveText('1')
    await page.getByTestId('tab-watched').click()
    await expect(page.getByTestId('watched-count')).toHaveText('1')
    await page.getByRole('button', { name: 'Connect catalog' }).click()
    await expect(page.getByRole('heading', { name: 'Connect to TheTVDB' })).toBeVisible()
    await page.getByRole('button', { name: 'Open local library' }).click()
    await expect(page.getByTestId('tab-watched')).toBeVisible()
  } finally { await browser.close() }
})

test('import survives close and remount without a second request or a stale result', async () => {
  const { browser, page } = await launch(true)
  try {
    await page.getByTestId('tab-watched').click()
    await page.getByTestId('import-watched').click()
    const input = page.getByRole('textbox', { name: 'TheTVDB titles to import' })
    await input.fill('1 movie\n1 tv')
    await page.getByRole('button', { name: 'Mark 2 watched' }).click()
    await expect(input).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.getByTestId('tab-watchlist').click()
    await page.getByTestId('tab-watched').click()
    await page.getByTestId('import-watched').click()
    await expect(input).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled()
    expect(await page.evaluate(() => Reflect.get(window, '__importCalls'))).toBe(1)
    await page.evaluate(() => Reflect.get(window, '__finishImport')())
    await expect(input).toBeEnabled()
    await expect(page.getByText('marked watched.', { exact: false })).toHaveCount(0)
    await input.fill('1 movie\n1 tv')
    await page.getByRole('button', { name: 'Mark 2 watched' }).click()
    await page.evaluate(() => Reflect.get(window, '__finishImport')())
    await expect(page.getByText('1 marked watched.', { exact: true })).toBeVisible()
    await expect(page.getByText('Skipped IDs: tv:1', { exact: true })).toBeVisible()
  } finally { await browser.close() }
})
