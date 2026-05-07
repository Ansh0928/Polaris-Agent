export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxAttempts) throw err
      const jitter = Math.random() * baseDelayMs
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}
