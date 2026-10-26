import { cn } from '../lib/utils'

export function Keys({ className, keys }: { className?: string; keys: readonly string[] }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key) => (
        <kbd
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-white/[0.06] px-1 font-mono text-[10.5px] leading-none text-muted-foreground"
          key={key}
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
