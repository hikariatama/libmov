/** Index pages over the visible sequence, independently of provider chunk sizes. */
export class CatalogPager<T> {
  private readonly items: T[] = []
  private readonly keys = new Set<string>()
  private nextChunk = 0
  private hasMore = true
  private pending: Promise<void> = Promise.resolve()

  private readonly load: (page: number) => Promise<{ items: T[]; hasMore: boolean }>
  private readonly key: (item: T) => string

  constructor(load: (page: number) => Promise<{ items: T[]; hasMore: boolean }>, key: (item: T) => string) {
    this.load = load
    this.key = key
  }

  async page(page: number, pageSize: number): Promise<{ items: T[]; hasMore: boolean; page: number }> {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500 || page > 10000) {
      throw new Error('Invalid catalog page.')
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const task = this.pending.then(async () => {
      while (this.hasMore && this.items.length <= end) {
        const chunk = await this.load(this.nextChunk)
        for (const item of chunk.items) {
          const key = this.key(item)
          if (!this.keys.has(key)) {
            this.keys.add(key)
            this.items.push(item)
          }
        }
        this.nextChunk += 1
        this.hasMore = chunk.hasMore
      }
    })
    this.pending = task.catch(() => undefined)
    await task
    return { items: this.items.slice(start, end), hasMore: this.items.length > end || this.hasMore, page }
  }
}
