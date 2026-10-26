import { ipcMain } from 'electron'
import { ipcChannels, type ConfigureCatalogResult } from '../shared/ipc'
import type { AppBootstrap, MediaSummary, SetWatchedByTvdbIdsRequest } from '../shared/media'
import { CatalogCredentialsStore } from './catalog-credentials'
import { LibraryDatabase } from './database'
import { TvdbClient } from './tvdb'

function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function registerIpcHandlers(database: LibraryDatabase, initialClient: TvdbClient, credentials: CatalogCredentialsStore): void {
  let tvdb = initialClient
  let configuring = false

  ipcMain.handle(ipcChannels.configureCatalog, async (_event, request: unknown): Promise<ConfigureCatalogResult> => {
    if (_event.senderFrame !== _event.sender.mainFrame) return { ok: false, error: 'Open setup in the main app window.' }
    if (!request || typeof request !== 'object' || !('apiKey' in request) || typeof request.apiKey !== 'string') {
      return { ok: false, error: 'Enter your TheTVDB API key.' }
    }
    const apiKey = request.apiKey.trim()
    const pin = 'pin' in request && typeof request.pin === 'string' ? request.pin.trim() : undefined
    if (!apiKey || apiKey.length > 512 || /\s/.test(apiKey) || (pin?.length ?? 0) > 128) {
      return { ok: false, error: 'Paste the API key exactly as it appears on TheTVDB.' }
    }
    if (configuring) return { ok: false, error: 'A connection check is already in progress.' }
    configuring = true
    try {
      const candidate = new TvdbClient(apiKey, pin)
      try {
        await candidate.prime()
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        return {
          ok: false,
          error: /401|403|apikey|bearer token/i.test(message)
            ? 'TheTVDB did not accept this key. Check that it is active, and add your subscriber PIN if required.'
            : 'Could not reach TheTVDB. Check your connection and try again.',
        }
      }
      try {
        await credentials.save({ apiKey, pin: pin || undefined })
      } catch {
        return { ok: false, error: 'Could not save your key. Check your system keychain and storage permissions, then try again.' }
      }
      tvdb = candidate
      return { ok: true }
    } finally {
      configuring = false
    }
  })

  ipcMain.handle(ipcChannels.bootstrap, async (): Promise<AppBootstrap> => {
    const payload = {
      library: database.snapshot(),
      searchConfigured: tvdb.isConfigured(),
      searchError: tvdb.isConfigured() ? null : 'TheTVDB key is unavailable.',
    }

    return toPlainJson(payload)
  })

  ipcMain.handle(ipcChannels.getMediaDetail, async (_event, request) => toPlainJson(await tvdb.getMediaDetail(request)))

  ipcMain.handle(ipcChannels.browseCatalog, async (_event, request) => toPlainJson(await tvdb.browseMedia(request)))

  ipcMain.handle(ipcChannels.searchMedia, async (_event, request) => toPlainJson(await tvdb.searchMedia(request)))

  ipcMain.handle(ipcChannels.createList, async (_event, request) => toPlainJson(database.createList(request.name)))

  ipcMain.handle(ipcChannels.setListMembership, async (_event, request) =>
    toPlainJson(database.setListMembership(request.listId, request.media, request.add)),
  )

  ipcMain.handle(ipcChannels.setWatchedByTvdbIds, async (_event, request: SetWatchedByTvdbIdsRequest) => {
    const resolved = await Promise.all(
      request.mediaItems.map(
        async (item): Promise<{ inputId: string; media: MediaSummary } | null> => {
          try {
            return {
              inputId: item.mediaId,
              media: await tvdb.getMediaByTvdbId(item.mediaId, item.mediaType, item.title),
            }
          } catch {
            return null
          }
        },
      ),
    )
    const importedItems = resolved.filter((item): item is { inputId: string; media: MediaSummary } => item !== null)
    const importedIds = new Set(importedItems.map((item) => item.inputId))

    return toPlainJson({
      importedIds: [...importedIds],
      library: database.setWatchedMany(importedItems.map((item) => item.media)),
      skippedIds: request.mediaItems.map((item) => item.mediaId).filter((mediaId: string) => !importedIds.has(mediaId)),
    })
  })

  ipcMain.handle(ipcChannels.setWatched, async (_event, request) =>
    toPlainJson(database.setWatched(request.media, request.watched)),
  )
}
