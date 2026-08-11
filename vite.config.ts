import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function rewriteCookies(setCookie: string[] | undefined): string[] | undefined {
  if (!setCookie) return setCookie
  return setCookie.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]+/gi, '')
      .replace(/;\s*Secure/gi, '')
      .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
  )
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://crm.public.lan'
  const appBase = (env.VITE_APP_BASE_PATH || '/crm_fr').replace(/\/$/, '')
  const apiPrefix = `${appBase}/api`

  return {
    base: `${appBase}/`,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: ['public.lan', 'localhost', '.public.lan'],
      proxy: {
        // Как prod: /crm_fr/api/* → backend/* (same-origin cookie-сессия)
        [apiPrefix]: {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(new RegExp(`^${apiPrefix}`), ''),
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const rewritten = rewriteCookies(proxyRes.headers['set-cookie'])
              if (rewritten) {
                proxyRes.headers['set-cookie'] = rewritten
              }
            })
          },
        },
      },
    },
  }
})
