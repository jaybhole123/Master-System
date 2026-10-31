import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleOcr } from './src/Plant_Hindustan_Datthu_Sopnge/server/ocrHandler.js'

// Serves POST /api/ocr from the dev/preview server so the OpenAI key stays server-side.
const ocrApi = (env) => ({
  name: 'ocr-api',
  configureServer(server) {
    server.middlewares.use('/api/ocr', (req, res) => handleOcr(req, res, env))
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/ocr', (req, res) => handleOcr(req, res, env))
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(mode, './src/Plant_Hindustan_Datthu_Sopnge', ''),
    ...loadEnv(mode, './src/Hindustan_Billet', ''),
    ...loadEnv(mode, './src/Nandan_Smilter_Plant', ''),
  }

  const openAiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || ''
  const ocrModel = env.OCR_MODEL || env.VITE_OCR_MODEL || 'gpt-5.6-sol'
  const ocrVerifyModel = env.OCR_VERIFY_MODEL || env.VITE_OCR_VERIFY_MODEL || 'gpt-5.6-terra'

  return {
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(openAiKey),
      'import.meta.env.OPENAI_API_KEY': JSON.stringify(openAiKey),
      'import.meta.env.VITE_OCR_MODEL': JSON.stringify(ocrModel),
      'import.meta.env.OCR_MODEL': JSON.stringify(ocrModel),
      'import.meta.env.VITE_OCR_VERIFY_MODEL': JSON.stringify(ocrVerifyModel),
      'import.meta.env.OCR_VERIFY_MODEL': JSON.stringify(ocrVerifyModel),
    },
    plugins: [
      react(),
      tailwindcss(),
      ocrApi(env),
    ],
    server: {
      port: 5180,
      host: true,
    },
    base: "/", // Changed from "./" to "/"
    build: {
      outDir: "dist",
    },
  }
})