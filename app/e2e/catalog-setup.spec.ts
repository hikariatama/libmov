import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { _electron as electron, expect, test } from '@playwright/test'

const appRoot = process.env.LIBMOV_TEST_APP_ROOT ?? resolve(import.meta.dirname, '..')
const executablePath = process.env.LIBMOV_ELECTRON_PATH ?? join(appRoot, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')

async function launch(userDataDir: string) {
  const app = await electron.launch({
    args: ['.'], cwd: appRoot, executablePath,
    env: { ...process.env, TVDB_API_KEY: '', LIBMOV_USER_DATA_DIR: userDataDir },
  })
  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].setSize(1280, 800) })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}

test('missing key, validation, encrypted persistence and restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'libmov-setup-'))
  let instance = await launch(directory)
  try {
    const { app, page } = instance
    await expect(page.getByRole('heading', { name: 'Connect to TheTVDB' })).toBeVisible()
    await expect(page.getByTestId('search-trigger')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled()
    await page.evaluate(() => document.fonts.ready)
    if (process.env.LIBMOV_SETUP_SCREENSHOT) await page.screenshot({ path: process.env.LIBMOV_SETUP_SCREENSHOT })

    await app.evaluate(({ net }) => {
      net.fetch = async (input, options) => {
        if (!String(input).endsWith('/login')) throw new Error('Unexpected request in isolated setup test')
        const payload = JSON.parse(String(options?.body))
        const valid = payload.apikey === 'test-only-accepted-key' && payload.pin === 'test-only-pin'
        return new Response(JSON.stringify(valid ? { data: { token: 'test-only-session' } } : { message: 'Invalid apikey' }), { status: valid ? 200 : 401, headers: { 'Content-Type': 'application/json' } })
      }
    })
    await page.getByLabel('API key', { exact: true }).fill('test-only-rejected-key')
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('did not accept this key')
    await expect(page.getByLabel('API key', { exact: true })).toHaveValue('test-only-rejected-key')
    await expect(readFile(join(directory, 'catalog-credentials.bin'))).rejects.toThrow()
    await page.getByRole('button', { name: 'Show API key' }).click()
    await expect(page.getByLabel('API key', { exact: true })).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide API key' }).click()
    await page.getByLabel('API key', { exact: true }).fill('  test-only-accepted-key  ')
    await page.getByText('My key requires a subscriber PIN').click()
    await page.getByLabel('Subscriber PIN', { exact: true }).fill('test-only-pin')
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(page.getByTestId('search-trigger')).toBeVisible()
    await expect(page.getByTestId('catalog-setup')).toHaveCount(0)
    const bytes = await readFile(join(directory, 'catalog-credentials.bin'))
    expect(bytes.includes(Buffer.from('test-only-accepted-key'))).toBe(false)
    expect(bytes.includes(Buffer.from('test-only-pin'))).toBe(false)
    await app.close()
    instance = await launch(directory)
    await expect(instance.page.getByTestId('search-trigger')).toBeVisible()
    await expect(instance.page.getByTestId('catalog-setup')).toHaveCount(0)
  } finally {
    await instance.app.close()
    await rm(directory, { force: true, recursive: true })
  }
})
