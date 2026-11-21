import { afterEach, expect, test } from 'bun:test'
import { JSONC, serve, spawn } from 'bun'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

test('the hotkeys registry version and every external lock record have content integrity', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const lock = JSONC.parse(await readFile(new URL('../bun.lock', import.meta.url), 'utf8')) as {
    packages: Record<string, unknown[]>
  }
  const name = '@tanstack/react-hotkeys'
  const version = manifest.dependencies[name] as string
  expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(lock.packages[name]?.[0]).toBe(`${name}@${version}`)

  for (const [name, record] of Object.entries(lock.packages)) {
    expect(record[3], `${name} needs a repository-pinned content digest`).toMatch(/^sha512-[A-Za-z0-9+/]{86}==$/)
  }
})

async function run(command: string[], cwd: string, registry?: string) {
  const cache = join(cwd, 'cache')
  const child = spawn(command, {
    cwd,
    env: {
      PATH: process.env.PATH ?? '',
      TMPDIR: tmpdir(),
      BUN_INSTALL_CACHE_DIR: cache,
      NPM_CONFIG_USERCONFIG: join(cwd, '.npmrc'),
      ...(registry ? { npm_config_registry: registry } : {}),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { exitCode, output: stdout + stderr }
}

test('a frozen install accepts pinned tarball bytes and rejects a substituted tarball', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'libmov-integrity-'))
  directories.push(directory)
  const payload = join(directory, 'payload')
  await mkdir(join(payload, 'package'), { recursive: true })
  await writeFile(join(payload, 'package/package.json'), JSON.stringify({ name: 'integrity-fixture', version: '1.0.0' }))
  const entry = join(payload, 'package/index.js')
  const originalArchive = join(directory, 'original.tgz')
  const substitutedArchive = join(directory, 'substituted.tgz')
  for (const [archive, value] of [[originalArchive, 'original'], [substitutedArchive, 'substituted']] as const) {
    await writeFile(entry, `export default '${value}'\n`)
    const packed = await run(['tar', '-czf', archive, '-C', payload, 'package'], directory)
    expect(packed.exitCode, packed.output).toBe(0)
  }
  const original = await readFile(originalArchive)
  const substituted = await readFile(substitutedArchive)
  const integrity = `sha512-${createHash('sha512').update(original).digest('base64')}`
  let responseBody = original
  let requests = 0
  const server = serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname !== '/integrity-fixture/-/integrity-fixture-1.0.0.tgz') {
        return new Response('Unexpected registry request', { status: 404 })
      }
      requests += 1
      return new Response(responseBody, { headers: { 'Content-Type': 'application/octet-stream' } })
    },
  })

  try {
    const registry = server.url.origin
    for (const [name, bytes, accepted] of [['original', original, true], ['substituted', substituted, false]] as const) {
      const consumer = join(directory, name)
      await mkdir(consumer)
      const manifest = { name: 'integrity-consumer', dependencies: { 'integrity-fixture': '1.0.0' } }
      const lock = JSON.stringify({
        lockfileVersion: 1,
        configVersion: 0,
        workspaces: { '': manifest },
        packages: { 'integrity-fixture': ['integrity-fixture@1.0.0', '', {}, integrity] },
      })
      await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest))
      await writeFile(join(consumer, 'bun.lock'), lock)
      await writeFile(join(consumer, '.npmrc'), `registry=${registry}\n`)
      responseBody = bytes
      const before = requests
      const installed = await run([
        process.execPath, 'install', '--frozen-lockfile', '--ignore-scripts', '--registry', registry,
      ], consumer, registry)
      expect(requests).toBeGreaterThan(before)
      expect(await readFile(join(consumer, 'bun.lock'), 'utf8')).toBe(lock)
      if (accepted) {
        expect(installed.exitCode, installed.output).toBe(0)
        expect(await readFile(join(consumer, 'node_modules/integrity-fixture/index.js'), 'utf8')).toBe("export default 'original'\n")
      } else {
        expect(installed.exitCode, installed.output).not.toBe(0)
        expect(installed.output).toMatch(/integrity check failed|checksum mismatch/i)
      }
    }
  } finally {
    server.stop(true)
  }
}, 15000)
