import { existsSync } from 'node:fs'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

type PlatformTarget = 'linux' | 'mac' | 'win'
type ArchTarget = 'arm64' | 'x64'

const currentPlatformMap: Record<NodeJS.Platform, PlatformTarget | null> = {
  aix: null,
  android: null,
  cygwin: null,
  darwin: 'mac',
  freebsd: null,
  haiku: null,
  linux: 'linux',
  netbsd: null,
  openbsd: null,
  sunos: null,
  win32: 'win',
}

const platformAliases: Record<string, PlatformTarget> = {
  darwin: 'mac',
  linux: 'linux',
  mac: 'mac',
  macos: 'mac',
  'mac-os': 'mac',
  win: 'win',
  windows: 'win',
  win32: 'win',
}

const archAliases: Record<string, ArchTarget> = {
  aarch64: 'arm64',
  arm64: 'arm64',
  x64: 'x64',
  x86: 'x64',
  x86_64: 'x64',
}

const defaultTargets: Record<PlatformTarget, string> = {
  linux: 'appimage',
  mac: 'app',
  win: 'exe-setup',
}

const targetAliases: Record<PlatformTarget, Record<string, string>> = {
  linux: {
    appimage: 'AppImage',
    binary: 'tar.gz',
    deb: 'deb',
    rpm: 'rpm',
    tar: 'tar.gz',
    'tar.gz': 'tar.gz',
  },
  mac: {
    app: 'dir',
    dmg: 'dmg',
    zip: 'zip',
  },
  win: {
    exe: 'portable',
    'exe-setup': 'nsis',
    msi: 'msi',
    'msi-setup': 'msi',
    nsis: 'nsis',
    portable: 'portable',
  },
}

function readOption(flag: string): string | undefined {
  const exact = process.argv.find((argument) => argument.startsWith(`${flag}=`))
  if (exact) {
    return exact.slice(flag.length + 1)
  }

  const index = process.argv.indexOf(flag)
  if (index >= 0) {
    return process.argv[index + 1]
  }

  return undefined
}

function normalizePlatform(value: string | undefined): PlatformTarget {
  const inferred = value ? platformAliases[value.trim().toLowerCase()] : currentPlatformMap[process.platform]

  if (!inferred) {
    throw new Error('Unsupported platform. Use mac, linux, or windows.')
  }

  return inferred
}

function normalizeArch(value: string | undefined): ArchTarget {
  const normalized = value ? archAliases[value.trim().toLowerCase()] : archAliases[process.arch]

  if (!normalized) {
    throw new Error('Unsupported architecture. Use x86/x64 or arm64.')
  }

  return normalized
}

function normalizeTarget(platform: PlatformTarget, value: string | undefined): { builderTarget: string; userTarget: string } {
  const requested = (value ?? defaultTargets[platform]).trim().toLowerCase()
  const builderTarget = targetAliases[platform][requested]

  if (!builderTarget) {
    throw new Error(`Unsupported target "${requested}" for ${platform}.`)
  }

  return {
    builderTarget,
    userTarget: requested,
  }
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`))
    })

    child.on('error', (error) => {
      rejectPromise(error)
    })
  })
}

async function findDirectory(root: string, targetName: string): Promise<string | null> {
  const entries = await readdir(root, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (entry.isDirectory() && entry.name === targetName) {
      return fullPath
    }

    if (entry.isDirectory()) {
      const nested = await findDirectory(fullPath, targetName)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

async function ensureArtwork(): Promise<void> {
  if (
    existsSync(resolve(process.cwd(), 'build', 'icon.icns')) &&
    existsSync(resolve(process.cwd(), 'build', 'icon.ico')) &&
    existsSync(resolve(process.cwd(), 'build', 'dmg-background.png'))
  ) {
    return
  }

  await run('bun', ['run', 'scripts/generate-artwork.ts'])
}

async function main(): Promise<void> {
  const platform = normalizePlatform(readOption('--platform') || process.env.PLATFORM)
  const arch = normalizeArch(readOption('--arch') || process.env.ARCH)
  const publish = readOption('--publish') || process.env.PUBLISH || 'never'
  const { builderTarget, userTarget } = normalizeTarget(platform, readOption('--target') || process.env.TARGET)
  const outputDirectory = resolve(process.cwd(), 'release', platform, arch, userTarget)

  await rm(outputDirectory, { force: true, recursive: true })
  await mkdir(outputDirectory, { recursive: true })
  await ensureArtwork()
  await run('bun', ['run', 'build'])

  const distributionArch = platform === 'linux' && arch === 'x64' ? 'x86_64' : arch
  const suffix = userTarget === 'exe-setup' ? '-setup' : ''
  const builderArgs = [
    'x',
    'electron-builder',
    '--config',
    'electron-builder.yml',
    '--publish',
    publish,
    `--config.directories.output=${outputDirectory}`,
    `--config.artifactName=libmov-${platform}-${distributionArch}${suffix}.\${ext}`,
  ]

  if (platform === 'mac') {
    builderArgs.push('--mac', builderTarget)
  }

  if (platform === 'linux') {
    builderArgs.push('--linux', builderTarget)
  }

  if (platform === 'win') {
    builderArgs.push('--win', builderTarget)
  }

  builderArgs.push(arch === 'arm64' ? '--arm64' : '--x64')

  await run('bun', builderArgs)

  let appBundle: string | null = null

  if (platform === 'mac' && userTarget === 'app') {
    appBundle = await findDirectory(outputDirectory, 'libmov.app')

    if (!appBundle || !existsSync(appBundle)) {
      throw new Error('The macOS app bundle was not produced.')
    }

    await run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appBundle, join(outputDirectory, `libmov-mac-${arch}.zip`)])
  }

  const rootEntries = await readdir(outputDirectory, { withFileTypes: true })
  const artifacts = await Promise.all(
    rootEntries.map(async (entry) => ({
      file: join(outputDirectory, entry.name),
      stats: await stat(join(outputDirectory, entry.name)),
    })),
  )

  const distributables = artifacts
    .filter(({ file, stats }) => {
      if (stats.isFile()) {
        return !file.endsWith('.blockmap') && !file.endsWith('builder-debug.yml')
      }

      if (stats.isDirectory()) {
        return file.endsWith('.app')
      }

      return false
    })
    .map(({ file }) => file)

  if (appBundle && !distributables.includes(appBundle)) {
    distributables.push(appBundle)
  }

  if (distributables.length === 0) {
    throw new Error('No distributable artifacts were produced.')
  }

  console.log('\nArtifacts:')
  for (const file of distributables) {
    console.log(file)
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
