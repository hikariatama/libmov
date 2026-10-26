import { net } from 'electron'
import type {
  CatalogBrowseRequest,
  CatalogBrowseResponse,
  DiscoveryRequest,
  DiscoveryResponse,
  MediaArtwork,
  MediaContentRating,
  MediaCredit,
  MediaDetail,
  MediaDetailRequest,
  MediaRelease,
  MediaRemoteId,
  MediaSummary,
  MediaTrailer,
  MediaType,
} from '../shared/media'

type TvdbLoginResponse = {
  data?: {
    token?: string
  }
}

type TvdbLinks = {
  next?: string | null
  total_items?: number
}

type TvdbSearchRecord = {
  country?: string
  first_air_time?: string
  genres?: string[]
  image_url?: string
  name?: string
  name_translated?: string
  overview?: string
  overview_translated?: string[]
  overviews?: Record<string, string>
  primary_language?: string
  thumbnail?: string
  title?: string
  translations?: Record<string, string>
  tvdb_id?: string
  type?: string
  year?: string
}

type TvdbSearchResponse = {
  data?: TvdbSearchRecord[]
  links?: TvdbLinks
}

type TvdbListResponse<T> = {
  data?: T[]
  links?: TvdbLinks
}

type TvdbMovieListRecord = {
  id?: number | string
  image?: string | null
  name?: string
  originalCountry?: string | null
  originalLanguage?: string | null
  overview?: string | null
  score?: number | null
  year?: number | string | null
}

type TvdbSeriesListRecord = {
  firstAired?: string | null
  id?: number | string
  image?: string | null
  name?: string
  originalCountry?: string | null
  originalLanguage?: string | null
  overview?: string | null
  score?: number | null
  year?: number | string | null
}

type TvdbBrowseRecord = {
  mediaType: MediaType
  record: TvdbMovieListRecord | TvdbSeriesListRecord
}

type TvdbBrowseChunk = {
  hasMore: boolean
  records: TvdbBrowseRecord[]
}

type TvdbRemoteSearchRecord = {
  movie?: Pick<TvdbMovieDetailRecord, 'id'>
  series?: Pick<TvdbSeriesDetailRecord, 'id'>
}

type TvdbRemoteSearchResponse = {
  data?: TvdbRemoteSearchRecord[]
}

type TvdbArtworkRecord = {
  image?: string
  type?: number
}

type TvdbCharacterRecord = {
  image?: string | null
  name?: string
  peopleType?: string
  personImgURL?: string | null
  personName?: string
  sort?: number | null
}

type TvdbCompanyRecord = {
  name?: string
}

type TvdbContentRatingRecord = {
  country?: string
  description?: string | null
  name?: string
}

type TvdbGenreRecord = {
  name?: string
}

type TvdbNamedRecord = {
  name?: string
}

type TvdbRemoteIdRecord = {
  id?: string
  sourceName?: string
  type?: number | string
}

type TvdbReleaseRecord = {
  country?: string | null
  date?: string | null
  detail?: string | null
}

type TvdbStatusRecord =
  | {
      name?: string
    }
  | string

type TvdbTagRecord = {
  name?: string
}

type TvdbTrailerRecord = {
  language?: string | null
  name?: string
  runtime?: number | null
  url?: string
}

type TvdbAliasRecord =
  | {
      name?: string
    }
  | string

type TvdbTranslationRecord = {
  isPrimary?: boolean
  language?: string
  name?: string
  overview?: string
}

type TvdbTranslationExtendedRecord = {
  nameTranslations?: TvdbTranslationRecord[]
  overviewTranslations?: TvdbTranslationRecord[]
}

