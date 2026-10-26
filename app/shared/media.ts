export type MediaType = 'movie' | 'tv'

export interface MediaSummary {
  artworkThumbnailUrl: string | null
  artworkUrl: string | null
  backdropUrl: string | null
  genres: string[]
  mediaId: string
  mediaType: MediaType
  originalCountry: string | null
  originalLanguage: string
  overview: string
  releaseDate: string | null
  score: number | null
  title: string
  titleHint: string
  year: string | null
}

export interface MediaArtwork {
  imageUrl: string
  kind: 'backdrop' | 'other' | 'poster'
}

export interface MediaCredit {
  characterName: string
  personImageUrl: string | null
  personName: string
  role: string
}

export interface MediaContentRating {
  country: string
  description: string | null
  name: string
}

export interface MediaRemoteId {
  sourceName: string
  type: string
  value: string
}

export interface MediaRelease {
  country: string | null
  date: string | null
  detail: string | null
}

export interface MediaTrailer {
  language: string | null
  name: string
  runtime: number | null
  url: string
}

export interface MediaDetail extends MediaSummary {
  aliases: string[]
  audioLanguages: string[]
  averageRuntime: number | null
  companies: string[]
  contentRatings: MediaContentRating[]
  countries: string[]
  credits: MediaCredit[]
  episodesCount: number | null
  externalIds: MediaRemoteId[]
  firstAired: string | null
  lastAired: string | null
  latestNetwork: string | null
  originalNetwork: string | null
  releases: MediaRelease[]
  seasonsCount: number | null
  spokenLanguages: string[]
  statusLabel: string | null
  subtitleLanguages: string[]
  tags: string[]
  trailers: MediaTrailer[]
  artworks: MediaArtwork[]
}

export interface LibraryStatus {
  inWatchlist: boolean
  listIds: string[]
  watched: boolean
  watchedAt: string | null
}

export interface LibraryMediaItem extends MediaSummary {
  addedAt: string
  status: LibraryStatus
}

export interface MediaList {
  createdAt: string
  id: string
  itemCount: number
  name: string
  slug: string
  system: boolean
  updatedAt: string
}

export interface StoredMediaList extends MediaList {
  items: LibraryMediaItem[]
}

export interface LibrarySnapshot {
  lists: StoredMediaList[]
  recentlyWatched: LibraryMediaItem[]
  statuses: Record<string, LibraryStatus>
  watchlist: LibraryMediaItem[]
}

export interface CatalogBrowseRequest {
  page: number
  pageSize: number
}

export interface CatalogBrowseResponse {
  hasMore: boolean
  items: MediaSummary[]
  page: number
}

export interface DiscoveryRequest {
  page: number
  query: string
}

export interface DiscoveryResponse {
  hasMore: boolean
  items: MediaSummary[]
  page: number
}

export interface MediaDetailRequest {
  mediaId: string
  mediaType: MediaType
}

export interface CreateListRequest {
  name: string
}

export interface SetListMembershipRequest {
  add: boolean
  listId: string
  media: MediaSummary
}

export interface SetWatchedRequest {
  media: MediaSummary
  watched: boolean
}

export interface SetWatchedByTvdbIdImport {
  mediaId: string
  mediaType?: MediaType
  title?: string
}

export interface SetWatchedByTvdbIdsRequest {
  mediaItems: SetWatchedByTvdbIdImport[]
}

export interface SetWatchedByTvdbIdsResponse {
  importedIds: string[]
  library: LibrarySnapshot
  skippedIds: string[]
}

export interface AppBootstrap {
  library: LibrarySnapshot
  searchConfigured: boolean
  searchError: string | null
}

export function mediaKeyOf(media: Pick<MediaSummary, 'mediaId' | 'mediaType'>): string {
  return `${media.mediaType}:${media.mediaId}`
}

export const watchlistSlug = 'watchlist'
