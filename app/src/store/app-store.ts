import { isEqual } from 'lodash-es'
import { useStore } from 'zustand'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { createDetailSlice, type DetailSlice } from './slices/detail-slice'
import { createDiscoverySlice, type DiscoverySlice } from './slices/discovery-slice'
import { createLibrarySlice, type LibrarySlice } from './slices/library-slice'
import { createMovieLibrarySlice, type MovieLibrarySlice } from './slices/movie-library-slice'
import { createUiSlice, type UiSlice } from './slices/ui-slice'

export type AppStore = DetailSlice & DiscoverySlice & LibrarySlice & MovieLibrarySlice & UiSlice

export const appStore = createStore<AppStore>()((...args) => ({
  ...createDetailSlice(...args),
  ...createDiscoverySlice(...args),
  ...createLibrarySlice(...args),
  ...createMovieLibrarySlice(...args),
  ...createUiSlice(...args),
}))

export function useAppStore<T>(selector: (state: AppStore) => T): T {
  return useStore(appStore, selector)
}

export function useAppStoreWithEquality<T>(selector: (state: AppStore) => T): T {
  return useStoreWithEqualityFn(appStore, selector, isEqual)
}