type TvdbSeriesDetailRecord = {
  aliases?: TvdbAliasRecord[]
  airsDays?: Record<string, boolean>
  airsTime?: string | null
  artworks?: TvdbArtworkRecord[]
  averageRuntime?: number | null
  characters?: TvdbCharacterRecord[]
  companies?: TvdbCompanyRecord[]
  contentRatings?: TvdbContentRatingRecord[]
  episodes?: Array<Record<string, unknown>>
  firstAired?: string | null
  genres?: TvdbGenreRecord[]
  id?: number | string
  image?: string | null
  lastAired?: string | null
  latestNetwork?: TvdbNamedRecord | null
  name?: string
  nextAired?: string | null
  originalCountry?: string | null
  originalLanguage?: string | null
  originalNetwork?: TvdbNamedRecord | null
  overview?: string | null
  remoteIds?: TvdbRemoteIdRecord[]
  score?: number | null
  seasons?: Array<Record<string, unknown>>
  status?: TvdbStatusRecord | null
  tags?: TvdbTagRecord[]
  trailers?: TvdbTrailerRecord[]
  translations?: TvdbTranslationExtendedRecord
  year?: number | string | null
}

type TvdbMovieDetailRecord = {
  aliases?: TvdbAliasRecord[]
  artworks?: TvdbArtworkRecord[]
  audioLanguages?: string[]
  characters?: TvdbCharacterRecord[]
  companies?: TvdbCompanyRecord[]
  contentRatings?: TvdbContentRatingRecord[]
  first_release?: string | null
  genres?: TvdbGenreRecord[]
  id?: number | string
  image?: string | null
  name?: string
  originalCountry?: string | null
  originalLanguage?: string | null
  overview?: string | null
  production_countries?: string[]
  releases?: TvdbReleaseRecord[]
  remoteIds?: TvdbRemoteIdRecord[]
  runtime?: number | null
  score?: number | null
  spoken_languages?: string[]
  status?: TvdbStatusRecord | null
  studios?: TvdbCompanyRecord[]
  subtitleLanguages?: string[]
  trailers?: TvdbTrailerRecord[]
  translations?: TvdbTranslationExtendedRecord
  year?: number | string | null
}

type TvdbDetailResponse<T> = {
  data?: T
}

type TvdbTranslationResponse = {
  data?: TvdbTranslationRecord | TvdbTranslationRecord[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => readValues(item))
  }

  if (isRecord(value)) {
    return [value, ...Object.values(value).flatMap((item) => readValues(item))]
  }

  return [value]
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null
  }

  const rawValue = value[key]

  if (typeof rawValue === 'number' || typeof rawValue === 'string' || rawValue === null || rawValue === undefined) {
    return cleanString(rawValue)
  }

  return null
}

function normalizeMediaType(value: string | undefined): MediaType | null {
  if (value === 'movie') {
    return 'movie'
  }

  if (value === 'series') {
    return 'tv'
  }

  return null
}

