import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { IconBookmark, IconBookmarkFilled, IconCheck } from '@tabler/icons-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { MediaSummary } from '../../shared/media'
import { mediaKeyOf } from '../../shared/media'
import type { GridLayout } from '../hooks/use-grid-layout'
import { columnGap } from '../hooks/use-grid-layout'
import { kindOf, posterOf, yearOf } from '../lib/media'
import { isModKey } from '../lib/shortcuts'
import { cn } from '../lib/utils'
import { useAppStore, useAppStoreWithEquality } from '../store/app-store'

export type PosterBadges = 'all' | 'watchlist' | 'none'

export function PosterGrid({
  count,
  getItem,
  gridRef,
  layout,
  onRowsChange,
  scrollRef,
  showBadges,
  testId,
}: {
  count: number
  getItem: (index: number) => MediaSummary | undefined
  gridRef: (node: HTMLDivElement | null) => void
  layout: GridLayout
  onRowsChange?: (range: { first: number; last: number }) => void
  scrollRef: RefObject<HTMLElement | null>
  showBadges: PosterBadges
  testId: string
}) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const rowCount = Math.ceil(count / layout.columns)
  const virtualizer = useVirtualizer({
    count: rowCount,
    estimateSize: () => layout.rowHeight,
    getScrollElement: () => scrollRef.current,
    overscan: 3,
    scrollMargin,
  })
  const rows = virtualizer.getVirtualItems()
  const firstRow = rows[0]?.index ?? 0
  const lastRow = rows.at(-1)?.index ?? 0

  useLayoutEffect(() => {
    setScrollMargin(innerRef.current?.offsetTop ?? 0)
  }, [])

  useLayoutEffect(() => {
    virtualizer.measure()
  }, [layout.rowHeight, virtualizer])

  useLayoutEffect(() => {
    onRowsChange?.({ first: firstRow, last: lastRow })
  }, [firstRow, lastRow, onRowsChange])

  const focusIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= count) {
        return
      }

      const find = () =>
        innerRef.current?.querySelector<HTMLButtonElement>(`[data-poster-index="${index}"] [data-poster-button]`)
      const target = find()

      if (target) {
        target.focus()
        target.scrollIntoView({ block: 'nearest' })
        return
      }

      virtualizer.scrollToIndex(Math.floor(index / layout.columns), { align: 'center' })
      window.requestAnimationFrame(() => find()?.focus())
    },
    [count, layout.columns, virtualizer],
  )

  return (
    <div
      data-poster-grid="true"
      data-testid={testId}
      ref={(node) => {
        innerRef.current = node
        gridRef(node)
      }}
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {rows.map((row) => (
          <div
            className="absolute left-0 top-0 grid w-full"
            key={row.key}
            style={{
              columnGap,
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              transform: `translateY(${row.start - scrollMargin}px)`,
            }}
          >
            {Array.from({ length: layout.columns }, (_, column) => {
              const index = row.index * layout.columns + column

              if (index >= count) {
                return null
              }

              const item = getItem(index)

              return item ? (
                <Poster
                  columns={layout.columns}
                  focusIndex={focusIndex}
                  index={index}
                  item={item}
                  key={mediaKeyOf(item)}
                  showBadges={showBadges}
                />
              ) : (
                <PosterPlaceholder key={`placeholder:${index}`} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Poster({
  columns,
  focusIndex,
  index,
  item,
  showBadges,
}: {
  columns: number
  focusIndex: (index: number) => void
  index: number
  item: MediaSummary
  showBadges: PosterBadges
}) {
  const openDetail = useAppStore((state) => state.openDetail)
  const toggleWatched = useAppStore((state) => state.toggleWatched)
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist)
  const status = useAppStoreWithEquality((state) => state.library.statuses[mediaKeyOf(item)])
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = posterOf(item)
  const year = yearOf(item)
  const inWatchlist = status?.inWatchlist ?? false
  const watched = status?.watched ?? false

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: columns,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -columns,
    }
    const move = moves[event.key]

    if (move !== undefined) {
      event.preventDefault()
      focusIndex(index + move)
      return
    }

    if (isModKey(event) && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      void toggleWatchlist(item)
      return
    }

    if (isModKey(event) && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      void toggleWatched(item)
    }
  }

  return (
    <div className="group relative" data-poster-index={index}>
      <button
        className="block w-full rounded-[10px] text-left outline-none"
        data-poster-button="true"
        data-testid="poster"
        onClick={() => void openDetail(item, 'library')}
        onKeyDown={handleKeyDown}
        title={item.titleHint}
        type="button"
      >
        <div
          className={cn(
            'relative aspect-[2/3] overflow-hidden rounded-[10px] bg-card ring-1 ring-white/[0.06] transition-[box-shadow,transform] duration-200',
            'group-hover:ring-white/20 group-has-[[data-poster-button]:focus-visible]:ring-2 group-has-[[data-poster-button]:focus-visible]:ring-primary',
          )}
        >
          {imageUrl && !imageFailed ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              data-testid="poster-image"
              draggable={false}
              loading="lazy"
              onError={() => setImageFailed(true)}
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-end bg-gradient-to-b from-white/[0.02] to-white/[0.06] p-3 text-[13px] leading-snug text-muted-foreground">
              {item.title}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <PosterBadge inWatchlist={inWatchlist} showBadges={showBadges} watched={watched} />
        </div>
        <div className="mt-2.5 min-w-0 px-0.5">
          <div className="truncate text-[13px] font-medium text-foreground/90">{item.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {[year, kindOf(item)].filter(Boolean).join(' · ')}
          </div>
        </div>
      </button>
      <div className="absolute bottom-[62px] left-2 right-2 flex justify-end gap-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <QuickAction
          active={inWatchlist}
          label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          onClick={() => void toggleWatchlist(item)}
          tone="brand"
        >
          {inWatchlist ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} stroke={1.8} />}
        </QuickAction>
        <QuickAction
          active={watched}
          label={watched ? 'Mark unwatched' : 'Mark watched'}
          onClick={() => void toggleWatched(item)}
          tone="light"
        >
          <IconCheck size={14} stroke={2.2} />
        </QuickAction>
      </div>
    </div>
  )
}

function PosterBadge({
  inWatchlist,
  showBadges,
  watched,
}: {
  inWatchlist: boolean
  showBadges: PosterBadges
  watched: boolean
}) {
  const showWatched = showBadges === 'all' && watched
  const showWatchlist = showBadges !== 'none' && inWatchlist

  if (!showWatched && !showWatchlist) {
    return null
  }

  return (
    <div className="absolute left-2 top-2 flex gap-1">
      {showWatchlist ? (
        <span className="flex size-5 items-center justify-center rounded-md bg-primary text-white shadow-sm" data-testid="badge-watchlist">
          <IconBookmarkFilled size={11} />
        </span>
      ) : null}
      {showWatched ? (
        <span className="flex size-5 items-center justify-center rounded-md bg-white text-black shadow-sm" data-testid="badge-watched">
          <IconCheck size={12} stroke={2.6} />
        </span>
      ) : null}
    </div>
  )
}

function QuickAction({
  active,
  children,
  label,
  onClick,
  tone,
}: {
  active: boolean
  tone: 'brand' | 'light'
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        'flex size-7 items-center justify-center rounded-full backdrop-blur-md transition-colors',
        active ? (tone === 'brand' ? 'bg-primary text-white' : 'bg-white text-black') : 'bg-black/55 text-white hover:bg-black/75',
      )}
      onClick={onClick}
      tabIndex={-1}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

function PosterPlaceholder() {
  return (
    <div>
      <div className="shimmer aspect-[2/3] rounded-[10px]" />
      <div className="shimmer mt-3 h-3 w-3/4 rounded" />
    </div>
  )
}
