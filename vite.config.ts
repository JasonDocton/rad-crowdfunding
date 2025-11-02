/** biome-ignore-all lint/style/noDefaultExport: <Safe to redeclare UserConfig> */

import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

console.log('✓ Environment variables validated successfully')

export default defineConfig(({ mode }) => ({
	server: {
		port: 3000,
	},
	plugins: [
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		// Cloudflare Workers plugin - only in production to avoid local dev interference
		...(mode === 'production'
			? [
					cloudflare({
						viteEnvironment: { name: 'ssr' },
						configPath: './wrangler.jsonc',
					}),
				]
			: []),
		tanstackStart(),
		viteReact(),
		tailwindcss(),
	],
}))