function cleanString(value: number | string | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

function normalizeYear(value: number | string | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return cleanString(value)
}

function normalizeMediaId(value: number | string | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return cleanString(value)
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const deduped = new Set<string>()

  for (const value of values) {
    const normalized = cleanString(value)

    if (normalized) {
      deduped.add(normalized)
    }
  }

  return [...deduped]
}

function readAliases(values: unknown): string[] {
  return uniqueStrings(
    readValues(values).map((value) => {
      if (typeof value === 'string') {
        return value
      }

      return readStringProperty(value, 'name')
    }),
  )
}

function readGenreNames(values: unknown): string[] {
  return uniqueStrings(readValues(values).map((value) => (typeof value === 'string' ? value : readStringProperty(value, 'name'))))
}

function readCompanyNames(values: unknown): string[] {
  return uniqueStrings(readValues(values).map((value) => (typeof value === 'string' ? value : readStringProperty(value, 'name'))))
}

function readProductionCountries(values: unknown): string[] {
  return uniqueStrings(
    readValues(values).map((value) => {
      if (typeof value === 'string') {
        return value
      }

      if (isRecord(value)) {
        return readStringProperty(value, 'name') ?? readStringProperty(value, 'country')
      }

      return null
    }),
  )
}

function readStatusLabel(value: TvdbStatusRecord | null | undefined): string | null {
  if (typeof value === 'string') {
    return cleanString(value)
  }

  return cleanString(value?.name)
}

function readTypeLabel(mediaType: MediaType): string {
  return mediaType === 'movie' ? 'Movie' : 'Series'
}

function readOverview(record: TvdbSearchRecord): string {
  return (
    cleanString(record.overviews?.eng) ??
    cleanString(record.overview_translated?.find((value) => cleanString(value))) ??
    cleanString(record.overview) ??
    ''
  )
}

function readSearchTitle(record: TvdbSearchRecord): string | null {
  return cleanString(record.name_translated) ?? cleanString(record.translations?.eng) ?? cleanString(record.name) ?? cleanString(record.title)
}

function readEnglishTranslation(values: unknown, field: 'name' | 'overview'): string | null {
  const englishValues = readValues(values).filter(
    (value): value is TvdbTranslationRecord => isRecord(value) && value.language === 'eng',
  )
  const primary = englishValues.find((value) => value.isPrimary)

  return cleanString(primary?.[field]) ?? cleanString(englishValues[0]?.[field])
}

function readTranslation(values: unknown, field: 'name' | 'overview'): string | null {
  const translationValues = readValues(values).filter((value): value is TvdbTranslationRecord => isRecord(value))
  const primary = translationValues.find((value) => value.isPrimary)

  return cleanString(primary?.[field]) ?? cleanString(translationValues[0]?.[field])
}

function readSearchRecords(value: unknown): TvdbSearchRecord[] {
  return readValues(value).filter((item): item is TvdbSearchRecord => isRecord(item))
}

function readRemoteSearchRecords(value: unknown): TvdbRemoteSearchRecord[] {
  return readValues(value).filter((item): item is TvdbRemoteSearchRecord => isRecord(item))
}

function readListRecords<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => isRecord(item) && normalizeMediaId(item.id as number | string | null | undefined) !== null)
    : []
}

function formatTitleHint(title: string, mediaType: MediaType, year: string | null): string {
  return `${title} · ${readTypeLabel(mediaType)}${year ? ` · ${year}` : ''}`
}

function normalizeTitleForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseImportedTitle(value: string): { query: string; year: string | undefined } {
  const match = /^(?<title>.+?)\s*\((?<year>\d{4})\)\s*$/.exec(value.trim())
  const query = normalizeTitleForMatch(match?.groups?.title ?? value)

  return {
    query,
    year: match?.groups?.year,
  }
}

function titlesMatch(left: string, right: string): boolean {
  return normalizeTitleForMatch(left) === normalizeTitleForMatch(right)
}

function normalizeImageUrl(value: string | null | undefined): string | null {
  const imageUrl = cleanString(value)

  if (!imageUrl) {
    return null
  }

  if (/^https?:\/\//.test(imageUrl)) {
    return imageUrl
  }

  return imageUrl.startsWith('/') ? `https://artworks.thetvdb.com${imageUrl}` : imageUrl
}

function mapArtworkKind(type: number | undefined): MediaArtwork['kind'] {
  if (type === 2 || type === 14) {
    return 'poster'
  }

  if (type === 3 || type === 15) {
    return 'backdrop'
  }

  return 'other'
}

function mapArtworks(values: unknown): MediaArtwork[] {
  return readValues(values)
    .map((value) => {
      const imageUrl = readStringProperty(value, 'image')

      if (!imageUrl) {
        return null
      }

      return {
        imageUrl,
        kind: mapArtworkKind(isRecord(value) && typeof value.type === 'number' ? value.type : undefined),
      } satisfies MediaArtwork
    })
    .filter((value): value is MediaArtwork => value !== null)
}

function pickArtwork(artworks: MediaArtwork[], kind: MediaArtwork['kind']): string | null {
  return artworks.find((value) => value.kind === kind)?.imageUrl ?? null
}

