import { app, BrowserWindow, safeStorage, shell } from 'electron'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CatalogCredentialsStore } from './catalog-credentials'
import { LibraryDatabase } from './database'
import { migrateLegacyLibrary } from './library-migration'
import { safeExternalUrl } from '../shared/external-url'
import { registerIpcHandlers } from './ipc'
import { TvdbClient } from './tvdb'
import { tvdbApiKey } from './tvdb-config'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const isMac = process.platform === 'darwin'
app.setName('libmov')

if (process.env.LIBMOV_USER_DATA_DIR) {
  app.setPath('userData', process.env.LIBMOV_USER_DATA_DIR)
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    backgroundColor: '#0a0a0a',
    height: 900,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: 'libmov',
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 18 } } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(currentDirectory, 'preload.mjs'),
      sandbox: true,
    },
    width: 1440,
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    const external = safeExternalUrl(url)
    if (external) void shell.openExternal(external).catch(() => undefined)
    return { action: 'deny' }
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  if (process.env.LIBMOV_CAPTURE_PATH) {
    window.webContents.once('did-finish-load', () => {
      const delay = Number(process.env.LIBMOV_CAPTURE_DELAY_MS ?? '2500')

      setTimeout(() => {
        void window
          .capturePage()
          .then((image) => writeFile(process.env.LIBMOV_CAPTURE_PATH!, image.toPNG()))
      }, Number.isFinite(delay) ? delay : 2500)
    })
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void window.loadFile(join(currentDirectory, '../dist/index.html'))
  }

  return window
}

app.whenReady().then(async () => {
  if (!process.env.LIBMOV_USER_DATA_DIR) {
    await migrateLegacyLibrary(join(app.getPath('appData'), 'Fulcrum'), app.getPath('userData'))
  }

  const database = new LibraryDatabase(app.getPath('userData'))
  const credentialsStore = new CatalogCredentialsStore(app.getPath('userData'), safeStorage)
  const savedCredentials = await credentialsStore.read()
  const tvdb = new TvdbClient(savedCredentials?.apiKey ?? tvdbApiKey, savedCredentials?.pin)

  registerIpcHandlers(database, tvdb, credentialsStore)
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})
