import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { IconArrowLeft, IconArrowUpRight, IconBookmark, IconBookmarkFilled, IconCheck, IconPlayerPlayFilled } from '@tabler/icons-react'
import { useHotkeys } from '@tanstack/react-hotkeys'
import type { MediaCredit, MediaDetail, MediaSummary } from '../../shared/media'
import { mediaKeyOf } from '../../shared/media'
import { kindOf, yearOf } from '../lib/media'
import { shortcuts } from '../lib/shortcuts'
import { Keys } from './keys'
import { cn } from '../lib/utils'
import { useAppStore, useAppStoreWithEquality } from '../store/app-store'

export function DetailPage() {
  const backButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeDetail = useAppStore((state) => state.closeDetail)
  const toggleWatched = useAppStore((state) => state.toggleWatched)
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist)
  const { detailErrorMessage, detailFocusTick, detailMedia, detailPayload, detailStatus, searchOpen, status } =
    useAppStoreWithEquality((state) => {
      const reference = state.detailPayload ?? state.detailMedia

      return {
        detailErrorMessage: state.detailErrorMessage,
        detailFocusTick: state.detailFocusTick,
        detailMedia: state.detailMedia,
        detailPayload: state.detailPayload,
        detailStatus: state.detailStatus,
        searchOpen: state.searchOpen,
        status: reference ? state.library.statuses[mediaKeyOf(reference)] : undefined,
      }
    })
  const media = detailPayload ?? detailMedia
  const enabled = Boolean(media) && !searchOpen

  useEffect(() => {
    if (detailFocusTick) {
      backButtonRef.current?.focus({ preventScroll: true })
    }
  }, [detailFocusTick])

  useHotkeys(
    [
      { callback: () => closeDetail(), hotkey: 'Escape', options: { enabled, ignoreInputs: false } },
      { callback: () => closeDetail(), hotkey: 'Mod+[', options: { enabled, ignoreInputs: false } },
      { callback: () => media && void toggleWatchlist(media), hotkey: 'Mod+L', options: { enabled, ignoreInputs: false } },
      { callback: () => media && void toggleWatched(media), hotkey: 'Mod+D', options: { enabled, ignoreInputs: false } },
    ],
    useMemo(() => ({ preventDefault: true, stopPropagation: true }), []),
  )

  if (!media) {
    return null
  }

  const poster = media.artworkUrl ?? media.artworkThumbnailUrl
  const backdrop = detailPayload?.backdropUrl ?? null
  const inWatchlist = status?.inWatchlist ?? false
  const watched = status?.watched ?? false
  const runtime = formatRuntime(detailPayload?.averageRuntime ?? null)
  const genres = uniqueLabels(media.genres)
  const meta = [kindOf(media), yearOf(media), runtime, detailPayload?.statusLabel].filter(Boolean)

  return (
    <div className="relative h-full overflow-y-auto" data-testid="detail-page">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
        {backdrop ?? poster ? (
          <img
            alt=""
            className={cn('h-full w-full object-cover', backdrop ? 'opacity-45' : 'scale-125 opacity-30 blur-3xl')}
            draggable={false}
            src={backdrop ?? poster ?? undefined}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] px-10 pb-28 pt-6">
        <button
          className="flex h-8 items-center gap-2 rounded-lg bg-black/30 pl-2 pr-1.5 text-[13px] text-foreground/90 outline-none ring-1 ring-inset ring-white/10 backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="detail-back"
          onClick={() => closeDetail()}
          ref={backButtonRef}
          type="button"
        >
          <IconArrowLeft size={15} stroke={1.8} />
          Back
          <Keys keys={shortcuts.back} />
        </button>

        <section className="mt-10 grid grid-cols-[220px_minmax(0,1fr)] items-end gap-10">
          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-card shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
            {poster ? (
              <img alt={media.title} className="h-full w-full object-cover" data-testid="detail-poster" draggable={false} src={poster} />
            ) : (
              <div className="flex h-full items-end p-4 text-sm text-muted-foreground">{media.title}</div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
              {meta.map((item, index) => (
                <span className="flex items-center gap-2" key={item}>
                  {index > 0 ? <span className="text-faint">·</span> : null}
                  {item}
                </span>
              ))}
            </div>
            <h1 className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground" data-testid="detail-title">
              {media.title}
            </h1>
            {genres.length ? <p className="mt-3 text-[14px] text-muted-foreground">{genres.join(', ')}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  'flex h-9 items-center gap-2 rounded-lg pl-3 pr-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  inWatchlist ? 'bg-white/[0.08] text-foreground hover:bg-white/[0.12]' : 'bg-primary text-white hover:bg-primary/90',
                )}
                data-state={inWatchlist ? 'on' : 'off'}
                data-testid="detail-watchlist-toggle"
                onClick={() => void toggleWatchlist(media)}
                type="button"
              >
                {inWatchlist ? <IconBookmarkFilled className="text-primary" size={15} /> : <IconBookmark size={15} stroke={2} />}
                {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                <Keys className="[&_kbd]:bg-black/20 [&_kbd]:text-current/70" keys={shortcuts.later} />
              </button>
              <button
                className={cn(
                  'flex h-9 items-center gap-2 rounded-lg pl-3 pr-2 text-[13px] font-medium outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  watched ? 'bg-white text-black ring-white' : 'bg-white/[0.04] text-foreground ring-white/10 hover:bg-white/[0.08]',
                )}
                data-state={watched ? 'on' : 'off'}
                data-testid="detail-watched-toggle"
                onClick={() => void toggleWatched(media)}
                type="button"
              >
                <IconCheck size={15} stroke={2.2} />
                {watched ? 'Watched' : 'Mark watched'}
                <Keys className={cn(watched && '[&_kbd]:bg-black/10 [&_kbd]:text-black/60')} keys={shortcuts.watched} />
              </button>
              {detailPayload?.trailers[0] ? (
                <a
                  className="flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  href={detailPayload.trailers[0].url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <IconPlayerPlayFilled size={13} />
                  Trailer
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)_320px] gap-14">
          <div className="min-w-0">
            <p className="max-w-[66ch] text-[15px] leading-[1.7] text-foreground/80">
              {media.overview || (detailStatus === 'loading' ? '' : 'No description yet.')}
            </p>
            {detailStatus === 'loading' ? <LoadingLines /> : null}
            {detailStatus === 'error' && detailErrorMessage ? (
              <p className="mt-4 text-[13px] text-destructive">{detailErrorMessage}</p>
            ) : null}
            {detailPayload?.credits.length ? <Cast credits={detailPayload.credits} /> : null}
          </div>
          {detailPayload ? <Facts detail={detailPayload} media={media} /> : null}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">{children}</h2>
}

function Cast({ credits }: { credits: MediaCredit[] }) {
  return (
    <section className="mt-12">
      <SectionTitle>Cast</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-4">
        {credits.slice(0, 12).map((credit) => (
          <div className="flex min-w-0 items-center gap-3" key={`${credit.personName}:${credit.characterName}`}>
            <div className="size-10 shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-white/[0.06]">
              {credit.personImageUrl ? (
                <img alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" src={credit.personImageUrl} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-faint">{initials(credit.personName)}</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] text-foreground">{credit.personName}</div>
              {credit.characterName ? <div className="truncate text-xs text-muted-foreground">{credit.characterName}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Facts({ detail, media }: { detail: MediaDetail; media: MediaSummary }) {
  const isSeries = media.mediaType === 'tv'
  const rows: [string, string | null][] = [
    [isSeries ? 'First aired' : 'Released', formatDate(detail.firstAired ?? media.releaseDate)],
    ['Last aired', isSeries ? formatDate(detail.lastAired) : null],
    ['Seasons', isSeries && detail.seasonsCount ? String(detail.seasonsCount) : null],
    ['Episodes', isSeries && detail.episodesCount ? String(detail.episodesCount) : null],
    ['Network', detail.latestNetwork ?? detail.originalNetwork],
    ['Country', uniqueLabels((detail.countries.length ? detail.countries : [media.originalCountry]).filter((value): value is string => Boolean(value)).map((value) => (value.length <= 3 ? value.toUpperCase() : value))).join(', ') || null],
    ['Language', detail.spokenLanguages.join(', ') || media.originalLanguage || null],
    ['Studio', detail.companies.slice(0, 3).join(', ') || null],
    ['Rated', detail.contentRatings.slice(0, 3).map((rating) => `${rating.name} (${rating.country.toUpperCase()})`).join(', ') || null],
    ['Also known as', detail.aliases.slice(0, 3).join(', ') || null],
  ]
  const imdb = detail.externalIds.find((remote) => remote.sourceName.toLowerCase().includes('imdb'))
  const links = [
    { href: `https://thetvdb.com/dereferrer/${media.mediaType === 'movie' ? 'movie' : 'series'}/${media.mediaId}`, label: 'TheTVDB' },
    ...(imdb ? [{ href: `https://www.imdb.com/title/${imdb.value}`, label: 'IMDb' }] : []),
  ]

  return (
    <aside>
      <SectionTitle>Details</SectionTitle>
      <dl className="grid gap-y-3 text-[13px]" data-testid="detail-facts">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3" key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground/85">{value}</dd>
            </div>
          ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            className="flex h-7 items-center gap-1 rounded-md bg-white/[0.04] px-2.5 text-xs text-muted-foreground outline-none ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            href={link.href}
            key={link.label}
            rel="noreferrer"
            target="_blank"
          >
            {link.label}
            <IconArrowUpRight size={12} stroke={1.8} />
          </a>
        ))}
      </div>
    </aside>
  )
}

function LoadingLines() {
  return (
    <div className="grid max-w-[60ch] gap-2.5">
      <div className="shimmer h-3.5 w-full rounded" />
      <div className="shimmer h-3.5 w-11/12 rounded" />
      <div className="shimmer h-3.5 w-3/4 rounded" />
    </div>
  )
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>()

  return values.filter((value) => {
    const key = value.trim().toLowerCase()

    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRuntime(value: number | null): string | null {
  if (!value) {
    return null
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (!hours) {
    return `${minutes}m`
  }

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}