function mapCredits(values: unknown): MediaCredit[] {
  return readValues(values)
    .slice()
    .sort((left, right) => readSort(left) - readSort(right))
    .map((value) => {
      const personName = readStringProperty(value, 'personName')
      const characterName = readStringProperty(value, 'name')

      if (!personName || !characterName) {
        return null
      }

      return {
        characterName,
        personImageUrl: readStringProperty(value, 'personImgURL') ?? readStringProperty(value, 'image'),
        personName,
        role: readStringProperty(value, 'peopleType') ?? 'Cast',
      } satisfies MediaCredit
    })
    .filter((value): value is MediaCredit => value !== null)
}

function readSort(value: unknown): number {
  return isRecord(value) && typeof value.sort === 'number' ? value.sort : Number.MAX_SAFE_INTEGER
}

function mapRatings(values: unknown): MediaContentRating[] {
  return readValues(values)
    .map((value) => {
      const name = readStringProperty(value, 'name')
      const country = readStringProperty(value, 'country')

      if (!name || !country) {
        return null
      }

      return {
        country,
        description: readStringProperty(value, 'description'),
        name,
      } satisfies MediaContentRating
    })
    .filter((value): value is MediaContentRating => value !== null)
}

function mapRemoteIds(values: unknown): MediaRemoteId[] {
  return readValues(values)
    .map((value) => {
      const remoteValue = readStringProperty(value, 'id')
      const sourceName = readStringProperty(value, 'sourceName')

      if (!remoteValue || !sourceName) {
        return null
      }

      return {
        sourceName,
        type: isRecord(value) && typeof value.type === 'number' ? String(value.type) : readStringProperty(value, 'type') ?? 'unknown',
        value: remoteValue,
      } satisfies MediaRemoteId
    })
    .filter((value): value is MediaRemoteId => value !== null)
}

function mapReleases(values: unknown): MediaRelease[] {
  return readValues(values)
    .map((value) => {
      if (!readStringProperty(value, 'date') && !readStringProperty(value, 'country') && !readStringProperty(value, 'detail')) {
        return null
      }

      return {
        country: readStringProperty(value, 'country'),
        date: readStringProperty(value, 'date'),
        detail: readStringProperty(value, 'detail'),
      } satisfies MediaRelease
    })
    .filter((value): value is MediaRelease => value !== null)
}

function mapTrailers(values: unknown): MediaTrailer[] {
  return readValues(values)
    .map((value) => {
      const name = readStringProperty(value, 'name')
      const url = readStringProperty(value, 'url')

      if (!name || !url) {
        return null
      }

      return {
        language: readStringProperty(value, 'language'),
        name,
        runtime: isRecord(value) && typeof value.runtime === 'number' ? value.runtime : null,
        url,
      } satisfies MediaTrailer
    })
    .filter((value): value is MediaTrailer => value !== null)
}

function toMediaSummary(record: TvdbSearchRecord): MediaSummary | null {
  const mediaType = normalizeMediaType(record.type)
  const mediaId = typeof record.tvdb_id === 'string' && record.tvdb_id ? record.tvdb_id : null
  const title = readSearchTitle(record)

  if (!mediaType || !mediaId || !title) {
    return null
  }

  const releaseDate = typeof record.first_air_time === 'string' && record.first_air_time ? record.first_air_time : null
  const year =
    typeof record.year === 'string' && record.year
      ? record.year
      : releaseDate
        ? releaseDate.slice(0, 4)
        : null

  return {
    artworkThumbnailUrl: record.thumbnail ?? null,
    artworkUrl: record.image_url ?? record.thumbnail ?? null,
    backdropUrl: null,
    genres: Array.isArray(record.genres) ? record.genres.filter((item): item is string => typeof item === 'string') : [],
    mediaId,
    mediaType,
    originalCountry: record.country ?? null,
    originalLanguage: record.primary_language ?? '',
    overview: readOverview(record),
    releaseDate,
    score: null,
    title,
    titleHint: formatTitleHint(title, mediaType, year),
    year,
  }
}

