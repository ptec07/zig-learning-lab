import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Vercel SPA deployment config', () => {
  it('rewrites all known client routes to the Vite app shell and builds a 404 fallback', () => {
    const root = process.cwd()
    const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf-8')) as {
      version?: number
      outputDirectory?: string
      rewrites?: Array<{ source: string; destination: string }>
    }
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>
    }

    expect(config.version).toBe(2)
    expect(config.outputDirectory).toBe('dist')
    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        { source: '/lessons', destination: '/' },
        { source: '/lessons/(.*)', destination: '/' },
        { source: '/dashboard', destination: '/' },
        { source: '/exam', destination: '/' },
        { source: '/(.*)', destination: '/index.html' },
      ]),
    )
    expect(packageJson.scripts?.build).toContain('cp dist/index.html dist/404.html')
  })
})
