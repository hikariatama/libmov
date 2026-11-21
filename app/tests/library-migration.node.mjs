import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { mkdtempSync, mkdirSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateLegacyLibrary } from '../electron/library-migration.ts'

test('migration snapshots committed WAL data, preserves the source and never replaces the destination', async () => {
  const root = mkdtempSync(join(tmpdir(), 'libmov-migration-'))
  const source = join(root, 'legacy')
  const destination = join(root, 'current')
  mkdirSync(source)
  const legacy = new Database(join(source, 'library.sqlite'))
  try {
    legacy.pragma('journal_mode = WAL')
    legacy.pragma('wal_autocheckpoint = 0')
    legacy.exec('CREATE TABLE titles (name TEXT); INSERT INTO titles VALUES (\'Synthetic WAL title\')')
    assert.ok(existsSync(join(source, 'library.sqlite-wal')))
    await migrateLegacyLibrary(source, destination)
    const migrated = new Database(join(destination, 'library.sqlite'))
    try {
      assert.equal(migrated.prepare('SELECT name FROM titles').get().name, 'Synthetic WAL title')
      legacy.exec("INSERT INTO titles VALUES ('Later title')")
      await migrateLegacyLibrary(source, destination)
      assert.equal(migrated.prepare('SELECT count(*) AS n FROM titles').get().n, 1)
      assert.equal(legacy.prepare('SELECT count(*) AS n FROM titles').get().n, 2)
      assert.ok(!readdirSync(destination).some((name) => name.startsWith('.library-migration-')))
    } finally { migrated.close() }
  } finally { legacy.close(); rmSync(root, { recursive: true, force: true }) }
})

test('failed migration leaves no final database and is retryable', async () => {
  const root = mkdtempSync(join(tmpdir(), 'libmov-migration-'))
  const source = join(root, 'legacy')
  const destination = join(root, 'current')
  mkdirSync(source)
  try {
    writeFileSync(join(source, 'library.sqlite'), 'not a database')
    await assert.rejects(migrateLegacyLibrary(source, destination))
    assert.equal(existsSync(join(destination, 'library.sqlite')), false)
    assert.deepEqual(readdirSync(destination), [])
    rmSync(join(source, 'library.sqlite'))
    const legacy = new Database(join(source, 'library.sqlite'))
    legacy.exec('CREATE TABLE titles (name TEXT)')
    legacy.close()
    await migrateLegacyLibrary(source, destination)
    assert.ok(existsSync(join(destination, 'library.sqlite')))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
