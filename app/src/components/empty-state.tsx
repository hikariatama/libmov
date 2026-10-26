import type { ReactNode } from 'react'

export function EmptyState({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center text-center" data-testid="empty-state">
      <ClapperMark />
      <h2 className="mt-6 text-[15px] font-medium text-foreground">{title}</h2>
      <p className="mt-1.5 flex max-w-sm flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] leading-6 text-muted-foreground">
        {children}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function ClapperMark() {
  return (
    <svg aria-hidden className="h-12 w-12 text-primary/80" fill="none" viewBox="356 30 88 102">
      <g stroke="currentColor" strokeWidth="7">
        <path d="M360.128 73.7078H425.831C432.468 73.7078 435.786 73.7078 437.848 75.7106C439.91 77.7138 439.91 80.9374 439.91 87.3846V94.223C439.91 109.267 439.91 116.788 435.099 121.462C430.288 126.136 422.545 126.136 407.058 126.136H392.98C377.493 126.136 369.75 126.136 364.939 121.462C360.128 116.788 360.128 109.267 360.128 94.223V73.7078Z" />
        <path d="M360.121 73.7081C358.493 67.5174 357.679 64.422 357.879 61.7004C358.237 56.8255 360.755 52.3824 364.719 49.6285C366.932 48.0911 369.97 47.2617 376.046 45.6029L411.335 35.968C412.906 35.539 413.692 35.3245 414.369 35.2027C421.904 33.8491 429.304 38.2028 431.921 45.5281C432.156 46.1872 432.367 46.9876 432.788 48.5886C432.908 49.046 432.968 49.2748 433.003 49.4721C433.382 51.6656 432.161 53.8201 430.107 54.5819C429.923 54.6504 429.698 54.7116 429.249 54.8342L360.121 73.7081Z" />
        <path d="M376.085 71.4284L385.203 44.0748" />
        <path d="M407.997 62.3107L417.115 34.9572" />
        <path d="M380.643 107.9H394.32" strokeLinecap="round" />
      </g>
    </svg>
  )
}
