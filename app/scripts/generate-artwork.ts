import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Brand artwork is pre-rendered on macOS (sips, iconutil, tiffutil) and committed under `brand/`,
// so every release runner only copies files into electron-builder's `build/` directory.

function createIco(png: Buffer): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png])
}

async function main(): Promise<void> {
  const appRoot = resolve(import.meta.dirname, '..')
  const brandDirectory = join(appRoot, 'brand')
  const buildDirectory = join(appRoot, 'build')

  await rm(buildDirectory, { force: true, recursive: true })
  await mkdir(buildDirectory, { recursive: true })
  await cp(brandDirectory, buildDirectory, { recursive: true })

  const icon256 = await readFile(join(brandDirectory, 'icons', '256x256.png'))
  await writeFile(join(buildDirectory, 'icon.ico'), createIco(icon256))
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
