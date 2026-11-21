import { expect, mock, test } from 'bun:test'

let fetchMock: typeof fetch
mock.module('electron', () => ({ net: { fetch: (...args: Parameters<typeof fetch>) => fetchMock(...args) } }))
const { TvdbClient } = await import('../electron/tvdb')
const response = (data: unknown, next = false) => new Response(JSON.stringify({ data, links: { next: next ? 'next' : null } }))

test('catalog uses abortable requests and paginates variable filtered provider pages', async () => {
  const requests: string[] = []
  fetchMock = (async (input, init) => {
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    const url = new URL(String(input))
    if (url.pathname.endsWith('/login')) return response({ token: 'synthetic-token' })
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer synthetic-token')
    const page = Number(url.searchParams.get('page'))
    requests.push(`${url.pathname}:${page}`)
    if (url.pathname.endsWith('/series')) return response([{ id: 1, name: 'Series', image: '/series.jpg' }])
    if (page === 0) return response([{ id: 1, name: 'Movie', image: '/movie.jpg' }, { id: 2, name: 'No poster' }], true)
    if (page === 1) return response([], true)
    return response([{ id: 3, name: 'Next movie', image: '/next.jpg' }])
  }) as typeof fetch
  const client = new TvdbClient('synthetic-key')
  const first = await client.browseMedia({ page: 1, pageSize: 2 })
  expect(first.items.map((item) => `${item.mediaType}:${item.mediaId}`)).toEqual(['movie:1', 'tv:1'])
  expect(first.hasMore).toBe(true)
  const last = await client.browseMedia({ page: 2, pageSize: 2 })
  expect(last.items.map((item) => item.mediaId)).toEqual(['3'])
  expect(last.hasMore).toBe(false)
  expect(requests.filter((path) => path.includes('/series'))).toHaveLength(1)
})

test('catalog abort rejection ends the request and permits retry', async () => {
  let fail = true
  fetchMock = (async (input, init) => {
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    if (String(input).endsWith('/login')) return response({ token: 'synthetic-token' })
    if (fail) throw new DOMException('Timed out', 'TimeoutError')
    return response([])
  }) as typeof fetch
  const client = new TvdbClient('synthetic-key')
  await expect(client.browseMedia({ page: 1, pageSize: 2 })).rejects.toThrow('Timed out')
  fail = false
  expect(await client.browseMedia({ page: 1, pageSize: 2 })).toEqual({ page: 1, items: [], hasMore: false })
})
