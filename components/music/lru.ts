export class LruCache<K, V> {
  private readonly entries = new Map<K, V>()

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error('LRU capacity must be a positive integer')
  }

  get size() {
    return this.entries.size
  }

  get(key: K) {
    const value = this.entries.get(key)
    if (value === undefined)
      return undefined

    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: K, value: V) {
    this.entries.delete(key)
    this.entries.set(key, value)

    if (this.entries.size <= this.capacity)
      return

    const oldest = this.entries.keys().next().value
    if (oldest !== undefined)
      this.entries.delete(oldest)
  }
}
