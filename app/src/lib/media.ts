import type { MediaSummary } from '../../shared/media'

export function yearOf(media: Pick<MediaSummary, 'releaseDate' | 'year'>): string | null {
  return media.year ?? media.releaseDate?.slice(0, 4) ?? null
}

export function kindOf(media: Pick<MediaSummary, 'mediaType'>): string {
  return media.mediaType === 'movie' ? 'Movie' : 'Series'
}

export function posterOf(media: Pick<MediaSummary, 'artworkThumbnailUrl' | 'artworkUrl'>): string | null {
  return media.artworkThumbnailUrl ?? media.artworkUrl
}
