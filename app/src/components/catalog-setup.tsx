import { useState, type FormEvent } from 'react'
import { IconArrowUpRight, IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'
import logoUrl from '../assets/brand/logo.svg'
import { isMac } from '../lib/shortcuts'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/app-store'
import { Button } from './ui/button'
import { Input } from './ui/input'

const linkClass = 'rounded-sm text-foreground underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/60 focus-visible:outline-2 focus-visible:outline-ring'

export function CatalogSetup({ loading }: { loading: boolean }) {
  const initialize = useAppStore((state) => state.initialize)
  const [apiKey, setApiKey] = useState('')
  const [pin, setPin] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !apiKey.trim()) return
    setPending(true)
    setError(null)
    try {
      const result = await window.libmov.configureCatalog({ apiKey, pin: pin.trim() || undefined })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setApiKey('')
      setPin('')
      await initialize()
    } catch {
      setError('Could not save your key. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground" data-testid="catalog-setup">
      <header className={cn('app-drag flex h-[52px] shrink-0 items-center border-b border-white/[0.05]', isMac ? 'pl-[90px]' : 'pl-6')}>
        <img alt="libmov" className="h-[15px] w-auto" draggable={false} src={logoUrl} />
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-10 py-10">
        {loading ? (
          <p className="text-[13px] text-muted-foreground" role="status">Opening your library…</p>
        ) : (
          <section aria-labelledby="setup-title" className="my-auto w-full max-w-[440px]">
            <h1 className="text-[26px] font-semibold tracking-[-0.03em]" id="setup-title">Connect to TheTVDB</h1>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">Add an API key to search movies and series.</p>

            <ol className="mt-7 space-y-4 text-[13px] leading-6 text-muted-foreground">
              <li className="flex gap-4">
                <span aria-hidden className="w-3 shrink-0 font-mono text-[11px] text-faint">1</span>
                <span><a className={linkClass} href="https://www.thetvdb.com/login" rel="noreferrer" target="_blank">Sign in to TheTVDB<IconArrowUpRight aria-hidden className="ml-0.5 inline size-3 align-[-1px]" /></a> or create an account.</span>
              </li>
              <li className="flex gap-4">
                <span aria-hidden className="w-3 shrink-0 font-mono text-[11px] text-faint">2</span>
                <span>In your dashboard, open <span className="text-foreground">API Keys</span> and request a <span className="text-foreground">v4 API key</span>.</span>
              </li>
              <li className="flex gap-4">
                <span aria-hidden className="w-3 shrink-0 font-mono text-[11px] text-faint">3</span>
                <span>Describe your project and submit the request. Once your key is active, paste it below. <a className={linkClass} href="https://support.thetvdb.com/kb/faq.php?id=81" rel="noreferrer" target="_blank">API guide<IconArrowUpRight aria-hidden className="ml-0.5 inline size-3 align-[-1px]" /></a></span>
              </li>
            </ol>

            <form aria-busy={pending} className="mt-7 border-t border-white/[0.07] pt-6" onSubmit={(event) => { void connect(event) }}>
              <label className="mb-2 block text-[13px] font-medium" htmlFor="tvdb-api-key">API key</label>
              <div className="relative">
                <Input
                  aria-describedby={error ? 'key-error' : 'key-storage'}
                  aria-invalid={Boolean(error)}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoFocus
                  className="h-10 bg-white/[0.03] pr-10 font-mono text-[13px] placeholder:font-sans"
                  disabled={pending}
                  id="tvdb-api-key"
                  maxLength={512}
                  name="apiKey"
                  onChange={(event) => { setApiKey(event.target.value); setError(null) }}
                  placeholder="Paste your v4 API key"
                  required
                  spellCheck={false}
                  type={visible ? 'text' : 'password'}
                  value={apiKey}
                />
                <button aria-label={visible ? 'Hide API key' : 'Show API key'} aria-pressed={visible} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" disabled={pending} onClick={() => setVisible(!visible)} type="button">
                  {visible ? <IconEyeOff aria-hidden size={16} stroke={1.6} /> : <IconEye aria-hidden size={16} stroke={1.6} />}
                </button>
              </div>
              <details className="mt-3 text-[12px] text-muted-foreground">
                <summary className="w-fit cursor-pointer rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">My key requires a subscriber PIN</summary>
                <label className="mb-2 mt-3 block" htmlFor="tvdb-pin">Subscriber PIN</label>
                <Input autoComplete="off" className="h-9 font-mono text-[13px]" disabled={pending} id="tvdb-pin" maxLength={128} onChange={(event) => { setPin(event.target.value); setError(null) }} placeholder="PIN from your TheTVDB subscription" spellCheck={false} type="password" value={pin} />
              </details>
              {error ? <p className="mt-4 text-[12px] leading-5 text-destructive" id="key-error" role="alert">{error}</p> : null}
              <Button className="mt-5 h-10 w-full text-[13px] hover:bg-primary/90" disabled={pending || !apiKey.trim()} type="submit">
                {pending ? <><IconLoader2 aria-hidden className="animate-spin motion-reduce:animate-none" />Connecting…</> : 'Connect'}
              </Button>
              <p className="mt-3 text-[12px] leading-5 text-muted-foreground" id="key-storage">Your key is encrypted and saved on this device.</p>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
