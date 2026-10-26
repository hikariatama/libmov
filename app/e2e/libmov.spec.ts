import { mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

const appRoot = resolve(import.meta.dirname, '..')

async function launchLibmov(): Promise<{
  app: ElectronApplication
  page: Page
  userDataDir: string
}> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'libmov-e2e-'))
  const app = await electron.launch({
    args: ['.'],
    cwd: appRoot,
    env: {
      ...process.env,
      LIBMOV_USER_DATA_DIR: userDataDir,
    },
    // iCloud Drive checkouts break the framework symlinks inside node_modules/electron, so allow an external binary.
    executablePath: process.env.LIBMOV_ELECTRON_PATH ?? join(appRoot, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByTestId('search-trigger')).toBeVisible({ timeout: 60000 })

  return { app, page, userDataDir }
}

async function readCount(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(testId).innerText()
  return Number.parseInt(text.replace(/\D/g, ''), 10)
}

async function openSearch(page: Page, query: string): Promise<void> {
  await page.keyboard.press('Meta+K')
  await expect(page.getByTestId('search-input')).toBeFocused()
  await page.getByTestId('search-input').fill(query)
  await expect.poll(() => readCount(page, 'search-results-count'), { timeout: 20000 }).toBeGreaterThan(0)
}

test.afterEach(async () => {
  const context = test.info().annotations.find((annotation) => annotation.type === 'userDataDir')

  if (context?.description) {
    await rm(context.description, { force: true, recursive: true })
  }
})

test('loads more results, opens detail from search, and restores search focus on escape', async () => {
  const { app, page, userDataDir } = await launchLibmov()
  test.info().annotations.push({ type: 'userDataDir', description: userDataDir })

  try {
    await openSearch(page, 'star')

    const initialCount = await readCount(page, 'search-results-count')
    let loadedCount = initialCount

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await page.getByTestId('search-results-scroll').evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await page.waitForTimeout(700)
      loadedCount = await readCount(page, 'search-results-count')

      if (loadedCount > initialCount) {
        break
      }
    }

    expect(loadedCount).toBeGreaterThan(initialCount)
    await page.keyboard.press('ArrowDown')
    await page.screenshot({ path: 'test-results/search-results.png' })

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('detail-page')).toBeVisible()
    await expect(page.getByTestId('detail-back')).toBeFocused()
    await expect(page.getByTestId('detail-facts')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: 'test-results/detail-page.png' })

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-results-panel')).toBeVisible()
    await expect(page.getByTestId('search-input')).toBeFocused()
  } finally {
    await app.close()
  }
})

test('keyboard shortcuts update lists and the library opens detail without a mouse', async () => {
  const { app, page, userDataDir } = await launchLibmov()
  test.info().annotations.push({ type: 'userDataDir', description: userDataDir })

  try {
    await expect(page.getByTestId('watchlist-count')).toHaveText('0')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await page.screenshot({ path: 'test-results/watchlist-empty.png' })

    await openSearch(page, 'severance')
    await page.keyboard.press('Meta+L')
    await expect(page.getByTestId('watchlist-count')).toHaveText('1')
    await expect(page.getByTestId('status-watchlist')).toBeVisible()
    await expect(page.getByTestId('toast')).toBeVisible()

    await page.keyboard.press('Meta+D')
    await expect(page.getByTestId('status-watched')).toBeVisible()

    for (const query of ['dune', 'arrival', 'fargo']) {
      await page.getByTestId('search-input').fill(query)
      await expect(page.getByTestId('search-result-row').first()).toContainText(new RegExp(query, 'i'), { timeout: 20000 })
      await page.keyboard.press('Meta+L')
      await page.waitForTimeout(150)
    }

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-palette')).toBeHidden()
    await expect(page.getByTestId('watchlist-grid').getByTestId('poster-image').first()).toBeVisible()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'test-results/watchlist.png' })

    await page.keyboard.press('2')
    await expect(page.getByTestId('view-watched')).toBeVisible()
    await expect(page.getByTestId('watched-count')).toHaveText('1')

    await page.keyboard.press('1')
    await page.getByTestId('watchlist-grid').getByTestId('poster').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('watchlist-grid').getByTestId('poster').nth(1)).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('detail-page')).toBeVisible()
    await expect(page.getByTestId('detail-watchlist-toggle')).toHaveAttribute('data-state', 'on')
    await page.keyboard.press('Meta+L')
    await expect(page.getByTestId('detail-watchlist-toggle')).toHaveAttribute('data-state', 'off')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('watchlist-count')).toHaveText('3')

    await page.keyboard.press('3')
    await expect(page.getByTestId('discover-grid').getByTestId('poster-image').first()).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: 'test-results/discover.png' })
  } finally {
    await app.close()
  }
})
