import { IconBookmark, IconBookmarkFilled, IconCheck, IconLoader2, IconSearch } from '@tabler/icons-react'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { LibraryStatus, MediaSummary } from '../../shared/media'
import { mediaKeyOf } from '../../shared/media'
import { kindOf, posterOf, yearOf } from '../lib/media'
import { shortcuts } from '../lib/shortcuts'
import { Keys } from './keys'
import { cn } from '../lib/utils'
import { useAppStore, useAppStoreWithEquality } from '../store/app-store'

const rowHeight = 64
const loaderHeight = 48
const spring = { damping: 36, mass: 0.8, stiffness: 460, type: 'spring' } as const

export function CommandPalette() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const closeSearch = useAppStore((state) => state.closeSearch)
  const loadNextPage = useAppStore((state) => state.loadNextPage)
  const openDetail = useAppStore((state) => state.openDetail)
  const openSearch = useAppStore((state) => state.openSearch)
  const refreshDiscovery = useAppStore((state) => state.refreshDiscovery)
  const setActiveMediaKey = useAppStore((state) => state.setActiveMediaKey)
  const toggleWatched = useAppStore((state) => state.toggleWatched)
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist)
  const { activeMediaKey, errorMessage, hasMore, items, query, searchConfigured, searchFocusTick, searchOpen, status, statuses } =
    useAppStoreWithEquality((state) => ({
      activeMediaKey: state.activeMediaKey,
      errorMessage: state.errorMessage,
      hasMore: state.hasMore,
      items: state.items,
      query: state.query,
      searchConfigured: state.searchConfigured,
      searchFocusTick: state.searchFocusTick,
      searchOpen: state.searchOpen,
      status: state.bootstrapStatus,
      statuses: state.library.statuses,
    }))
  const [draftQuery, setDraftQuery] = useState(query)
  const hasQuery = draftQuery.trim().length > 0
  const hasResults = items.length > 0
  const activeIndex = activeMediaKey ? items.findIndex((item) => mediaKeyOf(item) === activeMediaKey) : -1
  const activeMedia = (activeIndex >= 0 ? items[activeIndex] : items[0]) ?? null
  const rowCount = items.length + (hasMore ? 1 : 0)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startTransition(() => {
        void refreshDiscovery({ query: draftQuery })
      })
    }, 180)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [draftQuery, refreshDiscovery])

  useEffect(() => {
    if (!searchOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [searchFocusTick, searchOpen])

  useEffect(() => {
    const firstItem = items[0]

    if (!firstItem) {
      setActiveMediaKey(null)
      return
    }

    if (!activeMediaKey || !items.some((item) => mediaKeyOf(item) === activeMediaKey)) {
      setActiveMediaKey(mediaKeyOf(firstItem))
    }
  }, [activeMediaKey, items, setActiveMediaKey])

  const virtualizer = useVirtualizer({
    count: rowCount,
    estimateSize: (index) => (index === items.length ? loaderHeight : rowHeight),
    getScrollElement: () => listRef.current,
    overscan: 8,
  })
  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (activeIndex >= 0 && searchOpen) {
      virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, searchOpen, virtualizer])

  useEffect(() => {
    const lastItem = virtualItems.at(-1)

    if (lastItem && hasMore && status !== 'loading' && hasQuery && lastItem.index >= items.length - 1) {
      void loadNextPage()
    }
  }, [hasMore, hasQuery, items.length, loadNextPage, status, virtualItems])

  const selectRelative = (offset: number) => {
    const baseIndex = activeIndex >= 0 ? activeIndex : 0
    const nextItem = items[Math.max(0, Math.min(baseIndex + offset, items.length - 1))]

    if (nextItem) {
      setActiveMediaKey(mediaKeyOf(nextItem))
    }
  }

  const close = () => {
    closeSearch()
    inputRef.current?.blur()
  }

  const canAct = searchOpen && Boolean(activeMedia)

  useHotkeys(
    [
      {
        callback: () => (searchOpen ? close() : openSearch()),
        hotkey: 'Mod+K',
        options: { ignoreInputs: false },
      },
      {
        callback: () => openSearch(),
        hotkey: '/',
        options: { enabled: !searchOpen },
      },
      {
        callback: () => close(),
        hotkey: 'Escape',
        options: { enabled: searchOpen, ignoreInputs: false },
      },
      {
        callback: () => selectRelative(1),
        hotkey: 'ArrowDown',
        options: { enabled: searchOpen && hasResults, ignoreInputs: false },
      },
      {
        callback: () => selectRelative(-1),
        hotkey: 'ArrowUp',
        options: { enabled: searchOpen && hasResults, ignoreInputs: false },
      },
      {
        callback: () => activeMedia && void openDetail(activeMedia, 'search'),
        hotkey: 'Enter',
        options: { enabled: canAct, ignoreInputs: false },
      },
      {
        callback: () => activeMedia && void toggleWatchlist(activeMedia),
        hotkey: 'Mod+L',
        options: { enabled: canAct, ignoreInputs: false },
      },
      {
        callback: () => activeMedia && void toggleWatched(activeMedia),
        hotkey: 'Mod+D',
        options: { enabled: canAct, ignoreInputs: false },
      },
    ],
    useMemo(() => ({ preventDefault: true, stopPropagation: true }), []),
  )

  return (
    <AnimatePresence>
      {searchOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex justify-center bg-black/60 px-8 pt-[11vh] backdrop-blur-[3px]"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              close()
            }
          }}
          transition={{ duration: 0.14 }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex h-fit max-h-[78vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl bg-popover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.09]"
            data-testid="search-palette"
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={spring}
          >
            <label className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
              {status === 'loading' && hasQuery ? (
                <IconLoader2 className="shrink-0 animate-spin text-muted-foreground" size={18} stroke={1.8} />
              ) : (
                <IconSearch className="shrink-0 text-muted-foreground" size={18} stroke={1.8} />
              )}
              <input
                className="h-full flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint"
                data-testid="search-input"
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder={
                  searchConfigured
                    ? 'Search movies and series'
                    : status === 'loading'
                      ? 'Connecting to TheTVDB…'
                      : (errorMessage ?? 'TheTVDB is unavailable')
                }
                readOnly={!searchConfigured}
                ref={inputRef}
                spellCheck={false}
                value={draftQuery}
              />
              <Keys keys={shortcuts.back} />
            </label>

            {hasQuery ? (
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]" data-testid="search-results-panel">
                <div className="h-[min(520px,58vh)] overflow-y-auto py-1.5" data-testid="search-results-scroll" ref={listRef}>
                  {hasResults ? (
                    <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
                      {virtualItems.map((virtualItem) => {
                        const item = items[virtualItem.index]
                        const style = { height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }

                        if (!item) {
                          return (
                            <div
                              className="absolute inset-x-0 flex items-center gap-2 px-6 text-[13px] text-muted-foreground"
                              data-testid="search-results-loader"
                              key="loader"
                              style={style}
                            >
                              <IconLoader2 className="animate-spin" size={14} />
                              Loading more
                            </div>
                          )
                        }

                        const key = mediaKeyOf(item)

                        return (
                          <ResultRow
                            active={key === (activeMedia ? mediaKeyOf(activeMedia) : null)}
                            item={item}
                            key={key}
                            onHover={() => setActiveMediaKey(key)}
                            onOpen={() => void openDetail(item, 'search')}
                            status={statuses[key]}
                            style={style}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                      {status === 'loading' ? 'Searching…' : (errorMessage ?? `Nothing found for “${draftQuery.trim()}”`)}
                    </div>
                  )}
                </div>
                <Preview
                  media={activeMedia}
                  onToggleWatched={() => activeMedia && void toggleWatched(activeMedia)}
                  onToggleWatchlist={() => activeMedia && void toggleWatchlist(activeMedia)}
                  status={activeMedia ? statuses[mediaKeyOf(activeMedia)] : undefined}
                />
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                Search the TheTVDB catalog by title.
              </div>
            )}

            <footer className="flex h-10 shrink-0 items-center gap-5 border-t border-white/[0.06] bg-white/[0.015] px-5 text-xs text-muted-foreground">
              <Hint keys={shortcuts.move}>Navigate</Hint>
              <Hint keys={shortcuts.open}>Open</Hint>
              <Hint keys={shortcuts.later}>Watchlist</Hint>
              <Hint keys={shortcuts.watched}>Watched</Hint>
              {hasQuery && hasResults ? (
                <span className="ml-auto tabular-nums text-faint">
                  <span data-testid="search-results-count">{items.length}</span>
                  {hasMore ? '+' : ''} results
                </span>
              ) : null}
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Hint({ children, keys }: { children: ReactNode; keys: readonly string[] }) {
  return (
    <span className="flex items-center gap-1.5">
      <Keys keys={keys} />
      {children}
    </span>
  )
}

function ResultRow({
  active,
  item,
  onHover,
  onOpen,
  status,
  style,
}: {
  active: boolean
  item: MediaSummary
  onHover: () => void
  onOpen: () => void
  status: LibraryStatus | undefined
  style: { height: number; transform: string }
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = posterOf(item)

  return (
    <div className="absolute inset-x-0 px-1.5" style={style}>
      <button
        className={cn(
          'flex h-full w-full items-center gap-3.5 rounded-xl px-3 text-left outline-none',
          active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]',
        )}
        data-active={active ? 'true' : 'false'}
        data-testid="search-result-row"
        onClick={onOpen}
        onPointerMove={active ? undefined : onHover}
        tabIndex={-1}
        type="button"
      >
        <div className="h-12 w-8 shrink-0 overflow-hidden rounded-[5px] bg-card ring-1 ring-white/[0.06]">
          {imageUrl && !imageFailed ? (
            <img alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" onError={() => setImageFailed(true)} src={imageUrl} />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-foreground">{item.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {[yearOf(item), kindOf(item), item.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status?.inWatchlist ? (
            <span className="flex size-5 items-center justify-center rounded-md bg-primary/90 text-white" data-testid="status-watchlist">
              <IconBookmarkFilled size={11} />
            </span>
          ) : null}
          {status?.watched ? (
            <span className="flex size-5 items-center justify-center rounded-md bg-white text-black" data-testid="status-watched">
              <IconCheck size={12} stroke={2.6} />
            </span>
          ) : null}
        </div>
      </button>
    </div>
  )
}

function Preview({
  media,
  onToggleWatched,
  onToggleWatchlist,
  status,
}: {
  media: MediaSummary | null
  onToggleWatched: () => void
  onToggleWatchlist: () => void
  status: LibraryStatus | undefined
}) {
  if (!media) {
    return <aside className="border-l border-white/[0.06]" />
  }

  const imageUrl = media.artworkUrl ?? media.artworkThumbnailUrl
  const inWatchlist = status?.inWatchlist ?? false
  const watched = status?.watched ?? false

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-white/[0.06] p-5" data-testid="search-preview">
      <div className="flex gap-4">
        <div className="h-[132px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-card ring-1 ring-white/[0.06]">
          {imageUrl ? <img alt="" className="h-full w-full object-cover" draggable={false} key={imageUrl} src={imageUrl} /> : null}
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-foreground">{media.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{[yearOf(media), kindOf(media)].filter(Boolean).join(' · ')}</div>
          {media.genres.length ? <div className="mt-2 text-xs leading-5 text-faint">{media.genres.slice(0, 3).join(', ')}</div> : null}
        </div>
      </div>
      <p className="line-clamp-[9] text-[13px] leading-[1.6] text-muted-foreground">{media.overview || 'No description yet.'}</p>
      <div className="mt-auto grid gap-1.5">
        <PreviewAction active={inWatchlist} keys={shortcuts.later} onClick={onToggleWatchlist} testId="preview-watchlist">
          {inWatchlist ? <IconBookmarkFilled className="text-primary" size={14} /> : <IconBookmark size={14} stroke={1.8} />}
          {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </PreviewAction>
        <PreviewAction active={watched} keys={shortcuts.watched} onClick={onToggleWatched} testId="preview-watched">
          <IconCheck className={cn(watched && 'text-foreground')} size={14} stroke={2} />
          {watched ? 'Watched' : 'Mark watched'}
        </PreviewAction>
      </div>
    </aside>
  )
}

function PreviewAction({
  active,
  children,
  keys,
  onClick,
  testId,
}: {
  active: boolean
  children: ReactNode
  keys: readonly string[]
  onClick: () => void
  testId: string
}) {
  return (
    <button
      className={cn(
        'flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] outline-none transition-colors',
        active ? 'bg-white/[0.08] text-foreground' : 'bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
      )}
      data-testid={testId}
      onClick={onClick}
      tabIndex={-1}
      type="button"
    >
      {children}
      <Keys className="ml-auto" keys={keys} />
    </button>
  )
}
