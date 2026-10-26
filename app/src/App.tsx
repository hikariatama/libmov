import { useEffect, useMemo } from 'react'
import { HotkeysProvider, useHotkeys } from '@tanstack/react-hotkeys'
import { AnimatePresence, motion } from 'framer-motion'
import { CatalogSetup } from './components/catalog-setup'
import { CommandPalette } from './components/command-palette'
import { DetailPage } from './components/detail-page'
import { LibraryView } from './components/library-view'
import { Toaster } from './components/toaster'
import { TopBar } from './components/top-bar'
import { TooltipProvider } from './components/ui/tooltip'
import { useAppStore } from './store/app-store'

const pageTransition = { damping: 36, mass: 0.8, stiffness: 380, type: 'spring' } as const

function App() {
  const initialize = useAppStore((state) => state.initialize)
  const initialized = useAppStore((state) => state.initialized)
  const searchConfigured = useAppStore((state) => state.searchConfigured)

  useEffect(() => {
    document.documentElement.classList.add('dark')
    void initialize()
  }, [initialize])

  return (
    <HotkeysProvider defaultOptions={{ hotkey: { preventDefault: true, stopPropagation: true } }}>
      <TooltipProvider delayDuration={400}>
        {initialized && searchConfigured ? (
          <>
            <div className="flex h-screen flex-col bg-background text-foreground">
              <TopBar />
              <Surface />
            </div>
            <CommandPalette />
            <Toaster />
          </>
        ) : (
          <CatalogSetup loading={!initialized} />
        )}
      </TooltipProvider>
    </HotkeysProvider>
  )
}

function Surface() {
  const currentView = useAppStore((state) => state.currentView)
  const detailFocusTick = useAppStore((state) => state.detailFocusTick)
  const libraryTab = useAppStore((state) => state.libraryTab)
  const searchOpen = useAppStore((state) => state.searchOpen)
  const setLibraryTab = useAppStore((state) => state.setLibraryTab)
  const surfaceKey = currentView === 'detail' ? `detail:${detailFocusTick}` : libraryTab

  useHotkeys(
    [
      { callback: () => setLibraryTab('watchlist'), hotkey: '1', options: { enabled: !searchOpen } },
      { callback: () => setLibraryTab('watched'), hotkey: '2', options: { enabled: !searchOpen } },
      { callback: () => setLibraryTab('discover'), hotkey: '3', options: { enabled: !searchOpen } },
    ],
    useMemo(() => ({ preventDefault: true }), []),
  )

  return (
    <div className="relative min-h-0 flex-1">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.main
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0"
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          initial={{ opacity: 0, y: currentView === 'detail' ? 12 : 6 }}
          key={surfaceKey}
          transition={pageTransition}
        >
          {currentView === 'detail' ? <DetailPage /> : <LibraryView tab={libraryTab} />}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

export default App
