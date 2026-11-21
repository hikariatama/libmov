import Database from 'better-sqlite3'
import { existsSync, linkSync, mkdirSync, mkdtempSync, openSync, closeSync, fsyncSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export async function migrateLegacyLibrary(sourceDirectory: string, destinationDirectory: string): Promise<void> {
  const destination = join(destinationDirectory, 'library.sqlite')
  const source = join(sourceDirectory, 'library.sqlite')
  if (existsSync(destination) || !existsSync(source)) return
  mkdirSync(destinationDirectory, { recursive: true })
  const temporary = mkdtempSync(join(destinationDirectory, '.library-migration-'))
  const snapshot = join(temporary, 'library.sqlite')
  let legacy: Database.Database | undefined
  try {
    legacy = new Database(source, { readonly: true, fileMustExist: true })
    await legacy.backup(snapshot)
    const check = new Database(snapshot, { readonly: true, fileMustExist: true })
    try {
      if (check.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Library migration integrity check failed.')
    } finally {
      check.close()
    }
    const descriptor = openSync(snapshot, 'r')
    try { fsyncSync(descriptor) } finally { closeSync(descriptor) }
    // Link publishes the complete snapshot atomically without replacing an existing library.
    linkSync(snapshot, destination)
  } finally {
    legacy?.close()
    rmSync(temporary, { recursive: true, force: true })
  }
}
