import type { StateCreator } from 'zustand'
import type { DiscoveryResponse, MediaSummary } from '../../../shared/media'
import { mediaKeyOf } from '../../../shared/media'
import type { AppStore } from '../app-store'

export type DiscoveryStatus = 'error' | 'idle' | 'loading' | 'ready'

export interface DiscoverySlice {
  bootstrapStatus: DiscoveryStatus
  errorMessage: string | null
  initialized: boolean
  hasMore: boolean
  initialize: () => Promise<void>
  items: MediaSummary[]
  loadNextPage: () => Promise<void>
  page: number
  query: string
  refreshDiscovery: (payload?: { query?: string }) => Promise<void>
  searchConfigured: boolean
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

function readNextState(page: number, response: DiscoveryResponse): Pick<DiscoverySlice, 'hasMore' | 'page'> {
  return {
    hasMore: response.hasMore && response.items.length > 0,
    page,
  }
}

export const createDiscoverySlice: StateCreator<AppStore, [], [], DiscoverySlice> = (set, get) => {
  let requestVersion = 0

  const beginRequest = (): number => {
    requestVersion += 1
    return requestVersion
  }

  const isCurrentRequest = (requestId: number): boolean => requestId === requestVersion

  // Bootstrap has its own counter: a debounced empty search firing at mount must not discard it.
  let bootstrapVersion = 0

  return {
    bootstrapStatus: 'idle',
    initialized: false,
    errorMessage: null,
    hasMore: false,
    initialize: async () => {
      bootstrapVersion += 1
      const requestId = bootstrapVersion
      set({ bootstrapStatus: 'loading', errorMessage: null })

      try {
        const bootstrap = await window.libmov.bootstrap()

        if (requestId !== bootstrapVersion) {
          return
        }

        const ok = bootstrap.searchConfigured && !bootstrap.searchError

        // Keep anything the user already typed: search state belongs to the palette, not to bootstrap.
        set((state) => ({
          bootstrapStatus: ok && state.query.trim() ? state.bootstrapStatus : ok ? 'ready' : 'error',
          errorMessage: bootstrap.searchError,
          initialized: true,
          library: bootstrap.library,
          searchConfigured: bootstrap.searchConfigured,
        }))
      } catch (error) {
        if (requestId !== bootstrapVersion) {
          return
        }

        set({
          bootstrapStatus: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to initialize the app.',
          initialized: true,
        })
      }
    },
    items: [],
    loadNextPage: async () => {
      const state = get()
      const nextQuery = state.query.trim()

      if (state.bootstrapStatus === 'loading' || !state.hasMore || !state.searchConfigured || !nextQuery) {
        return
      }

      const requestId = beginRequest()
      set({ bootstrapStatus: 'loading' })

      try {
        const nextPage = state.page + 1
        const response = await window.libmov.searchMedia({
          page: nextPage,
          query: nextQuery,
        })

        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          bootstrapStatus: 'ready',
          items: mergeUniqueMedia(state.items, response.items),
          ...readNextState(nextPage, response),
        })
      } catch (error) {
        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          bootstrapStatus: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to load more results.',
          hasMore: false,
        })
      }
    },
    page: 0,
    query: '',
    refreshDiscovery: async (payload) => {
      const requestId = beginRequest()
      const nextQuery = payload?.query ?? get().query
      const trimmedQuery = nextQuery.trim()
      const searchConfigured = get().searchConfigured

      if (!searchConfigured) {
        set({
          activeMediaKey: null,
          hasMore: false,
          items: [],
          page: 0,
          query: nextQuery,
        })
        return
      }

      if (!trimmedQuery) {
        set({
          activeMediaKey: null,
          bootstrapStatus: 'ready',
          errorMessage: null,
          hasMore: false,
          items: [],
          page: 0,
          query: nextQuery,
        })
        return
      }

      set({
        bootstrapStatus: 'loading',
        errorMessage: null,
        hasMore: true,
        page: 0,
        query: nextQuery,
      })

      try {
        const response = await window.libmov.searchMedia({
          page: 1,
          query: trimmedQuery,
        })

        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          activeMediaKey: response.items[0] ? mediaKeyOf(response.items[0]) : null,
          bootstrapStatus: 'ready',
          items: response.items,
          ...readNextState(1, response),
        })
      } catch (error) {
        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          activeMediaKey: null,
          bootstrapStatus: 'error',
          errorMessage: error instanceof Error ? error.message : 'Search failed.',
          hasMore: false,
          items: [],
        })
      }
    },
    searchConfigured: false,
  }
}
