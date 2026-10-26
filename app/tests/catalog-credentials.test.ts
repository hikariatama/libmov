import { afterEach, expect, test } from 'bun:test'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CatalogCredentialsStore } from '../electron/catalog-credentials'

const directories: string[] = []
const secret = randomBytes(32)
const encryption = {
  isEncryptionAvailable: () => true,
  encryptString(value: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', secret, iv)
    const payload = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), payload])
  },
  decryptString(value: Buffer) {
    const decipher = createDecipheriv('aes-256-gcm', secret, value.subarray(0, 12))
    decipher.setAuthTag(value.subarray(12, 28))
    return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8')
  },
}

async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'libmov-credentials-'))
  directories.push(path)
  return path
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

test('credentials survive a new store instance without plaintext on disk', async () => {
  const path = await directory()
  const credentials = { apiKey: 'test-only-accepted-key', pin: 'test-only-pin' }
  await new CatalogCredentialsStore(path, encryption).save(credentials)
  const file = join(path, 'catalog-credentials.bin')
  const bytes = await readFile(file)
  expect(bytes.includes(Buffer.from(credentials.apiKey))).toBe(false)
  expect(bytes.includes(Buffer.from(credentials.pin))).toBe(false)
  expect(await new CatalogCredentialsStore(path, encryption).read()).toEqual(credentials)
  if (process.platform !== 'win32') expect((await stat(file)).mode & 0o777).toBe(0o600)
})

test('unavailable encryption cannot replace an existing credential', async () => {
  const path = await directory()
  const original = { apiKey: 'test-only-original-key' }
  const store = new CatalogCredentialsStore(path, encryption)
  await store.save(original)
  for (const unavailable of [
    { ...encryption, isEncryptionAvailable: () => false },
    { ...encryption, getSelectedStorageBackend: () => 'basic_text' },
  ]) {
    await expect(new CatalogCredentialsStore(path, unavailable).save({ apiKey: 'test-only-replacement' })).rejects.toThrow('Secure storage')
    expect(await store.read()).toEqual(original)
  }
})

test('an unreadable saved credential returns to setup', async () => {
  const path = await directory()
  await writeFile(join(path, 'catalog-credentials.bin'), 'invalid encrypted bytes')
  expect(await new CatalogCredentialsStore(path, encryption).read()).toBeNull()
})
