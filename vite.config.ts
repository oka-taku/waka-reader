import honox from 'honox/vite'
import { defineConfig, loadEnv } from 'vite'

// Vite の SSR は ESM のため `dotenv/config`（CommonJS）が使えない。.env はここで process.env に載せる。
export default defineConfig(async ({ mode, command }) => {
  const envFromFiles = loadEnv(mode, process.cwd(), [''])
  for (const [key, value] of Object.entries(envFromFiles)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  const [{ default: build }, { default: adapter }] = await Promise.all([
    import('@hono/vite-build/cloudflare-workers'),
    // `cloudflare` アダプタは wrangler 依存で Node 18 のビルドを壊すため、本番ビルド時は node を使う
    command === 'serve'
      ? import('@hono/vite-dev-server/cloudflare')
      : import('@hono/vite-dev-server/node')
  ])

  return {
    define: {
      'process.env': 'process.env'
    },
    plugins: [
      honox({
        devServer: { adapter },
        client: { input: ['/app/client.ts', '/app/style.css'] }
      }),
      build({
        entry: './app/server.ts'
      })
    ]
  }
})
