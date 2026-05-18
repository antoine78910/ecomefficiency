import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(root, 'next/src/app/pro/page.tsx'), 'utf8')
const v = '20260502-freepik-v1'
const base = 'https://tools.ecomefficiency.com'

const styleMatch = src.match(/<style>\{\`([\s\S]*?)\`\}<\/style>/)
const css = styleMatch ? styleMatch[1] : ''

const gridOpen = '<div className="tools-grid relative z-10">'
const blockStart = src.indexOf(gridOpen)
const blockEnd = src.indexOf('\n        </div>\n      </div>', blockStart)
const block = src.slice(blockStart + gridOpen.length, blockEnd)

const cardRe = /<a href="([^"]+)" className="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
let cards = ''
let m
while ((m = cardRe.exec(block)) !== null) {
  const inner = m[3]
    .replace(/className=/g, 'class=')
    .replace(/src=\{\`\/tools-images\/([^`?]+)(?:\?v=\$\{ASSET_VERSION\})?\`\}/g, (_, file) =>
      `src="${base}/tools-images/${file}?v=${v}"`
    )
  const cls = m[2].replace(/\bgroup\b/g, '').trim()
  cards += `          <a href="${m[1]}" class="${cls}" target="_blank" rel="noopener noreferrer">${inner}</a>\n`
}

const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ecom Efficiency</title>
  <style>${css}</style>
</head>
<body>
  <h1 style="text-align:center;margin-top:50px;color:#333;font-family:Kanit,sans-serif;font-weight:700;font-size:30px">Ecom Efficiency</h1>
  <div class="tools-grid relative z-10">
${cards}  </div>
</body>
</html>`

const outPath = path.join(root, 'Ecom Efficiency style/pro_tools_page.html')
fs.writeFileSync(outPath, finalHtml)
console.log('Wrote', outPath, 'cards:', (cards.match(/<a href/g) || []).length)