function toBrowseSummary(
  item: TvdbBrowseRecord,
  englishTranslation?: TvdbTranslationRecord | TvdbTranslationRecord[],
): MediaSummary | null {
  const mediaId = normalizeMediaId(item.record.id)
  const title = readTranslation(englishTranslation, 'name') ?? cleanString(item.record.name)

  if (!mediaId || !title) {
    return null
  }

  const releaseDate = item.mediaType === 'tv' ? cleanString((item.record as TvdbSeriesListRecord).firstAired) : null
  const year = normalizeYear(item.record.year) ?? (releaseDate ? releaseDate.slice(0, 4) : null)
  const imageUrl = normalizeImageUrl(item.record.image)

  return {
    artworkThumbnailUrl: imageUrl,
    artworkUrl: imageUrl,
    backdropUrl: null,
    genres: [],
    mediaId,
    mediaType: item.mediaType,
    originalCountry: cleanString(item.record.originalCountry),
    originalLanguage: cleanString(item.record.originalLanguage) ?? '',
    overview: readTranslation(englishTranslation, 'overview') ?? cleanString(item.record.overview) ?? '',
    releaseDate,
    score: typeof item.record.score === 'number' ? item.record.score : null,
    title,
    titleHint: formatTitleHint(title, item.mediaType, year),
    year,
  }
}

function toSeriesDetail(record: TvdbSeriesDetailRecord, englishTranslation?: TvdbTranslationRecord | TvdbTranslationRecord[]): MediaDetail | null {
  const mediaId = normalizeMediaId(record.id)
  const title =
    readTranslation(englishTranslation, 'name') ??
    readEnglishTranslation(record.translations?.nameTranslations, 'name') ??
    cleanString(record.name)

  if (!mediaId || !title) {
    return null
  }

  const artworks = mapArtworks(record.artworks)
  const releaseDate = cleanString(record.firstAired)
  const year = normalizeYear(record.year) ?? (releaseDate ? releaseDate.slice(0, 4) : null)
  const artworkUrl = pickArtwork(artworks, 'poster') ?? cleanString(record.image)
  const backdropUrl = pickArtwork(artworks, 'backdrop')

  return {
    aliases: readAliases(record.aliases),
    artworkThumbnailUrl: artworkUrl,
    artworkUrl,
    artworks,
    audioLanguages: [],
    averageRuntime: typeof record.averageRuntime === 'number' ? record.averageRuntime : null,
    backdropUrl,
    companies: uniqueStrings([
      ...readCompanyNames(record.companies),
      record.latestNetwork?.name,
      record.originalNetwork?.name,
    ]),
    contentRatings: mapRatings(record.contentRatings),
    countries: uniqueStrings([record.originalCountry]),
    credits: mapCredits(record.characters),
    episodesCount: Array.isArray(record.episodes) ? record.episodes.length : null,
    externalIds: mapRemoteIds(record.remoteIds),
    firstAired: releaseDate,
    genres: readGenreNames(record.genres),
    lastAired: cleanString(record.lastAired),
    latestNetwork: cleanString(record.latestNetwork?.name),
    mediaId,
    mediaType: 'tv',
    originalCountry: cleanString(record.originalCountry),
    originalLanguage: cleanString(record.originalLanguage) ?? '',
    originalNetwork: cleanString(record.originalNetwork?.name),
    overview:
      readTranslation(englishTranslation, 'overview') ??
      readEnglishTranslation(record.translations?.overviewTranslations, 'overview') ??
      cleanString(record.overview) ??
      '',
    releaseDate,
    releases: [],
    score: typeof record.score === 'number' ? record.score : null,
    seasonsCount: Array.isArray(record.seasons) ? record.seasons.length : null,
    spokenLanguages: [],
    statusLabel: readStatusLabel(record.status),
    subtitleLanguages: [],
    tags: uniqueStrings(readValues(record.tags).map((value) => readStringProperty(value, 'name'))),
    title,
    titleHint: formatTitleHint(title, 'tv', year),
    trailers: mapTrailers(record.trailers),
    year,
  }
}

