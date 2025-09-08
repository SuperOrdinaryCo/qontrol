// Dynamic imports to keep MSW out of production bundle
async function setupMSW() {
  if (typeof window === 'undefined') return null

  try {
    const { setupWorker } = await import('msw/browser')
    const { handlers } = await import('./handlers')

    return setupWorker(...handlers)
  } catch (error) {
    console.warn('MSW setup failed:', error)
    return null
  }
}

// Start the worker in development mode or when explicitly enabled
export async function startMockWorker() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    try {
      const worker = await setupMSW()
      if (!worker) return

      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js'
        }
      })
      console.log('🔧 MSW: Mock Service Worker started')
    } catch (error) {
      console.error('MSW: Failed to start Service Worker:', error)
    }
  }
}

// Runtime control functions
export async function enableMocking() {
  const worker = await setupMSW()
  return worker?.start()
}

export async function disableMocking() {
  const worker = await setupMSW()
  worker?.stop()
}
