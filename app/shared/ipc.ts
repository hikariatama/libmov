import type {
  AppBootstrap,
  CatalogBrowseRequest,
  CatalogBrowseResponse,
  CreateListRequest,
  DiscoveryRequest,
  DiscoveryResponse,
  MediaDetail,
  MediaDetailRequest,
  SetListMembershipRequest,
  SetWatchedByTvdbIdsRequest,
  SetWatchedByTvdbIdsResponse,
  SetWatchedRequest,
} from './media'

export const ipcChannels = {
  bootstrap: 'app:bootstrap',
  configureCatalog: 'catalog:configure',
  createList: 'library:create-list',
  getMediaDetail: 'catalog:get-media-detail',
  browseCatalog: 'catalog:browse',
  searchMedia: 'catalog:search-media',
  setListMembership: 'library:set-list-membership',
  setWatchedByTvdbIds: 'library:set-watched-by-tvdb-ids',
  setWatched: 'library:set-watched',
} as const

export type ConfigureCatalogResult = { ok: true } | { ok: false; error: string }

export interface LibmovApi {
  configureCatalog: (request: { apiKey: string; pin?: string }) => Promise<ConfigureCatalogResult>
  platform: string
  bootstrap: () => Promise<AppBootstrap>
  createList: (request: CreateListRequest) => Promise<AppBootstrap['library']>
  getMediaDetail: (request: MediaDetailRequest) => Promise<MediaDetail>
  browseCatalog: (request: CatalogBrowseRequest) => Promise<CatalogBrowseResponse>
  searchMedia: (request: DiscoveryRequest) => Promise<DiscoveryResponse>
  setListMembership: (request: SetListMembershipRequest) => Promise<AppBootstrap['library']>
  setWatchedByTvdbIds: (request: SetWatchedByTvdbIdsRequest) => Promise<SetWatchedByTvdbIdsResponse>
  setWatched: (request: SetWatchedRequest) => Promise<AppBootstrap['library']>
}