function toMovieDetail(record: TvdbMovieDetailRecord, englishTranslation?: TvdbTranslationRecord | TvdbTranslationRecord[]): MediaDetail | null {
  const mediaId = normalizeMediaId(record.id)
  const title =
    readTranslation(englishTranslation, 'name') ??
    readEnglishTranslation(record.translations?.nameTranslations, 'name') ??
    cleanString(record.name)

  if (!mediaId || !title) {
    return null
  }

  const artworks = mapArtworks(record.artworks)
  const releaseDate = cleanString(record.first_release) ?? mapReleases(record.releases)[0]?.date ?? null
  const year = normalizeYear(record.year) ?? (releaseDate ? releaseDate.slice(0, 4) : null)
  const artworkUrl = pickArtwork(artworks, 'poster') ?? cleanString(record.image)
  const backdropUrl = pickArtwork(artworks, 'backdrop')

  return {
    aliases: readAliases(record.aliases),
    artworkThumbnailUrl: artworkUrl,
    artworkUrl,
    artworks,
    audioLanguages: uniqueStrings(record.audioLanguages ?? []),
    averageRuntime: typeof record.runtime === 'number' ? record.runtime : null,
    backdropUrl,
    companies: uniqueStrings([
      ...readCompanyNames(record.companies),
      ...readCompanyNames(record.studios),
    ]),
    contentRatings: mapRatings(record.contentRatings),
    countries: uniqueStrings([record.originalCountry, ...readProductionCountries(record.production_countries)]),
    credits: mapCredits(record.characters),
    episodesCount: null,
    externalIds: mapRemoteIds(record.remoteIds),
    firstAired: releaseDate,
    genres: readGenreNames(record.genres),
    lastAired: null,
    latestNetwork: null,
    mediaId,
    mediaType: 'movie',
    originalCountry: cleanString(record.originalCountry),
    originalLanguage: cleanString(record.originalLanguage) ?? '',
    originalNetwork: null,
    overview:
      readTranslation(englishTranslation, 'overview') ??
      readEnglishTranslation(record.translations?.overviewTranslations, 'overview') ??
      cleanString(record.overview) ??
      '',
    releaseDate,
    releases: mapReleases(record.releases),
    score: typeof record.score === 'number' ? record.score : null,
    seasonsCount: null,
    spokenLanguages: uniqueStrings(record.spoken_languages ?? []),
    statusLabel: readStatusLabel(record.status),
    subtitleLanguages: uniqueStrings(record.subtitleLanguages ?? []),
    tags: [],
    title,
    titleHint: formatTitleHint(title, 'movie', year),
    trailers: mapTrailers(record.trailers),
    year,
  }
}

async function readJson<T>(response: Response, failurePrefix: string): Promise<T> {
  if (!response.ok) {
    const message = (await response.text()).trim()
    const readableMessage = message.startsWith('<') ? response.statusText : message.slice(0, 240)
    throw new Error(`${failurePrefix} (${response.status} ${readableMessage || response.statusText}).`)
  }

  return (await response.json()) as T
}

export class TvdbClient {
  private readonly apiKey: string
  private readonly pin?: string
  private readonly baseUrl = 'https://api4.thetvdb.com/v4'
  private readonly browseChunkPromises = new Map<number, Promise<TvdbBrowseChunk>>()
  private token: string | null = null
  private tokenPromise: Promise<string> | null = null

