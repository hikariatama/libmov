import { IconSearch } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import logoUrl from '../assets/brand/logo.svg'
import { isMac, shortcuts } from '../lib/shortcuts'
import { Keys } from './keys'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/app-store'
import type { LibraryTab } from '../store/slices/ui-slice'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const tabs: { hotkey: string; id: LibraryTab; label: string }[] = [
  { hotkey: '1', id: 'watchlist', label: 'Watchlist' },
  { hotkey: '2', id: 'watched', label: 'Watched' },
  { hotkey: '3', id: 'discover', label: 'Discover' },
]

export function TopBar() {
  const currentView = useAppStore((state) => state.currentView)
  const libraryTab = useAppStore((state) => state.libraryTab)
  const openSearch = useAppStore((state) => state.openSearch)
  const setLibraryTab = useAppStore((state) => state.setLibraryTab)
  const watchlistCount = useAppStore((state) => state.library.watchlist.length)
  const watchedCount = useAppStore((state) => state.library.recentlyWatched.length)
  const counts: Partial<Record<LibraryTab, number>> = { watched: watchedCount, watchlist: watchlistCount }

  return (
    <header
      className={cn(
        'app-drag relative z-30 flex h-[52px] shrink-0 items-center border-b border-white/[0.05] pr-3',
        isMac ? 'pl-[86px]' : 'pl-5',
      )}
    >
      <button
        aria-label="libmov home"
        className="app-no-drag rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setLibraryTab('watchlist')}
        type="button"
      >
        <img alt="libmov" className="h-[15px] w-auto" draggable={false} src={logoUrl} />
      </button>

      <nav className="app-no-drag absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-white/[0.04] p-[3px] ring-1 ring-inset ring-white/[0.04]">
        {tabs.map((tab) => {
          const active = currentView === 'library' && libraryTab === tab.id
          const count = counts[tab.id]

          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setLibraryTab(tab.id)}
                  type="button"
                >
                  {active ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-white/[0.09]"
                      layoutId="top-bar-tab"
                      transition={{ damping: 34, stiffness: 420, type: 'spring' }}
                    />
                  ) : null}
                  <span className="relative">{tab.label}</span>
                  {count ? <span className="relative tabular-nums text-faint">{count}</span> : null}
                </button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2" side="bottom">
                {tab.label} <Keys className="opacity-80" keys={[tab.hotkey]} />
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <button
        className="app-no-drag ml-auto flex h-8 w-60 items-center gap-2 rounded-lg bg-white/[0.04] pl-2.5 pr-1.5 text-[13px] text-muted-foreground outline-none ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-white/[0.07] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="search-trigger"
        onClick={() => openSearch()}
        type="button"
      >
        <IconSearch size={14} stroke={1.8} />
        Search titles
        <Keys className="ml-auto" keys={shortcuts.search} />
      </button>
    </header>
  )
}
