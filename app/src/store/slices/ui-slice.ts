import type { StateCreator } from 'zustand'
import type { AppStore } from '../app-store'

export type LibraryTab = 'discover' | 'watched' | 'watchlist'

export interface Toast {
  id: number
  message: string
}

export interface UiSlice {
  activeMediaKey: string | null
  closeSearch: () => void
  dismissToast: (id: number) => void
  libraryTab: LibraryTab
  openSearch: () => void
  requestSearchFocus: () => void
  searchFocusTick: number
  searchOpen: boolean
  setActiveMediaKey: (key: string | null) => void
  setLibraryTab: (tab: LibraryTab) => void
  setSearchOpen: (open: boolean) => void
  showToast: (message: string) => void
  toast: Toast | null
}

let toastCounter = 0

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (set) => ({
  activeMediaKey: null,
  closeSearch: () => {
    set({ activeMediaKey: null, searchOpen: false })
  },
  dismissToast: (id) => {
    set((state) => (state.toast?.id === id ? { toast: null } : {}))
  },
  libraryTab: 'watchlist',
  openSearch: () => {
    set((state) => ({
      searchFocusTick: state.searchFocusTick + 1,
      searchOpen: true,
    }))
  },
  requestSearchFocus: () => {
    set((state) => ({
      searchFocusTick: state.searchFocusTick + 1,
    }))
  },
  searchFocusTick: 0,
  searchOpen: false,
  setActiveMediaKey: (key) => {
    set({ activeMediaKey: key })
  },
  setLibraryTab: (tab) => {
    set({
      currentView: 'library',
      detailMedia: null,
      detailPayload: null,
      detailStatus: 'idle',
      libraryTab: tab,
      searchOpen: false,
    })
  },
  setSearchOpen: (open) => {
    set({ searchOpen: open })
  },
  showToast: (message) => {
    toastCounter += 1
    set({ toast: { id: toastCounter, message } })
  },
  toast: null,
})
