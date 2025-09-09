import type { Plugin } from 'vite'
import { rmSync, existsSync } from 'fs'
import { resolve } from 'path'

export function mockExclusionPlugin(): Plugin {
  console.log('🔍 Initializing mock exclusion plugin', 'VITE_ENABLE_MOCKS:', process.env.VITE_ENABLE_MOCKS || 'false')
  return {
    name: 'mock-exclusion',
    apply: 'build',
    resolveId(id, importer) {
      const enableMocks = process.env.VITE_ENABLE_MOCKS === 'true'

      if (id.includes('/mocks/') || id.includes('msw')) {
        console.log(`🔍 Resolving mock-related module: ${id}, enableMocks: ${enableMocks}`)
      }

      if (!enableMocks) {
        // Block resolution of mock-related modules
        if (id.includes('/mocks/') || id.includes('msw')) {
          console.log(`🚫 Blocking mock module: ${id}`)
          return { id: 'virtual:empty', external: false }
        }
      }
      return null
    },
    load(id) {
      if (id === 'virtual:empty') {
        // Return empty module for blocked mock imports
        return 'export default {}'
      }
      return null
    },
    generateBundle(options, bundle) {
      const enableMocks = process.env.VITE_ENABLE_MOCKS === 'true'

      if (!enableMocks) {
        // Remove any mock-related chunks from the bundle
        Object.keys(bundle).forEach(fileName => {
          const chunk = bundle[fileName]
          if (chunk && chunk.type === 'chunk') {
            // Check if chunk contains mock-related code
            if (fileName.includes('mock') ||
                fileName.includes('msw') ||
                fileName.includes('handlers') ||
                (chunk.code && (chunk.code.includes('msw') || chunk.code.includes('/mocks/')))) {
              console.log(`🧹 Excluding mock chunk: ${fileName}`)
              delete bundle[fileName]

              // Also remove the corresponding source map
              const sourceMapName = fileName + '.map'
              if (bundle[sourceMapName]) {
                console.log(`🧹 Excluding mock source map: ${sourceMapName}`)
                delete bundle[sourceMapName]
              }
            }
          }
        })

        // Also check for orphaned source maps (in case chunk was already removed)
        Object.keys(bundle).forEach(fileName => {
          if (fileName.endsWith('.map') &&
              (fileName.includes('mock') ||
               fileName.includes('msw') ||
               fileName.includes('handlers'))) {
            console.log(`🧹 Excluding orphaned mock source map: ${fileName}`)
            delete bundle[fileName]
          }
        })
      }
    },
    closeBundle() {
      const enableMocks = process.env.VITE_ENABLE_MOCKS === 'true'

      if (!enableMocks) {
        // Remove MSW service worker from dist if it was copied
        const serviceWorkerPath = resolve(process.cwd(), 'dist', 'mockServiceWorker.js')
        if (existsSync(serviceWorkerPath)) {
          rmSync(serviceWorkerPath, { force: true })
          console.log('🧹 Removed MSW service worker from production build')
        }
      }
    }
  }
}
