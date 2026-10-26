import type { StateCreator } from 'zustand'
import type { MediaDetail, MediaSummary } from '../../../shared/media'
import type { AppStore } from '../app-store'

export type DetailOrigin = 'library' | 'search'
export type DetailStatus = 'error' | 'idle' | 'loading' | 'ready'
export type AppView = 'detail' | 'library'

export interface DetailSlice {
  closeDetail: () => void
  currentView: AppView
  detailErrorMessage: string | null
  detailFocusTick: number
  detailMedia: MediaSummary | null
  detailOrigin: DetailOrigin
  detailPayload: MediaDetail | null
  detailStatus: DetailStatus
  openDetail: (media: MediaSummary, origin?: DetailOrigin) => Promise<void>
}

export const createDetailSlice: StateCreator<AppStore, [], [], DetailSlice> = (set, get) => {
  let requestVersion = 0

  const beginRequest = (): number => {
    requestVersion += 1
    return requestVersion
  }

  const isCurrentRequest = (requestId: number): boolean => requestId === requestVersion

  return {
    closeDetail: () => {
      const { detailOrigin, query, searchFocusTick } = get()
      const shouldRestoreSearch = detailOrigin === 'search' && query.trim().length > 0

      set({
        currentView: 'library',
        detailErrorMessage: null,
        detailMedia: null,
        detailPayload: null,
        detailStatus: 'idle',
        searchFocusTick: shouldRestoreSearch ? searchFocusTick + 1 : searchFocusTick,
        searchOpen: shouldRestoreSearch,
      })
    },
    currentView: 'library',
    detailErrorMessage: null,
    detailFocusTick: 0,
    detailMedia: null,
    detailOrigin: 'library',
    detailPayload: null,
    detailStatus: 'idle',
    openDetail: async (media, origin = 'library') => {
      const requestId = beginRequest()

      set((state) => ({
        currentView: 'detail',
        detailErrorMessage: null,
        detailFocusTick: state.detailFocusTick + 1,
        detailMedia: media,
        detailOrigin: origin,
        detailPayload: null,
        detailStatus: 'loading',
        searchOpen: false,
      }))

      try {
        const detail = await window.libmov.getMediaDetail({
          mediaId: media.mediaId,
          mediaType: media.mediaType,
        })

        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          detailPayload: detail,
          detailStatus: 'ready',
        })
      } catch (error) {
        if (!isCurrentRequest(requestId)) {
          return
        }

        set({
          detailErrorMessage: error instanceof Error ? error.message : 'Failed to load the title details.',
          detailStatus: 'error',
        })
      }
    },
  }
}
