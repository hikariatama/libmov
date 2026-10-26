import { useMemo, useState } from 'react'
import type { MediaType, SetWatchedByTvdbIdImport, SetWatchedByTvdbIdsResponse } from '../../shared/media'
import { IconUpload } from '@tabler/icons-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Textarea } from './ui/textarea'
import { useAppStore } from '../store/app-store'

type ImportStatus = 'error' | 'idle' | 'importing' | 'ready'

export function ImportWatchedDialog() {
  const setWatchedByTvdbIds = useAppStore((state) => state.setWatchedByTvdbIds)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<SetWatchedByTvdbIdsResponse | null>(null)
  const mediaItems = useMemo(() => readTvdbImports(draft), [draft])
  const hasInvalidLines = useMemo(() => readInvalidLines(draft).length > 0, [draft])
  const canImport = mediaItems.length > 0 && !hasInvalidLines && status !== 'importing'

  const resetState = () => {
    setStatus('idle')
    setErrorMessage(null)
    setResult(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setDraft('')
      resetState()
    }
  }

  const handleImport = async () => {
    if (!canImport) {
      return
    }

    setStatus('importing')
    setErrorMessage(null)
    setResult(null)

    try {
      const nextResult = await setWatchedByTvdbIds(mediaItems)
      setResult(nextResult)
      setStatus('ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Import failed.')
      setStatus('error')
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="import-watched"
          type="button"
        >
          <IconUpload size={14} stroke={1.8} />
          Import
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import watched titles</DialogTitle>
          <DialogDescription>One title per line: a TheTVDB ID with an optional type, or a tab-separated row copied from a spreadsheet.</DialogDescription>
        </DialogHeader>
        <Textarea
          className="max-h-64 min-h-48 resize-none overflow-y-auto rounded-lg border-white/[0.08] bg-black/30 font-mono text-[12.5px]"
          onChange={(event) => {
            setDraft(event.target.value)
            resetState()
          }}
          placeholder={'355643\tmovie\nSpirited Away (2001)\t276\tmovie'}
          spellCheck={false}
          value={draft}
        />
        <ImportResult
          errorMessage={errorMessage}
          hasInvalidLines={hasInvalidLines}
          mediaItems={mediaItems}
          result={result}
          status={status}
        />
        <DialogFooter>
          <Button disabled={!canImport} onClick={() => void handleImport()}>
            {status === 'importing' ? 'Importing…' : mediaItems.length ? `Mark ${mediaItems.length} watched` : 'Mark watched'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportResult({
  errorMessage,
  hasInvalidLines,
  mediaItems,
  result,
  status,
}: {
  errorMessage: string | null
  hasInvalidLines: boolean
  mediaItems: SetWatchedByTvdbIdImport[]
  result: SetWatchedByTvdbIdsResponse | null
  status: ImportStatus
}) {
  if (hasInvalidLines) {
    return <p className="text-[13px] text-destructive">Some lines are not TheTVDB IDs. Use a number, optionally followed by movie or tv.</p>
  }

  if (status === 'error') {
    return <p className="text-sm text-destructive">{errorMessage}</p>
  }

  if (status === 'ready' && result) {
    return (
      <div className="grid gap-1 text-sm text-muted-foreground">
        <p>{result.importedIds.length} marked watched.</p>
        <p>{result.skippedIds.length} skipped.</p>
        {result.skippedIds.length > 0 ? (
          <p className="wrap-break-word">Skipped IDs: {result.skippedIds.join(', ')}</p>
        ) : null}
      </div>
    )
  }

  if (mediaItems.length > 0) {
    return <p className="text-[13px] text-muted-foreground">{mediaItems.length} titles ready.</p>
  }

  return <p className="text-[13px] text-faint">Nothing to import yet.</p>
}

function readTvdbImports(value: string): SetWatchedByTvdbIdImport[] {
  const parsed = readLines(value).map((line) => parseImportLine(line))

  if (parsed.some((item) => item === null)) {
    return []
  }

  return [
    ...new Map(
      parsed.map((item) => {
        const mediaItem = item as SetWatchedByTvdbIdImport

        return [`${mediaItem.mediaType ?? 'any'}:${mediaItem.mediaId}`, mediaItem]
      }),
    ).values(),
  ]
}

function readInvalidLines(value: string): string[] {
  return readLines(value).filter((line) => parseImportLine(line) === null)
}

function readLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseImportLine(line: string): SetWatchedByTvdbIdImport | null {
  const compactMatch = /^(\d+)(?:\s+(movie|tv|series))?$/i.exec(line)

  if (compactMatch) {
    const mediaId = compactMatch[1]

    if (!mediaId) {
      return null
    }

    return {
      mediaId,
      mediaType: readMediaType(compactMatch[2]),
    }
  }

  const fields = line
    .split('\t')
    .map((field) => field.trim())
    .filter(Boolean)
  const mediaId = fields.find((field) => /^\d+$/.test(field))

  if (!mediaId) {
    return null
  }

  const mediaType = fields.map(readMediaType).find((value): value is MediaType => value !== undefined)
  const title = fields.find((field) => field !== mediaId && readMediaType(field) === undefined)

  return { mediaId, mediaType, title }
}

function readMediaType(value: string | undefined): MediaType | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase()

  if (normalized === 'movie') {
    return 'movie'
  }

  if (normalized === 'series' || normalized === 'tv') {
    return 'tv'
  }

  return undefined
}
