import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useAppStore } from '../store/app-store'

export function Toaster() {
  const toast = useAppStore((state) => state.toast)
  const dismissToast = useAppStore((state) => state.dismissToast)

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => dismissToast(toast.id), 2200)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [dismissToast, toast])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center" aria-live="polite">
      <AnimatePresence>
        {toast ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex max-w-md items-center gap-2.5 rounded-full bg-popover py-2 pl-3 pr-4 text-[13px] text-foreground shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
            data-testid="toast"
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            key={toast.id}
            transition={{ damping: 30, stiffness: 420, type: 'spring' }}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{toast.message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
