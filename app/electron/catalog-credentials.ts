import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface CatalogCredentials {
  apiKey: string
  pin?: string
}

interface CredentialEncryption {
  isEncryptionAvailable: () => boolean
  encryptString: (value: string) => Buffer
  decryptString: (value: Buffer) => string
  getSelectedStorageBackend?: () => string
}

export class CatalogCredentialsStore {
  private readonly file: string
  private readonly directory: string
  private readonly encryption: CredentialEncryption

  constructor(directory: string, encryption: CredentialEncryption) {
    this.directory = directory
    this.encryption = encryption
    this.file = join(directory, 'catalog-credentials.bin')
  }

  private canEncrypt(): boolean {
    return this.encryption.isEncryptionAvailable() && this.encryption.getSelectedStorageBackend?.() !== 'basic_text'
  }

  async read(): Promise<CatalogCredentials | null> {
    try {
      if (!this.canEncrypt()) return null
      const value = JSON.parse(this.encryption.decryptString(await readFile(this.file))) as CatalogCredentials
      if (typeof value.apiKey !== 'string' || !value.apiKey.trim()) return null
      if (value.pin !== undefined && typeof value.pin !== 'string') return null
      return { apiKey: value.apiKey.trim(), pin: value.pin?.trim() || undefined }
    } catch {
      // A key encrypted for another OS account must be entered again.
      return null
    }
  }

  async save(credentials: CatalogCredentials): Promise<void> {
    if (!this.canEncrypt()) throw new Error('Secure storage is unavailable. Unlock your system keychain and try again.')
    await mkdir(this.directory, { recursive: true })
    const temporaryFile = `${this.file}.tmp`
    try {
      await writeFile(temporaryFile, this.encryption.encryptString(JSON.stringify(credentials)), { mode: 0o600 })
      await rename(temporaryFile, this.file)
    } finally {
      await rm(temporaryFile, { force: true })
    }
  }
}
