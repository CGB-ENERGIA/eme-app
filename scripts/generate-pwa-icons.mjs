/**
 * Gera ícones PWA a partir do HTML de marca (Chrome headless).
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
const sourceHtml = path.join(__dirname, 'pwa-icon-source.html')
const tmp512 = path.join(__dirname, '_icon-512.png')

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
].filter(Boolean)

function findChrome() {
  for (const c of chromeCandidates) {
    if (existsSync(c)) return c
  }
  throw new Error('Chrome/Edge não encontrado para gerar ícones')
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

async function main() {
  await mkdir(publicDir, { recursive: true })
  const chrome = findChrome()
  const fileUrl = 'file:///' + sourceHtml.replace(/\\\\/g, '/').replace(/\\/g, '/')

  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=512,512`,
    `--screenshot=${tmp512}`,
    fileUrl,
  ])

  // Copia 512; para 192 usa o mesmo (browsers escalam) — regeneramos via sharp se existir
  const out512 = path.join(publicDir, 'pwa-512x512.png')
  const out192 = path.join(publicDir, 'pwa-192x192.png')
  const outApple = path.join(publicDir, 'apple-touch-icon.png')
  const outLogo = path.join(publicDir, 'logo-cgb.png')

  await copyFile(tmp512, out512)

  let resized = false
  try {
    const sharp = (await import('sharp')).default
    await sharp(tmp512).resize(192, 192).png().toFile(out192)
    await sharp(tmp512).resize(180, 180).png().toFile(outApple)
    await sharp(tmp512).resize(192, 192).png().toFile(outLogo)
    resized = true
  } catch {
    await copyFile(tmp512, out192)
    await copyFile(tmp512, outApple)
    await copyFile(tmp512, outLogo)
  }

  // favicon.ico simples: copia png (ok para PWA moderno)
  await copyFile(out192, path.join(publicDir, 'favicon.png'))

  // SVG favicon de marca (substitui o template Vite roxo)
  const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#9B003C"/>
  <g transform="translate(18,18) scale(0.64)">
    <polygon points="50,2 74,26 50,50" fill="#BE0047"/>
    <polygon points="74,26 98,50 50,50" fill="#8A0030"/>
    <polygon points="98,50 74,74 50,50" fill="#BE0047"/>
    <polygon points="74,74 50,98 50,50" fill="#8A0030"/>
    <polygon points="50,98 26,74 50,50" fill="#BE0047"/>
    <polygon points="26,74 2,50 50,50" fill="#8A0030"/>
    <polygon points="2,50 26,26 50,50" fill="#BE0047"/>
    <polygon points="26,26 50,2 50,50" fill="#8A0030"/>
    <polygon points="50,34 66,50 50,66 34,50" fill="white"/>
  </g>
</svg>`
  await writeFile(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8')

  console.log('Ícones PWA gerados em public/', resized ? '(com sharp)' : '(sem sharp — 192=512)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
