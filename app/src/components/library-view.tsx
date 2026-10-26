import type { ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconArrowUp, IconRefresh } from '@tabler/icons-react'
import { shortcuts } from '../lib/shortcuts'
import { Keys } from './keys'
import { cn } from '../lib/utils'
import { useAppStore, useAppStoreWithEquality } from '../store/app-store'
import type { LibraryTab } from '../store/slices/ui-slice'
import { EmptyState } from './empty-state'
import { ImportWatchedDialog } from './import-watched-dialog'
import { useGridLayout } from '../hooks/use-grid-layout'
import { PosterGrid } from './poster-grid'

export function LibraryView({ tab }: { tab: LibraryTab }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="h-full overflow-y-auto" data-testid={`view-${tab}`} ref={scrollRef}>
      <div className="mx-auto w-full max-w-[1680px] px-10 pb-24 pt-9">
        {tab === 'discover' ? <DiscoverView scrollRef={scrollRef} /> : <CollectionView scrollRef={scrollRef} tab={tab} />}
      </div>
    </div>
  )
}

function ViewHeader({ actions, count, subtitle, title }: { actions?: ReactNode; count?: number; subtitle: string; title: string }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-6">
      <div>
        <h1 className="flex items-baseline gap-2.5 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
          {title}
          {count !== undefined ? (
            <span className="text-[15px] font-normal tabular-nums tracking-normal text-faint">{count}</span>
          ) : null}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

function CollectionView({ scrollRef, tab }: { scrollRef: RefObject<HTMLDivElement | null>; tab: 'watched' | 'watchlist' }) {
  const items = useAppStoreWithEquality((state) =>
    tab === 'watchlist' ? state.library.watchlist : state.library.recentlyWatched,
  )
  const openSearch = useAppStore((state) => state.openSearch)
  const { layout, ref } = useGridLayout()
  const isWatchlist = tab === 'watchlist'
  const getItem = useCallback((index: number) => items[index], [items])

  return (
    <>
      <ViewHeader
        actions={isWatchlist ? undefined : <ImportWatchedDialog />}
        count={items.length}
        subtitle={isWatchlist ? 'Titles you plan to watch, newest first.' : 'Everything you have seen, most recent first.'}
        title={isWatchlist ? 'Watchlist' : 'Watched'}
      />
      <span className="sr-only" data-testid={isWatchlist ? 'watchlist-count' : 'watched-count'}>
        {items.length}
      </span>
      {items.length === 0 ? (
        <EmptyState
          action={(
            <button
              className="flex h-8 items-center gap-2 rounded-lg bg-white/[0.06] pl-3 pr-1.5 text-[13px] text-foreground transition-colors hover:bg-white/[0.1]"
              onClick={() => openSearch()}
              type="button"
            >
              Find a title
              <Keys keys={shortcuts.search} />
            </button>
          )}
          title={isWatchlist ? 'Your watchlist is empty' : 'Nothing watched yet'}
        >
          {isWatchlist ? (
            <>
              Search for a title and press <Keys keys={shortcuts.later} /> to save it here.
            </>
          ) : (
            <>
              Press <Keys keys={shortcuts.watched} /> on any title to log it, or import a list of TheTVDB IDs.
            </>
          )}
        </EmptyState>
      ) : (
        <PosterGrid
          count={items.length}
          getItem={getItem}
          gridRef={ref}
          layout={layout}
          scrollRef={scrollRef}
          showBadges={isWatchlist ? 'none' : 'watchlist'}
          testId={isWatchlist ? 'watchlist-grid' : 'watched-grid'}
        />
      )}
    </>
  )
}

function DiscoverView({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const ensureMovieLibrary = useAppStore((state) => state.ensureMovieLibrary)
  const errorMessage = useAppStore((state) => state.movieLibraryErrorMessage)
  const hasMore = useAppStore((state) => state.movieLibraryHasMore)
  const hasPrevious = useAppStore((state) => state.movieLibraryHasPrevious)
  const items = useAppStoreWithEquality((state) => state.movieLibraryItems)
  const loadNextPage = useAppStore((state) => state.loadNextMovieLibraryPage)
  const loadPreviousPage = useAppStore((state) => state.loadPreviousMovieLibraryPage)
  const refreshMovieLibrary = useAppStore((state) => state.refreshMovieLibrary)
  const restoreIndex = useAppStore((state) => state.movieLibraryRestoreIndex)
  const setScrollPosition = useAppStore((state) => state.setMovieLibraryScrollPosition)
  const startIndex = useAppStore((state) => state.movieLibraryStartIndex)
  const status = useAppStore((state) => state.movieLibraryStatus)
  const { layout, ready, ref } = useGridLayout()
  const restoredRef = useRef(restoreIndex === 0)
  const [canScrollToTop, setCanScrollToTop] = useState(restoreIndex > 0)
  const loadedEndIndex = startIndex + items.length
  const count = Math.max(loadedEndIndex, restoreIndex + layout.columns) + (hasMore ? layout.columns * 2 : 0)

  useEffect(() => {
    void ensureMovieLibrary()
  }, [ensureMovieLibrary])

  useEffect(() => {
    const element = scrollRef.current

    if (!element || restoredRef.current || !ready || items.length === 0) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      element.scrollTo({ top: Math.floor(restoreIndex / layout.columns) * layout.rowHeight })
      restoredRef.current = true
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [items.length, layout.columns, layout.rowHeight, ready, restoreIndex, scrollRef])

  useEffect(() => {
    const element = scrollRef.current

    if (!element) {
      return
    }

    let frame: number | null = null

    const handleScroll = () => {
      setCanScrollToTop(element.scrollTop > 400)

      if (!restoredRef.current || frame !== null) {
        return
      }

      frame = window.requestAnimationFrame(() => {
        frame = null
        setScrollPosition({
          itemIndex: Math.floor(element.scrollTop / layout.rowHeight) * layout.columns,
          offset: element.scrollTop,
        })
      })
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [layout.columns, layout.rowHeight, scrollRef, setScrollPosition])

  const handleRowsChange = useCallback(
    ({ first, last }: { first: number; last: number }) => {
      if (!restoredRef.current || status === 'loading') {
        return
      }

      if (hasMore && last >= Math.ceil(loadedEndIndex / layout.columns) - 3) {
        void loadNextPage()
        return
      }

      if (hasPrevious && first <= Math.floor(startIndex / layout.columns) + 3) {
        void loadPreviousPage()
      }
    },
    [hasMore, hasPrevious, layout.columns, loadNextPage, loadPreviousPage, loadedEndIndex, startIndex, status],
  )

  const getItem = useCallback(
    (index: number) => (index >= startIndex ? items[index - startIndex] : undefined),
    [items, startIndex],
  )

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ behavior: 'smooth', top: 0 })
    setScrollPosition({ itemIndex: 0, offset: 0 })

    if (startIndex > 0) {
      void refreshMovieLibrary()
    }
  }

  return (
    <>
      <ViewHeader
        actions={(
          <button
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40"
            disabled={status === 'loading'}
            onClick={() => {
              restoredRef.current = true
              void refreshMovieLibrary()
            }}
            type="button"
          >
            <IconRefresh className={cn(status === 'loading' && 'animate-spin')} size={14} stroke={1.8} />
            Refresh
          </button>
        )}
        subtitle="The whole TheTVDB catalog. Open a poster for details, or save it straight from the grid."
        title="Discover"
      />
      {errorMessage ? <p className="mb-6 text-[13px] text-destructive">{errorMessage}</p> : null}
      <PosterGrid
        count={status === 'idle' && items.length === 0 ? layout.columns * 4 : count}
        getItem={getItem}
        gridRef={ref}
        layout={layout}
        onRowsChange={handleRowsChange}
        scrollRef={scrollRef}
        showBadges="all"
        testId="discover-grid"
      />
      <button
        aria-label="Back to top"
        className={cn(
          'fixed bottom-6 right-6 z-20 flex size-10 items-center justify-center rounded-full bg-popover text-foreground shadow-lg ring-1 ring-white/10 transition-all hover:bg-accent',
          canScrollToTop ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
        onClick={scrollToTop}
        type="button"
      >
        <IconArrowUp size={17} stroke={1.8} />
      </button>
    </>
  )
}
