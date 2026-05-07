export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.BRAINTRUST_API_KEY) {
    const { initLogger } = await import('braintrust')
    initLogger({
      projectName: 'My Project',
      apiKey: process.env.BRAINTRUST_API_KEY,
    })
  }
}
