import type { StateCreator } from 'zustand'
import type { CatalogBrowseResponse, MediaSummary } from '../../../shared/media'
import { mediaKeyOf } from '../../../shared/media'
import type { AppStore } from '../app-store'

export type MovieLibraryStatus = 'error' | 'idle' | 'loading' | 'ready'

export interface MovieLibrarySlice {
  movieLibraryErrorMessage: string | null
  movieLibraryHasMore: boolean
  movieLibraryHasPrevious: boolean
  movieLibraryItems: MediaSummary[]
  movieLibraryEndPage: number
  movieLibraryRestoreIndex: number
  movieLibraryScrollOffset: number
  movieLibraryStartIndex: number
  movieLibraryStartPage: number
  movieLibraryStatus: MovieLibraryStatus
  loadNextMovieLibraryPage: () => Promise<void>
  loadPreviousMovieLibraryPage: () => Promise<void>
  ensureMovieLibrary: () => Promise<void>
  refreshMovieLibrary: () => Promise<void>
  setMovieLibraryScrollPosition: (payload: { itemIndex: number; offset: number }) => void
}

const pageSize = 250
const storageKey = 'libmov:discover-scroll'

type LoadMode = 'append' | 'prepend' | 'replace'

type PersistedScrollPosition = {
  itemIndex: number
  offset: number
}

function mergeUniqueMedia(current: MediaSummary[], next: MediaSummary[]): MediaSummary[] {
  const seen = new Set(current.map((item) => mediaKeyOf(item)))
  const merged = [...current]

  for (const item of next) {
    const key = mediaKeyOf(item)

    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }

  return merged
}

function isCatalogBrowseResponse(value: unknown): value is CatalogBrowseResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    typeof value.hasMore === 'boolean' &&
    typeof value.page === 'number'
  )
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

function readPersistedScrollPosition(): PersistedScrollPosition {
  if (typeof window === 'undefined') {
    return { itemIndex: 0, offset: 0 }
  }

  const value = window.localStorage.getItem(storageKey)

  if (!value) {
    return { itemIndex: 0, offset: 0 }
  }

  try {
    const parsed: unknown = JSON.parse(value)

    if (
      isRecord(parsed) &&
      typeof parsed.itemIndex === 'number' &&
      Number.isFinite(parsed.itemIndex) &&
      typeof parsed.offset === 'number' &&
      Number.isFinite(parsed.offset)
    ) {
      return {
        itemIndex: Math.max(0, Math.trunc(parsed.itemIndex)),
        offset: Math.max(0, parsed.offset),
      }
    }
  } catch {
    return { itemIndex: 0, offset: 0 }
  }

  return { itemIndex: 0, offset: 0 }
}

function writePersistedScrollPosition(position: PersistedScrollPosition): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      itemIndex: Math.max(0, Math.trunc(position.itemIndex)),
      offset: Math.max(0, position.offset),
    }),
  )
}

export const createMovieLibrarySlice: StateCreator<AppStore, [], [], MovieLibrarySlice> = (set, get) => {
  let requestVersion = 0
  const persistedPosition = readPersistedScrollPosition()

  const beginRequest = (): number => {
    requestVersion += 1
    return requestVersion
  }

  const isCurrentRequest = (requestId: number): boolean => requestId === requestVersion

  const loadPage = async (page: number, mode: LoadMode): Promise<void> => {
    const requestId = beginRequest()

    set({
      movieLibraryErrorMessage: null,
      movieLibraryStatus: 'loading',
    })

    try {
      const response: unknown = await window.libmov.browseCatalog({ page, pageSize })

      if (!isCurrentRequest(requestId)) {
        return
      }

      if (!isCatalogBrowseResponse(response)) {
        throw new Error('Catalog browse returned an invalid response.')
      }

      set((state) => {
        if (mode === 'prepend') {
          return {
            movieLibraryHasPrevious: response.page > 1,
            movieLibraryItems: mergeUniqueMedia(response.items, state.movieLibraryItems),
            movieLibraryStartIndex: (response.page - 1) * pageSize,
            movieLibraryStartPage: response.page,
            movieLibraryStatus: 'ready',
          }
        }

        if (mode === 'append') {
          return {
            movieLibraryEndPage: response.page,
            movieLibraryHasMore: response.hasMore,
            movieLibraryItems: mergeUniqueMedia(state.movieLibraryItems, response.items),
            movieLibraryStatus: 'ready',
          }
        }

        return {
          movieLibraryEndPage: response.page,
          movieLibraryHasMore: response.hasMore,
          movieLibraryHasPrevious: response.page > 1,
          movieLibraryItems: response.items,
          movieLibraryStartIndex: (response.page - 1) * pageSize,
          movieLibraryStartPage: response.page,
          movieLibraryStatus: 'ready',
        }
      })
    } catch (error) {
      if (!isCurrentRequest(requestId)) {
        return
      }

      set({
        movieLibraryErrorMessage: error instanceof Error ? error.message : 'Failed to load movies.',
        movieLibraryHasMore: false,
        movieLibraryStatus: 'error',
      })
    }
  }

  return {
    loadNextMovieLibraryPage: async () => {
      const state = get()

      if (state.movieLibraryStatus === 'loading' || !state.movieLibraryHasMore) {
        return
      }

      await loadPage(state.movieLibraryEndPage + 1, 'append')
    },
    loadPreviousMovieLibraryPage: async () => {
      const state = get()

      if (state.movieLibraryStatus === 'loading' || !state.movieLibraryHasPrevious) {
        return
      }

      await loadPage(state.movieLibraryStartPage - 1, 'prepend')
    },
    movieLibraryErrorMessage: null,
    movieLibraryHasMore: false,
    movieLibraryHasPrevious: persistedPosition.itemIndex >= pageSize,
    movieLibraryEndPage: 0,
    movieLibraryItems: [],
    movieLibraryRestoreIndex: persistedPosition.itemIndex,
    movieLibraryScrollOffset: persistedPosition.offset,
    movieLibraryStartIndex: 0,
    movieLibraryStartPage: 0,
    movieLibraryStatus: 'idle',
    ensureMovieLibrary: async () => {
      const state = get()

      if (state.movieLibraryStatus === 'loading') {
        return
      }

      if (state.movieLibraryItems.length === 0 || state.movieLibraryStatus === 'error') {
        await loadPage(Math.floor(state.movieLibraryRestoreIndex / pageSize) + 1, 'replace')
      }
    },
    refreshMovieLibrary: async () => {
      set({
        movieLibraryRestoreIndex: 0,
        movieLibraryScrollOffset: 0,
      })
      writePersistedScrollPosition({ itemIndex: 0, offset: 0 })
      await loadPage(1, 'replace')
    },
    setMovieLibraryScrollPosition: ({ itemIndex, offset }) => {
      const nextPosition = {
        itemIndex: Math.max(0, Math.trunc(itemIndex)),
        offset: Math.max(0, offset),
      }

      writePersistedScrollPosition(nextPosition)
      set({
        movieLibraryRestoreIndex: nextPosition.itemIndex,
        movieLibraryScrollOffset: nextPosition.offset,
      })
    },
  }
}
