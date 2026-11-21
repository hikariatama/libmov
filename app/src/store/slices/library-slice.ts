import type { StateCreator } from 'zustand'
import type {
  LibrarySnapshot,
  MediaSummary,
  SetWatchedByTvdbIdImport,
  SetWatchedByTvdbIdsResponse,
} from '../../../shared/media'
import { mediaKeyOf } from '../../../shared/media'
import type { AppStore } from '../app-store'

export interface LibrarySlice {
  importPending: boolean
  createList: (name: string) => Promise<void>
  library: LibrarySnapshot
  setListMembership: (listId: string, media: MediaSummary, add: boolean) => Promise<void>
  setWatchedByTvdbIds: (mediaItems: SetWatchedByTvdbIdImport[]) => Promise<SetWatchedByTvdbIdsResponse>
  setWatched: (media: MediaSummary, watched: boolean) => Promise<void>
  toggleWatched: (media: MediaSummary) => Promise<void>
  toggleWatchlist: (media: MediaSummary) => Promise<void>
}

const emptyLibrary: LibrarySnapshot = {
  lists: [],
  recentlyWatched: [],
  statuses: {},
  watchlist: [],
}

export const createLibrarySlice: StateCreator<
  AppStore,
  [],
  [],
  LibrarySlice
> = (set, get) => ({
  importPending: false,
  createList: async (name) => {
    const library = await window.libmov.createList({ name })
    set({ library })
  },
  library: emptyLibrary,
  setListMembership: async (listId, media, add) => {
    const library = await window.libmov.setListMembership({ add, listId, media })
    set({ library })
  },
  setWatchedByTvdbIds: async (mediaItems) => {
    if (get().importPending) throw new Error('An import is already in progress.')
    set({ importPending: true })
    try {
      const result: unknown = await window.libmov.setWatchedByTvdbIds({ mediaItems })

      if (isSetWatchedByTvdbIdsResponse(result)) {
        set({ library: result.library })
        return result
      }

      if (isLibrarySnapshot(result)) {
        set({ library: result })
        const importedIds = new Set<string>()
        const skippedIds: string[] = []
        for (const input of mediaItems) {
          const matches = result.recentlyWatched.filter((media) => media.mediaId === input.mediaId && (!input.mediaType || input.mediaType === media.mediaType))
          if (matches.length === 1) importedIds.add(mediaKeyOf(matches[0]!))
          else skippedIds.push(`${input.mediaType ?? 'any'}:${input.mediaId}`)
        }
        return { importedIds: [...importedIds], library: result, skippedIds }
      }

      throw new Error('Import returned an invalid library snapshot.')
    } finally {
      set({ importPending: false })
    }
  },
  setWatched: async (media, watched) => {
    const library = await window.libmov.setWatched({ media, watched })
    set({ library })
  },
  toggleWatched: async (media) => {
    const watched = !(get().library.statuses[mediaKeyOf(media)]?.watched ?? false)

    await get().setWatched(media, watched)
    get().showToast(watched ? `${media.title} marked watched` : `${media.title} unmarked`)
  },
  toggleWatchlist: async (media) => {
    const add = !(get().library.statuses[mediaKeyOf(media)]?.inWatchlist ?? false)

    await get().setListMembership('watchlist', media, add)
    get().showToast(add ? `${media.title} added to Watchlist` : `${media.title} removed from Watchlist`)
  },
})

function isSetWatchedByTvdbIdsResponse(value: unknown): value is SetWatchedByTvdbIdsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.importedIds) &&
    isLibrarySnapshot(value.library) &&
    Array.isArray(value.skippedIds)
  )
}

function isLibrarySnapshot(value: unknown): value is LibrarySnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.lists) &&
    Array.isArray(value.recentlyWatched) &&
    isRecord(value.statuses) &&
    Array.isArray(value.watchlist)
  )
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}