  constructor(apiKey: string, pin?: string) {
    this.apiKey = apiKey
    this.pin = pin
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  async prime(): Promise<void> {
    await this.getToken()
  }

  private async getToken(): Promise<string> {
    if (!this.apiKey) {
      throw new Error('TheTVDB key is unavailable.')
    }

    if (this.token) {
      return this.token
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.login().finally(() => {
        this.tokenPromise = null
      })
    }

    return this.tokenPromise
  }

  private async login(): Promise<string> {
    const response = await net.fetch(`${this.baseUrl}/login`, {
      body: JSON.stringify({ apikey: this.apiKey, ...(this.pin ? { pin: this.pin } : {}) }),
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    const payload = await readJson<TvdbLoginResponse>(response, 'TheTVDB login failed')
    const token = payload.data?.token

    if (!token) {
      throw new Error('TheTVDB login did not return a bearer token.')
    }

    this.token = token
    return token
  }

  private async fetchJson<T>(
    pathname: string,
    params: Record<string, number | string | undefined>,
    allowRetry = true,
  ): Promise<T> {
    const token = await this.getToken()
    const url = new URL(`${this.baseUrl}${pathname}`)

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }

    const response = await net.fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.status === 401 && allowRetry) {
      this.token = null
      return this.fetchJson(pathname, params, false)
    }

    return readJson<T>(response, 'TheTVDB request failed')
  }

  async browseMedia(request: CatalogBrowseRequest): Promise<CatalogBrowseResponse> {
    if (!this.isConfigured()) {
      throw new Error('TheTVDB key is unavailable.')
    }

    const page = Math.max(1, Math.trunc(request.page))
    const pageSize = Math.min(500, Math.max(1, Math.trunc(request.pageSize)))
    const offset = (page - 1) * pageSize
    const chunkSize = 1000
    const chunkPage = Math.floor(offset / chunkSize)
    const chunkOffset = offset % chunkSize
    const chunk = await this.getBrowseChunk(chunkPage)
    const pageItems: MediaSummary[] = []

    for (const item of chunk.records.slice(chunkOffset)) {
      const summary = toBrowseSummary(item)

      if (!summary?.artworkUrl && !summary?.artworkThumbnailUrl) {
        continue
      }

      pageItems.push(summary)

      if (pageItems.length >= pageSize) {
        break
      }
    }

    return {
      hasMore: chunkOffset + pageSize < chunk.records.length || chunk.hasMore,
      items: pageItems,
      page,
    }
  }

  private async getBrowseChunk(page: number): Promise<TvdbBrowseChunk> {
    const cached = this.browseChunkPromises.get(page)

    if (cached) {
      return cached
    }

    const promise = this.fetchBrowseChunk(page).catch((error: unknown) => {
      this.browseChunkPromises.delete(page)
      throw error
    })

    this.browseChunkPromises.set(page, promise)
    return promise
  }

  private async fetchBrowseChunk(page: number): Promise<TvdbBrowseChunk> {
    const [movies, series] = await Promise.all([
      this.fetchJson<TvdbListResponse<TvdbMovieListRecord>>('/movies', { page }),
      this.fetchJson<TvdbListResponse<TvdbSeriesListRecord>>('/series', { page }),
    ])
    const movieRecords = readListRecords<TvdbMovieListRecord>(movies.data).map((record) => ({
      mediaType: 'movie' as const,
      record,
    }))
    const seriesRecords = readListRecords<TvdbSeriesListRecord>(series.data).map((record) => ({
      mediaType: 'tv' as const,
      record,
    }))
    const records: TvdbBrowseRecord[] = []
    const recordCount = Math.max(movieRecords.length, seriesRecords.length)

    for (let index = 0; index < recordCount; index += 1) {
      const movie = movieRecords[index]
      const seriesItem = seriesRecords[index]

      if (movie) {
        records.push(movie)
      }

      if (seriesItem) {
        records.push(seriesItem)
      }
    }

    return {
      hasMore: Boolean(movies.links?.next || series.links?.next),
      records,
    }
  }

  async getMediaDetail(request: MediaDetailRequest): Promise<MediaDetail> {
    if (!this.isConfigured()) {
      throw new Error('TheTVDB key is unavailable.')
    }

    if (request.mediaType === 'tv') {
      const [response, translation] = await Promise.all([
        this.fetchJson<TvdbDetailResponse<TvdbSeriesDetailRecord>>(`/series/${request.mediaId}/extended`, {
          meta: 'translations',
        }),
        this.fetchEnglishTranslation('tv', request.mediaId),
      ])
      const detail = response.data ? toSeriesDetail(response.data, translation ?? undefined) : null

      if (!detail) {
        throw new Error('TheTVDB did not return a usable series record.')
      }

      return detail
    }

    const [response, translation] = await Promise.all([
      this.fetchJson<TvdbDetailResponse<TvdbMovieDetailRecord>>(`/movies/${request.mediaId}/extended`, {
        meta: 'translations',
      }),
      this.fetchEnglishTranslation('movie', request.mediaId),
    ])
    const detail = response.data ? toMovieDetail(response.data, translation ?? undefined) : null

    if (!detail) {
      throw new Error('TheTVDB did not return a usable movie record.')
    }

    return detail
  }

  private async fetchEnglishTranslation(mediaType: MediaType, mediaId: string): Promise<TvdbTranslationRecord | TvdbTranslationRecord[] | null> {
    const namespace = mediaType === 'tv' ? 'series' : 'movies'
    const response = await this.fetchJson<TvdbTranslationResponse>(`/${namespace}/${mediaId}/translations/eng`, {}).catch(
      () => null,
    )

    return response?.data ?? null
  }

  async getMediaByTvdbId(mediaId: string, mediaType?: MediaType, title?: string): Promise<MediaDetail | MediaSummary> {
    if (mediaType) {
      try {
        return await this.getMediaDetail({ mediaId, mediaType })
      } catch (error) {
        const searchMatch = title ? await this.searchMediaByImportedTitle(mediaId, mediaType, title) : null

        if (searchMatch) {
          return searchMatch
        }

        throw error
      }
    }

    const remoteMatch = await this.getMediaByRemoteId(mediaId).catch(() => null)

    if (remoteMatch) {
      return remoteMatch
    }

    try {
      return await this.getMediaDetail({ mediaId, mediaType: 'tv' })
    } catch (seriesError) {
      try {
        return await this.getMediaDetail({ mediaId, mediaType: 'movie' })
      } catch {
        throw seriesError
      }
    }
  }

  private async searchMediaByImportedTitle(
    mediaId: string,
    mediaType: MediaType,
    title: string,
  ): Promise<MediaSummary | null> {
    const { query, year } = parseImportedTitle(title)

    if (!query) {
      return null
    }

    const response = await this.fetchJson<TvdbSearchResponse>('/search', {
      language: 'eng',
      limit: 10,
      query,
      type: mediaType === 'tv' ? 'series' : 'movie',
      year,
    })
    const matches = readSearchRecords(response.data)
      .map((record) => toMediaSummary(record))
      .filter((record): record is MediaSummary => record !== null)

    return (
      matches.find((record) => record.mediaId === mediaId && record.mediaType === mediaType) ??
      matches.find((record) => record.mediaType === mediaType && titlesMatch(record.title, query)) ??
      null
    )
  }

  private async getMediaByRemoteId(mediaId: string): Promise<MediaDetail | null> {
    const response = await this.fetchJson<TvdbRemoteSearchResponse>(`/search/remoteid/${encodeURIComponent(mediaId)}`, {})
    const match = readRemoteSearchRecords(response.data).find((record) => record.series?.id || record.movie?.id)
    const seriesId = normalizeMediaId(match?.series?.id)

    if (seriesId) {
      return this.getMediaDetail({ mediaId: seriesId, mediaType: 'tv' })
    }

    const movieId = normalizeMediaId(match?.movie?.id)

    if (movieId) {
      return this.getMediaDetail({ mediaId: movieId, mediaType: 'movie' })
    }

    return null
  }

  async searchMedia(request: DiscoveryRequest): Promise<DiscoveryResponse> {
    if (!this.isConfigured() || !request.query.trim()) {
      return {
        hasMore: false,
        items: [],
        page: request.page,
      }
    }

    const pageSize = 30
    const offset = Math.max(0, (request.page - 1) * pageSize)
    const response = await this.fetchJson<TvdbSearchResponse>('/search', {
      language: 'eng',
      limit: pageSize,
      offset,
      query: request.query.trim(),
    })

    const filtered = readSearchRecords(response.data)
      .map((record) => toMediaSummary(record))
      .filter((record): record is MediaSummary => record !== null)

    return {
      hasMore: Boolean(response.links?.next) || (response.links?.total_items ?? 0) > offset + filtered.length,
      items: filtered,
      page: request.page,
    }
  }
}
